const fs = require("node:fs");
const path = require("node:path");
const { frontendRoot, resultsRoot } = require("../support/environment.cjs");

const parser = require(path.join(frontendRoot, "node_modules", "@babel", "parser"));
const traverse = require(path.join(frontendRoot, "node_modules", "@babel", "traverse")).default;

const sourceRoot = path.join(frontendRoot, "src");
const actionComponentNames = new Set([
  "button", "Button", "Link", "NavLink", "form", "DialogTrigger", "SheetTrigger", "DrawerTrigger",
  "DropdownMenuItem", "ContextMenuItem", "MenubarItem", "CommandItem", "SelectItem", "TabsTrigger"
]);

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    if (!/\.(jsx?|tsx?)$/.test(entry.name) || /\.(test|spec)\./.test(entry.name)) return [];
    return [absolute];
  });
}

function jsxName(node) {
  if (!node) return "";
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") return `${jsxName(node.object)}.${jsxName(node.property)}`;
  return "";
}

function attribute(opening, name) {
  return opening.attributes.find((item) => item.type === "JSXAttribute" && item.name?.name === name) || null;
}

function attributeValue(item, source) {
  if (!item) return null;
  if (!item.value) return true;
  if (item.value.type === "StringLiteral") return item.value.value;
  if (item.value.type === "JSXExpressionContainer") return source.slice(item.value.expression.start, item.value.expression.end);
  return source.slice(item.value.start, item.value.end);
}

function textName(node) {
  return (node.children || []).map((child) => {
    if (child.type === "JSXText") return child.value;
    if (child.type === "JSXExpressionContainer" && child.expression.type === "StringLiteral") return child.expression.value;
    return "";
  }).join(" ").replace(/\s+/g, " ").trim();
}

function ownerName(astPath) {
  const owner = astPath.findParent((candidate) => candidate.isFunctionDeclaration() || candidate.isFunctionExpression() || candidate.isArrowFunctionExpression());
  if (!owner) return null;
  if (owner.node.id?.name) return owner.node.id.name;
  if (owner.parentPath?.isVariableDeclarator()) return owner.parentPath.node.id?.name || null;
  if (owner.parentPath?.isObjectProperty()) return owner.parentPath.node.key?.name || null;
  return null;
}

const findings = [];
for (const absolutePath of sourceFiles(sourceRoot)) {
  const source = fs.readFileSync(absolutePath, "utf8");
  let ast;
  try {
    ast = parser.parse(source, {
      sourceType: "unambiguous",
      errorRecovery: true,
      plugins: ["jsx", "typescript", "classProperties", "dynamicImport", "optionalChaining"]
    });
  } catch (error) {
    findings.push({ kind: "parse_error", file: path.relative(frontendRoot, absolutePath).replaceAll("\\", "/"), message: error.message });
    continue;
  }

  traverse(ast, {
    JSXElement(astPath) {
      const opening = astPath.node.openingElement;
      const component = jsxName(opening.name);
      const onClick = attribute(opening, "onClick");
      const onSubmit = attribute(opening, "onSubmit");
      const type = attributeValue(attribute(opening, "type"), source);
      const actionable = actionComponentNames.has(component) || onClick || onSubmit || type === "submit";
      if (!actionable) return;

      const ariaLabel = attributeValue(attribute(opening, "aria-label"), source);
      const title = attributeValue(attribute(opening, "title"), source);
      const href = attributeValue(attribute(opening, "href"), source);
      const to = attributeValue(attribute(opening, "to"), source);
      const name = String(ariaLabel || title || textName(astPath.node) || "").slice(0, 240);
      const line = opening.loc?.start.line || null;
      const relativeFile = path.relative(frontendRoot, absolutePath).replaceAll("\\", "/");
      findings.push({
        actionId: `static.${relativeFile.replace(/[^a-zA-Z0-9]+/g, ".").toLowerCase()}.${line}`,
        kind: component === "form" || onSubmit ? "submit" : component.includes("Trigger") ? "modal_trigger" : component.includes("Item") ? "menu_action" : "click",
        component,
        name,
        file: relativeFile,
        line,
        ownerComponent: ownerName(astPath),
        locatorCandidate: name ? `getByRole(${JSON.stringify(component === "Link" || component === "NavLink" ? "link" : component === "form" ? "form" : "button")}, { name: ${JSON.stringify(name)} })` : null,
        href,
        to,
        type,
        onClick: attributeValue(onClick, source),
        onSubmit: attributeValue(onSubmit, source)
      });
    }
  });
}

fs.mkdirSync(resultsRoot, { recursive: true });
fs.writeFileSync(path.join(resultsRoot, "static-actions.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceRoot: "frontend/src",
  total: findings.filter((item) => item.kind !== "parse_error").length,
  parseErrors: findings.filter((item) => item.kind === "parse_error"),
  actions: findings.filter((item) => item.kind !== "parse_error")
}, null, 2));

process.stdout.write(`Static action candidates: ${findings.filter((item) => item.kind !== "parse_error").length}\n`);
