const PROFILE_STATE = {
    recent: [],
    page: 0,
    perPage: 3,
};

function _t(key, vars) {
    return window.I18n ? window.I18n.t(key, vars) : key;
}

function _activateTab(name) {
    document.querySelectorAll(".profile-tab").forEach((tab) => {
        const isActive = tab.dataset.tab === name;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document.querySelectorAll(".profile-panel").forEach((panel) => {
        const isActive = panel.dataset.panel === name;
        panel.classList.toggle("is-active", isActive);
        if (isActive) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
    });
    if (history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", name);
        history.replaceState(null, "", url.toString());
    }
}

function _initTabs() {
    document.querySelectorAll(".profile-tab").forEach((tab) => {
        tab.addEventListener("click", () => _activateTab(tab.dataset.tab));
    });
    document.querySelectorAll("[data-go-tab]").forEach((btn) => {
        btn.addEventListener("click", () => _activateTab(btn.dataset.goTab));
    });

    const params = new URLSearchParams(window.location.search);
    const initial = params.get("tab");
    if (initial) _activateTab(initial);
}

function _initToggles() {
    document.querySelectorAll("[data-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const on = !btn.classList.contains("is-on");
            btn.classList.toggle("is-on", on);
            btn.setAttribute("aria-checked", on ? "true" : "false");
        });
    });
}

function _initSettingsNav() {
    const links = document.querySelectorAll(".settings-side__link");
    links.forEach((link) => {
        link.addEventListener("click", () => {
            const anchor = link.dataset.anchor;
            links.forEach((l) => l.classList.toggle("is-active", l === link));
            const target = document.getElementById("set-" + anchor);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });
}

function _getReportScore(report) {
    if (typeof report.score === "number") return report.score;
    if (typeof report.overall_score === "number") return report.overall_score;
    return null;
}

function _renderStats(reports) {
    const week = 7 * 86_400_000;
    const now = Date.now();

    const total = reports.length;
    const recentCount = reports.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return !isNaN(t) && now - t <= week;
    }).length;

    const scores = reports
        .map(_getReportScore)
        .filter((s) => typeof s === "number" && !isNaN(s));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const totalEl = document.getElementById("stat-total");
    const trendEl = document.getElementById("stat-total-trend");
    const avgEl = document.getElementById("stat-avg");
    const avgSubEl = document.getElementById("stat-avg-sub");

    if (totalEl) totalEl.textContent = String(total);
    if (trendEl) {
        if (recentCount > 0) {
            trendEl.textContent = _t("profile.trend.up", { n: recentCount });
            trendEl.removeAttribute("data-i18n");
            trendEl.classList.add("profile-stat-card__trend--up");
        } else {
            trendEl.textContent = _t("profile.noWeek");
            trendEl.setAttribute("data-i18n", "profile.noWeek");
            trendEl.classList.remove("profile-stat-card__trend--up");
        }
    }
    if (avgEl) {
        avgEl.textContent = scores.length ? avg.toFixed(1) : "0";
        avgEl.classList.toggle("profile-stat-card__value--good", scores.length > 0 && avg >= 4);
    }
    if (avgSubEl) {
        let key;
        if (!scores.length) key = "profile.noData";
        else if (avg >= 4.5) key = "profile.score.veryGood";
        else if (avg >= 4) key = "profile.score.good";
        else if (avg >= 3) key = "profile.score.ok";
        else key = "profile.score.low";
        avgSubEl.setAttribute("data-i18n", key);
        avgSubEl.textContent = _t(key);
    }
}

function _renderRecentPage() {
    const list = document.getElementById("recent-list");
    const empty = document.getElementById("recent-empty");
    const pager = document.getElementById("recent-pager");
    if (!list || !empty || !pager) return;

    const all = PROFILE_STATE.recent;

    if (all.length === 0) {
        list.classList.add("is-hidden");
        pager.classList.add("is-hidden");
        empty.classList.remove("is-hidden");
        list.innerHTML = "";
        pager.innerHTML = "";
        return;
    }

    list.classList.remove("is-hidden");
    empty.classList.add("is-hidden");

    const pageSize = PROFILE_STATE.perPage;
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    if (PROFILE_STATE.page >= pages) PROFILE_STATE.page = pages - 1;
    if (PROFILE_STATE.page < 0) PROFILE_STATE.page = 0;

    const start = PROFILE_STATE.page * pageSize;
    const slice = all.slice(start, start + pageSize);

    list.innerHTML = slice
        .map((r) => {
            const rawScore = _getReportScore(r);
            const score = typeof rawScore === "number" ? rawScore.toFixed(1) : "—";
            const scoreClass = typeof rawScore === "number" && rawScore < 4
                ? "profile-recent__score--mid"
                : "";
            const date = r.date || (window.Store && window.Store.formatDate(r.createdAt)) || "";
            const sub = r.description || r.author || "—";
            return `
                <li class="profile-recent__item">
                    <div class="profile-recent__media">
                        <img src="${r.image || ""}" alt="${r.title || ""}">
                    </div>
                    <div>
                        <div class="profile-recent__title">${r.title || "—"}</div>
                        <div class="profile-recent__sub">${sub}</div>
                    </div>
                    <div class="profile-recent__score ${scoreClass}">${score}</div>
                    <div class="profile-recent__date">${date}</div>
                    <span class="profile-recent__chevron" data-icon="chevronRight"></span>
                </li>
            `;
        })
        .join("");

    if (window.Icons) window.Icons.inject(list);

    if (pages > 1) {
        pager.classList.remove("is-hidden");
        pager.innerHTML = Array.from({ length: pages }, (_, i) =>
            `<button class="profile-recent__dot ${i === PROFILE_STATE.page ? "is-active" : ""}" type="button" data-dot="${i}" aria-label="${_t("profile.recent.page", { n: i + 1 })}"></button>`,
        ).join("");
        pager.querySelectorAll("[data-dot]").forEach((dot) => {
            dot.addEventListener("click", () => {
                PROFILE_STATE.page = Number(dot.dataset.dot) || 0;
                _renderRecentPage();
            });
        });
    } else {
        pager.classList.add("is-hidden");
        pager.innerHTML = "";
    }
}

function _renderOverview() {
    const reports = (window.Store && window.Store.getReports()) || [];
    PROFILE_STATE.recent = reports;
    PROFILE_STATE.page = 0;
    _renderStats(reports);
    _renderRecentPage();
}

function _initSaveProfile() {
    const btn = document.getElementById("btn-save-profile");
    if (!btn) return;
    btn.addEventListener("click", () => {
        const original = _t("settings.profile.save");
        btn.textContent = _t("settings.profile.saved");
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
        }, 1500);
    });
}

function _initPasswordSection() {
    const toggle = document.getElementById("btn-toggle-password");
    const form = document.getElementById("password-form");
    const cancel = document.getElementById("btn-cancel-password");
    const hint = document.getElementById("pwd-hint");
    const cur = document.getElementById("pwd-current");
    const next = document.getElementById("pwd-new");
    const confirm = document.getElementById("pwd-confirm");
    if (!toggle || !form) return;

    function close() {
        form.classList.add("is-hidden");
        toggle.classList.remove("is-open");
        if (hint) {
            hint.textContent = "";
            hint.classList.remove("is-error", "is-success");
        }
        form.reset();
    }

    toggle.addEventListener("click", () => {
        const open = form.classList.contains("is-hidden");
        form.classList.toggle("is-hidden", !open);
        toggle.classList.toggle("is-open", open);
    });

    if (cancel) cancel.addEventListener("click", close);

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const newPwd = next ? next.value : "";
        const confirmPwd = confirm ? confirm.value : "";
        if (!hint) return;
        hint.classList.remove("is-error", "is-success");
        if (newPwd.length < 6) {
            hint.textContent = _t("settings.security.errMin");
            hint.classList.add("is-error");
            return;
        }
        if (newPwd !== confirmPwd) {
            hint.textContent = _t("settings.security.errMatch");
            hint.classList.add("is-error");
            return;
        }
        hint.textContent = _t("settings.security.ok");
        hint.classList.add("is-success");
        setTimeout(close, 1200);
    });
}

function _initLocaleDropdown() {
    const dd = document.getElementById("dd-locale");
    if (!dd) return;
    const current = (window.I18n && window.I18n.currentLang()) || "ru";
    const label = dd.querySelector(".dropdown__label");

    function _label(value) {
        return value === "en" ? "English" : "Русский";
    }

    dd.querySelectorAll(".dropdown__option").forEach((opt) => {
        opt.classList.toggle("is-active", opt.dataset.value === current);
    });
    if (label) label.textContent = _label(current);

    dd.addEventListener("dropdown:change", (e) => {
        const lang = e.detail.value;
        if (window.I18n) window.I18n.setLanguage(lang);
        if (label) label.textContent = _label(lang);
        _renderOverview();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    _initTabs();
    _initToggles();
    _initSettingsNav();
    _renderOverview();
    _initSaveProfile();
    _initPasswordSection();
    _initLocaleDropdown();

    document.addEventListener("i18n:change", () => {
        _renderOverview();
    });
});
