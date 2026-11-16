"""Export the checked DB03 checkpoint using the established technical series style.

Run with the bundled Python returned by load_workspace_dependencies.
The Markdown checkpoint is the authoritative source; previews stay in .cache.
"""
import json
import re
from pathlib import Path

from build_db02_documents import Writer

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / '.cache/payment-db03-documents-qa'
OUTPUT = ROOT / 'artifacts/payment-documents/12_DB03_UTC_index_va_audit_ledger.docx'


def main():
    title = 'DB03 UTC index và audit ledger thanh toán'
    writer = Writer(title, 'MugenBunko DB03 16 11 2026')
    writer.doc.core_properties.subject = 'Nghiệm thu nền dữ liệu thanh toán ngày 16 tháng 11 năm 2026'
    writer.doc.core_properties.keywords = 'MugenBunko, DB03, UTC, EXPLAIN, ledger, audit'
    writer.p(title, 'Title', 21)
    writer.p('Tài liệu kỹ thuật triển khai và vận hành')
    lines = (ROOT / 'docs/payments/DB03_STATUS.md').read_text(encoding='utf-8').splitlines()[1:]
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith('```'):
            block = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith('```'):
                block.append(lines[index])
                index += 1
            writer.code('\n'.join(block))
        elif line.startswith('|'):
            rows = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                cells = [item.strip() for item in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', item) for item in cells):
                    rows.append([re.sub(r'`|\*\*', '', item) for item in cells])
                index += 1
            widths = {2: [2.2, 4.7], 3: [1.6, 2.5, 2.8], 4: [1.4, 1.8, 1.7, 2.0]}
            writer.table(rows[0], rows[1:], widths.get(len(rows[0]), [6.9/len(rows[0])]*len(rows[0])))
            continue
        elif line.startswith('## '):
            if line[3:] in ('Kiểm chứng và vận hành', 'Trạng thái database ứng dụng'):
                writer.doc.add_page_break()
            writer.h(line[3:])
        elif line.startswith('### '):
            writer.h(line[4:], 2)
        elif line.startswith('- '):
            writer.bullet(line[2:])
        else:
            # Preserve source links as clickable Word hyperlinks.
            match = re.fullmatch(r'(.*?)\[([^]]+)\]\(([^)]+)\)(.*)', line)
            if match:
                writer.link(match[2], match[3], match[1])
                if match[4].strip('. '):
                    writer.p(match[4].lstrip('. '))
            else:
                writer.p(line)
        index += 1
    item = writer.save(OUTPUT, None)
    QA.mkdir(parents=True, exist_ok=True)
    (QA / 'manifest.json').write_text(json.dumps([item], ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(item, ensure_ascii=False))


if __name__ == '__main__':
    main()
