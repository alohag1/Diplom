/**

 * Экран «Система оценок» — расшифровка шкалы 0–5 по каждому критерию.

 */



const GRADING = {

    rubric: null,

    activeId: "typography",

};



const SCORE_COLORS = {

    0: "#e74c3c",

    1: "#e67e22",

    2: "#f39c12",

    3: "#f1c40f",

    4: "#7bed9f",

    5: "#2ecc71",

};



function _t(key, vars) {

    return window.I18n ? window.I18n.t(key, vars) : key;

}



function _iconHtml(name) {

    const svg = window.Icons ? window.Icons.get(name) : "";

    return svg || "";

}



function _escapeHtml(text) {

    return String(text == null ? "" : text)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;");

}



function _scoreColor(score) {

    return SCORE_COLORS[score] || "#95a5a6";

}



function _currentLang() {

    return window.I18n && window.I18n.currentLang ? window.I18n.currentLang() : "ru";

}



function _localized(key, fallback) {

    const value = _t(key);

    return value && value !== key ? value : fallback;

}



function _criterionLabel(criterion) {

    const id = String((criterion && criterion.id) || "").toLowerCase();

    return _localized(`grading.criterion.${id}`, criterion.name || id);

}



function _levelTitle(level) {

    const score = level && level.score != null ? level.score : "";

    return _localized(`grading.levelTitle.${score}`, level.title || "");

}



function _levelDescription(criterionId, level) {

    const id = String(criterionId || "").toLowerCase();

    const score = level && level.score != null ? level.score : "";

    return _localized(`grading.desc.${id}.${score}`, level.description || "");

}



function _setupBackLink() {

    const back = document.getElementById("grading-back");

    if (!back) return;

    const params = new URLSearchParams(window.location.search);

    const returnUrl = params.get("back");

    if (returnUrl && returnUrl.startsWith("/")) {

        back.href = returnUrl;

    }

}



async function _loadRubric() {

    const lang = _currentLang();

    const isEn = lang.startsWith("en");

    const urls = isEn

        ? [

              `/api/grading-rubric?lang=en&_=${Date.now()}`,

              `/static/data/grading_rubric_en.json?_=${Date.now()}`,

          ]

        : [

              `/api/grading-rubric?lang=ru&_=${Date.now()}`,

              `/static/data/grading_rubric_ru.json?_=${Date.now()}`,

          ];

    for (const url of urls) {

        try {

            const res = await fetch(url);

            if (res.ok) return res.json();

        } catch (e) {

            /* try next source */

        }

    }

    throw new Error("rubric fetch failed");

}



function _renderSources() {

    const list = document.getElementById("grading-sources-list");

    if (!list || !GRADING.rubric) return;

    const sources = GRADING.rubric.sources || [];

    list.innerHTML = sources

        .map(

            (s) =>

                `<li class="grading-sources__item"><span class="grading-sources__tag">${_escapeHtml(s.short)}</span>${_escapeHtml(s.title)}</li>`,

        )

        .join("");

}



function _renderCriteriaTabs() {

    const wrap = document.getElementById("grading-criteria-tabs");

    if (!wrap || !GRADING.rubric) return;

    const criteria = GRADING.rubric.criteria || [];

    wrap.innerHTML = criteria

        .map((c) => {

            const active = c.id === GRADING.activeId ? " is-active" : "";

            const icon = _iconHtml(c.icon || "sparkles");

            return `<button type="button" class="grading-criteria-tabs__btn${active}" role="tab" aria-selected="${c.id === GRADING.activeId}" data-grading-criterion="${_escapeHtml(c.id)}">

                <span class="grading-criteria-tabs__icon">${icon}</span>

                <span>${_escapeHtml(_criterionLabel(c))}</span>

            </button>`;

        })

        .join("");



    wrap.querySelectorAll("[data-grading-criterion]").forEach((btn) => {

        btn.addEventListener("click", () => {

            GRADING.activeId = btn.getAttribute("data-grading-criterion");

            _renderCriteriaTabs();

            _renderPanel();

        });

    });

}



function _renderPanel() {
    const panel = document.getElementById("grading-panel");
    if (!panel || !GRADING.rubric) return;
    const criterion = (GRADING.rubric.criteria || []).find((c) => c.id === GRADING.activeId);
    if (!criterion) {
        panel.innerHTML = "";
        return;
    }

    const levels = criterion.levels || [];

    panel.innerHTML = `<div class="grading-scale">${levels
        .map((level) => {
            const color = _scoreColor(level.score);
            const icon = _iconHtml(criterion.icon || "sparkles");
            const title = _levelTitle(level);
            const description = _levelDescription(criterion.id, level);
            return `<article class="grading-scale__col">
                <div class="grading-scale__score" style="color:${color}">${level.score}</div>
                <h3 class="grading-scale__title" style="color:${color}">${_escapeHtml(title)}</h3>
                <p class="grading-scale__text">${_escapeHtml(description)}</p>
                <div class="grading-scale__badge" style="--badge-color:${color}" aria-hidden="true">${icon}</div>
            </article>`;
        })
        .join("")}</div>`;
}



function _renderIntro() {

    const intro = document.getElementById("grading-intro");

    if (!intro) return;

    intro.textContent = _localized("grading.intro", GRADING.rubric?.scale?.intro || _t("grading.introFallback"));

}



async function _init() {

    _setupBackLink();

    try {

        GRADING.rubric = await _loadRubric();

    } catch {

        GRADING.rubric = null;

        const panel = document.getElementById("grading-panel");

        if (panel) {

            panel.innerHTML = `<p class="grading-error">${_escapeHtml(_t("grading.loadError"))}</p>`;

        }

        return;

    }

    _renderIntro();

    _renderCriteriaTabs();

    _renderPanel();

    _renderSources();

}



document.addEventListener("DOMContentLoaded", () => {

    void _init();

});



document.addEventListener("i18n:change", () => {

    void _init();

});


