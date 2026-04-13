import 'package:flutter/material.dart';
import 'package:kveil/kveil.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 初始化 Kveil
  try {
    await Kveil.init();
    debugPrint('✅ Kveil 初始化成功');
  } catch (e) {
    debugPrint('❌ Kveil 初始化失败：$e');
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kveil Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const KveilTestPage(),
    );
  }
}

class KveilTestPage extends StatefulWidget {
  const KveilTestPage({super.key});

  @override
  State<KveilTestPage> createState() => _KveilTestPageState();
}

class _KveilTestPageState extends State<KveilTestPage> {
  String _result = '点击按钮测试 Kveil';
  String _apiKey = '';

  @override
  void initState() {
    super.initState();
    _checkKeys();
  }

  void _checkKeys() {
    try {
      final keys = Kveil.getKeys();
      setState(() {
        _result = '已加载密钥：${keys.join(', ')}';
      });
    } catch (e) {
      setState(() {
        _result = '获取密钥列表失败：$e';
      });
    }
  }

  void _getApiKey() {
    try {
      final key = Kveil.get('mi_api_key');
      setState(() {
        _apiKey = key;
        _result = '✅ 成功获取 mi_api_key: $key';
      });
    } catch (e) {
      setState(() {
        _result = '❌ 获取 mi_api_key 失败：$e';
      });
    }
  }

  void _checkRequiredKeys() {
    try {
      Kveil.checkRequiredKeys(['mi_api_key']);
      setState(() {
        _result = '✅ 必需密钥检查通过';
      });
    } catch (e) {
      setState(() {
        _result = '❌ 必需密钥检查失败：$e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: const Text('Kveil 测试'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Text(
                'Kveil Flutter 运行时库测试',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _getApiKey,
                child: const Text('获取 mi_api_key'),
              ),
              const SizedBox(height: 10),
              if (_apiKey.isNotEmpty)
                Text(
                  '密钥值：$_apiKey',
                  style: const TextStyle(color: Colors.green, fontSize: 12),
                ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _checkRequiredKeys,
                child: const Text('检查必需密钥'),
              ),
              const SizedBox(height: 20),
              Text(
                _result,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
