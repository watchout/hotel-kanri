# バージョン管理戦略

## 概要

hotel-kanri中央管理方式における各アプリケーションのバージョン管理戦略を定義します。

## 基本方針

### 中央管理型デプロイ
- **デプロイ管理**: hotel-kanriリポジトリが全システムのデプロイを統括
- **個別リポジトリ**: 開発・バックアップ・ソースコード管理用途
- **バージョン管理**: 各アプリケーション独立したバージョニング

## バージョン管理システム

### 1. アプリケーション別バージョン管理

```yaml
# hotel-kanri/.github/workflows/deploy-dev.yml
env:
  HOTEL_SAAS_VERSION: "v1.2.3"
  HOTEL_COMMON_VERSION: "v2.1.0"
  HOTEL_PMS_VERSION: "v1.5.2"
  HOTEL_MEMBER_VERSION: "v1.0.8"
```

### 2. タグベースデプロイ

```bash
# 特定バージョンのデプロイ
git clone -b v1.2.3 https://github.com/watchout/hotel-saas.git
```

### 3. バージョン設定ファイル

```json
// hotel-kanri/config/versions.json
{
  "hotel-saas": {
    "version": "v1.2.3",
    "branch": "main",
    "commit": "abc123def456"
  },
  "hotel-common": {
    "version": "v2.1.0", 
    "branch": "main",
    "commit": "def456abc123"
  },
  "hotel-pms": {
    "version": "v1.5.2",
    "branch": "main", 
    "commit": "ghi789jkl012"
  },
  "hotel-member": {
    "version": "v1.0.8",
    "branch": "main",
    "commit": "mno345pqr678"
  }
}
```

## デプロイフロー

### 1. 開発フロー
```
個別リポジトリ(hotel-saas) → 開発・テスト → タグ付け(v1.2.3)
                                              ↓
hotel-kanri → versions.json更新 → GitHub Actions → サーバーデプロイ
```

### 2. バージョン更新手順

1. **個別リポジトリでの開発完了**
   ```bash
   # hotel-saasリポジトリで
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

2. **hotel-kanriでのバージョン更新**
   ```bash
   # hotel-kanriリポジトリで
   # config/versions.jsonを更新
   git commit -m "Update hotel-saas to v1.2.3"
   git push origin develop
   ```

3. **自動デプロイ実行**
   - GitHub Actionsが自動実行
   - 指定バージョンをサーバーにデプロイ

## 環境別バージョン管理

### 開発環境
```json
{
  "environment": "development",
  "versions": {
    "hotel-saas": "develop",
    "hotel-common": "develop"
  }
}
```

### 本番環境
```json
{
  "environment": "production", 
  "versions": {
    "hotel-saas": "v1.2.3",
    "hotel-common": "v2.1.0"
  }
}
```

## ロールバック戦略

### 1. バージョン指定ロールバック
```bash
# 前バージョンに戻す
git revert HEAD  # versions.jsonの変更を戻す
git push origin develop
```

### 2. 緊急ロールバック
```bash
# 直接サーバーで実行
ssh deploy@server "cd /opt/omotenasuai/hotel-saas && git checkout v1.2.2"
ssh deploy@server "pm2 restart hotel-saas"
```

## バージョン確認方法

### 1. 現在のデプロイバージョン確認
```bash
# サーバー上で
cd /opt/omotenasuai/hotel-saas
git describe --tags
```

### 2. 全サービスバージョン一覧
```bash
# hotel-kanriから実行
./scripts/version/check-versions.sh
```

## 利点

1. **独立したバージョニング**: 各アプリケーションが独自のペースで開発可能
2. **統一デプロイ管理**: hotel-kanriで全体を統括
3. **明確なバージョン追跡**: どのバージョンがデプロイされているか明確
4. **安全なロールバック**: 問題発生時の迅速な復旧
5. **開発効率**: 個別リポジトリでの並行開発
