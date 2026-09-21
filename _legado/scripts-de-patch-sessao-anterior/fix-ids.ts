import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

// Fix Procedure ID
const oldProcId = "id: `${pStartIdx}-${pBloco.length}-${codigo || pIndex}`,";
const newProcId = "id: `proc-${index}-${pIndex}-${codigo || 's/c'}`,";
content = content.replace(oldProcId, newProcId);

// Fix Guide ID
const oldGuideId = "id: `${startIdx}-${bloco.length}-${identificadorSemantico}`,";
const newGuideId = "id: `guia-${index}-${identificadorSemantico}`,";
content = content.replace(oldGuideId, newGuideId);

fs.writeFileSync("src/utils/tissAuditor.ts", content);
console.log("tissAuditor IDs patched");
