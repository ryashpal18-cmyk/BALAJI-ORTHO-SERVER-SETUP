'use strict';

const { createCipheriv, createDecipheriv, randomBytes, scrypt } = require('node:crypto');
const { promisify } = require('node:util');

const deriveKey = promisify(scrypt);
const format = 'bj-opd-encrypted-backup-v1';
const kdf = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const maxBytes = 512 * 1024 * 1024;

function validatePassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.trim().length < 12 || passphrase.length > 256) {
    throw new Error('Backup password 12–256 characters का रखें।');
  }
}

async function encryptBackup(json, passphrase) {
  validatePassphrase(passphrase);
  if (typeof json !== 'string' || Buffer.byteLength(json) > maxBytes) throw new Error('Backup file too large');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt, 32, kdf);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(format));
    const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    return JSON.stringify({
      format, salt: salt.toString('base64'), iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64'),
    });
  } finally { key.fill(0); }
}

async function decryptBackup(envelope, passphrase) {
  validatePassphrase(passphrase);
  if (typeof envelope !== 'string' || envelope.length > Math.ceil(maxBytes * 4 / 3) + 4096) throw new Error('Backup file too large');
  let parsed;
  try { parsed = JSON.parse(envelope); } catch { throw new Error('Invalid encrypted backup'); }
  if (parsed?.format !== format || typeof parsed.data !== 'string') throw new Error('Invalid encrypted backup');
  const parts = ['salt', 'iv', 'tag'].map(field => Buffer.from(typeof parsed[field] === 'string' ? parsed[field] : '', 'base64'));
  const [salt, iv, tag] = parts;
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted backup');
  const key = await deriveKey(passphrase, salt, 32, kdf);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(format));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8');
  } catch { throw new Error('Backup password गलत है या फाइल बदल गई है।'); }
  finally { key.fill(0); }
}

module.exports = { encryptBackup, decryptBackup, validatePassphrase };
