// Embeds a TTF into showreel.html as base64 so the piece stays a single self-contained file.
// Usage: node render/embed-font.cjs path/to/Geist[wght].ttf
const fs = require('fs');
const path = require('path');

const ttf = process.argv[2];
if (!ttf) {
  console.error('usage: node render/embed-font.cjs <font.ttf>');
  process.exit(1);
}
const htmlPath = path.join(__dirname, '..', 'showreel.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const b64 = fs.readFileSync(ttf).toString('base64').replace(/.{1,120}/g, '$&\n');
const out = html.replace(
  /(<script id="geist-ttf" type="application\/octet-stream">)[\s\S]*?(<\/script>)/,
  `$1\n${b64}$2`,
);
if (out === html) {
  console.error('font block not found');
  process.exit(1);
}
fs.writeFileSync(htmlPath, out);
console.log(`embedded ${path.basename(ttf)} (${fs.statSync(ttf).size} bytes)`);
