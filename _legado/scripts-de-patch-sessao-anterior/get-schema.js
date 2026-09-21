const fs = require('fs');
console.log(fs.readFileSync('src/utils/tissAuditor.ts', 'utf-8').slice(0, 1000));
