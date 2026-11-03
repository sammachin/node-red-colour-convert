import js from '@eslint/js'

export default [
    js.configs.recommended,
    {
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                module: 'readonly',
                require: 'readonly',
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly'
            }
        }
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                module: 'readonly',
                require: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly'
            }
        }
    }
]
