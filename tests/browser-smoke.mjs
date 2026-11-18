import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
  args: ['--no-sandbox'],
});
const base = process.env.TEST_URL || 'http://127.0.0.1:5180/';
const staticMode =
  process.env.TEST_STATIC === '1' ||
  base.includes(':4175') ||
  new URL(base).hostname.endsWith('.github.io');
const out = resolve('artifacts');
await mkdir(out, { recursive: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const failures = [];
page.on('pageerror', (e) => failures.push(e.message));
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '别人对你的第一印象测试' }).waitFor();
  await page.screenshot({ path: resolve(out, 'home-desktop.png'), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({ path: resolve(out, `home-${width}.png`), fullPage: true });
    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: innerWidth,
    }));
    assert.ok(size.scroll <= size.client + 1, `首页${width}px横向溢出: ${JSON.stringify(size)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '开始我的探索' }).click();
  await page.getByRole('heading', { name: '参加一场完全不认识人的聚会，你通常会：' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '下一题', exact: true }).isDisabled(), true);
  await page.getByRole('radio').nth(0).click();
  await page.getByRole('button', { name: '下一题', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .getByRole('heading', { name: '第一次和别人单独吃饭，对方突然沉默了，你会：' })
    .waitFor();
  await page.getByRole('button', { name: '上一题' }).click();
  assert.equal(await page.getByRole('radio').nth(0).getAttribute('aria-checked'), 'true');
  await page.screenshot({ path: resolve(out, 'quiz-mobile.png'), fullPage: true });
  for (let i = 0; i < 18; i++) {
    await page
      .getByRole('radio')
      .nth(i % 4)
      .click();
    await page
      .getByRole('button', { name: i === 17 ? '查看我的第一印象' : '下一题', exact: true })
      .click();
  }
  await page.getByRole('heading', { name: '原来，你是这样的你。' }).waitFor();
  await page.screenshot({ path: resolve(out, 'result-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '生成分享海报', exact: true }).click();
  await page.getByRole('button', { name: '生成我的印象卡', exact: true }).click();
  await page.getByRole('img', { name: '你的第一印象分享海报' }).waitFor({ timeout: 20000 });
  const png = await page.getByRole('img', { name: '你的第一印象分享海报' }).getAttribute('src');
  await writeFile(resolve(out, 'poster.png'), Buffer.from(png.split(',')[1], 'base64'));
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('yinxiang.session.v1')));
  assert.equal(
    Object.values(s.result.scores).reduce((a, b) => a + b, 0),
    18,
  );
  const id = s.id;
  if (staticMode) {
    const summary = { n: s.result.normalized, r: s.result.result, e: s.result.easterEgg ? 1 : 0 };
    const token = Buffer.from(JSON.stringify(summary)).toString('base64url');
    const stranger = await browser.newContext();
    const sharePage = await stranger.newPage();
    await sharePage.goto(`${base}#/share/local/${token}`);
    await sharePage.getByRole('heading', { name: 'TA 的第一印象倾向是' }).waitFor();
    await stranger.close();
  } else {
    const response = await page.request.post(new URL(`api/sessions/${id}/share`, base).href, {
      data: {},
    });
    assert.equal(response.ok(), true);
    const { token } = await response.json();
    const stranger = await browser.newContext();
    const sharePage = await stranger.newPage();
    await sharePage.goto(`${base}#/share/${token}`);
    await sharePage.getByRole('heading', { name: 'TA 的第一印象倾向是' }).waitFor();
    assert.equal(await sharePage.getByText('三个典型印象').count(), 0);
    await stranger.close();
    const text = await readFile('first-login.txt', 'utf8');
    const username = text.match(/账号 (.+)/)[1],
      password = text.match(/密码 (.+)/)[1];
    await page.goto(`${base}#/admin`);
    await page.getByLabel('管理员账号').fill(username);
    await page.getByLabel('密码', { exact: true }).fill(password);
    await page.getByRole('button', { name: '登录管理后台' }).click();
    await page.getByRole('heading', { name: '数据总览', exact: true }).waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: resolve(out, 'admin-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: '题库管理', exact: true }).click();
    await page.getByLabel('题目正文').waitFor();
    assert.equal(
      await page.getByLabel('题目正文').inputValue(),
      '参加一场完全不认识人的聚会，你通常会：',
    );
    await page.getByRole('button', { name: '结果内容', exact: true }).click();
    await page.getByLabel('结果名称').waitFor();
    assert.equal(await page.getByLabel('结果名称').inputValue(), '人间小太阳');
    await page.getByRole('button', { name: '退出登录' }).click();
    await page.getByRole('heading', { name: '欢迎回到研究所' }).waitFor();
  }
  assert.deepEqual(failures, []);
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          'desktop/mobile layouts',
          '320px overflow',
          'progress restore',
          'back and change answers',
          'all 18 questions',
          'real scoring',
          'PNG poster',
          'public share',
          ...(staticMode ? [] : ['admin login and editors']),
        ],
        screenshots: out,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
