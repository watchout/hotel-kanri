# 認証システム環境変数

## 必須環境変数

認証システムを正しく動作させるためには、以下の環境変数が必要です。

### データベース接続

```
# データベース設定（2層統合DB）
# ローカル: UNIFY_ENV=local（127.0.0.1直結、SSHトンネルなどでポートを合わせる）
# 開発サーバ: UNIFY_ENV=dev（開発統合DBホストへ直結）
UNIFY_ENV=local
DATABASE_URL="postgresql://hotel_app:password@127.0.0.1:5432/hotel_unified_db"
```

### JWT認証設定

```
# JWT認証設定
JWT_SECRET=hotel-saas-integration-secret-key-2025
JWT_EXPIRES_IN=24h
```

## オプション環境変数

開発環境での認証をカスタマイズするためのオプション環境変数です。

```
# 認証設定
# 開発環境でのみ使用
# MOCK_AUTH=true        # モック認証を有効化
# ALLOW_DEV_AUTH=true   # 開発環境での認証エラーを無視
```

## 環境変数の設定方法

1. プロジェクトルートに `.env` ファイルを作成
2. 上記の環境変数を設定

```bash
# .envファイルの例
DATABASE_URL="postgresql://hotel_app:password@127.0.0.1:5432/hotel_unified_db"
JWT_SECRET=hotel-saas-integration-secret-key-2025
JWT_EXPIRES_IN=24h
```

## 環境変数チェック

開発サーバーの起動時に、必須環境変数がチェックされます。環境変数が設定されていない場合は、以下のエラーが表示されます。

```
NG: DATABASE_URL not set
```

この場合は、`.env` ファイルを作成し、必要な環境変数を設定してください。

## 注意事項

- 本番環境では、強力なJWTシークレットを使用してください
- 環境変数は `.gitignore` に追加し、バージョン管理システムにコミットしないでください
- 開発環境でのみ使用する環境変数（`MOCK_AUTH`, `ALLOW_DEV_AUTH`）は本番環境では使用しないでください
