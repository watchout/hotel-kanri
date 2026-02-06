---
name: api
description: hotel-common-rebuildでAPI実装を開始します
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /api コマンド

hotel-common-rebuild専用のAPI実装エージェントを起動します。

## 使用方法

```bash
/api <機能名またはタスクID>
```

## 例

```bash
/api DEV-0181           # タスクIDで実装
/api デバイスリセット    # 機能名で実装
/api orders             # リソース名で実装
```

## 実行フロー

1. **SSOT確認**
   - `docs/03_ssot/` から該当SSOTを特定
   - 要件IDとAccept条件を抽出

2. **既存実装スキャン**
   ```bash
   cd /path/to/hotel-common-rebuild
   git ls-files | grep -i '<keyword>'
   ```

3. **TDD実装**
   - テスト作成（RED）
   - 最小実装（GREEN）
   - リファクタ（REFACTOR）

4. **品質チェック**
   - tenant_id フィルタ確認
   - any型チェック
   - ビルド確認

## 出力

実装完了後:
- 作成/更新ファイル一覧
- テスト結果
- API仕様表
- 次のステップ（/ui コマンドへの引き継ぎ）

## 関連コマンド

- `/ui` - UI実装（hotel-saas）
- `/integrate` - 統合確認
- `/gate` - 品質ゲート
