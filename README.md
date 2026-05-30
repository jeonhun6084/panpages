# PanPages

스트리머 팬페이지 — 유튜브 영상, SOOP 라이브 알람, SOOP 게시판 갤러리를 한 곳에서.

**배포:** https://jeonhun6084.github.io/panpages

---

## 기능

### 유튜브 영상
- 유튜브 링크 추가 및 인앱 플레이어로 재생
- 영상에 태그 분류 (추가 시 쉼표로 입력, 태그 칩으로 필터링)
- 카드 드래그앤드롭으로 순서 변경 (전체 탭일 때)

### 라이브 알람
- SOOP / 아프리카TV BJ 여러 채널 동시 모니터링
- 채널별 방송 시작 브라우저 푸시 알림 (개별 ON/OFF)
- 1분 간격 자동 폴링

### 갤러리
- SOOP 게시판 자동 로그인 + 스크롤 스크래핑 → 카드형 UI로 재구성
- 제목 키워드 검색 + 날짜 범위 필터 (7일 / 30일 / 3개월)
- 무한 스크롤 (IntersectionObserver 자동 감지)
- 포스트 클릭 시 라이트박스 인앱 프리뷰 (ESC 닫기)
- 쿠키 저장으로 재로그인 없이 빠른 재접속

### 전체
- 다크 / 라이트 테마 토글 (Navbar 우측 버튼, 설정 유지)

---

## 기술 스택

- **프론트엔드:** React 18, React Router v6, GitHub Pages
- **백엔드:** Node.js, Express, Puppeteer (갤러리 스크래핑용)

---

## 로컬 실행

### 1. 프론트엔드

```bash
npm install
npm start
# http://localhost:3000
```

### 2. 백엔드 (갤러리 기능 사용 시 필요)

```bash
cd server
cp .env.example .env   # SOOP_ID, SOOP_PW 입력
npm install
npm start
# http://localhost:3001
```

`.env` 설정:

```
SOOP_ID=본인_SOOP_아이디
SOOP_PW=본인_비밀번호
```

> 처음 실행 시 Chromium 구동으로 30초~1분 소요될 수 있어요.

---

## 갤러리 동작 방식

1. **첫 요청** — Puppeteer가 Chromium 실행 → SOOP 자동 로그인 → 쿠키를 `server/cookies.json`에 저장 → 페이지 스크롤 → 포스트 추출
2. **이후 요청** — 저장된 쿠키 재사용, 로그인 없이 바로 스크래핑
3. **쿠키 만료 시** — 갤러리 페이지의 "🔄 쿠키 초기화" 버튼 클릭 → 다음 요청 시 재로그인

---

## 배포

```bash
npm run deploy   # GitHub Pages 빌드 + 배포
```

> 백엔드는 GitHub Pages에 포함되지 않으며, 갤러리 기능은 로컬 서버 실행 환경에서만 동작합니다.

---

## 프로젝트 구조

```
panpages/
├── src/
│   ├── pages/
│   │   ├── Videos.js      # 유튜브 영상 관리 (태그, 드래그 정렬)
│   │   ├── Live.js        # SOOP 멀티채널 라이브 알람
│   │   └── Gallery.js     # SOOP 게시판 카드 갤러리 (검색, 무한스크롤, 라이트박스)
│   ├── components/
│   │   └── Navbar.js      # 네비게이션 + 테마 토글
│   ├── App.js             # ThemeContext, 라우터
│   └── App.css            # 다크/라이트 테마 CSS 변수
└── server/
    ├── index.js           # Express 서버 (port 3001)
    ├── soop.js            # Puppeteer 스크래퍼 (자동 로그인, 스크롤, 파싱)
    ├── .env.example
    └── package.json
```
