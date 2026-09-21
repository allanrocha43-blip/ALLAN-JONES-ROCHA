const SparkMD5 = require('spark-md5');

const text = "Atenção"; // includes special chars

console.log("SparkMD5.hash:", SparkMD5.hash(text));

const utf8Bytes = new TextEncoder().encode(text);
console.log("SparkMD5.ArrayBuffer.hash:", SparkMD5.ArrayBuffer.hash(utf8Bytes.buffer));
