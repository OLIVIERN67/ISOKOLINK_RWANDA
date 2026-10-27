const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../src");
const values = new Map();

function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visitDirectory(file);
      continue;
    }
    if (!file.endsWith(".tsx")) continue;
    const source = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxText(node)) {
        const value = node.text.replace(/\s+/g, " ").trim();
        if (/[A-Za-z]/.test(value) && value.length > 1) values.set(value, (values.get(value) || 0) + 1);
      }
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const name = node.name.getText(ast);
        if (["aria-label", "placeholder", "title", "label", "hint", "subtitle", "eyebrow", "description", "actionLabel"].includes(name)) {
          const value = node.initializer.text.trim();
          if (/[A-Za-z]/.test(value) && value.length > 1) values.set(value, (values.get(value) || 0) + 1);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}

visitDirectory(root);
for (const [value, count] of [...values.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  process.stdout.write(`${count}\t${value}\n`);
}
