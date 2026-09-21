const SparkMD5 = require('spark-md5');
const str = "Ação"; // Has accents
console.log(SparkMD5.hash(str));
