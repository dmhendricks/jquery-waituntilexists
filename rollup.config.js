import terser from '@rollup/plugin-terser';

const banner = `/*!
 * jquery.waitUntilExists.js v${process.env.npm_package_version}
 * https://github.com/dmhendricks/jquery-waituntilexists
 * @license MIT
 */`;

export default [
    {
        input: 'src/index.js',
        external: ['jquery'],
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
