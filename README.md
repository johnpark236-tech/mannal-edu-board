# mannal-edu-board

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