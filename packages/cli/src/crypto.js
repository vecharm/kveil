const crypto = require('crypto');

// XOR 掩码 - 硬编码在运行时库中，AI 不会读取 bin 文件
const XOR_MASK = [0x5A, 0x3C, 0x9F, 0x12, 0x7E, 0x4D, 0xB6, 0x81,
                  0x23, 0xF5, 0x67, 0xA9, 0xD4, 0x0E, 0x8C, 0x31];

/**
 * 生成随机 16 位主密钥
 * @returns {string} 16 位随机密钥
 */
function generateMasterKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(16);

  for (let i = 0; i < 16; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * XOR 编码主密钥
 * @param {string} masterKey - 16 位主密钥
 * @returns {Uint8Array} XOR 编码后的字节数组
 */
function xorEncode(masterKey) {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(masterKey);
  const encoded = new Uint8Array(16);

  for (let i = 0; i < 16; i++) {
    encoded[i] = keyBytes[i] ^ XOR_MASK[i];
  }

  return encoded;
}

/**
 * XOR 解码主密钥
 * @param {Uint8Array} encoded - XOR 编码的字节数组
 * @returns {string} 解码后的 16 位主密钥
 */
function xorDecode(encoded) {
  const decoded = new Uint8Array(16);

  for (let i = 0; i < 16; i++) {
    decoded[i] = encoded[i] ^ XOR_MASK[i];
  }

  const decoder = new TextDecoder();
  return decoder.decode(decoded);
}

/**
 * 从主密钥派生 AES-256 密钥
 * @param {string} masterKey - 16 位主密钥
 * @returns {Buffer} 32 字节 AES 密钥
 */
function deriveKey(masterKey) {
  return crypto.createHash('sha256').update(masterKey, 'utf8').digest();
}

/**
 * 使用 AES-256-GCM 加密
 * @param {string} masterKey - 16 位主密钥
 * @param {string} plaintext - 明文
 * @returns {string} base64 格式的加密字符串 (iv + authTag + ciphertext)
 */
function encrypt(masterKey, plaintext) {
  const key = deriveKey(masterKey);
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  // 返回 base64 格式：iv (12 字节) + authTag (16 字节) + ciphertext
  return iv.toString('base64') + '|' + authTag + '|' + encrypted;
}

/**
 * 使用 AES-256-GCM 解密
 * @param {string} masterKey - 16 位主密钥
 * @param {string} encrypted - base64 格式的加密字符串
 * @returns {string} 解密后的明文
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
 * 计算主密钥的校验值 (MD5 前 16 字节)
 * @param {string} masterKey - 16 位主密钥
 * @returns {Uint8Array} 16 字节校验值
 */
function computeChecksum(masterKey) {
  const md5Hash = crypto.createHash('md5').update(masterKey, 'utf8').digest();
  return new Uint8Array(md5Hash.slice(0, 16));
}

/**
 * 验证校验值
 * @param {string} masterKey - 16 位主密钥
 * @param {Uint8Array} storedChecksum - 存储的校验值
 * @returns {boolean} 校验是否通过
 */
function verifyChecksum(masterKey, storedChecksum) {
  const expectedChecksum = computeChecksum(masterKey);

  for (let i = 0; i < 16; i++) {
    if (expectedChecksum[i] !== storedChecksum[i]) {
      return false;
    }
  }

  return true;
}

module.exports = {
  XOR_MASK,
  generateMasterKey,
  xorEncode,
  xorDecode,
  deriveKey,
  encrypt,
  decrypt,
  computeChecksum,
  verifyChecksum
};
