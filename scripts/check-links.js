const fs = require('fs');

const content = fs.readFileSync('README.md', 'utf8');
const re = /(assets\/[a-zA-Z0-9_\-\.\/]+)/g;
const set = new Set();
let m;
while ((m = re.exec(content))) {
  let file = m[1].replace(/[\.,\);>"]+$/, '');
  set.add(file);
}

console.log('--- Checking Assets ---');
let allOk = true;
for (const file of set) {
  const exists = fs.existsSync(file);
  console.log((exists ? '[OK]      ' : '[PENDING] ') + file);
  if (!exists) allOk = false;
}
console.log('All exist:', allOk);

