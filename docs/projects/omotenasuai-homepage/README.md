# omotenasuAI ホームページプロジェクト

## 概要

omotenasuAI.comのコーポレートホームページを作成・管理するプロジェクトです。

## プロジェクト情報

- **ドメイン**: omotenasuai.com
- **サーバーIP**: 163.44.176.23（実際のサーバー）
- **Cloudflare経由IP**: 104.21.91.112, 172.67.215.250
- **サーバーホスト**: v2011.coreserver.jp
- **SSH接続**: `ssh -i .ssh/omotenasuai_rsa omotenasuai@v2011.coreserver.jp`

## サーバー構成

### 現在の構成
- **プロバイダー**: コアサーバー
- **OS**: Linux（詳細確認要）
- **Webサーバー**: Apache/Nginx（確認要）
- **SSL証明書**: Let's Encrypt（Cloudflare経由）

### ディレクトリ構成（予定）
```
/home/omotenasuai/
├── public_html/          # ドキュメントルート
│   ├── index.html        # トップページ
│   ├── about/            # 会社概要
│   ├── services/         # サービス紹介
│   ├── contact/          # お問い合わせ
│   ├── assets/           # 静的ファイル
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── .htaccess         # Apache設定
└── logs/                 # ログファイル
```

## 開発フロー

1. ローカルでHTML/CSS/JSを開発
2. SSH経由でサーバーにアップロード
3. ブラウザで動作確認
4. 必要に応じて設定調整

## 技術スタック

- **HTML5**: セマンティックマークアップ
- **CSS3**: レスポンシブデザイン
- **JavaScript**: インタラクティブ要素
- **Bootstrap**: CSSフレームワーク（検討中）

## SEO対策

- メタタグの最適化
- 構造化データの実装
- サイトマップの作成
- robots.txtの設定

## セキュリティ

- HTTPS強制リダイレクト
- セキュリティヘッダーの設定
- 定期的なバックアップ

## 連絡先

- プロジェクト管理者: [担当者名]
- 技術担当: [担当者名]

---
作成日: 2025年1月18日
最終更新: 2025年1月18日
