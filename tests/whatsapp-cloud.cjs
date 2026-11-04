'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWhatsAppCloud } = require('../whatsapp-cloud.cjs');
const { createWhatsAppService } = require('../whatsapp-service.cjs');

async function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-opd-wa-'));
  try {
    const requests = [];
    let lostResponse = false;
    const options = {
      file: path.join(root, 'credentials.enc'),
      safeStorage: {
        isEncryptionAvailable: () => true,
        encryptString: text => Buffer.from(Buffer.from(text).toString('base64')),
        decryptString: bytes => Buffer.from(bytes.toString(), 'base64').toString(),
      },
      async fetchImpl(url, request) {
        requests.push([url, request]);
        assert.equal(new URL(url).origin, 'https://graph.facebook.com');
        assert.equal(request.redirect, 'error');
        assert.equal(request.headers.Authorization, 'Bearer fake-token');
        if (url.endsWith('/media')) {
          assert.equal(request.body.get('type'), 'application/pdf');
          return Response.json({ id: 'media-id' });
        }
        if (url.endsWith('/messages')) {
          if (lostResponse) throw Error('Response lost after dispatch');
          return Response.json({ messages: [{ id: 'wamid.fake' }] });
        }
        assert.equal(request.method ?? 'GET', 'GET');
        return Response.json({ id: '123456789', display_phone_number: '+91 00000 00000' });
      },
    };
    let cloud = createWhatsAppCloud(options);
    assert.equal(cloud.status().active, false);
    const input = { phoneId: '123456789', token: 'fake-token', language: 'hi', templates: { document: 'clinic_pdf', receipt: 'clinic_receipt' } };
    assert.equal((await cloud.connect(input, () => true)).configured, true);
    assert.equal(requests.length, 1);
    assert.equal(JSON.stringify(cloud.status()).includes(input.token), false);
    assert.equal(fs.readFileSync(options.file).includes(input.token), false);
    cloud = createWhatsAppCloud(options);

    const data = new Map();
    const patient = { id: 'p', name: 'Synthetic', mobile: '9123456780' };
    const bill = { id: 'b', patient_id: 'p', amount: 500, amount_paid: 500, discount: 0, service: 'Synthetic', created_at: '2026-01-01T00:00:00Z' };
    const store = {
      metaGet: key => data.get(key),
      metaSet: (key, value) => data.set(key, value),
      cacheGetAll: table => ({ patients: [patient], billing: [bill] }[table] || []),
    };
    const service = createWhatsAppService({
      store, root, allowed: () => true, cloud,
      clientFactory: () => { throw Error('QR transport must not be used in API mode'); },
      renderPdf: async () => Buffer.from('%PDF-1.4 fake'),
    });
    assert.equal(service.status().ready, true);
    service.enqueue(bill.id);
    await service.tick();
    assert.equal(service.status().jobs[0].state, 'sent');
    assert.equal(requests.length, 3);
    const document = JSON.parse(requests[2][1].body);
    assert.equal(document.to, '919123456780');
    assert.equal(document.template.name, 'clinic_pdf');
    assert.equal(document.template.components[0].parameters[0].document.id, 'media-id');
    assert.equal((await service.sendText(patient.mobile, 'Payment received', () => true, { kind: 'receipt' })).ok, true);
    assert.equal(JSON.parse(requests[3][1].body).template.name, 'clinic_receipt');
    assert.equal((await service.sendText(patient.mobile, 'Festival', () => true, { kind: 'festival' })).ok, false);
    assert.equal(requests.length, 4);

    bill.service = 'Updated synthetic bill';
    service.enqueue(bill.id);
    lostResponse = true;
    await service.tick();
    assert.equal(service.status().jobs[0].state, 'unconfirmed');
    await service.tick();
    assert.equal(requests.length, 6);
    assert.equal(cloud.useQr().active, false);
    assert.equal(service.status().ready, false);
    console.log('PASS WhatsApp API setup, encrypted persistence, PDF and text routing, no duplicate on timeout, return to QR');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
