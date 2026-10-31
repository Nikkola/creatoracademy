"""Approved responsive hero, shared between the local page and the SaleBot build."""
import json
from pathlib import Path

def apply_hero(root, Parser):
    config=json.loads((Path(__file__).resolve().parents[1]/'source/story/hero-20261031.json').read_text())
    hero=root.one('hero');hero.a['data-hero-showreel']=''
    copy=root.one('hero-copy');inner=root.one('hero-inner');portrait=root.one('hero-portrait')
    def lines(kind):
        return ''.join('<span class="hero-'+device+'-copy">'+''.join('<span class="utp-preview-line">'+line+'</span>' for line in config[device][kind])+'</span>' for device in ['desktop','mobile'])
    copy.one(tag='h1').c=Parser(lines('heading')).root.c
    copy.one('hero-lead').c=Parser(lines('lead')).root.c
    footer=portrait.one('hero-author-note').html()+portrait.one('intro-video-cta').html()
    visual=Parser('<div class="hero-preview-visual"><div class="hero-preview-film"><picture><source media="(min-width:768px)" srcset="/assets/site-editorial-v4/media/hero-portrait-wide-v1.webp"><img class="hero-preview-cover" src="/assets/site-audit-v3/images/hero-hero-bg.webp" alt="Николай Чернобаев" loading="eager" fetchpriority="high" decoding="async"></picture><video data-hero-loop muted loop playsinline preload="none" aria-label="Работы Николая Чернобаева и практика курса"><source src="/assets/site-editorial-v4/media/hero-unified-v3.mp4" type="video/mp4"></video></div><div class="hero-preview-footer">'+footer+'</div></div>').root.c[0]
    inner.c.remove(portrait);inner.c.append(visual);visual.parent=inner
    portrait.a['class']='hero-portrait hero-mobile-portrait'
    parent=hero.parent;parent.c.insert(parent.c.index(hero)+1,portrait);portrait.parent=parent
