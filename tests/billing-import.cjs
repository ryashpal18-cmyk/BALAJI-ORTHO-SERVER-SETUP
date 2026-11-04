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
  vm.runInNewContext(js, { exports: module.exports, require: relative => load(relative.slice(2)), crypto: require('node:crypto').webcrypto, TextEncoder });
  return module.exports;
}

(async () => {
  const { previewBillingImport } = load('billingImport');
  const header = ['invoice', 'registration_number', 'service', 'bill_date', 'amount', 'paid', 'discount', 'payment_date', 'payment_mode'];
  const patients = [
    { id: 'patient-a', registration_number: 'BAOR0001', branch_id: 'branch-a' },
    { id: 'patient-b', registration_number: 'BAOR0002', branch_id: 'branch-b' },
  ];
  const row = ['OLD-7', 'BAOR0001', 'Consultation', '2025-06-01', '1000', '400', '100', '2025-06-05', 'UPI'];
  const preview = rows => previewBillingImport([header, ...rows], patients, 'branch-a', new Set());
  const result = await preview([row]);
  assert.equal(result.errors.length, 0);
  const bill = result.bills[0];
  assert.equal(bill.due, 500);
  assert.equal(bill.row.patient_id, 'patient-a');
  assert.equal(bill.row.notes, 'Imported invoice: OLD-7');
  assert.equal(bill.row.payment_history[0].paid_at, '2025-06-05T06:30:00.000Z');
  assert.equal(bill.row.payment_history[0].amount, 400);
  assert.equal((await preview([row])).bills[0].row.id, bill.row.id);
  const repeated = await previewBillingImport([header, row], patients, 'local_branch-a', new Set([bill.row.id.slice(6)]));
  assert.equal(repeated.duplicates, 1);
  assert.equal(repeated.bills.length, 0);
  const wrongBranch = [...row]; wrongBranch[1] = 'BAOR0002';
  const overpaid = [...row]; overpaid[5] = '901';
  const badDate = [...row]; badDate[3] = '2025-02-30';
  for (const invalid of [wrongBranch, overpaid, badDate]) assert.equal((await preview([invalid])).errors.length, 1);
  assert.equal((await preview([row, row])).errors.length, 1);
  console.log('PASS billing import matches the selected branch, preserves historical receipt date and balance, and detects repeat invoices');
})().catch(error => { console.error(error); process.exitCode = 1; });
