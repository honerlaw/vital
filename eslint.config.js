const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const stylistic = require('@stylistic/eslint-plugin');
const globals = require('globals');
const singleDeclaration = require('./eslint-rules/single-declaration');

const TS_FILES = ['**/*.ts', '**/*.tsx'];

module.exports = defineConfig([
  globalIgnores([
    'dist/*',
    '.expo/*',
    'node_modules/*',
    'ios/*',
    'android/*',
    'expo-env.d.ts',
    '.minerva/*',
  ]),

  // Expo's recommended base (parser, react, react-hooks, import).
  expoConfig,

  // Type-aware analysis, scoped to TypeScript source only.
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: TS_FILES,
  })),

  // Strict guardrails. Placed AFTER the expo spread so these override expo's
  // softer defaults (expo sets consistent-type-assertions to warn/'as').
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
      local: { rules: { 'single-declaration': singleDeclaration } },
    },
    rules: {
      // No `any`, no escape-hatch assertions.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // No TypeScript suppression comments.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      // Hard ~100-column limit. Mechanically unbreakable tokens are exempt:
      // URLs, template literals, and module-specifier lines (`import ... from`,
      // `export ... from`, and bare `import '...'`). Note this deliberately does
      // NOT exempt `export const`/`export function` code lines — those must wrap.
      '@stylistic/max-len': [
        'error',
        {
          code: 100,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreTemplateLiterals: true,
          ignorePattern:
            "^\\s*(import|export)\\b.*\\bfrom\\s+['\"][^'\"]*['\"];?\\s*$|^\\s*import\\s+['\"][^'\"]*['\"];?\\s*$",
        },
      ],
      // One function/component per file.
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
      'local/single-declaration': 'error',
    },
  },

  // JS config / rule files are CommonJS and not in the TS program; disable
  // type-aware rules for them and give them Node globals.
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Make suppression impossible: inline `eslint-disable*` directives are ignored
  // entirely, and any directive that would have had an effect is reported.
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
]);
