import { useEffect, useRef } from 'react';

export function useDialogFocus(open: boolean) {
    const dialogRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const selector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]';
        const frame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>(selector)?.focus());
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const elements = [...(dialogRef.current?.querySelectorAll<HTMLElement>(selector) || [])].filter(element => element.getClientRects().length > 0);
            const first = elements[0]; const last = elements[elements.length - 1];
            if (!first) { event.preventDefault(); return; }
            if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus(); };
    }, [open]);
    return dialogRef;
}
