/**
 * Оверлей с карточкой тарифа: блокировка функций, лимиты, смена плана.
 */

const PLAN_CARD_CLASS = {
    free: "",
    basic: "plan-card--wine",
    pro: "plan-card--violet",
};

const PLAN_PRICE = {
    free: "0 ₽",
    basic: "300 ₽",
    pro: "800 ₽",
};

const PLAN_FEATURE_KEYS = {
    free: ["subs.free.f1", "subs.free.f2", "subs.free.f3", "subs.free.f4"],
    basic: [
        "subs.basic.f1",
        "subs.basic.f2",
        "subs.basic.f3",
        "subs.basic.f4",
        "subs.basic.f5",
        "subs.basic.f6",
    ],
    pro: [
        "subs.pro.f1",
        "subs.pro.f2",
        "subs.pro.f3",
        "subs.pro.f4",
        "subs.pro.f5",
        "subs.pro.f6",
        "subs.pro.f7",
    ],
};

const PLAN_OVERLAY_FEATURE_KEYS = {
    free: ["subs.overlay.free.f1", "subs.overlay.free.f2", "subs.overlay.free.f3"],
    basic: [
        "subs.overlay.basic.f1",
        "subs.overlay.basic.f2",
        "subs.overlay.basic.f3",
        "subs.overlay.basic.f4",
        "subs.overlay.basic.f5",
    ],
    pro: [
        "subs.overlay.pro.f1",
        "subs.overlay.pro.f2",
        "subs.overlay.pro.f3",
        "subs.overlay.pro.f4",
        "subs.overlay.pro.f5",
    ],
};

const PLAN_OVERLAY_SUB_KEY = {
    free: "subs.overlay.free.sub",
    basic: "subs.overlay.basic.sub",
    pro: "subs.overlay.pro.sub",
};

const PLAN_SUB_KEY = {
    free: "subs.free.sub",
    basic: "subs.basic.sub",
    pro: "subs.pro.sub",
};

const PLAN_TITLE_KEY = {
    free: "subs.free",
    basic: "subs.basic",
    pro: "subs.pro",
};

function _poT(key, vars) {
    return window.I18n ? window.I18n.t(key, vars) : key;
}

function _poEscape(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function _ensureModalRoot() {
    let root = document.getElementById("terem-plan-modal");
    if (root) return root;

    root = document.createElement("div");
    root.id = "terem-plan-modal";
    root.className = "terem-plan-modal is-hidden";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `<div class="terem-plan-modal__backdrop" data-plan-close></div>
        <div class="terem-plan-modal__panel" role="dialog" aria-modal="true" aria-labelledby="terem-plan-modal-title">
            <button type="button" class="terem-plan-modal__close" data-plan-close aria-label="${_poEscape(_poT("common.close"))}">×</button>
            <div class="terem-plan-modal__callout" id="terem-plan-modal-callout"></div>
            <div class="terem-plan-modal__card-host" id="terem-plan-modal-card"></div>
        </div>`;
    document.body.appendChild(root);

    root.addEventListener("click", (e) => {
        if (e.target.closest("[data-plan-close]")) {
            TeremPlanOverlay.close();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && root && !root.classList.contains("is-hidden")) {
            TeremPlanOverlay.close();
        }
    });

    return root;
}

function _currentPlan() {
    return window.Store && Store.getPlan ? Store.getPlan() : "free";
}

function _renderPlanCardHtml(planId, options) {
    const opts = options || {};
    const id = planId in PLAN_FEATURE_KEYS ? planId : "basic";
    const current = _currentPlan();
    const isCurrent = current === id;
    const cardClass = PLAN_CARD_CLASS[id] || "";
    const extraClass = opts.compact ? " plan-card--overlay" : "";
    const featureKeys = opts.compact
        ? PLAN_OVERLAY_FEATURE_KEYS[id] || PLAN_FEATURE_KEYS[id]
        : PLAN_FEATURE_KEYS[id];
    const subKey = opts.compact ? PLAN_OVERLAY_SUB_KEY[id] || PLAN_SUB_KEY[id] : PLAN_SUB_KEY[id];
    const features = (featureKeys || [])
        .map((key) => `<li>${_poEscape(_poT(key))}</li>`)
        .join("");

    const actionHtml = isCurrent
        ? `<button class="btn btn--block btn--rect btn--soft" type="button" disabled>${_poEscape(_poT("subs.current"))}</button>`
        : `<button class="btn btn--block btn--rect btn--cream" type="button" data-plan-select="${_poEscape(id)}">${_poEscape(_poT("subs.choose"))}</button>`;

    return `<article class="plan-card ${cardClass}${extraClass}">
        <h3 class="plan-card__title">${_poEscape(_poT(PLAN_TITLE_KEY[id]))}</h3>
        <p class="plan-card__sub">${_poEscape(_poT(subKey))}</p>
        <div class="plan-card__price">
            <span class="plan-card__price-value">${_poEscape(PLAN_PRICE[id])}</span>
            <span class="plan-card__price-period">${_poEscape(_poT("subs.permonth"))}</span>
        </div>
        <ul class="plan-card__features">${features}</ul>
        ${actionHtml}
    </article>`;
}

function _bindPlanSelect(host, onSelect) {
    if (!host) return;
    host.querySelectorAll("[data-plan-select]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const planId = btn.getAttribute("data-plan-select");
            if (!planId || !window.Store || !Store.setPlan) return;
            Store.setPlan(planId);
            if (typeof onSelect === "function") onSelect(planId);
            TeremPlanOverlay.close();
        });
    });
}

function _resolveMessage(opts) {
    if (opts.message) return opts.message;
    if (opts.messageKey) return _poT(opts.messageKey, opts.messageVars || {});
    return _poT("analyze.planOverlay.description");
}

function _resolveTitle(opts) {
    if (opts.title) return opts.title;
    if (opts.titleKey) return _poT(opts.titleKey, opts.messageVars || {});
    return _poT("analyze.planOverlay.titleShort");
}

function _renderCalloutHtml(opts) {
    const title = _resolveTitle(opts);
    const message = _resolveMessage(opts);
    return `<div class="plan-overlay-callout">
        <p class="plan-overlay-callout__title">${_poEscape(title)}</p>
        <p class="plan-overlay-callout__message">${_poEscape(message)}</p>
    </div>`;
}

const TeremPlanOverlay = {
    renderPlanCard(planId, options) {
        return _renderPlanCardHtml(planId, options);
    },

    renderInline(host, opts) {
        if (!host) return;
        const planId = opts.planId || "basic";
        host.classList.remove("is-hidden");
        host.setAttribute("aria-hidden", "false");
        host.innerHTML = `<div class="analyze-plan-overlay__inner">
            ${_renderCalloutHtml(opts)}
            <div class="analyze-plan-overlay__card-host">${_renderPlanCardHtml(planId, { compact: true })}</div>
        </div>`;
        _bindPlanSelect(host, opts.onSelect);
    },

    hideInline(host) {
        if (!host) return;
        host.classList.add("is-hidden");
        host.setAttribute("aria-hidden", "true");
        host.innerHTML = "";
    },

    open(opts) {
        const options = opts || {};
        const root = _ensureModalRoot();
        const planId = options.planId || "basic";
        const calloutEl = document.getElementById("terem-plan-modal-callout");
        const cardHost = document.getElementById("terem-plan-modal-card");

        if (calloutEl) calloutEl.innerHTML = _renderCalloutHtml(options);
        if (cardHost) {
            cardHost.innerHTML = _renderPlanCardHtml(planId, { compact: true });
            _bindPlanSelect(cardHost, options.onSelect);
        }

        root.classList.remove("is-hidden");
        root.setAttribute("aria-hidden", "false");
        document.body.classList.add("terem-plan-modal-open");
    },

    close() {
        const root = document.getElementById("terem-plan-modal");
        if (!root) return;
        root.classList.add("is-hidden");
        root.setAttribute("aria-hidden", "true");
        document.body.classList.remove("terem-plan-modal-open");
    },
};

window.TeremPlanOverlay = TeremPlanOverlay;
