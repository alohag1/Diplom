const STATE = {
    editId: null,
    file: null,
    fileName: null,
    fileSize: null,
    dataUrl: null,
    tags: [],
    width: null,
    height: null,
};

function _t(key) {
    return window.I18n ? window.I18n.t(key) : key;
}

function _$(id) {
    return document.getElementById(id);
}

async function _warnNotImage() {
    if (window.TeremDialog) {
        await window.TeremDialog.openAlertDialog({
            title: _t("upload.notImageTitle"),
            message: _t("upload.notImageMessage"),
            okKey: "common.ok",
        });
    } else {
        window.alert(_t("upload.notImageMessage"));
    }
}

function _formatDateForInput(dateStr) {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return "";
}

function _formatDateForDisplay(value) {
    if (!value) return "";
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    return value;
}

function _setCancelActive(active) {
    const btn = _$("btn-cancel");
    if (!btn) return;
    btn.classList.toggle("is-active", Boolean(active));
}

function _renderPreview() {
    const preview = _$("preview");
    if (!STATE.dataUrl) {
        preview.classList.add("preview--empty");
        preview.innerHTML = _t("upload.preview.placeholder");
        return;
    }

    const title = _$("meta-title").value.trim() || (STATE.fileName || "").replace(/\.[^.]+$/, "");
    const author = _$("meta-author").value.trim() || _t("upload.preview.dash");
    const dateRaw = _$("meta-date").value;
    const date = _formatDateForDisplay(dateRaw) || Store.formatDate(new Date());
    const tagsHtml = STATE.tags.length
        ? STATE.tags.map((t) => `<span class="tag">${t}</span>`).join("")
        : _t("upload.preview.dash");
    const ext = ((STATE.fileName || "").split(".").pop() || "PNG").toUpperCase();
    const sizeStr = STATE.width && STATE.height ? `${STATE.width} × ${STATE.height}` : _t("upload.preview.dash");
    const weightStr = STATE.fileSize ? Store.formatBytes(STATE.fileSize) : _t("upload.preview.dash");

    preview.classList.remove("preview--empty");
    preview.innerHTML = `
        <div class="preview__top">
            <div class="preview__media">
                <img src="${STATE.dataUrl}" alt="${title}">
            </div>
            <div class="preview__info">
                <div class="preview__info-item">
                    <span class="preview__info-label">${_t("upload.preview.format")}</span>
                    <span class="preview__info-value">${ext}</span>
                </div>
                <div class="preview__info-item">
                    <span class="preview__info-label">${_t("upload.preview.dimensions")}</span>
                    <span class="preview__info-value">${sizeStr}</span>
                </div>
                <div class="preview__info-item">
                    <span class="preview__info-label">${_t("upload.preview.weight")}</span>
                    <span class="preview__info-value">${weightStr}</span>
                </div>
            </div>
        </div>
        <div class="preview__bottom">
            <div class="preview__meta">
                <h3 class="preview__meta-title">${_t("upload.preview.metaTitle")}</h3>
                <div class="preview__meta-row">
                    <span class="preview__meta-label">${_t("upload.preview.name")}</span>
                    <span class="preview__meta-value">${title}</span>
                </div>
                <div class="preview__meta-row">
                    <span class="preview__meta-label">${_t("upload.preview.author")}</span>
                    <span class="preview__meta-value">${author}</span>
                </div>
                <div class="preview__meta-row">
                    <span class="preview__meta-label">${_t("upload.preview.tags")}</span>
                    <span class="preview__meta-value">${tagsHtml}</span>
                </div>
                <div class="preview__meta-row">
                    <span class="preview__meta-label">${_t("upload.preview.created")}</span>
                    <span class="preview__meta-value">${date}</span>
                </div>
            </div>
        </div>
    `;
}

function _updateSubmit() {
    _$("btn-submit").disabled = !STATE.dataUrl;
}

function _renderTags() {
    const list = _$("tag-list");
    list.innerHTML = STATE.tags
        .map(
            (t, i) =>
                `<span class="tag" data-i="${i}" role="button" title="${_t("upload.tagRemove")}">${t} ×</span>`,
        )
        .join("");
    list.querySelectorAll(".tag").forEach((el) => {
        el.addEventListener("click", () => {
            const i = Number(el.dataset.i);
            STATE.tags.splice(i, 1);
            _renderTags();
            _renderPreview();
        });
    });
}

function _addTag() {
    const input = _$("meta-tag");
    const value = input.value.trim();
    if (!value) return;
    if (STATE.tags.includes(value)) {
        input.value = "";
        return;
    }
    STATE.tags.push(value);
    input.value = "";
    _renderTags();
    _renderPreview();
}

function _readImageDimensions(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: null, height: null });
        img.src = dataUrl;
    });
}

function _dataUrlByteSize(dataUrl) {
    const i = String(dataUrl || "").indexOf(",");
    if (i < 0) return 0;
    const b64 = dataUrl.slice(i + 1);
    return Math.floor((b64.length * 3) / 4);
}

function _compressImage(dataUrl, maxDim, quality, mime) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth || 0;
            const h = img.naturalHeight || 0;
            if (!w || !h) {
                resolve({ dataUrl, width: w, height: h });
                return;
            }
            const scale = Math.min(1, maxDim / Math.max(w, h));
            const tw = Math.max(1, Math.round(w * scale));
            const th = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement("canvas");
            canvas.width = tw;
            canvas.height = th;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, tw, th);
            const out = canvas.toDataURL(mime || "image/jpeg", quality);
            resolve({ dataUrl: out, width: tw, height: th });
        };
        img.onerror = () => resolve({ dataUrl, width: null, height: null });
        img.src = dataUrl;
    });
}

async function _prepareImageForStorage(dataUrl) {
    const STORE_LIMIT = window.TeremImageStore ? 1100 * 1024 : 700 * 1024;
    if (_dataUrlByteSize(dataUrl) <= STORE_LIMIT) {
        return { dataUrl, width: null, height: null };
    }
    const attempts = [
        { dim: 1920, q: 0.85 },
        { dim: 1600, q: 0.8 },
        { dim: 1280, q: 0.78 },
        { dim: 1024, q: 0.72 },
        { dim: 800, q: 0.66 },
    ];
    let last = null;
    for (const a of attempts) {
        const r = await _compressImage(dataUrl, a.dim, a.q, "image/jpeg");
        last = r;
        if (_dataUrlByteSize(r.dataUrl) <= STORE_LIMIT) return r;
    }
    return last || { dataUrl, width: null, height: null };
}

async function _handleFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
        await _warnNotImage();
        const inp = _$("file-input");
        if (inp) inp.value = "";
        return;
    }

    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const dims = await _readImageDimensions(dataUrl);

    STATE.file = file;
    STATE.fileName = file.name;
    STATE.fileSize = file.size;
    STATE.dataUrl = dataUrl;
    STATE.width = dims.width;
    STATE.height = dims.height;

    if (!_$("meta-title").value) _$("meta-title").value = file.name.replace(/\.[^.]+$/, "");
    if (!_$("meta-date").value) {
        const d = new Date();
        _$("meta-date").value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    _renderPreview();
    _updateSubmit();
    _setCancelActive(true);
}

function _initDropzone() {
    const dz = _$("dropzone");
    const input = _$("file-input");
    const pick = _$("btn-pick");

    pick.addEventListener("click", (e) => {
        e.preventDefault();
        input.click();
    });

    input.addEventListener("change", () => {
        const file = input.files[0];
        if (file) _handleFile(file);
    });

    ["dragenter", "dragover"].forEach((evt) => {
        dz.addEventListener(evt, (e) => {
            e.preventDefault();
            dz.classList.add("is-dragover");
        });
    });
    ["dragleave", "drop"].forEach((evt) => {
        dz.addEventListener(evt, (e) => {
            e.preventDefault();
            if (evt === "dragleave" && e.target !== dz) return;
            dz.classList.remove("is-dragover");
        });
    });
    dz.addEventListener("drop", (e) => {
        e.preventDefault();
        dz.classList.remove("is-dragover");
        const file = e.dataTransfer.files[0];
        if (file) _handleFile(file);
    });
}

function _initMetaInputs() {
    ["meta-title", "meta-author", "meta-date"].forEach((id) => {
        _$(id).addEventListener("input", _renderPreview);
    });
    _$("btn-add-tag").addEventListener("click", _addTag);
    _$("meta-tag").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            _addTag();
        }
    });
}

function _reset() {
    if (STATE.editId) {
        window.location.href = "/catalog";
        return;
    }
    STATE.file = null;
    STATE.fileName = null;
    STATE.fileSize = null;
    STATE.dataUrl = null;
    STATE.tags = [];
    STATE.width = null;
    STATE.height = null;
    _$("meta-form").reset();
    _$("file-input").value = "";
    _renderTags();
    _renderPreview();
    _updateSubmit();
    _setCancelActive(false);
}

async function _showStorageError() {
    const msg = _t("upload.storageErrorMessage");
    if (window.TeremDialog) {
        await window.TeremDialog.openAlertDialog({
            title: _t("upload.storageErrorTitle"),
            message: msg,
            okKey: "common.ok",
        });
    } else {
        window.alert(msg);
    }
}

async function _submit() {
    if (!STATE.dataUrl) return;

    if (!STATE.editId && window.Store && Store.isUploadLimitReached && Store.isUploadLimitReached()) {
        const limit = Store.getUploadLimit();
        if (window.TeremPlanOverlay) {
            TeremPlanOverlay.open({
                planId: Store.getUpgradePlanForUploadLimit(),
                titleKey: "analyze.planOverlay.uploadTitle",
                messageKey: "analyze.planOverlay.uploadLimit",
                messageVars: { limit: limit || 5 },
            });
        } else {
            const msg = window.I18n
                ? window.I18n.t("analyze.planOverlay.uploadLimit", { limit: limit || 5 })
                : `Достигнут лимит загрузок (${limit || 5} в месяц).`;
            window.alert(msg);
        }
        return;
    }

    const submitBtn = _$("btn-submit");
    if (submitBtn) submitBtn.disabled = true;

    const dateValue = _$("meta-date").value;
    const displayDate = _formatDateForDisplay(dateValue) || Store.formatDate(new Date());
    const baseName = (STATE.fileName || "").replace(/\.[^.]+$/, "");
    const ext = ((STATE.fileName || "").split(".").pop() || "png").toUpperCase();

    const prepared = await _prepareImageForStorage(STATE.dataUrl);
    const imageOut = prepared.dataUrl;
    const widthOut = prepared.width || STATE.width;
    const heightOut = prepared.height || STATE.height;
    const sizeOut = _dataUrlByteSize(imageOut) || STATE.fileSize;

    const ok = await Store.canStoreUpload({ image: imageOut });
    if (!ok) {
        if (submitBtn) submitBtn.disabled = false;
        await _showStorageError();
        return;
    }

    if (STATE.editId) {
        const patch = {
            title: _$("meta-title").value.trim() || baseName,
            author: _$("meta-author").value.trim() || "—",
            tags: [...STATE.tags],
            date: displayDate,
            description: "",
            image: imageOut,
            format: ext,
            width: widthOut,
            height: heightOut,
            size: sizeOut,
        };
        const saved = await Store.updateUpload(STATE.editId, patch);
        if (!saved) {
            if (submitBtn) submitBtn.disabled = false;
            await _showStorageError();
            return;
        }
        window.location.href = "/catalog";
        return;
    }

    const item = {
        id: Store.makeId(),
        title: _$("meta-title").value.trim() || baseName,
        author: _$("meta-author").value.trim() || "—",
        tags: [...STATE.tags],
        date: displayDate,
        description: "",
        image: imageOut,
        format: ext,
        width: widthOut,
        height: heightOut,
        size: sizeOut,
        analyzed: false,
        createdAt: new Date().toISOString(),
    };
    const saved = await Store.saveUpload(item);
    if (!saved) {
        if (submitBtn) submitBtn.disabled = false;
        await _showStorageError();
        return;
    }
    window.location.href = "/catalog";
}

function _loadForEdit(id) {
    const item = Store.findUpload(id);
    if (!item) return;
    STATE.editId = id;
    STATE.fileName = item.title + "." + (item.format || "png").toLowerCase();
    STATE.fileSize = item.size || null;
    STATE.dataUrl = item.image || null;
    STATE.tags = [...(item.tags || [])];
    STATE.width = item.width || null;
    STATE.height = item.height || null;

    _$("meta-title").value = item.title || "";
    _$("meta-author").value = item.author || "";
    _$("meta-date").value = _formatDateForInput(item.date);
    _renderTags();
    _renderPreview();
    _updateSubmit();
    _setCancelActive(true);

    const submitBtn = _$("btn-submit");
    if (submitBtn) {
        submitBtn.setAttribute("data-i18n", "upload.saveChanges");
        submitBtn.textContent = _t("upload.saveChanges");
    }

    const titleEl = document.querySelector(".upload__column-title");
    if (titleEl) {
        titleEl.setAttribute("data-i18n", "upload.editTitle");
        titleEl.textContent = _t("upload.editTitle");
    }
}

function _bootUploadPage() {
    _initDropzone();
    _initMetaInputs();
    _$("btn-submit").addEventListener("click", () => void _submit());
    _$("btn-cancel").addEventListener("click", _reset);

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId) _loadForEdit(editId);
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.Store && Store.ready) Store.ready.then(_bootUploadPage);
    else _bootUploadPage();
});

document.addEventListener("i18n:change", () => {
    if (window.I18n) window.I18n.applyI18n();
    _renderPreview();
});
