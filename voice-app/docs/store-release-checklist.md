# Google Play 배포 체크리스트

## 1. 빌드 & 검증
- [ ] `npm install` (최초 환경 세팅 또는 업데이트 후)
- [ ] `npm run build:android-release` 실행 → `/android/app/build/outputs/apk/release/app-release.apk` 확인
- [ ] 실제 디바이스/에뮬레이터에서 APK 설치 및 주요 시나리오 QA

## 2. 버전 관리
- [ ] `android/app/build.gradle`의 `versionCode`/`versionName` 최신화
- [ ] 릴리즈 노트 초안 작성 (`docs/release-notes.md` 등)

## 3. 스토어 메타데이터
- [ ] 앱 아이콘 512x512, 피처 그래픽 1024x500 업데이트
- [ ] 최신 스크린샷 (핵심 화면 최소 3장) 준비
- [ ] 한글/영문 앱 설명 검토 및 SEO 키워드 반영
- [ ] 개인정보처리방침 및 연락처 URL 유효성 확인

## 4. 정책 & 체크 항목
- [ ] 권한 사용 사유 (마이크 등) 스토어 폼에 반영
- [ ] 콘텐츠 등급 설문 최신화
- [ ] 위치/백그라운드 권한 등 민감 권한 여부 재확인
- [ ] 출시 국가/가격 정책 재검토

## 5. 제출 직전
- [ ] Play Console에 새 릴리즈 작성 → 앱 번들/APK 업로드
- [ ] 내부 테스트 트랙에 배포 후 피드백 확인
- [ ] 문제 없으면 프로덕션 트랙으로 프로모션/릴리즈

추가 자료는 `docs/` 폴더에 계속 쌓아두면 관리하기 좋아.
