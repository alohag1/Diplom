function _closeAllDropdowns(except) {
    document.querySelectorAll(".dropdown.is-open").forEach((dd) => {
        if (dd !== except) dd.classList.remove("is-open");
    });
}

function _initDropdown(root) {
    const toggle = root.querySelector(".dropdown__toggle");
    const label = root.querySelector(".dropdown__label");
    const options = root.querySelectorAll(".dropdown__option");
    if (!toggle) return;

    toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = !root.classList.contains("is-open");
        _closeAllDropdowns(root);
        root.classList.toggle("is-open", willOpen);
    });

    options.forEach((option) => {
        option.addEventListener("click", () => {
            options.forEach((o) => o.classList.remove("is-active"));
            option.classList.add("is-active");
            const value = option.getAttribute("data-value");
            const text = option.textContent.trim();
            if (label) label.textContent = text;
            root.dataset.value = value || "";
            root.classList.remove("is-open");
            root.dispatchEvent(new CustomEvent("dropdown:change", { detail: { value, text } }));
        });
    });
}

document.addEventListener("click", () => _closeAllDropdowns());

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".dropdown").forEach(_initDropdown);
});
