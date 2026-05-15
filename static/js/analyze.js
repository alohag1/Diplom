/**
 * Вкладки «Анализ»: создание запроса, список запросов, результаты.
 * Анализ изображения: POST /api/analyze/base64 (при ошибке — сообщение, статус «Ошибка»).
 */

const AN = {
    tab: "requests",
    selectedUploadId: null,
    imageDataUrl: null,
    imageTitle: "",
    selectedJobId: null,
    resultSub: "criteria",
    filterStatus: "all",
    filterDate: "all",
    exportFormat: "pdf",
};

const CRITERION_ICONS = {
    typography: "typography",
    color: "palette",
    hierarchy: "hierarchy",
    composition: "composition",
};

const CRITERION_ORDER = ["typography", "color", "hierarchy", "composition"];

function _sortCriteria(list) {
    const arr = Array.isArray(list) ? list.slice() : [];
    const rank = (c) => {
        const id = String((c && c.id) || "").toLowerCase();
        const idx = CRITERION_ORDER.indexOf(id);
        return idx === -1 ? CRITERION_ORDER.length : idx;
    };
    arr.sort((a, b) => rank(a) - rank(b));
    return arr;
}

function _iconHtml(name) {
    const svg = window.Icons ? window.Icons.get(name) : "";
    return svg || "";
}

function _criterionIconHtml(criterion) {
    const cid = String(criterion.id || "").toLowerCase();
    const name = CRITERION_ICONS[cid] || "sparkles";
    return _iconHtml(name);
}

function _escapeHtml(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function _t(key, vars) {
    return window.I18n ? window.I18n.t(key, vars) : key;
}

function _$(id) {
    return document.getElementById(id);
}

function _dataUrlToBase64(dataUrl) {
    const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    return m ? m[2] : null;
}

async function _fetchAnalyze(dataUrl) {
    const b64 = _dataUrlToBase64(dataUrl);
    if (!b64) throw new Error("bad data url");
    const res = await fetch("/api/analyze/base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64, filename: "creative.png" }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

function _statusLabel(status) {
    if (status === "processing") return _t("analyze.status.processing");
    if (status === "completed") return _t("analyze.status.completed");
    if (status === "failed") return _t("analyze.status.failed");
    return status;
}

function _statusClass(status) {
    if (status === "completed") return "analyze-pill--ok";
    if (status === "processing") return "analyze-pill--progress";
    if (status === "failed") return "analyze-pill--fail";
    return "";
}

function _jobTimestamp(job) {
    if (job && job.createdAt) {
        const t = new Date(job.createdAt).getTime();
        if (!Number.isNaN(t)) return t;
    }
    return Date.now();
}

function _filterJobs(list) {
    const now = Date.now();
    const dayMs = 86_400_000;
    const map = { week: 7 * dayMs, month: 31 * dayMs, year: 365 * dayMs };

    return list.filter((job) => {
        if (AN.filterStatus !== "all" && job.status !== AN.filterStatus) return false;
        if (AN.filterDate !== "all") {
            const ts = _jobTimestamp(job);
            const limit = map[AN.filterDate];
            if (limit != null && now - ts > limit) return false;
        }
        return true;
    });
}

function _showCreatePreview() {
    const ph = _$("analyze-placeholder");
    const wrap = _$("analyze-preview-wrap");
    const img = _$("analyze-preview-img");
    const btn = _$("btn-create-request");
    if (!ph || !wrap || !img || !btn) return;
    if (!AN.imageDataUrl) {
        ph.classList.remove("is-hidden");
        wrap.classList.add("is-hidden");
        btn.disabled = true;
        return;
    }
    ph.classList.add("is-hidden");
    wrap.classList.remove("is-hidden");
    img.src = AN.imageDataUrl;
    img.alt = AN.imageTitle || _t("analyze.create.title");
    btn.disabled = false;
}

function _renderCatalogPicker() {
    const grid = _$("analyze-picker-grid");
    const empty = _$("analyze-picker-empty");
    const picker = _$("analyze-picker");
    if (!grid || !empty || !picker) return;
    const uploads = Store.getUploads();
    grid.innerHTML = "";
    if (!uploads.length) {
        empty.classList.remove("is-hidden");
        return;
    }
    empty.classList.add("is-hidden");
    uploads.forEach((u) => {
        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "analyze-picker__thumb";
        thumb.dataset.uploadId = u.id;
        const title = (u.title || "—").replace(/</g, "&lt;");
        thumb.innerHTML = `<img src="${u.image}" alt=""><span class="analyze-picker__thumb-title">${title}</span>`;
        thumb.addEventListener("click", () => {
            AN.selectedUploadId = u.id;
            AN.imageDataUrl = u.image;
            AN.imageTitle = u.title || "";
            _showCreatePreview();
            picker.classList.add("is-hidden");
        });
        grid.appendChild(thumb);
    });
}

function _activateTab(name) {
    AN.tab = name;
    document.querySelectorAll("[data-analyze-tab]").forEach((btn) => {
        const on = btn.getAttribute("data-analyze-tab") === name;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-analyze-panel]").forEach((panel) => {
        const on = panel.getAttribute("data-analyze-panel") === name;
        panel.classList.toggle("is-active", on);
        if (on) {
            panel.removeAttribute("hidden");
        } else {
            panel.setAttribute("hidden", "");
        }
    });
    if (history.replaceState) {
        const u = new URL(window.location.href);
        u.searchParams.set("tab", name);
        if (AN.selectedUploadId && name === "create") u.searchParams.set("upload", AN.selectedUploadId);
        else if (name !== "create") u.searchParams.delete("upload");
        history.replaceState(null, "", u.toString());
    }
    if (name === "requests") _renderRequestsTable();
    if (name === "results") _renderResultsPanel();
}

function _renderRequestsTable() {
    const tbody = _$("analyze-tbody");
    const empty = _$("analyze-requests-empty");
    const shell = document.querySelector(".analyze-table-shell");
    if (!tbody || !empty || !shell) return;
    const jobs = _filterJobs(Store.getAnalyses());
    if (!jobs.length) {
        tbody.innerHTML = "";
        empty.classList.remove("is-hidden");
        shell.classList.add("analyze-table-shell--empty");
        return;
    }
    empty.classList.add("is-hidden");
    shell.classList.remove("analyze-table-shell--empty");
    tbody.innerHTML = jobs
        .map((job, idx) => {
            const num = jobs.length - idx;
            const desc = (job.description || job.title || "—").replace(/</g, "&lt;");
            const date = Store.formatDate(new Date(job.createdAt));
            const pill = `<span class="analyze-pill ${_statusClass(job.status)}">${_statusLabel(job.status)}</span>`;
            return `<tr data-job-id="${job.id}">
            <td>#${num}</td>
            <td><img class="analyze-table__thumb" src="${job.image}" alt=""></td>
            <td>${desc}</td>
            <td>${date}</td>
            <td>${pill}</td>
            <td><button type="button" class="btn-icon btn-icon--danger" data-action="del" data-icon="trash" aria-label="${_t("catalog.card.deleteAria")}"></button></td>
        </tr>`;
        })
        .join("");
    if (window.Icons) window.Icons.inject(tbody);
    tbody.querySelectorAll("[data-action=del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const tr = btn.closest("tr");
            const id = tr && tr.dataset.jobId;
            if (!id) return;
            let ok = false;
            if (window.TeremDialog) {
                ok = await window.TeremDialog.openConfirmDialog({ title: _t("dialog.deleteAnalysisTitle") });
            } else ok = window.confirm(_t("dialog.deleteAnalysisTitle"));
            if (!ok) return;
            Store.deleteAnalysisJob(id);
            if (AN.selectedJobId === id) AN.selectedJobId = null;
            _renderRequestsTable();
            _renderResultsPanel();
        });
    });
}

function _barGradientPct(score) {
    const s = Math.max(0, Math.min(5, Number(score) || 0));
    return (s / 5) * 100;
}

const SCORE_STOPS = [
    { p: 0.0, c: [255, 0, 0] },
    { p: 0.5, c: [255, 166, 41] },
    { p: 0.6, c: [205, 202, 6] },
    { p: 0.8, c: [141, 252, 68] },
    { p: 1.0, c: [94, 254, 1] },
];

function _lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
}

function _scoreColor(score) {
    const s = Math.max(0, Math.min(5, Number(score) || 0));
    const pct = s / 5;
    for (let i = 0; i < SCORE_STOPS.length - 1; i += 1) {
        const a = SCORE_STOPS[i];
        const b = SCORE_STOPS[i + 1];
        if (pct <= b.p) {
            const range = b.p - a.p;
            const t = range === 0 ? 0 : (pct - a.p) / range;
            return `rgb(${_lerp(a.c[0], b.c[0], t)}, ${_lerp(a.c[1], b.c[1], t)}, ${_lerp(a.c[2], b.c[2], t)})`;
        }
    }
    const last = SCORE_STOPS[SCORE_STOPS.length - 1].c;
    return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

function _renderCriteria(result) {
    const criteria = _sortCriteria(result.criteria);
    return `<div class="analyze-criteria">${criteria
        .map((c) => {
            const pct = _barGradientPct(c.score);
            const sc = _t("analyze.results.score", { score: c.score });
            const color = _scoreColor(c.score);
            return `<div class="analyze-criterion">
                <div class="analyze-criterion__head">
                    <span class="analyze-criterion__icon">${_criterionIconHtml(c)}</span>
                    <span class="analyze-criterion__name">${_escapeHtml(c.name)}</span>
                    <span class="analyze-criterion__score" style="color:${color}">${sc}</span>
                </div>
                <div class="analyze-criterion__bar"><span style="width:${pct}%;background:${color}"></span></div>
            </div>`;
        })
        .join("")}</div>`;
}

const HIDDEN_DESCRIPTION_SECTIONS = [
    "цветовая палитра",
    "распределение активности по зонам",
    "распределение активности",
    "доминирующие цвета",
];

function _isHiddenSection(title) {
    const t = String(title || "").trim().toLowerCase();
    return HIDDEN_DESCRIPTION_SECTIONS.some((h) => t.startsWith(h));
}

function _parseDescriptionSections(raw) {
    const cleaned = String(raw || "")
        .replace(/^#+\s*/gm, "")
        .replace(/\r\n?/g, "\n")
        .trim();
    if (!cleaned) return [];

    const blocks = cleaned.split(/\n{2,}/);
    const sections = [];
    blocks.forEach((block) => {
        const lines = block.split("\n").map((l) => l.replace(/\s+$/g, ""));
        const head = (lines.shift() || "").trim();
        if (!head) return;
        if (_isHiddenSection(head)) return;
        const body = lines.filter((l) => l.trim() !== "").join("\n");
        sections.push({ title: head, body });
    });
    return sections;
}

function _renderDescription(result) {
    const sections = _parseDescriptionSections(result.image_description);
    const sectionsHtml = sections
        .map((s) => {
            const bodyHtml = _escapeHtml(s.body).replace(/\n/g, "<br>");
            return `<h4 class="analyze-section-head">${_escapeHtml(s.title)}</h4>
                <div class="analyze-prose"><p>${bodyHtml}</p></div>`;
        })
        .join("");

    const crit = _sortCriteria(result.criteria);
    const issues = crit
        .map(
            (c) =>
                `<li><strong>${_escapeHtml(c.name)}.</strong> ${_escapeHtml(c.analysis)}</li>`,
        )
        .join("");

    const overall =
        result.overall_score != null
            ? `<div class="analyze-desc__overall analyze-desc__overall--bottom">
                <span class="analyze-desc__overall-score">${result.overall_score} / 5</span>
                <span class="analyze-desc__overall-label">${_t("analyze.results.overallTitle")}</span>
            </div>`
            : "";

    return `<div class="analyze-desc">
        <h3 class="analyze-block-title">${_t("analyze.results.descTitle")}</h3>
        ${sectionsHtml}
        <h4 class="analyze-section-head">${_t("analyze.results.issuesTitle")}</h4>
        <ul class="analyze-list analyze-list--dots">${issues}</ul>
        ${overall}
    </div>`;
}

function _renderRecommendations(result) {
    const criteria = _sortCriteria(result.criteria);
    let html = `<div class="analyze-rec"><h3 class="analyze-rec__title">${_t("analyze.results.recTitle")}</h3>`;
    criteria.forEach((c) => {
        const cards = (c.recommendations || [])
            .map((r) => `<div class="analyze-rec-card"><p class="analyze-rec-card__text">${_escapeHtml(r)}</p></div>`)
            .join("");
        const sc = _t("analyze.results.score", { score: c.score });
        const color = _scoreColor(c.score);
        html += `<section class="analyze-rec-group">
            <div class="analyze-rec-group__head">
                <span class="analyze-rec-group__icon" style="color:${color}">${_criterionIconHtml(c)}</span>
                <span class="analyze-rec-group__title" style="color:${color}">${_escapeHtml(c.name)}</span>
                <span class="analyze-rec-group__score" style="color:${color}">${sc}</span>
            </div>
            <div class="analyze-rec-grid">${cards}</div>
        </section>`;
    });
    html += `</div>`;
    return html;
}

function _fillResultView(job) {
    const host = _$("analyze-result-view");
    if (!host || !job || !job.result) return;
    const r = job.result;
    if (AN.resultSub === "criteria") host.innerHTML = _renderCriteria(r);
    else if (AN.resultSub === "description") host.innerHTML = _renderDescription(r);
    else host.innerHTML = _renderRecommendations(r);
}

function _updateResultNav(completed) {
    const navWrap = _$("analyze-result-nav");
    const navCount = _$("analyze-result-count");
    const navPrev = _$("analyze-result-prev");
    const navNext = _$("analyze-result-next");
    if (!navWrap || !navCount || !navPrev || !navNext) return;
    if (completed.length <= 1) {
        navWrap.classList.add("is-hidden");
        return;
    }
    navWrap.classList.remove("is-hidden");
    const idx = completed.findIndex((j) => j.id === AN.selectedJobId);
    const safeIdx = idx >= 0 ? idx : 0;
    navCount.textContent = `${safeIdx + 1} / ${completed.length}`;
    navPrev.disabled = safeIdx <= 0;
    navNext.disabled = safeIdx >= completed.length - 1;
}

function _renderResultsPanel() {
    const list = _$("analyze-results-list");
    const emptyList = _$("analyze-results-list-empty");
    const detail = _$("analyze-results-detail");
    const pick = _$("analyze-results-pick");
    const img = _$("analyze-results-img");
    if (!list || !emptyList || !detail || !pick || !img) return;

    const completed = Store.getAnalyses().filter((j) => j.status === "completed" && j.result);
    list.innerHTML = "";
    if (!completed.length) {
        emptyList.classList.remove("is-hidden");
        detail.classList.add("is-hidden");
        pick.classList.remove("is-hidden");
        _updateResultNav(completed);
        return;
    }
    emptyList.classList.add("is-hidden");
    if (!AN.selectedJobId || !completed.some((j) => j.id === AN.selectedJobId)) {
        AN.selectedJobId = completed[0].id;
    }
    completed.forEach((job) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "analyze-result-card" + (job.id === AN.selectedJobId ? " is-active" : "");
        const date = Store.formatDate(new Date(job.createdAt));
        const title = (job.title || "—").replace(/</g, "&lt;");
        btn.innerHTML = `<img src="${job.image}" alt=""><div><div class="analyze-result-card__title">${title}</div><div class="analyze-result-card__date">${date}</div></div>`;
        btn.addEventListener("click", () => {
            AN.selectedJobId = job.id;
            _renderResultsPanel();
        });
        list.appendChild(btn);
    });

    const job = Store.findAnalysisJob(AN.selectedJobId);
    if (!job || !job.result) {
        detail.classList.add("is-hidden");
        pick.classList.remove("is-hidden");
        _updateResultNav(completed);
        return;
    }
    pick.classList.add("is-hidden");
    detail.classList.remove("is-hidden");
    img.src = job.image;
    img.alt = job.title || "";
    document.querySelectorAll("[data-result-tab]").forEach((b) => {
        const on = b.getAttribute("data-result-tab") === AN.resultSub;
        b.classList.toggle("is-active", on);
    });
    _fillResultView(job);
    _updateResultNav(completed);
}

function _shiftSelectedResult(delta) {
    const completed = Store.getAnalyses().filter((j) => j.status === "completed" && j.result);
    if (completed.length <= 1) return;
    const idx = completed.findIndex((j) => j.id === AN.selectedJobId);
    const safeIdx = idx >= 0 ? idx : 0;
    const next = Math.max(0, Math.min(completed.length - 1, safeIdx + delta));
    if (next === safeIdx) return;
    AN.selectedJobId = completed[next].id;
    _renderResultsPanel();
}

function _bindResultNav() {
    const prev = _$("analyze-result-prev");
    const next = _$("analyze-result-next");
    if (prev) prev.addEventListener("click", () => _shiftSelectedResult(-1));
    if (next) next.addEventListener("click", () => _shiftSelectedResult(1));
}

function _estimateReportSize(result) {
    try {
        return new Blob([JSON.stringify(result || {})]).size;
    } catch (e) {
        return null;
    }
}

function _persistReportFromAnalysis(job, result) {
    const report = {
        id: Store.makeId(),
        uploadId: job.uploadId || null,
        analysisJobId: job.id || null,
        title: job.title || _t("analyze.tab.results"),
        author: "—",
        image: job.image,
        date: Store.formatDate(new Date()),
        size: _estimateReportSize(result),
        format: "JSON",
        description: result.summary || (result.image_description || "").slice(0, 280),
        createdAt: new Date().toISOString(),
        overall_score: result.overall_score,
        score: result.overall_score,
        result,
    };
    Store.saveReport(report);
    if (job.uploadId) {
        Store.updateUpload(job.uploadId, { analyzed: true });
    }
}

async function _onCreateRequest() {
    const btn = _$("btn-create-request");
    if (!AN.imageDataUrl || !btn) return;
    btn.disabled = true;
    const title = AN.imageTitle || _t("analyze.create.title");
    const desc = AN.imageTitle || "";
    const job = {
        id: Store.makeId(),
        uploadId: AN.selectedUploadId,
        title,
        description: desc,
        image: AN.imageDataUrl,
        createdAt: new Date().toISOString(),
        status: "processing",
        result: null,
    };
    Store.saveAnalysisJob(job);
    _activateTab("requests");
    _renderRequestsTable();

    let result = null;
    let failed = false;
    try {
        result = await _fetchAnalyze(AN.imageDataUrl);
    } catch (e) {
        failed = true;
    }
    if (failed) {
        Store.updateAnalysisJob(job.id, { status: "failed", result: null });
        _renderRequestsTable();
        if (window.TeremDialog) {
            await window.TeremDialog.openAlertDialog({
                title: _t("common.info"),
                message: _t("analyze.errorDemo"),
                okKey: "common.ok",
            });
        } else {
            window.alert(_t("analyze.errorDemo"));
        }
        btn.disabled = false;
        return;
    }
    Store.updateAnalysisJob(job.id, { status: "completed", result });
    if (result) {
        _persistReportFromAnalysis({ ...job, status: "completed", result }, result);
    }
    AN.selectedJobId = job.id;
    AN.resultSub = "criteria";
    _renderRequestsTable();
    _activateTab("results");
    btn.disabled = false;
}

function _readQueryAndApply() {
    const p = new URLSearchParams(window.location.search);
    const upload = p.get("upload");
    const tab = p.get("tab");
    if (upload) {
        const item = Store.findUpload(upload);
        if (item) {
            AN.selectedUploadId = item.id;
            AN.imageDataUrl = item.image;
            AN.imageTitle = item.title || "";
            _showCreatePreview();
        }
    }
    let target = tab;
    if (!target) {
        target = upload ? "create" : "requests";
    }
    if (target !== "create" && target !== "requests" && target !== "results") target = "requests";
    _activateTab(target);
}

function _bindTabs() {
    document.querySelectorAll("[data-analyze-tab]").forEach((btn) => {
        btn.addEventListener("click", () => _activateTab(btn.getAttribute("data-analyze-tab") || "requests"));
    });
    document.querySelectorAll("[data-result-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
            AN.resultSub = btn.getAttribute("data-result-tab") || "criteria";
            _renderResultsPanel();
        });
    });
}

function _bindCreate() {
    const file = _$("analyze-file-input");
    const up = _$("btn-analyze-upload");
    const cat = _$("btn-analyze-catalog");
    const picker = _$("analyze-picker");
    const createBtn = _$("btn-create-request");
    if (up && file) {
        up.addEventListener("click", () => file.click());
        file.addEventListener("change", () => {
            const f = file.files && file.files[0];
            if (!f || !f.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = () => {
                AN.selectedUploadId = null;
                AN.imageDataUrl = reader.result;
                AN.imageTitle = f.name.replace(/\.[^.]+$/, "");
                _showCreatePreview();
                if (picker) picker.classList.add("is-hidden");
            };
            reader.readAsDataURL(f);
        });
    }
    if (cat && picker) {
        cat.addEventListener("click", () => {
            picker.classList.toggle("is-hidden");
            _renderCatalogPicker();
        });
    }
    if (createBtn) createBtn.addEventListener("click", () => void _onCreateRequest());
}

function _safeFileName(name) {
    return String(name || "analysis")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "analysis";
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

function _hr(char, len) {
    return String(char).repeat(len);
}

function _padCenter(text, width) {
    const len = String(text).length;
    if (len >= width) return String(text);
    const left = Math.floor((width - len) / 2);
    const right = width - len - left;
    return " ".repeat(left) + text + " ".repeat(right);
}

function _resultToText(job) {
    const r = job.result || {};
    const width = 64;
    const lines = [];
    const title = job.title || "Анализ креатива";
    const date = Store.formatDate(new Date(job.createdAt));

    lines.push(_hr("=", width));
    lines.push(_padCenter("ТЕРЕМ ОК? — ОТЧЁТ ОБ АНАЛИЗЕ", width));
    lines.push(_hr("=", width));
    lines.push("");
    lines.push(`Креатив: ${title}`);
    lines.push(`Дата:    ${date}`);
    lines.push("");

    const sections = _parseDescriptionSections(r.image_description);
    if (sections.length) {
        lines.push(_hr("-", width));
        lines.push(" ОПИСАНИЕ КРЕАТИВА");
        lines.push(_hr("-", width));
        sections.forEach((s) => {
            lines.push("");
            lines.push(`▸ ${s.title}`);
            s.body.split("\n").forEach((row) => {
                if (row.trim()) lines.push(`    ${row.trim()}`);
            });
        });
        lines.push("");
    }

    const crit = _sortCriteria(r.criteria);
    if (crit.length) {
        lines.push(_hr("-", width));
        lines.push(" ОЦЕНКИ ПО КРИТЕРИЯМ");
        lines.push(_hr("-", width));
        crit.forEach((c) => {
            const bar = "█".repeat(c.score) + "░".repeat(5 - c.score);
            lines.push("");
            lines.push(`  ${c.name}`);
            lines.push(`    Оценка: ${c.score} / 5   [${bar}]`);
            if (c.analysis) {
                lines.push("    Анализ:");
                _wrapText(c.analysis, width - 6).forEach((row) => lines.push(`      ${row}`));
            }
            const recs = c.recommendations || [];
            if (recs.length) {
                lines.push("    Рекомендации:");
                recs.forEach((rec) => {
                    const wrapped = _wrapText(rec, width - 8);
                    wrapped.forEach((row, i) => {
                        lines.push(`      ${i === 0 ? "•" : " "} ${row}`);
                    });
                });
            }
        });
        lines.push("");
    }

    if (r.overall_score != null) {
        lines.push(_hr("=", width));
        lines.push(_padCenter(`ОБЩАЯ ОЦЕНКА КРЕАТИВА: ${r.overall_score} / 5`, width));
        lines.push(_hr("=", width));
    }

    return lines.join("\n");
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

function _scoreColorHex(score) {
    const s = Math.max(1, Math.min(5, Number(score) || 0));
    if (s >= 4.5) return "#2dbe60";
    if (s >= 3.5) return "#7dc34a";
    if (s >= 2.5) return "#e0a020";
    if (s >= 1.5) return "#e07b1f";
    return "#d23f3f";
}

function _resultToPrintableHtml(job) {
    const r = job.result || {};
    const title = _escapeHtml(job.title || _t("analyze.results.title"));
    const date = Store.formatDate(new Date(job.createdAt));
    const sections = _parseDescriptionSections(r.image_description);
    const crit = _sortCriteria(r.criteria);
    const previewSrc = job.image ? _escapeHtml(job.image) : "";

    const sectionsHtml = sections
        .map(
            (s) => `<section class="section">
                <h4>${_escapeHtml(s.title)}</h4>
                <p>${_escapeHtml(s.body).replace(/\n/g, "<br>")}</p>
            </section>`,
        )
        .join("");

    const issuesHtml = crit
        .map(
            (c) =>
                `<li><strong>${_escapeHtml(c.name)}.</strong> ${_escapeHtml(c.analysis || "")}</li>`,
        )
        .join("");

    const criteriaHtml = crit
        .map((c) => {
            const color = _scoreColorHex(c.score);
            const pct = (Math.max(1, Math.min(5, c.score)) / 5) * 100;
            const recs = (c.recommendations || [])
                .map((rec) => `<li>${_escapeHtml(rec)}</li>`)
                .join("");
            return `<section class="card">
                <div class="card__head">
                    <div class="card__title" style="color:${color}">${_escapeHtml(c.name)}</div>
                    <div class="card__score" style="color:${color}">${c.score} / 5</div>
                </div>
                <div class="bar"><span style="width:${pct}%;background:${color}"></span></div>
                <p class="card__analysis">${_escapeHtml(c.analysis || "")}</p>
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
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px 40px; line-height: 1.55; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 22px; }
    .header__brand { font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #8E032D; }
    .header__date { color: #666; font-size: 13px; }
    h1 { margin: 6px 0 18px; font-size: 28px; line-height: 1.2; }
    .preview { margin-bottom: 22px; }
    .preview img { max-width: 280px; max-height: 220px; border-radius: 10px; border: 1px solid #e5e5e5; display: block; }
    h2 { margin: 28px 0 12px; font-size: 18px; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; color: #8E032D; text-transform: uppercase; letter-spacing: 0.04em; }
    .section { margin: 12px 0; }
    .section h4 { margin: 0 0 4px; font-size: 14px; color: #8E032D; font-weight: 700; }
    .section p { margin: 0; color: #333; font-size: 14px; }
    .issues { padding-left: 20px; margin: 0; }
    .issues li { margin-bottom: 6px; font-size: 14px; }
    .issues li::marker { color: #8E032D; }
    .card { margin: 14px 0; padding: 16px 18px; border: 1px solid #e5e5e5; border-radius: 10px; page-break-inside: avoid; }
    .card__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .card__title { font-size: 16px; font-weight: 700; }
    .card__score { font-size: 18px; font-weight: 700; }
    .bar { height: 8px; background: #f0f0f0; border-radius: 999px; overflow: hidden; margin-bottom: 10px; }
    .bar > span { display: block; height: 100%; border-radius: inherit; }
    .card__analysis { margin: 0 0 8px; color: #333; font-size: 14px; }
    .card__sub { font-weight: 700; font-size: 13px; color: #555; margin: 8px 0 4px; }
    .card ul { margin: 0; padding-left: 20px; }
    .card ul li { font-size: 13px; color: #333; margin-bottom: 4px; }
    .overall { margin-top: 28px; padding: 18px 22px; background: #faf6ec; border: 1px solid #e6dcc4; border-radius: 12px; text-align: center; }
    .overall__label { font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .overall__score { font-size: 36px; font-weight: 700; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #888; text-align: center; }
    @media print { body { padding: 16mm; } .card { break-inside: avoid; } }
</style>
</head>
<body>
    <div class="header">
        <div class="header__brand">Терем ок? — Анализ креатива</div>
        <div class="header__date">${date}</div>
    </div>
    <h1>${title}</h1>
    ${previewSrc ? `<div class="preview"><img src="${previewSrc}" alt=""></div>` : ""}

    ${sections.length ? `<h2>Описание креатива</h2>${sectionsHtml}` : ""}

    ${issuesHtml ? `<h2>Основные проблемы</h2><ul class="issues">${issuesHtml}</ul>` : ""}

    ${criteriaHtml ? `<h2>Оценки по критериям</h2>${criteriaHtml}` : ""}

    ${overallBlock}

    <div class="footer">Сгенерировано сервисом «Терем ок?»</div>
    <script>window.addEventListener("load", () => setTimeout(() => window.print(), 350));<\/script>
</body>
</html>`;
}

function _exportAsJson(job) {
    const r = job.result || {};
    const sections = _parseDescriptionSections(r.image_description).map((s) => ({
        title: s.title,
        text: s.body,
    }));
    const crit = _sortCriteria(r.criteria).map((c) => ({
        id: c.id,
        name: c.name,
        score: c.score,
        max_score: 5,
        analysis: c.analysis || "",
        recommendations: c.recommendations || [],
    }));
    const payload = {
        report: {
            generator: "Терем ок?",
            version: "1.0",
            generated_at: new Date().toISOString(),
        },
        creative: {
            title: job.title || "",
            created_at: job.createdAt || null,
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
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
    });
    _downloadBlob(blob, `${_safeFileName(job.title)}.json`);
}

function _exportAsTxt(job) {
    const blob = new Blob([_resultToText(job)], { type: "text/plain;charset=utf-8" });
    _downloadBlob(blob, `${_safeFileName(job.title)}.txt`);
}

function _exportAsPdf(job) {
    const html = _resultToPrintableHtml(job);
    const win = window.open("", "_blank");
    if (!win) {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        _downloadBlob(blob, `${_safeFileName(job.title)}.html`);
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

function _exportReport(format) {
    const job = Store.findAnalysisJob(AN.selectedJobId);
    if (!job || !job.result) return;
    if (format === "json") _exportAsJson(job);
    else if (format === "txt") _exportAsTxt(job);
    else _exportAsPdf(job);
}

function _bindSaveExport() {
    const save = _$("btn-save-analysis-report");
    if (save) {
        save.addEventListener("click", () => _exportReport(AN.exportFormat));
    }
    const dd = _$("dd-an-export");
    if (dd) {
        dd.addEventListener("dropdown:change", (e) => {
            AN.exportFormat = (e.detail.value || "pdf").toLowerCase();
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    _bindTabs();
    _bindCreate();
    _bindSaveExport();
    _bindResultNav();
    _readQueryAndApply();
    _showCreatePreview();

    const st = _$("dd-an-status");
    const dt = _$("dd-an-date");
    if (st) {
        st.addEventListener("dropdown:change", (e) => {
            AN.filterStatus = e.detail.value || "all";
            _renderRequestsTable();
        });
    }
    if (dt) {
        dt.addEventListener("dropdown:change", (e) => {
            AN.filterDate = e.detail.value || "all";
            _renderRequestsTable();
        });
    }
    if (window.Icons) window.Icons.inject(document.body);
});

document.addEventListener("i18n:change", () => {
    _renderRequestsTable();
    _renderResultsPanel();
});
