import { useLayoutEffect, useRef } from 'react';

export function useAboutMotion() {
    const rootRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || typeof IntersectionObserver === 'undefined') return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const desktop = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
        const sections = [...root.querySelectorAll<HTMLElement>('[data-about-reveal]')];
        const layers = [...root.querySelectorAll<HTMLElement>('[data-about-parallax]')].map(element => ({
            element,
            anchor: element.closest('section') || element,
            speed: Number(element.dataset.aboutParallax) || 0.04,
        }));
        const hero = root.querySelector('.about-story__hero');
        let dispose = () => {};

        const reveal = (element: HTMLElement) => {
            element.classList.remove('about-reveal-pending');
            element.classList.add('about-reveal-visible');
        };

        const configure = () => {
            dispose();
            if (reduced.matches) {
                sections.forEach(reveal);
                return;
            }

            root.classList.add('about-story--motion-ready');
            const revealObserver = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    reveal(entry.target as HTMLElement);
                    revealObserver.unobserve(entry.target);
                }
            }, { rootMargin: '0px 0px -48px 0px', threshold: 0 });
            sections.forEach(section => {
                if (section.classList.contains('about-reveal-visible')) return;
                section.classList.add('about-reveal-pending');
                revealObserver.observe(section);
            });

            // Keyboard navigation and the reading-guide shortcut never wait for a reveal.
            const onFocus = (event: FocusEvent) => {
                const section = (event.target as Element).closest<HTMLElement>('[data-about-reveal]');
                if (section) { reveal(section); revealObserver.unobserve(section); }
            };
            root.addEventListener('focusin', onFocus);

            const heroObserver = new IntersectionObserver(([entry]) => {
                root.classList.toggle('about-story--hero-outside', !entry.isIntersecting);
            });
            if (hero) heroObserver.observe(hero);
            const onVisibility = () => root.classList.toggle('about-story--motion-paused', document.hidden);
            onVisibility();
            document.addEventListener('visibilitychange', onVisibility);

            let frame = 0;
            const updateParallax = () => {
                frame = 0;
                if (document.hidden) return;
                const viewportHeight = window.innerHeight;
                // Batch geometry reads before writes; only decorative layers move.
                const offsets = layers.map(layer => {
                    const rect = layer.anchor.getBoundingClientRect();
                    if (rect.bottom < 0 || rect.top > viewportHeight) return null;
                    return Math.max(-20, Math.min(20, (viewportHeight / 2 - rect.top - rect.height / 2) * layer.speed));
                });
                layers.forEach((layer, index) => {
                    if (offsets[index] !== null) layer.element.style.setProperty('--about-parallax-y', `${offsets[index]!.toFixed(2)}px`);
                });
            };
            const scheduleParallax = () => { if (!frame) frame = requestAnimationFrame(updateParallax); };
            const enableParallax = desktop.matches;
            if (enableParallax) {
                root.classList.add('about-story--parallax-enabled');
                window.addEventListener('scroll', scheduleParallax, { passive: true });
                window.addEventListener('resize', scheduleParallax, { passive: true });
                scheduleParallax();
            }

            dispose = () => {
                revealObserver.disconnect(); heroObserver.disconnect();
                root.removeEventListener('focusin', onFocus);
                document.removeEventListener('visibilitychange', onVisibility);
                window.removeEventListener('scroll', scheduleParallax);
                window.removeEventListener('resize', scheduleParallax);
                if (frame) cancelAnimationFrame(frame);
                sections.forEach(section => section.classList.remove('about-reveal-pending'));
                layers.forEach(layer => layer.element.style.removeProperty('--about-parallax-y'));
                root.classList.remove('about-story--motion-ready', 'about-story--parallax-enabled', 'about-story--hero-outside', 'about-story--motion-paused');
            };
        };

        configure();
        reduced.addEventListener('change', configure);
        desktop.addEventListener('change', configure);
        return () => {
            dispose();
            reduced.removeEventListener('change', configure);
            desktop.removeEventListener('change', configure);
        };
    }, []);

    return rootRef;
}
