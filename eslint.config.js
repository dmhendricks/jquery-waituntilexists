import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.node },
        },
    },
    {
        files: ['src/core/**/*.js'],
        rules: {
            'no-restricted-globals': [
                'error',
                {
                    name: '$',
                    message: 'src/core must stay jQuery-free; put jQuery bindings in src/jquery/.',
                },
                {
                    name: 'jQuery',
                    message: 'src/core must stay jQuery-free; put jQuery bindings in src/jquery/.',
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'jquery',
                            message:
                                'src/core must stay jQuery-free; put jQuery bindings in src/jquery/.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser },
        },
    },
    {
        ignores: ['dist/**', 'demo/**', 'node_modules/**', 'coverage/**'],
    },
];
