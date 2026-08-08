import { copyFileSync, mkdirSync } from 'node:fs';
import terser from '@rollup/plugin-terser';

const banner = `/*!
 * jquery.waitUntilExists.js v${process.env.npm_package_version}
 * https://github.com/dmhendricks/jquery-waituntilexists
 * @license MIT
 */`;

/**
 * Copy the hand-written declarations to the path `package.json` advertises.
 *
 * The types are authored by hand rather than emitted from source, so nothing
 * else puts them in dist/ — without this the `types` field points at a file
 * that does not exist and consumers silently get no types at all.
 */
const copyTypes = {
    name: 'copy-types',
    writeBundle() {
        mkdirSync('dist', { recursive: true });
        copyFileSync('types/index.d.ts', 'dist/index.d.ts');
    },
};

export default [
    {
        input: 'src/index.js',
        external: ['jquery'],
        plugins: [copyTypes],
        output: [
            { file: 'dist/jquery.waitUntilExists.esm.js', format: 'es', banner },
            { file: 'dist/jquery.waitUntilExists.cjs', format: 'cjs', banner, exports: 'named' },
        ],
    },
    {
        input: 'src/index.js',
        external: ['jquery'],
        output: [
            {
                file: 'dist/jquery.waitUntilExists.umd.js',
                format: 'umd',
                name: 'waitUntilExists',
                banner,
                globals: { jquery: 'jQuery' },
            },
        ],
    },
    {
        input: 'src/index.js',
        external: ['jquery'],
        output: [
            {
                file: 'dist/jquery.waitUntilExists.umd.min.js',
                format: 'umd',
                name: 'waitUntilExists',
                banner,
                globals: { jquery: 'jQuery' },
                plugins: [terser()],
            },
        ],
    },
];
