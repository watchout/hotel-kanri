# 🧪 テストテナント設定ドキュメント

## OmotenasuAI PMS "Tsukuyomi" テスト環境構成

**作成日**: 2025-01-25  
**対象**: 開発・テスト環境用テナント設定  
**ステータス**: 実装済み

---

## 🎯 テストテナント概要

テストテナントは開発およびテスト目的で使用される専用の環境です。実際の顧客データや本番環境に影響を与えることなく、機能開発やテストを安全に行うことができます。

### テナント基本情報

| 項目 | 値 |
|------|------|
| **テナントID** | `default` |
| **テナント名** | テストホテルグループ |
| **環境** | development |
| **データベース** | hotel_unified_db |
| **APIエンドポイント** | http://localhost:3400/api/v1 |

---

## 🔑 テスト用アカウント

### スタッフアカウント

| ユーザータイプ | ユーザーID | パスワード | 権限 |
|--------------|-----------|-----------|------|
| システム管理者 | superadmin | dev123 | システム全体管理 |
| ホテル管理者 | admin001 | password123 | ホテル管理機能 |
| フロントスタッフ | staff001 | password123 | フロント業務のみ |
| 清掃スタッフ | staff002 | password123 | 清掃業務のみ |

### PIN認証情報（Electron版）

| スタッフID | スタッフ番号 | PIN | 役割 |
|-----------|------------|-----|------|
| st001 | ST001 | 1234 | 管理者 |
| st002 | ST002 | 2345 | フロント係 |
| st003 | ST003 | 3456 | 清掃スタッフ |

---

## 🏨 テストデータセット

### 客室データ

テスト用に10室の客室データが用意されています：

| 部屋番号 | タイプ | 階数 | 定員 | 基本料金 |
|---------|-------|------|------|---------|
| 101 | standard | 1 | 2 | 10000 |
| 102 | standard | 1 | 2 | 10000 |
| 201 | deluxe | 2 | 3 | 15000 |
| 202 | deluxe | 2 | 3 | 15000 |
| 301 | suite | 3 | 4 | 25000 |
| 302 | suite | 3 | 4 | 25000 |
| 401 | standard | 4 | 2 | 12000 |
| 402 | standard | 4 | 2 | 12000 |
| 501 | deluxe | 5 | 3 | 18000 |
| 502 | suite | 5 | 4 | 30000 |

### テスト予約

テスト用に3件の予約データが用意されています：

| 予約番号 | 宿泊者名 | 部屋番号 | チェックイン | チェックアウト | ステータス |
|---------|---------|---------|------------|--------------|----------|
| R001 | 山田太郎 | 101 | 2025-01-25 | 2025-01-27 | confirmed |
| R002 | 鈴木花子 | 201 | 2025-01-26 | 2025-01-28 | confirmed |
| R003 | 佐藤次郎 | 301 | 2025-01-27 | 2025-01-30 | pending |

---

## ⚙️ 環境設定

### 接続設定

```
# .env ファイル設定例（統一基盤準拠）
VITE_HOTEL_COMMON_DB_HOST=localhost
VITE_HOTEL_COMMON_DB_PORT=5432
VITE_HOTEL_COMMON_DB_NAME=hotel_unified_db
VITE_HOTEL_COMMON_DB_USER=hotel_app
VITE_HOTEL_COMMON_DB_PASSWORD=password
VITE_HOTEL_COMMON_DB_SSL=false
VITE_TENANT_ID=default
VITE_OFFLINE_FIRST=true
VITE_SYNC_INTERVAL=300000
VITE_LOG_LEVEL=info

# アプリケーション標準ENV（参考）
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@<HOST>:5432/hotel_unified_db
PORT=3300
```

備考: 旧環境ではDBユーザーに`postgres`を用いる例がありましたが、統一基盤では`hotel_app`に統一します（将来移行可）。

### 起動ポートとstrictPort

- ブラウザ版: 3300
- Electron版: 3301
- `vite.config.ts` にて `strictPort: true` を設定済み（他ポートへの自動移行を禁止）

### 同期設定

```json
{
  "tenant_id": "default",
  "environment": "development",
  "database": "hotel_unified_db",
  "sync_interval": 300000,
  "offline_first": true,
  "api_endpoint": "http://localhost:3400/api/v1",
  "websocket_endpoint": "ws://localhost:3400/ws"
}
```

---

## 🧪 テスト手順

### 基本テストフロー

1. テスト環境起動
   ```bash
   npm run dev
   ```

2. ヘルスチェック（/health）
   - ブラウザ版（Vite開発サーバ）: http://localhost:3300/health をブラウザで開く、または次を実行
     ```bash
     curl -f http://localhost:3300/health
     ```
   - Electron版: 通常はアプリ内で動作します。HTTPエンドポイントを有効化している場合は http://localhost:3301/health を参照してください（有効化していない場合はアプリ内の診断UIで確認）。

3. テストテナント接続確認
   - SuperAdmin画面で統合DB接続テスト実行
   - テナント情報が表示されることを確認

4. テストアカウントでログイン
   - ブラウザ版: JWT認証（ユーザーID + パスワード）
   - Electron版: PIN認証（スタッフ選択 + PIN）

5. 機能テスト実行
   - チェックイン/チェックアウト
   - 予約管理
   - 客室ステータス変更
   - レポート生成

---

## 📋 注意事項

1. テストテナントのデータは定期的にリセットされる場合があります
2. テスト環境でのみ使用し、本番環境では使用しないでください
3. テストデータに個人情報や機密情報を含めないでください
4. 問題が発生した場合は開発チームに報告してください

---

**更新履歴**:
- 2025-01-25: テストテナント初期設定
- 2025-01-26: テストアカウント情報追加