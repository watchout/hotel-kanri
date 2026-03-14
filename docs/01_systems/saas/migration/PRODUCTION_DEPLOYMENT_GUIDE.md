# 🚀 hotel-common API統合 本番環境適用ガイド

## **📋 概要**

このガイドでは、hotel-saasアプリケーションとhotel-common APIの統合を本番環境に適用するための手順を説明します。フェーズ1の認証・テナント統合の実装が完了し、テストも成功したため、本番環境への適用準備を行います。

## **🔧 前提条件**

1. **環境**:
   - 本番環境のhotel-commonサーバーが稼働していること
   - 本番環境のhotel-saasアプリケーションがデプロイされていること
   - 必要な環境変数が設定されていること

2. **アクセス権限**:
   - 本番サーバーへのSSHアクセス権限
   - GitリポジトリへのPush権限
   - 環境変数の設定権限

## **🚨 リスクと対策**

| リスク | 影響度 | 対策 |
|-------|--------|------|
| 認証機能の停止 | 高 | フォールバック機構の確認、ロールバック手順の準備 |
| APIエラー | 中 | エラーハンドリングの確認、タイムアウト設定の調整 |
| パフォーマンス低下 | 中 | 段階的デプロイ、モニタリングの強化 |
| データ不整合 | 低 | データ検証ステップの追加 |

## **📝 デプロイ前チェックリスト**

- [ ] 統合テストが全て成功していること
- [ ] 環境変数の設定値が確認されていること
- [ ] フォールバック機構が正常に動作することを確認
- [ ] ロールバック手順が準備されていること
- [ ] 関係者への通知が完了していること

## **🔄 デプロイ手順**

### **1. 環境変数の設定**

```bash
# 本番サーバーで実行
export INTEGRATION_MODE=FULL
export HOTEL_COMMON_API_URL=https://api.hotel-common.example.com  # 本番環境のURL
export NODE_ENV=production
```

または、環境設定ファイル（.env）に追加:

```
INTEGRATION_MODE=FULL
HOTEL_COMMON_API_URL=https://api.hotel-common.example.com
NODE_ENV=production
```

### **2. ファイルの置き換え**

```bash
# 本番サーバーで実行
cd /path/to/hotel-saas

# バックアップの作成
cp server/utils/authService.ts server/utils/authService.ts.bak
cp server/middleware/00.unified-auth.ts server/middleware/00.unified-auth.ts.bak

# 新しいファイルの適用
mv server/utils/authService.v2.ts server/utils/authService.ts
mv server/middleware/00.unified-auth.v2.ts server/middleware/00.unified-auth.ts
```

### **3. アプリケーションの再起動**

```bash
# 本番サーバーで実行
pm2 restart hotel-saas
# または
docker-compose restart hotel-saas
```

### **4. 動作確認**

```bash
# 統合テストAPIを実行
curl https://hotel-saas.example.com/api/v1/auth/test-integration
```

レスポンスを確認し、全てのテストが成功していることを確認します。

### **5. モニタリング**

```bash
# ログの確認
tail -f /path/to/hotel-saas/logs/app.log

# または
docker-compose logs -f hotel-saas
```

認証関連のログを確認し、エラーがないことを確認します。

## **⏪ ロールバック手順**

問題が発生した場合は、以下の手順でロールバックします：

```bash
# 本番サーバーで実行
cd /path/to/hotel-saas

# バックアップから復元
cp server/utils/authService.ts.bak server/utils/authService.ts
cp server/middleware/00.unified-auth.ts.bak server/middleware/00.unified-auth.ts

# 環境変数の変更
export INTEGRATION_MODE=PARTIAL  # または.envファイルを編集

# アプリケーションの再起動
pm2 restart hotel-saas
# または
docker-compose restart hotel-saas
```

## **📊 デプロイ後の確認事項**

1. **認証機能の確認**:
   - ログイン機能が正常に動作すること
   - 認証が必要なAPIが正常に動作すること
   - 権限チェックが正常に機能すること

2. **テナント情報の確認**:
   - テナント情報が正しく取得できること
   - テナントに応じた機能制限が正常に動作すること

3. **パフォーマンスの確認**:
   - 認証処理の応答時間が許容範囲内であること
   - APIタイムアウトが発生していないこと

4. **エラーログの確認**:
   - 認証関連のエラーログがないこと
   - API接続エラーがないこと

## **🔍 トラブルシューティング**

### **認証エラーが発生する場合**

1. 環境変数の設定を確認
   ```bash
   echo $INTEGRATION_MODE
   echo $HOTEL_COMMON_API_URL
   ```

2. hotel-common APIの疎通確認
   ```bash
   curl $HOTEL_COMMON_API_URL/health
   curl -X POST $HOTEL_COMMON_API_URL/api/auth/validate -H "Content-Type: application/json" -d '{"token": "test-token"}'
   ```

3. ログの確認
   ```bash
   grep "認証" /path/to/hotel-saas/logs/app.log
   grep "API" /path/to/hotel-saas/logs/app.log
   ```

### **テナント情報が取得できない場合**

1. テナントAPIの疎通確認
   ```bash
   curl $HOTEL_COMMON_API_URL/api/tenants
   ```

2. ログの確認
   ```bash
   grep "テナント" /path/to/hotel-saas/logs/app.log
   ```

## **📅 次のステップ**

1. **オーダー関連API統合**:
   - hotel-common側でのオーダー関連API実装の完了を待つ
   - 同様の手順でオーダー関連APIの統合を実施

2. **db-serviceの段階的置き換え**:
   - テナント関連メソッドの置き換え
   - 認証関連メソッドの置き換え

3. **パフォーマンス最適化**:
   - キャッシュ機構の導入検討
   - 認証処理の高速化

---
**作成日時**: 2025-08-22
**更新履歴**: 初回作成
