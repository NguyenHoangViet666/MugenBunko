#!/usr/bin/env node
/**
 * Convert a planning document from Markdown to an editable Word document.
 * Uses Node.js built-ins only. The DOCX is an OpenXML package with stored ZIP
 * entries, so no Word installation, external package, or network is needed.
 *
 * Usage:
 *   node export-plan.mjs INPUT.md OUTPUT.docx [OUTPUT.html]
 *
 * Supported: headings, paragraphs, bold, italic, inline code, links, simple
 * lists, pipe tables, block quotes, fenced blocks, rules, and page breaks.
 */
import fs from 'node:fs';
import path from 'node:path';

const [inputName, outputName, htmlName] = process.argv.slice(2);
if (!inputName || !outputName || process.argv.length > 5) {
  console.error('Usage: node export-plan.mjs INPUT.md OUTPUT.docx [OUTPUT.html]');
  process.exit(1);
}
if (path.extname(outputName).toLowerCase() !== '.docx') {
  throw new Error('The Word output filename must end in .docx.');
}
if (htmlName && !/\.html?$/i.test(htmlName)) {
  throw new Error('The optional preview filename must end in .html or .htm.');
}
const resolvedPaths = [inputName, outputName, htmlName].filter(Boolean).map(name => path.resolve(name).toLowerCase());
if (new Set(resolvedPaths).size !== resolvedPaths.length) {
  throw new Error('Input and output paths must be different.');
}

const source = fs.readFileSync(inputName, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_R = 'http://schemas.openxmlformats.org/package/2006/relationships';
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN = 1134;
const TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const COLORS = { navy: '17324D', teal: '087F8C', ink: '263445', muted: '627489', light: 'EFF5F8', rule: 'D8E3EB' };

function esc(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function splitRow(line) {
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  const result = [];
  let cell = '';
  let inCode = false;
  for (let i = 0; i < body.length; i++) {
    const character = body[i];
    if (character === '\\' && body[i + 1] === '|') { cell += '|'; i++; }
    else if (character === '`') { inCode = !inCode; cell += character; }
    else if (character === '|' && !inCode) { result.push(cell.trim()); cell = ''; }
    else cell += character;
  }
  result.push(cell.trim());
  return result;
}

function isTableDelimiter(line = '') {
  const cells = splitRow(line);
  return line.includes('|') && cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function listMatch(line) {
  const match = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
  if (!match) return null;
  return {
    kind: /^\d/.test(match[2]) ? 'ordered' : 'bullet',
    level: Math.min(3, Math.floor(match[1].replace(/\t/g, '    ').length / 2)),
    start: /^\d/.test(match[2]) ? Number.parseInt(match[2], 10) : 1,
    text: match[3],
  };
}

function parseMarkdown(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let i = 0;
  const structural = index => {
    const line = lines[index] || '';
    return !line.trim() || /^\s*<!--\s*pagebreak\s*-->\s*$/i.test(line)
      || /^ {0,3}(?:#{1,6}\s|`{3,}|~{3,}|>\s?)/.test(line)
      || !!listMatch(line) || /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)
      || (line.includes('|') && isTableDelimiter(lines[index + 1]));
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*<!--\s*pagebreak\s*-->\s*$/i.test(line)) { blocks.push({ type: 'pagebreak' }); i++; continue; }
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const code = [];
      const closing = new RegExp('^ {0,3}' + fence[1][0] + '{' + fence[1].length + ',}\\s*$');
      i++;
      while (i < lines.length && !closing.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push({ type: 'code', text: code.join('\n'), language: fence[2].trim() });
      continue;
    }
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/);
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); i++; continue; }
    if (line.includes('|') && isTableDelimiter(lines[i + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map(cell => cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left');
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(splitRow(lines[i++]));
      blocks.push({ type: 'table', header, rows, align });
      continue;
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) { blocks.push({ type: 'rule' }); i++; continue; }
    if (/^ {0,3}>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) quote.push(lines[i++].replace(/^ {0,3}>\s?/, ''));
      blocks.push({ type: 'quote', text: quote.join('\n') });
      continue;
    }
    const firstList = listMatch(line);
    if (firstList) {
      const items = [];
      while (i < lines.length) {
        const item = listMatch(lines[i]);
        if (!item || item.kind !== firstList.kind) break;
        i++;
        // A continuation line belongs to the preceding item when indented.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !structural(i)) item.text += ' ' + lines[i++].trim();
        items.push(item);
      }
      blocks.push({ type: 'list', kind: firstList.kind, start: firstList.start, items });
      continue;
    }
    const paragraph = [line.trim()];
    i++;
    while (i < lines.length && !structural(i)) paragraph.push(lines[i++].trim());
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

// A small inline parser, shared by Word and HTML, preserves Vietnamese text.
function parseInline(text, inherited = {}) {
  const tokens = [];
  let plain = '';
  const flush = () => { if (plain) { tokens.push({ text: plain, ...inherited }); plain = ''; } };
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && i + 1 < text.length && /[\\`*_{}\[\]()#+.!|>-]/.test(text[i + 1])) {
      plain += text[i + 1]; i += 2; continue;
    }
    const rest = text.slice(i);
    const link = rest.match(/^\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/);
    if (link) {
      flush(); tokens.push(...parseInline(link[1], { ...inherited, link: link[2] })); i += link[0].length; continue;
    }
    const code = rest.match(/^(`+)([\s\S]*?)\1(?!`)/);
    if (code) { flush(); tokens.push({ text: code[2], ...inherited, code: true }); i += code[0].length; continue; }
    const boldDelimiter = rest.startsWith('**') ? '**' : rest.startsWith('__') ? '__' : null;
    if (boldDelimiter) {
      const end = text.indexOf(boldDelimiter, i + 2);
      if (end > i + 2) { flush(); tokens.push(...parseInline(text.slice(i + 2, end), { ...inherited, bold: true })); i = end + 2; continue; }
    }
    if ((text[i] === '*' || text[i] === '_') && (i === 0 || !/\w/.test(text[i - 1]))) {
      const end = text.indexOf(text[i], i + 1);
      if (end > i + 1) { flush(); tokens.push(...parseInline(text.slice(i + 1, end), { ...inherited, italic: true })); i = end + 1; continue; }
    }
    if (/^<br\s*\/?\s*>/i.test(rest)) {
      flush(); tokens.push({ text: '\n', ...inherited }); i += rest.match(/^<br\s*\/?\s*>/i)[0].length; continue;
    }
    plain += text[i++];
  }
  flush();
  return tokens;
}

const blocks = parseMarkdown(source);
const title = blocks.find(block => block.type === 'heading' && block.level === 1)?.text || path.basename(inputName, path.extname(inputName));
const links = new Map();
const orderedLists = [];

function wordRun(token, options = {}) {
  const props = [];
  if (token.code) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
  if (token.bold || options.bold) props.push('<w:b/>');
  if (token.italic) props.push('<w:i/>');
  const color = options.color || (token.link ? COLORS.teal : null);
  if (color) props.push(`<w:color w:val="${color}"/>`);
  const size = token.code ? (options.size ? Math.min(options.size, 19) : 20) : options.size;
  if (size) props.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
  if (token.link) props.push('<w:u w:val="single"/>');
  if (token.code) props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${color === 'FFFFFF' ? '244964' : 'EAF0F4'}"/>`);
  const content = token.text.split('\n').map((part, index) => `${index ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(part)}</w:t>`).join('');
  const run = `<w:r>${props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''}${content}</w:r>`;
  if (!token.link) return run;
  if (!links.has(token.link)) links.set(token.link, `rIdLink${links.size + 1}`);
  return `<w:hyperlink r:id="${links.get(token.link)}" w:history="1">${run}</w:hyperlink>`;
}

function wordInline(text, options) { return parseInline(text).map(token => wordRun(token, options)).join(''); }
function wordParagraph(text, style = 'Normal', properties = '', runOptions = {}) {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${properties}</w:pPr>${wordInline(text, runOptions)}</w:p>`;
}

function tableWidths(block) {
  const weights = block.header.map((head, index) => {
    const values = [head, ...block.rows.map(row => row[index] || '')];
    const mean = values.reduce((total, value) => total + parseInline(value).map(token => token.text).join('').length, 0) / values.length;
    return Math.max(7, Math.min(45, mean));
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  const result = weights.map(weight => Math.round(TEXT_WIDTH * weight / total));
  result[result.length - 1] += TEXT_WIDTH - result.reduce((sum, value) => sum + value, 0);
  return result;
}

function wordTable(block) {
  const widths = tableWidths(block);
  const headerSize = block.header.length >= 5 ? 18 : 19;
  const properties = `<w:tblPr><w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="${COLORS.rule}"/><w:left w:val="single" w:sz="4" w:color="${COLORS.rule}"/><w:bottom w:val="single" w:sz="4" w:color="${COLORS.rule}"/><w:right w:val="single" w:sz="4" w:color="${COLORS.rule}"/><w:insideH w:val="single" w:sz="4" w:color="${COLORS.rule}"/><w:insideV w:val="single" w:sz="4" w:color="${COLORS.rule}"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const grid = `<w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>`;
  const rows = [block.header, ...block.rows].map((row, rowIndex) => {
    const header = rowIndex === 0;
    const cells = widths.map((width, column) => {
      const fill = header ? COLORS.navy : rowIndex % 2 === 0 ? COLORS.light : 'FFFFFF';
      const cellProperties = `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${fill}"/><w:vAlign w:val="top"/></w:tcPr>`;
      const paragraphProperties = `${header ? '<w:keepNext/>' : ''}<w:jc w:val="${block.align[column] || 'left'}"/>`;
      return `<w:tc>${cellProperties}${wordParagraph(row[column] || '', 'TableText', paragraphProperties, { bold: header, color: header ? 'FFFFFF' : COLORS.ink, size: headerSize })}</w:tc>`;
    }).join('');
    return `<w:tr><w:trPr><w:cantSplit/>${header ? '<w:tblHeader/>' : ''}</w:trPr>${cells}</w:tr>`;
  }).join('');
  return `<w:tbl>${properties}${grid}${rows}</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="60"/><w:rPr><w:sz w:val="4"/></w:rPr></w:pPr></w:p>`;
}

function wordBlock(block) {
  switch (block.type) {
    case 'heading': return wordParagraph(block.text, block.level === 1 ? 'Title' : `Heading${Math.min(3, block.level - 1)}`);
    case 'paragraph': return wordParagraph(block.text);
    case 'quote': return wordParagraph(block.text, 'Quote');
    case 'table': return wordTable(block);
    case 'pagebreak': return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    case 'rule': return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:color="${COLORS.teal}"/></w:pBdr><w:spacing w:before="80" w:after="160"/></w:pPr></w:p>`;
    case 'code': return block.text.split('\n').map(line => `<w:p><w:pPr><w:pStyle w:val="CodeBlock"/></w:pPr>${wordRun({ text: line || ' ', code: true }, { size: 18 })}</w:p>`).join('') + '<w:p><w:pPr><w:spacing w:after="50"/><w:rPr><w:sz w:val="4"/></w:rPr></w:pPr></w:p>';
    case 'list': {
      let numberId = 1;
      if (block.kind === 'ordered') {
        numberId = orderedLists.length + 2;
        orderedLists.push({ id: numberId, start: block.start });
      }
      return block.items.map(item => wordParagraph(item.text, 'ListParagraph', `<w:numPr><w:ilvl w:val="${item.level}"/><w:numId w:val="${numberId}"/></w:numPr>`)).join('');
    }
    default: throw new Error(`Unsupported block: ${block.type}`);
  }
}

const body = blocks.map(wordBlock).join('');
const documentXml = `${XML}<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="${PAGE_WIDTH}" w:h="${PAGE_HEIGHT}"/><w:pgMar w:top="1080" w:right="${MARGIN}" w:bottom="1080" w:left="${MARGIN}" w:header="450" w:footer="500" w:gutter="0"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>`;

function style(id, name, paragraphProperties, runProperties, basedOn = 'Normal') {
  return `<w:style w:type="paragraph" w:styleId="${id}"${id === 'Normal' ? ' w:default="1"' : ''}><w:name w:val="${name}"/>${id === 'Normal' ? '' : `<w:basedOn w:val="${basedOn}"/>`}<w:next w:val="Normal"/><w:qFormat/><w:pPr>${paragraphProperties}</w:pPr><w:rPr>${runProperties}</w:rPr></w:style>`;
}
const stylesXml = `${XML}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:color w:val="${COLORS.ink}"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="110" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
${style('Normal', 'Normal', '<w:widowControl/><w:spacing w:after="110" w:line="276" w:lineRule="auto"/>', '')}
${style('Title', 'Title', `<w:keepNext/><w:keepLines/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="12" w:color="${COLORS.teal}"/></w:pBdr><w:spacing w:before="100" w:after="240" w:line="264" w:lineRule="auto"/>`, `<w:b/><w:color w:val="${COLORS.navy}"/><w:sz w:val="44"/>`)}
${style('Heading1', 'heading 1', '<w:keepNext/><w:keepLines/><w:spacing w:before="260" w:after="130"/><w:outlineLvl w:val="0"/>', `<w:b/><w:color w:val="${COLORS.navy}"/><w:sz w:val="30"/>`)}
${style('Heading2', 'heading 2', '<w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="90"/><w:outlineLvl w:val="1"/>', `<w:b/><w:color w:val="${COLORS.teal}"/><w:sz w:val="25"/>`)}
${style('Heading3', 'heading 3', '<w:keepNext/><w:keepLines/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/>', `<w:b/><w:color w:val="${COLORS.navy}"/><w:sz w:val="22"/>`)}
${style('ListParagraph', 'List Paragraph', '<w:spacing w:after="70" w:line="264" w:lineRule="auto"/><w:contextualSpacing/>', '')}
${style('Quote', 'Quote', `<w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="${COLORS.teal}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${COLORS.light}"/><w:spacing w:before="100" w:after="140"/><w:ind w:left="240" w:right="180"/>`, `<w:color w:val="${COLORS.navy}"/>`)}
${style('TableText', 'Table Text', '<w:widowControl/><w:spacing w:before="0" w:after="45" w:line="248" w:lineRule="auto"/>', '<w:sz w:val="19"/>')}
${style('CodeBlock', 'Code Block', `<w:shd w:val="clear" w:color="auto" w:fill="EAF0F4"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="160" w:right="160"/>`, '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/>')}
${style('Footer', 'Footer', `<w:pBdr><w:top w:val="single" w:sz="4" w:space="8" w:color="${COLORS.rule}"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="${TEXT_WIDTH}"/></w:tabs><w:spacing w:before="80" w:after="0"/>`, `<w:color w:val="${COLORS.muted}"/><w:sz w:val="17"/>`)}
</w:styles>`;

function numberingLevels(kind) {
  return Array.from({ length: 4 }, (_, level) => `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${kind === 'bullet' ? 'bullet' : 'decimal'}"/><w:lvlText w:val="${kind === 'bullet' ? ['•', '–', '◦', '–'][level] : `%${level + 1}.`}"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="${400 + 320 * level}"/></w:tabs><w:ind w:left="${400 + 320 * level}" w:hanging="260"/></w:pPr>${kind === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>' : ''}</w:lvl>`).join('');
}
const numberingXml = `${XML}<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="multilevel"/>${numberingLevels('bullet')}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="multilevel"/>${numberingLevels('ordered')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${orderedLists.map(list => `<w:num w:numId="${list.id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="${list.start}"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;

const footerLabel = 'MugenBunko · Kế hoạch cộng đồng bot';
const footerXml = `${XML}<w:ftr xmlns:w="${W}"><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:t>${esc(footerLabel)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve">Trang </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;
const settingsXml = `${XML}<w:settings xmlns:w="${W}"><w:zoom w:percent="100"/><w:defaultTabStop w:val="480"/><w:updateFields w:val="true"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
const fontsXml = `${XML}<w:fonts xmlns:w="${W}"><w:font w:name="Calibri"><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font><w:font w:name="Consolas"><w:family w:val="modern"/><w:pitch w:val="fixed"/></w:font></w:fonts>`;
const types = [
  ['document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'],
  ['styles', 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml'],
  ['numbering', 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml'],
  ['settings', 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml'],
  ['fontTable', 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml'],
  ['footer1', 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml'],
];
const contentTypesXml = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${types.map(([name, type]) => `<Override PartName="/word/${name}.xml" ContentType="${type}"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
const rootRelsXml = `${XML}<Relationships xmlns="${PACKAGE_R}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`;
const documentRelsXml = `${XML}<Relationships xmlns="${PACKAGE_R}"><Relationship Id="rIdStyles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="${R}/numbering" Target="numbering.xml"/><Relationship Id="rIdSettings" Type="${R}/settings" Target="settings.xml"/><Relationship Id="rIdFonts" Type="${R}/fontTable" Target="fontTable.xml"/><Relationship Id="rIdFooter" Type="${R}/footer" Target="footer1.xml"/>${[...links].map(([target, id]) => `<Relationship Id="${id}" Type="${R}/hyperlink" Target="${esc(target)}" TargetMode="External"/>`).join('')}</Relationships>`;
const created = new Date().toISOString();
const coreXml = `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(parseInline(title).map(token => token.text).join(''))}</dc:title><dc:subject>Kế hoạch triển khai cộng đồng bot MugenBunko</dc:subject><dc:creator>MugenBunko</dc:creator><cp:lastModifiedBy>MugenBunko</cp:lastModifiedBy><dc:language>vi-VN</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified></cp:coreProperties>`;
const appXml = `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MugenBunko Planning Export</Application><AppVersion>1.0</AppVersion></Properties>`;

// Minimal ZIP writer: CRC-32, UTF-8 names, uncompressed entries, no ZIP64.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zip(entries) {
  const locals = [];
  const directory = [];
  let offset = 0;
  const now = new Date();
  const year = Math.min(2107, Math.max(1980, now.getFullYear()));
  const dosDate = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  for (const [filename, value] of entries) {
    const name = Buffer.from(filename, 'utf8');
    const data = Buffer.from(value, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014B50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12); central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directoryData = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryData.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directoryData, end]);
}

const entries = [
  ['[Content_Types].xml', contentTypesXml], ['_rels/.rels', rootRelsXml],
  ['docProps/core.xml', coreXml], ['docProps/app.xml', appXml],
  ['word/document.xml', documentXml], ['word/_rels/document.xml.rels', documentRelsXml],
  ['word/styles.xml', stylesXml], ['word/numbering.xml', numberingXml],
  ['word/settings.xml', settingsXml], ['word/fontTable.xml', fontsXml], ['word/footer1.xml', footerXml],
];
fs.mkdirSync(path.dirname(path.resolve(outputName)), { recursive: true });
fs.writeFileSync(outputName, zip(entries));

function htmlInline(text) {
  return parseInline(text).map(token => {
    let result = esc(token.text).replace(/\n/g, '<br>');
    if (token.code) result = `<code>${result}</code>`;
    if (token.bold) result = `<strong>${result}</strong>`;
    if (token.italic) result = `<em>${result}</em>`;
    if (token.link && /^(?:https?:|mailto:|\.\.?\/|[\w.-]+\/)/i.test(token.link)) result = `<a href="${esc(token.link)}">${result}</a>`;
    return result;
  }).join('');
}
function htmlBlock(block) {
  switch (block.type) {
    case 'heading': return `<h${block.level}>${htmlInline(block.text)}</h${block.level}>`;
    case 'paragraph': return `<p>${htmlInline(block.text)}</p>`;
    case 'quote': return `<blockquote>${htmlInline(block.text)}</blockquote>`;
    case 'code': return `<pre><code>${esc(block.text)}</code></pre>`;
    case 'pagebreak': return '<div class="pagebreak" aria-hidden="true"></div>';
    case 'rule': return '<hr>';
    case 'list': {
      const tag = block.kind === 'ordered' ? 'ol' : 'ul';
      return `<${tag}${tag === 'ol' ? ` start="${block.start}"` : ''}>${block.items.map(item => `<li style="margin-left:${item.level * 1.25}em">${htmlInline(item.text)}</li>`).join('')}</${tag}>`;
    }
    case 'table': return `<table><colgroup>${tableWidths(block).map(width => `<col style="width:${(100 * width / TEXT_WIDTH).toFixed(2)}%">`).join('')}</colgroup><thead><tr>${block.header.map((cell, column) => `<th style="text-align:${block.align[column] || 'left'}">${htmlInline(cell)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${block.header.map((_, column) => `<td style="text-align:${block.align[column] || 'left'}">${htmlInline(row[column] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    default: return '';
  }
}
if (htmlName) {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
  *{box-sizing:border-box}html{background:#edf2f6}body{max-width:210mm;margin:24px auto;padding:19mm 20mm;background:#fff;color:#${COLORS.ink};font:11pt/1.36 Calibri,Aptos,"Segoe UI",Arial,sans-serif;box-shadow:0 3px 20px #17324d15}h1,h2,h3,h4,h5,h6{break-after:avoid;color:#${COLORS.navy}}h1{font-size:22pt;line-height:1.16;border-bottom:2px solid #${COLORS.teal};padding-bottom:12px;margin:0 0 20px}h2{font-size:15pt;margin:24px 0 10px}h3{font-size:12.5pt;color:#${COLORS.teal};margin:19px 0 8px}h4,h5,h6{font-size:11pt;margin:16px 0 7px}p{margin:0 0 10px}ul,ol{padding-left:26px;margin:8px 0 12px}li{margin:0 0 6px}a{color:#${COLORS.teal}}code{font:0.9em Consolas,monospace;background:#eaf0f4;border-radius:2px;padding:1px 3px;overflow-wrap:anywhere}pre{background:#eaf0f4;padding:10px 12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:10pt}pre code{padding:0;background:transparent}blockquote{border-left:3px solid #${COLORS.teal};background:#${COLORS.light};padding:10px 12px;margin:12px 0;color:#${COLORS.navy}}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:9.5pt;margin:12px 0 16px}th,td{border:1px solid #${COLORS.rule};padding:7px 8px;vertical-align:top;overflow-wrap:anywhere}th{background:#${COLORS.navy};color:white;font-weight:700}th code{background:#244964;color:white}tbody tr:nth-child(even){background:#${COLORS.light}}thead{display:table-header-group}tr{break-inside:avoid}hr{border:0;border-top:1px solid #${COLORS.teal};margin:16px 0}.pagebreak{break-before:page;border-top:1px dashed #d8e3eb;margin:24px -8px}.preview-note{color:#${COLORS.muted};font-size:9pt;border-top:1px solid #${COLORS.rule};padding-top:12px;margin-top:26px}@page{size:A4;margin:19mm 20mm}@media print{html,body{background:white}body{max-width:none;margin:0;padding:0;box-shadow:none}.pagebreak{border:0;margin:0}.preview-note{display:none}p,li{orphans:2;widows:2}}
  </style></head><body>${blocks.map(htmlBlock).join('\n')}<p class="preview-note">Bản xem trước nội dung. File Word có đánh số trang và bố cục phân trang riêng.</p></body></html>`;
  fs.mkdirSync(path.dirname(path.resolve(htmlName)), { recursive: true });
  fs.writeFileSync(htmlName, html, 'utf8');
}

console.log(`Created ${path.resolve(outputName)} (${fs.statSync(outputName).size.toLocaleString('en-US')} bytes)`);
console.log(`Content: ${blocks.length} blocks; ${blocks.filter(block => block.type === 'table').length} tables; ${blocks.filter(block => block.type === 'heading').length} headings.`);
if (htmlName) console.log(`Preview: ${path.resolve(htmlName)}`);
