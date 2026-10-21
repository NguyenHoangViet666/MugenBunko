import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Expo 57 requires query-string 7's CommonJS API. The patched decoder is ESM.
// Normalize its default export until Expo can adopt the newer query-string API.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'node_modules/query-string/index.js');
const original = "const decodeComponent = require('decode-uri-component');";
const replacement = "const decodeModule = require('decode-uri-component');\nconst decodeComponent = decodeModule.default || decodeModule;";
const content = fs.readFileSync(entry, 'utf8');
if (content.includes(original)) {
    fs.writeFileSync(entry, content.replace(original, replacement));
} else if (!content.includes(replacement)) {
    throw new Error('query-string changed: review the decoder compatibility adapter before continuing.');
}
console.log('query-string: patched decoder compatibility verified');
