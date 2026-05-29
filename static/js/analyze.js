/**
 * Вкладки «Анализ»: создание запроса, список запросов, результаты.
 * Анализ изображения: POST /api/analyze/base64 (при ошибке — сообщение, статус «Ошибка»).
 */

const AN = {
    tab: "requests",
    createSource: "catalog",
    creativeType: "poster",
    selectedUploadId: null,
    imageDataUrl: null,
    imageTitle: "",
    imageNaturalW: null,
    imageNaturalH: null,
    selectedJobId: null,
    resultSub: "criteria",
    filterStatus: "all",
    filterDate: "all",
    requestsPage: 1,
    requestsPageSize: 10,
    resultsListPage: 1,
    resultsListPageSize: 10,
    exportFormat: "pdf",
};

const CREATIVE_LABEL_KEY = {
    poster: "analyze.create.typePoster",
    website: "analyze.create.typeWebsite",
    logo: "analyze.create.typeLogo",
    mockup: "analyze.create.typeMockup",
    banner: "analyze.create.typeBanner",
    other: "analyze.create.typeOther",
};

const ANALYZE_MAX_FILE_BYTES = 10 * 1024 * 1024;

const CRITERION_ICONS = {
    typography: "typography",
    color: "palette",
    hierarchy: "hierarchy",
    composition: "composition",
};

const CRITERION_LABEL_KEY = {
    typography: "criterion.typography",
    color: "criterion.color",
    hierarchy: "criterion.hierarchy",
    composition: "criterion.composition",
};

const CRITERION_ORDER = ["typography", "color", "hierarchy", "composition"];

function _resolveJobImage(job) {
    if (!job) return "";
    if (Store.resolveAnalysisImage) return Store.resolveAnalysisImage(job);
    return job.image || "";
}

function _criterionDisplayName(criterion) {
    const id = String((criterion && criterion.id) || "").toLowerCase();
    const key = CRITERION_LABEL_KEY[id];
    return key ? _t(key) : String((criterion && criterion.name) || id);
}

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

async function _fetchAnalyze(dataUrl, context) {
    const b64 = _dataUrlToBase64(dataUrl);
    if (!b64) throw new Error("bad data url");
    const body = {
        image_base64: b64,
        filename: "creative.png",
    };
    if (context && context.description) body.description = context.description;
    if (context && context.creativeType) body.creative_type = context.creativeType;
    const res = await fetch("/api/analyze/base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

const EXPECTED_SCORER_VERSION = "2.1";

async function _fetchScorerVersion() {
    try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        return data.scorer_version || null;
    } catch (_) {
        return null;
    }
}

async function _ensureFreshScorer() {
    const version = await _fetchScorerVersion();
    if (version === EXPECTED_SCORER_VERSION) return true;
    const msg = _t("analyze.errorStaleScorer", {
        current: version || "—",
        expected: EXPECTED_SCORER_VERSION,
    });
    if (window.TeremDialog) {
        await window.TeremDialog.openAlertDialog({
            title: _t("common.info"),
            message: msg,
            okKey: "common.ok",
        });
    } else {
        window.alert(msg);
    }
    return false;
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

function _formatDims() {
    if (AN.imageNaturalW && AN.imageNaturalH) return `${AN.imageNaturalW}×${AN.imageNaturalH}`;
    return "— × —";
}

function _creativeTypeLocalized(typeId) {
    const id = typeId || AN.creativeType;
    const key = CREATIVE_LABEL_KEY[id] || CREATIVE_LABEL_KEY.other;
    return _t(key);
}

function _resolveJobCreativeType(job) {
    if (!job) return null;
    if (job.creativeType) return job.creativeType;
    if (job.result && job.result.creative_type) return job.result.creative_type;
    return null;
}

function _resolveJobCreativeLabel(job) {
    const typeId = _resolveJobCreativeType(job);
    if (!typeId) return null;
    if (job && job.creativeType === typeId) return _creativeTypeLocalized(typeId);
    if (job && job.result && job.result.creative_type_label) {
        return job.result.creative_type_label;
    }
    return _creativeTypeLocalized(typeId);
}

const _TYPE_TEXT_PATTERNS = {
    poster: /\b(постер|плакат|афиш|poster)\b/i,
    website: /\b(сайт|веб|website|лендинг|интерфейс|экран|страниц)\b/i,
    logo: /\b(логотип|лого|эмблем|logo|фирменн\w*\s+знак)\b/i,
    banner: /\b(баннер|banner|горизонтальн\w*\s+баннер)\b/i,
    mockup: /\b(мокап|mockup|упаковк)\b/i,
};

/** @param {number | null} w @param {number | null} h */
function _inferTypeFromAspect(w, h) {
    if (!w || !h) return { type: null, confidence: 0 };
    const ratio = w / h;
    if (ratio >= 2.2) return { type: "banner", confidence: 0.78 };
    if (ratio >= 1.75) return { type: "banner", confidence: 0.58 };
    if (ratio <= 0.58) return { type: "poster", confidence: 0.76 };
    if (ratio <= 0.82) return { type: "poster", confidence: 0.58 };
    if (ratio >= 0.88 && ratio <= 1.18) return { type: "logo", confidence: 0.62 };
    if (ratio >= 1.22 && ratio <= 1.72) return { type: "website", confidence: 0.52 };
    return { type: "other", confidence: 0.4 };
}

/** @param {string} text */
function _detectTypeFromText(text) {
    const s = String(text || "").toLowerCase();
    if (!s.trim()) return { type: null, confidence: 0 };
    let bestType = null;
    let bestScore = 0;
    for (const [type, re] of Object.entries(_TYPE_TEXT_PATTERNS)) {
        const hits = s.match(re);
        const score = hits ? hits.length : 0;
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    }
    if (!bestType) return { type: null, confidence: 0 };
    return { type: bestType, confidence: Math.min(0.85, 0.45 + bestScore * 0.2) };
}

/**
 * Определяет тип креатива по картинке (приоритет), описанию и тегу пользователя.
 */
function _resolveCreativeContext() {
    const visual = _inferTypeFromAspect(AN.imageNaturalW, AN.imageNaturalH);
    const fromDesc = _detectTypeFromText(_getUserDescription());
    const userTag = AN.creativeType in CREATIVE_LABEL_KEY ? AN.creativeType : "other";

    const votes = {};
    if (visual.type) {
        votes[visual.type] = (votes[visual.type] || 0) + visual.confidence * 0.55;
    }
    if (fromDesc.type) {
        votes[fromDesc.type] = (votes[fromDesc.type] || 0) + fromDesc.confidence * 0.35;
    }
    votes[userTag] = (votes[userTag] || 0) + 0.1;

    let detected = "other";
    let top = 0;
    for (const [type, weight] of Object.entries(votes)) {
        if (weight > top) {
            top = weight;
            detected = type;
        }
    }
    if (!visual.type && !fromDesc.type) detected = userTag;

    const textTypeReliable = fromDesc.type && fromDesc.confidence >= 0.45;
    const tagMismatch =
        !textTypeReliable &&
        userTag !== detected &&
        visual.type &&
        visual.confidence >= 0.58 &&
        userTag !== visual.type;
    const descMismatch =
        !textTypeReliable &&
        fromDesc.type &&
        fromDesc.confidence >= 0.5 &&
        detected !== fromDesc.type &&
        visual.type &&
        fromDesc.type !== visual.type;

    return {
        detected,
        visual,
        fromDesc,
        userTag,
        tagMismatch,
        descMismatch,
    };
}

async function _probeNaturalSize(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () =>
            resolve({ w: img.naturalWidth || null, h: img.naturalHeight || null });
        img.onerror = () => resolve({ w: null, h: null });
        img.src = dataUrl || "";
    });
}

function _pickUploadFromCatalog(uploadId) {
    const item = Store.findUpload(uploadId);
    if (!item) return;
    AN.selectedUploadId = item.id;
    AN.imageDataUrl = item.image;
    AN.imageTitle = item.title || "";
    void _refreshImageDimsAndUi();
}

function _renderCatalogGrid() {
    const grid = _$("analyze-catalog-grid");
    const emptyHint = _$("analyze-catalog-empty-hint");
    if (!grid) return;
    const uploads = Store.getUploads();
    if (emptyHint) {
        emptyHint.classList.toggle("is-hidden", uploads.length !== 0 || AN.createSource !== "catalog");
    }
    if (AN.createSource !== "catalog") {
        grid.innerHTML = "";
        return;
    }
    if (!uploads.length) {
        grid.innerHTML = "";
        return;
    }
    grid.innerHTML = uploads
        .map((u) => {
            const active = AN.selectedUploadId === u.id;
            const title = _escapeHtml(u.title || "—");
            return `<button type="button" class="analyze-picker__thumb${active ? " is-active" : ""}" role="option" aria-selected="${active ? "true" : "false"}" data-upload-id="${_escapeHtml(u.id)}">
                <img src="${u.image}" alt="${title}">
                <span class="analyze-picker__thumb-title">${title}</span>
            </button>`;
        })
        .join("");
    grid.querySelectorAll("[data-upload-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            _pickUploadFromCatalog(btn.getAttribute("data-upload-id"));
            _renderCatalogGrid();
        });
    });
}

async function _refreshImageDimsAndUi() {
    if (!AN.imageDataUrl) {
        AN.imageNaturalW = null;
        AN.imageNaturalH = null;
    } else {
        const dims = await _probeNaturalSize(AN.imageDataUrl);
        AN.imageNaturalW = dims.w;
        AN.imageNaturalH = dims.h;
    }
    _renderUploadPreview();
    _syncSubmitEnabled();
}

function _renderUploadPreview() {
    const empty = _$("analyze-upload-preview-empty");
    const wrap = _$("analyze-upload-preview-wrap");
    const img = _$("analyze-upload-preview-img");
    if (!empty || !wrap || !img || AN.createSource !== "upload") return;

    const hasImage = Boolean(AN.imageDataUrl);
    empty.classList.toggle("is-hidden", hasImage);
    wrap.classList.toggle("is-hidden", !hasImage);
    if (hasImage) {
        img.src = AN.imageDataUrl;
        img.alt = AN.imageTitle || "";
    } else {
        img.removeAttribute("src");
        img.alt = "";
    }
}

function _openAnalyzeFilePicker() {
    const inp = _$("analyze-file-input");
    if (!inp) return;
    inp.value = "";
    inp.click();
}

function _applyCreateSourceVisual() {
    const catTile = _$("analyze-tile-catalog");
    const upTile = _$("analyze-tile-upload");
    const catBlock = _$("analyze-catalog-block");
    const upPanel = _$("analyze-upload-panel");
    if (!catTile || !upTile || !catBlock || !upPanel) return;
    const catalogOn = AN.createSource === "catalog";
    catTile.classList.toggle("is-active", catalogOn);
    upTile.classList.toggle("is-active", !catalogOn);
    catBlock.classList.toggle("is-hidden", !catalogOn);
    upPanel.classList.toggle("is-hidden", catalogOn);

    _renderCatalogGrid();

    const emptyHint = _$("analyze-catalog-empty-hint");
    const uploads = Store.getUploads();
    if (emptyHint) emptyHint.classList.toggle("is-hidden", !catalogOn || uploads.length > 0);
    _renderUploadPreview();
}

function _setCreateSource(mode) {
    if (mode !== "catalog" && mode !== "upload") return;
    if (mode === AN.createSource) return;
    AN.createSource = mode;
    AN.selectedUploadId = null;
    AN.imageDataUrl = null;
    AN.imageTitle = "";
    AN.imageNaturalW = null;
    AN.imageNaturalH = null;
    const inp = _$("analyze-file-input");
    if (inp) inp.value = "";

    void _refreshImageDimsAndUi();
    _applyCreateSourceVisual();
    _syncSubmitEnabled();
}

function _getUserDescription() {
    const ta = _$("analyze-description");
    return ta ? String(ta.value || "").trim() : "";
}

function _analysisCanSubmit() {
    if (!AN.imageDataUrl || !_getUserDescription()) return false;
    if (AN.createSource === "catalog") {
        const uploads = Store.getUploads();
        return uploads.length > 0 && !!AN.selectedUploadId;
    }
    return true;
}

function _syncSubmitEnabled() {
    const btn = _$("btn-create-request");
    if (!btn) return;
    const ready = _analysisCanSubmit();
    btn.disabled = !ready;
    btn.classList.toggle("is-active", ready);
}

function _bindDescCounter() {
    const ta = _$("analyze-description");
    const cnt = _$("analyze-desc-count");
    if (!ta || !cnt) return;

    function update() {
        cnt.textContent = String(ta.value.length);
        _syncSubmitEnabled();
    }

    ta.addEventListener("input", update);
    update();
}

function _syncAnalyzeCreateUi() {
    _renderCatalogGrid();
    _syncSubmitEnabled();
}

function _bindCreativeChips() {
    document.querySelectorAll("[data-creative-type]").forEach((chip) => {
        chip.addEventListener("click", () => {
            const kind = chip.getAttribute("data-creative-type") || "other";
            AN.creativeType = kind in CREATIVE_LABEL_KEY ? kind : "other";
            document.querySelectorAll("[data-creative-type]").forEach((c) => {
                const active = (c.getAttribute("data-creative-type") || "") === AN.creativeType;
                c.classList.toggle("is-active", active);
                c.setAttribute("aria-pressed", active ? "true" : "false");
            });
        });
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
    if (name === "create") _syncAnalyzeCreateUi();
}

function _renderRequestsPagination(total) {
    const bar = _$("analyze-requests-pager");
    const wrap = _$("analyze-requests-pagination");
    if (!bar || !wrap || !window.TeremPagination) {
        if (bar) bar.classList.add("is-hidden");
        return;
    }

    window.TeremPagination.renderNumberPagination({
        wrap,
        current: AN.requestsPage,
        totalItems: total,
        pageSize: AN.requestsPageSize,
        onChange(page) {
            AN.requestsPage = page;
            _renderRequestsTable();
            const pager = _$("analyze-requests-pager");
            if (pager) pager.scrollIntoView({ behavior: "smooth", block: "nearest" });
        },
        onHide: () => bar.classList.add("is-hidden"),
        onShow: () => bar.classList.remove("is-hidden"),
    });
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
        AN.requestsPage = 1;
        _renderRequestsPagination(0);
        return;
    }
    empty.classList.add("is-hidden");
    shell.classList.remove("analyze-table-shell--empty");

    const pages = Math.max(1, Math.ceil(jobs.length / AN.requestsPageSize));
    if (AN.requestsPage > pages) AN.requestsPage = pages;
    if (AN.requestsPage < 1) AN.requestsPage = 1;
    const start = (AN.requestsPage - 1) * AN.requestsPageSize;
    const pageJobs = jobs.slice(start, start + AN.requestsPageSize);

    tbody.innerHTML = pageJobs
        .map((job, idx) => {
            const num = jobs.length - (start + idx);
            const descRaw = job.description || job.title || "—";
            const desc = descRaw.replace(/</g, "&lt;");
            const descTitle = descRaw.replace(/"/g, "&quot;");
            const date = Store.formatDate(new Date(job.createdAt));
            const pill = `<span class="analyze-pill ${_statusClass(job.status)}">${_statusLabel(job.status)}</span>`;
            const thumb = _resolveJobImage(job);
            return `<tr data-job-id="${job.id}">
            <td class="analyze-table__col analyze-table__col--id">#${num}</td>
            <td class="analyze-table__col analyze-table__col--preview"><img class="analyze-table__thumb" src="${thumb}" alt=""></td>
            <td class="analyze-table__col analyze-table__col--desc"><span class="analyze-table__desc" title="${descTitle}">${desc}</span></td>
            <td class="analyze-table__col analyze-table__col--date">${date}</td>
            <td class="analyze-table__col analyze-table__col--status">${pill}</td>
            <td class="analyze-table__col analyze-table__col--action"><button type="button" class="btn-icon btn-icon--danger" data-action="del" data-icon="trash" aria-label="${_t("catalog.card.deleteAria")}"></button></td>
        </tr>`;
        })
        .join("");
    _renderRequestsPagination(jobs.length);
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
                    <span class="analyze-criterion__name">${_escapeHtml(_criterionDisplayName(c))}</span>
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
    "примечание",
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

function _renderPalette(result) {
    const colors = (result && result.palette) || [];
    if (!colors.length) return "";
    const chips = colors
        .map((c) => {
            const hex = String(c.hex || "#000000");
            const name = String(c.name || hex);
            const pct = c.percent != null ? `${c.percent}%` : "";
            return `<div class="analyze-palette__sw">
                <span class="analyze-palette__chip" style="background:${_escapeHtml(hex)}" title="${_escapeHtml(hex)}"></span>
                <span class="analyze-palette__name">${_escapeHtml(name)}</span>
                ${pct ? `<span class="analyze-palette__pct">${_escapeHtml(pct)}</span>` : ""}
            </div>`;
        })
        .join("");
    return `<h4 class="analyze-section-head">${_t("analyze.results.paletteTitle")}</h4>
        <div class="analyze-palette">${chips}</div>`;
}

function _renderDescription(result, job) {
    let sections = _parseDescriptionSections(result.image_description);
    const hasContent = sections.some((s) => /содержание/i.test(s.title));
    const typeLabel = _resolveJobCreativeLabel(job);
    if (!hasContent && typeLabel) {
        const extra = {
            title: _t("analyze.results.contentTitle"),
            body: `${_t("analyze.results.contentDepicted")}: ${typeLabel}.`,
        };
        if (job && job.description) {
            extra.body += `\n${_t("analyze.results.contentAuthor")}: ${job.description}`;
        }
        sections = [extra, ...sections];
    }
    const sectionsHtml = sections
        .map((s, idx) => {
            const bodyHtml = _escapeHtml(s.body).replace(/\n/g, "<br>");
            const headClass =
                idx === 0 ? "analyze-section-head analyze-section-head--lead" : "analyze-section-head";
            return `<h4 class="${headClass}">${_escapeHtml(s.title)}</h4>
                <div class="analyze-prose"><p>${bodyHtml}</p></div>`;
        })
        .join("");

    const crit = _sortCriteria(result.criteria);
    const issues = crit
        .map(
            (c) =>
                `<li><strong>${_escapeHtml(_criterionDisplayName(c))}.</strong> ${_escapeHtml(c.analysis)}</li>`,
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
        ${_renderPalette(result)}
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
                <span class="analyze-rec-group__title" style="color:${color}">${_escapeHtml(_criterionDisplayName(c))}</span>
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
    else if (AN.resultSub === "description") host.innerHTML = _renderDescription(r, job);
    else host.innerHTML = _renderRecommendations(r);
    _renderPlanOverlay(AN.resultSub);
}

function _planFeatureForTab(tab) {
    if (tab === "description") return "description";
    if (tab === "recommendations") return "recommendations";
    return null;
}

function _isTabLocked(tab) {
    const feat = _planFeatureForTab(tab);
    if (!feat || !window.Store || !Store.planHasFeature) return false;
    return !Store.planHasFeature(feat);
}

function _planLabel(planId) {
    const key = planId === "basic" ? "subs.basic" : planId === "pro" ? "subs.pro" : "subs.free";
    return _t(key);
}

function _planOverlayContent(feature) {
    if (feature === "description") {
        return {
            titleKey: "analyze.planOverlay.descTitle",
            messageKey: "analyze.planOverlay.descDescription",
        };
    }
    if (feature === "recommendations") {
        return {
            titleKey: "analyze.planOverlay.recTitle",
            messageKey: "analyze.planOverlay.descRecommendations",
        };
    }
    return {
        titleKey: "analyze.planOverlay.titleShort",
        messageKey: "analyze.planOverlay.description",
    };
}

function _renderPlanOverlay(tab) {
    const overlay = _$("analyze-plan-overlay");
    if (!overlay || !window.TeremPlanOverlay) return;

    if (!_isTabLocked(tab)) {
        TeremPlanOverlay.hideInline(overlay);
        return;
    }

    const feature = _planFeatureForTab(tab);
    const requiredPlan = Store.getRequiredPlanForFeature(feature);
    const content = _planOverlayContent(feature);
    TeremPlanOverlay.renderInline(overlay, {
        planId: requiredPlan,
        titleKey: content.titleKey,
        messageKey: content.messageKey,
        onSelect() {
            _renderResultsPanel();
        },
    });
}

function _exportFeatureForFormat(format) {
    if (format === "pdf") return "exportPdf";
    if (format === "json") return "exportJson";
    if (format === "txt") return "exportTxt";
    return null;
}

function _showExportPlanOverlay(format) {
    const feat = _exportFeatureForFormat(format);
    if (!feat || !window.TeremPlanOverlay) return;
    TeremPlanOverlay.open({
        planId: Store.getRequiredPlanForFeature(feat),
        titleKey: "analyze.planOverlay.exportTitle",
        messageKey: "analyze.planOverlay.exportBlocked",
        messageVars: { format: String(format || "").toUpperCase() },
    });
}

function _resultsPageForJob(completed, jobId) {
    const idx = completed.findIndex((j) => j.id === jobId);
    if (idx < 0) return AN.resultsListPage;
    return Math.floor(idx / AN.resultsListPageSize) + 1;
}

function _renderResultsListPagination(total) {
    const wrap = _$("analyze-results-pagination");
    const bar = _$("analyze-results-pager");
    if (!wrap || !window.TeremPagination) return;
    window.TeremPagination.renderSliderPagination({
        wrap,
        current: AN.resultsListPage,
        totalItems: total,
        pageSize: AN.resultsListPageSize,
        sliderId: "analyze-results-page-slider",
        sliderValId: "analyze-results-page-val",
        onChange(page) {
            AN.resultsListPage = page;
            const completed = Store.getAnalyses().filter((j) => j.status === "completed" && j.result);
            const start = (page - 1) * AN.resultsListPageSize;
            const pageJobs = completed.slice(start, start + AN.resultsListPageSize);
            if (pageJobs.length) {
                AN.selectedJobId = pageJobs[0].id;
            }
            _renderResultsPanel();
            const barEl = _$("analyze-results-pager");
            if (barEl) barEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        },
        onHide() {
            if (bar) bar.classList.add("is-hidden");
        },
        onShow() {
            if (bar) bar.classList.remove("is-hidden");
        },
    });
}

function _updateResultTabLocks() {
    document.querySelectorAll("[data-result-tab]").forEach((btn) => {
        const tab = btn.getAttribute("data-result-tab") || "";
        btn.classList.toggle("is-locked", _isTabLocked(tab));
    });
}

function _syncExportFormatsByPlan() {
    const dd = _$("dd-an-export");
    if (!dd || !window.Store || !Store.planHasFeature) return;
    dd.querySelectorAll(".dropdown__option").forEach((opt) => {
        const val = (opt.getAttribute("data-value") || "").toLowerCase();
        let allowed = true;
        if (val === "pdf") allowed = Store.planHasFeature("exportPdf");
        if (val === "json") allowed = Store.planHasFeature("exportJson");
        if (val === "txt") allowed = Store.planHasFeature("exportTxt");
        opt.classList.toggle("is-hidden", !allowed);
        opt.disabled = !allowed;
    });
    if (!Store.planHasFeature("exportPdf") && AN.exportFormat === "pdf") {
        AN.exportFormat = Store.planHasFeature("exportJson") ? "json" : "txt";
    }
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
        _renderResultsListPagination(0);
        return;
    }
    emptyList.classList.add("is-hidden");
    if (!AN.selectedJobId || !completed.some((j) => j.id === AN.selectedJobId)) {
        AN.selectedJobId = completed[0].id;
        AN.resultsListPage = 1;
    }

    const totalPages = Math.max(1, Math.ceil(completed.length / AN.resultsListPageSize));
    if (AN.resultsListPage > totalPages) AN.resultsListPage = totalPages;
    if (AN.resultsListPage < 1) AN.resultsListPage = 1;
    let start = (AN.resultsListPage - 1) * AN.resultsListPageSize;
    let pageJobs = completed.slice(start, start + AN.resultsListPageSize);
    const selectedIdx = completed.findIndex((j) => j.id === AN.selectedJobId);
    if (selectedIdx >= 0 && (selectedIdx < start || selectedIdx >= start + AN.resultsListPageSize)) {
        AN.resultsListPage = Math.floor(selectedIdx / AN.resultsListPageSize) + 1;
        start = (AN.resultsListPage - 1) * AN.resultsListPageSize;
        pageJobs = completed.slice(start, start + AN.resultsListPageSize);
    }

    pageJobs.forEach((job) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "analyze-result-card" + (job.id === AN.selectedJobId ? " is-active" : "");
        const date = Store.formatDate(new Date(job.createdAt));
        const title = (job.title || "—").replace(/</g, "&lt;");
        const thumb = _resolveJobImage(job);
        const typeLabel = _resolveJobCreativeLabel(job);
        const typeHtml = typeLabel
            ? `<div class="analyze-result-card__type">${_escapeHtml(typeLabel)}</div>`
            : "";
        btn.innerHTML = `<img src="${thumb}" alt=""><div><div class="analyze-result-card__title">${title}</div>${typeHtml}<div class="analyze-result-card__date">${date}</div></div>`;
        btn.addEventListener("click", () => {
            AN.selectedJobId = job.id;
            _renderResultsPanel();
        });
        list.appendChild(btn);
    });

    _renderResultsListPagination(completed.length);

    const job = Store.findAnalysisJob(AN.selectedJobId);
    if (!job || !job.result) {
        detail.classList.add("is-hidden");
        pick.classList.remove("is-hidden");
        return;
    }
    pick.classList.add("is-hidden");
    detail.classList.remove("is-hidden");
    img.src = _resolveJobImage(job);
    img.alt = job.title || "";
    const typeEl = _$("analyze-results-type");
    const typeLabel = _resolveJobCreativeLabel(job);
    if (typeEl) {
        if (typeLabel) {
            typeEl.textContent = `${_t("analyze.results.creativeTypeLabel")}: ${typeLabel}`;
            typeEl.classList.remove("is-hidden");
        } else {
            typeEl.textContent = "";
            typeEl.classList.add("is-hidden");
        }
    }
    document.querySelectorAll("[data-result-tab]").forEach((b) => {
        const on = b.getAttribute("data-result-tab") === AN.resultSub;
        b.classList.toggle("is-active", on);
    });
    _updateResultTabLocks();
    _syncExportFormatsByPlan();
    _fillResultView(job);
}

function _estimateReportSize(result) {
    try {
        return new Blob([JSON.stringify(result || {})]).size;
    } catch (e) {
        return null;
    }
}

function _persistReportFromAnalysis(job, result) {
    const imageRef = _resolveJobImage(job);
    const creativeType = job.creativeType || result.creative_type || null;
    const creativeTypeLabel = creativeType ? _creativeTypeLocalized(creativeType) : null;
    const report = {
        id: Store.makeId(),
        uploadId: job.uploadId || null,
        analysisJobId: job.id || null,
        title: job.title || _t("analyze.tab.results"),
        author: "—",
        image: job.uploadId ? null : imageRef,
        date: Store.formatDate(new Date()),
        size: _estimateReportSize(result),
        format: "JSON",
        description: result.summary || (result.image_description || "").slice(0, 280),
        creativeType,
        creativeTypeLabel,
        createdAt: new Date().toISOString(),
        overall_score: result.overall_score,
        score: result.overall_score,
        result: job.uploadId ? null : result,
    };
    Store.saveReport(report);
    Store.updateAnalysisJob(job.id, { reportId: report.id });
    if (job.uploadId) {
        void Store.updateUpload(job.uploadId, { analyzed: true });
    }
}

async function _onCreateRequest() {
    const btn = _$("btn-create-request");
    const descTa = _$("analyze-description");
    const userDesc = descTa ? descTa.value.trim() : "";
    if (!AN.imageDataUrl || !userDesc || !btn) return;

    if (window.Store && Store.isConcurrentAnalysisLimitReached && Store.isConcurrentAnalysisLimitReached()) {
        if (window.TeremPlanOverlay) {
            TeremPlanOverlay.open({
                planId: Store.getUpgradePlanForConcurrentLimit(),
                titleKey: "analyze.planOverlay.concurrentTitle",
                messageKey: "analyze.planOverlay.concurrentLimit",
            });
        }
        return;
    }

    btn.disabled = true;
    btn.classList.remove("is-active");
    const title = AN.imageTitle || _t("analyze.create.title");
    const description = userDesc;
    const ctx = _resolveCreativeContext();
    const job = {
        id: Store.makeId(),
        uploadId: AN.selectedUploadId,
        title,
        description,
        creativeType: AN.creativeType,
        image: AN.selectedUploadId ? null : AN.imageDataUrl,
        createdAt: new Date().toISOString(),
        status: "processing",
        result: null,
    };
    const savedJob = Store.saveAnalysisJob(job);
    if (!savedJob || !Store.findAnalysisJob(job.id)) {
        if (window.TeremDialog) {
            await window.TeremDialog.openAlertDialog({
                title: _t("common.info"),
                message: _t("analyze.errorStorage"),
                okKey: "common.ok",
            });
        } else {
            window.alert(_t("analyze.errorStorage"));
        }
        btn.disabled = false;
        _syncSubmitEnabled();
        return;
    }
    _activateTab("requests");
    _renderRequestsTable();

    if (!(await _ensureFreshScorer())) {
        Store.updateAnalysisJob(job.id, { status: "failed", result: null });
        _renderRequestsTable();
        btn.disabled = false;
        _syncSubmitEnabled();
        return;
    }

    let result = null;
    let failed = false;
    try {
        result = await _fetchAnalyze(AN.imageDataUrl, {
            description: userDesc,
            creativeType: AN.creativeType,
        });
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
        _syncSubmitEnabled();
        return;
    }
    Store.updateAnalysisJob(job.id, {
        status: "completed",
        result,
        creativeType: AN.creativeType,
    });
    const persisted = Store.findAnalysisJob(job.id);
    if (!persisted || persisted.status !== "completed" || !persisted.result) {
        Store.updateAnalysisJob(job.id, { status: "failed", result: null });
        _renderRequestsTable();
        if (window.TeremDialog) {
            await window.TeremDialog.openAlertDialog({
                title: _t("common.info"),
                message: _t("analyze.errorStorage"),
                okKey: "common.ok",
            });
        } else {
            window.alert(_t("analyze.errorStorage"));
        }
        btn.disabled = false;
        _syncSubmitEnabled();
        return;
    }
    if (result) {
        _persistReportFromAnalysis({ ...job, status: "completed", result }, result);
    }
    AN.selectedJobId = job.id;
    AN.resultSub = "criteria";
    _renderRequestsTable();
    _activateTab("results");
    btn.disabled = false;
    _syncSubmitEnabled();
}

function _readQueryAndApply() {
    const p = new URLSearchParams(window.location.search);
    const upload = p.get("upload");
    const tab = p.get("tab");
    const jobParam = p.get("job");
    const reportParam = p.get("report");
    let resolvedJob = null;
    if (reportParam) {
        const report = Store.getReports().find((r) => r.id === reportParam);
        if (report) resolvedJob = Store.findAnalysisJobForReport(report);
    }
    if (!resolvedJob && jobParam) {
        resolvedJob = Store.findAnalysisJob(jobParam);
    }
    if (resolvedJob && resolvedJob.status === "completed" && resolvedJob.result) {
        AN.selectedJobId = resolvedJob.id;
        AN.resultSub = "criteria";
    }
    if (upload) {
        const item = Store.findUpload(upload);
        if (item) {
            AN.createSource = "catalog";
            AN.selectedUploadId = item.id;
            AN.imageDataUrl = item.image;
            AN.imageTitle = item.title || "";
            void _refreshImageDimsAndUi();
            _applyCreateSourceVisual();
        }
    }
    let target = tab;
    if (!target) {
        target = upload ? "create" : "requests";
    }
    if (target !== "create" && target !== "requests" && target !== "results") {
        target = jobParam && AN.selectedJobId ? "results" : "requests";
    }
    _activateTab(target);
    if (target === "results" && AN.selectedJobId) _renderResultsPanel();
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

function _bindGradingLinks() {
    document.querySelectorAll("#btn-grading-help, [data-grading-link]").forEach((el) => {
        el.addEventListener("click", (event) => {
            const href = el.getAttribute("href");
            if (!href) return;
            event.preventDefault();
            window.location.assign(href);
        });
    });
}

function _bindCreate() {
    const fileInp = _$("analyze-file-input");
    const createBtn = _$("btn-create-request");
    const catTile = _$("analyze-tile-catalog");
    const upTile = _$("analyze-tile-upload");

    _bindCreativeChips();
    _bindDescCounter();

    if (catTile) catTile.addEventListener("click", () => _setCreateSource("catalog"));
    if (upTile) {
        upTile.addEventListener("click", () => {
            if (AN.createSource !== "upload") _setCreateSource("upload");
            _openAnalyzeFilePicker();
        });
    }

    async function handleFileChosen(f) {
        if (!f) return;
        if (!/^image\/(png|jpeg|webp)$/i.test(f.type)) {
            const msg = _t("upload.notImageMessage");
            if (window.TeremDialog) {
                await window.TeremDialog.openAlertDialog({
                    title: _t("upload.notImageTitle"),
                    message: msg,
                    okKey: "common.ok",
                });
            } else window.alert(msg);
            return;
        }
        if (f.size > ANALYZE_MAX_FILE_BYTES) {
            const msg = _t("analyze.create.fileTooLarge");
            if (window.TeremDialog) {
                await window.TeremDialog.openAlertDialog({
                    title: _t("common.info"),
                    message: msg,
                    okKey: "common.ok",
                });
            } else window.alert(msg);
            return;
        }
        AN.selectedUploadId = null;
        const reader = new FileReader();
        reader.onload = () => {
            AN.imageDataUrl = reader.result;
            AN.imageTitle = f.name.replace(/\.[^.]+$/, "");
            void _refreshImageDimsAndUi();
        };
        reader.readAsDataURL(f);
    }

    if (fileInp) {
        fileInp.addEventListener("change", () => handleFileChosen(fileInp.files && fileInp.files[0]));
    }

    if (createBtn) createBtn.addEventListener("click", () => void _onCreateRequest());

    _applyCreateSourceVisual();
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
    const typeLabel = _resolveJobCreativeLabel(job);
    if (typeLabel) lines.push(`Тип:     ${typeLabel}`);
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
    const typeLabel = _resolveJobCreativeLabel(job);
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
    .creative-type { margin: -8px 0 18px; font-size: 15px; color: #8E032D; }
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
    ${typeLabel ? `<p class="creative-type"><strong>Тип креатива:</strong> ${_escapeHtml(typeLabel)}</p>` : ""}
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
            type: _resolveJobCreativeType(job),
            type_label: _resolveJobCreativeLabel(job),
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
    const fmt = String(format || "pdf").toLowerCase();
    const feat = _exportFeatureForFormat(fmt);
    if (feat && Store.planHasFeature && !Store.planHasFeature(feat)) {
        _showExportPlanOverlay(fmt);
        return;
    }
    if (fmt === "json") _exportAsJson(job);
    else if (fmt === "txt") _exportAsTxt(job);
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
            const val = String(e.detail.value || "pdf").toLowerCase();
            const feat = _exportFeatureForFormat(val);
            if (feat && Store.planHasFeature && !Store.planHasFeature(feat)) {
                _showExportPlanOverlay(val);
                _syncExportFormatsByPlan();
                return;
            }
            AN.exportFormat = val;
        });
    }
}

function _bootAnalyzePage() {
    _bindTabs();
    _readQueryAndApply();
    _bindCreate();
    _bindGradingLinks();
    _bindSaveExport();

    const st = _$("dd-an-status");
    const dt = _$("dd-an-date");
    if (st) {
        st.addEventListener("dropdown:change", (e) => {
            AN.filterStatus = e.detail.value || "all";
            AN.requestsPage = 1;
            _renderRequestsTable();
        });
    }
    if (dt) {
        dt.addEventListener("dropdown:change", (e) => {
            AN.filterDate = e.detail.value || "all";
            AN.requestsPage = 1;
            _renderRequestsTable();
        });
    }
    if (window.Icons) window.Icons.inject(document.body);
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.Store && Store.ready) Store.ready.then(_bootAnalyzePage);
    else _bootAnalyzePage();
});

document.addEventListener("i18n:change", () => {
    _renderRequestsTable();
    _renderResultsPanel();
    _renderCatalogGrid();
    _renderUploadPreview();
});

document.addEventListener("terem:plan-change", () => {
    _renderResultsPanel();
    _syncExportFormatsByPlan();
});
