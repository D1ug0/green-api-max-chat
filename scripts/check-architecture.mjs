import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve('src');
const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
const errors = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!/\.[jt]sx?$/.test(file)) continue;
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const from = path.relative(root, file).split(path.sep);
    const check = (node) => {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? node.arguments[0]
            : undefined;
      if (specifier && ts.isStringLiteral(specifier)) {
        const name = specifier.text;
        const target = name.startsWith('@/')
          ? path.join(root, name.slice(2))
          : name.startsWith('.')
            ? path.resolve(path.dirname(file), name)
            : null;
        if (target) {
          const to = path.relative(root, target).split(path.sep);
          const sameSlice =
            from[0] === to[0] && (['app', 'shared'].includes(from[0]) || from[1] === to[1]);
          if (!sameSlice && layers.indexOf(to[0]) >= layers.indexOf(from[0]))
            errors.push(`${path.relative(root, file)}: forbidden dependency ${name}`);
          const sameSegment = from[0] === 'shared' && to[0] === 'shared' && from[1] === to[1];
          if (
            (!sameSlice || (from[0] === 'shared' && !sameSegment)) &&
            to.length > 2 &&
            to.at(-1) !== 'index'
          )
            errors.push(`${path.relative(root, file)}: use public API for ${name}`);
        }
      }
      ts.forEachChild(node, check);
    };
    check(source);
  }
}
visit(root);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('FSD: imports follow layer boundaries and public APIs.');
