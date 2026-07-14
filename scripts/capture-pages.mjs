import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = 'screenshots';

await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});

async function captureJourney(name, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
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

  if (pageErrors.length > 0) {
    throw new Error(`${name} page errors:\n${pageErrors.join('\n')}`);
  }

  await context.close();
}

try {
  await captureJourney('desktop', { width: 1440, height: 900 });
  await captureJourney('mobile', { width: 390, height: 844 });
} finally {
  await browser.close();
}
