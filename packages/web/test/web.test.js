/**
 * @fileoverview Kveil Web 运行时库测试
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    console.log('✅ Kveil Web 初始化成功');
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
    console.log('✅ 必需密钥检查通过');
  }

  _checkInitialized() {
    if (!this._initialized) {
      throw new Error('Kveil 未初始化');
    }
  }
}

// 运行测试
async function runTests() {
  const binPath = path.join(__dirname, '../../../kveil_example/.kveil/secrets.bin');
  const kveil = new KveilWebTest();

  console.log('🧪 Kveil Web 运行时库测试\n');

  // 测试 1: 初始化
  console.log('测试 1: 初始化 Kveil');
  try {
    await kveil.init(binPath);
  } catch (e) {
    console.log(`❌ 失败：${e.message}`);
    return;
  }

  // 测试 2: 获取 mi_api_key
  console.log('\n测试 2: 获取 mi_api_key');
  try {
    const key = kveil.get('mi_api_key');
    console.log(`✅ mi_api_key: ${key}`);
  } catch (e) {
    console.log(`❌ 失败：${e.message}`);
  }

  // 测试 3: 获取所有密钥
  console.log('\n测试 3: 获取所有密钥');
  try {
    const keys = kveil.getKeys();
    console.log(`✅ 已加载密钥：${keys.join(', ')}`);
  } catch (e) {
    console.log(`❌ 失败：${e.message}`);
  }

  // 测试 4: 检查必需密钥
  console.log('\n测试 4: 检查必需密钥');
  try {
    kveil.checkRequiredKeys(['mi_api_key']);
  } catch (e) {
    console.log(`❌ 失败：${e.message}`);
  }

  console.log('\n✅ 所有测试完成');
}

runTests().catch(console.error);
