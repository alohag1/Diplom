const MODAL_IDS = ["modal-login", "modal-register", "modal-recover"];

function _findModal(id) {
    return document.getElementById(id);
}

function _closeAll() {
    MODAL_IDS.forEach((id) => {
        const m = _findModal(id);
        if (m) m.classList.remove("is-open");
    });
    document.body.classList.remove("no-scroll");
}

function openModal(id) {
    _closeAll();
    const modal = _findModal(id);
    if (!modal) return;
    modal.classList.add("is-open");
    document.body.classList.add("no-scroll");
    const firstInput = modal.querySelector("input");
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function _bindCloseHandlers() {
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
        btn.addEventListener("click", _closeAll);
    });
    MODAL_IDS.forEach((id) => {
        const modal = _findModal(id);
        if (!modal) return;
        modal.addEventListener("click", (event) => {
            if (event.target === modal) _closeAll();
        });
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") _closeAll();
    });
}

function _bindOpenHandlers() {
    document.querySelectorAll("[data-modal-open]").forEach((trigger) => {
        const targetId = trigger.getAttribute("data-modal-open");
        trigger.addEventListener("click", (event) => {
            event.preventDefault();
            openModal(targetId);
        });
    });
}

function _setToggleIcon(btn, isVisible) {
    if (!window.Icons) return;
    btn.innerHTML = window.Icons.get(isVisible ? "eye" : "eyeOff");
}

function _bindPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
        const wrapper = btn.closest(".field__control");
        const input = wrapper ? wrapper.querySelector("input") : null;
        const initiallyVisible = input ? input.type !== "password" : false;
        _setToggleIcon(btn, initiallyVisible);
        btn.classList.toggle("is-shown", initiallyVisible);

        btn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!input) return;
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            btn.classList.toggle("is-shown", isPassword);
            _setToggleIcon(btn, isPassword);
        });
    });
}

function _enableSubmitOnFill(form) {
    if (!form) return;
    const submit = form.querySelector("[data-submit]");
    if (!submit) return;
    const inputs = form.querySelectorAll("input[required]");
    const update = () => {
        const allFilled = Array.from(inputs).every(
            (input) => input.value.trim().length > 0,
        );
        submit.disabled = !allFilled;
        submit.classList.toggle("is-active", allFilled);
    };
    inputs.forEach((input) => input.addEventListener("input", update));
    update();
}

function _bindForms() {
    document.querySelectorAll("[data-auth-form]").forEach((form) => {
        _enableSubmitOnFill(form);
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const target = form.getAttribute("data-redirect") || "/home";
            window.location.href = target;
        });
    });
}

function _initAuth() {
    _bindCloseHandlers();
    _bindOpenHandlers();
    _bindPasswordToggles();
    _bindForms();
}

document.addEventListener("DOMContentLoaded", _initAuth);
