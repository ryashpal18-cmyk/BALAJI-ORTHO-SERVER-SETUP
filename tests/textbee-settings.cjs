'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createTextbeeSettings } = require('../textbee-settings.cjs');

async function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-opd-textbee-'));
  try {
    const file = path.join(directory, 'credentials.enc');
    // Stand-in for Electron safeStorage. All network requests are mocked.
    const safeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: value => Buffer.from(Buffer.from(value).toString('base64')),
      decryptString: value => Buffer.from(value.toString(), 'base64').toString(),
    };
    const input = { apiKey: 'test-secret', deviceId: 'test-device' };
    let responseStatus = 200;
    const options = {
      file, safeStorage,
      fetchImpl: async (url, request) => {
        assert.equal(url, 'https://api.textbee.dev/api/v1/gateway/devices/test-device');
        assert.equal(request.method ?? 'GET', 'GET');
        assert.equal(request.redirect, 'error');
        assert.ok(request.headers['x-api-key']);
        return new Response(JSON.stringify({ data: { _id: input.deviceId, enabled: true } }), { status: responseStatus });
      },
    };
    let settings = createTextbeeSettings(options);
    assert.equal(settings.status().configured, false);
    const saved = await settings.connect(input, () => true);
    assert.deepEqual(saved, { configured: true, deviceId: input.deviceId, error: '' });
    assert.equal(fs.readFileSync(file).includes(input.apiKey), false);
    settings = createTextbeeSettings(options);
    assert.equal(settings.getGateway().apiKey, input.apiKey);

    responseStatus = 401;
    await assert.rejects(settings.connect({ ...input, apiKey: 'invalid' }, () => true), /API Key/);
    assert.equal(settings.getGateway().apiKey, input.apiKey);
    responseStatus = 200;
    await assert.rejects(settings.connect({ ...input, apiKey: 'replacement' }, () => false), /session changed/);
    assert.equal(settings.getGateway().apiKey, input.apiKey);

    assert.equal(settings.disconnect().configured, false);
    assert.equal(createTextbeeSettings(options).getGateway(), null);
    console.log('PASS TextBee credentials verification, persistence, secret-free status, safe replacement, and disconnect');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
