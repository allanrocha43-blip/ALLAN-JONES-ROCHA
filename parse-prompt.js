const fs = require('fs');

const promptContent = fs.readFileSync('prompt.txt', 'utf8');

// The prompt text is in the message we received. Wait, I can't read 'prompt.txt' directly because I don't have it.
// I will just use sed or standard text replacement on the file.
