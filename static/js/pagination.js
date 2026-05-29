/**
 * Нумерованная пагинация: «Назад» · 1 2 3 · «Вперёд».
 */

function _paginationT(key, vars) {
    return window.I18n ? window.I18n.t(key, vars) : key;
}

function _paginationPageWindow(current, total, maxVisible) {
    const limit = maxVisible || 5;
    if (total <= limit) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    let start = Math.max(1, current - Math.floor(limit / 2));
    let end = start + limit - 1;
    if (end > total) {
        end = total;
        start = Math.max(1, end - limit + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.wrap
 * @param {number} opts.current
 * @param {number} opts.totalItems
 * @param {number} opts.pageSize
 * @param {(page: number) => void} opts.onChange
 * @param {() => void} [opts.onHide]
 * @param {() => void} [opts.onShow]
 */
function renderNumberPagination(opts) {
    const wrap = opts.wrap;
    if (!wrap) return;

    const pages = Math.max(1, Math.ceil(opts.totalItems / opts.pageSize));
    wrap.setAttribute("aria-label", _paginationT("pagination.pagesAria"));
    wrap.classList.remove("pagination--slider", "pagination--bar");
    wrap.classList.add("pagination--numbers");

    if (opts.totalItems === 0 || pages <= 1) {
        wrap.innerHTML = "";
        if (opts.onHide) opts.onHide();
        return;
    }

    if (opts.onShow) opts.onShow();
    const cur = Math.min(Math.max(1, opts.current), pages);
    const nums = _paginationPageWindow(cur, pages, 5);
    const numsHtml = nums
        .map(
            (n) =>
                `<button type="button" class="pagination__btn${n === cur ? " is-active" : ""}" data-page-num="${n}" aria-current="${n === cur ? "page" : "false"}">${n}</button>`,
        )
        .join("");

    wrap.innerHTML = `
        <button type="button" class="pagination__edge" data-page="prev"${cur <= 1 ? " disabled" : ""}>${_paginationT("pagination.prev")}</button>
        <div class="pagination__nums" role="group">${numsHtml}</div>
        <button type="button" class="pagination__edge" data-page="next"${cur >= pages ? " disabled" : ""}>${_paginationT("pagination.next")}</button>`;

    wrap.querySelectorAll("[data-page-num]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const page = Number(btn.getAttribute("data-page-num"));
            if (!Number.isFinite(page) || page === cur) return;
            opts.onChange(page);
        });
    });

    wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            const target = btn.getAttribute("data-page");
            if (target === "prev") opts.onChange(Math.max(1, cur - 1));
            else if (target === "next") opts.onChange(Math.min(pages, cur + 1));
        });
    });
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.wrap
 * @param {number} opts.current
 * @param {number} opts.totalItems
 * @param {number} opts.pageSize
 * @param {(page: number) => void} opts.onChange
 * @param {() => void} [opts.onHide]
 * @param {() => void} [opts.onShow]
 * @param {string} [opts.sliderId]
 * @param {string} [opts.sliderValId]
 */
function renderSliderPagination(opts) {
    const wrap = opts.wrap;
    if (!wrap) return;

    const pages = Math.max(1, Math.ceil(opts.totalItems / opts.pageSize));
    wrap.setAttribute("aria-label", _paginationT("pagination.pagesAria"));
    wrap.classList.remove("pagination--numbers", "pagination--bar");
    wrap.classList.add("pagination--slider");

    if (opts.totalItems === 0 || pages <= 1) {
        wrap.innerHTML = "";
        if (opts.onHide) opts.onHide();
        return;
    }

    if (opts.onShow) opts.onShow();
    const cur = Math.min(Math.max(1, opts.current), pages);
    const sliderId = opts.sliderId || "page-slider";
    const valId = opts.sliderValId || "page-slider-val";
    const valLabel = _paginationT("pagination.pageOf", { current: cur, total: pages });

    wrap.innerHTML = `
        <button type="button" class="pagination__edge" data-page="prev"${cur <= 1 ? " disabled" : ""}>${_paginationT("pagination.prev")}</button>
        <div class="pagination__pages">
            <input type="range" class="pagination__slider" id="${sliderId}" min="1" max="${pages}" step="1" value="${cur}">
            <div class="pagination__slider-val" id="${valId}">${valLabel}</div>
        </div>
        <button type="button" class="pagination__edge" data-page="next"${cur >= pages ? " disabled" : ""}>${_paginationT("pagination.next")}</button>`;

    const slider = wrap.querySelector(`#${sliderId}`);
    const valEl = wrap.querySelector(`#${valId}`);

    function _syncSliderUi(p) {
        const safe = Math.min(Math.max(1, p), pages);
        const v = _paginationT("pagination.pageOf", { current: safe, total: pages });
        const a = _paginationT("pagination.sliderAria", { current: safe, total: pages });
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
            opts.onChange(Number(slider.value));
        });
    }

    wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            const target = btn.getAttribute("data-page");
            if (target === "prev") opts.onChange(Math.max(1, cur - 1));
            else if (target === "next") opts.onChange(Math.min(pages, cur + 1));
        });
    });
}

window.TeremPagination = { renderNumberPagination, renderSliderPagination };
