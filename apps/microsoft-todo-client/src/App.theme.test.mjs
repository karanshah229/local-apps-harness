import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import postcss from 'postcss';

const css = await readFile(new URL('./App.css', import.meta.url), 'utf8');
const stylesheet = postcss.parse(css);

function declarationFor(selector, property) {
  let value;

  stylesheet.walkRules(selector, (rule) => {
    rule.walkDecls(property, (declaration) => {
      value = declaration.value;
    });
  });

  return value;
}

test('native date controls follow the active app theme', () => {
  assert.equal(declarationFor(':root', 'color-scheme'), 'light');
  assert.equal(declarationFor('.dark', 'color-scheme'), 'dark');
});
