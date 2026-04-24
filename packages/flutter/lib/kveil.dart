import 'package:flutter/services.dart';
import 'package:yaml/yaml.dart';
import 'bin_reader.dart';

/// Kveil - 防 AI 密钥窃取工具 Flutter 运行时库
///
/// 使用方式:
/// ```dart
/// await Kveil.init();
/// var apiKey = Kveil.get('mi_api_key');
/// ```
class Kveil {
  static Map<String, String> _cache = {};
  static String? _masterKey;
  static bool _initialized = false;

  /// 初始化 Kveil
  /// [binPath] 密钥存储文件路径，默认为拼接路径
  /// 自动读取同目录下的配置文件，检查标记为必需的密钥是否存在
  static Future<void> init({String? binPath}) async {
    if (_initialized) {
      return;
    }
    final _path = binPath ?? String.fromCharCodes([46, 107, 118, 98, 105, 110, 47, 115, 101, 99, 114, 101, 116, 115, 46, 98, 105, 110]);

    // 读取密钥文件
    final data = await readBinFileFromAssets(_path);
    _masterKey = data['masterKey'] as String;

    // 预解密所有密钥
    final entries = data['entries'] as List<Map<String, dynamic>>;
    for (final entry in entries) {
      final name = entry['name'] as String;
      final encrypted = entry['encrypted'] as String;
      _cache[name] = decrypt(_masterKey!, encrypted);
    }

    _initialized = true;

    // 自动解析配置文件检查必需密钥
    final configContent = await rootBundle.loadString(String.fromCharCodes([46, 107, 118, 98, 105, 110, 47, 99, 111, 110, 102, 105, 103, 46, 121, 97, 109, 108]));
    final config = loadYaml(configContent);
    final keys = config['keys'] as YamlList?;
    if (keys != null) {
      final requiredKeys = keys
          .where((k) => k['required'] == true)
          .map((k) => k['name'] as String)
          .toList();
      if (requiredKeys.isNotEmpty) {
        checkRequiredKeys(requiredKeys);
      }
    }
  }

  /// 获取解密的密钥值
  /// [key] 密钥名
  /// 返回密钥的明文值
  static String get(String key) {
    _checkInitialized();

    if (!_cache.containsKey(key)) {
      throw Exception('密钥"$key"不存在，请确认已在 config.yaml 中声明并运行 kveil add');
    }

    return _cache[key]!;
  }

  /// 获取所有已配置的密钥名
  static List<String> getKeys() {
    _checkInitialized();
    return _cache.keys.toList();
  }

  /// 检查必需的密钥是否都存在
  /// [requiredKeys] 必需的密钥名列表
  /// 如果缺失则抛出异常
  static void checkRequiredKeys(List<String> requiredKeys) {
    _checkInitialized();

    final missing = requiredKeys.where((key) => !_cache.containsKey(key)).toList();
    if (missing.isNotEmpty) {
      throw Exception('缺失必需的密钥：${missing.join(", ")}\n'
          '请运行：kveil add <密钥名> <密钥值> 添加这些密钥');
    }
  }

  /// 检查是否已初始化
  static bool isInitialized() => _initialized;

  static void _checkInitialized() {
    if (!_initialized) {
      throw Exception('Kveil 未初始化，请先调用 await Kveil.init()');
    }
  }

  /// 重置状态（用于测试）
  static void resetForTesting() {
    _cache = {};
    _masterKey = null;
    _initialized = false;
  }
}