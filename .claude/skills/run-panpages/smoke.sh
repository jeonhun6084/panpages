#!/usr/bin/env bash
# Smoke-test the panpages backend server (port 3001 must already be running)
# Usage: bash .claude/skills/run-panpages/smoke.sh [bjId]
#
# NOTE: 쿠키가 없으면 서버가 Puppeteer 재로그인(30~60초)을 시작합니다.
#       boards 응답이 비어있으면 --wait 플래그로 재시도하세요.
set -e

BASE="http://localhost:3001"
BJID="${1:-jeonhun6084}"

echo "=== [1] boards/$BJID ==="
BOARDS_JSON=$(curl -sf "$BASE/api/boards/$BJID")
BOARD_COUNT=$(echo "$BOARDS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('boards',[])))")

if [ "$BOARD_COUNT" -eq 0 ]; then
  echo "  boards 0개 — 쿠키 재로그인 대기 중 (최대 60초)..."
  sleep 60
  BOARDS_JSON=$(curl -sf "$BASE/api/boards/$BJID")
  BOARD_COUNT=$(echo "$BOARDS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('boards',[])))")
fi

echo "$BOARDS_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
boards = d.get('boards', [])
print(f'  OK: {len(boards)} boards')
for b in boards[:3]:
    print(f'    bbsNo={b[\"bbsNo\"]} name={b[\"name\"]} displayType={b[\"displayType\"]}')
"

FIRST_BBS=$(echo "$BOARDS_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
boards = d.get('boards', [])
print(boards[0]['bbsNo'] if boards else '')
")

echo ""
echo "=== [2] posts/$BJID?bbsNo=$FIRST_BBS&page=1 ==="
curl -sf "$BASE/api/posts/$BJID?bbsNo=$FIRST_BBS&page=1" | python3 -c "
import sys, json
d = json.load(sys.stdin)
posts = d.get('posts', [])
has_thumb = sum(1 for p in posts if p.get('thumbnail'))
has_images = sum(1 for p in posts if p.get('images'))
print(f'  OK: {len(posts)} posts, {has_thumb} have thumbnails, {has_images} have images[]')
if posts:
    p = posts[0]
    print(f'    first: {p[\"title\"][:40]} | thumb={bool(p.get(\"thumbnail\"))} | imgs={len(p.get(\"images\", []))}')
"

echo ""
echo "All smoke tests passed."
