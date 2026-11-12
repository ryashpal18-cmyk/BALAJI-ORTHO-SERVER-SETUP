'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const forbiddenText = [
  /balaji (?:digital x-ray & |ortho care)/i,
  /dr\.\s*s\.\s*s\.\s*rathore/i,
  /khinwara|306502|8005707783|idcxmeczzfnipmybikue/i,
  /balajiclinic:\/\//i,
];
const retiredAssets = new Set([
  // bj-opd-background.webp is the current BJ OPD login poster, not a retired asset.
  'clinic-letterpad.jpg', 'logo.png',
  'bj-opd-background.svg', 'patients_seed.json',
]);

for (const relative of ['main.js', 'diagnostics.cjs', 'server-setup/schema.sql']) {
  const contents = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const pattern of forbiddenText) assert.doesNotMatch(contents, pattern, relative);
}
for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  assert.ok(!retiredAssets.has(entry.name), 'Retired customer asset in build: ' + entry.name);
  if (/\.(js|html|css|svg)$/i.test(entry.name)) {
    const contents = fs.readFileSync(path.join(entry.parentPath, entry.name), 'utf8');
    for (const pattern of forbiddenText) assert.doesNotMatch(contents, pattern, entry.name);
  }
}
for (const relative of ['src/assets/logo.png', 'src/assets/clinic-letterpad.jpg', 'build/icon.png']) {
  assert.ok(!fs.existsSync(path.join(root, relative)), 'Retired asset in source: ' + relative);
}
console.log('PASS customer build has no known old clinic contact, name, project, QR scheme or retired assets');
