const CAT_STATE = {
    query: "",
    date: "all",
    status: "all",
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

function _filterUploads(items) {
    const query = CAT_STATE.query.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 86_400_000;
    const map = { week: 7 * dayMs, month: 31 * dayMs, year: 365 * dayMs };

    return items.filter((item) => {
        if (query) {
            const haystack = [item.title, item.author, item.description, ...(item.tags || [])]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            if (!haystack.includes(query)) return false;
        }

        if (CAT_STATE.date !== "all") {
            const ts = _itemTimestamp(item);
            const limit = map[CAT_STATE.date];
            if (limit != null && now - ts > limit) return false;
        }

        if (CAT_STATE.status !== "all") {
            if (CAT_STATE.status === "analyzed" && !item.analyzed) return false;
            if (CAT_STATE.status === "not-analyzed" && item.analyzed) return false;
            if (CAT_STATE.status === "in-progress" && item.status !== "in-progress") return false;
        }

        return true;
    });
}

function _escapeHtml(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function _renderCard(item) {
    const tags = (item.tags || [])
        .map((t) => `<span class="tag">${_escapeHtml(t)}</span>`)
        .join("");
    const desc = (item.description || "").trim();
    const descHtml = desc
        ? `<p class="card__desc">${_escapeHtml(desc)}</p>`
        : "";

    return `
        <article class="card card--catalog" data-id="${item.id}">
            <div class="card__media">
                <img src="${item.image}" alt="${_escapeHtml(item.title)}">
            </div>
            <div class="card__body">
                <div class="card__head">
                    <h3 class="card__title">${_escapeHtml(item.title)}</h3>
                    <span class="card__date">${item.date || Store.formatDate(item.createdAt)}</span>
                </div>
                <span class="card__author">${_escapeHtml(item.author || "—")}</span>
                ${tags ? `<div class="card__tags">${tags}</div>` : ""}
                ${descHtml}
                <div class="card__actions">
                    <button class="btn btn--ghost" type="button" data-action="analyze">${_t("catalog.card.analyze")}</button>
                    <button class="btn-icon" type="button" data-action="edit" aria-label="${_t("catalog.card.editAria")}" data-icon="edit"></button>
                    <button class="btn-icon btn-icon--danger" type="button" data-action="delete" aria-label="${_t("catalog.card.deleteAria")}" data-icon="trash"></button>
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
    const pages = Math.max(1, Math.ceil(total / CAT_STATE.pageSize));
    wrap.setAttribute("aria-label", _t("pagination.pagesAria"));
    if (total === 0 || pages <= 1) {
        wrap.innerHTML = "";
        _togglePagerBar(false);
        return;
    }

    _togglePagerBar(true);
    const cur = CAT_STATE.page;
    const valLabel = _t("pagination.pageOf", { current: cur, total: pages });

    wrap.innerHTML = `
        <button type="button" class="pagination__edge" data-page="prev" ${cur <= 1 ? "disabled" : ""}>${_t("pagination.prev")}</button>
        <div class="pagination__pages">
            <input type="range" class="pagination__slider" id="cat-page-slider" min="1" max="${pages}" step="1" value="${cur}">
            <div class="pagination__slider-val" id="cat-page-slider-val">${valLabel}</div>
        </div>
        <button type="button" class="pagination__edge" data-page="next" ${cur >= pages ? "disabled" : ""}>${_t("pagination.next")}</button>`;

    const slider = wrap.querySelector("#cat-page-slider");
    const valEl = wrap.querySelector("#cat-page-slider-val");

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
            CAT_STATE.page = Number(slider.value);
            _render();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.page;
            if (target === "prev") CAT_STATE.page = Math.max(1, CAT_STATE.page - 1);
            else if (target === "next") CAT_STATE.page = Math.min(pages, CAT_STATE.page + 1);
            _render();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });
}

function _render() {
    const all = Store.getUploads();
    const empty = _$("content-empty");
    const grid = _$("content-grid");
    const filterBar = _$("filter-bar");
    const title = _$("catalog-title");
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

    const filtered = _filterUploads(all);
    const totalPages = Math.max(1, Math.ceil(filtered.length / CAT_STATE.pageSize));
    if (CAT_STATE.page > totalPages) CAT_STATE.page = totalPages;
    const start = (CAT_STATE.page - 1) * CAT_STATE.pageSize;
    const slice = filtered.slice(start, start + CAT_STATE.pageSize);

    if (slice.length === 0) {
        grid.classList.add("is-hidden");
        if (pagination) pagination.innerHTML = "";
        _togglePagerBar(false);
        const note = `<div class="empty"><span class="empty__icon" data-icon="info"></span>
            <h2 class="empty__title">${_t("catalog.filterEmpty.title")}</h2>
            <p class="empty__text">${_t("catalog.filterEmpty.text")}</p></div>`;
        grid.innerHTML = "";
        let placeholder = document.getElementById("filter-empty");
        if (!placeholder) {
            placeholder = document.createElement("div");
            placeholder.id = "filter-empty";
            grid.parentNode.insertBefore(placeholder, grid);
        }
        placeholder.innerHTML = note;
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
                if (action === "analyze") _analyze(id);
                else if (action === "edit") _edit(id);
                else if (action === "delete") _delete(id);
            });
        });
    });
}

function _analyze(id) {
    if (!Store.findUpload(id)) return;
    window.location.href = `/analyze?upload=${encodeURIComponent(id)}&tab=create`;
}

function _edit(id) {
    window.location.href = `/upload?edit=${encodeURIComponent(id)}`;
}

async function _delete(id) {
    let ok = false;
    if (window.TeremDialog) {
        ok = await window.TeremDialog.openConfirmDialog({
            title: _t("dialog.deleteCatalogTitle"),
        });
    } else {
        ok = window.confirm(_t("dialog.deleteCatalogTitle"));
    }
    if (!ok) return;
    Store.deleteUpload(id);
    _render();
}

function _initFilters() {
    _$("search").addEventListener("input", (e) => {
        CAT_STATE.query = e.target.value;
        CAT_STATE.page = 1;
        _render();
    });

    _$("dd-date").addEventListener("dropdown:change", (e) => {
        CAT_STATE.date = e.detail.value;
        CAT_STATE.page = 1;
        _render();
    });

    _$("dd-status").addEventListener("dropdown:change", (e) => {
        CAT_STATE.status = e.detail.value;
        CAT_STATE.page = 1;
        _render();
    });

    _$("btn-reset").addEventListener("click", () => {
        CAT_STATE.query = "";
        CAT_STATE.date = "all";
        CAT_STATE.status = "all";
        CAT_STATE.page = 1;
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
