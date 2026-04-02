# Hotel SaaS Project Rules - データベース安全性強化版

## 🚨 データベース管理ルール（厳守・強化版）

### 🚫 **絶対禁止事項（違反時は即座に停止）**

1. **データベースリセット操作の完全禁止**
   ```bash
   # 以下のコマンドは絶対に実行禁止
   npx prisma migrate reset
   npx prisma db push --force-reset
   npx prisma db push --force
   rm ./prisma/dev.db
   ```

2. **安全性チェック回避の禁止**
   - 安全性チェックスクリプトを無効化する行為
   - 直接的なPrismaコマンド実行（npmスクリプト経由必須）

3. **バックアップなしでの危険操作禁止**
   - データ変更前のバックアップ作成必須
   - 復旧手順の事前確認必須

### ✅ **推奨安全コマンド（必ず使用）**

```bash
# 安全なデータベース操作
pnpm db:backup              # バックアップ作成
pnpm db:status              # データベース状況確認
pnpm db:safe-generate       # 安全なクライアント再生成
pnpm db:safe-push           # 安全なスキーマ同期
pnpm db:studio              # 安全なStudio起動
pnpm db:restore             # 復元手順表示
```

### 🛡️ **再発防止システム**

1. **自動安全性チェック**
   - `scripts/db-safety-check.sh` による危険コマンド検出
   - 実行前の確認プロンプト
   - 自動バックアップ作成

2. **段階的確認プロセス**
   ```
   危険コマンド検出 → 警告表示 → ユーザー確認 → バックアップ作成 → 実行
   ```

3. **コマンドエイリアス強制**
   - 直接Prismaコマンド実行の抑制
   - npmスクリプト経由での安全な実行

### 📋 **緊急時対応手順**

1. **データ消失時の復旧**
   ```bash
   # 最新バックアップから復旧
   cp ./prisma/dev.db.emergency.backup.YYYYMMDD_HHMMSS ./prisma/dev.db
   
   # データ確認
   pnpm db:status
   ```

2. **システム整合性確認**
   ```bash
   npx prisma generate
   pnpm dev:restart
   ```

### 🔍 **定期チェック項目**

- [ ] バックアップファイルの存在確認
- [ ] データベースファイルの整合性
- [ ] 安全性チェックスクリプトの動作
- [ ] 緊急復旧手順の確認

## 開発時の基本ルール

### 🚨 **既存システムへの影響回避**
1. **オーダー機能への影響確認必須**
2. **事前確認が必要な変更**
3. **インフォメーション機能開発の原則**

### ✅ **安全な開発手順**
1. 変更内容の影響範囲を事前に確認
2. 既存機能への影響がある場合は必ず事前相談
3. **データベース操作前の必須バックアップ**
4. 新機能は独立したモジュールとして実装

### ❗ エラーハンドリング方針（重要）
- サイレントフォールバック禁止（別経路への自動切替でエラーを隠さない）
- 本番/共通コードでのモック利用禁止（開発中は明示フラグ・限定パスのみ）
- 失敗は明示的にエラーとして返却し、ログで原因を特定可能にする
- フォールバックやスタブが必要な場合は、ユーザー承認とドキュメント追記が必須

## 🎨 UI/UX統一ルール

### 🎯 **アイコン統一ルール（厳守）**

**必須**: 全てのアイコンは **Heroicons** を使用し、`heroicons:` プレフィックスを付ける

```html
<!-- ✅ 正しい使用例 -->
<Icon name="heroicons:pencil" class="w-4 h-4" />
<Icon name="heroicons:trash" class="w-5 h-5" />

<!-- ❌ 間違った使用例 -->
<Icon name="pencil" class="w-4 h-4" />
<Icon name="mdi:pencil" class="w-4 h-4" />
<Icon name="fa:edit" class="w-4 h-4" />

<!-- ❌ SVGの直接使用も禁止 -->
<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
</svg>
```

#### 標準アイコンマッピング

| アクション | Heroicon名 | 使用例 |
| ------ | ---- | --- |
| **削除** | `heroicons:trash` | 削除ボタン |
| **編集** | `heroicons:pencil-square` | 編集ボタン |
| **複製** | `heroicons:document-duplicate` | コピー機能 |
| **表示** | `heroicons:eye` | プレビュー |
| **追加** | `heroicons:plus` | 新規作成 |
| **閉じる** | `heroicons:x-mark` | モーダル閉じる |
| **検索** | `heroicons:magnifying-glass` | 検索入力 |
| **警告** | `heroicons:exclamation-triangle` | エラー表示 |
| **読み込み** | `heroicons:arrow-path` | ローディング |

#### 🚫 **禁止事項**
1. **SVGアイコンの直接使用禁止** - 統一性を保つため、生のSVGコードの埋め込みは禁止
2. **他のアイコンライブラリの混在禁止** - FontAwesome、MaterialDesignIcons等の併用禁止
3. **プレフィックスなしの使用禁止** - 必ず`heroicons:`プレフィックスを使用

**参考**: 詳細なガイドラインは `docs/UI_STYLE_GUIDE.md` を参照

---

**⚠️ 重要**: このルールに違反した場合、即座に作業を停止し、データ復旧を最優先で実行すること。
