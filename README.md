# PanPages

스트리머 팬페이지 — 유튜브 영상, SOOP 라이브 알람, SOOP 게시판 갤러리를 한 곳에서.

**배포:** https://jeonhun6084.github.io/panpages

---

## 기능

| 페이지 | 설명 |
|--------|------|
| **영상** | 유튜브 영상 URL을 추가·관리하고 인앱 플레이어로 재생 |
| **라이브** | SOOP 방송국 ID를 등록해 방송 중 여부 확인 및 알람 |
| **갤러리** | SOOP 게시판을 자동 스크래핑해 카드형 UI로 재구성 |

---

## 기술 스택

- **프론트엔드:** React 18, React Router v6, GitHub Pages
- **백엔드:** Node.js, Express, Puppeteer (갤러리 스크래핑용)

---

## 로컬 실행

### 프론트엔드

```bash
npm install
npm start
# http://localhost:3000
```

### 백엔드 (갤러리 기능 사용 시 필요)

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

---

## 갤러리 동작 방식

1. **첫 요청** — Puppeteer가 Chromium을 실행해 SOOP에 자동 로그인, 쿠키를 `server/cookies.json`에 저장
2. **이후 요청** — 저장된 쿠키를 재사용해 로그인 없이 바로 스크래핑 (빠름)
3. **쿠키 만료 시** — 갤러리 페이지의 "쿠키 초기화" 버튼으로 재로그인

> 처음 실행 시 Chromium 구동으로 30초~1분 소요될 수 있습니다.

---

## 배포

```bash
npm run deploy   # GitHub Pages 빌드 + 배포
```

백엔드는 GitHub Pages에 포함되지 않으며, 갤러리 기능은 로컬 서버 실행 환경에서만 동작합니다.

---

## 프로젝트 구조

```
panpages/
├── src/
│   ├── pages/
│   │   ├── Videos.js      # 유튜브 영상 관리
│   │   ├── Live.js        # SOOP 라이브 알람
│   │   └── Gallery.js     # SOOP 게시판 카드 갤러리
│   ├── components/
│   │   └── Navbar.js
│   ├── App.js
│   └── App.css
└── server/
    ├── index.js           # Express 서버 (port 3001)
    ├── soop.js            # Puppeteer 스크래퍼
    ├── .env.example
    └── package.json
```
