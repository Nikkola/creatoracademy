"""Illustrative process scenes; these are not screenshots of LMS features."""


def graphics(image, loop):
    def svg(paths, view='0 0 24 24'):
        return '<svg viewBox="' + view + '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'

    play = svg('<path d="m9 6 9 6-9 6Z"/>')
    check = svg('<path d="m5 12 4 4L19 6"/>')
    folder = svg('<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>')
    covers = ''.join('<div>' + image('assets/site-editorial-v4/media/process-cover-' + key + '.webp', label) + '</div>' for key, label in [('meaning', 'Смысл'), ('ideas', 'Идеи'), ('story', 'Сторителлинг')])
    knowledge = ('<div class="process-story library-demo" data-process-story="knowledge" role="img" aria-label="Учебная библиотека: модули курса, видеоуроки и методички">'
        '<div class="graphic-top"><span class="graphic-dot"></span>Моя библиотека<span class="graphic-mark">А</span></div>'
        '<div class="graphic-panel library-modules" data-story-panel="0"><span class="graphic-eyebrow">Семь модулей. Одна система.</span><div class="module-library">' + ''.join('<div style="--row:' + str(i) + '"><span>0' + str(i + 1) + '</span><b>' + name + '</b>' + play + '</div>' for i, name in enumerate(['Смысл', 'Идеи', 'Сторителлинг', 'Техника', 'Съёмка', 'Монтаж', 'Продвижение'])) + '</div></div>'
        '<div class="graphic-panel library-lessons" data-story-panel="1"><div class="library-orbit">' + play + '<i></i><i></i></div><strong>34 видеоурока</strong><span>От идеи до готового видео</span><div class="library-track"><i></i></div><div class="library-file">' + folder + '<span>Методички к урокам</span>' + check + '</div></div>'
        '<div class="graphic-panel library-books" data-story-panel="2"><div class="library-covers">' + covers + '</div><strong>Знания всегда под рукой</strong><span>Уроки, схемы и рабочие материалы</span></div><div class="graphic-progress"><i></i><i></i><i></i></div></div>')
    drawing = svg('<path d="M2 39h96M9 39V13h30v26M15 20h7v8h-7Zm13 0h7v8h-7ZM53 39V25m-5 14 5-14 7 14m-13-25a6 6 0 1 0 12 0 6 6 0 1 0-12 0M69 24h24v15H69Z"/>', '0 0 100 44')
    sheet = image('assets/site-editorial-v4/media/process-practice-sheet.webp', 'Рабочий бланк концепции проекта')
    practice = ('<div class="process-story practice-demo" data-process-story="practice" role="img" aria-label="Практика: идея и план сцены переходят в настоящую съёмку света, себя и звука">'
        '<div class="graphic-top"><span class="graphic-dot"></span>Учусь на практике<span class="graphic-mark">↗</span></div>'
        '<div class="graphic-panel practice-idea" data-story-panel="0"><span class="graphic-eyebrow">Начни со своего замысла</span><div class="idea-note"><span>Идея для видео</span><strong>Один день.<br>Одна маленькая история.</strong><i></i></div><div class="practice-source">' + sheet + '<span>Рабочий бланк<br>концепции проекта</span></div></div>'
        '<div class="graphic-panel practice-plan" data-story-panel="1"><span class="graphic-eyebrow">Преврати идею в сцену</span><div class="scene-sketch">' + drawing + '</div><div class="shot-list"><div><span>01</span>Общий план' + check + '</div><div><span>02</span>Действие героя' + check + '</div><div><span>03</span>Крупная деталь' + check + '</div></div></div>'
        '<div class="graphic-panel practice-done" data-story-panel="2"><div class="practice-check">' + check + '</div><strong>Первый фрагмент готов</strong><span>Пробуй. Смотри. Улучшай.</span><div class="practice-steps"><span>Идея</span><i></i><span>Съёмка</span><i></i><span>Монтаж</span></div></div>'
        '<div class="graphic-panel practice-live" data-story-panel="3"><img src="/assets/site-editorial-v4/media/process-practice-v10.webp" alt="" loading="lazy" decoding="async">' + loop('process-practice-v10', '/assets/site-editorial-v4/media/process-practice-v10.webp', 'Практика: установка осветителя, съёмка и настройка звука', 'data-practice-demo-video') + '</div>'
        '<div class="graphic-progress"><i></i><i></i><i></i><i></i></div></div>')
    project = ('<div class="process-story project-demo" data-process-story="project" role="img" aria-label="Путь собственного проекта: папки со съёмками влогов, монтаж в DaVinci Resolve, публикация на YouTube">'
        '<div class="graphic-panel project-folders" data-story-panel="0"><span class="graphic-eyebrow">У каждой истории своё место</span><div class="vlog-folders">' + ''.join('<div>' + folder + '<strong>VLOG ' + n + '</strong><span>Видео · Звук · Музыка</span></div>' for n in ['01', '02', '03']) + '</div><div class="project-assets"><span>Съёмка</span><i></i><span>Отбор</span><i></i><span>История</span></div></div>'
        '<div class="graphic-panel project-edit" data-story-panel="1">' + image('assets/site-editorial-v4/media/process-project-v3.webp', 'Монтаж своего проекта в DaVinci Resolve') + loop('process-project-v3', '/assets/site-editorial-v4/media/process-project-v3.webp', 'Реальный монтаж в DaVinci Resolve', 'data-project-demo-video') + '</div>'
        '<div class="graphic-panel project-publish" data-story-panel="2"><div class="youtube-mark">' + play + '<span>YouTube</span></div><div class="publish-film">' + play + '<div><strong>Моя новая история</strong><span>Видео готово к публикации</span></div></div><div class="publish-progress"><i></i></div><div class="publish-status"><span>Подготовка видео</span><strong>' + check + 'Опубликовано</strong></div></div><div class="graphic-progress"><i></i><i></i><i></i></div></div>')
    return knowledge, practice, project
