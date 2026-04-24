# Changelog

## 0.3.1

- Auto-check required keys from config file during init
- Throw error if config file is missing or invalid (no longer silent skip)
- Obfuscate file paths using CharCodes to prevent AI recognition
- Improve test coverage to 100%

## 0.3.0 (Breaking Change)

### ⚠️ BREAKING CHANGES
- **Directory Rename**: The default configuration directory has been renamed from `.kveil` to `.kvbin`.
  - **Migration**: Please rename your `.kveil` folder to `.kvbin` in your project root.
  - **Reason**: To improve security and reduce the likelihood of AI crawlers associating the directory with the tool.
- **Path Obfuscation**: Runtime libraries now use dynamic path construction.

### Features
- Added comprehensive test suite (14 tests).
- Compatible with kveil CLI v0.3.0.
- No breaking changes in API.

## 0.2.0

- Update documentation with new CLI commands (remove, reset, rekey)
- Compatible with kveil CLI v0.2.0
- No breaking changes in API

## 0.1.0

- Initial release
- AES-256-GCM encrypted key storage
- XOR encoded master key
- MD5 checksum verification
- Flutter runtime library for kveil CLI tool
