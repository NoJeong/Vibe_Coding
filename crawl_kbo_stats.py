
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
KBO/스탯 페이지(ASP.NET 형태 포함)에서 타자/투수 기록을 페이지네이션 돌며 크롤링하는 베이스 코드.
- 특징:
  1) __VIEWSTATE / __EVENTVALIDATION 값을 유지한 채 __doPostBack 기반 페이지 전환 지원
  2) pandas.read_html 로 표 파싱(테이블 구조 변화에 비교적 강함)
  3) 시즌/월/선수 타입(타자/투수) 등을 파라미터로 확장 가능
- 사용 전 꼭 해야 할 일:
  * BASE_URL, TABLE_INDEX, PAGER_ID_PREFIX, EVENTTARGET_PREFIX 를 실제 페이지에 맞게 조정하세요.
  * 로봇 차단이 있는 사이트는 requests 헤더/지연 또는 Selenium으로 전환 필요.
"""

import time
import sys
import math
import typing as T
from dataclasses import dataclass
import requests
import pandas as pd
from bs4 import BeautifulSoup

# --------- 설정값(페이지에 맞게 수정) ---------
BASE_URL = "https://example.com/kbo/records/batter/monthly"  # 실제 대상 URL로 변경
# pandas.read_html 로 읽을 테이블 인덱스(페이지 내 여러 테이블일 수 있음)
TABLE_INDEX = 0
# ASP.NET 페이저 버튼 id prefix (예: 'cphContents_cphContents_cphContents_ucPager_btnNo')
PAGER_ID_PREFIX = "cphContents_cphContents_cphContents_ucPager_btnNo"
# __EVENTTARGET 에 들어갈 서버 컨트롤 id prefix (예: 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo')
EVENTTARGET_PREFIX = "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo"
# 페이지당 레코드 수가 고정이라면 예상 페이지 수를 지정(모르면 None)
MAX_PAGES_HINT: T.Optional[int] = None

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

@dataclass
class CrawlParams:
    year: int
    month: T.Optional[int] = None  # 월별 페이지면 사용
    delay_sec: float = 0.8         # 요청 사이 지연(차단 회피)
    max_pages: T.Optional[int] = None

def _extract_state_fields(html: str) -> dict:
    """ASP.NET 페이지의 __VIEWSTATE 등 상태 필드 추출."""
    soup = BeautifulSoup(html, "lxml")
    fields = {}
    for key in ["__VIEWSTATE", "__EVENTVALIDATION", "__VIEWSTATEGENERATOR"]:
        el = soup.find("input", {"id": key})
        if el and el.has_attr("value"):
            fields[key] = el["value"]
    return fields

def _read_table(html: str) -> pd.DataFrame:
    """페이지 내 표를 pandas 로 파싱. 테이블 인덱스는 상단 TABLE_INDEX 로 조정."""
    tables = pd.read_html(html)
    if len(tables) == 0:
        return pd.DataFrame()
    idx = min(TABLE_INDEX, len(tables) - 1)
    df = tables[idx]
    # 컬럼 이름 정리(멀티 인덱스 깨기)
    df.columns = [str(c[1]) if isinstance(c, tuple) else str(c) for c in df.columns]
    return df

def crawl_monthly_batter(params: CrawlParams) -> pd.DataFrame:
    """월별 타자 기록 크롤링 예시. (필요시 투수/연도별 등으로 확장)"""
    s = requests.Session()
    s.headers.update(DEFAULT_HEADERS)

    # 최초 진입(연도/월 파라미터가 쿼리스트링이라면 여기서 붙이세요)
    resp = s.get(BASE_URL, params={"year": params.year}, timeout=20)
    resp.raise_for_status()
    html = resp.text

    # 첫 페이지 테이블
    first_df = _read_table(html)
    if first_df.empty:
        print("[warn] 첫 페이지에서 테이블을 찾지 못했습니다. TABLE_INDEX/URL을 확인하세요.", file=sys.stderr)

    # ASP.NET 상태필드
    state = _extract_state_fields(html)

    # 페이지 수 추정
    max_pages = params.max_pages or MAX_PAGES_HINT
    if max_pages is None:
        # 페이저에 있는 번호 버튼 개수로 대략 추정
        soup = BeautifulSoup(html, "lxml")
        pager_buttons = soup.select(f"a[id^='{PAGER_ID_PREFIX}']")
        if pager_buttons:
            try:
                numbers = []
                for a in pager_buttons:
                    # id 끝의 숫자 추출
                    num = int(''.join(filter(str.isdigit, a.get("id", ""))) or "0")
                    if num:
                        numbers.append(num)
                max_pages = max(numbers) if numbers else 1
            except Exception:
                max_pages = 1
        else:
            max_pages = 1

    all_pages = [first_df]

    # 2페이지 이후 __doPostBack 시뮬레이션
    for page in range(2, (max_pages or 1) + 1):
        time.sleep(params.delay_sec)
        data = {
            "__EVENTTARGET": f"{EVENTTARGET_PREFIX}{page}",
            "__EVENTARGUMENT": "",
            "__VIEWSTATE": state.get("__VIEWSTATE", ""),
            "__VIEWSTATEGENERATOR": state.get("__VIEWSTATEGENERATOR", ""),
            "__EVENTVALIDATION": state.get("__EVENTVALIDATION", ""),
        }
        # 실제 페이지에 필요한 추가 hidden 필드가 있다면 여기서 함께 전송
        post = s.post(BASE_URL, data=data, timeout=20)
        post.raise_for_status()
        html = post.text

        # 다음 라운드용 상태필드 갱신
        state = _extract_state_fields(html)
        df = _read_table(html)
        if df.empty:
            print(f"[warn] {page} 페이지에서 테이블이 비었습니다. 셀렉터/인덱스 확인 필요.", file=sys.stderr)
        else:
            all_pages.append(df)

    out = pd.concat(all_pages, ignore_index=True)
    # 사이트마다 컬럼명이 다르므로, 공통 스키마로 리네이밍 시도(필요 시 아래 매핑 수정)
    rename_map = {
        "선수": "player",
        "팀": "team",
        "연도": "year",
        "월": "month",
        "경기": "G",
        "타수": "AB",
        "안타": "H",
        "타율": "AVG",
        "홈런": "HR",
        "볼넷": "BB",
        "삼진": "SO",
        "출루율": "OBP",
        "장타율": "SLG",
        "OPS": "OPS",
    }
    out = out.rename(columns={k: v for k, v in rename_map.items() if k in out.columns})

    # 숫자형 변환(문자 %/소수점 혼재 방지)
    for col in ["year", "month", "G", "AB", "H", "HR", "BB", "SO"]:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")
    for col in ["AVG", "OBP", "SLG", "OPS"]:
        if col in out.columns:
            out[col] = (
                out[col]
                .astype(str)
                .str.replace("%", "", regex=False)
                .str.replace(",", "", regex=False)
            )
            out[col] = pd.to_numeric(out[col], errors="coerce")

    # year/month 없으면 URL/쿼리에서 달아주거나 NaN 처리
    if "year" not in out.columns:
        out["year"] = params.year
    if "month" not in out.columns and params.month is not None:
        out["month"] = params.month

    return out

def main():
    import argparse
    parser = argparse.ArgumentParser(description="KBO 월별 타자 기록 크롤러 (ASP.NET 페이저 지원)")
    parser.add_argument("--year", type=int, required=True, help="크롤링할 연도")
    parser.add_argument("--delay", type=float, default=0.8, help="요청 간 지연(초)")
    parser.add_argument("--max-pages", type=int, default=None, help="최대 페이지(모르면 생략)")
    parser.add_argument("--out", type=str, default="batting_monthly.csv", help="출력 CSV 경로")
    args = parser.parse_args()

    df = crawl_monthly_batter(CrawlParams(year=args.year, delay_sec=args.delay, max_pages=args.max_pages))
    if df.empty:
        print("[error] 결과가 비었습니다. 설정을 조정하세요.", file=sys.stderr)
        sys.exit(2)
    df.to_csv(args.out, index=False, encoding="utf-8-sig")
    print(f"[ok] 저장: {args.out} (rows={len(df)})")

if __name__ == "__main__":
    main()
