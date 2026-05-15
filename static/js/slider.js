function _activate(slides, dots, index) {
    slides.forEach((slide, i) => {
        slide.classList.toggle("is-active", i === index);
    });
    dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === index);
    });
}

function _initSlider(root) {
    const slides = Array.from(root.querySelectorAll(".slider__slide"));
    const dots = Array.from(root.querySelectorAll(".slider__dot"));
    if (slides.length === 0) return;

    const delay = parseInt(root.dataset.delay, 10) || 2500;
    let current = 0;
    let timer = null;

    const goTo = (index) => {
        current = (index + slides.length) % slides.length;
        _activate(slides, dots, current);
    };

    const next = () => goTo(current + 1);

    const start = () => {
        stop();
        timer = window.setInterval(next, delay);
    };

    const stop = () => {
        if (timer) {
            window.clearInterval(timer);
            timer = null;
        }
    };

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            goTo(i);
            start();
        });
    });

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stop();
        } else {
            start();
        }
    });

    _activate(slides, dots, 0);
    start();
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-slider]").forEach(_initSlider);
});
