
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
타율 예측(다음달 타율, 시즌 최종 타율) 베이스라인 모델
- 입력 CSV 스키마(권장): player, team, year, month, G, AB, H, AVG, OBP, SLG, OPS
  * month: 1~12
  * AVG/OBP/SLG/OPS: 소수(0.312 처럼)
- 기능:
  1) 시계열 특징 생성(월, 연도, 롤링 평균, 누적 평균 등)
  2) 다음달 타율 예측 모델(RandomForestRegressor)
  3) 시즌 최종 타율 예측 모델(RandomForestRegressor)
  4) 간단한 사용법:
     $ python train_predict_batting.py --train batting_monthly.csv
     # 모델 저장 후
     $ python train_predict_batting.py --predict-next-month --player "홍길동" --year 2025 --month 7 --csv batting_monthly.csv
"""

import argparse
import os
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import StandardScaler
from joblib import dump, load

RNG = 42

def _validate(df: pd.DataFrame) -> pd.DataFrame:
    need_cols = ["player", "year", "month", "AB", "H"]
    for c in need_cols:
        if c not in df.columns:
            raise ValueError(f"입력 CSV에 '{c}' 컬럼이 필요합니다.")
    # AVG 없으면 계산(기본 안전장치)
    if "AVG" not in df.columns:
        df["AVG"] = df["H"] / df["AB"].replace(0, np.nan)
    # 타입/결측 정리
    df["year"] = pd.to_numeric(df["year"], errors="coerce").astype(int)
    df["month"] = pd.to_numeric(df["month"], errors="coerce").astype(int)
    for c in ["AB", "H"]:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    # 이상치 제거(옵션)
    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=["AVG"])
    return df

def _feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["player", "year", "month"]).copy()
    # 누적 타수/안타/누적 타율
    df["cum_AB"] = df.groupby(["player", "year"])["AB"].cumsum()
    df["cum_H"]  = df.groupby(["player", "year"])["H"].cumsum()
    df["cum_AVG"] = df["cum_H"] / df["cum_AB"].replace(0, np.nan)

    # 롤링 평균(최근 3개월)
    df["rolling3_AB"] = df.groupby("player")["AB"].rolling(3, min_periods=1).sum().reset_index(level=0, drop=True)
    df["rolling3_H"]  = df.groupby("player")["H"].rolling(3, min_periods=1).sum().reset_index(level=0, drop=True)
    df["rolling3_AVG"] = df["rolling3_H"] / df["rolling3_AB"].replace(0, np.nan)

    # 월을 주기적 특성으로(사인/코사인)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # 결측 대체
    for c in ["cum_AVG", "rolling3_AVG"]:
        df[c] = df[c].fillna(df["AVG"].mean())

    return df

def _build_next_month_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """(player, year, month) 레코드에 다음달 AVG를 타깃으로 붙인다."""
    df = df.copy()
    df["target_next_AVG"] = df.groupby(["player", "year"])["AVG"].shift(-1)
    # 시즌 말(12월 등)에는 다음 달이 없으므로 제거
    ds = df.dropna(subset=["target_next_AVG"]).copy()
    return ds

def _build_season_final_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """각 (player, year, month) 시점에서 그 해 '최종 시즌 AVG'를 타깃으로 사용."""
    df = df.copy()
    # 시즌 최종 평균(연도별 마지막 month의 누적 AVG)
    season_final = (
        df.sort_values(["player", "year", "month"])
          .groupby(["player", "year"])
          .tail(1)[["player", "year", "cum_AVG"]]
          .rename(columns={"cum_AVG": "target_season_final_AVG"})
    )
    merged = df.merge(season_final, on=["player", "year"], how="left")
    # 학습에는 시즌 중간 months 모두 사용 가능(미래 데이터 누수 방지 주의: 모델은 cum_AVG 등 현재까지 값만 사용)
    return merged.dropna(subset=["target_season_final_AVG"])

def _select_features(df: pd.DataFrame) -> list:
    feats = [
        "year", "month",
        "AB", "H", "AVG",
        "cum_AB", "cum_H", "cum_AVG",
        "rolling3_AB", "rolling3_H", "rolling3_AVG",
        "month_sin", "month_cos",
    ]
    return [f for f in feats if f in df.columns]

def train_models(csv_path: str, out_dir: str = "."):
    os.makedirs(out_dir, exist_ok=True)
    raw = pd.read_csv(csv_path)
    raw = _validate(raw)
    fe = _feature_engineering(raw)

    # 1) 다음달 예측
    ds_next = _build_next_month_dataset(fe)
    Xn = ds_next[_select_features(ds_next)]
    yn = ds_next["target_next_AVG"]

    gkf = GroupKFold(n_splits=5)
    preds = np.zeros(len(yn))
    maes = []
    for fold, (tr, va) in enumerate(gkf.split(Xn, yn, groups=ds_next["player"])):
        model = RandomForestRegressor(
            n_estimators=500,
            max_depth=None,
            random_state=RNG,
            n_jobs=-1,
        )
        model.fit(Xn.iloc[tr], yn.iloc[tr])
        p = model.predict(Xn.iloc[va])
        preds[va] = p
        mae = mean_absolute_error(yn.iloc[va], p)
        maes.append(mae)
        print(f"[next-month][fold {fold}] MAE={mae:.4f}")

    print(f"[next-month] CV MAE (mean±std): {np.mean(maes):.4f} ± {np.std(maes):.4f}")
    final_next = RandomForestRegressor(n_estimators=700, random_state=RNG, n_jobs=-1)
    final_next.fit(Xn, yn)
    dump(final_next, os.path.join(out_dir, "model_next_month.pkl"))
    print(f"[ok] 저장: {os.path.join(out_dir, 'model_next_month.pkl')}")

    # 2) 시즌 최종 예측
    ds_season = _build_season_final_dataset(fe)
    Xs = ds_season[_select_features(ds_season)]
    ys = ds_season["target_season_final_AVG"]

    maes2 = []
    preds2 = np.zeros(len(ys))
    for fold, (tr, va) in enumerate(gkf.split(Xs, ys, groups=ds_season["player"])):
        model = RandomForestRegressor(
            n_estimators=500,
            max_depth=None,
            random_state=RNG,
            n_jobs=-1,
        )
        model.fit(Xs.iloc[tr], ys.iloc[tr])
        p = model.predict(Xs.iloc[va])
        preds2[va] = p
        mae = mean_absolute_error(ys.iloc[va], p)
        maes2.append(mae)
        print(f"[season-final][fold {fold}] MAE={mae:.4f}")

    print(f"[season-final] CV MAE (mean±std): {np.mean(maes2):.4f} ± {np.std(maes2):.4f}")
    final_season = RandomForestRegressor(n_estimators=700, random_state=RNG, n_jobs=-1)
    final_season.fit(Xs, ys)
    dump(final_season, os.path.join(out_dir, "model_season_final.pkl"))
    print(f"[ok] 저장: {os.path.join(out_dir, 'model_season_final.pkl')}")

def predict_next_month(player: str, year: int, month: int, csv_path: str, model_path: str = "model_next_month.pkl"):
    """특정 선수의 (year, month) 시점까지의 기록으로 다음달 AVG 예측."""
    model = load(model_path)
    df = pd.read_csv(csv_path)
    df = _validate(df)
    fe = _feature_engineering(df)

    # 대상 레코드 필터링: 해당 시점까지의 한 줄(또는 여러 줄) 중 최신 월
    sub = fe[(fe["player"] == player) & (fe["year"] == year) & (fe["month"] == month)]
    if sub.empty:
        raise ValueError(f"데이터에 {player} {year}-{month} 레코드가 없습니다.")
    X = sub[_select_features(sub)]
    pred = float(model.predict(X)[0])
    print(f"[predict-next] {player} {year}-{month} 다음달 예상 AVG ≈ {pred:.3f}")
    return pred

def predict_season_final(player: str, year: int, month: int, csv_path: str, model_path: str = "model_season_final.pkl"):
    """특정 선수의 (year, month) 시점까지의 기록으로 시즌 최종 AVG 예측."""
    model = load(model_path)
    df = pd.read_csv(csv_path)
    df = _validate(df)
    fe = _feature_engineering(df)
    sub = fe[(fe["player"] == player) & (fe["year"] == year) & (fe["month"] == month)]
    if sub.empty:
        raise ValueError(f"데이터에 {player} {year}-{month} 레코드가 없습니다.")
    X = sub[_select_features(sub)]
    pred = float(model.predict(X)[0])
    print(f"[predict-season] {player} {year} 시즌 최종 예상 AVG ≈ {pred:.3f}")
    return pred

def cli():
    parser = argparse.ArgumentParser(description="타율 예측 학습/추론 파이프라인")
    parser.add_argument("--train", type=str, help="학습용 CSV 경로(예: batting_monthly.csv)")
    parser.add_argument("--out-dir", type=str, default=".", help="모델 저장 폴더")

    parser.add_argument("--predict-next-month", action="store_true", help="다음달 예측 실행")
    parser.add_argument("--predict-season-final", action="store_true", help="시즌 최종 예측 실행")
    parser.add_argument("--player", type=str, help="선수명")
    parser.add_argument("--year", type=int, help="연도")
    parser.add_argument("--month", type=int, help="월(1-12)")
    parser.add_argument("--csv", type=str, help="예측에 사용할 CSV 경로")
    parser.add_argument("--model-next", type=str, default="model_next_month.pkl")
    parser.add_argument("--model-season", type=str, default="model_season_final.pkl")

    args = parser.parse_args()

    if args.train:
        train_models(args.train, args.out_dir)

    if args.predict_next_month:
        if not (args.player and args.year and args.month and args.csv):
            raise SystemExit("--predict-next-month 에는 --player/--year/--month/--csv 모두 필요")
        predict_next_month(args.player, args.year, args.month, args.csv, args.model_next)

    if args.predict_season_final:
        if not (args.player and args.year and args.month and args.csv):
            raise SystemExit("--predict-season-final 에는 --player/--year/--month/--csv 모두 필요")
        predict_season_final(args.player, args.year, args.month, args.csv, args.model_season)

if __name__ == "__main__":
    cli()
