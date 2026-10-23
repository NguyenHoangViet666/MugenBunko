"""Render the Word-exported PDF for document layout inspection."""
from pathlib import Path
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(os.environ['TEMP']) / 'mugenbunko-test-report-libs'))
import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
PDF = OUT / 'Muc_3_6_Thiet_ke_co_so_du_lieu_MugenBunko_preview.pdf'
doc = pdfium.PdfDocument(str(PDF))
thumb_w, tile_w, tile_h, cols = 300, 330, 470, 4
sheet = Image.new('RGB', (tile_w * cols, tile_h * ((len(doc)+cols-1)//cols)), '#DADDE0')
draw = ImageDraw.Draw(sheet)
label_font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
report = []
all_text = []
for i in range(len(doc)):
    page = doc[i]
    w, h = page.get_size()
    text = page.get_textpage().get_text_range()
    all_text.append(text)
    lines = [s.strip() for s in text.splitlines() if s.strip()]
    item = {'page': i+1, 'width': round(w, 1), 'height': round(h, 1), 'characters': len(text), 'first_lines': lines[:2], 'last_lines': lines[-2:]}
    report.append(item)
    print(json.dumps(item, ensure_ascii=False))
    thumb = page.render(scale=thumb_w/w).to_pil().convert('RGB')
    x, y = (i % cols)*tile_w + 15, (i//cols)*tile_h + 30
    sheet.paste(thumb, (x, y))
    draw.text((x, y-24), f'Trang {i+1}', fill='black', font=label_font)
    if i in (0, 1, 2, 4, len(doc)-1) or 'Bảng election_candidates' in text:
        page.render(scale=1.5).to_pil().save(OUT / f'preview_page_{i+1:02d}.png')
sheet.save(OUT / 'preview_contact_sheet.png')
(OUT / 'preview_text.txt').write_text('\n\f\n'.join(all_text), encoding='utf-8')
(OUT / 'preview_pages.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print('PAGES', len(doc), 'LANDSCAPE', [r['page'] for r in report if r['width'] > r['height']])
