function _initHeaderToggle() {
    const header = document.querySelector(".header");
    const toggle = document.querySelector(".header__toggle");
    if (!header || !toggle) return;
    toggle.addEventListener("click", () => header.classList.toggle("is-open"));
    document.addEventListener("click", (event) => {
        if (!header.contains(event.target)) header.classList.remove("is-open");
    });
}

function _highlightActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll(".header__nav-link").forEach((link) => {
        if (link.classList.contains("header__nav-link--logout")) return;
        const href = link.getAttribute("href");
        if (!href) return;
        if (href === path || (href !== "/" && path.startsWith(href))) {
            link.classList.add("is-active");
        } else {
            link.classList.remove("is-active");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    _initHeaderToggle();
    _highlightActiveNav();
});
