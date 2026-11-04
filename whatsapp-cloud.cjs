'use strict';

const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

const templateKinds = ['document', 'receipt', 'bulk', 'festival'];

function createWhatsAppCloud({ file, safeStorage, fetchImpl = fetch }) {
  let loaded = false;
  let active = false;
  let config = null;
  let changing = false;

  function canEncrypt() {
    return safeStorage.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend?.() !== 'basic_text';
  }

  function load() {
    if (loaded) return;
    loaded = true;
    try {
      const bytes = fs.readFileSync(file);
      active = true;
      if (canEncrypt()) config = JSON.parse(safeStorage.decryptString(bytes));
    } catch (error) {
      if (error.code !== 'ENOENT') active = true;
    }
  }

  function status() {
    load();
    return {
      active, configured: !!config, phoneId: config?.phoneId ?? '',
      displayPhone: config?.displayPhone ?? '', language: config?.language ?? 'hi',
      templates: { ...config?.templates },
    };
  }

  function request(connection, suffix, options = {}) {
    return fetchImpl(`https://graph.facebook.com/v23.0/${connection.phoneId}${suffix}`, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(25000),
      headers: { ...options.headers, Authorization: 'Bearer ' + connection.token },
    });
  }

  async function connect(input, authorized) {
    if (changing) throw Error('WhatsApp setup already in progress');
    const { phoneId, token, language } = input ?? {};
    if (typeof phoneId !== 'string' || !/^\d{5,30}$/.test(phoneId) ||
        typeof token !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(token) ||
        typeof language !== 'string' || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)) {
      throw Error('Phone Number ID, Access Token और भाषा कोड जाँचें।');
    }
    const templates = Object.fromEntries(templateKinds.map(kind => [kind, input.templates?.[kind] ?? '']));
    if (!Object.values(templates).some(Boolean) ||
        Object.values(templates).some(name => typeof name !== 'string' || !/^[a-z0-9_]{0,128}$/.test(name))) {
      throw Error('कम से कम एक Meta-approved template का सही नाम डालें।');
    }
    if (!canEncrypt()) throw Error('इस PC पर credentials के लिए सुरक्षित स्टोरेज उपलब्ध नहीं है।');

    changing = true;
    const temporary = file + '.' + randomUUID();
    try {
      const next = { phoneId, token, language, templates };
      let response, body;
      try {
        response = await request(next, '?fields=id,display_phone_number');
        body = await response.json();
      } catch {
        throw Error('Meta से संपर्क नहीं हुआ। इंटरनेट और credentials जाँचें।');
      }
      if (!response.ok || body?.id !== phoneId || !body.display_phone_number) {
        throw Error(`Meta ने Phone Number ID या Access Token सत्यापित नहीं किया (HTTP ${response.status})।`);
      }
      if (!authorized()) throw Error('Admin session changed. Sign in and try again.');
      next.displayPhone = body.display_phone_number;
      try {
        fs.writeFileSync(temporary, safeStorage.encryptString(JSON.stringify(next)), { mode: 0o600, flag: 'wx' });
        fs.renameSync(temporary, file);
      } catch {
        throw Error('WhatsApp API settings इस PC पर सेव नहीं हो सकीं।');
      }
      loaded = active = true;
      config = next;
      return status();
    } finally {
      changing = false;
      try { fs.rmSync(temporary, { force: true }); } catch { /* keep the original result */ }
    }
  }

  function useQr() {
    if (changing) throw Error('WhatsApp setup already in progress');
    fs.rmSync(file, { force: true });
    loaded = true;
    active = false;
    config = null;
    return status();
  }

  async function uploadPdf(connection, pdfPath) {
    const data = new FormData();
    data.set('messaging_product', 'whatsapp');
    data.set('type', 'application/pdf');
    data.set('file', new Blob([await fs.promises.readFile(pdfPath)], { type: 'application/pdf' }), 'Clinic-Document.pdf');
    let response;
    try { response = await request(connection, '/media', { method: 'POST', body: data }); }
    catch { throw Error('Meta को PDF upload नहीं हुई।'); }
    const body = await response.json().catch(() => null);
    if (!response.ok || typeof body?.id !== 'string') throw Error(`Meta PDF upload असफल (HTTP ${response.status})।`);
    return body.id;
  }

  async function sendTemplate(connection, to, kind, text, mediaId) {
    const name = connection.templates[kind];
    if (!name) return { ok: false, error: 'इस संदेश के लिए Meta template सेट करें।' };
    const parameter = text.replace(/\s+/g, ' ').trim();
    if (!parameter || parameter.length > 1024) {
      return { ok: false, permanent: true, error: 'Meta template का संदेश 1–1024 अक्षरों में रखें।' };
    }
    const components = [];
    if (mediaId) components.push({ type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename: 'Clinic-Document.pdf' } }] });
    components.push({ type: 'body', parameters: [{ type: 'text', text: parameter }] });
    let response;
    try {
      response = await request(connection, '/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to, type: 'template',
          template: { name, language: { code: connection.language }, components },
        }),
      });
    } catch {
      return { ok: false, uncertain: true, error: 'Meta से संदेश की पुष्टि नहीं मिली।' };
    }
    const body = await response.json().catch(() => null);
    const messageId = body?.messages?.[0]?.id;
    if (response.ok && typeof messageId === 'string' && messageId) return { ok: true, messageId };
    const code = Number.isSafeInteger(body?.error?.code) ? ` · Meta ${body.error.code}` : '';
    const error = `WhatsApp API (HTTP ${response.status}${code})।`;
    if (response.status >= 400 && response.status < 500 && response.status !== 408 && body?.error) {
      const retryable = [401, 403, 429].includes(response.status) || [190, 132001].includes(body.error.code);
      return { ok: false, permanent: !retryable, error };
    }
    return { ok: false, uncertain: true, error };
  }

  return { status, connect, useQr, uploadPdf, sendTemplate, connection: () => { load(); return config; } };
}

module.exports = { createWhatsAppCloud };
