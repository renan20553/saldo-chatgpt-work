import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
test('Manifest V3 split, permissões mínimas e recursos existentes', () => {
  assert.equal(manifest.manifest_version, 3); assert.equal(manifest.incognito, 'split');
  assert.deepEqual(manifest.permissions.sort(), ['alarms', 'storage']); assert.deepEqual(manifest.host_permissions, ['https://chatgpt.com/*']);
  for (const file of [manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons)]) assert.ok(existsSync(resolve(root, file)), file);
  assert.equal(manifest.background.type, 'module');
});
test('todos os imports de produção são locais, existentes e sem execução remota', () => {
  const files = ['service-worker.js', 'popup.js', ...readdirSync(resolve(root, 'lib')).filter(f => f.endsWith('.js')).map(f => 'lib/' + f)];
  for (const file of files) {
    const content = readFileSync(resolve(root, file), 'utf8');
    for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) { assert.ok(match[1].startsWith('.'), match[1]); assert.ok(existsSync(resolve(root, dirname(file), match[1]))); }
    assert.ok(!/\beval\s*\(|new Function\b|console\.(log|warn|error|debug)\s*\(|indexedDB|localStorage|storage\.sync/.test(content), file);
  }
  const html = readFileSync(resolve(root, 'popup.html'), 'utf8');
  assert.ok(!/<script[^>]+src=['"]https?:/.test(html)); assert.ok(!/on(click|load|error)=/.test(html));
});
