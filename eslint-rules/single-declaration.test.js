'use strict';

const test = require('node:test');
const { RuleTester } = require('eslint');
const tseslint = require('typescript-eslint');
const rule = require('./single-declaration');

RuleTester.describe = test.describe;
RuleTester.it = test.it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('single-declaration', rule, {
  valid: [
    // Single function component.
    { code: 'export default function HomeScreen() { return null; }' },
    // Component plus a StyleSheet.create data const (the idiomatic RN pattern).
    {
      code:
        'function HomeScreen() { return null; }\n' +
        'const styles = StyleSheet.create({ container: { flex: 1 } });',
    },
    // memo-wrapped single component.
    { code: 'const Card = memo(() => null);' },
    // forwardRef-wrapped single component.
    { code: 'const Input = forwardRef((props, ref) => null);' },
    // memo(forwardRef(...)) double wrap is still one component.
    { code: 'const Field = memo(forwardRef((props, ref) => null));' },
    // Type alias plus a component — types are not counted.
    {
      code:
        'type Props = { title: string };\n' +
        'function Header(props: Props) { return null; }',
    },
    // Re-export plus a component — re-exports are not counted.
    {
      code:
        "export { Other } from './other';\n" +
        'export default function Main() { return null; }',
    },
    // Data-only module (zero functions).
    {
      code:
        "const COLORS = { red: '#f00' };\n" +
        'export const SIZES = [1, 2, 3];',
    },
    // A wrapper-like call that is NOT a known component wrapper is treated as data.
    {
      code:
        'const items = [1, 2, 3].map((n) => n * 2);\n' +
        'function List() { return null; }',
    },
    // Anonymous default-export component forms (single declaration each).
    { code: 'export default () => null;' },
    { code: 'export default memo(() => null);' },
    { code: 'export default forwardRef((props, ref) => null);' },
    // A declaration plus a default export OF THAT declaration is one declaration —
    // the default export is an identifier reference, not a second declaration.
    {
      code: 'const App = () => null;\nexport default App;',
    },
  ],
  invalid: [
    // Two function declarations.
    {
      code: 'function a() {}\nfunction b() {}',
      errors: [{ messageId: 'tooMany' }],
    },
    // Helper arrow plus a component.
    {
      code:
        'const toRgba = (c: string) => c;\n' +
        'function Comp() { return null; }',
      errors: [{ messageId: 'tooMany' }],
    },
    // Two arrow components.
    {
      code: 'const A = () => null;\nconst B = () => null;',
      errors: [{ messageId: 'tooMany' }],
    },
    // Function declaration plus a memo component.
    {
      code:
        'function A() { return null; }\n' +
        'const B = memo(() => null);',
      errors: [{ messageId: 'tooMany' }],
    },
    // Helper plus an anonymous memo default export (the idiomatic RN miss).
    {
      code:
        'function helper() { return 1; }\n' +
        'export default memo(() => null);',
      errors: [{ messageId: 'tooMany' }],
    },
    // Helper plus an anonymous arrow default export.
    {
      code:
        'function helper() { return 1; }\n' +
        'export default () => null;',
      errors: [{ messageId: 'tooMany' }],
    },
    // Helper plus a forwardRef default export.
    {
      code:
        'function helper() { return 1; }\n' +
        'export default forwardRef((props, ref) => null);',
      errors: [{ messageId: 'tooMany' }],
    },
  ],
});
