'use strict';

// Wrapper calls that produce a single component/function from a function argument
// (e.g. `memo(fn)`, `forwardRef(fn)`, `React.memo(fn)`, `memo(forwardRef(fn))`).
// Only these named wrappers are unwrapped — arbitrary calls like `[].map(fn)` or
// `debounce(fn)` are NOT treated as declaring a function/component.
const WRAPPER_NAMES = new Set(['memo', 'forwardRef']);

function calleeName(callee) {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return null;
}

// True when `init` directly is, or (through one or more recognised wrapper calls)
// resolves to, a function/arrow expression.
function isFunctionOrComponentInit(init) {
  if (init === null || init === undefined) {
    return false;
  }
  if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
    return true;
  }
  if (init.type === 'CallExpression') {
    const name = calleeName(init.callee);
    if (name !== null && WRAPPER_NAMES.has(name)) {
      return init.arguments.some(isFunctionOrComponentInit);
    }
  }
  return false;
}

// Strip a single `export` / `export default` wrapper to reach the underlying
// declaration. Re-exports (`export { x } from './y'`) have a null declaration.
function unwrapExport(statement) {
  if (
    statement.type === 'ExportNamedDeclaration' ||
    statement.type === 'ExportDefaultDeclaration'
  ) {
    return statement.declaration;
  }
  return statement;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce at most one function or component declaration per file. Data ' +
        'constants, types, interfaces, enums, and re-exports are exempt.',
    },
    schema: [],
    messages: {
      tooMany:
        'Only one function or component declaration is allowed per file. ' +
        'Move this declaration into its own file.',
    },
  },
  create(context) {
    return {
      Program(program) {
        let count = 0;
        const bump = (node) => {
          count += 1;
          if (count > 1) {
            context.report({ node, messageId: 'tooMany' });
          }
        };
        for (const statement of program.body) {
          const declaration = unwrapExport(statement);
          if (declaration === null || declaration === undefined) {
            continue;
          }
          if (
            declaration.type === 'FunctionDeclaration' ||
            declaration.type === 'ClassDeclaration'
          ) {
            bump(declaration);
            continue;
          }
          if (declaration.type === 'VariableDeclaration') {
            for (const declarator of declaration.declarations) {
              if (isFunctionOrComponentInit(declarator.init)) {
                bump(declarator);
              }
            }
            continue;
          }
          // Anonymous / wrapper default export: `export default () => ...`,
          // `export default memo(() => ...)`, `export default forwardRef(...)`.
          // (`export default function X() {}` is a FunctionDeclaration, handled
          // above; `export default Identifier` is a reference to an already-counted
          // declaration and is correctly NOT counted.)
          if (isFunctionOrComponentInit(declaration)) {
            bump(declaration);
          }
        }
      },
    };
  },
};
