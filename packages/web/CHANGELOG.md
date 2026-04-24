# Changelog

## 0.3.0 (Breaking Change)

### ⚠️ BREAKING CHANGES
- **Directory Rename**: The default configuration directory has been renamed from `.kveil` to `.kvbin`.
  - **Migration**: Please rename your `.kveil` folder to `.kvbin` in your project root.
  - **Reason**: To improve security and reduce the likelihood of AI crawlers associating the directory with the tool.
- **Path Obfuscation**: Runtime libraries now use dynamic path construction.

### Features
- Added comprehensive test suite (11 tests).
- Compatible with kveil CLI v0.3.0.

## 0.2.0

- Initial release
- AES-256-GCM encrypted key storage
- XOR encoded master key
- MD5 checksum verification
- Web/React runtime library for kveil CLI tool
