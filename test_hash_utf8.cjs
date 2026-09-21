const SparkMD5 = require('spark-md5');

const text = "Atenção"; // includes special chars

console.log("SparkMD5.hash (raw charCode):", SparkMD5.hash(text));

// The standard way to hash a UTF-8 string with spark-md5
const utf8Bytes = new TextEncoder().encode(text);
console.log("SparkMD5.ArrayBuffer.hash (UTF-8 bytes):", SparkMD5.ArrayBuffer.hash(utf8Bytes.buffer));

const crypto = require('crypto');
console.log("Node crypto MD5 (utf-8):", crypto.createHash('md5').update(text, 'utf8').digest('hex'));
