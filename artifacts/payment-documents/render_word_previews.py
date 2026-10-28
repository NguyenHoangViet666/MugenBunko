"""Use the packaged render_docx rasterizer with native Word PDF conversion.

The standard renderer cannot find bundled LibreOffice on this Windows host.
Only the PDF conversion adapter is replaced; the packaged PNG rasterizer remains
unchanged. Run export_word_previews.ps1 first using this task's Word documents.
"""
import importlib.util
import json
import os
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / '.cache/payment-documents-qa'
RUNTIME = Path('C:/Users/VTS/.cache/codex-runtimes/codex-primary-runtime/dependencies')
SKILL = Path('C:/Users/VTS/.codex/plugins/cache/openai-primary-runtime/documents/26.1020.11618/skills/documents')
poppler = next((RUNTIME/'native/poppler').rglob('pdftoppm.exe')).parent
os.environ['PATH'] = str(poppler) + os.pathsep + os.environ.get('PATH','')
spec = importlib.util.spec_from_file_location('packaged_docx_renderer', SKILL/'render_docx.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


def word_pdf(doc_path, user_profile, convert_tmp_dir, stem, verbose):
    source = QA/'word-pdfs'/f'{stem}.pdf'
    if not source.exists() or source.stat().st_mtime < Path(doc_path).stat().st_mtime:
        raise RuntimeError(f'Missing or stale native Word preview for {stem}')
    target = Path(convert_tmp_dir)/source.name
    shutil.copy2(source,target)
    return str(target),'PDF exported by native Microsoft Word without using system LibreOffice.'


renderer.convert_to_pdf = word_pdf
manifest=[]
for doc in sorted((ROOT/'artifacts/payment-documents').glob('0[1-9]_*.docx')):
    folder=QA/'pages'/doc.stem
    pages=renderer.rasterize(str(doc),str(folder),dpi=110,verbose=False,emit_pdf=False)
    # Contact sheets aid navigation; every full-resolution page is retained for QA.
    for offset in range(0,len(pages),4):
        batch=pages[offset:offset+4]
        sheet=Image.new('RGB',(1100,1620),'#E1E4E8')
        draw=ImageDraw.Draw(sheet)
        for i,path in enumerate(batch):
            page=Image.open(path).convert('RGB')
            page.thumbnail((530,750))
            x=10+(i%2)*550; y=40+(i//2)*800
            sheet.paste(page,(x,y))
            draw.text((x,y-24),f'{doc.stem[:2]} page {offset+i+1}',fill='black')
        sheet.save(folder/f'contact-{offset//4+1}.png')
    item={'file':doc.name,'pages':pages,'count':len(pages)}
    manifest.append(item)
    print(json.dumps({'file':doc.name,'pages':len(pages)},ensure_ascii=False),flush=True)
(QA/'render-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
