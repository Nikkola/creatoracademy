"""Quiet illustrations of the actual take-home resources, with complete originals."""

def material_graphics(image):
    def svg(body, view='0 0 360 160'):
        return '<svg viewBox="'+view+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>'

    person='<circle cx="180" cy="53" r="15"/><path d="M146 111v-13a34 34 0 0 1 68 0v13"/>'
    storyboards=svg('<g class="material-draw"><rect x="8" y="20" width="100" height="92" rx="6"/><path d="M17 103h80M27 103V46h28v57M32 53h16v19H32Z"/><circle cx="78" cy="67" r="8"/><path d="m66 103 12-27 13 27"/><rect x="130" y="20" width="100" height="92" rx="6"/>'+person+'<rect x="252" y="20" width="100" height="92" rx="6"/><circle cx="302" cy="66" r="24"/><circle cx="302" cy="66" r="13"/></g><g class="material-svg-label" stroke="none" fill="currentColor"><text x="58" y="140" text-anchor="middle">Общий план</text><text x="180" y="140" text-anchor="middle">Герой</text><text x="302" y="140" text-anchor="middle">Деталь</text></g>')
    curve=svg('<path d="M16 134h328M16 134V14" stroke-opacity=".25"/><path class="material-draw" d="M26 120C65 120 65 100 102 100S153 125 180 72S235 83 265 28S302 88 336 102"/><g fill="currentColor" stroke="none"><circle cx="26" cy="120" r="4"/><circle cx="180" cy="72" r="4"/><circle cx="265" cy="28" r="4"/><circle cx="336" cy="102" r="4"/></g>')
    lighting=svg('<rect x="15" y="29" width="12" height="88" rx="3" fill="currentColor" fill-opacity=".2"/><path class="material-light-beam" d="M28 36 174 70 28 112Z" fill="currentColor" fill-opacity=".12" stroke="none"/><circle cx="180" cy="80" r="18"/><path d="m175 75 5-5 5 5M175 85h10"/><rect x="270" y="64" width="42" height="32" rx="5"/><path d="m270 72-14-8v32l14-8M203 80h39" stroke-dasharray="4 5"/><path d="M214 118 237 141M239 108l17 17"/><g class="material-svg-label" stroke="none" fill="currentColor"><text x="13" y="144">Окно</text><text x="180" y="43" text-anchor="middle">Герой</text><text x="290" y="119" text-anchor="middle">Камера</text></g>')
    portrait=svg('<path d="M90 142V48a20 20 0 0 1 20-20h140a20 20 0 0 1 20 20v94" stroke-opacity=".3"/><path d="M118 142v-20a62 62 0 0 1 124 0v20"/>'+person+'<path class="material-light-beam" d="m30 18 116 21-27 98Z" fill="currentColor" fill-opacity=".14" stroke="none"/><path d="M164 57h4m24 0h4m-23 24q7 5 14 0"/>')
    check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
    def rows(labels):
        return '<div class="material-checklist">'+''.join('<div style="--row:'+str(i)+'"><i>'+check+'</i><span>'+label+'</span></div>' for i,label in enumerate(labels))+'</div>'
    def chips(labels):
        return '<div class="material-chips">'+''.join('<span style="--row:'+str(i)+'">'+label+'</span>' for i,label in enumerate(labels))+'</div>'
    chats='<div class="material-messages"><div><small>Участник</small><span>Покажу первый монтаж?</span></div><div><small>Николай</small><span>Конечно. Посмотрим вместе.</span></div><span class="material-example">Пример общения в чате</span></div>'
    authors='<div class="material-authors">'+''.join('<span style="--row:'+str(i)+'">'+x+'</span>' for i,x in enumerate(['Н','А','М','К','Д']))+'</div>'
    landscape=svg('<rect x="32" y="12" width="296" height="132" rx="6"/><circle cx="274" cy="47" r="13"/><path d="m44 132 80-73 55 44 43-27 94 56"/><path d="M58 34h75M58 45h48" stroke-opacity=".4"/>')
    scenes=[
        ('storyboard','Шаблоны раскадровки','Продумай кадры до съёмки',storyboards,'Собери последовательность',chips(['01 · Место','02 · Действие','03 · Деталь']),'assets/site-editorial-v4/materials/shot-plan-v2.svg'),
        ('arc','Структуры сторителлинга','Найди движение истории',curve,'Задай истории направление',chips(['Герой','Цель','Препятствие']),'how-v2-material-story-arc.webp'),
        ('checklist','Памятки и шпаргалки','Перед тем, как нажать Rec',rows(['Экспозиция','Фокус','Баланс белого']),'На каждом этапе работы',rows(['Монтаж','Цвет','Звук']),'how-v2-material-exposure.webp'),
        ('thumbnail','Формулы заголовков и обложек','Найди точную формулировку','<div class="material-title-note"><small>Заголовок видео</small><strong>Прогулка<br>за городом</strong><i></i></div>','Соедини кадр и заголовок','<div class="material-thumbnail">'+landscape+'<strong>За городом</strong></div>','how-v2-material-thumbnail.webp'),
        ('lighting','Схемы освещения','Поставь свет осознанно',lighting,'От схемы к объёму в кадре',portrait,'assets/site-editorial-v4/materials/lighting-notes-v2.svg'),
        ('community','Сообщество авторов','Показывай свои работы',chats,'Оставайся среди авторов',authors+'<strong class="material-community-title">Общение и поддержка</strong>','how-v2-process-chat.webp'),
    ]
    result=[]
    for key,label,title,first,secondtitle,second,filename in scenes:
        original_path=filename if filename.startswith('assets/') else 'assets/site-audit-v3/images/'+filename
        original_label=label+(' — иллюстрация рабочего шаблона' if filename.startswith('assets/') else ' — настоящий материал курса')
        result.append('<div class="process-story material-story material-type-'+key+'" data-process-story="material-'+key+'" data-story-phase="2" role="img" aria-label="'+label+': пример работы с материалами курса">'
            '<div class="graphic-top"><span class="graphic-dot"></span>'+label+'</div>'
            '<div class="graphic-panel material-illustration" data-story-panel="0"><span class="graphic-eyebrow">'+title+'</span>'+first+'</div>'
            '<div class="graphic-panel material-illustration" data-story-panel="1"><span class="graphic-eyebrow">'+secondtitle+'</span>'+second+'</div>'
            '<div class="graphic-panel material-original" data-story-panel="2">'+image(original_path,original_label).replace('loading="lazy"','loading="eager"')+'</div>'
            '<div class="graphic-progress"><i></i><i></i><i></i></div></div>')
    return result
