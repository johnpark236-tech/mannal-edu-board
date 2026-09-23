# AI 천안 만날 학습 동아리 게시판

Padlet과 유사한 가로형 교육 게시판을 GitHub Pages + Google Drive/Sheets + Apps Script로 구현한 MVP입니다.

## 핵심 구조
학생 → GitHub Pages 게시 폼 → Google Apps Script → Google Sheets/Drive → 즉시 게시판 표시

교사 승인 단계가 없습니다. 제출 직후 자동 공개됩니다.

## 제공 기능
- Padlet 스타일 가로형 컬럼
- 학생 게시물 즉시 등록
- Google Drive 파일 저장
- Google Sheets 게시물/댓글 저장
- 댓글 즉시 등록
- 검색 및 모바일 대응
- 수업 코드 기반 최소한의 스팸 방지

## 연결 방법
1. Google Drive에 학생 업로드용 폴더를 만듭니다.
2. Google Sheet를 하나 만듭니다.
3. Google Sheet → 확장 프로그램 → Apps Script에서 `apps-script/Code.gs`를 붙여넣습니다.
4. `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `CLASS_CODE`를 수정합니다.
5. `setup()`을 한 번 실행하고 권한을 승인합니다.
6. Apps Script를 웹 앱으로 배포하고 생성된 `/exec` URL을 복사합니다.
7. `config.js`의 `apiUrl`에 그 URL을 입력합니다.

승인 컬럼은 없으며 새 게시물과 댓글은 바로 반영됩니다.

## 게시물 수정·삭제
각 카드에 수정·삭제 버튼이 있습니다. 이 작업은 관리자 비밀번호가 필요합니다.
Google Apps Script 편집기 → 프로젝트 설정 → 스크립트 속성에서 `ADMIN_PIN`이라는 키와 **8자 이상인 비공개 비밀번호**를 저장하세요. 비밀번호를 공개 GitHub 소스나 `config.js`에 넣지 마세요.
수정·삭제는 Apps Script 서버에서 비밀번호를 검사합니다. 해당 변경 사항을 적용하려면 GitHub의 최신 `apps-script/Code.gs`를 복사해 Apps Script에 붙여넣고 **기존 배포의 새 버전으로 재배포**해야 합니다.
삭제 시 게시물과 댓글은 시트에서 삭제되지만 기존 Google Drive 첨부파일은 보존됩니다. 수정 시 기존 첨부파일은 유지되며 교체는 지원하지 않습니다.
