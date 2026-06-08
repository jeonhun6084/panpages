require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapePosts, scrapeBoards, scrapeNotices } = require('./soop');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

function getSoopCreds() {
  return {
    soopId: process.env.SOOP_ID || '',
    soopPw: process.env.SOOP_PW || '',
    soopPw2: process.env.SOOP_PW2 || '',
  };
}

function validateBjId(bjId) {
  return bjId && /^[a-zA-Z0-9_]+$/.test(bjId);
}

// 게시판 목록
app.get('/api/boards/:bjId', async (req, res) => {
  const { bjId } = req.params;
  if (!validateBjId(bjId)) return res.status(400).json({ error: '올바른 SOOP 아이디를 입력하세요.' });

  try {
    const { soopId, soopPw, soopPw2 } = getSoopCreds();
    const boards = await scrapeBoards(bjId, soopId, soopPw, soopPw2);
    res.json({ boards });
  } catch (err) {
    console.error('[server] boards 오류:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 게시글 목록 (직접 API 사용)
app.get('/api/posts/:bjId', async (req, res) => {
  const { bjId } = req.params;
  if (!validateBjId(bjId)) return res.status(400).json({ error: '올바른 SOOP 아이디를 입력하세요.' });

  const boardNo = req.query.boardNo ? parseInt(req.query.boardNo) : null;
  // bbsNo 파라미터도 지원 (프론트엔드 호환)
  const bbsNo = req.query.bbsNo ? parseInt(req.query.bbsNo) : boardNo;
  const page = Math.max(1, parseInt(req.query.page) || 1);

  try {
    const { soopId, soopPw, soopPw2 } = getSoopCreds();
    const result = await scrapePosts(bjId, soopId, soopPw, soopPw2, bbsNo, page);
    res.json(result);
  } catch (err) {
    console.error('[server] posts 오류:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 공지 목록
app.get('/api/notices/:bjId', async (req, res) => {
  const { bjId } = req.params;
  if (!validateBjId(bjId)) return res.status(400).json({ error: '올바른 SOOP 아이디를 입력하세요.' });

  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));
  try {
    const { soopId, soopPw, soopPw2 } = getSoopCreds();
    const result = await scrapeNotices(bjId, soopId, soopPw, soopPw2, limit);
    res.json(result);
  } catch (err) {
    console.error('[server] notices 오류:', err.message);
    res.status(500).json({ error: err.message });
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
  console.log(`\n서버 실행 중: http://localhost:${PORT}`);
  if (!process.env.SOOP_ID) {
    console.log('  .env 파일에 SOOP_ID, SOOP_PW가 없습니다. 비로그인 상태로 스크래핑합니다.');
  } else {
    console.log(`  SOOP 계정: ${process.env.SOOP_ID}`);
  }
});
