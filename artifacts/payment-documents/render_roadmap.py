"""Render the roadmap with packaged rasterization and native Word PDF adapter."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
from zipfile import ZipFile

from lxml import etree

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[2]
QA=ROOT/'.cache/payment-roadmap-qa'
RUNTIME=Path('C:/Users/VTS/.cache/codex-runtimes/codex-primary-runtime/dependencies')
SKILL=Path('C:/Users/VTS/.codex/plugins/cache/openai-primary-runtime/documents/26.1020.11618/skills/documents')
manifest=json.loads((QA/'manifest.json').read_text(encoding='utf-8'))
doc=Path(manifest['file'])
cached_pdf=ROOT/'.cache/payment-documents-qa/word-pdfs'/f'{doc.stem}.pdf'
poppler=next((RUNTIME/'native/poppler').rglob('pdftoppm.exe')).parent
os.environ['PATH']=str(poppler)+os.pathsep+os.environ.get('PATH','')
spec=importlib.util.spec_from_file_location('packaged_renderer',SKILL/'render_docx.py')
renderer=importlib.util.module_from_spec(spec); spec.loader.exec_module(renderer)


def native_word_pdf(doc_path,user_profile,convert_tmp_dir,stem,verbose):
    if not cached_pdf.exists() or cached_pdf.stat().st_mtime < doc.stat().st_mtime:
        raise RuntimeError('Export a fresh native Word PDF before rendering.')
    target=Path(convert_tmp_dir)/(stem+'.pdf')
    shutil.copy2(cached_pdf,target)
    return str(target),'Native Microsoft Word PDF export; no system LibreOffice used.'


renderer.convert_to_pdf=native_word_pdf
pages=renderer.rasterize(str(doc),str(QA/'pages'),110,False,False)
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
with ZipFile(doc) as z:
    xml=etree.fromstring(z.read('word/document.xml'))
    styles=etree.fromstring(z.read('word/styles.xml'))
    text=' '.join(''.join(p.xpath('.//w:t/text()',namespaces=ns)) for p in xml.xpath('//w:p',namespaces=ns))
    assert '28/03/2027' in text and '28/10/2026' in text
    assert '22 tuần' in text and '246' in text and '40 giờ' in text
    assert not styles.xpath('//w:style[@w:styleId="Title"]/w:pPr/w:pBdr',namespaces=ns)
    anchors=xml.xpath('//w:bookmarkStart/@w:name',namespaces=ns)
    targets=xml.xpath('//w:hyperlink[not(@r:id)]/@w:anchor',namespaces=ns)
    assert all(t in anchors for t in targets)
    assert len(manifest['weeks'])==22
    from datetime import date,timedelta
    weeks=manifest['weeks']
    assert date.fromisoformat(weeks[0]['start'])==date(2026,10,28)
    assert date.fromisoformat(weeks[-1]['end'])==date(2027,3,28)
    for previous,current in zip(weeks,weeks[1:]):
        assert date.fromisoformat(previous['end'])+timedelta(days=1)==date.fromisoformat(current['start'])
    assert manifest['base_hours']+manifest['reserve_hours']==manifest['expected_total_hours']==246
report={'file':str(doc),'pages':pages,'page_count':len(pages),'toc_links':len(targets),
        'schedule_contiguous':True,'five_month_deadline':'28/03/2027',
        'hours_checked':True,'docx_sha256':hashlib.sha256(doc.read_bytes()).hexdigest(),
        'visual_review':'pending'}
(QA/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='pages'},ensure_ascii=False))
