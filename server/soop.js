const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const COOKIES_FILE = path.join(__dirname, 'cookies.json');

async function getBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--lang=ko-KR,ko',
    ],
  });
}

async function loadCookies(page) {
  if (!fs.existsSync(COOKIES_FILE)) return false;
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    if (cookies.length === 0) return false;
    await page.setCookie(...cookies);
    return true;
  } catch { return false; }
}

async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log('[soop] 쿠키 저장 완료');
}

async function isLoggedIn(page) {
  try {
    // 로그인된 상태면 닉네임/유저 영역이 보임
    const result = await page.evaluate(() => {
      const selectors = [
        '.gnb_user_area',
        '.header_user',
        '[class*="userNick"]',
        '[class*="user-nick"]',
        '.nick',
        '[data-testid="user-info"]',
      ];
      return selectors.some(s => !!document.querySelector(s));
    });
    return result;
  } catch { return false; }
}

async function doLogin(page, id, pw) {
  console.log('[soop] 로그인 시도...');

  // SOOP 로그인 페이지로 이동
  await page.goto('https://login.sooplive.com/', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // 아이디/비밀번호 입력 필드 대기
  const idSelectors = ['#uid', 'input[name="uid"]', 'input[type="text"]'];
  const pwSelectors = ['#passwd', '#password', 'input[name="password"]', 'input[type="password"]'];

  let idField = null;
  for (const sel of idSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      idField = sel;
      break;
    } catch {}
  }

  if (!idField) throw new Error('로그인 폼을 찾을 수 없습니다. SOOP 로그인 페이지 구조가 변경됐을 수 있어요.');

  let pwField = null;
  for (const sel of pwSelectors) {
    const el = await page.$(sel);
    if (el) { pwField = sel; break; }
  }
  if (!pwField) throw new Error('비밀번호 입력 필드를 찾을 수 없습니다.');

  await page.click(idField, { clickCount: 3 });
  await page.type(idField, id, { delay: 60 });

  await page.click(pwField, { clickCount: 3 });
  await page.type(pwField, pw, { delay: 60 });

  // 로그인 버튼 클릭
  const submitSelectors = [
    'button[type="submit"]',
    '.btn_login',
    '.login_btn',
    'input[type="submit"]',
  ];

  let submitted = false;
  for (const sel of submitSelectors) {
    const el = await page.$(sel);
    if (el) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        el.click(),
      ]);
      submitted = true;
      break;
    }
  }

  if (!submitted) {
    // Enter 키 시도
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  }

  await saveCookies(page);
  console.log('[soop] 로그인 완료');
}

async function scrollAndWait(page, times) {
  for (let i = 0; i < times; i++) {
    const prevHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1800));
    // 새 콘텐츠 로드됐는지 확인
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === prevHeight) {
      console.log(`[soop] ${i + 1}번째 스크롤: 더 이상 새 콘텐츠 없음`);
      break;
    }
    console.log(`[soop] ${i + 1}/${times} 스크롤 완료`);
  }
}

async function extractPosts(page) {
  return page.evaluate(() => {
    // SOOP 게시판 포스트 셀렉터 (여러 가지 시도)
    const listSelectors = [
      '.post_list > li',
      '.board_list > li',
      'ul.list_area > li',
      '[class*="PostList"] > li',
      '[class*="post-list"] > li',
      '.list_box > li',
      'ul[class*="list"] > li',
    ];

    let items = [];
    for (const sel of listSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        items = Array.from(found);
        break;
      }
    }

    // 찾지 못했으면 포스트 아이템 직접 탐색
    if (items.length === 0) {
      const allLi = document.querySelectorAll('li');
      items = Array.from(allLi).filter(li => {
        const hasLink = li.querySelector('a[href*="station"]') || li.querySelector('a[href*="/post/"]');
        const hasTitle = li.querySelector('[class*="title"], .tit, h3, h4');
        return hasLink && hasTitle;
      });
    }

    const postMap = new Map(); // 중복 제거용

    const result = items.map(item => {
      const titleEl = item.querySelector('[class*="title"], .tit, h3:not(:empty), h4:not(:empty), [class*="subject"]');
      const imgEl = Array.from(item.querySelectorAll('img')).find(img => {
        const src = img.src || img.dataset?.src || '';
        return src && !src.includes('profile') && !src.includes('avatar') && !src.includes('logo') && !src.includes('icon');
      });
      const dateEl = item.querySelector('[class*="date"], .date, time, [class*="time"]');
      const viewEl = item.querySelector('[class*="view"], .view_cnt, .hit, [class*="hit"]');
      const commentEl = item.querySelector('[class*="comment"], .cmt_cnt, [class*="reply"], .reply_cnt');
      const linkEl = item.querySelector('a[href*="station"]') || item.querySelector('a[href]');

      const title = titleEl?.textContent?.trim() || '';
      const url = linkEl?.href || '';
      const thumbnail = imgEl?.src || imgEl?.dataset?.src || imgEl?.dataset?.lazySrc || '';

      return {
        title,
        thumbnail: thumbnail.startsWith('http') ? thumbnail : '',
        date: dateEl?.textContent?.trim() || '',
        views: viewEl?.textContent?.trim()?.replace(/[^0-9,]/g, '') || '',
        comments: commentEl?.textContent?.trim()?.replace(/[^0-9,]/g, '') || '',
        url,
      };
    }).filter(p => p.title && p.url && !postMap.has(p.url) && postMap.set(p.url, true));

    return result;
  });
}

async function scrapePosts(bjId, soopId, soopPw, scrollCount = 5) {
  console.log(`[soop] ${bjId} 스크래핑 시작 (스크롤 ${scrollCount}회)`);

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.5' });

  const postUrl = `https://www.sooplive.com/station/${bjId}/post`;

  // 저장된 쿠키 로드
  await loadCookies(page);

  await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // 로그인 여부 확인
  const loggedIn = await isLoggedIn(page);
  console.log(`[soop] 로그인 상태: ${loggedIn}`);

  if (!loggedIn && soopId && soopPw) {
    await doLogin(page, soopId, soopPw);
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  // 포스트 목록 로드 대기
  await new Promise(r => setTimeout(r, 2000));

  // 스크롤
  await scrollAndWait(page, scrollCount);

  // 데이터 추출
  const posts = await extractPosts(page);
  console.log(`[soop] 포스트 ${posts.length}개 추출 완료`);

  await browser.close();
  return posts;
}

module.exports = { scrapePosts };
