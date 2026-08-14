const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const appCode = fs.readFileSync('src/js/app.js', 'utf8');

const regex = /getElementById\(['"`](.*?)['"`]\)/g;
let match;
const ids = [];
while ((match = regex.exec(appCode)) !== null) {
  ids.push(match[1]);
}
const unique = [...new Set(ids)];
const missing = unique.filter(id => !html.includes(`id="${id}"`) && !html.includes(`id='${id}'`));
console.log('Total IDs checked:', unique.length);
console.log('Missing IDs:', missing);
