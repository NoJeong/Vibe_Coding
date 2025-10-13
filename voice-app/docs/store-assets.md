# 스토어 자산 준비 가이드

## 1. 아이콘 & 피처 그래픽
- 원본 파일: `client/public/img/haesseum_icon.png`, `client/public/img/haesseum_logo.png`
- Android 스토어 요구 사항
  | 항목 | 사이즈 | 포맷 | 비고 |
  | --- | --- | --- | --- |
  | 앱 아이콘 | 512x512 | PNG, 투명배경 X | 현재 아이콘 재가공 권장 |
  | 피처 그래픽 | 1024x500 | PNG/JPG | 로고 + 백그라운드 컬러 지정 |
- 추천 작업 흐름
  ```bash
  # 예시: sharp(전역 설치)로 리사이즈
  npx sharp client/public/img/haesseum_icon.png --resize 512 512 --withoutEnlargement --background '#FFFFFF' --flatten --output docs/assets/app-icon-512.png
  npx sharp client/public/img/haesseum_logo.png --resize 1024 500 --output docs/assets/feature-graphic-1024x500.png
  ```
  > `docs/assets/` 폴더 안에 최종 산출물을 모아두면 관리가 손쉬움

## 2. 스크린샷
- 필수: 6.7" 클래스(1080x2400) 2~4장 권장
- 제안 시나리오
  1. 메인 대시보드 (통계 & 캘린더)
  2. 음성 기록 작성 화면 (STT 버튼 강조)
  3. 기록 목록 & 상세
- 캡처 팁
  ```bash
  npm run build:android-release
  adb install -r android/app/build/outputs/apk/release/app-release.apk
  # 연결된 디바이스에서 스크린샷 캡처
  adb exec-out screencap -p > docs/assets/screenshot-main.png
  ```
  이후 `docs/assets/`에 저장 → 필요한 경우 Photoshop 등으로 16:9 비율 맞추기.

## 3. 텍스트 자료
- 앱 설명 초안 & 릴리즈 노트 → `docs/marketing/app-description.md`, `docs/marketing/release-notes.md` 등으로 정리
- 권한 사용 이유 (마이크) 문구도 별도 기록하여 Play Console 제출 시 활용

## 4. 체크
- [ ] 아이콘 512x512, 피처 그래픽 1024x500
- [ ] 스크린샷 최소 3장 (세로)
- [x] 설명/릴리즈 노트 초안 작성 완료 → docs/marketing
- [x] 개인정보처리방침 URL 재확인 → docs/marketing/privacy-policy.md
- [x] 권한 사용 설명 정리 → docs/marketing/permissions.md

위 항목들을 마친 뒤 `store-release-checklist.md` 문서의 나머지 항목과 함께 검토하면 돼.



