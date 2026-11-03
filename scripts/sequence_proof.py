"""Approved paired-video comparison, kept in the shared source/build pipeline."""
import json
from pathlib import Path

def apply_sequence_proof(html):
    root=Path(__file__).resolve().parents[1]
    marker='<aside class="editorial-quote-wrap" id="source-quote-0">'
    assert html.count(marker)==1 and 'id="sequence-proof"' not in html
    block=(root/'source/story/sequence-proof.html').read_text()
    pairs=json.loads((root/'source/story/sequence-proof.json').read_text())
    assert len(pairs)==20
    config=json.dumps(pairs,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
    html=html.replace(marker,block+'<script id="sequence-proof-data" type="application/json">'+config+'</script>'+marker)
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/site-editorial-v4/sequence-proof-v2.css"></head>')
    html=html.replace('</body>','<script src="/assets/site-editorial-v4/sequence-proof-v2.js"></script></body>')
    return html
