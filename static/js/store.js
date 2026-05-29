const KEY_UPLOADS = "terem.uploads";
const KEY_REPORTS = "terem.reports";
const KEY_ANALYSES = "terem.analysisJobs";
const KEY_SUBSCRIPTION = "terem.subscription";
const SESSION_JOB_IMAGE_PREFIX = "terem.jimg.";
const SESSION_JOB_RESULT_PREFIX = "terem.jres.";

/** @type {Record<string, { uploadLimit: number | null, features: Record<string, boolean>, featureKeys: string[] }>} */
const PLAN_CONFIG = {
    free: {
        uploadLimit: 5,
        features: {
            criteria: true,
            description: false,
            recommendations: false,
            exportPdf: false,
            exportJson: false,
            exportTxt: false,
        },
        featureKeys: ["subs.free.f1", "subs.free.f2", "subs.free.f3", "subs.free.f4"],
    },
    basic: {
        uploadLimit: 20,
        features: {
            criteria: true,
            description: true,
            recommendations: false,
            exportPdf: true,
            exportJson: false,
            exportTxt: false,
        },
        featureKeys: [
            "subs.basic.f1",
            "subs.basic.f2",
            "subs.basic.f3",
            "subs.basic.f4",
            "subs.basic.f5",
            "subs.basic.f6",
        ],
    },
    pro: {
        uploadLimit: null,
        features: {
            criteria: true,
            description: true,
            recommendations: true,
            exportPdf: true,
            exportJson: true,
            exportTxt: true,
        },
        featureKeys: [
            "subs.pro.f1",
            "subs.pro.f2",
            "subs.pro.f3",
            "subs.pro.f4",
            "subs.pro.f5",
            "subs.pro.f6",
            "subs.pro.f7",
        ],
    },
};

const FEATURE_REQUIRED_PLAN = {
    description: "basic",
    recommendations: "pro",
    exportPdf: "basic",
    exportJson: "pro",
    exportTxt: "pro",
};

/** @type {Map<string, string>} */
const _uploadImageCache = new Map();

function _read(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function _write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

function _isQuotaError(err) {
    if (!err) return false;
    const name = err.name || "";
    return (
        name === "QuotaExceededError" ||
        name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        (err.code != null && (err.code === 22 || err.code === 1014))
    );
}

function _trySetItem(key, raw) {
    try {
        localStorage.setItem(key, raw);
        return true;
    } catch (e) {
        return !_isQuotaError(e);
    }
}

function _sessionGet(key) {
    try {
        return sessionStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function _sessionSet(key, value) {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (e) {
        return false;
    }
}

function _sessionRemove(key) {
    try {
        sessionStorage.removeItem(key);
    } catch (e) {
        /* ignore */
    }
}

function _readUploadMeta() {
    return _read(KEY_UPLOADS);
}

function _writeUploadMeta(list) {
    return _write(KEY_UPLOADS, list);
}

function _hydrateUploadRow(row) {
    if (!row) return row;
    const cached = _uploadImageCache.get(row.id);
    if (cached) return { ...row, image: cached };
    if (row.image) return { ...row, image: row.image };
    return { ...row, image: "" };
}

async function _loadUploadImage(id) {
    if (_uploadImageCache.has(id)) return _uploadImageCache.get(id) || "";
    if (window.TeremImageStore) {
        const fromIdb = await window.TeremImageStore.get(id);
        if (fromIdb) {
            _uploadImageCache.set(id, fromIdb);
            return fromIdb;
        }
    }
    return "";
}

async function _migrateUploadImagesToIdb() {
    const list = _readUploadMeta();
    let changed = false;
    for (const row of list) {
        if (row.image && String(row.image).startsWith("data:")) {
            if (window.TeremImageStore) {
                await window.TeremImageStore.put(row.id, row.image);
                _uploadImageCache.set(row.id, row.image);
            }
            delete row.image;
            row.imageRef = "idb";
            changed = true;
        } else if (row.imageRef === "idb") {
            const img = await _loadUploadImage(row.id);
            if (img) _uploadImageCache.set(row.id, img);
        }
    }
    if (changed) _writeUploadMeta(list);
    for (const row of list) {
        if (row.imageRef === "idb") await _loadUploadImage(row.id);
    }
}

async function _bootstrapStorage() {
    try {
        await _migrateUploadImagesToIdb();
    } catch (e) {
        /* legacy localStorage still works */
    }
}

const _ready = _bootstrapStorage();

function _stashJobImage(jobId, dataUrl) {
    if (jobId && dataUrl) _sessionSet(`${SESSION_JOB_IMAGE_PREFIX}${jobId}`, dataUrl);
}

function _stashJobResult(jobId, result) {
    if (!jobId || !result) return;
    try {
        _sessionSet(`${SESSION_JOB_RESULT_PREFIX}${jobId}`, JSON.stringify(result));
    } catch (e) {
        /* ignore */
    }
}

function _readStashedResult(jobId) {
    if (!jobId) return null;
    const raw = _sessionGet(`${SESSION_JOB_RESULT_PREFIX}${jobId}`);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function _readStashedImage(jobId) {
    if (!jobId) return null;
    return _sessionGet(`${SESSION_JOB_IMAGE_PREFIX}${jobId}`);
}

function _resolveAnalysisImage(job) {
    if (!job) return "";
    if (job.uploadId) {
        const upload = findUpload(job.uploadId);
        if (upload && upload.image) return upload.image;
    }
    if (job.id) {
        const stashed = _readStashedImage(job.id);
        if (stashed) return stashed;
    }
    return job.image || "";
}

/** @param {object | null | undefined} report */
function resolveReportImage(report) {
    if (!report) return "";
    if (report.image) return report.image;
    if (report.uploadId) {
        const upload = findUpload(report.uploadId);
        if (upload && upload.image) return upload.image;
    }
    if (report.analysisJobId) {
        const job = findAnalysisJob(report.analysisJobId);
        if (job) return _resolveAnalysisImage(job);
    }
    return "";
}

function _resolveAnalysisResult(job) {
    if (!job) return null;
    if (job.result) return job.result;
    if (job.id) return _readStashedResult(job.id);
    return null;
}

function _mergeAnalysisJob(job) {
    if (!job) return null;
    const image = _resolveAnalysisImage(job);
    const result = _resolveAnalysisResult(job);
    const merged = { ...job };
    if (image) merged.image = image;
    if (result) merged.result = result;
    return merged;
}

function _prepareJobMeta(item) {
    const meta = { ...item };
    if (meta.image && !meta.uploadId) {
        _stashJobImage(meta.id, meta.image);
    }
    if (meta.result) {
        _stashJobResult(meta.id, meta.result);
    }
    delete meta.image;
    delete meta.result;
    return meta;
}

function _reportTimestamp(report) {
    if (report && report.createdAt) {
        const t = new Date(report.createdAt).getTime();
        if (!Number.isNaN(t)) return t;
    }
    if (report && typeof report.date === "string") {
        const m = report.date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (m) {
            const t = new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`).getTime();
            if (!Number.isNaN(t)) return t;
        }
    }
    return null;
}

function _pickClosestJob(candidates, reportTs) {
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    if (reportTs == null) return candidates[0];
    let best = candidates[0];
    let bestDiff = Infinity;
    for (const j of candidates) {
        const t = new Date(j.createdAt).getTime();
        if (Number.isNaN(t)) continue;
        const diff = Math.abs(t - reportTs);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = j;
        }
    }
    return bestDiff <= 15 * 60 * 1000 ? best : candidates[0];
}

function getUploads() {
    return _readUploadMeta().map(_hydrateUploadRow);
}

async function canStoreUpload(item) {
    const image = item && item.image;
    if (image && window.TeremImageStore) {
        return window.TeremImageStore.canStore(image);
    }
    const original = _readUploadMeta();
    const meta = { ...item };
    delete meta.image;
    const proposed = [meta, ...original];
    const ok = _trySetItem(KEY_UPLOADS, JSON.stringify(proposed));
    if (ok) _trySetItem(KEY_UPLOADS, JSON.stringify(original));
    return ok;
}

async function saveUpload(item) {
    const image = item.image || "";
    const meta = { ...item };
    delete meta.image;

    if (image) {
        if (window.TeremImageStore) {
            const ok = await window.TeremImageStore.put(meta.id, image);
            if (!ok) return null;
            meta.imageRef = "idb";
            _uploadImageCache.set(meta.id, image);
        } else {
            meta.image = image;
        }
    }

    const list = _readUploadMeta();
    list.unshift(meta);
    if (!_writeUploadMeta(list)) return null;
    return _hydrateUploadRow(meta);
}

async function updateUpload(id, patch) {
    const original = _readUploadMeta();
    const image = patch.image;
    const metaPatch = { ...patch };
    delete metaPatch.image;

    if (image) {
        if (window.TeremImageStore) {
            await window.TeremImageStore.put(id, image);
            metaPatch.imageRef = "idb";
            _uploadImageCache.set(id, image);
        } else {
            metaPatch.image = image;
        }
    }

    const list = original.map((u) => (u.id === id ? { ...u, ...metaPatch } : u));
    if (!_writeUploadMeta(list)) return null;
    return findUpload(id);
}

async function deleteUpload(id) {
    if (window.TeremImageStore) await window.TeremImageStore.delete(id);
    _uploadImageCache.delete(id);
    const list = _readUploadMeta().filter((u) => u.id !== id);
    _writeUploadMeta(list);
}

function findUpload(id) {
    const row = _readUploadMeta().find((u) => u.id === id);
    return row ? _hydrateUploadRow(row) : null;
}

function getReports() {
    return _read(KEY_REPORTS);
}

function saveReport(item) {
    const list = getReports();
    list.unshift(item);
    _write(KEY_REPORTS, list);
    return item;
}

function updateReport(id, patch) {
    const list = getReports().map((r) => (r.id === id ? { ...r, ...patch } : r));
    const ok = _write(KEY_REPORTS, list);
    if (!ok) return null;
    return list.find((r) => r.id === id) || null;
}

function deleteReport(id) {
    const list = getReports().filter((r) => r.id !== id);
    _write(KEY_REPORTS, list);
}

function getAnalyses() {
    return _read(KEY_ANALYSES).map((job) => _mergeAnalysisJob(job));
}

function saveAnalysisJob(item) {
    const meta = _prepareJobMeta(item);
    const list = _read(KEY_ANALYSES);
    list.unshift(meta);
    if (!_write(KEY_ANALYSES, list)) {
        while (list.length > 1) {
            list.pop();
            if (_write(KEY_ANALYSES, list)) break;
        }
    }
    return _mergeAnalysisJob(meta);
}

function updateAnalysisJob(id, patch) {
    if (patch.image && !patch.uploadId) {
        _stashJobImage(id, patch.image);
    }
    if (patch.result) {
        _stashJobResult(id, patch.result);
    }
    const metaPatch = { ...patch };
    delete metaPatch.image;
    delete metaPatch.result;

    const list = _read(KEY_ANALYSES).map((j) => (j.id === id ? { ...j, ...metaPatch } : j));
    if (!_write(KEY_ANALYSES, list)) {
        return null;
    }
    return findAnalysisJob(id);
}

function deleteAnalysisJob(id) {
    _sessionRemove(`${SESSION_JOB_IMAGE_PREFIX}${id}`);
    _sessionRemove(`${SESSION_JOB_RESULT_PREFIX}${id}`);
    const list = _read(KEY_ANALYSES).filter((j) => j.id !== id);
    _write(KEY_ANALYSES, list);
}

function findAnalysisJob(id) {
    const raw = _read(KEY_ANALYSES).find((j) => j.id === id);
    return _mergeAnalysisJob(raw);
}

/**
 * Находит завершённый анализ, соответствующий отчёту (без путаницы при нескольких анализах одного upload).
 * @param {object | null | undefined} report
 */
function findAnalysisJobForReport(report) {
    if (!report) return null;

    if (report.analysisJobId) {
        const direct = findAnalysisJob(report.analysisJobId);
        if (direct && direct.status === "completed" && direct.result) return direct;
    }

    const reportTs = _reportTimestamp(report);
    const completed = getAnalyses().filter((j) => j.status === "completed" && j.result);

    const byReportId = completed.find((j) => j.reportId === report.id);
    if (byReportId) return byReportId;

    if (report.uploadId) {
        const sameUpload = completed.filter((j) => j.uploadId === report.uploadId);
        const picked = _pickClosestJob(sameUpload, reportTs);
        if (picked) return picked;
    }

    const titleKey = String(report.title || "")
        .trim()
        .toLowerCase();
    if (titleKey) {
        const sameTitle = completed.filter(
            (j) =>
                String(j.title || "")
                    .trim()
                    .toLowerCase() === titleKey,
        );
        const picked = _pickClosestJob(sameTitle, reportTs);
        if (picked) return picked;
    }

    return null;
}

/** @param {object | null | undefined} report */
function getAnalysisHrefForReport(report) {
    if (!report || !report.id) return "/reports";
    const job = findAnalysisJobForReport(report);
    const q = new URLSearchParams({ tab: "results", report: report.id });
    if (job) q.set("job", job.id);
    return `/analyze?${q.toString()}`;
}

function makeId() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getPlan() {
    try {
        const raw = localStorage.getItem(KEY_SUBSCRIPTION);
        if (raw && PLAN_CONFIG[raw]) return raw;
    } catch (e) {
        /* ignore */
    }
    return "free";
}

function setPlan(planId) {
    if (!PLAN_CONFIG[planId]) return false;
    try {
        localStorage.setItem(KEY_SUBSCRIPTION, planId);
        document.dispatchEvent(new CustomEvent("terem:plan-change", { detail: { plan: planId } }));
        return true;
    } catch (e) {
        return false;
    }
}

function getPlanConfig(planId) {
    const id = planId || getPlan();
    return PLAN_CONFIG[id] || PLAN_CONFIG.free;
}

function planHasFeature(feature) {
    const cfg = getPlanConfig(getPlan());
    return !!(cfg.features && cfg.features[feature]);
}

function getRequiredPlanForFeature(feature) {
    return FEATURE_REQUIRED_PLAN[feature] || "pro";
}

function getPlanUnlockFeatures(planId) {
    const cfg = PLAN_CONFIG[planId];
    return cfg ? cfg.featureKeys.slice() : [];
}

function _monthStartTs() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function countUploadsThisMonth() {
    const start = _monthStartTs();
    return getUploads().filter((u) => {
        const t = new Date(u.createdAt).getTime();
        return !Number.isNaN(t) && t >= start;
    }).length;
}

function isUploadLimitReached() {
    const cfg = getPlanConfig(getPlan());
    if (cfg.uploadLimit == null) return false;
    return countUploadsThisMonth() >= cfg.uploadLimit;
}

function getUploadLimit() {
    return getPlanConfig(getPlan()).uploadLimit;
}

function getUpgradePlanForUploadLimit() {
    const plan = getPlan();
    if (plan === "free") return "basic";
    if (plan === "basic") return "pro";
    return "pro";
}

function countProcessingAnalyses() {
    return getAnalyses().filter((j) => j.status === "processing").length;
}

function getConcurrentAnalysisLimit() {
    const plan = getPlan();
    if (plan === "free") return 1;
    return null;
}

function isConcurrentAnalysisLimitReached() {
    const limit = getConcurrentAnalysisLimit();
    if (limit == null) return false;
    return countProcessingAnalyses() >= limit;
}

function getUpgradePlanForConcurrentLimit() {
    return getPlan() === "free" ? "basic" : "pro";
}

window.Store = {
    ready: _ready,
    getUploads,
    saveUpload,
    updateUpload,
    deleteUpload,
    findUpload,
    canStoreUpload,
    getReports,
    saveReport,
    updateReport,
    deleteReport,
    getAnalyses,
    saveAnalysisJob,
    updateAnalysisJob,
    deleteAnalysisJob,
    findAnalysisJob,
    findAnalysisJobForReport,
    getAnalysisHrefForReport,
    resolveAnalysisImage: _resolveAnalysisImage,
    resolveReportImage,
    getPlan,
    setPlan,
    getPlanConfig,
    planHasFeature,
    getRequiredPlanForFeature,
    getPlanUnlockFeatures,
    countUploadsThisMonth,
    isUploadLimitReached,
    getUploadLimit,
    getUpgradePlanForUploadLimit,
    countProcessingAnalyses,
    getConcurrentAnalysisLimit,
    isConcurrentAnalysisLimitReached,
    getUpgradePlanForConcurrentLimit,
    makeId,
    formatDate,
    formatBytes,
};
