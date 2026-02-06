---
name: ui
description: hotel-saas-rebuildでUI実装を開始します
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /ui コマンド

hotel-saas-rebuild専用のUI実装エージェントを起動します。

## 使用方法

```bash
/ui <機能名またはタスクID>
```

## 例

```bash
/ui DEV-0181           # タスクIDで実装
/ui デバイスリセット    # 機能名で実装
/ui orders             # リソース名で実装
```

## 前提条件

- hotel-common-rebuild側のAPI実装が完了していること
- `/api` コマンドで先にAPI実装を行う

## 実行フロー

1. **SSOT確認**
   - `docs/03_ssot/` から該当SSOTを特定
   - 画面仕様、コンポーネント構成を確認

2. **API仕様確認**
   ```bash
   cd /path/to/hotel-common-rebuild
   cat src/routes/<resource>.routes.ts
   ```

3. **実装**
   - APIプロキシ（server/api/）
   - Composable（composables/）
   - ページ/コンポーネント（pages/, components/）
   - 型定義（types/）

4. **動作確認**
   - 開発サーバーで表示確認
   - API連携確認

## 禁止事項

- Prisma使用禁止
- $fetch直接（localhost:3401）禁止
- any型禁止

## 出力

実装完了後:
- 作成/更新ファイル一覧
- 動作確認チェックリスト
- 次のステップ（/integrate または /gate）

## 関連コマンド

- `/api` - API実装（hotel-common）
- `/integrate` - 統合確認
- `/gate` - 品質ゲート
