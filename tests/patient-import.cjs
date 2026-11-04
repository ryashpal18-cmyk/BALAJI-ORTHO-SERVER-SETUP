'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib', name + '.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { exports: module.exports, require: relative => load(relative.slice(2)) });
  return module.exports;
}

const { patientImportKey, previewPatientImport } = load('patientImport');
const header = ['name', 'mobile', 'age', 'gender'];
const current = new Set([patientImportKey('Synthetic One', '9123456780')]);
const result = previewPatientImport([
  header, [' synthetic  one ', '+91 9123456780'], ['Synthetic Family', 9123456780, 0, 'Female'],
  ['Synthetic Family', '9123456780'], ['Synthetic Invalid', '123'], [],
], current);
assert.equal(result.duplicates, 2);
assert.equal(result.patients.length, 1);
assert.equal(result.patients[0].age, 0);
assert.equal(result.patients[0].gender, 'female');
assert.equal(result.errors.length, 1);
assert.match(result.errors[0], /Row 5/);
assert.throws(() => previewPatientImport([['name', 'name', 'mobile']], new Set()), /columns/);
assert.throws(() => previewPatientImport([header, ...Array.from({length: 501}, () => [])], new Set()), /500/);
console.log('PASS patient import validates rows and keeps different family members with one mobile');
