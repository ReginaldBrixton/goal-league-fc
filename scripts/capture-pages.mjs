import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = 'screenshots';
const videoDir = 'videos';

await mkdir(screenshotDir, { recursive: true });
await mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});

async function pressAndHoldMobileControl(page, context) {
  await page.locator('.game-screen').waitFor({ state: 'visible' });
  await page.locator('.live-match-canvas canvas').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__goalLeagueDebug?.snapshot().activeUser), null, { timeout: 20_000 });

  const control = page.getByRole('button', { name: 'Move right' });
  const box = await control.boundingBox();
  assert.ok(box, 'Move-right control must have a visible touch target');
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const client = await context.newCDPSession(page);
  const before = await page.evaluate(() => window.__goalLeagueDebug.snapshot().activeUser.pos);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y, radiusX: 8, radiusY: 8, force: 1, id: 17 }],
  });
  await page.waitForFunction(() => window.__goalLeagueDebug.input().right === true);
  await page.waitForTimeout(1250);

  const during = await page.evaluate(() => ({
    input: window.__goalLeagueDebug.input(),
    snapshot: window.__goalLeagueDebug.snapshot(),
    selectedText: window.getSelection()?.toString() ?? '',
    pressed: document.querySelector('[aria-label="Move right"]')?.getAttribute('data-pressed'),
  }));
  assert.equal(during.input.right, true, 'held pointer must keep movement active');
  assert.equal(during.pressed, 'true', 'held control must show pressed feedback');
  assert.equal(during.selectedText, '', 'long press must not select interface text');
  assert.ok(during.snapshot.activeUser, 'an active user player must remain selected');
  const moved = Math.hypot(
    during.snapshot.activeUser.pos.x - before.x,
    during.snapshot.activeUser.pos.y - before.y,
  );
  assert.ok(moved > 0.35, `held movement must move the active player, observed ${moved.toFixed(3)}m`);

  await page.screenshot({
    path: `${screenshotDir}/06-game-control-hold-mobile.png`,
    fullPage: false,
    animations: 'disabled',
  });

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => window.__goalLeagueDebug.input().right === false);
}

async function captureJourney(name, viewport, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    reducedMotion: 'reduce',
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      : undefined,
    recordVideo: mobile ? { dir: videoDir, size: viewport } : undefined,
  });
  const page = await context.newPage();
  const video = page.video();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const shot = async (number, routeName) => {
    await page.screenshot({
      path: `${screenshotDir}/${number}-${routeName}-${name}.png`,
      fullPage: false,
      animations: 'disabled',
    });
  };

  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.landing-native').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(900);
  await shot('01', 'dashboard');

  await page.getByRole('button', { name: /start new career/i }).click();
  await page.waitForURL(/\/start-career$/);
  await page.locator('.career-select-screen').waitFor({ state: 'visible' });
  await page.locator('.career-club-card').nth(1).click();
  await page.waitForTimeout(800);
  await shot('02', 'start-career');

  await page.locator('.career-begin').click();
  await page.waitForURL(/\/hub$/, { timeout: 20_000 });
  await page.locator('.hub').waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);
  await shot('03', 'hub');

  await page.getByRole('button', { name: /play match/i }).click();
  await page.waitForURL(/\/confirm-match\//, { timeout: 20_000 });
  await page.locator('.match-confirm-screen').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
  await shot('04', 'confirm-match');

  await page.locator('.kickoff-button').click();
  await page.waitForURL(/\/game\//, { timeout: 20_000 });
  await page.locator('.game-screen').waitFor({ state: 'visible' });
  await page.locator('.live-match-canvas canvas').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(2500);
  await shot('05', 'game');

  if (mobile) await pressAndHoldMobileControl(page, context);

  if (pageErrors.length > 0) {
    throw new Error(`${name} page errors:\n${pageErrors.join('\n')}`);
  }

  await context.close();
  if (video) await video.saveAs(`${videoDir}/${name}-gameplay.webm`);
}

try {
  await captureJourney('desktop', { width: 1440, height: 900 });
  await captureJourney('mobile', { width: 390, height: 844 }, true);
} finally {
  await browser.close();
}
