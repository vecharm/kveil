/**
 * @fileoverview Web Crypto API 加解密工具
 * 使用 AES-256-GCM 模式
 */

// XOR 掩码 - 必须与 CLI 工具一致
const XOR_MASK = new Uint8Array([0x5A, 0x3C, 0x9F, 0x12, 0x7E, 0x4D, 0xB6, 0x81,
                                  0x23, 0xF5, 0x67, 0xA9, 0xD4, 0x0E, 0x8C, 0x31]);

/**
 * 从主密钥派生 AES-256 密钥
 * @param masterKey - 16 位主密钥
 * @returns 32 字节 AES 密钥
 */
async function deriveKey(masterKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(masterKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 使用 AES-256-GCM 解密
 * @param masterKey - 16 位主密钥
 * @param encrypted - base64 格式的加密字符串（iv|authTag|ciphertext）
 * @returns 解密后的明文
 */
export async function decrypt(masterKey: string, encrypted: string): Promise<string> {
  const parts = encrypted.split('|');
  if (parts.length !== 3) {
    throw new Error('加密数据格式错误');
  }

  const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));

  const key = await deriveKey(masterKey);

  // 合并 ciphertext 和 authTag（Web Crypto API 要求）
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      combined
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error(`解密失败：${error}`);
  }
}

/**
 * XOR 解码主密钥
 * @param encoded - XOR 编码的字节数组
 * @returns 解码后的 16 位主密钥
 */
export function xorDecode(encoded: Uint8Array): string {
  const decoded = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    decoded[i] = encoded[i] ^ XOR_MASK[i];
  }
  const decoder = new TextDecoder();
  return decoder.decode(decoded);
}

/**
 * 计算主密钥的校验值 (MD5 前 16 字节)
 * 注意：Web Crypto API 不支持 MD5，这里使用 SHA-256 的前 16 字节作为替代
 * @param masterKey - 16 位主密钥
 * @returns 16 字节校验值
 */
export async function computeChecksum(masterKey: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(masterKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  return new Uint8Array(hashBuffer.slice(0, 16));
}

/**
 * 验证校验值
 * @param masterKey - 16 位主密钥
 * @param storedChecksum - 存储的校验值
 * @returns 校验是否通过
 */
export async function verifyChecksum(
  masterKey: string,
  storedChecksum: Uint8Array
): Promise<boolean> {
  const expectedChecksum = await computeChecksum(masterKey);
  for (let i = 0; i < 16; i++) {
    if (expectedChecksum[i] !== storedChecksum[i]) {
      return false;
    }
  }
  return true;
}

/**
 * base64 转 Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
