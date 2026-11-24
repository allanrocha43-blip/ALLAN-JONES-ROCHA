/**
 * The Brain: AI PDF Ingestor
 * --------------------------
 * Concept: Reads TISS/Manual PDFs, extracts rules using LLM, and outputs JSON for the extension.
 * This runs OFFLINE (on developer machine), not in the browser.
 */

const fs = require('fs');
const path = require('path');

// Mock LLM Client
const askLLM = async (prompt) => {
    console.log('[AI] Thinking...', prompt.substring(0, 50) + '...');
    // In real life: Call OpenAI/Gemini API
    return JSON.stringify({
        id: "GENERATED_RULE_" + Date.now(),
        description: "Regra extraída do manual PDF pág 32",
        condition: "type == '05'",
        requiredFields: ["newField"]
    });
};

const ingestManual = async (filePath) => {
    console.log(`[Brain] Reading manual: ${filePath}`);
    // 1. Extract Text from PDF (using pdf-parse lib)
    /* const data = await pdf(buffer); */

    // 2. Feed to LLM
    const rule = await askLLM("Extract validation rules for 'Guia de Consulta' from this text...");

    // 3. Save to Recipes
    const outputPath = path.join(__dirname, '../src/config/generated_rules.json');
    fs.writeFileSync(outputPath, rule);
    console.log(`[Brain] Knowledge distilled to: ${outputPath}`);
};

// Execution
// node tools/ingest.js ./manual_unimed_2025.pdf
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        ingestManual(args[0]);
    } else {
        console.log("Usage: node tools/ingest.js <path-to-pdf>");
        // Create demo file
        const demoPath = path.join(__dirname, '../src/config/generated_rules.json');
        if (!fs.existsSync(demoPath)) {
            fs.writeFileSync(demoPath, JSON.stringify([], null, 2));
            console.log("Created empty rules file.");
        }
    }
}
