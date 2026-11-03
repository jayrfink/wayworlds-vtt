import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULEBOOKS_DIR = path.join(__dirname, '../../assets/rulebooks');
const OUTPUT_FILE = path.join(__dirname, '../../data/rulebooks.json');

const BOOKS = [
  { file: 'wayworlds-basic-rules.pdf', bookId: 'ad-basic', bookTitle: 'Wayworlds Basic Game Rules', system: 'Wayworlds Core' },
  { file: 'wayworlds-expanded-rules.pdf', bookId: 'ad-expanded', bookTitle: 'Wayworlds Expanded Game Rules', system: 'Wayworlds Core' },
  { file: 'wayworlds-frontier-module.pdf', bookId: 'ad-frontier', bookTitle: 'Frontier Campaign Module', system: 'Wayworlds Core' },
  { file: 'wayworlds-atlas-basic.pdf', bookId: 'kh-basic', bookTitle: 'World Atlas Basic Rules', system: 'World Atlas' },
  { file: 'wayworlds-atlas-expansion.pdf', bookId: 'kh-expansion', bookTitle: 'World Atlas Expansion Rules', system: 'World Atlas' },
  { file: 'wayworlds-atlas-brief.pdf', bookId: 'kh-mission', bookTitle: 'World Atlas Mission Brief', system: 'World Atlas' }
];

export async function extractRulebooks() {
  const allEntries = [];

  for (const b of BOOKS) {
    const filePath = path.join(RULEBOOKS_DIR, b.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer, {
      pagerender: function (pageData) {
        return pageData.getTextContent().then(textContent => {
          let lastY, text = '';
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str + ' ';
            } else {
              text += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
          }
          return text + '\f';
        });
      }
    });

    const pages = pdfData.text.split(/\n\s*\n\s*\n|\f/);
    let pageNum = 1;
    for (let pageContent of pages) {
      const cleanContent = pageContent.replace(/\s+/g, ' ').trim();
      if (cleanContent.length > 20) {
        allEntries.push({
          id: `${b.bookId}-p${pageNum}`,
          bookId: b.bookId,
          bookTitle: b.bookTitle,
          system: b.system,
          page: pageNum,
          section: `Page ${pageNum}`,
          content: cleanContent
        });
      }
      pageNum++;
    }
  }

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allEntries, null, 2));
  console.log(`Extracted ${allEntries.length} pages/sections to ${OUTPUT_FILE}`);
  return allEntries;
}

if (process.argv[1] && process.argv[1].endsWith('extract-rulebooks.js')) {
  extractRulebooks().catch(console.error);
}
