'use strict';

const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

const gatewayUrl = 'https://api.textbee.dev/api/v1/gateway';

function createTextbeeSettings({ file, safeStorage, fetchImpl = fetch }) {
  let config = null;
  let unreadable = false;
  let connecting = false;
  let loaded = false;

  function canEncrypt() {
    return safeStorage.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend?.() !== 'basic_text';
  }

  // Electron's safeStorage is available after the app is ready.
  function load() {
    if (loaded) return;
    loaded = true;
    try {
      const encrypted = fs.readFileSync(file);
      if (!canEncrypt()) throw new Error('Secure storage unavailable');
      config = JSON.parse(safeStorage.decryptString(encrypted));
    } catch (error) {
      unreadable = error.code !== 'ENOENT';
    }
  }

  function status() {
    load();
    return {
      configured: !!config,
      deviceId: config?.deviceId || '',
      error: unreadable ? 'सेव की हुई SMS सेटिंग नहीं खुली। API Key और Device ID फिर से डालें।' : '',
    };
  }

  async function connect(input, authorized) {
    if (connecting) throw new Error('SMS connection check already in progress');
    const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
    const deviceId = typeof input?.deviceId === 'string' ? input.deviceId.trim() : '';
    if (!/^[\x21-\x7e]{1,512}$/.test(apiKey) || !/^[a-zA-Z0-9_-]{1,128}$/.test(deviceId)) {
      throw new Error('TextBee API Key और Device ID जाँचें।');
    }
    if (!canEncrypt()) throw new Error('इस PC पर credentials के लिए सुरक्षित स्टोरेज उपलब्ध नहीं है।');

    connecting = true;
    const temporary = file + '.' + randomUUID();
    try {
      let response;
      try {
        response = await fetchImpl(`${gatewayUrl}/devices/${deviceId}`, {
          headers: { 'x-api-key': apiKey },
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        throw new Error('TextBee से संपर्क नहीं हुआ। इंटरनेट जाँचकर फिर कोशिश करें।');
      }
      if ([401, 403].includes(response.status)) throw new Error('TextBee ने API Key स्वीकार नहीं की।');
      if (response.status === 404) throw new Error('इस TextBee खाते में Device ID नहीं मिली।');
      if (!response.ok) throw new Error(`TextBee जाँच असफल (HTTP ${response.status})।`);
      const body = await response.json().catch(() => null);
      if (body?.data?._id !== deviceId) throw new Error('TextBee से डिवाइस की पुष्टि नहीं हुई।');
      if (body.data.enabled !== true) throw new Error('फोन के TextBee ऐप में Gateway Enabled चालू करें।');
      if (!authorized()) throw new Error('Admin session changed. Sign in and try again.');

      const next = { apiKey, deviceId };
      try {
        fs.writeFileSync(temporary, safeStorage.encryptString(JSON.stringify(next)), { mode: 0o600, flag: 'wx' });
        fs.renameSync(temporary, file);
      } catch {
        throw new Error('SMS settings इस PC पर सेव नहीं हो सकीं।');
      }
      loaded = true;
      config = next;
      unreadable = false;
      return status();
    } finally {
      connecting = false;
      try { fs.rmSync(temporary, { force: true }); } catch { /* keep the original result */ }
    }
  }

  function disconnect() {
    if (connecting) throw new Error('SMS connection check already in progress');
    fs.rmSync(file, { force: true });
    loaded = true;
    config = null;
    unreadable = false;
    return status();
  }

  return {
    connect, disconnect, status,
    getGateway() {
      load();
      return config && { ...config, apiUrl: gatewayUrl + '/send-sms' };
    },
  };
}

module.exports = { createTextbeeSettings };
