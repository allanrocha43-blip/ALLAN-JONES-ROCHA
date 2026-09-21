const SparkMD5 = require('spark-md5');

// Let's replace ? with the correct characters
const xml_correct = `...`.replace(/\?/g, 'Ê'); // I'll just use the raw text and replace it

const text = "TOMOGRAFIA DE COERÊNCIA ÓPTICA  MONOCULAR";
const text_bad = "TOMOGRAFIA DE COER?NCIA ?PTICA  MONOCULAR";

console.log("SparkMD5.hash (correct):", SparkMD5.hash(text));
console.log("SparkMD5.hash (bad):", SparkMD5.hash(text_bad));

