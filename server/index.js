require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapePosts } = require('./soop');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

// 진행 중인 스크래핑 요청 (중복 방지)
const pending = new Map();

app.get('/api/posts/:bjId', async (req, res) => {
  const { bjId } = req.params;
  const scroll = Math.min(parseInt(req.query.scroll) || 5, 20);

  if (!bjId || !/^[a-zA-Z0-9_]+$/.test(bjId)) {
    return res.status(400).json({ error: '올바른 SOOP 아이디를 입력하세요.' });
  }

  // 같은 bjId로 중복 요청 시 대기
  if (pending.has(bjId)) {
    return res.status(429).json({ error: '이미 해당 아이디를 불러오는 중입니다.' });
  }

  const soopId = process.env.SOOP_ID || '';
  const soopPw = process.env.SOOP_PW || '';

  pending.set(bjId, true);
  try {
    const posts = await scrapePosts(bjId, soopId, soopPw, scroll);
    res.json({ posts, count: posts.length });
  } catch (err) {
    console.error('[server] 오류:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    pending.delete(bjId);
  }
});

// 쿠키 초기화 (재로그인 강제)
app.delete('/api/cookies', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const cookiesFile = path.join(__dirname, 'cookies.json');
  if (fs.existsSync(cookiesFile)) fs.unlinkSync(cookiesFile);
  res.json({ ok: true, message: '쿠키 삭제됨. 다음 요청 시 재로그인합니다.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 서버 실행 중: http://localhost:${PORT}`);
  if (!process.env.SOOP_ID) {
    console.log('⚠️  .env 파일에 SOOP_ID, SOOP_PW가 없습니다. 비로그인 상태로 스크래핑합니다.');
  } else {
    console.log(`✅  SOOP 계정: ${process.env.SOOP_ID}`);
  }
});
