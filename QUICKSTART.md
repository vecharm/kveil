# kveil 快速开始

5 分钟内完成密钥加密存储集成。

## 1. 初始化项目

```bash
cd your-project
npx kveil@latest init
```

或本地安装：
```bash
cd path/to/kveil/packages/cli
npm install
npm link
kveil init
```

生成文件：
- `.kveil/secrets.bin` - 加密的密钥存储文件
- `.kveil/config.yaml` - 密钥声明配置

## 2. 添加密钥

```bash
kveil add mi_api_key "sk-123qsdawda"
kveil add stripe_key "sk_test_xxx"
```

## 3. 查看密钥

```bash
# 列出所有密钥（明文 + 密文）
kveil show -l

# 查看指定密钥
kveil show mi_api_key
```

## 4. 选择平台集成

### Flutter

**pubspec.yaml**
```yaml
dependencies:
  kveil:
    path: path/to/kveil/packages/flutter

flutter:
  assets:
    - .kveil/secrets.bin
    - .kveil/config.yaml
```

**代码使用**
```dart
import 'package:kveil/kveil.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Kveil.init();
  
  final apiKey = Kveil.get('mi_api_key');
  runApp(MyApp());
}
```

---

### Web/React

**安装**
```bash
npm install path/to/kveil/packages/web
```

**配置** - 复制 bin 文件到 public 目录：
```bash
cp .kveil/secrets.bin public/.kveil/secrets.bin
```

**代码使用**
```typescript
import { Kveil } from 'kveil-web';

await Kveil.init('/.kveil/secrets.bin');
const apiKey = Kveil.get('mi_api_key');
```

**React Hooks 示例**
```tsx
function useApiKey(name: string) {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    if (Kveil.isInitialized()) {
      setKey(Kveil.get(name));
    }
  }, [name]);

  return key;
}
```

---

### Node.js（CLI 工具）

```bash
npm install path/to/kveil/packages/cli
```

```javascript
const { readBinFile } = require('@kveil/cli/src/bin-format');
const { decrypt } = require('@kveil/cli/src/crypto');

const { masterKey, entries } = readBinFile('.kveil/secrets.bin');
const value = decrypt(masterKey, entries[0].encrypted);
```

## 5. 检查必需密钥

确保所有必需的密钥都已配置：

**Flutter**
```dart
Kveil.checkRequiredKeys(['mi_api_key', 'stripe_key']);
```

**Web/React**
```typescript
Kveil.checkRequiredKeys(['mi_api_key', 'stripe_key']);
```

## 6. 添加到 .gitignore

```gitignore
# 保留 bin 文件（已加密）
# .kveil/secrets.bin

# 但忽略 config.yaml 如果包含敏感信息
.kveil/config.yaml
```

## 常见问题

**Q: 密钥丢失了怎么办？**  
A: 重新运行 `kveil add <name> <value>` 添加即可。

**Q: 可以更换主密钥吗？**  
A: 运行 `kveil init -k <新密钥>` 会覆盖现有主密钥，需要重新添加所有密钥。

**Q: bin 文件可以提交到 Git 吗？**  
A: 可以，密钥已加密存储。但建议不要提交到公共仓库。

**Q: 如何在 CI/CD 中使用？**  
A: 推荐在 CI 环境中使用环境变量注入密钥，不使用 bin 文件。

## 下一步

- 查看完整文档：[README.md](./README.md)
- 了解 bin 文件格式和安全说明
