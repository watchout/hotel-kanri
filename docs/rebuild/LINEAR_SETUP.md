# 📊 Linear完全依存・進捗管理セットアップ

**最終更新**: 2025年11月4日  
**方針**: LinearをSingle Source of Truthとする

---

## 🎯 基本方針

### 進捗管理の唯一の真実

```
Linear（唯一の真実・リアルタイム）
  ↓ 自動エクスポート（週次）
SSOT_PROGRESS_MASTER.md（読み取り専用・バックアップ）
```

**ルール**:
- ✅ 進捗はLinearで更新
- ✅ タスク追加はLinearで実施
- ✅ 依存関係はLinearで管理
- ❌ Fileでの手動更新は禁止（自動エクスポートのみ）

---

## 📂 Linear Project構成

### Project情報

```
Project Name: hotel-saas/hotel-common リビルド
Key: REBUILD
Status: In Progress
Start Date: 2025-11-04
Target End Date: 2025-11-07（3日間）
```

### Milestones

| Milestone | 所要時間 | 完了条件 |
|-----------|---------|---------|
| Phase 1: 準備 | 2時間 | テンプレート動作確認済み |
| Phase 2: 実装 | 20時間 | 全機能CRUD動作 |
| Phase 3: テスト | 2時間 | エラー率5%未満 |
| Phase 4: 統合 | 3時間 | 既存環境で動作 |

### Labels

| Label | 用途 | 色 |
|-------|------|---|
| `rebuild` | リビルド関連 | 🔴 Red |
| `template` | テンプレート作成 | 🟡 Yellow |
| `api-implementation` | API実装 | 🔵 Blue |
| `testing` | テスト | 🟢 Green |
| `blocker` | ブロッカー | 🔴 Red |
| `hotel-saas` | hotel-saas関連 | 🟣 Purple |
| `hotel-common` | hotel-common関連 | 🟠 Orange |

### Priorities

| Priority | 対象 |
|----------|------|
| 0（最優先） | Phase 1、認証・テナント・スタッフ |
| 1（高優先） | 客室・予約・顧客管理 |
| 2（中優先） | キャンペーン・施設・アメニティ |
| 3（低優先） | ログ・ダッシュボード |

---

## 📋 Issue作成（全タスク）

### Phase 1: 準備（3 Issues）

#### REBUILD-1: 環境構築

```yaml
Title: [Phase 1-1] 環境構築
Labels: rebuild, template
Priority: 0
Milestone: Phase 1: 準備
Estimate: 30min
Assignee: 実装AI

Description: |
  ## タスク
  - [ ] hotel-saas-rebuild ディレクトリ作成
  - [ ] hotel-common-rebuild ディレクトリ作成
  - [ ] 設定ファイルコピー（package.json, nuxt.config.ts等）
  - [ ] .env 作成（PORT=3101, 3401）
  - [ ] Git初期化（ローカルのみ）
  - [ ] 依存関係インストール（npm install）
  - [ ] データベース接続確認
  - [ ] テストテナント作成（rebuild-test-tenant）

  ## 完了条件
  - サーバーが起動する（localhost:3101, 3401）
  - Prisma接続成功

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 1-1
  - /Users/kaneko/hotel-kanri/docs/rebuild/ARCHITECTURE.md
```

#### REBUILD-2: CRUDテンプレート作成

```yaml
Title: [Phase 1-2] CRUDテンプレート作成
Labels: rebuild, template
Priority: 0
Milestone: Phase 1: 準備
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-1

Description: |
  ## タスク
  ### hotel-common CRUDテンプレート
  - [ ] /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts 作成
  - [ ] sessionAuthMiddleware 使用
  - [ ] Create/Read/Update/Delete API実装
  - [ ] エラーハンドリング実装

  ### hotel-saas プロキシテンプレート
  - [ ] /Users/kaneko/hotel-kanri/templates/hotel-saas-crud.template.ts 作成
  - [ ] callHotelCommonAPI 使用
  - [ ] Create/Read/Update/Delete プロキシ実装
  - [ ] エラーハンドリング実装

  ### 動作確認（客室グレード）
  - [ ] テンプレートから客室グレードAPI生成
  - [ ] Create実行 → Prisma Studio確認
  - [ ] Read実行 → 一覧表示確認
  - [ ] Update実行 → Prisma Studio確認
  - [ ] Delete実行 → Prisma Studio確認

  ## 完了条件
  - 客室グレードのCRUD全て動作
  - エラーゼロ

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 1-2
  - /Users/kaneko/hotel-kanri/.cursor/prompts/implement_from_ssot.md
```

#### REBUILD-3: 自動テストスクリプト作成

```yaml
Title: [Phase 1-3] 自動テストスクリプト作成
Labels: rebuild, testing
Priority: 0
Milestone: Phase 1: 準備
Estimate: 30min
Assignee: 実装AI
Blocked by: REBUILD-2

Description: |
  ## タスク
  - [ ] /Users/kaneko/hotel-kanri/scripts/crud-verify.sh 作成
    - Create テスト
    - Read テスト
    - Update テスト
    - Delete テスト
    - 結果表示（✅/❌）
  - [ ] 実行権限付与（chmod +x）
  - [ ] 動作確認（./scripts/crud-verify.sh room-grades）

  ## 完了条件
  - 自動テスト実行成功
  - 全テスト成功（✅ 全テスト成功）

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 1-3
```

---

### Phase 2: 実装（50+ Issues）

#### Phase 2-1: 最優先機能（5 Issues）

##### REBUILD-10: 認証・セッション管理

```yaml
Title: [Phase 2-1] 認証・セッション管理実装
Labels: rebuild, api-implementation, hotel-common, hotel-saas
Priority: 0
Milestone: Phase 2: 実装
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-3

Description: |
  ## タスク
  ### hotel-common
  - [ ] POST /api/v1/auth/login 実装
  - [ ] POST /api/v1/auth/logout 実装
  - [ ] GET /api/v1/auth/me 実装
  - [ ] sessionAuthMiddleware 確認

  ### hotel-saas
  - [ ] POST /api/v1/admin/auth/login プロキシ実装
  - [ ] POST /api/v1/admin/auth/logout プロキシ実装
  - [ ] GET /api/v1/admin/auth/me プロキシ実装

  ### 動作確認
  - [ ] ログイン成功
  - [ ] Session Cookie発行（hotel-session-id）
  - [ ] Redis確認（rebuild:session:{sessionId}）
  - [ ] ログアウト成功

  ## 完了条件
  - 認証フロー動作
  - エラーゼロ

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
```

##### REBUILD-11: テナント管理

```yaml
Title: [Phase 2-1] テナント管理実装
Labels: rebuild, api-implementation
Priority: 0
Milestone: Phase 2: 実装
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-10

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/settings/tenants.vue
  - [ ] ./crud-verify.sh tenants 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md
```

##### REBUILD-12: スタッフ管理

```yaml
Title: [Phase 2-1] スタッフ管理実装
Labels: rebuild, api-implementation
Priority: 0
Milestone: Phase 2: 実装
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-11

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/staff/index.vue
  - [ ] ./crud-verify.sh staff 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_STAFF_MANAGEMENT.md
```

##### REBUILD-13: 権限管理

```yaml
Title: [Phase 2-1] 権限管理実装
Labels: rebuild, api-implementation
Priority: 0
Milestone: Phase 2: 実装
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-12

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/settings/permissions.vue
  - [ ] ./crud-verify.sh permissions 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_PERMISSION_SYSTEM.md
```

##### REBUILD-14: プロフィール管理

```yaml
Title: [Phase 2-1] プロフィール管理実装
Labels: rebuild, api-implementation
Priority: 0
Milestone: Phase 2: 実装
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-13

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/profile.vue
  - [ ] ./crud-verify.sh profiles 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功
  - Phase 2-1完了（ログイン〜管理画面アクセスまで動作）

  ## SSOT
  - 該当SSOTを参照
```

---

#### Phase 2-2: 高優先機能（6 Issues）

##### REBUILD-20: 客室グレード管理

```yaml
Title: [Phase 2-2] 客室グレード管理実装
Labels: rebuild, api-implementation
Priority: 1
Milestone: Phase 2: 実装
Estimate: 20min
Assignee: 実装AI
Blocked by: REBUILD-14

Description: |
  ## タスク
  - [ ] ✅ Phase 1で完了（動作確認済み）
  - [ ] フロントエンド確認: pages/admin/settings/rooms/grades.vue

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_ROOM_MANAGEMENT.md
```

##### REBUILD-21: 客室管理

```yaml
Title: [Phase 2-2] 客室管理実装
Labels: rebuild, api-implementation
Priority: 1
Milestone: Phase 2: 実装
Estimate: 30min
Assignee: 実装AI
Blocked by: REBUILD-20

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/settings/rooms/index.vue
  - [ ] ./crud-verify.sh rooms 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_ROOM_MANAGEMENT.md
```

##### REBUILD-22: 予約管理

```yaml
Title: [Phase 2-2] 予約管理実装
Labels: rebuild, api-implementation
Priority: 1
Milestone: Phase 2: 実装
Estimate: 2h
Assignee: 実装AI
Blocked by: REBUILD-21

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/reservations/index.vue
  - [ ] ./crud-verify.sh reservations 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_RESERVATION_MANAGEMENT.md（要作成）
```

##### REBUILD-23: 顧客管理

```yaml
Title: [Phase 2-2] 顧客管理実装
Labels: rebuild, api-implementation
Priority: 1
Milestone: Phase 2: 実装
Estimate: 2h
Assignee: 実装AI
Blocked by: REBUILD-22

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/customers/index.vue
  - [ ] ./crud-verify.sh customers 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_CUSTOMER_MANAGEMENT.md（要作成）
```

##### REBUILD-24: 料金・プラン管理

```yaml
Title: [Phase 2-2] 料金・プラン管理実装
Labels: rebuild, api-implementation
Priority: 1
Milestone: Phase 2: 実装
Estimate: 2h
Assignee: 実装AI
Blocked by: REBUILD-23

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/pricing/index.vue
  - [ ] ./crud-verify.sh pricing 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功

  ## SSOT
  - 該当SSOTを参照
```

##### REBUILD-25: 宿泊プラン管理

```yaml
Title: [Phase 2-2] 宿泊プラン管理実装
Labels: rebuild, api-implementation
Priority: 1
Milestone: Phase 2: 実装
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-24

Description: |
  ## タスク
  - [ ] hotel-common: CRUD API実装（テンプレート使用）
  - [ ] hotel-saas: プロキシAPI実装（テンプレート使用）
  - [ ] フロントエンド: pages/admin/plans/index.vue
  - [ ] ./crud-verify.sh plans 実行

  ## 完了条件
  - CRUD全て動作
  - 自動テスト成功
  - Phase 2-2完了（予約〜チェックインまで動作）

  ## SSOT
  - 該当SSOTを参照
```

---

#### Phase 2-3: 中優先機能（4 Issues）

**REBUILD-30〜33**: キャンペーン・施設・アメニティ・ページ管理（省略）

#### Phase 2-4: 低優先機能（3 Issues）

**REBUILD-40〜42**: ログ・ダッシュボード・その他（省略）

---

### Phase 3: テスト（2 Issues）

#### REBUILD-50: CRUD統合テスト

```yaml
Title: [Phase 3-1] CRUD統合テスト
Labels: rebuild, testing
Priority: 1
Milestone: Phase 3: テスト
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-42

Description: |
  ## タスク
  - [ ] 全機能のCRUD動作確認
  - [ ] ./crud-verify-all.sh 実行
  - [ ] エラー率確認（5%未満）
  - [ ] パフォーマンス確認（API応答300ms以内）

  ## 完了条件
  - 全機能エラーなし
  - エラー率5%未満

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 3-1
```

#### REBUILD-51: シナリオテスト

```yaml
Title: [Phase 3-2] シナリオテスト
Labels: rebuild, testing
Priority: 1
Milestone: Phase 3: テスト
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-50

Description: |
  ## タスク
  ### シナリオ1: テナント・スタッフ管理
  - [ ] ログイン → テナント作成 → スタッフ作成 → 権限設定 → ログアウト

  ### シナリオ2: 客室・予約管理
  - [ ] ログイン → 客室グレード作成 → 客室作成 → 顧客登録 → 予約作成 → チェックイン

  ### シナリオ3: 料金・プラン管理
  - [ ] ログイン → 料金設定 → 宿泊プラン作成 → キャンペーン作成 → 公開設定

  ## 完了条件
  - 全シナリオが動作
  - エラーゼロ

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 3-2
```

---

### Phase 4: 統合（4 Issues）

#### REBUILD-60: バックアップ

```yaml
Title: [Phase 4-1] バックアップ
Labels: rebuild
Priority: 0
Milestone: Phase 4: 統合
Estimate: 30min
Assignee: 実装AI
Blocked by: REBUILD-51

Description: |
  ## タスク
  - [ ] hotel-saas バックアップ（backup-before-rebuild ブランチ）
  - [ ] hotel-common バックアップ（backup-before-rebuild ブランチ）
  - [ ] データベースバックアップ（pg_dump）

  ## 完了条件
  - バックアップ完了
  - リモートにプッシュ済み

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 4-1
```

#### REBUILD-61: コード統合

```yaml
Title: [Phase 4-2] コード統合
Labels: rebuild
Priority: 0
Milestone: Phase 4: 統合
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-60

Description: |
  ## タスク
  ### hotel-saas
  - [ ] main ブランチに切り替え
  - [ ] 既存APIを削除
  - [ ] 新規実装をコピー
  - [ ] .env 更新（PORT=3100）
  - [ ] コミット・プッシュ

  ### hotel-common
  - [ ] main ブランチに切り替え
  - [ ] 既存APIを削除
  - [ ] 新規実装をコピー
  - [ ] .env 更新（PORT=3400, REDIS_SESSION_PREFIX=session:）
  - [ ] コミット・プッシュ

  ## 完了条件
  - コード統合完了
  - リモートにプッシュ済み

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 4-2
```

#### REBUILD-62: 最終動作確認

```yaml
Title: [Phase 4-3] 最終動作確認
Labels: rebuild, testing
Priority: 0
Milestone: Phase 4: 統合
Estimate: 1h
Assignee: 実装AI
Blocked by: REBUILD-61

Description: |
  ## タスク
  - [ ] サーバー再起動（localhost:3100, 3400）
  - [ ] 全機能動作確認
  - [ ] エラーゼロ確認

  ## 完了条件
  - 既存環境で全機能が動作
  - エラーゼロ

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 4-3
```

#### REBUILD-63: クリーンアップ

```yaml
Title: [Phase 4-4] クリーンアップ
Labels: rebuild
Priority: 3
Milestone: Phase 4: 統合
Estimate: 30min
Assignee: 実装AI
Blocked by: REBUILD-62

Description: |
  ## タスク
  - [ ] テストデータ削除（test_プレフィックス）
  - [ ] Redisテストセッション削除（rebuild:session:*）
  - [ ] テストテナント削除（rebuild-test-tenant）
  - [ ] 新規環境ディレクトリ削除

  ## 完了条件
  - クリーンアップ完了
  - 🎉 リビルドプロジェクト完了！

  ## 参照
  - /Users/kaneko/hotel-kanri/docs/rebuild/CHECKLIST.md Phase 4-4
```

---

## 🔄 自動エクスポート設定

### 週次エクスポートスクリプト

```bash
#!/bin/bash
# /Users/kaneko/hotel-kanri/scripts/linear-export.sh

set -e

echo "=== Linear進捗エクスポート ==="

# Linear API経由で進捗取得
# (実装は後ほど)

# SSOT_PROGRESS_MASTER.md 更新
cat > /Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md << 'EOF'
# 進捗管理（自動生成）

**最終更新**: $(date)  
**ソース**: Linear Project "hotel-saas/hotel-common リビルド"

## 進捗サマリー

| Milestone | 完了 / 全体 | 進捗率 |
|-----------|------------|--------|
| Phase 1 | X / 3 | XX% |
| Phase 2 | X / 50 | XX% |
| Phase 3 | X / 2 | XX% |
| Phase 4 | X / 4 | XX% |

## 詳細

(LinearデータをMarkdownに変換)

---

**注意**: このファイルは自動生成です。
進捗更新はLinearで実施してください。
EOF

# Git commit
cd /Users/kaneko/hotel-kanri
git add docs/03_ssot/SSOT_PROGRESS_MASTER.md
git commit -m "自動: Linear進捗エクスポート $(date +%Y-%m-%d)"
git push

echo "✅ エクスポート完了"
```

### Cron設定（週次実行）

```bash
# 毎週月曜 9:00 に実行
0 9 * * 1 /Users/kaneko/hotel-kanri/scripts/linear-export.sh
```

---

## 📊 進捗確認方法

### リアルタイム進捗（Linear）

```
https://linear.app/your-workspace/project/rebuild
```

**確認項目**:
- Milestone別進捗
- 依存関係グラフ
- ブロッカー検知
- 工数実績

### バックアップ（File）

```
/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md
```

**更新頻度**: 週次（自動）

---

## 🚨 運用ルール

### ✅ やること

1. **タスク開始時**
   - Linearでステータスを「In Progress」に変更
   - 開始時刻を記録（Linearが自動記録）

2. **タスク完了時**
   - Linearでステータスを「Done」に変更
   - 実績工数を記録
   - 完了条件を全てチェック

3. **ブロッカー発生時**
   - Linearで「Blocker」ラベル追加
   - Blocked by に依存Issueを設定
   - コメントで詳細を記録

### ❌ やらないこと

1. **Fileでの手動更新**
   - SSOT_PROGRESS_MASTER.md は自動生成のみ
   - 手動更新は禁止

2. **Linear以外でのタスク管理**
   - 進捗は全てLinearで管理
   - スプレッドシートNG
   - メモ帳NG

---

## 📞 問い合わせ

Linear運用で不明な点:
- Luna（設計・管理AI）に相談
- このドキュメント（LINEAR_SETUP.md）を参照




