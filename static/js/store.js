const KEY_UPLOADS = "terem.uploads";
const KEY_REPORTS = "terem.reports";
const KEY_ANALYSES = "terem.analysisJobs";

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

function canStoreUpload(item) {
    const original = getUploads();
    const proposed = [item, ...original];
    const ok = _trySetItem(KEY_UPLOADS, JSON.stringify(proposed));
    if (ok) {
        _trySetItem(KEY_UPLOADS, JSON.stringify(original));
    }
    return ok;
}

function getUploads() {
    return _read(KEY_UPLOADS);
}

function saveUpload(item) {
    const list = getUploads();
    list.unshift(item);
    const ok = _write(KEY_UPLOADS, list);
    return ok ? item : null;
}

function updateUpload(id, patch) {
    const original = getUploads();
    const list = original.map((u) => (u.id === id ? { ...u, ...patch } : u));
    const ok = _write(KEY_UPLOADS, list);
    if (!ok) return null;
    return list.find((u) => u.id === id) || null;
}

function deleteUpload(id) {
    const list = getUploads().filter((u) => u.id !== id);
    _write(KEY_UPLOADS, list);
}

function findUpload(id) {
    return getUploads().find((u) => u.id === id) || null;
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
    return _read(KEY_ANALYSES);
}

function saveAnalysisJob(item) {
    const list = getAnalyses();
    list.unshift(item);
    _write(KEY_ANALYSES, list);
    return item;
}

function updateAnalysisJob(id, patch) {
    const list = getAnalyses().map((j) => (j.id === id ? { ...j, ...patch } : j));
    _write(KEY_ANALYSES, list);
    return list.find((j) => j.id === id) || null;
}

function deleteAnalysisJob(id) {
    const list = getAnalyses().filter((j) => j.id !== id);
    _write(KEY_ANALYSES, list);
}

function findAnalysisJob(id) {
    return getAnalyses().find((j) => j.id === id) || null;
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
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

window.Store = {
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
    makeId,
    formatDate,
    formatBytes,
};
