const SparkMD5 = require('spark-md5');
const text = "TOMOGRAFIA DE COERÊNCIA ÓPTICA - MONOCULAR"; 
console.log("SparkMD5.hash:", SparkMD5.hash(text));
const crypto = require('crypto');
console.log("Node crypto:", crypto.createHash('md5').update(text, 'utf8').digest('hex'));
console.log("Node crypto latin1:", crypto.createHash('md5').update(text, 'latin1').digest('hex'));
