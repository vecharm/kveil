/**
 * @fileoverview Kveil Web/React 运行时库
 *
 * 使用方式:
 * ```typescript
 * const apiKey = await Kveil.get('mi_api_key');
 * ```
 */

import { loadBinFile, type BinFileData } from './bin-reader';
import { decrypt } from './crypto';
import yaml from 'js-yaml';

class KveilClass {
  private _cache: Map<string, string> = new Map();
  private _initialized = false;

  /**
   * 初始化 Kveil
   * @param binUrl - 密钥存储文件 URL，默认为拼接路径
   * 自动读取同目录下的配置文件，检查标记为必需的密钥是否存在
   */
  async init(binUrl?: string): Promise<void> {
    if (this._initialized) {
      return;
    }
    const _url = binUrl ?? String.fromCharCode(46, 107, 118, 98, 105, 110, 47, 115, 101, 99, 114, 101, 116, 115, 46, 98, 105, 110);

    const data: BinFileData = await loadBinFile(_url);

    // 预解密所有密钥
    for (const entry of data.entries) {
      const plaintext = await decrypt(data.masterKey, entry.encrypted);
      this._cache.set(entry.name, plaintext);
    }

    this._initialized = true;

    // 自动解析配置文件检查必需密钥
    const configUrl = _url.replace(String.fromCharCode(115, 101, 99, 114, 101, 116, 115, 46, 98, 105, 110), String.fromCharCode(99, 111, 110, 102, 105, 103, 46, 121, 97, 109, 108));
    const response = await fetch(configUrl);
    if (!response.ok) {
      throw new Error('无法加载配置文件');
    }
    const text = await response.text();
    const config = yaml.load(text) as any;
    const keys = config?.keys as any[] | undefined;
    if (keys) {
      const requiredKeys = keys
        .filter((k: any) => k.required === true)
        .map((k: any) => k.name as string);
      if (requiredKeys.length > 0) {
        this.checkRequiredKeys(requiredKeys);
      }
    }
  }

  /**
   * 获取解密的密钥值
   * @param key - 密钥名
   * @returns 密钥的明文值
   */
  get(key: string): string {
    this._checkInitialized();

    if (!this._cache.has(key)) {
      throw new Error(`密钥"${key}"不存在，请确认已在 config.yaml 中声明并运行 kveil add`);
    }

    return this._cache.get(key)!;
  }

  /**
   * 获取所有已配置的密钥名
   * @returns 密钥名列表
   */
  getKeys(): string[] {
    this._checkInitialized();
    return Array.from(this._cache.keys());
  }

  /**
   * 检查必需的密钥是否都存在
   * @param requiredKeys - 必需的密钥名列表
   */
  checkRequiredKeys(requiredKeys: string[]): void {
    this._checkInitialized();

    const missing = requiredKeys.filter(key => !this._cache.has(key));
    if (missing.length > 0) {
      throw new Error(
        `缺失必需的密钥：${missing.join(', ')}\n` +
        '请运行：kveil add <密钥名> <密钥值> 添加这些密钥'
      );
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * 重置状态（用于测试）
   */
  resetForTesting(): void {
    this._cache.clear();
    this._initialized = false;
  }

  private _checkInitialized(): void {
    if (!this._initialized) {
      throw new Error('Kveil 未初始化，请先调用 await Kveil.init()');
    }
  }
}

// 导出单例
export const Kveil = new KveilClass();

// 也导出类以便测试
export { KveilClass };
