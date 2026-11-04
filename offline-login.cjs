'use strict';
// Local owner setup on the clinic PC. No shared password in the application.
// Hash verifies offline login. Sync credentials and remembered access are OS-encrypted.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const MIN_SECRET = 8, MAX_SECRET = 256;
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const deriveKey = (secret, salt) => new Promise((resolve, reject) =>
  crypto.scrypt(secret, salt, 64, SCRYPT, (error, key) => error ? reject(error) : resolve(key)));

function createOffline({ file, safeStorage, access, now = Date.now, fetchCloud, config, onCloudToken = () => {} }) {
  let generation = 0, busy = false, pendingChangeToken = null;
  const encryptedAvailable = () => {
    try { return !!safeStorage?.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend?.() !== 'basic_text'; }
    catch { return false; }
  };
  function read() {
    if (!fs.existsSync(file)) return null;
    try {
      const wrapper = JSON.parse(fs.readFileSync(file, 'utf8'));
      const record = wrapper.enc
        ? JSON.parse(safeStorage.decryptString(Buffer.from(wrapper.data, 'base64')))
        : wrapper.data; // Legacy plaintext hash requires manual login, never auto-restore.
      if (!record?.email || !record.userId || Buffer.from(record.hash, 'base64').length !== 64 || Buffer.from(record.salt, 'base64').length !== 16) throw Error();
      return { ...record, trustedStorage: wrapper.enc === true };
    } catch { throw new Error('Saved login read nahi ho paya. Login file delete/reset na karein; recovery zaroori hai. Patient data unchanged hai.'); }
  }
  function write(record) {
    if (!encryptedAvailable()) throw new Error('Windows secure storage available nahi hai. Windows user session unlock karke app dobara kholein.');
    const { trustedStorage, ...data } = record;
    const wrapper = { v: 2, enc: true, data: safeStorage.encryptString(JSON.stringify(data)).toString('base64') };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    const fd = fs.openSync(tmp, 'w', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(wrapper)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  }
  function grant(record) {
    const principal = { userId: record.userId, role: 'admin', pages: [], displayName: record.email,
      email: record.email, sessionKey: crypto.randomUUID(), localAdmin: true, offline: true, expiresAt: Number.MAX_SAFE_INTEGER };
    access.setPrincipal(principal);
    return { success: true, principal };
  }
  function status() {
    const record = read();
    return { configured: !!record, email: record?.email || 'admin', secureStorage: encryptedAvailable(), mustChange: !!record?.mustChange };
  }
  async function authenticate(args, setup = false) {
    if (busy) return { success: false, error: 'Login chal raha hai. Ek pal ruk kar try karein.' };
    busy = true;
    const epoch = generation;
    try {
      let record = read();
      const email = normalizeEmail(args?.identifier), secret = args?.secret;
      // A temporary account exists only on fresh installations and cannot access data
      // until its credentials have been changed.
      if (!record && !setup && email === 'admin' && secret === 'admin') {
        const salt = crypto.randomBytes(16);
        const hash = await deriveKey(secret, salt);
        record = { email, userId: crypto.randomUUID(), salt: salt.toString('base64'),
          hash: hash.toString('base64'), mustChange: true, remember: false };
        write(record);
      }
      const validIdentity = /^[a-z][a-z0-9._-]{2,63}$/.test(email) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const bootstrapLogin = !!record?.mustChange && email === 'admin' && secret === 'admin';
      if (!validIdentity || email.length > 254 || typeof secret !== 'string'
        || ((!bootstrapLogin && secret.length < MIN_SECRET) || secret.length > MAX_SECRET))
        return { success: false, error: 'Sahi ID aur kam se kam 8 characters ka password dalein.' };
      if (setup) {
        if (record || access.getPrincipal()) return { success: false, error: 'Admin pehle se configured hai. Existing login use karein.' };
        if (args.confirmSecret !== secret) return { success: false, error: 'Dono passwords ek jaise hone chahiye.' };
        const salt = crypto.randomBytes(16);
        const hash = await deriveKey(secret, salt);
        record = { email, userId: crypto.randomUUID(), salt: salt.toString('base64'), hash: hash.toString('base64') };
      } else {
        if (!record) return { success: false, error: 'Pehle is PC par admin setup karein.' };
        if (record.lockUntil > now()) return { success: false, error: 'Bahut galat attempts. 15 minute baad try karein.' };
        const actual = await deriveKey(secret, Buffer.from(record.salt, 'base64'));
        if (epoch !== generation) return { success: false, error: 'Login cancel ho gaya.' };
        if (email !== record.email || !crypto.timingSafeEqual(actual, Buffer.from(record.hash, 'base64'))) {
          record.fails = (record.fails || 0) + 1;
          if (record.fails >= 5) { record.fails = 0; record.lockUntil = now() + 15 * 60000; }
          write(record);
          return { success: false, error: 'ID ya password galat hai.' };
        }
      }
      if (epoch !== generation) return { success: false, error: 'Login cancel ho gaya.' };
      if (record.mustChange) {
        // The bootstrap password never creates a privileged session.
        pendingChangeToken = crypto.randomUUID();
        return { success: true, requiresPasswordChange: true, changeToken: pendingChangeToken };
      }
      record.fails = 0; record.lockUntil = 0;
      record.remember = args.remember !== false;
      delete record.syncSecret; // Local password is never a cloud credential.
      delete record.cloud;
      write(record);
      generation++;
      onCloudToken(null);
      return grant(record);
    } finally { busy = false; }
  }
  async function changeCredentials(args = {}) {
    const epoch = generation;
    if (busy) return { success: false, error: 'Another authentication operation is running.' };
    busy = true;
    try {
      const record = read();
      if (!record) return { success: false, error: 'Offline admin account not found.' };
      const principal = access.getPrincipal();
      const rotatingDefault = !!record.mustChange && !!pendingChangeToken && args.changeToken === pendingChangeToken;
      const loggedInOwner = !!principal?.localAdmin && principal.userId === record.userId;
      if (!rotatingDefault && !loggedInOwner) return { success: false, error: 'Admin login required.' };
      const currentId = normalizeEmail(args.identifier);
      const nextId = normalizeEmail(args.newIdentifier);
      const currentSecret = String(args.secret || '');
      const nextSecret = args.newSecret;
      if (currentId !== record.email || !(/^[a-z][a-z0-9._-]{2,63}$/.test(nextId) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextId))
        || nextId.length > 254 || typeof nextSecret !== 'string' || nextSecret.length < MIN_SECRET
        || nextSecret.length > MAX_SECRET || args.confirmSecret !== nextSecret
        || (nextId === 'admin' && nextSecret === 'admin')) {
        return { success: false, error: 'Choose a valid login ID and a different password of 8+ characters.' };
      }
      const actual = await deriveKey(currentSecret, Buffer.from(record.salt, 'base64'));
      if (!crypto.timingSafeEqual(actual, Buffer.from(record.hash, 'base64')))
        return { success: false, error: 'Current ID or password is incorrect.' };
      const salt = crypto.randomBytes(16), hash = await deriveKey(nextSecret, salt);
      if (epoch !== generation) return { success: false, error: 'Password change cancelled. Sign in again.' };
      record.email = nextId;
      record.salt = salt.toString('base64');
      record.hash = hash.toString('base64');
      record.mustChange = false; record.fails = 0; record.lockUntil = 0;
      record.remember = args.remember !== false;
      delete record.syncSecret; delete record.cloud;
      write(record); pendingChangeToken = null; generation++;
      onCloudToken(null);
      return grant(record);
    } finally { busy = false; }
  }
  function restore() {
    if (access.getPrincipal()) return access.getPrincipal();
    const record = read();
    if (record?.trustedStorage && record.remember === true && !record.mustChange) return grant(record).principal;
    return null;
  }
  function logout() {
    generation++; pendingChangeToken = null; onCloudToken(null); access.setPrincipal(null);
    const record = read();
    if (record) { record.remember = false; delete record.cloud; write(record); }
  }
  async function connect() {
    if (!access.getPrincipal()?.localAdmin) return { success: false };
    const record = read();
    if (!record?.trustedStorage || !config?.url || !config?.key) return { success: false, error: 'API configuration missing' };
    // Migrate old encrypted records without deleting ownership or patient data.
    if (record.syncSecret || record.cloud) {
      delete record.syncSecret; delete record.cloud; write(record);
    }
    onCloudToken(null);
    return { success: true, mode: 'api' };
  }
  return { status, setup: args => authenticate(args, true), login: args => authenticate(args), changeCredentials, restore, logout, connect };
}

function register({ ipcMain, access, app, safeStorage, net, config, onCloudToken }) {
  // Resolve after main.js changes userData; v2.0.46 captured the earlier path.
  const legacyFile = path.join(app.getPath('userData'), 'offline-admin.json');
  let offline;
  const get = () => {
    if (offline) return offline;
    const file = path.join(app.getPath('userData'), 'offline-admin.json');
    if (file !== legacyFile && !fs.existsSync(file) && fs.existsSync(legacyFile)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.copyFileSync(legacyFile, file, fs.constants.COPYFILE_EXCL);
    }
    return offline = createOffline({ file, safeStorage, access, fetchCloud: (...args) => net.fetch(...args), config, onCloudToken });
  };
  ipcMain.handle('auth:offlineStatus', () => get().status());
  ipcMain.handle('auth:offlineSetup', (_event, args) => get().setup(args));
  ipcMain.handle('auth:offlineLogin', (_event, args) => get().login(args));
  ipcMain.handle('auth:changeOfflineCredentials', (_event, args) => get().changeCredentials(args));

  return { restore: () => get().restore(), logout: () => get().logout() };
}
module.exports = { register, createOffline, normalizeEmail, MIN_SECRET };
