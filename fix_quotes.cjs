const fs = require('fs');

let corTest = fs.readFileSync('src/utils/tiss/correcoes.test.ts', 'utf8');
corTest = corTest.replace(/\\\`/g, '`');
fs.writeFileSync('src/utils/tiss/correcoes.test.ts', corTest);
