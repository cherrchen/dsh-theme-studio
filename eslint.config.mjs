import tseslint from 'typescript-eslint'

export default [{
  ignores: ['lib/**', 'node_modules/**', '.pnpm-store/**', '.pack/**', 'matrix-evidence/**'],
}, {
  files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx', 'scripts/**/*.mjs', '*.mjs'],
  languageOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-debugger': 'error',
    'no-duplicate-case': 'error',
    'no-unreachable': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
  },
}]
