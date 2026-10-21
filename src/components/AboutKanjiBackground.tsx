import { useEffect, useRef } from 'react';

export default function AboutKanjiBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Canvas background effect: Floating Japanese Calligraphy glyphs & constellation particles
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number | undefined;
        let width = 0;
        let height = 0;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleResize = () => {
            width = container.clientWidth;
            height = container.clientHeight;
            const scale = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
        };

        handleResize();

        // Particle configuration
        const kanjiList = ['無', '限', '文', '庫', '墨', '夢', '道', '心', '語', '魂', '書', '創', '星', '風'];
        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            opacity: number;
            char: string;
            isKanji: boolean;
            rot: number;
            rotSpeed: number;
        }> = [];

        const count = Math.min(Math.floor(width / 35), 45);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.45,
                vy: -Math.random() * 0.45 - 0.15,
                size: Math.random() * 16 + 12,
                opacity: Math.random() * 0.35 + 0.1,
                char: kanjiList[Math.floor(Math.random() * kanjiList.length)],
                isKanji: Math.random() > 0.45,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.008
            });
        }

        let mouseX = -1000;
        let mouseY = -1000;

        const handleMouseMove = (e: MouseEvent) => {
            if (reducedMotion.matches) return;
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Get computed style for adaptive color
            const isDark = document.body.classList.contains('theme-charcoal') || document.documentElement.getAttribute('data-theme') === 'charcoal';
            const inkColor = isDark ? 'rgba(255, 255, 255,' : 'rgba(30, 30, 30,';

            // Connect lines between nearby particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 90) {
                        const alpha = (1 - dist / 90) * 0.12;
                        ctx.strokeStyle = `${inkColor}${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Update & render particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Mouse interaction repulsion
                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 0) {
                    const force = (120 - dist) / 120;
                    p.x += (dx / dist) * force * 1.8;
                    p.y += (dy / dist) * force * 1.8;
                }

                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rotSpeed;

                // Wrap around bounds
                if (p.y < -30) {
                    p.y = height + 30;
                    p.x = Math.random() * width;
                }
                if (p.x < -30) p.x = width + 30;
                if (p.x > width + 30) p.x = -30;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);

                if (p.isKanji) {
                    ctx.font = `600 ${p.size}px "Noto Serif JP", "Songti SC", "SimSun", serif`;
                    ctx.fillStyle = `${inkColor}${p.opacity})`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(p.char, 0, 0);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.12, 0, Math.PI * 2);
                    ctx.fillStyle = `${inkColor}${p.opacity * 1.2})`;
                    ctx.fill();
                }

                ctx.restore();
            }

            if (!reducedMotion.matches) animationFrameId = requestAnimationFrame(render);
        };

        const restart = () => {
            if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
            animationFrameId = undefined;
            render();
        };
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
            restart();
        });
        resizeObserver.observe(container);
        reducedMotion.addEventListener('change', restart);
        render();

        return () => {
            resizeObserver.disconnect();
            reducedMotion.removeEventListener('change', restart);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="about-hero-canvas" aria-hidden="true" />;
}
