import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kveil/bin_reader.dart';
import 'package:kveil/kveil.dart';

/// 创建测试用的 bin 文件数据
Uint8List createMockBin(String masterKey, List<Map<String, String>> entries) {
  final builder = BytesBuilder();
  builder.add(xorEncode(masterKey));
  builder.add(computeChecksum(masterKey));
  
  for (final entry in entries) {
    final nameBytes = utf8.encode(entry['name']!);
    final encBytes = utf8.encode(entry['encrypted']!);
    
    builder.addByte(0); // 名称长度高字节
    builder.addByte(nameBytes.length); // 名称长度低字节
    builder.add(nameBytes);
    
    builder.addByte(0); // 加密值长度高字节
    builder.addByte(encBytes.length); // 加密值长度低字节
    builder.add(encBytes);
  }
  return builder.toBytes();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  
  // 使用预生成的有效数据（与 CLI 测试一致）
  const masterKey = 'y6AVRsjqmFCZIzOi';
  const secretValue = 'test_value_123';
  const encryptedValue = '/0a53hc9BxCM7Qth|StnSvICE1EC3n7IIP9hqpA==|QapJIcVyveR1X0k/QyQ=';
  late Uint8List mockBinData;
  
  // YAML 配置：key1 是必需的，key2 不是
  const mockYaml = '''
keys:
  - name: key1
    required: true
  - name: key2
    required: false
''';

  setUpAll(() async {
    mockBinData = createMockBin(masterKey, [
      {'name': 'key1', 'encrypted': encryptedValue},
      {'name': 'key2', 'encrypted': encryptedValue},
    ]);

    // Mock rootBundle 拦截资源加载
    final binding = TestWidgetsFlutterBinding.instance;
    binding.defaultBinaryMessenger.setMockMessageHandler('flutter/assets', (message) async {
      if (message == null) return null;
      final name = utf8.decode(message.buffer.asUint8List().where((b) => b != 0).toList());
      
      if (name.contains('secrets.bin')) {
        return mockBinData.buffer.asByteData();
      }
      if (name.contains('config.yaml')) {
        return Uint8List.fromList(utf8.encode(mockYaml)).buffer.asByteData();
      }
      return null;
    });
  });

  tearDownAll(() {
    TestWidgetsFlutterBinding.instance.defaultBinaryMessenger.setMockMessageHandler('flutter/assets', null);
  });

  group('Kveil 完整测试', () {
    setUp(() {
      Kveil.resetForTesting();
    });

    test('未初始化时 get 应该抛出异常', () {
      expect(() => Kveil.get('key1'), throwsException);
    });

    test('未初始化时 getKeys 应该抛出异常', () {
      expect(() => Kveil.getKeys(), throwsException);
    });

    test('未初始化时 checkRequiredKeys 应该抛出异常', () {
      expect(() => Kveil.checkRequiredKeys(['key1']), throwsException);
    });

    test('isInitialized 应该返回 false', () {
      expect(Kveil.isInitialized(), isFalse);
    });

    test('init 应该正常加载并解密密钥', () async {
      await Kveil.init();
      
      expect(Kveil.isInitialized(), isTrue);
      expect(Kveil.get('key1'), equals(secretValue));
      expect(Kveil.getKeys(), containsAll(['key1', 'key2']));
    });

    test('get 密钥不存在应该抛出异常', () async {
      await Kveil.init();
      expect(() => Kveil.get('nonexistent'), throwsException);
    });
    
    test('checkRequiredKeys 缺失密钥应该抛出异常', () async {
      await Kveil.init();
      expect(() => Kveil.checkRequiredKeys(['missing_key']), throwsException);
    });
  });
}
