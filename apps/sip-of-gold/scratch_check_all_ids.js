const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

['app.js', 'goldEngine.js', 'luckyDraw.js', 'reports.js', 'messaging.js', 'db.js'].forEach(file => {
  const code = fs.readFileSync('src/js/' + file, 'utf8');
  const regex = /getElementById\(['"`](.*?)['"`]\)/g;
  let match;
  const ids = [];
  while ((match = regex.exec(code)) !== null) {
    ids.push(match[1]);
  }
  const unique = [...new Set(ids)];
  const missing = unique.filter(id => !html.includes(`id="${id}"`) && !html.includes(`id='${id}'`));
  if (missing.length > 0) {
    console.log(`File ${file} missing IDs in HTML:`, missing);
  } else {
    console.log(`File ${file} - All ${unique.length} IDs found in HTML.`);
  }
});
