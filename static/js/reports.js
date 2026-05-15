const REP_STATE = {
    query: "",
    date: "all",
    format: "all",
    page: 1,
    pageSize: 8,
};

function _t(key, vars) {
    return window.I18n ? window.I18n.t(key, vars) : key;
}

function _$(id) {
    return document.getElementById(id);
}

function _itemTimestamp(item) {
    if (item && typeof item.date === "string") {
        const m = item.date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (m) {
            const t = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`).getTime();
            if (!Number.isNaN(t)) return t;
        }
    }
    if (item && item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!Number.isNaN(t)) return t;
    }
    return Date.now();
}

function _filter(items) {
    const query = REP_STATE.query.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 86_400_000;
    const dateMap = { week: 7 * dayMs, month: 31 * dayMs, year: 365 * dayMs };

    return items.filter((item) => {
        if (query) {
            const haystack = [item.title, item.author, item.description]
                .filter(Boolean).join(" ").toLowerCase();
            if (!haystack.includes(query)) return false;
        }

        if (REP_STATE.date !== "all") {
            const ts = _itemTimestamp(item);
            const limit = dateMap[REP_STATE.date];
            if (limit != null && now - ts > limit) return false;
        }

        if (REP_STATE.format !== "all" && item.format !== REP_STATE.format) {
            return false;
        }

        return true;
    });
}

function _renderCard(item) {
    return `
        <article class="card card--report" data-id="${item.id}">
            <div class="card__media">
                <img src="${item.image}" alt="${item.title}">
            </div>
            <div class="card__body">
                <div class="card__head">
                    <h3 class="card__title">${item.title}</h3>
                    <span class="card__date">${item.date}</span>
                </div>
                <div class="card__tags"><span class="tag tag--type">${item.format || "PDF"}</span></div>
                <div class="report-meta">
                    <span class="card__author">${_t("reports.size")} ${Store.formatBytes(item.size)}</span>
                </div>
                <div class="card__actions">
                    <button class="btn btn--primary" type="button" data-action="download">${_t("reports.card.download")}</button>
                    <button class="btn btn--ghost" type="button" data-action="view">${_t("reports.card.view")}</button>
                    <button class="btn-icon" type="button" data-action="share" aria-label="${_t("reports.card.shareAria")}" data-icon="share"></button>
                    <button class="btn-icon btn-icon--danger" type="button" data-action="delete" aria-label="${_t("reports.card.deleteAria")}" data-icon="trash"></button>
                </div>
            </div>
        </article>
    `;
}

function _togglePagerBar(show) {
    const bar = document.getElementById("filter-bar-pager");
    if (bar) bar.classList.toggle("is-hidden", !show);
}

function _renderPagination(total) {
    const wrap = _$("pagination");
    if (!wrap) return;
    const pages = Math.max(1, Math.ceil(total / REP_STATE.pageSize));
    wrap.setAttribute("aria-label", _t("pagination.pagesAria"));
    if (total === 0 || pages <= 1) {
        wrap.innerHTML = "";
        _togglePagerBar(false);
        return;
    }

    _togglePagerBar(true);
    const cur = REP_STATE.page;
    const valLabel = _t("pagination.pageOf", { current: cur, total: pages });

    wrap.innerHTML = `
        <button type="button" class="pagination__edge" data-page="prev" ${cur <= 1 ? "disabled" : ""}>${_t("pagination.prev")}</button>
        <div class="pagination__pages">
            <input type="range" class="pagination__slider" id="rep-page-slider" min="1" max="${pages}" step="1" value="${cur}">
            <div class="pagination__slider-val" id="rep-page-slider-val">${valLabel}</div>
        </div>
        <button type="button" class="pagination__edge" data-page="next" ${cur >= pages ? "disabled" : ""}>${_t("pagination.next")}</button>`;

    const slider = wrap.querySelector("#rep-page-slider");
    const valEl = wrap.querySelector("#rep-page-slider-val");

    function _syncSliderUi(p) {
        const safe = Math.min(Math.max(1, p), pages);
        const v = _t("pagination.pageOf", { current: safe, total: pages });
        const a = _t("pagination.sliderAria", { current: safe, total: pages });
        if (valEl) valEl.textContent = v;
        if (slider) {
            slider.value = String(safe);
            slider.setAttribute("aria-label", a);
            slider.setAttribute("aria-valuemin", "1");
            slider.setAttribute("aria-valuemax", String(pages));
            slider.setAttribute("aria-valuenow", String(safe));
            slider.setAttribute("aria-valuetext", a);
        }
    }

    if (slider) {
        slider.addEventListener("input", () => {
            _syncSliderUi(Number(slider.value));
        });
        slider.addEventListener("change", () => {
            REP_STATE.page = Number(slider.value);
            _render();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.page;
            if (target === "prev") REP_STATE.page = Math.max(1, REP_STATE.page - 1);
            else if (target === "next") REP_STATE.page = Math.min(pages, REP_STATE.page + 1);
            _render();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });
}

function _render() {
    const all = Store.getReports();
    const empty = _$("content-empty");
    const grid = _$("content-grid");
    const filterBar = _$("filter-bar");
    const title = _$("reports-title");
    const pagination = _$("pagination");

    if (all.length === 0) {
        empty.classList.remove("is-hidden");
        grid.classList.add("is-hidden");
        if (pagination) pagination.innerHTML = "";
        _togglePagerBar(false);
        filterBar.classList.add("is-hidden");
        title.classList.add("is-hidden");
        return;
    }

    filterBar.classList.remove("is-hidden");
    title.classList.remove("is-hidden");
    empty.classList.add("is-hidden");

    const filtered = _filter(all);
    const totalPages = Math.max(1, Math.ceil(filtered.length / REP_STATE.pageSize));
    if (REP_STATE.page > totalPages) REP_STATE.page = totalPages;
    const start = (REP_STATE.page - 1) * REP_STATE.pageSize;
    const slice = filtered.slice(start, start + REP_STATE.pageSize);

    if (slice.length === 0) {
        grid.classList.add("is-hidden");
        if (pagination) pagination.innerHTML = "";
        _togglePagerBar(false);
        let placeholder = document.getElementById("filter-empty");
        if (!placeholder) {
            placeholder = document.createElement("div");
            placeholder.id = "filter-empty";
            grid.parentNode.insertBefore(placeholder, grid);
        }
        placeholder.innerHTML = `<div class="empty"><span class="empty__icon" data-icon="info"></span>
            <h2 class="empty__title">${_t("reports.filterEmpty.title")}</h2>
            <p class="empty__text">${_t("reports.filterEmpty.text")}</p></div>`;
        if (window.Icons) window.Icons.inject(placeholder);
        return;
    }
    const placeholder = document.getElementById("filter-empty");
    if (placeholder) placeholder.remove();

    grid.innerHTML = slice.map(_renderCard).join("");
    grid.classList.remove("is-hidden");
    if (window.Icons) window.Icons.inject(grid);
    _renderPagination(filtered.length);
    _bindCardActions();
}

function _bindCardActions() {
    document.querySelectorAll(".card[data-id]").forEach((card) => {
        const id = card.dataset.id;
        card.querySelectorAll("[data-action]").forEach((btn) => {
            btn.addEventListener("click", (event) => {
                event.preventDefault();
                const action = btn.dataset.action;
                if (action === "download") _download(id);
                else if (action === "view") _view(id);
                else if (action === "share") _share(id);
                else if (action === "delete") _delete(id);
            });
        });
    });
}

function _safeFileName(name) {
    return String(name || "report")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "report";
}

function _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
}

const HIDDEN_REPORT_SECTIONS = [
    "цветовая палитра",
    "распределение активности по зонам",
    "распределение активности",
    "доминирующие цвета",
];

function _isHiddenReportSection(title) {
    const t = String(title || "").trim().toLowerCase();
    return HIDDEN_REPORT_SECTIONS.some((h) => t.startsWith(h));
}

function _parseSections(raw) {
    const cleaned = String(raw || "")
        .replace(/^#+\s*/gm, "")
        .replace(/\r\n?/g, "\n")
        .trim();
    if (!cleaned) return [];
    const out = [];
    cleaned.split(/\n{2,}/).forEach((block) => {
        const lines = block.split("\n").map((l) => l.replace(/\s+$/g, ""));
        const head = (lines.shift() || "").trim();
        if (!head || _isHiddenReportSection(head)) return;
        out.push({ title: head, body: lines.filter((l) => l.trim() !== "").join("\n") });
    });
    return out;
}

function _wrapText(text, width) {
    const words = String(text).split(/\s+/);
    const out = [];
    let line = "";
    words.forEach((w) => {
        if ((line + " " + w).trim().length > width) {
            if (line) out.push(line.trim());
            line = w;
        } else {
            line = (line ? line + " " : "") + w;
        }
    });
    if (line) out.push(line.trim());
    return out.length ? out : [""];
}

function _padCenter(text, width) {
    const len = String(text).length;
    if (len >= width) return String(text);
    const left = Math.floor((width - len) / 2);
    const right = width - len - left;
    return " ".repeat(left) + text + " ".repeat(right);
}

function _reportToText(item, result) {
    const r = result || {};
    const width = 64;
    const lines = [];
    const title = item.title || "Отчёт";
    const date = item.date || (Store && Store.formatDate(item.createdAt)) || "";

    lines.push("=".repeat(width));
    lines.push(_padCenter("ТЕРЕМ ОК? — ОТЧЁТ ОБ АНАЛИЗЕ", width));
    lines.push("=".repeat(width));
    lines.push("");
    lines.push(`Креатив: ${title}`);
    lines.push(`Дата:    ${date}`);
    if (item.author && item.author !== "—") lines.push(`Автор:   ${item.author}`);
    lines.push("");

    const sections = _parseSections(r.image_description);
    if (sections.length) {
        lines.push("-".repeat(width));
        lines.push(" ОПИСАНИЕ КРЕАТИВА");
        lines.push("-".repeat(width));
        sections.forEach((s) => {
            lines.push("");
            lines.push(`▸ ${s.title}`);
            s.body.split("\n").forEach((row) => {
                if (row.trim()) lines.push(`    ${row.trim()}`);
            });
        });
        lines.push("");
    }

    const crit = _sortCriteriaList(r.criteria);
    if (crit.length) {
        lines.push("-".repeat(width));
        lines.push(" ОЦЕНКИ ПО КРИТЕРИЯМ");
        lines.push("-".repeat(width));
        crit.forEach((c) => {
            const bar = "█".repeat(c.score) + "░".repeat(5 - c.score);
            lines.push("");
            lines.push(`  ${c.name}`);
            lines.push(`    Оценка: ${c.score} / 5   [${bar}]`);
            if (c.analysis) {
                lines.push("    Анализ:");
                _wrapText(c.analysis, width - 6).forEach((row) => lines.push(`      ${row}`));
            }
            (c.recommendations || []).forEach((rec) => {
                _wrapText(rec, width - 8).forEach((row, i) => {
                    lines.push(`      ${i === 0 ? "•" : " "} ${row}`);
                });
            });
        });
        lines.push("");
    }

    if (r.overall_score != null) {
        lines.push("=".repeat(width));
        lines.push(_padCenter(`ОБЩАЯ ОЦЕНКА КРЕАТИВА: ${r.overall_score} / 5`, width));
        lines.push("=".repeat(width));
    }

    return lines.join("\n");
}

function _scoreColorHex(score) {
    const s = Math.max(1, Math.min(5, Number(score) || 0));
    if (s >= 4.5) return "#2dbe60";
    if (s >= 3.5) return "#7dc34a";
    if (s >= 2.5) return "#e0a020";
    if (s >= 1.5) return "#e07b1f";
    return "#d23f3f";
}

function _reportToPrintableHtml(item, result) {
    const r = result || {};
    const title = _escape(item.title || "Отчёт");
    const date = item.date || (Store && Store.formatDate(item.createdAt)) || "";
    const sections = _parseSections(r.image_description);
    const crit = _sortCriteriaList(r.criteria);
    const previewSrc = item.image ? _escape(item.image) : "";

    const sectionsHtml = sections
        .map(
            (s) => `<section class="section">
                <h4>${_escape(s.title)}</h4>
                <p>${_escape(s.body).replace(/\n/g, "<br>")}</p>
            </section>`,
        )
        .join("");

    const issuesHtml = crit
        .map(
            (c) =>
                `<li><strong>${_escape(c.name)}.</strong> ${_escape(c.analysis || "")}</li>`,
        )
        .join("");

    const criteriaHtml = crit
        .map((c) => {
            const color = _scoreColorHex(c.score);
            const pct = (Math.max(1, Math.min(5, c.score)) / 5) * 100;
            const recs = (c.recommendations || [])
                .map((rec) => `<li>${_escape(rec)}</li>`)
                .join("");
            return `<section class="card">
                <div class="card__head">
                    <div class="card__title" style="color:${color}">${_escape(c.name)}</div>
                    <div class="card__score" style="color:${color}">${c.score} / 5</div>
                </div>
                <div class="bar"><span style="width:${pct}%;background:${color}"></span></div>
                <p class="card__analysis">${_escape(c.analysis || "")}</p>
                ${recs ? `<div class="card__sub">Рекомендации</div><ul>${recs}</ul>` : ""}
            </section>`;
        })
        .join("");

    const overallColor = r.overall_score != null ? _scoreColorHex(r.overall_score) : "#1a1a1a";
    const overallBlock =
        r.overall_score != null
            ? `<section class="overall">
                <div class="overall__label">Общая оценка креатива</div>
                <div class="overall__score" style="color:${overallColor}">${r.overall_score} / 5</div>
            </section>`
            : "";

    return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${title}</title>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px 40px; line-height: 1.55; background: #fff; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 22px; }
.header__brand { font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #1a1a1a; }
.header__date { color: #1a1a1a; font-size: 13px; }
h1 { margin: 6px 0 18px; font-size: 28px; line-height: 1.2; color: #1a1a1a; }
.preview img { max-width: 280px; max-height: 220px; border-radius: 10px; border: 1px solid #e5e5e5; display: block; margin-bottom: 22px; }
h2 { margin: 28px 0 12px; font-size: 18px; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.04em; }
.section { margin: 12px 0; }
.section h4 { margin: 0 0 4px; font-size: 14px; color: #1a1a1a; font-weight: 700; }
.section p { margin: 0; color: #1a1a1a; font-size: 14px; }
.issues { padding-left: 20px; margin: 0; }
.issues li { margin-bottom: 6px; font-size: 14px; color: #1a1a1a; }
.issues li::marker { color: #1a1a1a; }
.card { margin: 14px 0; padding: 16px 18px; border: 1px solid #e5e5e5; border-radius: 10px; page-break-inside: avoid; }
.card__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.card__title { font-size: 16px; font-weight: 700; }
.card__score { font-size: 18px; font-weight: 700; }
.bar { height: 8px; background: #f0f0f0; border-radius: 999px; overflow: hidden; margin-bottom: 10px; }
.bar > span { display: block; height: 100%; border-radius: inherit; }
.card__analysis { margin: 0 0 8px; color: #1a1a1a; font-size: 14px; }
.card__sub { font-weight: 700; font-size: 13px; color: #1a1a1a; margin: 8px 0 4px; }
.card ul { margin: 0; padding-left: 20px; }
.card ul li { font-size: 13px; color: #1a1a1a; margin-bottom: 4px; }
.overall { margin-top: 28px; padding: 18px 22px; background: #faf6ec; border: 1px solid #e6dcc4; border-radius: 12px; text-align: center; }
.overall__label { font-size: 13px; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
.overall__score { font-size: 36px; font-weight: 700; }
.footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #888; text-align: center; }
@media print { body { padding: 16mm; } .card { break-inside: avoid; } }
</style></head><body>
<div class="header">
    <div class="header__brand">Терем ок? — Анализ креатива</div>
    <div class="header__date">${_escape(date)}</div>
</div>
<h1>${title}</h1>
${previewSrc ? `<div class="preview"><img src="${previewSrc}" alt=""></div>` : ""}
${sections.length ? `<h2>Описание креатива</h2>${sectionsHtml}` : ""}
${issuesHtml ? `<h2>Основные проблемы</h2><ul class="issues">${issuesHtml}</ul>` : ""}
${criteriaHtml ? `<h2>Оценки по критериям</h2>${criteriaHtml}` : ""}
${overallBlock}
<div class="footer">Сгенерировано сервисом «Терем ок?»</div>
<script>window.addEventListener("load", () => setTimeout(() => window.print(), 350));<\/script>
</body></html>`;
}

function _reportToJson(item, result) {
    const r = result || {};
    const sections = _parseSections(r.image_description).map((s) => ({
        title: s.title,
        text: s.body,
    }));
    const crit = _sortCriteriaList(r.criteria).map((c) => ({
        id: c.id,
        name: c.name,
        score: c.score,
        max_score: 5,
        analysis: c.analysis || "",
        recommendations: c.recommendations || [],
    }));
    return {
        report: {
            generator: "Терем ок?",
            version: "1.0",
            generated_at: new Date().toISOString(),
        },
        creative: {
            title: item.title || "",
            author: item.author || null,
            created_at: item.createdAt || null,
        },
        overall: {
            score: r.overall_score != null ? r.overall_score : null,
            max_score: 5,
            label: "Общая оценка креатива",
        },
        description: { sections },
        main_issues: crit.map((c) => ({ criterion: c.name, issue: c.analysis })),
        criteria: crit,
    };
}

function _exportInFormat(item, fmt) {
    const result = _findAnalysisFor(item);
    const baseName = _safeFileName(item.title || "report");
    const f = String(fmt || "json").toLowerCase();

    if (f === "txt") {
        const blob = new Blob([_reportToText(item, result)], {
            type: "text/plain;charset=utf-8",
        });
        _downloadBlob(blob, `${baseName}.txt`);
        return;
    }
    if (f === "pdf") {
        const html = _reportToPrintableHtml(item, result);
        const win = window.open("", "_blank");
        if (!win) {
            const blob = new Blob([html], { type: "text/html;charset=utf-8" });
            _downloadBlob(blob, `${baseName}.html`);
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        return;
    }
    const payload = _reportToJson(item, result);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
    });
    _downloadBlob(blob, `${baseName}.json`);
}

async function _pickReportFormat(currentFormat) {
    const cur = String(currentFormat || "JSON").toUpperCase();
    const options = [
        {
            value: "PDF",
            label: "PDF",
            description: _t("reports.format.pdfDesc"),
            current: cur === "PDF",
            currentLabel: _t("common.current"),
        },
        {
            value: "JSON",
            label: "JSON",
            description: _t("reports.format.jsonDesc"),
            current: cur === "JSON",
            currentLabel: _t("common.current"),
        },
        {
            value: "TXT",
            label: "TXT",
            description: _t("reports.format.txtDesc"),
            current: cur === "TXT",
            currentLabel: _t("common.current"),
        },
    ];
    if (window.TeremDialog && window.TeremDialog.openSelectDialog) {
        return window.TeremDialog.openSelectDialog({
            title: _t("reports.format.dialogTitle"),
            message: _t("reports.format.dialogText"),
            options,
        });
    }
    const ans = window.prompt(_t("reports.format.dialogTitle") + " (PDF/JSON/TXT)", cur);
    if (!ans) return null;
    const norm = String(ans).trim().toUpperCase();
    return ["PDF", "JSON", "TXT"].includes(norm) ? norm : null;
}

async function _download(id) {
    const item = Store.getReports().find((r) => r.id === id);
    if (!item) return;
    const chosen = await _pickReportFormat(item.format);
    if (!chosen) return;
    if (chosen !== item.format && Store.updateReport) {
        Store.updateReport(id, { format: chosen });
        item.format = chosen;
    }
    _exportInFormat(item, chosen);
    _render();
}

function _escape(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function _scoreColor(score) {
    const s = Math.max(0, Math.min(5, Number(score) || 0));
    const stops = [
        [0.0, [255, 0, 0]],
        [0.5, [255, 166, 41]],
        [0.6, [205, 202, 6]],
        [0.8, [141, 252, 68]],
        [1.0, [94, 254, 1]],
    ];
    const pct = s / 5;
    for (let i = 0; i < stops.length - 1; i += 1) {
        const [pa, ca] = stops[i];
        const [pb, cb] = stops[i + 1];
        if (pct <= pb) {
            const t = pb === pa ? 0 : (pct - pa) / (pb - pa);
            const m = (a, b) => Math.round(a + (b - a) * t);
            return `rgb(${m(ca[0], cb[0])}, ${m(ca[1], cb[1])}, ${m(ca[2], cb[2])})`;
        }
    }
    const last = stops[stops.length - 1][1];
    return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

function _findAnalysisFor(report) {
    if (!report) return null;
    if (report.analysisJobId && window.Store) {
        const j = window.Store.findAnalysisJob(report.analysisJobId);
        if (j && j.result) return j.result;
    }
    return report.result || null;
}

const REPORT_CRITERION_ORDER = ["typography", "color", "hierarchy", "composition"];

function _sortCriteriaList(list) {
    const arr = Array.isArray(list) ? list.slice() : [];
    const rank = (c) => {
        const id = String((c && c.id) || "").toLowerCase();
        const idx = REPORT_CRITERION_ORDER.indexOf(id);
        return idx === -1 ? REPORT_CRITERION_ORDER.length : idx;
    };
    arr.sort((a, b) => rank(a) - rank(b));
    return arr;
}

function _renderViewerCriteria(result) {
    const list = _sortCriteriaList(result && result.criteria);
    if (!list.length) return "";
    const items = list
        .map((c) => {
            const score = Number(c.score) || 0;
            const pct = Math.max(0, Math.min(100, (score / 5) * 100));
            const color = _scoreColor(score);
            return `
                <div class="report-viewer__criterion">
                    <div class="report-viewer__criterion-head">
                        <span class="report-viewer__criterion-name">${_escape(c.name)}</span>
                        <span class="report-viewer__criterion-score" style="color:${color}">${score} / 5</span>
                    </div>
                    <div class="report-viewer__bar"><span style="width:${pct}%;background:${color}"></span></div>
                </div>`;
        })
        .join("");
    return `<section class="report-viewer__section">
        <h4 class="report-viewer__section-title">${_t("analyze.results.tabCriteria")}</h4>
        <div class="report-viewer__criteria">${items}</div>
    </section>`;
}

function _renderViewerRecommendations(result) {
    const list = _sortCriteriaList(result && result.criteria);
    const recItems = list
        .map((c) => {
            const recs = (c.recommendations || [])
                .map((r) => `<li>${_escape(r)}</li>`)
                .join("");
            if (!recs) return "";
            return `<div class="report-viewer__rec-group">
                <div class="report-viewer__rec-title">${_escape(c.name)}</div>
                <ul class="report-viewer__rec-list">${recs}</ul>
            </div>`;
        })
        .filter(Boolean)
        .join("");
    if (!recItems) return "";
    return `<section class="report-viewer__section">
        <h4 class="report-viewer__section-title">${_t("analyze.results.recTitle")}</h4>
        ${recItems}
    </section>`;
}

function _openReportViewer(item) {
    const root = _getViewerRoot();
    const result = _findAnalysisFor(item);
    const overall = item.overall_score != null
        ? item.overall_score
        : (result && result.overall_score) || null;
    const overallColor = overall != null ? _scoreColor(overall) : null;
    const summary = (result && result.summary)
        || item.description
        || "";
    const description = (result && result.image_description) || "";

    const date = item.date || (window.Store && window.Store.formatDate(item.createdAt)) || "—";
    const sizeStr = window.Store ? window.Store.formatBytes(item.size) : "—";
    const format = item.format || "—";
    const author = item.author && item.author !== "—" ? item.author : null;

    const stats = `
        <div class="report-viewer__stats">
            <div class="report-viewer__stat">
                <span class="report-viewer__stat-label">${_t("upload.preview.format")}</span>
                <span class="report-viewer__stat-value">${_escape(format)}</span>
            </div>
            <div class="report-viewer__stat">
                <span class="report-viewer__stat-label">${_t("upload.preview.weight")}</span>
                <span class="report-viewer__stat-value">${_escape(sizeStr)}</span>
            </div>
            <div class="report-viewer__stat">
                <span class="report-viewer__stat-label">${_t("upload.preview.created")}</span>
                <span class="report-viewer__stat-value">${_escape(date)}</span>
            </div>
            ${overall != null ? `<div class="report-viewer__stat">
                <span class="report-viewer__stat-label">${_t("reports.viewer.score")}</span>
                <span class="report-viewer__stat-value" style="color:${overallColor}">${overall} / 5</span>
            </div>` : ""}
        </div>`;

    const bodyParts = [];
    if (summary) {
        bodyParts.push(`<section class="report-viewer__section">
            <h4 class="report-viewer__section-title">${_t("analyze.results.summaryTitle")}</h4>
            <p class="report-viewer__text">${_escape(summary)}</p>
        </section>`);
    }
    if (description && description !== summary) {
        bodyParts.push(`<section class="report-viewer__section">
            <h4 class="report-viewer__section-title">${_t("analyze.results.descTitle")}</h4>
            <p class="report-viewer__text">${_escape(description).replace(/\n+/g, "</p><p class=\"report-viewer__text\">")}</p>
        </section>`);
    }
    bodyParts.push(_renderViewerCriteria(result));
    bodyParts.push(_renderViewerRecommendations(result));

    const panel = root.querySelector(".report-viewer__panel");
    if (!panel) return;
    panel.innerHTML = `
        <button class="report-viewer__close" type="button" data-viewer-close aria-label="${_t("common.close")}" data-icon="close"></button>
        <div class="report-viewer__hero">
            <img src="${item.image || ""}" alt="${_escape(item.title || "")}">
        </div>
        <div class="report-viewer__head">
            <h2 class="report-viewer__title">${_escape(item.title || "—")}</h2>
            ${author ? `<p class="report-viewer__author">${_escape(author)}</p>` : ""}
        </div>
        ${stats}
        <div class="report-viewer__body">${bodyParts.join("")}</div>
        <div class="report-viewer__footer">
            <button type="button" class="btn btn--primary" data-viewer-download>${_t("reports.card.download")}</button>
            <button type="button" class="btn btn--ghost" data-viewer-close>${_t("common.close")}</button>
        </div>`;

    panel.querySelectorAll("[data-viewer-close]").forEach((btn) => {
        btn.addEventListener("click", _closeReportViewer);
    });
    const dl = panel.querySelector("[data-viewer-download]");
    if (dl) dl.addEventListener("click", () => _download(item.id));
    if (window.Icons) window.Icons.inject(panel);

    root.classList.remove("is-hidden");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
}

function _getViewerRoot() {
    let el = document.getElementById("report-viewer");
    if (el) return el;
    el = document.createElement("div");
    el.id = "report-viewer";
    el.className = "report-viewer is-hidden";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
        <div class="report-viewer__backdrop" data-viewer-close></div>
        <div class="report-viewer__panel" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
        const target = e.target;
        if (target && target.matches && target.matches("[data-viewer-close]") && target === el.querySelector(".report-viewer__backdrop")) {
            _closeReportViewer();
        }
    });
    return el;
}

function _closeReportViewer() {
    const el = document.getElementById("report-viewer");
    if (!el) return;
    el.classList.add("is-hidden");
    el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
}

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const el = document.getElementById("report-viewer");
    if (!el || el.classList.contains("is-hidden")) return;
    e.preventDefault();
    _closeReportViewer();
});

function _view(id) {
    const item = Store.getReports().find((r) => r.id === id);
    if (!item) return;
    _openReportViewer(item);
}

function _share(id) {
    if (navigator.share) {
        navigator.share({ title: _t("reports.shareTitle"), text: `${_t("reports.shareTitle")} ${id}` }).catch(() => {});
    } else if (window.TeremDialog) {
        void window.TeremDialog.openAlertDialog({
            title: _t("common.info"),
            message: _t("reports.stub.share"),
            okKey: "common.ok",
        });
    } else {
        window.alert(_t("reports.stub.share"));
    }
}

async function _delete(id) {
    let ok = false;
    if (window.TeremDialog) {
        ok = await window.TeremDialog.openConfirmDialog({
            title: _t("dialog.deleteReportTitle"),
        });
    } else {
        ok = window.confirm(_t("dialog.deleteReportTitle"));
    }
    if (!ok) return;
    Store.deleteReport(id);
    _render();
}

function _initFilters() {
    _$("search").addEventListener("input", (e) => {
        REP_STATE.query = e.target.value;
        REP_STATE.page = 1;
        _render();
    });

    _$("dd-date").addEventListener("dropdown:change", (e) => {
        REP_STATE.date = e.detail.value;
        REP_STATE.page = 1;
        _render();
    });

    _$("dd-format").addEventListener("dropdown:change", (e) => {
        REP_STATE.format = e.detail.value;
        REP_STATE.page = 1;
        _render();
    });

    _$("btn-reset").addEventListener("click", () => {
        REP_STATE.query = "";
        REP_STATE.date = "all";
        REP_STATE.format = "all";
        REP_STATE.page = 1;
        _$("search").value = "";
        document.querySelectorAll(".dropdown").forEach((dd) => {
            const first = dd.querySelector(".dropdown__option");
            if (first) first.click();
        });
        _render();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    _initFilters();
    _render();
});

document.addEventListener("i18n:change", () => {
    _render();
});
