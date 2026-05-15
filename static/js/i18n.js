const I18N_KEY = "terem.lang";

const I18N = {
    ru: {
        "common.cancel": "Отмена",
        "common.save": "Сохранить",
        "common.signOut": "Выйти",
        "common.menu": "Меню",
        "common.ok": "Понятно",
        "common.info": "Сообщение",
        "common.close": "Закрыть",
        "common.showPassword": "Показать пароль",
        "common.email": "Email",
        "common.current": "Текущий",

        "pageTitle.home": "Терем ок? — Главная",
        "pageTitle.upload": "Терем ок? — Загрузка изображения",
        "pageTitle.catalog": "Терем ок? — Каталог",
        "pageTitle.analyze": "Терем ок? — Анализ",
        "pageTitle.reports": "Терем ок? — Отчёты",
        "pageTitle.profile": "Терем ок? — Профиль",
        "pageTitle.welcome": "Терем ок? — Анализ рекламных креативов",

        "dialog.delete": "Удалить",
        "dialog.deleteCatalogTitle": "Удалить из каталога?",
        "dialog.deleteReportTitle": "Удалить отчёт?",

        "upload.warningBanner": "Загружайте только графические материалы: рекламные креативы, баннеры, макеты. Документы, архивы и прочие файлы не подходят для анализа.",
        "upload.notImageTitle": "Неподходящий файл",
        "upload.notImageMessage": "Допустимы только изображения (например JPG, PNG, WebP). Сервис рассчитан на визуальные креативы и дизайн-макеты.",
        "upload.storageErrorTitle": "Недостаточно места",
        "upload.storageErrorMessage": "В локальном хранилище браузера закончилось место. Удалите часть изображений из каталога и попробуйте снова.",
        "upload.pageTitle": "Загрузить изображение",
        "upload.editTitle": "Редактирование изображения",
        "upload.saveChanges": "Сохранить изменения",
        "upload.dropzoneTitle": "Перетащите изображение сюда",
        "upload.dropzoneHint": "или выберите файл с устройства",
        "upload.pickFile": "Выбрать файл",
        "upload.submit": "Загрузить",
        "upload.previewColumnTitle": "Превью и информация",
        "upload.preview.placeholder": "Изображение появится здесь после выбора файла",
        "upload.preview.format": "Формат",
        "upload.preview.dimensions": "Размер",
        "upload.preview.weight": "Вес",
        "upload.preview.metaTitle": "Метаданные",
        "upload.preview.name": "Название",
        "upload.preview.author": "Автор",
        "upload.preview.tags": "Теги",
        "upload.preview.created": "Дата создания",
        "upload.preview.dash": "—",
        "upload.fields.title": "Название изображения",
        "upload.fields.author": "Автор / Источник",
        "upload.fields.tags": "Теги",
        "upload.fields.date": "Дата создания",
        "upload.fields.description": "Описание / Комментарий",
        "upload.placeholders.title": "Введите название",
        "upload.placeholders.author": "Введите автора",
        "upload.placeholders.tag": "Добавить тег",
        "upload.placeholders.description": "Добавьте описание",
        "upload.addTagAria": "Добавить тег",
        "upload.tagRemove": "Удалить тег",

        "pagination.pagesAria": "Перелистывание страниц",
        "pagination.pageOf": "{current} / {total}",
        "pagination.sliderAria": "Страница {current} из {total}",
        "filter.search.placeholder": "Поиск по названию, тегам, автору…",
        "filter.all": "Все",
        "filter.week": "За неделю",
        "filter.month": "За месяц",
        "filter.year": "За год",
        "filter.status.notAnalyzed": "Не анализировались",
        "filter.status.inProgress": "В процессе",
        "filter.status.analyzed": "Проанализированы",
        "filter.reset": "Сбросить фильтр",

        "catalog.title": "Коллекция каталога",
        "catalog.uploadMore": "Загрузить ещё",
        "catalog.empty.title": "В каталоге пока пусто",
        "catalog.empty.text": "Чтобы здесь появились ваши работы, перейдите на вкладку «Загрузка изображений» и добавьте первый креатив.",
        "catalog.empty.upload": "Загрузить изображение",
        "catalog.empty.home": "На главную",
        "catalog.filterEmpty.title": "По фильтрам ничего не нашлось",
        "catalog.filterEmpty.text": "Попробуйте изменить запрос или сбросить фильтры.",
        "catalog.card.analyze": "Проанализировать",
        "catalog.card.editAria": "Редактировать",
        "catalog.card.deleteAria": "Удалить",
        "catalog.confirmDelete": "Удалить эту запись?",

        "reports.title": "Коллекция отчётов",
        "reports.empty.title": "Отчётов пока нет",
        "reports.empty.text": "Чтобы здесь появились отчёты, сначала загрузите изображение в каталог и запустите анализ.",
        "reports.empty.catalog": "Перейти к каталогу",
        "reports.empty.upload": "Загрузить изображение",
        "reports.filterEmpty.title": "По фильтрам ничего не нашлось",
        "reports.filterEmpty.text": "Попробуйте изменить запрос или сбросить фильтры.",
        "reports.card.download": "Скачать",
        "reports.card.view": "Посмотреть",
        "reports.card.shareAria": "Поделиться",
        "reports.card.deleteAria": "Удалить",
        "reports.size": "Размер:",
        "reports.confirmDelete": "Удалить отчёт?",
        "reports.stub.view": "Просмотр отчёта в следующей итерации",
        "reports.viewer.score": "Оценка",
        "reports.stub.share": "Поделиться: ссылка скопирована (заглушка)",
        "reports.shareTitle": "Отчёт",
        "reports.format.dialogTitle": "Выберите формат файла",
        "reports.format.dialogText": "В каком формате сохранить отчёт?",
        "reports.format.current": "текущий",
        "reports.format.pdfDesc": "Документ для печати и презентаций",
        "reports.format.jsonDesc": "Структурированные данные для интеграций",
        "reports.format.txtDesc": "Простой текст без форматирования",

        "dialog.deleteAnalysisTitle": "Удалить этот запрос?",

        "analyze.tab.create": "Создать запрос",
        "analyze.tab.requests": "Мои запросы",
        "analyze.tab.results": "Результаты",
        "analyze.create.title": "Новый запрос на анализ",
        "analyze.create.emptyTitle": "Здесь пока нет анализа",
        "analyze.create.emptyText": "Чтобы получить анализ изображения, загрузите новое изображение или выберите его из каталога.",
        "analyze.create.uploadBtn": "Загрузить изображение",
        "analyze.create.catalogBtn": "Выбрать из каталога",
        "analyze.create.submit": "Создать запрос",
        "analyze.create.pickerTitle": "Каталог",
        "analyze.create.pickerEmpty": "В каталоге нет изображений — сначала загрузите креатив.",
        "analyze.create.asideIntro": "После создания запроса вы сможете запустить анализ и получить:",
        "analyze.create.bullet1": "Оценку рекламного креатива по 4 критериям",
        "analyze.create.bullet2": "Описание визуального стиля",
        "analyze.create.bullet3": "Рекомендации по улучшению",
        "analyze.create.bullet4": "Подробный отчёт в выбранном формате",
        "analyze.create.empty.bullet1": "Загрузите рекламный креатив с устройства",
        "analyze.create.empty.bullet2": "Или выберите уже загруженное изображение",
        "analyze.create.empty.bullet3": "Нажмите «Создать запрос» и дождитесь анализа",
        "analyze.create.howTitle": "Как работает анализ?",
        "analyze.create.howText": "Загрузите макет — ИИ оценит его по 4 параметрам: типографика, цвет, композиция и иерархия. На выходе вы получите оценки от 1 до 5, понятное описание и советы, что улучшить.",
        "analyze.requests.title": "Список моих запросов",
        "analyze.requests.colId": "ID",
        "analyze.requests.colPreview": "Превью",
        "analyze.requests.colDesc": "Описание",
        "analyze.requests.colDate": "Дата",
        "analyze.requests.colStatus": "Статус",
        "analyze.requests.colAction": "Действие",
        "analyze.requests.empty": "Запросов пока нет — создайте первый на вкладке «Создать запрос».",
        "analyze.status.all": "Все статусы",
        "analyze.status.processing": "Выполняется",
        "analyze.status.completed": "Завершён",
        "analyze.status.failed": "Ошибка",
        "analyze.filterDateAll": "Все даты",
        "analyze.results.title": "Результаты анализа",
        "analyze.results.sidebarTitle": "Завершённые анализы",
        "analyze.results.noCompleted": "Нет завершённых анализов",
        "analyze.results.pickPrompt": "Выберите завершённый анализ в списке слева",
        "analyze.results.tabCriteria": "Критерии оценивания",
        "analyze.results.tabDescription": "Описание",
        "analyze.results.tabRecommendations": "Рекомендации",
        "analyze.results.descTitle": "Описание рекламного креатива",
        "analyze.results.overallTitle": "Общая оценка креатива",
        "analyze.results.summaryTitle": "Краткое резюме",
        "analyze.results.issuesTitle": "Основные проблемы",
        "analyze.results.paletteTitle": "Цветовая палитра",
        "analyze.results.recTitle": "Рекомендации по улучшению",
        "analyze.results.saveReport": "Сохранить отчёт",
        "analyze.results.formatPdf": "PDF",
        "analyze.results.formatJson": "JSON",
        "analyze.results.formatTxt": "TXT",
        "analyze.results.formatSoon": "Экспорт в PDF будет доступен позже",
        "analyze.results.score": "{score} / 5",
        "analyze.results.prevAria": "Предыдущий анализ",
        "analyze.results.nextAria": "Следующий анализ",
        "analyze.processing": "Выполняется анализ на сервере…",
        "analyze.errorDemo": "Сервер анализа недоступен. Показаны демонстрационные данные.",

        "welcome.title": "Добро пожаловать в Терем ок?",
        "welcome.cta": "Начать",

        "auth.loginTitle": "Вход в систему",
        "auth.loginSubtitle": "Войдите для доступа к анализу рекламных креативов",
        "auth.loginSubmit": "Войти",
        "auth.loginForgot": "Забыли пароль?",
        "auth.passwordLabel": "Пароль",
        "auth.loginNoAccount": "Нет аккаунта?",
        "auth.loginRegister": "Зарегистрируйтесь",
        "auth.placeholderEmail": "Введите Email",
        "auth.placeholderPassword": "Введите пароль",
        "auth.registerTitle": "Регистрация",
        "auth.registerSubmit": "Зарегистрироваться",
        "auth.registerName": "Имя пользователя",
        "auth.registerNamePh": "Введите ваше имя",
        "auth.registerConfirm": "Подтвердите пароль",
        "auth.registerHasAccount": "Уже есть аккаунт?",
        "auth.registerLogin": "Войдите",
        "auth.recoverTitle": "Восстановление пароля",
        "auth.recoverSubtitle": "Введите свой адрес электронной почты, и мы отправим вам ссылку для сброса пароля",
        "auth.recoverSubmit": "Отправить ссылку",
        "auth.recoverBack": "Вернуться к",
        "auth.recoverLogin": "Входу",

        "home.slider.1": "Слайд 1",
        "home.slider.2": "Слайд 2",
        "home.slider.3": "Слайд 3",

        "pagination.prev": "Назад",
        "pagination.next": "Вперёд",
        "profile.recent.page": "Страница {n}",

        "nav.upload": "Загрузка изображений",
        "nav.catalog": "Каталог",
        "nav.analyze": "Анализ",
        "nav.reports": "Отчёты",
        "nav.profile": "Профиль",

        "home.title": "Анализируй рекламные креативы и улучшай их визуальную привлекательность",
        "home.lead": "Загружай макеты и получай метрики, инсайты и отчёты о визуальном стиле",
        "home.upload": "Загрузить изображение",
        "home.catalog": "Каталог",

        "profile.tabs.overview": "Обзор",
        "profile.tabs.subscription": "Подписка",
        "profile.tabs.settings": "Настройки",
        "profile.activity": "Ваша активность",
        "profile.totalAnalyses": "Всего анализов",
        "profile.avgScore": "Средняя оценка",
        "profile.noWeek": "Пока нет анализов за неделю",
        "profile.noData": "Нет данных",
        "profile.trend.up": "+{n} за неделю",
        "profile.score.veryGood": "Превосходный результат",
        "profile.score.good": "Отличный результат",
        "profile.score.ok": "Хороший результат",
        "profile.score.low": "Есть куда расти",

        "profile.recent.title": "Последние анализы",
        "profile.recent.seeAll": "Смотреть все",
        "profile.recent.empty": "Пока нет проведённых анализов. Загрузите креатив и запустите анализ из каталога.",

        "profile.plan.title": "Ваш тарифный план",
        "profile.plan.free": "Бесплатный",
        "profile.plan.freeSub": "Для знакомства с сервисом",
        "profile.plan.f1": "До 5 загрузок в месяц",
        "profile.plan.f2": "Базовый анализ дизайна",
        "profile.plan.f3": "Просмотр каталога",
        "profile.plan.cta": "Подробнее о тарифах",

        "profile.actions": "Быстрые действия",
        "profile.actions.new": "Новый анализ",
        "profile.actions.newSub": "Загрузить креатив для анализа",
        "profile.actions.reports": "Мои отчёты",
        "profile.actions.reportsSub": "Перейти к сохранённым результатам",
        "profile.footnote": "Ваши данные защищены и не передаются третьим лицам",

        "subs.title": "Выберите тарифный план",
        "subs.free": "Бесплатный",
        "subs.free.sub": "Познакомьтесь с сервисом",
        "subs.basic": "Базовый",
        "subs.basic.sub": "Оптимально для регулярной работы",
        "subs.pro": "Профессиональный",
        "subs.pro.sub": "Максимальные возможности для оценивания",
        "subs.current": "Активный план",
        "subs.choose": "Перейди на этот план",
        "subs.permonth": "в мес",

        "subs.free.f1": "До 5 загрузок в месяц",
        "subs.free.f2": "Оценивание по всем критериям",
        "subs.free.f3": "Ограниченный список запросов",
        "subs.free.f4": "Ограниченное кол-во одновременных анализов",

        "subs.basic.f1": "До 20 загрузок в месяц",
        "subs.basic.f2": "Оценивание по всем критериям",
        "subs.basic.f3": "Возможность видеть описание",
        "subs.basic.f4": "Неограниченный список запросов",
        "subs.basic.f5": "Экспорт результатов в PDF",
        "subs.basic.f6": "Неограниченное кол-во одновременных анализов",

        "subs.pro.f1": "Неограниченное кол-во загрузок",
        "subs.pro.f2": "Оценивание по всем критериям",
        "subs.pro.f3": "Возможность видеть описание",
        "subs.pro.f4": "Возможность видеть рекомендации",
        "subs.pro.f5": "Неограниченный список запросов",
        "subs.pro.f6": "Экспорт результатов в PDF, JSON, TXT",
        "subs.pro.f7": "Неограниченное кол-во одновременных анализов",

        "settings.profile.title": "Профиль",
        "settings.profile.sub": "Управление вашей личной информацией",
        "settings.profile.name": "Имя",
        "settings.profile.email": "Email",
        "settings.profile.regDate": "Дата регистрации",
        "settings.profile.save": "Сохранить изменения",
        "settings.profile.saved": "Сохранено",

        "settings.notif.title": "Уведомления",
        "settings.notif.sub": "Настройте, какие уведомления вы хотите получать",
        "settings.notif.email": "Email уведомления о новых анализах",
        "settings.notif.emailSub": "Получать письма о завершении анализов",
        "settings.notif.updates": "Уведомления об обновлениях",
        "settings.notif.updatesSub": "Информация о новых функциях и улучшениях",

        "settings.security.title": "Безопасность",
        "settings.security.sub": "Обеспечение безопасности вашего аккаунта",
        "settings.security.changePassword": "Изменить пароль",
        "settings.security.changePasswordSub": "Рекомендуется обновлять пароль каждые 3–6 месяцев",
        "settings.security.current": "Текущий пароль",
        "settings.security.new": "Новый пароль",
        "settings.security.confirm": "Повторите новый пароль",
        "settings.security.save": "Сохранить пароль",
        "settings.security.errMin": "Пароль должен содержать минимум 6 символов",
        "settings.security.errMatch": "Пароли не совпадают",
        "settings.security.ok": "Пароль обновлён",

        "settings.locale.title": "Язык и регион",
        "settings.locale.sub": "Выберите язык интерфейса",
        "settings.locale.uiLang": "Язык интерфейса",

        "settings.side.profile": "Профиль",
        "settings.side.notifications": "Уведомления",
        "settings.side.security": "Безопасность",
        "settings.side.locale": "Язык и регион",
        "settings.help.title": "Нужна помощь?",
        "settings.help.text": "Свяжитесь с нашей поддержкой, мы всегда рады помочь.",
        "settings.help.cta": "Написать в поддержку",
        "settings.title": "Настройки",
    },
    en: {
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.signOut": "Sign out",
        "common.menu": "Menu",
        "common.ok": "OK",
        "common.info": "Notice",
        "common.close": "Close",
        "common.showPassword": "Show password",
        "common.email": "Email",
        "common.current": "Current",

        "dialog.delete": "Delete",
        "dialog.deleteCatalogTitle": "Remove from catalog?",
        "dialog.deleteReportTitle": "Delete report?",

        "pageTitle.home": "Terem ok? — Home",
        "pageTitle.upload": "Terem ok? — Upload image",
        "pageTitle.catalog": "Terem ok? — Catalog",
        "pageTitle.analyze": "Terem ok? — Analysis",
        "pageTitle.reports": "Terem ok? — Reports",
        "pageTitle.profile": "Terem ok? — Profile",
        "pageTitle.welcome": "Terem ok? — Ad creative analysis",

        "upload.warningBanner": "Upload graphic materials only: ad creatives, banners, layouts. Documents, archives, and other files are not suitable for analysis.",
        "upload.storageErrorTitle": "Storage is full",
        "upload.storageErrorMessage": "Your browser's local storage is full. Delete some items from the catalog and try again.",
        "upload.notImageTitle": "Unsupported file",
        "upload.notImageMessage": "Only image files are allowed (e.g. JPG, PNG, WebP). This service is for visual creatives and design layouts.",
        "upload.pageTitle": "Upload image",
        "upload.editTitle": "Edit image",
        "upload.saveChanges": "Save changes",
        "upload.dropzoneTitle": "Drag an image here",
        "upload.dropzoneHint": "or choose a file from your device",
        "upload.pickFile": "Choose file",
        "upload.submit": "Upload",
        "upload.previewColumnTitle": "Preview and details",
        "upload.preview.placeholder": "The image will appear here after you choose a file",
        "upload.preview.format": "Format",
        "upload.preview.dimensions": "Dimensions",
        "upload.preview.weight": "File size",
        "upload.preview.metaTitle": "Metadata",
        "upload.preview.name": "Title",
        "upload.preview.author": "Author",
        "upload.preview.tags": "Tags",
        "upload.preview.created": "Created on",
        "upload.preview.dash": "—",
        "upload.fields.title": "Image title",
        "upload.fields.author": "Author / Source",
        "upload.fields.tags": "Tags",
        "upload.fields.date": "Creation date",
        "upload.fields.description": "Description / Comment",
        "upload.placeholders.title": "Enter a title",
        "upload.placeholders.author": "Enter author",
        "upload.placeholders.tag": "Add a tag",
        "upload.placeholders.description": "Add a description",
        "upload.addTagAria": "Add tag",
        "upload.tagRemove": "Remove tag",

        "pagination.pagesAria": "Pagination",
        "pagination.pageOf": "{current} / {total}",
        "pagination.sliderAria": "Page {current} of {total}",

        "filter.search.placeholder": "Search by title, tags, author…",
        "filter.all": "All",
        "filter.week": "Last week",
        "filter.month": "Last month",
        "filter.year": "Last year",
        "filter.status.notAnalyzed": "Not analyzed",
        "filter.status.inProgress": "In progress",
        "filter.status.analyzed": "Analyzed",
        "filter.reset": "Reset filters",

        "catalog.title": "Catalog collection",
        "catalog.uploadMore": "Upload more",
        "catalog.empty.title": "Your catalog is empty",
        "catalog.empty.text": "To add work here, go to Upload images and add your first creative.",
        "catalog.empty.upload": "Upload image",
        "catalog.empty.home": "Home",
        "catalog.filterEmpty.title": "Nothing matched your filters",
        "catalog.filterEmpty.text": "Try changing the query or reset filters.",
        "catalog.card.analyze": "Analyze",
        "catalog.card.editAria": "Edit",
        "catalog.card.deleteAria": "Delete",
        "catalog.confirmDelete": "Delete this item?",

        "reports.title": "Reports collection",
        "reports.empty.title": "No reports yet",
        "reports.empty.text": "Upload an image to the catalog and run an analysis to see reports here.",
        "reports.empty.catalog": "Go to catalog",
        "reports.empty.upload": "Upload image",
        "reports.filterEmpty.title": "Nothing matched your filters",
        "reports.filterEmpty.text": "Try changing the query or reset filters.",
        "reports.card.download": "Download",
        "reports.card.view": "View",
        "reports.card.shareAria": "Share",
        "reports.card.deleteAria": "Delete",
        "reports.size": "Size:",
        "reports.confirmDelete": "Delete this report?",
        "reports.stub.view": "Report preview will be available in a future update",
        "reports.stub.share": "Share: link copied (placeholder)",
        "reports.shareTitle": "Report",
        "reports.viewer.score": "Score",
        "reports.format.dialogTitle": "Choose file format",
        "reports.format.dialogText": "In which format should the report be saved?",
        "reports.format.current": "current",
        "reports.format.pdfDesc": "Printable document for presentations",
        "reports.format.jsonDesc": "Structured data for integrations",
        "reports.format.txtDesc": "Plain text without formatting",

        "dialog.deleteAnalysisTitle": "Delete this request?",

        "analyze.tab.create": "Create request",
        "analyze.tab.requests": "My requests",
        "analyze.tab.results": "Results",
        "analyze.create.title": "New analysis request",
        "analyze.create.emptyTitle": "No analysis yet",
        "analyze.create.emptyText": "To analyze an image, upload a new one or pick one from your catalog.",
        "analyze.create.uploadBtn": "Upload image",
        "analyze.create.catalogBtn": "Choose from catalog",
        "analyze.create.submit": "Create request",
        "analyze.create.pickerTitle": "Catalog",
        "analyze.create.pickerEmpty": "Your catalog is empty — upload a creative first.",
        "analyze.create.asideIntro": "After you create a request, you can run analysis and get:",
        "analyze.create.bullet1": "Creative evaluation across 4 criteria",
        "analyze.create.bullet2": "A description of the visual style",
        "analyze.create.bullet3": "Improvement recommendations",
        "analyze.create.bullet4": "A detailed report in the selected format",
        "analyze.create.empty.bullet1": "Upload an ad creative from your device",
        "analyze.create.empty.bullet2": "Or pick an already uploaded image",
        "analyze.create.empty.bullet3": "Click “Create request” and wait for the analysis",
        "analyze.create.howTitle": "How does analysis work?",
        "analyze.create.howText": "Upload your creative — AI rates it on 4 parameters: typography, color, composition, and hierarchy. You get scores from 1 to 5, a clear description, and suggestions on what to improve.",
        "analyze.requests.title": "My requests",
        "analyze.requests.colId": "ID",
        "analyze.requests.colPreview": "Preview",
        "analyze.requests.colDesc": "Description",
        "analyze.requests.colDate": "Date",
        "analyze.requests.colStatus": "Status",
        "analyze.requests.colAction": "Action",
        "analyze.requests.empty": "No requests yet — create one under “Create request”.",
        "analyze.status.all": "All statuses",
        "analyze.status.processing": "In progress",
        "analyze.status.completed": "Completed",
        "analyze.status.failed": "Failed",
        "analyze.filterDateAll": "All dates",
        "analyze.results.title": "Analysis results",
        "analyze.results.sidebarTitle": "Completed analyses",
        "analyze.results.noCompleted": "No completed analyses yet",
        "analyze.results.pickPrompt": "Select a completed analysis from the list on the left",
        "analyze.results.tabCriteria": "Evaluation criteria",
        "analyze.results.tabDescription": "Description",
        "analyze.results.tabRecommendations": "Recommendations",
        "analyze.results.descTitle": "Creative description",
        "analyze.results.overallTitle": "Overall creative score",
        "analyze.results.summaryTitle": "Short summary",
        "analyze.results.issuesTitle": "Main issues",
        "analyze.results.paletteTitle": "Color palette",
        "analyze.results.recTitle": "Improvement recommendations",
        "analyze.results.saveReport": "Save report",
        "analyze.results.formatPdf": "PDF",
        "analyze.results.formatJson": "JSON",
        "analyze.results.formatTxt": "TXT",
        "analyze.results.formatSoon": "PDF export will be available later",
        "analyze.results.score": "{score} / 5",
        "analyze.results.prevAria": "Previous analysis",
        "analyze.results.nextAria": "Next analysis",
        "analyze.processing": "Running server-side analysis…",
        "analyze.errorDemo": "Analysis server unavailable. Showing demo data.",

        "welcome.title": "Welcome to Terem ok?",
        "welcome.cta": "Get started",

        "auth.loginTitle": "Sign in",
        "auth.loginSubtitle": "Sign in to analyze ad creatives",
        "auth.loginSubmit": "Sign in",
        "auth.loginForgot": "Forgot password?",
        "auth.passwordLabel": "Password",
        "auth.loginNoAccount": "No account?",
        "auth.loginRegister": "Register",
        "auth.placeholderEmail": "Enter email",
        "auth.placeholderPassword": "Enter password",
        "auth.registerTitle": "Registration",
        "auth.registerSubmit": "Register",
        "auth.registerName": "Username",
        "auth.registerNamePh": "Enter your name",
        "auth.registerConfirm": "Confirm password",
        "auth.registerHasAccount": "Already have an account?",
        "auth.registerLogin": "Sign in",
        "auth.recoverTitle": "Password recovery",
        "auth.recoverSubtitle": "Enter your email and we will send a reset link",
        "auth.recoverSubmit": "Send link",
        "auth.recoverBack": "Back to",
        "auth.recoverLogin": "Sign in",

        "home.slider.1": "Slide 1",
        "home.slider.2": "Slide 2",
        "home.slider.3": "Slide 3",

        "pagination.prev": "Back",
        "pagination.next": "Next",
        "profile.recent.page": "Page {n}",

        "nav.upload": "Upload images",
        "nav.catalog": "Catalog",
        "nav.analyze": "Analysis",
        "nav.reports": "Reports",
        "nav.profile": "Profile",

        "home.title": "Analyze ad creatives and improve their visual appeal",
        "home.lead": "Upload designs and get metrics, insights and reports on visual style",
        "home.upload": "Upload image",
        "home.catalog": "Catalog",

        "profile.tabs.overview": "Overview",
        "profile.tabs.subscription": "Subscription",
        "profile.tabs.settings": "Settings",
        "profile.activity": "Your activity",
        "profile.totalAnalyses": "Total analyses",
        "profile.avgScore": "Average score",
        "profile.noWeek": "No analyses this week yet",
        "profile.noData": "No data",
        "profile.trend.up": "+{n} this week",
        "profile.score.veryGood": "Excellent result",
        "profile.score.good": "Great result",
        "profile.score.ok": "Good result",
        "profile.score.low": "Room to grow",

        "profile.recent.title": "Latest analyses",
        "profile.recent.seeAll": "See all",
        "profile.recent.empty": "No analyses yet. Upload a creative and start an analysis from the catalog.",

        "profile.plan.title": "Your plan",
        "profile.plan.free": "Free",
        "profile.plan.freeSub": "To get to know the service",
        "profile.plan.f1": "Up to 5 uploads per month",
        "profile.plan.f2": "Basic design analysis",
        "profile.plan.f3": "Catalog view",
        "profile.plan.cta": "More about plans",

        "profile.actions": "Quick actions",
        "profile.actions.new": "New analysis",
        "profile.actions.newSub": "Upload a creative to analyze",
        "profile.actions.reports": "My reports",
        "profile.actions.reportsSub": "Go to saved results",
        "profile.footnote": "Your data is protected and never shared with third parties",

        "subs.title": "Choose a plan",
        "subs.free": "Free",
        "subs.free.sub": "Get to know the service",
        "subs.basic": "Basic",
        "subs.basic.sub": "Optimal for regular work",
        "subs.pro": "Professional",
        "subs.pro.sub": "Maximum evaluation capabilities",
        "subs.current": "Current plan",
        "subs.choose": "Switch to this plan",
        "subs.permonth": "per month",

        "subs.free.f1": "Up to 5 uploads per month",
        "subs.free.f2": "Scoring across all criteria",
        "subs.free.f3": "Limited request list",
        "subs.free.f4": "Limited concurrent analyses",

        "subs.basic.f1": "Up to 20 uploads per month",
        "subs.basic.f2": "Scoring across all criteria",
        "subs.basic.f3": "See descriptions",
        "subs.basic.f4": "Unlimited request list",
        "subs.basic.f5": "Export results to PDF",
        "subs.basic.f6": "Unlimited concurrent analyses",

        "subs.pro.f1": "Unlimited uploads",
        "subs.pro.f2": "Scoring across all criteria",
        "subs.pro.f3": "See descriptions",
        "subs.pro.f4": "See recommendations",
        "subs.pro.f5": "Unlimited request list",
        "subs.pro.f6": "Export results to PDF, JSON, TXT",
        "subs.pro.f7": "Unlimited concurrent analyses",

        "settings.profile.title": "Profile",
        "settings.profile.sub": "Manage your personal information",
        "settings.profile.name": "Name",
        "settings.profile.email": "Email",
        "settings.profile.regDate": "Registration date",
        "settings.profile.save": "Save changes",
        "settings.profile.saved": "Saved",

        "settings.notif.title": "Notifications",
        "settings.notif.sub": "Choose which notifications you want to receive",
        "settings.notif.email": "Email notifications about new analyses",
        "settings.notif.emailSub": "Receive emails when analyses are completed",
        "settings.notif.updates": "Update notifications",
        "settings.notif.updatesSub": "Information about new features and improvements",

        "settings.security.title": "Security",
        "settings.security.sub": "Keep your account secure",
        "settings.security.changePassword": "Change password",
        "settings.security.changePasswordSub": "We recommend updating the password every 3–6 months",
        "settings.security.current": "Current password",
        "settings.security.new": "New password",
        "settings.security.confirm": "Repeat the new password",
        "settings.security.save": "Save password",
        "settings.security.errMin": "Password must be at least 6 characters",
        "settings.security.errMatch": "Passwords do not match",
        "settings.security.ok": "Password updated",

        "settings.locale.title": "Language and region",
        "settings.locale.sub": "Choose interface language",
        "settings.locale.uiLang": "Interface language",

        "settings.side.profile": "Profile",
        "settings.side.notifications": "Notifications",
        "settings.side.security": "Security",
        "settings.side.locale": "Language and region",
        "settings.help.title": "Need help?",
        "settings.help.text": "Contact our support, we're always glad to help.",
        "settings.help.cta": "Contact support",
        "settings.title": "Settings",
    },
};

function _currentLang() {
    try {
        return localStorage.getItem(I18N_KEY) || "ru";
    } catch (e) {
        return "ru";
    }
}

function _saveLang(lang) {
    try {
        localStorage.setItem(I18N_KEY, lang);
    } catch (e) {}
}

function t(key, vars) {
    const lang = _currentLang();
    const dict = I18N[lang] || I18N.ru;
    let value = dict[key];
    if (value === undefined) value = I18N.ru[key] !== undefined ? I18N.ru[key] : key;
    if (vars && typeof value === "string") {
        Object.keys(vars).forEach((k) => {
            value = value.replace("{" + k + "}", String(vars[k]));
        });
    }
    return value;
}

function _syncDropdownLabels() {
    document.querySelectorAll(".dropdown").forEach((dd) => {
        const label = dd.querySelector(".dropdown__label");
        const active = dd.querySelector(".dropdown__option.is-active");
        if (label && active) label.textContent = active.textContent.trim();
    });
}

function _translateNav() {
    document.querySelectorAll(".header__nav-link").forEach((link) => {
        const href = link.getAttribute("href") || "";
        const map = {
            "/upload": "nav.upload",
            "/catalog": "nav.catalog",
            "/analyze": "nav.analyze",
            "/reports": "nav.reports",
            "/profile": "nav.profile",
        };
        if (map[href]) link.textContent = t(map[href]);
    });
}

function applyI18n(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        const value = t(key);
        if (value) el.textContent = value;
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key) el.placeholder = t(key);
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        if (key) el.title = t(key);
    });
    scope.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
        const key = el.getAttribute("data-i18n-aria-label");
        if (key) el.setAttribute("aria-label", t(key));
    });
    const pageTitleKey = document.body && document.body.getAttribute("data-i18n-page-title");
    if (pageTitleKey) {
        const titleText = t(pageTitleKey);
        if (titleText) document.title = titleText;
    }
    _translateNav();
    _syncDropdownLabels();
}

function setLanguage(lang) {
    if (!I18N[lang]) lang = "ru";
    _saveLang(lang);
    document.documentElement.setAttribute("lang", lang);
    applyI18n();
    document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang } }));
}

document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.setAttribute("lang", _currentLang());
    applyI18n();
});

window.I18n = { t, applyI18n, setLanguage, currentLang: _currentLang };
