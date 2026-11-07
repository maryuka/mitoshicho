// dist/ を1枚の HTML（CSS・JS インライン）にまとめる。claude.ai の Artifact 公開用。
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const assets = join('dist', 'assets');
const files = readdirSync(assets);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const html = `<title>みとおし帳</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync(join('artifact', 'mitoshicho.html'), html);
console.log(`artifact/mitoshicho.html ${(html.length / 1024).toFixed(0)} KB`);
