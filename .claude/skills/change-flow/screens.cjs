// みとおし帳の画面をライト／ダークで撮る（vite preview を http://localhost:4173 で動かしておく）
// 使い方: node .claude/skills/change-flow/screens.cjs <出力先> [ハッシュ...]
//   例: node .claude/skills/change-flow/screens.cjs /tmp/out home budget prefs-accounts
// 最初にウォークスルーの1ページ目を撮り、サンプルデータを入れてから各画面を撮る
const { chromium } = require('playwright');

const [out, ...hashes] = process.argv.slice(2);
if (!out) { console.error('出力先を指定してください'); process.exit(1); }
const routes = hashes.length ? hashes : ['home', 'budget'];
const base = process.env.BASE_URL || 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForTimeout(800);
    const skip = page.getByRole('button', { name: 'スキップ' });
    if (await skip.count()) {
      await page.screenshot({ path: `${out}/welcome-${scheme}.png` });
      await skip.click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: 'サンプルデータで試す' }).click();
      await page.getByRole('button', { name: 'サンプルデータを入れる' }).click();
      await page.waitForTimeout(800);
    }
    for (const r of routes) {
      await page.goto(`${base}#${r}`);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}/${r}-${scheme}.png`, fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`${out} に保存しました`);
})();
