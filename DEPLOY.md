배포 가이드: Cloud Run + GitHub + Cloud Build

개요
- 이 앱은 Express 기반 백엔드(`server/index.js`)와 Expo 웹 빌드(`web-build`)를 함께 컨테이너로 배포합니다.
- 도커 이미지 빌드 → Artifact Registry 푸시 → Cloud Run 배포를 Cloud Build 트리거로 자동화합니다.

사전 준비
- Google Cloud 프로젝트 준비 및 다음 API 활성화:
  - Artifact Registry, Cloud Build, Cloud Run, Secret Manager
- Secret Manager에 `GEMINI_API_KEY` 등록:
  - `gcloud secrets create GEMINI_API_KEY --replication-policy=automatic`
  - `printf "<YOUR_API_KEY>" | gcloud secrets versions add GEMINI_API_KEY --data-file=-`

로컬 도커 빌드/테스트(선택)
1) 프로젝트 루트(`voice-to-text-app`)에서 빌드:
   - `docker build -t voice-to-text-app:local .`
2) 실행 테스트:
   - `docker run --rm -e GEMINI_API_KEY=<YOUR_API_KEY> -e GEMINI_MODEL=gemini-2.5-flash -p 8080:8080 voice-to-text-app:local`
   - 브라우저에서 `http://localhost:8080` 접속, 프런트에서 문서 생성 요청 시 백엔드가 응답해야 합니다.

GitHub 연동 및 푸시
- 로컬 Git 초기화가 완료된 상태입니다. 원격 저장소를 추가하고 푸시하세요:
  - `git remote add origin <YOUR_GITHUB_REPO_URL>`
  - `git push -u origin master` (또는 `main` 브랜치 사용 시 `git push -u origin main`)

Artifact Registry 저장소 생성(한 번만)
- 리포지토리 이름과 리전은 `cloudbuild.yaml`의 치환 변수로 관리됩니다.
- 기본값: `_REPOSITORY=voice-to-text-app`, `_REGION=us-central1`
- 생성 명령:
  - `gcloud artifacts repositories create voice-to-text-app --repository-format=docker --location=us-central1 --description="Voice to Text App"`

Cloud Build 트리거 설정
1) Google Cloud 콘솔 → Cloud Build → Triggers → GitHub 계정 연결
2) Repository 선택 후, 빌드 설정 파일로 `cloudbuild.yaml` 지정
3) Substitutions(치환 변수) 확인/수정:
   - `_REGION`: 배포 리전 (예: `us-central1`)
   - `_REPOSITORY`: Artifact Registry 리포지토리 이름 (예: `voice-to-text-app`)
   - `_SERVICE`: Cloud Run 서비스 이름 (예: `voice-to-text-app`)
   - `_GEMINI_MODEL`: 기본 모델명 (예: `gemini-2.5-flash`)

배포 파이프라인 동작
- 트리거가 실행되면:
  1) Docker 이미지 빌드(`Dockerfile`)
  2) Artifact Registry로 푸시
  3) Cloud Run으로 배포(`--allow-unauthenticated`, `PORT=8080`)
  4) Secret Manager로부터 `GEMINI_API_KEY`가 주입되고, 모델은 `_GEMINI_MODEL`을 사용

런타임/환경 변수
- `server/index.js`는 `PORT`를 사용(기본 `8000`, 컨테이너에서는 `8080`으로 설정됨).
- 정적 웹 빌드(`web-build`)가 있으면 자동으로 서빙합니다.
- 필요한 환경:
  - `GEMINI_API_KEY`: 필수 (Secret Manager 통해 주입)
  - `GEMINI_MODEL`: 선택, 기본은 `gemini-2.5-flash`

참고
- Cloud Build 파일: `cloudbuild.yaml`
- 컨테이너 빌드/런 파일: `Dockerfile`, `.dockerignore`
- 프런트엔드 요청 엔드포인트: `POST /api/generate` (`http://<cloud-run-url>/api/generate`)