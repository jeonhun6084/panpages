---
name: run-panpages
description: run, start, launch, screenshot, test the panpages fan page app — React frontend and Express backend server
---

# run-panpages

SOOP 팬페이지 앱. React 프론트엔드(포트 3000) + Express 백엔드(포트 3001) 두 프로세스로 구성됩니다.

**드라이버**: 백엔드는 `smoke.sh`(curl), 프론트엔드는 `screenshot.cjs`(puppeteer + system Chrome).  
두 스크립트 모두 `panpages/` 루트 기준 `.claude/skills/run-panpages/` 에 있습니다.

---

## Prerequisites

- Node.js (v18+)
- macOS — `screencapture`, `/Applications/Google Chrome.app` 필요
- `server/.env` 에 SOOP 계정 정보 필요:
  ```
  SOOP_ID=...
  SOOP_PW=...
  SOOP_PW2=...   # 2차 비밀번호 있을 경우
  PORT=3001
  ```

---

## Build / Install

```bash
# 프론트엔드 의존성
cd /Users/jeonghunkim/클로드/panpages
npm install

# 백엔드 의존성
cd /Users/jeonghunkim/클로드/panpages/server
npm install
```

---

## Run (agent path)

### 1. 백엔드 서버 시작

```bash
cd /Users/jeonghunkim/클로드/panpages/server
node index.js &
```

서버가 준비됐는지 확인:
```bash
curl -sf http://localhost:3001/api/boards/jeonhun6084 | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['boards']), 'boards')"
```

### 2. 프론트엔드 개발 서버 시작

```bash
cd /Users/jeonghunkim/클로드/panpages
npm start &
# 포트 3000에서 실행됨, 준비까지 ~10초
```

### 3. Smoke test (API 검증)

```bash
bash .claude/skills/run-panpages/smoke.sh jeonhun6084
```

출력 예시:
```
=== [1] boards/jeonhun6084 ===
  OK: 14 boards
    bbsNo=69987290 name=깅 displayType=104
    ...
=== [2] posts/jeonhun6084?bbsNo=69987290&page=1 ===
  OK: 20 posts, 19 have thumbnails, 19 have images[]
...
All smoke tests passed.
```

### 4. 스크린샷

```bash
node .claude/skills/run-panpages/screenshot.cjs gallery /tmp/panpages-gallery.png
node .claude/skills/run-panpages/screenshot.cjs youtube /tmp/panpages-youtube.png
node .claude/skills/run-panpages/screenshot.cjs live   /tmp/panpages-live.png
```

페이지 옵션: `youtube` | `live` | `gallery`

---

## Run (human path)

```bash
# 터미널 1
cd server && npm start

# 터미널 2
cd /Users/jeonghunkim/클로드/panpages && npm start
# 브라우저에서 http://localhost:3000 열림
```

---

## Key API endpoints

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/boards/:bjId` | 게시판 목록 |
| GET | `/api/posts/:bjId?bbsNo=N&page=N` | 게시글 목록 (썸네일·이미지 포함) |
| DELETE | `/api/cookies` | 저장된 쿠키 삭제 (재로그인 강제) |

---

## Gotchas

- **첫 실행 시 로그인에 30초~1분 소요**: Puppeteer로 SOOP 자동 로그인 후 `server/cookies.json` 저장. 이후엔 쿠키 재사용.
- **`bbsNo` vs `boardNo`**: SOOP API 필터 파라미터는 `bbsNo`. `boardNo`는 무시됨.
- **displayType=106 게시판("전체")**: `bbsNo=93354545` 로 필터하면 빈 결과. `bbsNo` 없이 호출해야 함. `ALL_BOARD_NOS` 배열에 등록.
- **이미지 도메인**: 신규 포스트는 `stimg.sooplive.com`, 구형(2023~2024)은 `stimg.afreecatv.com` 사용. `extractImages()`에서 두 도메인 모두 파싱.
- **GIF 우선**: `extractThumbnail()`은 이미지 배열에서 `.gif` 를 우선 선택.
- **`photos[]` 필드 사용 금지**: API 응답의 `photos[]`는 `stimg.afreecatv.com` URL → 404. `content.content` HTML을 파싱해야 함.
- **무한 스크롤 stale closure**: `page`/`hasMore` state 대신 ref(`pageRef`, `hasMoreRef`)로 관리. `loadMore` callback deps 없음.
- **`[캐치]`, `[클립]` 접두사 게시글**: `shouldSkip()` 으로 서버에서 필터링.

---

## Troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| `curl: (7) Failed to connect to localhost port 3001` | 서버 미실행 | `cd server && npm start` |
| 썸네일 전부 404 | `photos[]` 필드 사용 | `content.content` HTML 파싱으로 전환 |
| 게시판 필터링 안 됨 | `boardNo` 파라미터 사용 | `bbsNo` 파라미터로 변경 |
| "전체" 게시판 빈 결과 | bbsNo 필터 적용 | `ALL_BOARD_NOS`에 해당 bbsNo 추가 |
| 쿠키 만료 후 재로그인 안 됨 | `user_id` 필드명 오인 | `validateCookies()` 에서 `r.data.user_id` 확인 |
