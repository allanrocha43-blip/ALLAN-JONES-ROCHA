const fs = require('fs');
const SparkMD5 = require('spark-md5');

const xml = `<?xml version='1.0' encoding='ISO-8859-1'?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
... (snipping the xml from before, I will use a regex to read the file I created test_user_xml.cjs)
