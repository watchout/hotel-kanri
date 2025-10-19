# API監視・検証システム利用ガイド

## 概要

hotel-commonプロジェクトでは、API実装状況の継続的監視と仕様書との同期検証を自動化するシステムを導入しています。

## 🔍 API実装状況監視

### 基本的な使用方法

```bash
# 一回実行
npm run api-monitor

# 継続監視（30分間隔）
npm run api-monitor:continuous

# 変化検出
node scripts/api-monitor.js changes
```

### 監視内容

- **エンドポイント実装状況**: 宣言されたAPIの実際の動作確認
- **認証状況**: JWTトークンによる認証の成功/失敗
- **レスポンス分析**: ステータスコード別の実装判定
- **実装率計算**: 全体の実装進捗率

### 判定基準

| ステータスコード | 判定 | 説明 |
|---|---|---|
| 200, 201, 400, 401, 403, 500 | ✅ 実装済み | 正常に処理される |
| 404 | ❌ 未実装 | エンドポイントが見つからない |
| 501 | ❌ 明示的未実装 | 意図的に未実装とマーク |
| 0 | ❌ 接続エラー | サーバー未起動など |

## 📚 API仕様書同期検証

### 基本的な使用方法

```bash
# 仕様書と実装の同期検証
npm run api-spec-validate

# 包括的なヘルスチェック
npm run api-health
```

### 検証内容

- **仕様書エンドポイント抽出**: `docs/api/`から自動抽出
- **実装エンドポイント抽出**: ソースコードから自動抽出
- **SaaS向けAPI確認**: SaaS専用API仕様との照合
- **差分分析**: 仕様書と実装の不整合検出

### 検証結果の見方

```json
{
  "summary": {
    "docsEndpoints": 11,           // 仕様書で定義されたAPI数
    "implEndpoints": 194,          // 実装されたAPI数
    "docsImplMatchRate": "0.0%"    // 仕様書-実装一致率
  },
  "analysis": {
    "missingInImplementation": [], // 仕様書にあるが実装にない
    "missingInDocs": [],          // 実装にあるが仕様書にない
    "missingInSaaSImplementation": [] // SaaS向けで未実装
  }
}
```

## 📊 レポート

### 保存場所

- **監視レポート**: `reports/api-monitoring/`
- **検証レポート**: `reports/api-validation/`
- **最新結果**: `latest.json`（各ディレクトリ内）

### レポート構造

#### 監視レポート
```json
{
  "timestamp": "2025-09-11T23:31:19.964Z",
  "duration": "19027ms",
  "summary": {
    "total": 115,
    "implemented": 57,
    "notImplemented": 58,
    "implementationRate": "49.6%"
  },
  "results": [
    {
      "endpoint": "GET /health",
      "statusCode": 200,
      "implemented": true,
      "timestamp": "2025-09-11T23:31:19.964Z"
    }
  ],
  "authStatus": "success"
}
```

#### 検証レポート
```json
{
  "timestamp": "2025-09-11T23:33:56.730Z",
  "summary": {
    "docsEndpoints": 11,
    "implEndpoints": 194,
    "docsImplMatchRate": "0.0%"
  },
  "analysis": {
    "missingInImplementation": [],
    "missingInDocs": [],
    "commonDocsImpl": []
  }
}
```

## 🔄 CI/CD統合

### GitHub Actions

プロジェクトには以下のワークフローが設定されています：

- **プルリクエスト時**: API監視・検証を自動実行
- **毎日定時**: ヘルスチェック実行
- **手動実行**: 必要に応じて実行可能

### 設定ファイル

`.github/workflows/api-monitoring.yml`

## 🚨 アラート・通知

### 実装状況の変化検出

```bash
node scripts/api-monitor.js changes
```

出力例：
```
📈 実装状況変化検出:
   実装数変化: +5
   実装率変化: +4.3%
```

### Slack通知（CI/CD）

定時ヘルスチェックで問題が検出された場合、Slackに通知されます。

## 🛠️ カスタマイズ

### 監視間隔の変更

```bash
# 15分間隔で継続監視
node scripts/api-monitor.js continuous 15
```

### 除外エンドポイントの設定

`scripts/api-monitor.js`の`isImplemented`メソッドを修正：

```javascript
isImplemented(statusCode) {
  // カスタム判定ロジック
  return statusCode !== 404 && statusCode !== 501 && statusCode !== 0;
}
```

### 仕様書パターンの追加

`scripts/api-spec-validator.js`の`extractEndpointsFromDocs`メソッドでパターンを追加：

```javascript
const patterns = [
  /```\s*(GET|POST|PUT|DELETE|PATCH)\s+([^\s\n]+)/gi,
  // 新しいパターンを追加
  /\*\*\s*(GET|POST|PUT|DELETE|PATCH)\s+([^\s\n]+)\*\*/gi
];
```

## 📈 メトリクス

### 追跡される指標

- **実装率**: 宣言されたAPIのうち実装済みの割合
- **仕様書同期率**: 仕様書と実装の一致度
- **実装変化**: 時系列での実装状況変化
- **レスポンス時間**: API監視の実行時間

### 履歴管理

- 最新100件の監視結果を保持
- 変化検出による実装進捗追跡
- 長期的な品質トレンド分析

## 🔧 トラブルシューティング

### よくある問題

1. **サーバー未起動**
   ```
   ❌ GET /health - 0
   ```
   → `npm run dev`でサーバーを起動

2. **認証失敗**
   ```
   🔑 認証: 失敗（一部APIは認証なしでテスト）
   ```
   → `.env`のJWT_SECRETを確認

3. **仕様書が見つからない**
   ```
   📚 API仕様書スキャン: 0ファイル
   ```
   → `docs/api/`ディレクトリの存在確認

### ログ確認

```bash
# サーバーログ
tail -f logs/hotel-common-server.log

# 監視ログ
ls -la reports/api-monitoring/
```

## 📝 ベストプラクティス

1. **定期実行**: 開発中は30分間隔での継続監視を推奨
2. **プルリクエスト前**: `npm run api-health`で事前チェック
3. **仕様書更新**: API実装後は必ず仕様書も更新
4. **変化監視**: 大きな変更後は変化検出で影響確認

## 🔗 関連ドキュメント

- [API設計ガイド](../api/api-design-guide.md)
- [開発ワークフロー](../development/workflow.md)
- [CI/CD設定](../deployment/cicd-setup.md)
