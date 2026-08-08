import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Verify the BUILT bundles work, not just src/. Guards against bundling bugs:
// dropped exports, broken interop, or `process.env` leaking into browser code.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = (file) => path.join(root, 'dist', file);

describe('built bundle smoke test', () => {
    it('ESM build exposes register', async () => {
        const mod = await import(dist('jquery.waitUntilExists.esm.js'));
        expect(typeof mod.register).toBe('function');
    });

    it('CJS build loads under require()', () => {
        const require = createRequire(path.join(root, 'package.json'));
        const mod = require(dist('jquery.waitUntilExists.cjs'));
        expect(typeof mod.register).toBe('function');
    });

    it('UMD build attaches to the global object', () => {
        const code = fs.readFileSync(dist('jquery.waitUntilExists.umd.js'), 'utf8');

        // The UMD wrapper prefers globalThis, so give it an isolated one rather
        // than trying to pass a fake `window`.
        const fakeGlobal = {};
        const run = new Function(
            'globalThis',
            'exports',
            'module',
            'define',
            `${code}; return globalThis;`,
        );
        const result = run(fakeGlobal, undefined, undefined, undefined);

        expect(typeof result.waitUntilExists).toBe('object');
        expect(typeof result.waitUntilExists.register).toBe('function');
    });

    it('no bundle references process.env (would throw in a browser)', () => {
        for (const file of [
            'jquery.waitUntilExists.esm.js',
            'jquery.waitUntilExists.cjs',
            'jquery.waitUntilExists.umd.js',
            'jquery.waitUntilExists.umd.min.js',
        ]) {
            expect(fs.readFileSync(dist(file), 'utf8')).not.toContain('process.env');
        }
    });

    it('minified build keeps the license banner', () => {
        const code = fs.readFileSync(dist('jquery.waitUntilExists.umd.min.js'), 'utf8');
        expect(code).toContain('@license MIT');
    });
});
