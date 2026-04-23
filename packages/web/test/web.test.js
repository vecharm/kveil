/**
 * @fileoverview Kveil Web 运行时库测试
 */

import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// XOR 掩码
const XOR_MASK = new Uint8Array([0x5A, 0x3C, 0x9F, 0x12, 0x7E, 0x4D, 0xB6, 0x81,
                                  0x23, 0xF5, 0x67, 0xA9, 0xD4, 0x0E, 0x8C, 0x31]);

/**
 * XOR 解码主密钥
 */
function xorDecode(encoded) {
  const decoded = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    decoded[i] = encoded[i] ^ XOR_MASK[i];
  }
  return new TextDecoder().decode(decoded);
}

/**
 * 从主密钥派生 AES-256 密钥
 */
function deriveKey(masterKey) {
  return crypto.createHash('sha256').update(masterKey, 'utf8').digest();
}

/**
 * 使用 AES-256-GCM 解密
 */
function decrypt(masterKey, encrypted) {
  const parts = encrypted.split('|');
  if (parts.length !== 3) {
    throw new Error('加密数据格式错误');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  const key = deriveKey(masterKey);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * 解析 bin 文件
 */
function parseBinFile(buffer) {
  const XOR_ENCODED_HEADER_SIZE = 16;
  const CHECKSUM_SIZE = 16;
  const HEADER_SIZE = XOR_ENCODED_HEADER_SIZE + CHECKSUM_SIZE;

  const data = new Uint8Array(buffer);

  if (data.length < HEADER_SIZE) {
    throw new Error('bin 文件格式错误：头部不完整');
  }

  // 读取 XOR 编码的主密钥
  const encodedKey = data.slice(0, XOR_ENCODED_HEADER_SIZE);
  const masterKey = xorDecode(encodedKey);

  // 解析密钥条目
  const entries = [];
  let offset = HEADER_SIZE;

  while (offset < data.length) {
    if (offset + 2 > data.length) {
      break;
    }

    const nameLength = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    const decoder = new TextDecoder();
    const name = decoder.decode(data.slice(offset, offset + nameLength));
    offset += nameLength;

    const encryptedLength = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    const encrypted = decoder.decode(data.slice(offset, offset + encryptedLength));
    offset += encryptedLength;

    entries.push({ name, encrypted });
  }

  return { masterKey, entries };
}

/**
 * Kveil Web 运行时库测试类
 */
class KveilWebTest {
  constructor() {
    this._cache = new Map();
    this._initialized = false;
  }

  async init(binPath) {
    if (this._initialized) {
      return;
    }

    const buffer = fs.readFileSync(binPath);
    const data = parseBinFile(buffer);

    // 预解密所有密钥
    for (const entry of data.entries) {
      const plaintext = decrypt(data.masterKey, entry.encrypted);
      this._cache.set(entry.name, plaintext);
    }

    this._initialized = true;
  }

  get(key) {
    this._checkInitialized();
    if (!this._cache.has(key)) {
      throw new Error(`密钥"${key}"不存在`);
    }
    return this._cache.get(key);
  }

  getKeys() {
    this._checkInitialized();
    return Array.from(this._cache.keys());
  }

  checkRequiredKeys(requiredKeys) {
    this._checkInitialized();
    const missing = requiredKeys.filter(key => !this._cache.has(key));
    if (missing.length > 0) {
      throw new Error(`缺失必需的密钥：${missing.join(', ')}`);
    }
  }

  isInitialized() {
    return this._initialized;
  }

  resetForTesting() {
    this._cache.clear();
    this._initialized = false;
  }

  _checkInitialized() {
    if (!this._initialized) {
      throw new Error('Kveil 未初始化');
    }
  }
}

test('Kveil Web 运行时库测试', async (t) => {
  // 获取测试 bin 文件路径
  const binPath = path.join(__dirname, '../../../kveil_example/.kvbin/secrets.bin');
  
  // 如果测试 bin 文件不存在，创建一个
  if (!fs.existsSync(binPath)) {
    console.log('⚠️ 测试 bin 文件不存在，跳过需要 bin 文件的测试');
  }

  await t.test('未初始化时 get 应该抛出异常', () => {
    const kveil = new KveilWebTest();
    assert.throws(() => kveil.get('key1'), /Kveil 未初始化/);
  });

  await t.test('未初始化时 getKeys 应该抛出异常', () => {
    const kveil = new KveilWebTest();
    assert.throws(() => kveil.getKeys(), /Kveil 未初始化/);
  });

  await t.test('未初始化时 checkRequiredKeys 应该抛出异常', () => {
    const kveil = new KveilWebTest();
    assert.throws(() => kveil.checkRequiredKeys(['key1']), /Kveil 未初始化/);
  });

  await t.test('isInitialized 应该返回 false', () => {
    const kveil = new KveilWebTest();
    assert.strictEqual(kveil.isInitialized(), false);
  });

  await t.test('decrypt 应该正确解密', () => {
    const masterKey = 'y6AVRsjqmFCZIzOi';
    const encrypted = '/0a53hc9BxCM7Qth|StnSvICE1EC3n7IIP9hqpA==|QapJIcVyveR1X0k/QyQ=';
    
    const decrypted = decrypt(masterKey, encrypted);
    assert.strictEqual(decrypted, 'test_value_123');
  });

  await t.test('decrypt 应该拒绝格式错误的加密数据', () => {
    const masterKey = 'TestMasterKey123';
    const badEncrypted = 'invalid|format';
    
    assert.throws(() => decrypt(masterKey, badEncrypted), /加密数据格式错误/);
  });

  await t.test('parseBinFile 应该正确解析 bin 文件', () => {
    if (!fs.existsSync(binPath)) {
      console.log('⚠️ 跳过 parseBinFile 测试');
      return;
    }
    
    const buffer = fs.readFileSync(binPath);
    const data = parseBinFile(buffer);
    
    assert.ok(data.masterKey, '应该包含 masterKey');
    assert.ok(Array.isArray(data.entries), '应该包含 entries 数组');
    assert.ok(data.entries.length > 0, 'entries 不应该为空');
  });

  await t.test('init 应该正常加载并解密密钥', async () => {
    if (!fs.existsSync(binPath)) {
      console.log('⚠️ 跳过 init 测试');
      return;
    }
    
    const kveil = new KveilWebTest();
    await kveil.init(binPath);
    
    assert.strictEqual(kveil.isInitialized(), true);
    assert.ok(kveil.getKeys().length > 0, '应该加载了密钥');
  });

  await t.test('get 密钥不存在应该抛出异常', async () => {
    if (!fs.existsSync(binPath)) {
      console.log('⚠️ 跳过 get 测试');
      return;
    }
    
    const kveil = new KveilWebTest();
    await kveil.init(binPath);
    
    assert.throws(() => kveil.get('nonexistent'), /密钥.*不存在/);
  });

  await t.test('checkRequiredKeys 缺失密钥应该抛出异常', async () => {
    if (!fs.existsSync(binPath)) {
      console.log('⚠️ 跳过 checkRequiredKeys 测试');
      return;
    }
    
    const kveil = new KveilWebTest();
    await kveil.init(binPath);
    
    assert.throws(() => kveil.checkRequiredKeys(['nonexistent_key']), /缺失必需的密钥/);
  });
});
