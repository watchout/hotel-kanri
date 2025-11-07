# ✅ リビルドプロジェクト・チェックリスト

**最終更新**: 2025年11月4日  
**目的**: 作業漏れ防止、進捗管理

---

## 📋 Phase 1: 準備（2時間）

### 1-1. 環境構築（30分）

- [ ] hotel-saas-rebuild ディレクトリ作成
  ```bash
  mkdir -p /Users/kaneko/hotel-saas-rebuild
  ```

- [ ] hotel-common-rebuild ディレクトリ作成
  ```bash
  mkdir -p /Users/kaneko/hotel-common-rebuild
  ```

- [ ] 設定ファイルコピー（hotel-saas-rebuild）
  - [ ] package.json
  - [ ] nuxt.config.ts
  - [ ] tsconfig.json
  - [ ] .gitignore

- [ ] 設定ファイルコピー（hotel-common-rebuild）
  - [ ] package.json
  - [ ] tsconfig.json
  - [ ] .gitignore
  - [ ] prisma/schema.prisma

- [ ] .env 作成・設定
  - [ ] hotel-saas-rebuild: PORT=3101
  - [ ] hotel-common-rebuild: PORT=3401, REDIS_SESSION_PREFIX=rebuild:session:

- [ ] Git初期化
  - [ ] hotel-saas-rebuild: `git init`
  - [ ] hotel-common-rebuild: `git init`

- [ ] 依存関係インストール
  - [ ] hotel-saas-rebuild: `npm install`
  - [ ] hotel-common-rebuild: `npm install`

- [ ] データベース接続確認
  - [ ] hotel-common-rebuild で Prisma接続テスト

- [ ] テストテナント作成
  ```sql
  INSERT INTO tenants (id, name, subdomain) 
  VALUES ('rebuild-test-tenant', 'リビルドテスト施設', 'rebuild-test');
  ```

**完了条件**: サーバーが起動する（localhost:3101, 3401）

---

### 1-2. テンプレート作成（1時間）

#### hotel-common CRUDテンプレート

- [ ] `/Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts` 作成
  - [ ] sessionAuthMiddleware 使用
  - [ ] Create API実装
  - [ ] Read (List) API実装
  - [ ] Read (Get by ID) API実装
  - [ ] Update API実装
  - [ ] Delete API実装
  - [ ] エラーハンドリング実装

#### hotel-saas プロキシテンプレート

- [ ] `/Users/kaneko/hotel-kanri/templates/hotel-saas-crud.template.ts` 作成
  - [ ] callHotelCommonAPI 使用
  - [ ] Create プロキシ実装
  - [ ] Read (List) プロキシ実装
  - [ ] Read (Get by ID) プロキシ実装
  - [ ] Update プロキシ実装
  - [ ] Delete プロキシ実装
  - [ ] エラーハンドリング実装

#### 動作確認（客室グレード）

- [ ] テンプレートから客室グレードAPI生成
- [ ] hotel-common起動（localhost:3401）
- [ ] hotel-saas起動（localhost:3101）
- [ ] Create実行 → Prisma Studioで確認
- [ ] Read実行 → 一覧表示確認
- [ ] Update実行 → Prisma Studioで確認
- [ ] Delete実行 → Prisma Studioで確認

**完了条件**: 客室グレードのCRUD全て動作

---

### 1-3. 自動テストスクリプト作成（30分）

- [ ] `/Users/kaneko/hotel-kanri/scripts/crud-verify.sh` 作成
  - [ ] Create テスト
  - [ ] Read テスト
  - [ ] Update テスト
  - [ ] Delete テスト
  - [ ] 結果表示

- [ ] 実行権限付与
  ```bash
  chmod +x /Users/kaneko/hotel-kanri/scripts/crud-verify.sh
  ```

- [ ] 動作確認
  ```bash
  ./scripts/crud-verify.sh room-grades
  ```

**完了条件**: 自動テストが成功（✅ 全テスト成功）

---

### 1-4. 運用テンプレ配置・CI初期化（必須）

- [ ] `.github/workflows/ci.yml` 配置（rebuild-ci.yml テンプレ使用）
- [ ] `.github/workflows/deploy.yml` 配置（rebuild-deploy.yml テンプレ使用）
- [ ] `scripts/crud-verify-all.sh` 配置（+x 付与）
- [ ] `package.json` に scripts 整備（lint / test / build）
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` 配置（PRテンプレ使用）
- [ ] GHCR利用可否の確認（必要に応じてPAT/権限）

**完了条件**: 両リポジトリでCIが起動し、lint/type/test/build/security が実行される（green推奨）

---

## 🏗️ Phase 2: 優先度別実装（20時間）

### 2-1. 最優先機能（5時間）

#### 認証・セッション管理（1時間）

- [ ] hotel-common
  - [ ] POST /api/v1/auth/login
  - [ ] POST /api/v1/auth/logout
  - [ ] GET /api/v1/auth/me
  - [ ] sessionAuthMiddleware 実装確認

- [ ] hotel-saas
  - [ ] POST /api/v1/admin/auth/login
  - [ ] POST /api/v1/admin/auth/logout
  - [ ] GET /api/v1/admin/auth/me

- [ ] 動作確認
  - [ ] ログイン成功
  - [ ] Session Cookie発行
  - [ ] ログアウト成功

#### テナント管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/settings/tenants.vue
- [ ] 動作確認: CRUD全て動作

#### スタッフ管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/staff/index.vue
- [ ] 動作確認: CRUD全て動作

#### 権限管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/settings/permissions.vue
- [ ] 動作確認: CRUD全て動作

#### プロフィール管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/profile.vue
- [ ] 動作確認: CRUD全て動作

**Phase 2-1 完了条件**: ログイン〜管理画面アクセスまで動作

---

### 2-2. 高優先機能（8時間）

#### 客室グレード管理（20分）

- [ ] ✅ Phase 1で完了

#### 客室管理（30分）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/settings/rooms/index.vue
- [ ] 動作確認: CRUD全て動作

#### 予約管理（2時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/reservations/index.vue
- [ ] 動作確認: CRUD全て動作

#### 顧客管理（2時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/customers/index.vue
- [ ] 動作確認: CRUD全て動作

#### 料金・プラン管理（2時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/pricing/index.vue
- [ ] 動作確認: CRUD全て動作

#### 宿泊プラン管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/plans/index.vue
- [ ] 動作確認: CRUD全て動作

**Phase 2-2 完了条件**: 予約〜チェックインまで動作

---

### 2-3. 中優先機能（4時間）

#### キャンペーン管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/campaigns/index.vue
- [ ] 動作確認: CRUD全て動作

#### 施設・設備管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/facilities/index.vue
- [ ] 動作確認: CRUD全て動作

#### アメニティ管理（30分）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/amenities/index.vue
- [ ] 動作確認: CRUD全て動作

#### ページ管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/pages/index.vue
- [ ] 動作確認: CRUD全て動作

**Phase 2-3 完了条件**: 全管理画面が動作

---

### 2-4. 低優先機能（3時間）

#### ログ管理（1時間）

- [ ] hotel-common: CRUD API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/logs/index.vue
- [ ] 動作確認: CRUD全て動作

#### ダッシュボード（1時間）

- [ ] hotel-common: 統計API実装
- [ ] hotel-saas: プロキシAPI実装
- [ ] フロントエンド: pages/admin/dashboard.vue
- [ ] 動作確認: データ表示

#### その他補助機能（1時間）

- [ ] 必要に応じて実装

**Phase 2-4 完了条件**: 全機能が動作

---

## ✅ Phase 3: 統合テスト（2時間）

### 3-1. CRUD統合テスト（1時間）

- [ ] 全機能のCRUD動作確認
  ```bash
  ./scripts/crud-verify-all.sh
  ```

- [ ] エラー率確認
  - [ ] エラー率5%未満

- [ ] パフォーマンス確認
  - [ ] API応答300ms以内

**完了条件**: 全機能エラーなし

---

### 3-2. シナリオテスト（1時間）

#### シナリオ1: テナント・スタッフ管理

- [ ] ログイン
- [ ] テナント作成
- [ ] スタッフ作成
- [ ] 権限設定
- [ ] ログアウト

#### シナリオ2: 客室・予約管理

- [ ] ログイン
- [ ] 客室グレード作成
- [ ] 客室作成
- [ ] 顧客登録
- [ ] 予約作成
- [ ] チェックイン

#### シナリオ3: 料金・プラン管理

- [ ] ログイン
- [ ] 料金設定
- [ ] 宿泊プラン作成
- [ ] キャンペーン作成
- [ ] 公開設定

**完了条件**: 全シナリオが動作

---

## 🔄 Phase 4: 既存環境への統合（3時間）

### 4-1. バックアップ（30分）

- [ ] hotel-saas バックアップ
  ```bash
  cd /Users/kaneko/hotel-saas
  git checkout -b backup-before-rebuild
  git push origin backup-before-rebuild
  ```

- [ ] hotel-common バックアップ
  ```bash
  cd /Users/kaneko/hotel-common
  git checkout -b backup-before-rebuild
  git push origin backup-before-rebuild
  ```

- [ ] データベースバックアップ
  ```bash
  pg_dump -U admin hotel_db > /tmp/hotel_db_backup_$(date +%Y%m%d).sql
  ```

**完了条件**: バックアップ完了

---

### 4-2. コード統合（1時間）

#### hotel-saas

- [ ] main ブランチに切り替え
  ```bash
  cd /Users/kaneko/hotel-saas
  git checkout main
  ```

- [ ] 既存APIを削除
  ```bash
  rm -rf server/api/v1/admin/*
  ```

- [ ] 新規実装をコピー
  ```bash
  cp -r /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/* server/api/v1/admin/
  ```

- [ ] .env 更新（PORT=3100に戻す）

- [ ] コミット・プッシュ
  ```bash
  git add .
  git commit -m "リビルド: 新規実装を統合"
  git push origin main
  ```

#### hotel-common

- [ ] main ブランチに切り替え
  ```bash
  cd /Users/kaneko/hotel-common
  git checkout main
  ```

- [ ] 既存APIを削除
  ```bash
  rm -rf src/routes/systems/common/*
  ```

- [ ] 新規実装をコピー
  ```bash
  cp -r /Users/kaneko/hotel-common-rebuild/src/routes/systems/common/* src/routes/systems/common/
  ```

- [ ] .env 更新（PORT=3400, REDIS_SESSION_PREFIX=session:に戻す）

- [ ] コミット・プッシュ
  ```bash
  git add .
  git commit -m "リビルド: 新規実装を統合"
  git push origin main
  ```

**完了条件**: コード統合完了

---

### 4-3. 最終動作確認（1時間）

- [ ] サーバー再起動
  - [ ] hotel-saas (localhost:3100)
  - [ ] hotel-common (localhost:3400)

- [ ] 全機能動作確認
  - [ ] ログイン
  - [ ] テナント管理
  - [ ] スタッフ管理
  - [ ] 客室管理
  - [ ] 予約管理
  - [ ] 全CRUD動作

- [ ] エラーゼロ確認
  - [ ] ブラウザコンソール
  - [ ] サーバーログ

**完了条件**: 既存環境で全機能が動作

---

### 4-4. クリーンアップ（30分）

- [ ] テストデータ削除
  ```sql
  DELETE FROM room_grades WHERE name LIKE 'test_%';
  DELETE FROM rooms WHERE name LIKE 'test_%';
  -- その他のテストデータ
  ```

- [ ] Redisテストセッション削除
  ```bash
  redis-cli KEYS "rebuild:session:*" | xargs redis-cli DEL
  ```

- [ ] テストテナント削除（必要に応じて）
  ```sql
  DELETE FROM tenants WHERE id = 'rebuild-test-tenant';
  ```

- [ ] 新規環境ディレクトリ削除
  ```bash
  rm -rf /Users/kaneko/hotel-saas-rebuild
  rm -rf /Users/kaneko/hotel-common-rebuild
  ```

**完了条件**: クリーンアップ完了

---

## 📊 最終確認

### 成功の定義（全てチェック必須）

- [ ] 全てのCRUD APIが動作する
- [ ] エラー率5%未満
- [ ] 実装パターンが統一されている（全てテンプレートベース）
- [ ] Session認証統一
- [ ] callHotelCommonAPI統一
- [ ] 既存環境（localhost:3100/3400）で動作
- [ ] 既存データベース使用
- [ ] エラーゼロ

### タイム記録

```bash
# 最終記録
echo "プロジェクト終了: $(date)" >> /tmp/rebuild-progress.txt

# 所要時間計算
cat /tmp/rebuild-progress.txt
```

---

## 🎓 振り返り

### KPT（Keep/Problem/Try）

#### Keep（良かったこと）

- 

#### Problem（問題だったこと）

- 

#### Try（次回試したいこと）

- 

---

## 📞 問い合わせ

チェックリストで不明な点:
- Luna（設計・管理AI）に相談
- `/Users/kaneko/hotel-kanri/docs/rebuild/` を参照

