#!/usr/bin/env node
// Screenshot the panpages React app (dev server on port 3000)
// Usage: node .claude/skills/run-panpages/screenshot.cjs [page] [outfile]
//   page: "youtube" | "live" | "gallery" (default: "gallery")
//   outfile: path for PNG (default: /tmp/panpages-<page>.png)

const puppeteer = require('/Users/jeonghunkim/클로드/panpages/server/node_modules/puppeteer');

const PAGE_MAP = {
  home:    '/#/',
  landing: '/#/',
  youtube: '/#/',
  live:    '/#/live',
  gallery: '/#/gallery',
  admin:   '/#/admin',
};

const page = process.argv[2] || 'gallery';
const outfile = process.argv[3] || `/tmp/panpages-${page}.png`;
const hash = PAGE_MAP[page] ?? `/#/${page}`;

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto(`http://localhost:3000${hash}`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 800));
  await p.screenshot({ path: outfile });
  await browser.close();
  console.log(`screenshot saved: ${outfile}`);
})();
