/**
 * Модальные окна подтверждения и уведомления (без нативного confirm/alert).
 */

function _t(key) {
    return window.I18n ? window.I18n.t(key) : key;
}

/** @type {(() => void) | null} */
let _closeActive = null;

function _root() {
    let el = document.getElementById("terem-app-dialog");
    if (el) return el;
    el = document.createElement("div");
    el.id = "terem-app-dialog";
    el.className = "app-dialog is-hidden";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
        <div class="app-dialog__backdrop" data-app-dialog-dismiss="1"></div>
        <div class="app-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="terem-app-dialog-title">
            <p class="app-dialog__title" id="terem-app-dialog-title"></p>
            <p class="app-dialog__text" id="terem-app-dialog-text"></p>
            <div class="app-dialog__actions" id="terem-app-dialog-actions"></div>
        </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.getAttribute && t.getAttribute("data-app-dialog-dismiss")) {
            if (_closeActive) _closeActive();
        }
    });
    return el;
}

function _setBodyText(titleEl, textEl, title, message) {
    const hasBody = Boolean(message && String(message).trim());
    if (titleEl) {
        titleEl.textContent = title;
        titleEl.classList.toggle("app-dialog__title--solo", !hasBody);
    }
    if (textEl) {
        textEl.textContent = hasBody ? String(message).trim() : "";
        textEl.classList.toggle("is-hidden", !hasBody);
    }
}

function _onEscape(e) {
    if (e.key !== "Escape") return;
    const el = document.getElementById("terem-app-dialog");
    if (!el || el.classList.contains("is-hidden")) return;
    e.preventDefault();
    if (_closeActive) _closeActive();
}

document.addEventListener("keydown", _onEscape);

/**
 * @param {{ title: string; message?: string; okKey?: string }} opts
 * @returns {Promise<void>}
 */
function openAlertDialog(opts) {
    return new Promise((resolve) => {
        const root = _root();
        const finish = () => {
            root.classList.add("is-hidden");
            root.setAttribute("aria-hidden", "true");
            document.body.classList.remove("no-scroll");
            _closeActive = null;
            resolve();
        };
        _closeActive = finish;

        const titleEl = root.querySelector("#terem-app-dialog-title");
        const textEl = root.querySelector("#terem-app-dialog-text");
        const actions = root.querySelector("#terem-app-dialog-actions");
        _setBodyText(titleEl, textEl, opts.title, opts.message || "");
        const okLabel = opts.okKey ? _t(opts.okKey) : _t("common.ok");
        if (actions) {
            actions.innerHTML = `<button type="button" class="btn btn--dialog-confirm" data-app-dialog-ok="1">${okLabel}</button>`;
            actions.querySelector("[data-app-dialog-ok]")?.addEventListener("click", finish);
        }
        root.classList.remove("is-hidden");
        root.setAttribute("aria-hidden", "false");
        document.body.classList.add("no-scroll");
        const btn = root.querySelector("[data-app-dialog-ok]");
        if (btn) setTimeout(() => btn.focus(), 30);
    });
}

/**
 * @param {{ title: string; message?: string; confirmKey?: string; cancelKey?: string }} opts
 * @returns {Promise<boolean>}
 */
function openConfirmDialog(opts) {
    return new Promise((resolve) => {
        const root = _root();
        const done = (value) => {
            root.classList.add("is-hidden");
            root.setAttribute("aria-hidden", "true");
            document.body.classList.remove("no-scroll");
            _closeActive = null;
            resolve(value);
        };
        _closeActive = () => done(false);

        const titleEl = root.querySelector("#terem-app-dialog-title");
        const textEl = root.querySelector("#terem-app-dialog-text");
        const actions = root.querySelector("#terem-app-dialog-actions");
        _setBodyText(titleEl, textEl, opts.title, opts.message || "");
        const cancelLabel = opts.cancelKey ? _t(opts.cancelKey) : _t("common.cancel");
        const confirmLabel = opts.confirmKey ? _t(opts.confirmKey) : _t("dialog.delete");
        if (actions) {
            actions.innerHTML = `
                <button type="button" class="btn btn--dialog-cancel" data-app-dialog-cancel="1">${cancelLabel}</button>
                <button type="button" class="btn btn--dialog-confirm" data-app-dialog-confirm="1">${confirmLabel}</button>`;
            actions.querySelector("[data-app-dialog-cancel]")?.addEventListener("click", () => done(false));
            actions.querySelector("[data-app-dialog-confirm]")?.addEventListener("click", () => done(true));
        }
        root.classList.remove("is-hidden");
        root.setAttribute("aria-hidden", "false");
        document.body.classList.add("no-scroll");
        const c = root.querySelector("[data-app-dialog-confirm]");
        if (c) setTimeout(() => c.focus(), 30);
    });
}

function _escapeHtmlAttr(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * @param {{
 *   title: string;
 *   message?: string;
 *   options: Array<{
 *     value: string;
 *     label: string;
 *     description?: string;
 *     current?: boolean;
 *     currentLabel?: string;
 *   }>;
 *   cancelKey?: string;
 * }} opts
 * @returns {Promise<string | null>}
 */
function openSelectDialog(opts) {
    return new Promise((resolve) => {
        const root = _root();
        const done = (value) => {
            root.classList.add("is-hidden");
            root.setAttribute("aria-hidden", "true");
            document.body.classList.remove("no-scroll");
            _closeActive = null;
            resolve(value);
        };
        _closeActive = () => done(null);

        const titleEl = root.querySelector("#terem-app-dialog-title");
        const textEl = root.querySelector("#terem-app-dialog-text");
        const actions = root.querySelector("#terem-app-dialog-actions");
        _setBodyText(titleEl, textEl, opts.title, opts.message || "");
        const cancelLabel = opts.cancelKey ? _t(opts.cancelKey) : _t("common.cancel");
        const options = Array.isArray(opts.options) ? opts.options : [];
        if (actions) {
            const optionsHtml = options
                .map((o) => {
                    const value = _escapeHtmlAttr(String(o.value));
                    const label = _escapeHtmlAttr(String(o.label));
                    const desc = o.description ? _escapeHtmlAttr(String(o.description)) : "";
                    const current = Boolean(o.current);
                    const currentLabel = o.currentLabel
                        ? _escapeHtmlAttr(String(o.currentLabel))
                        : _t("common.current");
                    const badge = current
                        ? `<span class="app-dialog__option-badge">${currentLabel}</span>`
                        : "";
                    const descHtml = desc
                        ? `<span class="app-dialog__option-desc">${desc}</span>`
                        : "";
                    return `<button type="button" class="app-dialog__option${current ? " is-current" : ""}" data-app-dialog-option="${value}">
                        <span class="app-dialog__option-main">
                            <span class="app-dialog__option-label">${label}</span>
                            ${descHtml}
                        </span>
                        ${badge}
                    </button>`;
                })
                .join("");
            actions.innerHTML = `
                <div class="app-dialog__options">${optionsHtml}</div>
                <button type="button" class="btn btn--dialog-cancel" data-app-dialog-cancel="1">${cancelLabel}</button>`;
            actions.querySelectorAll("[data-app-dialog-option]").forEach((btn) => {
                btn.addEventListener("click", () => done(btn.getAttribute("data-app-dialog-option")));
            });
            actions.querySelector("[data-app-dialog-cancel]")?.addEventListener("click", () => done(null));
        }
        root.classList.remove("is-hidden");
        root.setAttribute("aria-hidden", "false");
        document.body.classList.add("no-scroll");
        const first = root.querySelector("[data-app-dialog-option].is-current")
            || root.querySelector("[data-app-dialog-option]");
        if (first) setTimeout(() => first.focus(), 30);
    });
}

window.TeremDialog = { openAlertDialog, openConfirmDialog, openSelectDialog };
