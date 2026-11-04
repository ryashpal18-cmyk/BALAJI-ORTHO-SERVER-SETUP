'use strict';

const assert = require('node:assert/strict');
const { encryptBackup, decryptBackup } = require('../backup-encryption.cjs');

(async () => {
  const passphrase = 'synthetic passphrase only';
  const json = JSON.stringify({ patients: [{ name: 'Synthetic Patient' }] });
  const first = await encryptBackup(json, passphrase);
  assert.notEqual(first, await encryptBackup(json, passphrase));
  assert.doesNotMatch(first, /Synthetic Patient/);
  assert.equal(await decryptBackup(first, passphrase), json);
  await assert.rejects(decryptBackup(first, 'different synthetic password'), /गलत|बदल/);
  const altered = JSON.parse(first);
  const ciphertext = Buffer.from(altered.data, 'base64');
  ciphertext[0] ^= 1;
  altered.data = ciphertext.toString('base64');
  await assert.rejects(decryptBackup(JSON.stringify(altered), passphrase), /गलत|बदल/);
  await assert.rejects(encryptBackup(json, 'too short'), /12/);
  console.log('PASS portable encrypted backup round-trip, wrong password and tamper detection');
})().catch(error => { console.error(error); process.exitCode = 1; });
