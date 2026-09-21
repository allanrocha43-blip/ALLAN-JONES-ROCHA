const crypto = require('crypto');
const str = "Ação";
console.log("UTF-8:", crypto.createHash('md5').update(str, 'utf8').digest('hex'));
console.log("Latin1:", crypto.createHash('md5').update(str, 'latin1').digest('hex'));
