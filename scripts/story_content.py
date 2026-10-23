from html.parser import HTMLParser
from html import escape as e
from pathlib import Path
import json, re, base64

SITE=Path(__file__).resolve().parents[1]
HERE=SITE
class N:
 def __init__(self,t='',a=(),parent=None): self.t=t;self.a=dict(a);self.c=[];self.parent=parent
 def text(self): return ' '.join(' '.join(x.text() if isinstance(x,N) else x for x in self.c).split())
 def all(self,cl=None,tag=None,id=None):
  out=[]
  for n in self.c:
   if isinstance(n,N):
    if (not cl or cl in n.a.get('class','').split()) and (not tag or tag==n.t) and (not id or id==n.a.get('id')):out.append(n)
    out+=n.all(cl,tag,id)
  return out
 def one(self,cl=None,tag=None,id=None):return next(iter(self.all(cl,tag,id)),N())
 def html(self):
  attrs=''.join(' '+k+'="'+e(v or '',quote=True)+'"' for k,v in self.a.items())
  return '<'+self.t+attrs+'>'+''.join(x.html() if isinstance(x,N) else e(x) for x in self.c)+(f'</{self.t}>' if self.t not in ('img','br','meta','link','input','source','hr') else '')
class P(HTMLParser):
 def __init__(self,s):super().__init__();self.root=N('root');self.cur=self.root;self.feed(s)
 def handle_starttag(self,t,a):
  n=N(t,a,self.cur);self.cur.c.append(n)
  if t not in ('img','br','meta','link','input','source','hr','wbr'):self.cur=n
 def handle_endtag(self,t):
  n=self.cur
  while n.parent:
   if n.t==t:self.cur=n.parent;return
   n=n.parent
 def handle_data(self,s):self.cur.c.append(s)
src=P((SITE/'source/story/baseline.html').read_text()).root
# Keep one consistent four-link set across the mobile menu, footer and fixed rail.
def node(markup): return P(markup).root.c[0]
def social_item(kind, fixed=False):
 prefix='fixed__socials-' if fixed else 'footer__socials-'
 btn='fixed__btn' if fixed else 'footer__btn'
 href='https://music.yandex.ru/album/8770470' if kind=='yandex' else 'https://www.kinopoisk.ru/name/10258395/'
 label='Подкаст «Сделано с нуля» в Яндекс Музыке' if kind=='yandex' else 'Кинопоиск — Николай Чернобаев'
 logo='/assets/site-editorial-v4/brand/yandex-music.svg' if kind=='yandex' else '/assets/site-editorial-v4/brand/kinopoisk-mark-mono.png'
 logo='data:image/'+('svg+xml' if kind=='yandex' else 'png')+';base64,'+base64.b64encode((SITE/logo.lstrip('/')).read_bytes()).decode()
 icon=f'<img class="social-brand-icon social-brand-icon--{kind}" src="{logo}" width="20" height="20" alt="" aria-hidden="true" loading="lazy" decoding="async">'
 return node(f'<li class="{prefix}{kind}"><a href="{href}" target="_blank" rel="noopener noreferrer" aria-label="{label}"><div class="round__btn {btn}">{icon}</div></a></li>')
for social_list in [n for n in src.all(tag='ul') if {'footer__socials-list','fixed__socials-list'} & set(n.a.get('class','').split())]:
 fixed='fixed__socials-list' in social_list.a.get('class','').split()
 for old_class,kind in [(('fixed__socials-sc' if fixed else 'footer__socials-sc'),'yandex')]:
  old=next((child for child in social_list.c if isinstance(child,N) and old_class in child.a.get('class','').split()),None)
  if old:
   idx=social_list.c.index(old); replacement=social_item(kind,fixed);replacement.parent=social_list;social_list.c[idx]=replacement
 youtube=next((child for child in social_list.c if isinstance(child,N) and (('fixed__socials-youtube' if fixed else 'footer__socials-youtube') in child.a.get('class','').split())),None)
 if youtube:
  replacement=social_item('kinopoisk',fixed);replacement.parent=social_list;social_list.c.insert(social_list.c.index(youtube)+1,replacement)
doc=P((SITE/'source/story/structure.html').read_text()).root
missing=[]
def asset(url):
 if not url:return ''
 path=re.sub(r'^https?://[^/]+/creatoracademy(?:@[^/]+)?/','',url)
 if '/assets/' in path:path='assets/'+path.split('/assets/',1)[1]
 p=SITE/path
 if not p.exists():
  found=list(SITE.glob('assets/**/'+Path(path).name))
  if found:p=found[0]
  else:missing.append(url);return url
 return '/'+str(p.relative_to(SITE))
def im(url,alt='',cls='',eager=False):return f'<img class="{cls}" src="{e(asset(url))}" alt="{e(alt)}" loading="{"eager" if eager else "lazy"}" decoding="async">'
def image(name,alt='',cls=''):return im('assets/site-audit-v3/images/'+name,alt,cls)
def content(id):
 n=doc.one(id=id).one('copy')
 return ''.join(x.html() if isinstance(x,N) else e(x) for x in n.c)
def gallery(root):
 out=[]
 for n in root.all('gallery__item'):
  out.append(dict(title=n.one('gallery__subtitle').text(),desc=n.one('gallery__description').text(),img=(n.one(tag='img').a.get('src') or n.one(tag='img').a.get('data-src') or n.one(tag='img').a.get('data-portfolio-src','')),video=n.one('play-btn').a.get('data-link','')))
 return out
works=gallery(src.one(id='students-works'));vrev=gallery(src.one(id='video-reviews'))
portfolio=[x for x in gallery(src) if x not in works and x not in vrev]
podcast_additions=json.loads((SITE/'source/story/podcast-additions-20261022.json').read_text())
vlog_additions=json.loads((SITE/'source/story/vlog-additions-20261022.json').read_text())
niyaz=next(x for x in works if 'Нияз' in x['title'])
def rail(items,cls='gallery__list'):
 return '<div class="gallery__block"><div class="owl-carousel '+cls+'">'+cards(items)+'</div></div>'
def portfolio_sections():
 out=''
 for category in src.all('portfolio-category'):
  title=category.one(tag='summary').one('gallery__title').text()
  if not title:title=category.one(tag='summary').text()
  category_items=gallery(category)
  if 'Видеоподкасты' in title:category_items=podcast_additions+category_items
  if 'Влоги' in title:category_items=vlog_additions+category_items
  if 'Короткометражки' in title:category_items.insert(0,dict(title='Книжные романтики',desc='Художественный короткометражный фильм',img='assets/site-editorial-v4/book-romantics-youtube.webp',video='https://www.youtube.com/watch?v=0HvvxPjGvBE'))
  out+='<details class="portfolio-category'+(' portfolio-reels' if 'reels' in title.lower() else '')+'"><summary><h3 class="portfolio-title">'+e(title).replace('Короткометражки','Коротко<wbr>метражки')+'</h3><span>+</span></summary>'+rail(category_items)+'</details>'
 return out

def play(url,img,title,desc='',cls=''):
 if url.startswith('https://www.youtube.com/watch?v=0HvvxPjGvBE'):
  return f'<article class="film {cls}"><a class="media" href="{e(url)}" target="_blank" rel="noopener noreferrer" aria-label="Смотреть Книжные романтики на YouTube">{im(img,title)}<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4.7c0-.8.9-1.2 1.5-.8l11 7.3c.6.4.6 1.2 0 1.6l-11 7.3c-.6.4-1.5 0-1.5-.8V4.7Z"/></svg></span></a><h3>{e(title)}</h3><p>{e(desc)}</p></article>'
 return f'<article class="film {cls}"><div class="media">{im(img,title)}<button class="play" data-video="{e(url)}" aria-label="Смотреть: {e(title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.7c0-.8.9-1.2 1.5-.8l11 7.3c.6.4.6 1.2 0 1.6l-11 7.3c-.6.4-1.5 0-1.5-.8V4.7Z"/></svg></button></div><h3>{e(title)}</h3><p>{e(desc)}</p></article>'
def cards(items):return ''.join(play(x['video'],x['img'],x['title'],x['desc']) for x in items)
def section(id,body,cls=''):return f'<section id="{id}" class="chapter {cls}"><div class="wrap">{body}</div></section>'
body='''<header class="nav"><a class="brand" href="#top" aria-label="Академия Авторов, на главную">академия авторов</a><button class="menu-toggle" aria-expanded="false" aria-controls="navlinks">Меню</button><nav id="navlinks"><a href="#about">Обо мне</a><a href="#author-works">Научитесь делать</a><a href="#programme">Содержание</a><a href="#cases">Кейсы</a><a href="#reviews">Отзывы</a><a href="#rates" class="nav-buy">Забронировать</a><a class="nav-login" href="https://salebot.pro/courses" target="_blank" rel="noopener">Войти</a></nav></header><main id="top">'''
body+=f'''<section class="hero"><div class="hero-inner"><div class="hero-copy"><p class="course-label">Курс</p><div class="course-name">«Контент-мастер»</div><h1>Научись продвигать себя и своё дело<br><span>через создание стильных и душевных видео.</span></h1><p class="hero-lead">Освой все необходимые творческие навыки для создания кинематографичных фото, рилз, подкастов и влогов.</p><div class="actions"><a class="btn" href="#rates">Выбрать формат <span>↗</span></a></div><p class="fine">Старт 2 ноября · От 3 месяцев обучения · От 4 666 ₽/мес.</p></div><div class="hero-portrait">{image('hero-hero-bg.webp','Николай Чернобаев').replace('loading="lazy"', 'loading="eager" fetchpriority="high"')}<div class="intro-video-cta"><svg class="intro-video-arrow" viewBox="0 0 80 68" fill="none" aria-hidden="true"><path d="M58 5C70 8 77 22 70 33C63 45 41 48 13 52M13 52C17 48 21 43 25 40M13 52C19 53 24 55 29 59" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><button type="button" class="intro-video-button" aria-label="Смотреть вступительное видео" data-video="https://kinescope.io/embed/u2Tb99aoUmhahUHxd3xX4q"><svg
                    class="intro-video-play" aria-hidden="true"
                    viewBox="0 0 10 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.16914 5.81087L0.808985 10.6376C0.680859 10.7116 0.520703 10.6191 0.520703 10.4712L0.520703 0.817695C0.520703 0.669749 0.68086 0.577283 0.808985 0.651255L9.16914 5.47799C9.29727 5.55197 9.29726 5.7369 9.16914 5.81087Z"
                      stroke-width="0.384375"
                    />
                  </svg></button></div></div></div></section>'''
course_numbers=[('7','модулей','От смысла и сторителлинга до продвижения'),('32','урока','Съёмка, свет, монтаж, цвет и звук'),('12+','часов видео','Объяснения и практические задания'),('33','методички','265 страниц. Остаются навсегда'),('100+','авторов в сообществе','Окружение и обмен опытом')]
body+=section('course-facts','<ul class="course-numbers" aria-label="Состав курса">'+''.join(f'<li><b>{e(number)}</b><h3>{e(label)}</h3><p>{e(description)}</p></li>' for number,label,description in course_numbers)+'</ul><p class="facts-note">Доступ к чату и сообществу — в форматах «Поддержка» и «Наставничество».</p>','course-facts')
audience_copy=[
 ('Блогерам и экспертам','Расширяй аудиторию и повышай качество контента. Создавай видео, которые привлекают и удерживают внимание подписчиков.'),
 ('Предпринимателям','Развивай личный бренд и своё дело. Освой создание контента, который помогает рассказывать о твоих продуктах и услугах.'),
 ('Специалистам фото, видео и медиа','Расти в профессии и готовься к работе с сильными брендами. Свяжи сторителлинг, съёмку, монтаж, цвет и звук в одну систему.'),
 ('Тем, кто снимает для себя','Документируй свою жизнь красиво и осмысленно. Превращай личный опыт, путешествия и важные моменты в истории, которыми хочется делиться.')]
audience_cards=''
for n,(title,description) in zip(src.one(id='for-who-container').all('learn__item'),audience_copy):
 photo=n.one(tag='img')
 audience_cards+=f'<li class="audience-card">{im(photo.a.get("src") or photo.a.get("data-src",""),photo.a.get("alt",title))}<h3>{e(title)}</h3><p>{e(description)}</p></li>'
body+=section('begin','<h2>Кому подойдёт курс</h2><ul id="for-who-container">'+audience_cards+'</ul>','intro audience')
# Keep the original author carousel and its three distinctive roles visible.
bio_slides=''
for i,block in enumerate(src.one('about').all('about__block')):
 prose=''.join(n.html() for n in block.all('montserrat') if n.t=='p')
 facts=''.join('<li>'+e(n.text())+'</li>' for n in block.all('text__small-item'))
 name=['Режиссёр','Автор','Предприниматель'][i]
 image_name=['bg-images-about-7.webp','bg-images-about-2.webp','bg-images-about-1.webp'][i]
 bio_slides+=f'<article class="about__block author-scene">{image(image_name,name,"author-scene-photo")}<div class="author-scene-content"><ul class="author-facts">{facts}</ul><div class="author-role">{name}</div><div class="author-prose">{prose}</div></div></article>'
bio='<div class="about__list owl-carousel">'+bio_slides+'</div><nav class="about-slider-dots" aria-label="Слайды об авторе">'+''.join('<button type="button" aria-label="Раздел об авторе '+str(i+1)+'"'+(' aria-current="true"' if i==0 else '')+'></button>' for i in range(3))+'</nav>'
body+=section('about','<h2>Николай Чернобаев</h2><p class="editorial-lead">Автор, режиссёр и основатель Академии Авторов.</p>'+bio+'<blockquote class="author-manifesto">«Я не учу хайпу и уловкам, а даю твёрдые навыки, чтобы вы стали универсальным автором, создавали успешные бренды и конкурировали с творческими командами».<cite>Николай Чернобаев</cite></blockquote>','about')
# Source contains separate desktop and mobile sets of the same eight brands.
client_images=[];seen_clients=set()
for n in src.one('clients').all(tag='img'):
 url=n.a.get('src') or n.a.get('data-src','')
 if url and url not in seen_clients:seen_clients.add(url);client_images.append(n)
logo_bounds=json.loads((SITE/'source/story/logo-bounds.json').read_text())
def logo(n):
 url=n.a.get('src') or n.a.get('data-src','');name=n.a.get('alt','');bound=logo_bounds[name]
 vector=SITE/'assets/site-editorial-v4/logos'/f'{name}.svg'
 if vector.exists():
  encoded=base64.b64encode(vector.read_bytes()).decode('ascii')
  return f'<div class="client-logo-tile"><img class="client-vector" src="data:image/svg+xml;base64,{encoded}" alt="{e(name)}" loading="lazy" decoding="async"></div>'
 style=f'--logo-width-ratio:{bound["width"]/bound["bw"]:.5f};--logo-height-ratio:{bound["width"]/bound["bh"]:.5f};--logo-x:{(bound["x"]+bound["bw"]/2)/bound["width"]*100:.4f}%;--logo-y:{(bound["y"]+bound["bh"]/2)/bound["height"]*100:.4f}%'
 return '<div class="client-logo-tile" style="'+style+'">'+im(url,name)+'</div>'
client_html=''.join(logo(n) for n in client_images)
body+=section('clients','<h2>Мои клиенты</h2><div class="client-marquee" role="region" aria-label="Клиенты Николая Чернобаева"><div class="client-marquee-track"><div class="client-marquee-group">'+client_html+'</div></div><button class="client-motion-toggle" type="button" aria-label="Остановить движение логотипов" aria-pressed="false">Ⅱ</button></div>','clients')
body+=section('author-works','<h2>Что я создаю</h2><p class="editorial-lead">От коротких видео и подкастов до документального и художественного кино. Этот опыт и навыки ты сможешь применять к своим форматам.</p>'+portfolio_sections())
outcome_cards=''
for n in src.one(id='learn-container').all('learn__item'):
 photo=n.one(tag='img');description=n.one('learn__description').text().replace('ĸ','к')
 outcome_cards+=f'<li class="outcome-card">{im(photo.a.get("src") or photo.a.get("data-src",""),photo.a.get("alt",description))}<h3>{e(description)}</h3></li>'
body+=section('learn','<h2>Чему ты научишься</h2><ul class="outcomes-grid" id="learn-container">'+outcome_cards+'</ul>','outcomes')
module_cards=''
module_examples={2:('assets/site-audit-v3/images/how-v2-material-story-arc.webp','Структуры сторителлинга'),3:('assets/site-audit-v3/images/how-v2-material-exposure.webp','Схема экспозиции'),4:('assets/site-audit-v3/images/how-v2-process-light.webp','Постановка света на съёмке урока'),5:('assets/site-audit-v7/images/lesson-demo-editing.webp','Фрагмент урока по монтажу'),6:('assets/site-audit-v3/images/how-v2-material-thumbnail.webp','Разбор обложки')}
for i,m in enumerate(src.all('programme__item')):
 title=m.one('programme__subtitle').text();description=m.one('programme__text').text()
 visual='<figure class="module-visual">'+im(*module_examples[i])+'<figcaption>'+e(module_examples[i][1])+'</figcaption></figure>' if i in module_examples else ''
 module_cards+=f'<li class="programme-module"><p class="module-number">Модуль {i+1}</p><h3>{e(title)}</h3><p class="module-description">{e(description)}</p></li>'
module_visuals=''.join('<figure class="module-visual">'+im(*pair)+'<figcaption>'+e(pair[1])+'</figcaption></figure>' for pair in module_examples.values())
body+=section('programme','<h2>Программа курса</h2><p class="editorial-lead">Семь модулей: от идеи и сценария до съёмки, монтажа и продвижения. Практика — на твоём контент-проекте.</p><ol class="programme-modules">'+module_cards+'</ol><div class="programme-examples" tabindex="0" aria-label="Примеры уроков и материалов курса">'+module_visuals+'</div>')
lessons=src.all('lesson-demo');lesson_cards=''
for n in lessons:
 lesson_cards+=play(n.one('play-btn').a.get('data-link',''),n.one(tag='img').a.get('src',''),n.one('lesson-demo__title').text(),n.one('lesson-demo__duration').text())
body+=section('lessons','<h2>Посмотри, как я объясняю</h2><p class="big-lead">Четыре фрагмента настоящих уроков.<br>Почти пять минут из более чем двенадцати часов курса.</p><div class="grid two">'+lesson_cards+'</div>','lessons')
body+=section('process',f'''<div class="process-intro"><p class="section-label">Как устроен процесс</p><h2>Учись в своём ритме.<br><span>Применяй на своём проекте.</span></h2><p class="editorial-lead"><strong>Открой урок там, где удобно.</strong> В личном кабинете на компьютере или в приложении Skillhub. Все уроки доступны сразу после оплаты.</p></div><div class="learning-demo" data-scene="0"><div class="learning-visual"><div class="desktop-device"><div class="browser-chrome"><i></i><i></i><i></i><span>Контент-мастер / Съёмка</span></div><div class="desktop-screen"><div class="learning-frame cabinet-frame">{image('how-v2-process-platform.webp','Раздел съёмки в личном кабинете курса')}</div><div class="learning-frame lesson-frame"><video muted loop playsinline preload="none" poster="/assets/site-audit-v7/images/lesson-demo-light.webp"><source src="/assets/site-editorial-v4/media/lesson-preview.mp4" type="video/mp4"></video></div><div class="learning-frame practice-frame">{image('how-v2-material-storyboard.webp','Практические материалы к съёмке')}</div></div></div></div><div class="learning-controls" aria-label="Демонстрация процесса обучения"><div class="learning-tabs"><button type="button" data-scene-target="0" aria-current="true">Личный кабинет<span></span></button><button type="button" data-scene-target="1">Урок<span></span></button><button type="button" data-scene-target="2">Практика<span></span></button></div><button class="motion-pause" type="button" aria-label="Остановить анимацию" aria-pressed="false">Ⅱ</button></div><p class="learning-caption">Выбираешь нужную тему в личном кабинете.</p></div><div class="process-steps"><div class="step"><div><h3>Все знания в одном месте</h3><p>Единая система: от идеи и сценария до съёмки, монтажа и продвижения.</p></div></div><div class="step"><div><h3>Личный кабинет и Skillhub</h3><p>Уроки и материалы доступны сразу после оплаты. Смотри на компьютере или в мобильном приложении.</p></div></div><div class="step"><div><h3>Практика в каждом модуле</h3><p>Задания к каждому из семи модулей: применяй знания к своему материалу.</p></div></div><div class="step"><div><h3>Живая встреча раз в месяц</h3><p>Групповая консультация с разборами и ответами на вопросы на «Поддержке» и «Наставничестве».</p></div></div><div class="step"><div><h3>Чат и 100+ авторов</h3><p>Вопросы, поддержка и обмен опытом. Сообщество остаётся навсегда на «Поддержке» и «Наставничестве».</p></div></div><div class="step"><div><h3>Собственный контент-проект</h3><p>Цель практики — как минимум один законченный контент-проект и готовое видео.</p></div></div></div><p class="workload">Если распределить уроки на три месяца, на просмотр потребуется примерно час в неделю. Ещё 3–10 часов в неделю закладывай на практику: время зависит от масштаба проекта.</p><button class="text-link course-invitation" type="button" data-video="https://kinescope.io/embed/u2Tb99aoUmhahUHxd3xX4q">Посмотреть приглашение на курс ▶</button>''','process')
material_copy=[('Шаблоны раскадровки','Готовые шаблоны для подготовки съёмки.'),('Структуры сторителлинга','Шаблоны построения историй и рабочие тетради автора.'),('Экспозиция','Памятки и шпаргалки по съёмке.'),('Формулы заголовков и обложек','Формулы для названий видео и создания обложек.'),('Схемы освещения','Рабочие схемы для съёмки.'),('Сообщество авторов','Чат и сообщество навсегда на «Поддержке» и «Наставничестве».')]
material_cards=''
for n,(title,description) in zip(src.one('kit').all('kit__item'),material_copy):
 photo=n.one(tag='img');material_cards+=f'<article class="tool">{im(photo.a.get("src",""),photo.a.get("alt",title))}<h3>{e(title)}</h3><p>{e(description)}</p></article>'
body+=section('tools','<h2>Что останется после курса</h2><div class="stat-line"><b>33 <small>методички</small></b><b>265 <small>страниц</small></b></div><div class="kit__grid owl-carousel">'+material_cards+'</div><p class="workload">А ещё мои фото- и видеопресеты <a class="preset-link" href="https://nickchernobaev.com/shop/film-emulation-pack" target="_blank" rel="noopener noreferrer">Film Emulation Pack V.1</a>.</p>')
body+=section('support','''<div class="split"><div><h2>Обратная связь</h2><p class="support-intro">Которая помогает двигаться дальше.</p><p>Задавай вопросы, показывай задания и получай разборы на тарифах «Поддержка» и «Наставничество».</p><p>Раз в месяц встречаемся на групповой консультации. Обсуждаем работы и делимся опытом. Чат и сообщество остаются с тобой после курса.</p><p>В «Наставничестве» добавляются 12 персональных консультаций и личная работа со мной в течение года.</p><a class="btn support-cta" href="#rates">Сравнить форматы</a></div><figure class="feedback-demo"><div class="feedback-window"><video class="feedback-preview" muted loop playsinline preload="none" poster="/assets/site-editorial-v4/media/feedback-poster.webp" aria-label="Фрагменты первой групповой встречи шестого потока"><source src="/assets/site-editorial-v4/media/feedback-preview.mp4" type="video/mp4"></video></div></figure></div>''')
case_cards=[]
for n in src.all('cases__item'):
 title=n.one('cases__name').text();texts=n.all('cases__text')
 links=''.join(a.html() for a in n.all('cases__link'))
 story=f'<div class="case-story-heading"><p class="case-flow">{e(n.one("cases__flow").text())}</p><h2>{e(title)}</h2><h3>{e(n.one("cases__result").text())}</h3></div><div class="case-story-prose"><p class="kicker">С чем пришёл</p><p>{e(texts[0].text() if texts else "")}</p><p class="kicker">Что изменилось</p><p>{e(texts[1].text() if len(texts)>1 else "")}</p><div class="case-links">{links}</div></div>'
 case_cards.append(f'<article class="case"><div class="person">{im(n.one(tag="img").a.get("src",""),title)}<div><h3>{e(title)}</h3><p class="case-flow">{e(n.one("cases__flow").text())}</p></div></div><h4>{e(n.one("cases__result").text())}</h4><button class="case-more" type="button" aria-label="История участника: {e(title)}">История участника <span aria-hidden="true">↗</span></button><div class="case-links">{links}</div><template class="case-story-content">{story}</template></article>')
body+=section('cases','<h2>Кейсы выпускников</h2><p class="big-lead">Первые видео. Первые сотни подписчиков. Первые тысячи просмотров. Новые контент-проекты и каналы. Собственные фильмы.<br>Реальные истории участников прошлых потоков.</p><div class="cases__slider owl-carousel" id="casesSlider">'+''.join(x.replace('class="case"','class="case cases__item"') for x in case_cards)+'</div>')
body+=section('gallery','<h2>Работы участников</h2>'+rail(works))
rev_cards=[]
for n in src.all('reviews__item'):
 title=n.one('review__title').text();name=n.one('review__user-name').text();txt=n.one('review__text').text()
 rev_cards.append(f'<article class="review"><span class="quote-mark">“</span><h3>{e(title)}</h3><p class="review-text">{e(txt)}</p>'+''.join(a.html() for a in n.all(tag='a'))+f'<div class="person">{im(n.one(tag="img").a.get("src",""),name)}<div><b>{e(name)}</b><p>{e(n.one("review__user-occupation").text())}</p></div></div></article>')
body+=section('reviews','<h2>Отзывы участников</h2>'+rail(vrev)+'<div class="reviews__list" id="reviews-container">'+''.join(x.replace('class="review"','class="review reviews__item"').replace('<div class="person">','<button class="review-more" type="button">Читать полный отзыв</button><div class="person">') for x in rev_cards)+'</div>')
rates=[('copper','Самостоятельно','Проходишь сам','28 000','30 000','4 666','25374',['Доступ на 3 месяца','Самостоятельная практика','Без проверки заданий, чата и сообщества','Методички остаются навсегда']),('silver','Поддержка','С группой и обратной связью','40 000','60 000','6 667','25376',['Доступ на 6 месяцев','Обратная связь по заданиям в общем чате','Ежемесячная групповая консультация','Чат и сообщество навсегда']),('gold','Наставничество','Личная работа с Николаем','99 000','160 000','16 500','25375',['Доступ на 12 месяцев','12 персональных консультаций','Выстраиваем гибкий процесс обучения под твои задачи','Всё из тарифа «Поддержка»'])]
ratehtml=''
for color,title,tag,price,old,mo,tariff,features in reversed(rates):
 ratehtml+=f'<article class="rate {color}"><p class="kicker">{tag}</p><h3>{title}</h3><p class="rate-price">{price} <small>₽</small></p><s>{old} ₽</s><p class="monthly">От {mo} ₽/мес. в рассрочку</p><ul>'+''.join('<li>'+f+'</li>' for f in features)+f'</ul><a class="btn" href="https://skillhub.salebot.pro/cs/get_form/form_input_custom_data?proxy_id=&amp;source=cs&amp;tariff={tariff}" target="_blank" rel="noopener">Записаться <span>↗</span></a></article>'
body+=section('rates','<h2>Форматы участия</h2><p class="big-lead rate-intro">Старт 9-го потока <span class="rate-date">2 ноября 2026.</span> Выгоднее покупать заранее. Ближе к старту цены вырастут. <span class="rate-installments">Можно покупать в рассрочку.</span></p><div class="included" aria-label="Что входит во все тарифы"><div class="included-head"><h3>Во всех тарифах</h3><p>Полная программа курса</p></div><div class="included-core"><div><h4>7 модулей · 32 урока</h4><p>Больше 12 часов видео и практические задания</p></div><div><h4>33 методички · 265 страниц</h4><p>Все практические материалы остаются навсегда</p></div><div><h4>Фото- и видеопресеты</h4><p><a class="preset-link" href="https://nickchernobaev.com/shop/film-emulation-pack" target="_blank" rel="noopener noreferrer">Film Emulation Pack V.1</a></p></div></div><ul class="included-tools"><li>Шаблоны построения историй</li><li>Шаблоны раскадровок</li><li>Рабочие тетради автора</li><li>Чек-листы и шпаргалки<span>Съёмка, монтаж, цвет, звук</span></li><li>Схемы освещения</li><li>Формулы заголовков и обложек</li></ul></div><div class="grid three rate-grid">'+ratehtml+'</div><p class="rate-note">В «Поддержке» и «Наставничестве» лучшие работы курса попадут в одно из будущих видео Николая на YouTube. Сроки доступа к урокам и консультациям определяются выбранным тарифом. Чат и сообщество на этих двух тарифах остаются навсегда.</p>')
faq=doc.one(id='b14').one('copy');qa='';last=None
for n in faq.c:
 if not isinstance(n,N):continue
 if n.t=='h3':last=n.text()
 elif n.t=='p' and last:qa+=f'<details><summary>{e(last)}<span>+</span></summary><div class="faq-answer"><p>{e(n.text())}</p></div></details>';last=None
qa=qa.replace('Примеры показываю в DaVinci Resolve.', 'Примеры показываю в DaVinci Resolve. Для старта рекомендую её бесплатную версию.').replace('Результат зависит от твоей практики и выбранного масштаба проекта.', 'Цель практики — как минимум один законченный контент-проект и готовое видео. Масштаб проекта выбираешь под свои задачи и время.')
body+=section('faq','<h2>Частые вопросы</h2><div class="faq">'+qa+'</div>')
body+=section('subscription',f'<h2 class="subscription-title">Подписаться на рассылку</h2><div class="subscription-layout"><div><p>Делюсь полезными материалами и опытом, анонсами новых курсов и новостями.</p><div class="subscription-cta"><a class="btn" href="https://t.me/chernobaev_nick" target="_blank" rel="noopener">Подписаться <span>↗</span></a><svg class="subscription-arrow" viewBox="0 0 90 72" fill="none" aria-hidden="true"><path d="M75 8C87 22 74 39 53 42C38 44 24 43 9 48M9 48C15 42 19 37 22 32M9 48C16 49 21 52 26 57" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>{image("subscription-subscription.webp","Николай Чернобаев — автор рассылки")}</div>','subscription')
body+=section('finish','<div class="finish-action"><div><p>9-й поток · Старт 2 ноября 2026</p></div><a class="btn" href="#rates">Выбрать формат <span>↗</span></a></div>','finish')
# Keep the user's own seven quotes, rather than substituting invented slogans.
source_quotes=src.all('goal')
for i in [0,1,2,4,5,6]:
 quote=source_quotes[i].one('goal__text').text()
 cite='<cite class="quote-signature">'+source_quotes[i].one('goal__author').html()+'</cite>' if i==6 else ''
 body+=f'<aside class="editorial-quote-wrap" id="source-quote-{i}"><div class="wrap"><blockquote class="editorial-quote">{e(quote)}{cite}</blockquote></div></aside>'
body=re.sub(r'(<blockquote class="author-manifesto">).*?(<cite>)',lambda m:m[1]+e(source_quotes[3].one('goal__text').text())+m[2],body)
body=re.sub(r'(<blockquote class="author-manifesto">.*?)<cite>.*?</cite>(</blockquote>)',r'\1\2',body,flags=re.S)
# Keep quote text separate from the signature for a gentle staggered entrance.
body=re.sub(r'(<blockquote class="(?:editorial-quote|author-manifesto)">)(.*?)(<cite\b|</blockquote>)',
 lambda m:m[1]+'<span class="quote-copy">'+m[2]+'</span>'+m[3],body,flags=re.S)
# The order follows an understandable purchase journey and the original blocks.
main_start=body.index('<main id="top">')+len('<main id="top">')
main_nodes=P(body[main_start:]).root.c
by_id={(n.a.get('id') or 'hero'):n for n in main_nodes if isinstance(n,N)}
order=['hero','course-facts','source-quote-0','begin','source-quote-1','learn','cases','programme','process','lessons','tools','source-quote-2','support','rates','about','clients','author-works','source-quote-4','reviews','gallery','source-quote-5','faq','subscription','source-quote-6','finish']
assert set(order)==set(by_id),(set(by_id)-set(order),set(order)-set(by_id))
body=body[:main_start]+''.join(by_id[id].html() for id in order)
socials=src.one('footer__socials-mobile').one('footer__socials-list')
for link in socials.all(tag='a'):
 url=link.a.get('href','');link.a['aria-label']='Telegram' if 't.me' in url else 'YouTube' if 'youtube' in url else 'Подкаст «Сделано с нуля» в Яндекс Музыке' if 'music.yandex.ru' in url else 'Кинопоиск — Николай Чернобаев'
footer='<footer class="site-footer wrap"><div class="footer-main">'+src.one('footer__mail').html()+src.one('footer__logo').html()+'<div class="footer-socials">'+socials.html()+'</div></div>'+src.one('footer__middle').html()+'</footer>'
fixed=src.one('fixed');fixed.a['class']='fixed site-fixed'
for button in fixed.all(tag='button'):
 button.a.pop('onclick',None)
 if button.a.get('data-link'):
  button.a['data-video']=button.a.pop('data-link');button.a['class']=button.a.get('class','').replace('play-btn','fixed-video-trigger')
for link in fixed.all(tag='a'):
 url=link.a.get('href','')
 if not link.text():link.a['aria-label']='Telegram' if 't.me' in url else 'YouTube' if 'youtube' in url else 'Подкаст «Сделано с нуля» в Яндекс Музыке' if 'music.yandex.ru' in url else 'Кинопоиск — Николай Чернобаев'
body=body.replace('<span>↗</span>','')
body+='</main>'+footer+fixed.html()+'''<dialog id="case-story" aria-labelledby="case-story-title"><button class="close-case" aria-label="Закрыть историю">×</button><div class="case-story-body"></div></dialog><dialog id="player"><button class="close-player" aria-label="Закрыть видео">×</button><div class="video-host"></div></dialog><script src="/assets/site-editorial-v4/vendors.js"></script><script src="/assets/site-editorial-v4/legacy-interactions.js"></script><script src="/assets/site-editorial-v4/site.js"></script>'''
from editorial_media import refine
body=refine(body,src,P,N,e,im)
# Restore the complete source mobile menu around the current navigation links.
menu_src=src.one(id='mobile-menu')
menu_socials=menu_src.one('ham-menu__socials').html().replace('class="fixed__auth"', 'class="fixed__auth nav-login"')
menu_video=menu_src.one('ham-menu__video').html()
menu_video=menu_video.replace('data-link=', 'data-video=')
body=body.replace('<nav id="navlinks">', '<nav id="navlinks" aria-label="Основное меню"><div class="nav-primary">')
body=body.replace('<a class="nav-login" href="https://salebot.pro/courses" target="_blank" rel="noopener">Войти</a></nav>', '<a class="desktop-login" href="https://salebot.pro/courses" target="_blank" rel="noopener">Войти</a></div><div class="mobile-menu-extra">'+menu_socials+menu_video+'</div></nav>')
body=body.replace('class="menu-toggle" aria-expanded=', 'class="menu-toggle" aria-label="Открыть меню" aria-expanded=')

html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Академия Авторов · Контент-мастер</title><link rel="stylesheet" href="/assets/site-editorial-v4/carousel.css"><link rel="stylesheet" href="/assets/site-editorial-v4/site.css"><link rel="stylesheet" href="/assets/site-editorial-v4/editorial.css"><link rel="stylesheet" href="/assets/site-editorial-v4/refinements.css"><link rel="stylesheet" href="/assets/site-editorial-v4/layout.css"></head><body>'+body+'</body></html>'
html=html.replace('</head>', '<link rel="stylesheet" href="/assets/site-editorial-v4/typography.css"></head>')

# Critical fonts travel with the HTML; mobile reloads never wait on a font CDN.
font_faces=[
 ('Mont','assets/site-audit-v9/fonts/montserrat-cyrillic-wght-normal.woff2','font-weight:100 900;unicode-range:U+0400-052F;'),
 ('Mont','assets/site-audit-v9/fonts/montserrat-latin-wght-normal.woff2','font-weight:100 900;'),
 ('Dita','fonts/dita/Ditasweet.woff2','font-weight:400;'),
 ('Bebas','fonts/bebas/bebasneuebold.woff2','font-weight:700;'),
 ('HeroHandwriting','assets/site-editorial-v4/fonts/caveat/hero-note-cyrillic.woff2','font-weight:400;'),
]
font_css=''.join('@font-face{font-family:'+family+';src:url("data:font/woff2;base64,'+base64.b64encode((SITE/path).read_bytes()).decode()+'") format("woff2");'+descriptors+'font-display:block;}' for family,path,descriptors in font_faces)
html=html.replace('<title>', '<style id="site-fonts">'+font_css+'</style><title>',1)

html=html.replace('href="#students-works"','href="#gallery"')
html=re.sub(r'(<video class="feedback-preview"[^>]*poster="([^"]+)"[^>]*aria-label="([^"]*)"[^>]*>.*?</video>)',
 lambda m:'<div class="feedback-screen"><img class="feedback-still" src="'+m[2]+'" alt="'+m[3]+'" loading="lazy" decoding="async">'+m[1]+'</div>',html,flags=re.S)

html=html.replace('<ul><li><strong>Для своего канала.', '<ul id="for-who-container"><li><strong>Для своего канала.')
html=html.replace('<div class="grid three"><article class="tool">', '<div class="kit__grid owl-carousel"><article class="tool">')
baseline=(SITE/'source/story/baseline.html').read_text()
meta=''.join(n.html() for n in src.all(tag='meta') if n.a.get('name')=='description' or n.a.get('property','').startswith('og:'))
counters=''.join(re.findall(r'<!-- (?:Top.Mail.Ru counter|Yandex.Metrika counter) -->[\s\S]*?<!-- /(?:Top.Mail.Ru counter|Yandex.Metrika counter) -->',baseline))
noscript=''.join(n.html() for n in src.all(tag='noscript'))
html=html.replace('</head>',meta+counters+'</head>').replace('<body>','<body>'+noscript)

# Paragraph emphasis and line lengths follow a consistent editorial hierarchy.
for sentence in ['Хочется рассказывать о своём деле, вести канал или сохранять важные моменты жизни.', 'Я Николай Чернобаев.', 'Вместе с уроками ты получишь 33 методички: 265 страниц шаблонов, схем, чек-листов и рабочих материалов.', 'Когда долго работаешь над видео, бывает трудно увидеть, что стоит изменить.']:
 html=html.replace(sentence,'<strong>'+sentence+'</strong>')
# The fourth version restores the original direct portrait in the hero.
# Repair local references in preserved baseline markup, retaining original remote video/payment URLs.
html=html.replace('https://Nikkola.github.io/creatoracademy/','/')
html='\n'.join(line.rstrip() for line in html.split('\n'))
(HERE/'index.html').write_text(html)
expected={'videos':sorted({n.a.get('data-link') for n in src.all('play-btn') if n.a.get('data-link')} | {'https://www.youtube-nocookie.com/embed/0HvvxPjGvBE?rel=0'} | {item['video'] for item in podcast_additions+vlog_additions}),'payments':sorted({n.a.get('href') for n in src.all(tag='a') if 'get_form/' in n.a.get('href','') and any('tariff='+t in n.a.get('href','') for t in ['25374','25376','25375'])}),'counts':{'cases':len(case_cards)+1,'works':len(works),'video_reviews':len(vrev),'portfolio':len(portfolio)+1+len(podcast_additions)+len(vlog_additions),'written_reviews':len(rev_cards),'lessons':len(lessons)}}
(SITE/'source/story/expected.json').write_text(json.dumps(expected,ensure_ascii=False,indent=2))

(SITE/'source/story/inventory.json').write_text(json.dumps(dict(student_works=len(works),video_reviews=len(vrev),portfolio=len(portfolio)+1+len(podcast_additions)+len(vlog_additions),cases=len(case_cards)+1,written_reviews=len(rev_cards),lessons=len(lessons),missing_assets=missing),ensure_ascii=False,indent=2))
print((SITE/'source/story/inventory.json').read_text())
