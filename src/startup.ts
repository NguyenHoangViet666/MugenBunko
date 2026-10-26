const preloader = document.getElementById('startup-preloader');
const appRoot = document.getElementById('root');
const skipButton = document.getElementById('startup-preloader-skip') as HTMLButtonElement | null;
const status = document.getElementById('startup-preloader-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const startedAt = performance.now();
let signaled = false;
let leaving = false;
let readyTimer = 0;
let fontTimer = 0;

// Apply the saved palette before the application finishes its first render.
try {
    const theme = localStorage.getItem('mugen_theme');
    if (theme && ['washi', 'sepia', 'charcoal'].includes(theme)) {
        document.body.classList.remove('theme-washi', 'theme-sepia', 'theme-charcoal');
        document.body.classList.add(`theme-${theme}`);
    }
} catch { /* The opening also works when browser storage is unavailable. */ }

function revealApplication() {
    if (leaving || !preloader) return;
    leaving = true;
    window.clearTimeout(readyTimer);
    window.clearTimeout(fontTimer);
    window.clearTimeout(maximumTimer);
    const restoreFocus = document.activeElement === skipButton;
    if (skipButton) skipButton.disabled = true;
    preloader.dataset.state = 'leaving';

    window.setTimeout(() => {
        if (appRoot) {
            appRoot.inert = false;
            appRoot.removeAttribute('aria-hidden');
            appRoot.removeAttribute('aria-busy');
        }
        preloader.remove();
        skipButton?.removeEventListener('click', revealApplication);

        // Preserve deep-link focus without changing the reader's restored scroll.
        const section = window.location.hash.match(/^#\/rules\?section=([1-9]\d*)$/)?.[1];
        const ruleHeading = section ? document.querySelector<HTMLElement>(`#rule-${section} h2`) : null;
        if (ruleHeading) ruleHeading.focus({ preventScroll: true });
        else if (restoreFocus && appRoot) {
            const target = appRoot.querySelector<HTMLElement>('main') || appRoot;
            const previousTabIndex = target.getAttribute('tabindex');
            target.tabIndex = -1;
            target.focus({ preventScroll: true });
            target.addEventListener('blur', () => {
                if (previousTabIndex === null) target.removeAttribute('tabindex');
                else target.setAttribute('tabindex', previousTabIndex);
            }, { once: true });
        }
    }, reducedMotion.matches ? 120 : 680);
}

// A slow API or unavailable font must never hold the entrance indefinitely.
const maximumTimer = preloader ? window.setTimeout(revealApplication, 6000) : 0;
skipButton?.addEventListener('click', revealApplication);

export function signalStartupReady() {
    if (signaled || leaving || !preloader) return;
    signaled = true;
    const fonts = document.fonts?.ready || Promise.resolve();
    const fontLimit = new Promise<void>(resolve => { fontTimer = window.setTimeout(resolve, 700); });
    void Promise.race([fonts, fontLimit]).then(() => {
        window.clearTimeout(fontTimer);
        if (leaving) return;
        preloader.dataset.ready = 'true';
        if (status) status.textContent = 'Câu chuyện đã sẵn sàng';
        const minimumDuration = reducedMotion.matches ? 200 : 1450;
        readyTimer = window.setTimeout(revealApplication, Math.max(0, minimumDuration - (performance.now() - startedAt)));
    });
}
