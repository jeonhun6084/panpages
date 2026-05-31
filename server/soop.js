const fs = require('fs');
const path = require('path');
const https = require('https');

const COOKIES_FILE = path.join(__dirname, 'cookies.json');
const API_BASE = 'https://api-channel.sooplive.com/v1.1/channel';

// ---------- 쿠키 관리 ----------

function loadCookies() {
  if (!fs.existsSync(COOKIES_FILE)) return null;
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    return cookies.length > 0 ? cookies : null;
  } catch { return null; }
}

function saveCookies(cookies) {
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log('[soop] 쿠키 저장 완료');
}

function cookiesToHeader(cookies) {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

// ---------- Puppeteer 로그인 ----------

async function getBrowser() {
  return require('puppeteer').launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--lang=ko-KR,ko'],
  });
}

async function doLogin(soopId, soopPw, soopPw2 = '') {
  console.log('[soop] Puppeteer 로그인 시도...');
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const LOGIN_URL = 'https://login.sooplive.com/afreeca/login.php?szFrom=full&request_uri=https%3A%2F%2Fwww.sooplive.com%2F';
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#uid', { timeout: 10000 });

  await page.click('#uid', { clickCount: 3 });
  await page.type('#uid', soopId, { delay: 60 });
  await page.click('#password', { clickCount: 3 });
  await page.type('#password', soopPw, { delay: 60 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
    page.click('#login_btn'),
  ]);

  if (page.url().includes('second_login') && soopPw2) {
    console.log('[soop] 2차 비밀번호 입력 중...');
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', soopPw2, { delay: 60 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
        page.keyboard.press('Enter'),
      ]);
    } catch (e) {
      console.log('[soop] 2차 비밀번호 처리 실패:', e.message);
    }
  }

  if (page.url().includes('campaign_pw')) {
    try {
      const skipBtn = await page.$('a[href*="request_uri"], .btn_close, [class*="skip"], [class*="later"]');
      if (skipBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {}),
          skipBtn.click(),
        ]);
      } else {
        await page.goto('https://www.sooplive.com/', { waitUntil: 'networkidle2', timeout: 10000 });
      }
    } catch {}
  }

  const cookies = await page.cookies();
  await browser.close();
  saveCookies(cookies);
  console.log('[soop] 로그인 완료');
  return cookies;
}

// ---------- 직접 API 호출 ----------

function apiGet(urlStr, cookieHeader) {
  return new Promise((resolve, reject) => {
    const req = https.get(urlStr, {
      headers: {
        'Cookie': cookieHeader || '',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Referer': 'https://www.sooplive.com/',
        'Origin': 'https://www.sooplive.com',
      },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('API timeout')); });
  });
}

// 쿠키 유효 여부 확인 (로그인된 유저 정보 조회)
async function validateCookies(cookieHeader) {
  try {
    const r = await apiGet('https://chapi.sooplive.com/api/authentication', cookieHeader);
    return r.status === 200 && r.data && r.data.user_id;
  } catch { return false; }
}

// ---------- 게시판 목록 조회 ----------

async function getBoards(bjId, cookieHeader) {
  const r = await apiGet(`${API_BASE}/${bjId}/menu`, cookieHeader);
  if (r.status !== 200 || !r.data) return [];
  return (r.data.board || []).map(b => ({
    bbsNo: b.bbsNo,
    name: b.name || '전체',
    displayType: b.displayType,
    authNo: b.authNo,
  }));
}

// ---------- 게시글 목록 조회 ----------

function normalizeUrl(u) {
  return u.startsWith('//') ? 'https:' + u : u;
}

function extractImages(post) {
  const html = (post.content && post.content.content) || '';
  const seen = new Set();
  const images = [];

  // data-url 먼저 (신규 포스트 포맷, sooplive + 구 afreecatv 도메인)
  for (const m of html.matchAll(/data-url="((?:https?:)?\/\/stimg\.(?:sooplive|afreecatv)\.[^"]+)"/g)) {
    const url = normalizeUrl(m[1]);
    if (!seen.has(url)) { seen.add(url); images.push(url); }
  }

  // src 속성 (구형 포스트 포맷, ogq_item 제외, sooplive + 구 afreecatv 도메인)
  for (const m of html.matchAll(/<img(?![^>]*ogq_item)[^>]*src="((?:https?:)?\/\/stimg\.(?:sooplive|afreecatv)\.[^"]+)"[^>]*>/g)) {
    const url = normalizeUrl(m[1]);
    if (!seen.has(url)) { seen.add(url); images.push(url); }
  }

  return images;
}

function extractThumbnail(images) {
  if (!images.length) return '';
  // GIF 우선 (animated content)
  const gif = images.find(u => /\.gif(\?|$)/i.test(u));
  return gif || images[0];
}

const SKIP_PREFIXES = ['[캐치]', '[클립]', '[Catch]', '[CATCH]'];

function shouldSkip(title) {
  return SKIP_PREFIXES.some(p => title.startsWith(p));
}

async function getBoardPosts(bjId, boardNo, page, cookieHeader) {
  const isAllBoard = !boardNo;
  const url = isAllBoard
    ? `${API_BASE}/${bjId}/board?page=${page}`
    : `${API_BASE}/${bjId}/board?bbsNo=${boardNo}&page=${page}`;
  const r = await apiGet(url, cookieHeader);
  if (r.status !== 200 || !r.data || !r.data.contents) return { posts: [], total: 0, lastPage: 1 };

  const posts = r.data.contents
    .filter(item => !shouldSkip(item.titleName || ''))
    .map(item => {
      const images = extractImages(item);
      return {
      titleNo: item.titleNo,
      title: item.titleName || '',
      author: item.userNick || '',
      authorId: item.userId || '',
      profileImage: item.profileImage || '',
      thumbnail: extractThumbnail(images),
      images,
      date: item.regDate || '',
      views: String(item.count ? item.count.readCnt : 0),
      comments: String(item.count ? item.count.commentCnt : 0),
      likes: String(item.count ? item.count.likeCnt : 0),
      photoCnt: item.photoCnt || 0,
      boardName: item.display ? item.display.bbsName : '',
      url: `https://www.sooplive.com/station/${bjId}/post/${item.titleNo}`,
      };
    });

  return {
    posts,
    total: r.data.total || 0,
    lastPage: r.data.lastPage || 1,
    currentPage: r.data.currentPage || page,
    perPage: r.data.perPage || 20,
  };
}

// ---------- 메인 진입점 ----------

async function ensureCookies(soopId, soopPw, soopPw2) {
  let cookies = loadCookies();
  if (cookies) {
    const valid = await validateCookies(cookiesToHeader(cookies));
    if (valid) {
      console.log('[soop] 저장된 쿠키 유효');
      return cookies;
    }
    console.log('[soop] 저장된 쿠키 만료됨, 재로그인...');
  }
  if (!soopId || !soopPw) {
    console.log('[soop] 로그인 정보 없음, 비로그인 상태로 진행');
    return [];
  }
  return doLogin(soopId, soopPw, soopPw2);
}

async function scrapePosts(bjId, soopId, soopPw, soopPw2 = '', boardNo = null, page = 1) {
  console.log(`[soop] ${bjId} 게시글 조회 (boardNo=${boardNo}, page=${page})`);
  const cookies = await ensureCookies(soopId, soopPw, soopPw2);
  const cookieHeader = cookies.length > 0 ? cookiesToHeader(cookies) : '';
  return getBoardPosts(bjId, boardNo, page, cookieHeader);
}

async function scrapeBoards(bjId, soopId, soopPw, soopPw2 = '') {
  console.log(`[soop] ${bjId} 게시판 목록 조회`);
  const cookies = await ensureCookies(soopId, soopPw, soopPw2);
  const cookieHeader = cookies.length > 0 ? cookiesToHeader(cookies) : '';
  return getBoards(bjId, cookieHeader);
}

module.exports = { scrapePosts, scrapeBoards };
