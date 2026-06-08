# PanPages

스트리머(SOOP/아프리카TV) 팬페이지 — 라이브 알림, 멀티뷰 동시 시청, 게시판 갤러리, 관리자 대시보드를 한 곳에서.

**배포:** https://jeonhun6084.github.io/panpages

설치형 PWA로도 사용할 수 있어요 (브라우저 주소창의 "설치" 버튼 또는 모바일 "홈 화면에 추가").

---

## 기능

### 홈 (`/`)
- 등록된 채널의 실시간 LIVE 현황 바
- 채널별 최신 게시판 소식을 모아보는 피드 (백엔드 필요)
- 우측 하단 떠있는 라이브 위젯으로 어느 페이지에서나 방송 상태 확인

### 라이브 알람 (`/live`)
- SOOP / 아프리카TV BJ 여러 채널 동시 모니터링, 1분 간격 자동 폴링
- 채널별 방송 시작 브라우저 푸시 알림 (개별 ON/OFF) + 알림 사운드(차임)
- 라이브 중인 채널은 인앱 플레이어 모달로 바로 시청 (실시간 썸네일 갱신)
- **멀티뷰** — 동시 라이브 중인 채널이 2개 이상이면, 그리드로 배치된 임베드 플레이어로 동시 시청 가능 (타일별 팝업 열기 / 닫기)
- 방송 시작 기록 히스토리 패널 (최근 200건, 시간 표시, 일괄 삭제)

### 갤러리 (`/gallery`)
- SOOP 게시판 자동 로그인 + 스크롤 스크래핑 → 카드형 UI로 재구성 (로컬 백엔드 필요)
- 게시판별 탭 필터링, 제목/작성자 검색, 날짜 범위 필터 (7일 / 30일 / 3개월)
- 무한 스크롤 (IntersectionObserver 자동 감지)
- 포스트 클릭 시 라이트박스 인앱 프리뷰 (여러 장 넘기기, ESC 닫기)
- **갤러리 구경 모드** — 게시판 이미지를 무작위 순서로 자동 재생하는 슬라이드쇼 (일시정지/이전·다음, 속도 조절 3·5·10초, 게시판별 모아보기)
- **이미지 일괄 다운로드** — 로드된 게시글의 모든 이미지를 순서대로 한 번에 다운로드 (진행 상황 표시)
- 즐겨찾기 채널 빠른 전환 바, 쿠키 초기화 버튼

### 관리자 (`/admin`)
- 구글 계정 로그인 (지정된 관리자 이메일만 접근 가능)
- 모니터링할 채널 추가/삭제
- 갤러리 즐겨찾기 채널 관리

### 전체
- 다크 / 라이트 테마 토글 (Navbar 우측 버튼, 설정 유지)
- 모든 사용자 데이터는 `localStorage`에 저장 (별도 DB 없음)

---

## 기술 스택

- **프론트엔드:** React 18, React Router v6 (HashRouter), `@react-oauth/google`, GitHub Pages 배포, PWA(Service Worker + Web App Manifest)
- **백엔드:** Node.js, Express, Puppeteer (SOOP 자동 로그인 및 게시판 스크래핑 전용)

---

## 로컬 실행

### 1. 프론트엔드

```bash
npm install
npm start
# http://localhost:3000
```

### 2. 백엔드 (갤러리 / 홈 피드 기능 사용 시 필요)

```bash
cd server
cp .env.example .env   # SOOP_ID, SOOP_PW 입력
npm install
npm start
# http://localhost:3001
```

`server/.env` 설정:

```
SOOP_ID=본인_SOOP_아이디
SOOP_PW=본인_비밀번호
SOOP_PW2=2차_비밀번호   # 있는 경우만
PORT=3001
```

> 처음 실행 시 Chromium 구동 + 자동 로그인으로 30초~1분 소요될 수 있어요. 이후엔 저장된 쿠키(`server/cookies.json`)를 재사용해 빠르게 동작해요.

### 3. 관리자 로그인 (선택)

`/admin`에서 구글 로그인을 사용하려면 `src/config.js`에 본인의 Google OAuth 클라이언트 ID와 관리자 이메일을 설정하세요. (환경변수 `REACT_APP_GOOGLE_CLIENT_ID`로도 덮어쓸 수 있어요.)

---

## 갤러리 동작 방식

1. **첫 요청** — Puppeteer가 Chromium 실행 → SOOP 자동 로그인 → 쿠키를 `server/cookies.json`에 저장 → 페이지 스크롤 → 포스트 추출
2. **이후 요청** — 저장된 쿠키 재사용, 로그인 없이 바로 스크래핑
3. **쿠키 만료 시** — 갤러리 페이지의 "쿠키 초기화" 버튼 클릭 → 다음 요청 시 재로그인

> 멀티뷰의 임베드 플레이어는 SOOP 자체 페이지를 iframe으로 불러올 뿐, `.env`의 계정으로 로그인되지는 않아요 (브라우저 쿠키는 도메인별로 격리되어 있어 주입할 수 없음). 로그인 상태로 보려면 사용자가 직접 브라우저에서 SOOP에 로그인되어 있어야 해요.

---

## 배포

```bash
npm run deploy   # 빌드 + GitHub Pages(gh-pages 브랜치) 배포
```

> 백엔드는 GitHub Pages에 포함되지 않으며, 갤러리·홈 피드 기능은 로컬 서버 실행 환경에서만 동작합니다.

---

## 프로젝트 구조

```
panpages/
├── public/
│   ├── manifest.json      # PWA 매니페스트
│   └── sw.js              # 서비스 워커 (앱 셸 캐싱, /api 제외)
├── src/
│   ├── pages/
│   │   ├── Landing.js     # 홈 — 라이브 현황 바, 최신 소식 피드
│   │   ├── Live.js        # SOOP 멀티채널 라이브 알람, 멀티뷰, 방송 기록
│   │   ├── Gallery.js     # SOOP 게시판 카드 갤러리, 슬라이드쇼, 일괄 다운로드
│   │   ├── Admin.js       # 관리자 — 채널/즐겨찾기 관리 (구글 로그인)
│   │   └── Videos.js      # 유튜브 영상 관리 (태그, 드래그 정렬)
│   ├── components/
│   │   ├── Navbar.js      # 네비게이션 + 테마 토글
│   │   ├── LiveWidget.js  # 떠있는 라이브 상태 위젯
│   │   └── Icon.js        # 인라인 SVG 아이콘 모음
│   ├── context/
│   │   ├── LiveContext.js # 채널 상태 폴링, 알림/사운드, 방송 기록
│   │   └── AuthContext.js # 관리자 구글 로그인 세션
│   ├── hooks/
│   │   └── useGalleryFavs.js
│   ├── config.js          # Google OAuth 클라이언트 ID, 관리자 이메일
│   ├── App.js             # ThemeContext, 라우터, 프로바이더 조립
│   └── App.css            # 다크/라이트 테마 CSS 변수 및 전체 스타일
└── server/
    ├── index.js           # Express 서버 (port 3001)
    ├── soop.js            # Puppeteer 스크래퍼 (자동 로그인, 스크롤, 파싱)
    ├── .env.example
    └── package.json
```
