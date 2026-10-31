"""User-requested media scenes for the fourth preview; source copy stays intact."""
import re
import base64
import json
from pathlib import Path
from process_graphics import graphics
from material_graphics import material_graphics


def refine(body, src, Parser, Node, escape, image):
    body = body.replace('<p class="course-label">Курс</p>', '', 1)
    root = Parser(body).root

    def markup(node):
        return ''.join(child.html() if isinstance(child, Node) else escape(child)
                       for child in node.c)

    def put(node, html):
        node.c = Parser(html).root.c
        for child in node.c:
            if isinstance(child, Node):
                child.parent = node

    def section(id, html):
        target = root.one(id=id).one('wrap')
        assert target.t, id
        put(target, html)

    def loop(name, poster, label, attr='data-ambient'):
        return (f'<video class="ambient-video" {attr} muted loop playsinline '
                f'preload="none" poster="{escape(poster)}" aria-label="{escape(label)}">'
                f'<source src="/assets/site-editorial-v4/media/{name}.mp4" type="video/mp4"></video>')

    def media(url, label, video=None, cls=''):
        return f'<div class="scene-media {cls}">{image(url, label)}' + (
            loop(video, '/' + url, label) if video else '') + '</div>'

    # Restore the actual opening/closing marks, rather than substituting guillemets.
    hero_heading = root.one('hero-copy').one(tag='h1')
    put(hero_heading, re.sub(r'<br\s*/?>', ' ', markup(hero_heading)))
    put(root.one('course-name'), markup(src.one('hero__title').one(tag='h1')))
    root.one('course-name').a['aria-label'] = 'Контент-мастер'
    course_name = root.one('course-name')
    hero_copy = root.one('hero-copy')
    brand = Parser('<div class="hero-brand">' + course_name.html() + '</div>').root.one('hero-brand')
    author_note = Parser('<p class="hero-author-note" data-handwriting="caveat-ofl">'
        '<span>Авторский курс</span> <span class="hero-author-name"><span>Николая</span> '
        '<span>Чернобаева</span></span></p>').root.one('hero-author-note')
    hero_copy.c[hero_copy.c.index(course_name)] = brand
    brand.parent = hero_copy
    portrait = root.one('hero-portrait')
    portrait.c.append(author_note)
    author_note.parent = portrait
    photo_frame = Parser('<div class="hero-photo-frame"></div>').root.one('hero-photo-frame')
    photo_frame.c = portrait.c
    for child in photo_frame.c:
        if isinstance(child, Node):
            child.parent = photo_frame
    portrait.c = [photo_frame]
    photo_frame.parent = portrait
    fine = root.one('fine')
    fine.t = 'dl'
    fine.a['class'] = 'fine hero-facts'
    put(fine, '<div><dt>Старт</dt><dd>2 ноября</dd></div>'
              '<div><dt>Рассрочка</dt><dd>От 5 000 ₽/мес.</dd></div>')
    fine.parent.c.remove(fine)
    hero_actions = root.one('hero-copy').one('actions')
    hero_actions.c.insert(0, fine)
    mobile_meta = Parser('<p class="hero-mobile-meta">Старт 2 ноября · от 5 000 ₽/мес.</p>').root.one('hero-mobile-meta')
    hero_actions.c.insert(0, mobile_meta)
    mobile_meta.parent = hero_actions
    fine.parent = hero_actions

    tariff_icons = {
        'copper': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
        'silver': '<path d="M20 11a7 7 0 0 1-7 7H7l-4 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4Z"/><path d="M7 8h9M7 12h6"/>',
        'gold': '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20v-2a6 6 0 0 1 12 0v2ZM15 14a5 5 0 0 1 7 5v1h-5"/>',
    }
    for rate in root.one(id='rates').all('rate'):
        name = rate.one(tag='h3')
        paths = next(icon for kind, icon in tariff_icons.items() if kind in rate.a['class'].split())
        put(name, '<span class="rate-icon" aria-hidden="true"><svg viewBox="0 0 24 24" '
            'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" '
            'stroke-linejoin="round">' + paths + '</svg></span><span class="rate-name">'
            + escape(name.text()) + '</span>')

    facts = []
    for i, item in enumerate(src.one('info').all('info__item')):
        description = ('<p class="item__text">Месяца обучения в удобном темпе</p>'
                       if i == 0 else '<p class="item__text">Видеоурока</p>' if i == 2 else item.one('item__text').html())
        number = {0: '3+', 2: '34', 3: '13+'}.get(i, escape(item.one('item__num').text()))
        facts.append('<li><b>' + number + '</b>'
                     + re.sub(r'<br\s*/?>', ' ', description) + '</li>')
    assert len(facts) == 6
    section('course-facts', '<h2>Курс в цифрах</h2><ul class="course-numbers" aria-label="Курс в цифрах">'
            + ''.join(facts) + '</ul>')

    # The four approved vlog loops keep the complete audience copy.
    audience = root.one(id='begin')
    audience.one(tag='h2').c = ['Кому подойдёт курс']
    audience_rail = audience.one(id='for-who-container')
    audience_rail.a.update({'id': 'audience-gallery', 'class': 'audience-gallery owl-carousel',
                            'aria-label': 'Кому подойдёт курс'})
    audience_loops = json.loads(Path('source/story/audience-loops-20261023.json').read_text())
    for card, scene in zip(audience.all('audience-card'), audience_loops):
        photo = card.one(tag='img')
        photo.a['loading'] = 'eager'
        put(card, '<div class="scene-media">' + photo.html()
            + loop(scene['name'], photo.a['src'], scene['label'], 'data-slide-ambient')
            + '</div><div class="card-copy">' + card.one(tag='h3').html()
            + card.one(tag='p').html() + '</div>')

    skills_rail = root.one(id='learn-container')
    skills_rail.a.update({'id': 'skills-gallery', 'class': 'skills-gallery owl-carousel',
                          'aria-label': 'Чему ты научишься'})
    outcome_loops = {0: 'skill-voice-v4', 1: 'skill-story-v3', 2: 'skill-light-v2', 3: 'skill-gear-v2', 4: 'skill-cinematic-v7',
                     5: 'skill-podcast-v2', 6: 'skill-editing-v2'}
    for i, card in enumerate(root.one(id='learn').all('outcome-card')):
        photo = card.one(tag='img')
        photo.a['loading'] = 'eager'
        title = card.one(tag='h3')
        description = title.text()
        put(title, escape(description[:1].upper() + description[1:]))
        video = loop(outcome_loops[i], '/assets/site-editorial-v4/media/' + outcome_loops[i] + '.webp',
                     photo.a.get('alt', ''), 'data-slide-ambient')
        put(card, '<div class="scene-media">' + photo.html() + video
            + '</div><div class="card-copy">' + title.html() + '</div>')

    promotion_label = 'Экологично продвигать свой контент и бренд'
    promotion_poster = 'assets/site-editorial-v4/media/skill-promotion-v2.webp'
    promotion_card = Parser('<li class="outcome-card"><div class="scene-media">'
        + image(promotion_poster, promotion_label).replace('loading="lazy"', 'loading="eager"')
        + loop('skill-promotion-v2', '/' + promotion_poster, 'Николай рассказывает о продвижении и показывает свой канал', 'data-slide-ambient')
        + '</div><div class="card-copy"><h3>' + promotion_label + '</h3></div></li>').root.one('outcome-card')
    skills_rail.c.append(promotion_card)
    promotion_card.parent = skills_rail

    examples = [
        ('assets/site-editorial-v4/media/programme-meaning-v3.webp', 'От личного опыта к авторскому голосу', 'programme-meaning-v3'),
        ('assets/site-editorial-v4/media/programme-ideas-v3.webp', 'Научишься формировать оригинальные идеи', 'programme-ideas-v3'),
        ('assets/site-editorial-v4/media/programme-story-v4.webp', 'График развития истории из урока', 'programme-story-v4'),
        ('assets/site-editorial-v4/media/programme-gear-v6.webp', 'Камеры, оптика и настройка техники', 'programme-gear-v6'),
        ('assets/site-editorial-v4/media/programme-light-v3.webp', 'От постановки света к готовому кадру', 'programme-light-v3'),
        ('assets/site-editorial-v4/media/programme-editing-v4.webp', 'Монтаж, цвет и звук в DaVinci Resolve', 'programme-editing-v4'),
        ('assets/site-editorial-v4/media/programme-promotion-v6.webp', 'YouTube Shorts, методичка и аналитика YouTube Studio', 'programme-promotion-v6'),
    ]
    modules = []
    for i, module in enumerate(src.all('programme__item')):
        url, label, video = examples[i]
        modules.append(f'<li class="programme-module module-scene"><div class="module-copy">'
                       f'<p class="module-number">Модуль {i+1}</p>'
                       f'<h3>{escape(module.one("programme__subtitle").text())}</h3>'
                       f'<p class="module-description">{escape(module.one("programme__text").text().replace("как генерировать оригинальные", "как формировать оригинальные"))}</p></div>'
                       f'<figure class="module-visual">{media(url, label, video)}</figure></li>')
    section('programme', '<h2>Программа курса</h2><p class="editorial-lead">Семь модулей от идеи и сценария '
            'до съёмки, монтажа и продвижения. Практика на твоём контент-проекте.</p>'
            '<ol class="programme-modules">' + ''.join(modules) + '</ol>')

    # Explanation samples retain their original full video URLs and sound on click.
    lessons = root.one(id='lessons')
    films = lessons.all('film')
    for i, film in enumerate(films):
        film.a['class'] += ' sound-lesson'
        film.one(tag='img').a['src'] = '/assets/site-editorial-v4/media/' + ['lesson-cover-light-v3', 'lesson-cover-framing-v4', 'lesson-cover-editing-v3', 'lesson-cover-storytelling-v4'][i] + '.webp'
        film.one(tag='img').a['loading'] = 'eager'
        play = film.one('play')
        play.a['aria-label'] = 'Смотреть фрагмент урока: ' + film.one(tag='h3').text()
        put(film, '<div class="sound-lesson-copy">' + film.one(tag='h3').html()
            + '</div>' + film.one('media').html())
    section('lessons', lessons.one(tag='h2').html()
            + '<div id="lessons-gallery" class="owl-carousel" aria-label="Фрагменты уроков">'
            + ''.join(film.html() for film in films) + '</div>')

    process = root.one(id='process')
    for step in process.all('step'):
        title = step.one(tag='h3')
        if title.text() == 'Личный кабинет и Skillhub':
            put(title, 'Личный кабинет')
            put(step.one(tag='p'), 'Смотри на компьютере или в мобильном приложении Skillhub.')
        if title.text() == 'Чат и 100+ авторов':
            put(title, 'Сообщество')
            put(step.one(tag='p'), 'Чат, где общаются 100+ авторов, задают вопросы и делятся опытом. '
                'Остаётся навсегда на «Поддержке» и «Наставничестве».')
    steps = process.all('step')
    support = root.one(id='support')
    meeting_media = support.one('feedback-demo').html().replace(
        'feedback-preview.mp4', 'feedback-students-v3.mp4').replace(
        'feedback-poster.webp', 'feedback-students-v3.webp')
    knowledge_media = '<div class="cover-stack process-illustration">' + ''.join(
        image('assets/site-editorial-v4/media/process-cover-' + key + '.webp', label)
        for key, label in [('meaning', 'Методичка по смыслу'), ('ideas', 'Методичка по идеям'),
                           ('story', 'Методичка по сторителлингу')]) + '</div>'
    chat_avatar = image(root.one('hero-portrait').one(tag='img').a['src'].lstrip('/'), 'Николай')
    chat_media = ('<div class="chat-demo process-illustration" data-chat-demo role="img" '
        'aria-label="Пример обсуждения в сообществе: участник спрашивает о свете, Николай отвечает, другой автор подключается">'
        '<div class="chat-header"><span class="chat-group-icon" aria-hidden="true">А</span>'
        '<div><strong>Сообщество авторов</strong><span>100+ участников</span></div>'
        '<i aria-hidden="true">•••</i></div><div class="chat-viewport"><div class="chat-thread">'
        '<div class="chat-message" data-chat-message><span class="chat-sender">Участник</span>'
        '<p>Как сделать свет в кадре объёмнее?</p><small>12:41</small></div>'
        '<div class="chat-message chat-author" data-chat-message><span class="chat-sender">Николай</span>'
        '<p>Попробуй поставить камеру с теневой стороны окна. Покажи, что получится.</p>'
        '<small>12:42 <span aria-hidden="true">✓✓</span></small>' + chat_avatar + '</div>'
        '<div class="chat-message chat-peer" data-chat-message><span class="chat-sender">Участница</span>'
        '<p>Тоже пробую этот приём. Давайте сравним результаты!</p><small>12:42</small></div>'
        '</div></div><div class="chat-typing"><span data-chat-typing>Участник печатает</span>'
        '<i></i><i></i><i></i></div><div class="chat-compose" aria-hidden="true">'
        '<span>＋</span><span>Сообщение</span><span>↑</span></div></div>')
    knowledge_media, practice_media, project_media = graphics(image, loop)
    step_media = [
        knowledge_media,
        '',
        practice_media,
        meeting_media,
        chat_media,
        project_media,
    ]
    process_cards = []
    for i, step in enumerate(steps):
        title = step.one(tag='h3').html()
        text = step.one(tag='p').html().replace('Единая система: от идеи', 'Единая система от идеи').replace(
            'Задания к каждому из семи модулей: применяй знания к своему материалу.',
            'В каждом из семи модулей применяй знания к своему материалу.').replace(
            'Цель практики — как минимум один законченный контент-проект и готовое видео.',
            'Работай над своим контент-проектом и доведи его до готового видео.')
        cta = ''
        if i == 3:
            text = ('<p>Раз в месяц встречаемся на групповой консультации. Задавай вопросы, показывай '
                    'работы и получай разборы на «Поддержке» и «Наставничестве».</p>'
                    '<p>В «Наставничестве» добавляются 12 персональных консультаций и личная работа '
                    'со мной в течение года.</p>')
            # The hero and final section already link to participation formats.
        process_cards.append('<article class="process-card step"' + (' id="support"' if i == 3 else '')
            + '><div class="process-copy">' + title + text + cta + '</div><div class="process-media">'
            + step_media[i] + '</div></article>')
    support.parent.c.remove(support)
    platform = 'assets/site-audit-v3/images/how-v2-process-platform.webp'
    light_poster = '/assets/site-editorial-v4/media/process-cabinet-v3.webp'
    storyboard = 'assets/site-audit-v3/images/how-v2-material-storyboard.webp'
    phone_material = 'assets/site-audit-v3/images/how-v2-material-lighting.webp'
    cursor = '<svg viewBox="0 0 22 28" aria-hidden="true"><path d="M3 2v20l5-5 4 9 4-2-4-8h7Z"/></svg>'
    stage = f'''<div class="learning-demo device-demo" data-phase="0">
      <div class="learning-stage">
        <div class="laptop-shell"><div class="laptop-screen">
          <div class="desktop-scene cabinet-scene"><div class="cabinet-canvas">{image(platform, 'Настоящий личный кабинет курса')}<div class="screen-selection"></div><div class="demo-cursor">{cursor}<i></i></div></div></div>
          <div class="desktop-scene video-scene">{image('assets/site-editorial-v4/media/process-cabinet-v3.webp', 'Урок о композиции и съёмке')}{loop('process-cabinet-v3', light_poster, 'Фрагмент настоящего урока', 'data-demo-video')}</div>
          <div class="desktop-scene material-scene">{image(storyboard, 'Раскадровка для практического задания')}</div>
        </div></div>
        <div class="phone-shell"><div class="phone-camera"></div><div class="phone-display">
          <div class="phone-scene phone-cabinet"><div class="phone-course-list"><p class="phone-course-heading">Съёмка</p>
            <div class="phone-course-row"><small>Урок 1</small><p>Как устроено кино и фото производство?</p><i>→</i></div>
            <div class="phone-course-row"><small>Урок 2</small><p>Как выставить композицию и поставить кадр?</p><i>→</i></div>
            <div class="phone-course-row selected"><small>Урок 3</small><p>Как выставить освещение?</p><i>→</i></div>
            <div class="phone-course-row"><small>Урок 4</small><p>Как настроить микрофоны?</p><i>→</i></div>
            <div class="phone-course-row"><small>Урок 5</small><p>Как снимать разные виды контента?</p><i>→</i></div>
            <div class="phone-course-row"><small>Урок 6</small><p>Практика. Домашнее задание.</p><i>→</i></div>
          </div><span class="swipe-touch"></span></div>
          <div class="phone-scene phone-lesson"><div class="phone-live-lesson">{image('assets/site-editorial-v4/media/process-phone-light-v4.webp', 'Урок об освещении на смартфоне')}{loop('process-phone-light-v4', '/assets/site-editorial-v4/media/process-phone-light-v4.webp', 'Фрагмент настоящего урока 5.3 об освещении', 'data-phone-lesson-video')}</div><div class="phone-lesson-copy"><small>Модуль 5 · Съёмка</small><strong>Как выставить освещение?</strong></div></div>
          <div class="phone-scene phone-practice"><div class="phone-material">{image(phone_material, 'Свайп по схемам освещения')}</div><span class="swipe-touch"></span></div>
          <div class="phone-lighting-demo"><small>Практика настройки света</small><div class="phone-lesson-material">{image('assets/site-editorial-v4/media/process-phone-light-setup-v2.webp', 'Настройка света в уроке')}{loop('process-phone-light-setup-v2', '/assets/site-editorial-v4/media/process-phone-light-setup-v2.webp', 'Настройка положения и мощности света', 'data-phone-lighting-video')}</div></div>
        </div><div class="phone-home"></div></div>
      </div>
    </div>'''
    process_nodes = Parser(''.join(process_cards)).root.all('process-card')
    for card, name in zip(process_nodes, ['knowledge', 'cabinet', 'practice', 'meeting', 'community', 'project']):
        card.a['class'] += ' process-' + name
    put(process_nodes[1].one('process-media'), stage)
    section('process', '<h2>Как устроен процесс</h2><p class="process-tagline">Учись в своём ритме. '
            'Применяй на своём проекте.</p><div class="process-steps">'
            + ''.join(process_nodes[i].html() for i in [1, 0, 2, 4, 3, 5]) + '</div>')

    tools = root.one(id='tools').one('kit__grid')
    cards = tools.all('tool')
    put(cards[2].one(tag='h3'), 'Памятки и шпаргалки')
    put(cards[2].one(tag='p'), 'Чек-листы и памятки по съёмке, монтажу, цвету и звуку.')
    material_scenes = material_graphics(image)
    for i, card in enumerate(cards):
        card.one(tag='img').a['loading'] = 'eager'
        put(card, '<div class="tool-media">' + material_scenes[i]
            + '</div><div class="tool-copy">' + card.one(tag='h3').html() + card.one(tag='p').html() + '</div>')
    preset = '<article class="tool preset-tool"><div class="tool-media">' + image(
        'assets/site-editorial-v4/media/materials-presets-v3.webp', 'Пример фото- и видеоэмуляции плёнки из авторского пака').replace('loading="lazy"', 'loading="eager"')
    preset += loop('materials-presets-v3', '/assets/site-editorial-v4/media/materials-presets-v3.webp', 'Плёночная эмуляция и применение пресетов из фильма «Как снимать на плёнку?»')
    preset += '</div><div class="tool-copy"><h3>Фото и видеопресеты</h3><p>Мой авторский Film Emulation Pack V.1.</p>'
    preset += '<a class="preset-link" href="https://nickchernobaev.com/shop/film-emulation-pack" target="_blank" rel="noopener noreferrer">Посмотреть набор ↗</a></div></article>'
    section('tools', '<h2>Что останется после курса</h2><div class="kit__grid owl-carousel">'
            + ''.join(card.html() for card in cards) + preset + '</div>')

    for card, original in zip(root.one(id='cases').all('case'), src.all('cases__item')):
        before, after = original.all('cases__text')[:2]
        card.one('person').one(tag='img').a['loading'] = 'eager'
        put(card, '<div class="case-profile">' + card.one('person').html()
            + card.one('case-links').html() + '</div><div class="case-journey">'
            + card.one(tag='h4').html() + '<div class="case-points">'
            + '<div class="case-before"><p class="kicker">Точка А</p><p>' + escape(before.text()) + '</p></div>'
            + '<div class="case-after"><p class="kicker">Точка Б</p><p>' + escape(after.text()) + '</p></div>'
            + '</div></div>')

    new_case = json.loads(Path('source/story/ukhlov-case-20261022.json').read_text())
    new_card = Parser('<article class="case cases__item" data-case="sergey-ukhlov"><div class="case-profile">'
        '<div class="person">' + image(new_case['avatar'], new_case['name'])
        + '<div><h3>' + escape(new_case['name']) + '</h3><p class="case-flow">'
        + escape(new_case['cohort']) + '</p></div></div><div class="case-links">'
        '<a class="cases__link" href="' + escape(new_case['channelUrl']) + '" target="_blank" rel="noopener noreferrer">'
        + escape(new_case['channelHandle']) + '</a>'
        '<a class="cases__link" href="' + escape(new_case['videoUrl']) + '" target="_blank" rel="noopener noreferrer">«'
        + escape(new_case['video']['title']) + '»</a></div>'
        '</div><div class="case-journey"><h4>' + escape(new_case['result']) + '</h4><div class="case-points">'
        '<div class="case-before"><p class="kicker">Точка А</p><p>' + escape(new_case['before']) + '</p></div>'
        '<div class="case-after"><p class="kicker">Точка Б</p><p>' + escape(new_case['after']) + '</p></div>'
        '</div></div></article>').root.one('case')
    new_card.one(tag='img').a['loading'] = 'eager'
    case_rail = root.one(id='casesSlider')
    case_rail.c.insert(0, new_card)
    new_card.parent = case_rail

    # User supplied the final price-card wording; payment links stay intact.
    rate_copy = {
        'copper': ('В своём темпе', 'Если готов проходить программу и делать проект самостоятельно.', [
            ('Доступ на 3 месяца', 'Все уроки открываются после оплаты'),
            ('Самостоятельная практика', 'Без проверки домашних заданий'),
            ('Без чата и сообщества', 'Работаешь по материалам курса'),
            ('Методички остаются навсегда', 'Шаблоны, схемы и чек-листы')]),
        'silver': ('С группой и обратной связью', 'Если хочешь получать разборы и проходить вместе с другими авторами.', [
            ('Доступ на 6 месяцев', 'Больше времени на свой проект'),
            ('Обратная связь в общем чате', 'По работам и домашним заданиям'),
            ('Ежемесячная консультация', 'Групповые разборы и ответы на вопросы'),
            ('Сообщество и чат навсегда', 'Остаёшься среди авторов после курса')]),
        'gold': ('Личная работа со мной', 'Если нужен индивидуальный подход и сопровождение на протяжении года.', [
            ('Доступ на 12 месяцев', 'Год работы над своими проектами'),
            ('12 персональных консультаций', 'Разбираю твои работы и задания'),
            ('Гибкий процесс под тебя', 'Личная работа со мной весь год'),
            ('Всё из тарифа «Поддержка»', 'Групповые разборы, чат и сообщество')])}
    for card in root.all('rate'):
        color = next(key for key in rate_copy if key in card.a['class'].split())
        kicker, description, rows = rate_copy[color]
        put(card.one('kicker'), kicker)
        put(card, card.one('kicker').html() + card.one(tag='h3').html()
            + '<p class="rate-description">' + escape(description) + '</p>'
            + card.one('rate-price').html() + card.one(tag='s').html() + card.one('monthly').html()
            + '<ul>' + ''.join('<li><span>' + escape(title) + '</span><small>' + escape(copy)
                               + '</small></li>' for title, copy in rows) + '</ul>' + card.one('btn').html())

    about = root.one(id='about')
    manifesto = about.one('author-manifesto').html()
    source_about = src.one(id='about')
    original_bio = Parser(source_about.one('about__list').html()).root
    original_bio.one('about__list').a['class'] += ' owl-carousel'
    for button in original_bio.all('play-btn'):
        button.a['data-video'] = button.a.pop('data-link')
        button.a['class'] = 'round__btn play'
        button.a['aria-label'] = 'Смотреть подкаст «Сделано с нуля»'
    section('about', '<h2>Обо мне</h2>' + markup(original_bio)
            + source_about.one('about-slider-dots').html() + manifesto)
    wide_manifesto = about.one('author-manifesto')
    wide_manifesto.parent.c.remove(wide_manifesto)
    about.c.append(wide_manifesto)
    wide_manifesto.parent = about

    site = Path(__file__).resolve().parents[1]
    client_data = json.loads((site / 'source/story/clients.json').read_text())['clients']
    logos = []
    for brand in client_data:
        encoded = base64.b64encode((site / brand['asset']).read_bytes()).decode('ascii')
        cls = 'client-vector' if brand['nativeVector'] else 'client-raster'
        logos.append('<div class="client-logo-tile' + (' has-brand-label' if brand['label'] else '')
                     + '"><img class="client-mark ' + cls + ' ' + brand['tone']
                     + '" src="data:image/svg+xml;base64,' + encoded + '" alt="' + escape(brand['name'])
                     + '" loading="eager" decoding="async">'
                     + ('<span aria-hidden="true">' + escape(brand['label']) + '</span>' if brand['label'] else '')
                     + '</div>')
    rows = []
    for i in range(2):
        rows.append(f'<div class="client-marquee-row {"is-reverse" if i else ""}"><div class="client-marquee-track">'
                    '<div class="client-marquee-group">' + ''.join(logos[i::2])
                    + '</div></div></div>')
    mobile_logos = [logo.replace('client-logo-tile', 'client-mobile-brand').replace('client-mark', 'client-mobile-logo').replace('has-brand-label', 'client-mobile-labelled') for logo in logos]
    mobile_pages = ''.join('<div class="client-mobile-page'+(' is-active' if i==0 else '')+'" aria-hidden="'+('false' if i==0 else 'true')+'">'+''.join(mobile_logos[i:i+4])+'</div>' for i in range(0,len(logos),4))
    mobile_dots = ''.join('<button type="button" aria-label="Группа клиентов '+str(i//4+1)+'"'+(' aria-current="true"' if i==0 else '')+'></button>' for i in range(0,len(logos),4))
    section('clients', '<h2>Мои клиенты</h2><div class="client-marquee" role="region" '
            'aria-label="Клиенты Николая Чернобаева">' + ''.join(rows) + '<div class="client-mobile"><div class="client-mobile-stage">'+mobile_pages+'</div><nav class="carousel-pagination client-mobile-dots" aria-label="Группы клиентов">'+mobile_dots+'</nav></div></div>')

    icon = '<span class="accordion-icon" aria-hidden="true"></span>'
    for details in root.all(tag='details'):
        summary = details.one(tag='summary')
        summary.a['aria-expanded'] = 'false'
        if 'portfolio-category' in details.a.get('class', ''):
            content = ''.join(n.html() if isinstance(n, Node) else escape(n) for n in details.c if n is not summary)
            put(summary, summary.one('portfolio-title').html() + icon)
            put(details, summary.html() + '<div class="disclosure-content">' + content + '</div>')
        else:
            title = ''.join(escape(n) for n in summary.c if not isinstance(n, Node)).strip()
            put(summary, title + icon)

    original_play = src.one('hero').one('play-btn').one(tag='svg').html()
    for film in root.one(id='author-works').all('film'):
        if film.one(tag='h3').text() == 'Книжные романтики':
            film.a['class'] += ' book-romantics'
            target = film.one('media')
            target.one(tag='img').a['src'] = '/assets/site-editorial-v4/book-romantics-extended-v2.webp'
            target.t = 'div'
            target.a = {'class': 'media'}
            put(target, target.one(tag='img').html()
                + '<button class="play" type="button" data-video="https://www.youtube-nocookie.com/embed/0HvvxPjGvBE?rel=0" '
                'aria-label="Смотреть: Книжные романтики">' + original_play + '</button>')
    for play in root.all('play'):
        put(play, original_play)
    for film in root.one(id='reviews').all('film'):
        if film.one(tag='h3').text() == 'Нияз Валиуллин':
            film.a['class'] += ' niyaz-review'
    # The author slide uses its own small, precisely centered source triangle.
    for play in root.one(id='about').all('play'):
        put(play, source_about.one('play-btn').one(tag='svg').html())

    arrow = src.one('hero__button-svg').one(tag='svg').html()
    finish_button = root.one('finish-action').one('btn')
    for button in root.all('btn'):
        label = 'Записаться' if button is finish_button else button.text()
        put(button, '<span class="btn-label">' + escape(label) + '</span>'
            '<span class="btn-arrow" aria-hidden="true">' + arrow + '</span>')

    included_head = root.one('included-head')
    put(included_head, included_head.one(tag='h3').html())
    finish_copy = root.one('finish-action').one(tag='p')
    finish_copy.a['class'] = 'finish-invitation'
    put(finish_copy, '<span class="finish-title">Записывайся на ближайший 9-й поток.</span> '
        '<span class="finish-date">Старт 2 ноября 2026 года</span>')
    from hero_layout import apply_hero
    apply_hero(root, Parser)
    return markup(root).replace('в одно из будущих видео Николая', 'в одно из моих будущих видео').replace('Фото- и видеопресеты', 'Фото и видеопресеты')
