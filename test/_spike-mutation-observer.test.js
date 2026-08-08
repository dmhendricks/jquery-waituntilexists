import { describe, it, expect } from 'vitest';

// Spike: does jsdom's MutationObserver fire reliably for the patterns
// the real implementation will depend on? Throwaway — deleted once answered.
describe('spike: MutationObserver fidelity in jsdom', () => {
    it('fires on childList append', async () => {
        const target = document.createElement('div');
        document.body.appendChild(target);

        const seen = [];
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) seen.push(...m.addedNodes);
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const el = document.createElement('span');
        el.id = 'late';
        target.appendChild(el);

        await new Promise((resolve) => queueMicrotask(resolve));
        observer.disconnect();

        expect(seen).toContain(el);
    });

    it('fires on attribute change when attributes:true', async () => {
        const target = document.createElement('div');
        target.id = 'attr-target';
        document.body.appendChild(target);

        const seen = [];
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) if (m.type === 'attributes') seen.push(m.attributeName);
        });
        observer.observe(document.body, { attributes: true, subtree: true });

        target.setAttribute('data-ready', 'true');

        await new Promise((resolve) => queueMicrotask(resolve));
        observer.disconnect();

        expect(seen).toContain('data-ready');
    });

    it('does not fire on attribute change when attributes:false', async () => {
        const target = document.createElement('div');
        document.body.appendChild(target);

        const seen = [];
        const observer = new MutationObserver((mutations) => {
            seen.push(...mutations);
        });
        observer.observe(document.body, { childList: true, subtree: true });

        target.setAttribute('data-ready', 'true');

        await new Promise((resolve) => queueMicrotask(resolve));
        observer.disconnect();

        expect(seen).toHaveLength(0);
    });
});
