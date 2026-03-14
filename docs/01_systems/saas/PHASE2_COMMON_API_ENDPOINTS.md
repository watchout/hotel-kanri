# 📋 Phase 2: hotel-common API エンドポイント確認

## **🚨 現在の状況**
- **hotel-common**: 停止中 (`http://localhost:3400` 応答なし)
- **hotel-saas**: 248個のAPI無効化完了
- **保護済みAPI**: 5個のみ稼働中

## **🎯 hotel-commonで提供すべきAPIエンドポイント**

### **🔐 認証・セキュリティ系 (最高優先度)**
```yaml
必須エンドポイント:
  - POST /api/v1/auth/login           # ログイン処理
  - GET  /api/v1/auth/validate-token  # トークン検証
  - POST /api/v1/auth/refresh         # トークン更新
  - GET  /api/v1/tenants/{id}         # テナント情報取得
  - GET  /api/v1/staff/{id}           # スタッフ情報取得
```

### **📊 統計・ダッシュボード系 (高優先度)**
```yaml
管理画面必須:
  - GET /api/v1/admin/summary         # サマリー統計
  - GET /api/v1/admin/devices/count   # デバイス数
  - GET /api/v1/admin/orders/monthly-count # 月次注文数
  - GET /api/v1/admin/dashboard/stats # ダッシュボード統計
  - GET /api/v1/admin/rankings        # ランキング
```

### **🛒 注文・メニュー系 (高優先度)**
```yaml
顧客機能必須:
  - GET  /api/v1/orders/history       # 注文履歴
  - POST /api/v1/orders               # 注文作成
  - GET  /api/v1/orders/active        # アクティブ注文
  - GET  /api/v1/menus/top            # トップメニュー
  - GET  /api/v1/menu/gacha-menus     # ガチャメニュー
```

### **🏨 ホテル管理系 (中優先度)**
```yaml
運営機能:
  - GET  /api/v1/admin/rooms          # 部屋管理
  - GET  /api/v1/admin/front-desk/*   # フロント業務
  - GET  /api/v1/admin/billing/*      # 請求管理
  - GET  /api/v1/admin/settings/*     # 設定管理
```

### **🤖 AIコンシェルジュ系 (中優先度)**
```yaml
AI機能:
  - POST /api/v1/concierge/chat       # チャット
  - POST /api/v1/concierge/vector-search # ベクトル検索
  - GET  /api/v1/concierge/response-tree # 応答ツリー
```

### **📱 デバイス・TV系 (低優先度)**
```yaml
デバイス機能:
  - GET  /api/v1/admin/devices/*      # デバイス管理
  - GET  /api/v1/tv/apps              # TVアプリ
  - POST /api/v1/device/auth          # デバイス認証
```

## **🔄 段階的復旧計画**

### **Step 1: 認証系復旧 (即座実行)**
1. hotel-common認証API稼働確認
2. ログイン・トークン検証API復旧
3. 管理画面アクセス可能化

### **Step 2: 基本機能復旧 (1-2日)**
1. 統計・ダッシュボードAPI復旧
2. 注文・メニューAPI復旧
3. 基本的な顧客機能復旧

### **Step 3: 高度機能復旧 (1週間)**
1. ホテル管理機能復旧
2. AIコンシェルジュ機能復旧
3. 全機能統合テスト

### **Step 4: 最適化・完成 (2週間)**
1. パフォーマンス最適化
2. エラーハンドリング強化
3. 本番環境対応

## **📋 次のアクション**

### **hotel-commonチーム向け**
```bash
# 必須APIエンドポイント実装確認
curl http://localhost:3400/api/v1/auth/login
curl http://localhost:3400/api/v1/admin/summary
curl http://localhost:3400/api/v1/orders/history
```

### **hotel-saasチーム向け**
```bash
# 優先度順API復旧スクリプト実行
./scripts/restore-priority-apis.sh
```

---
**更新日時**: 2024-12-19 13:45
**ステータス**: hotel-common稼働待ち
**次回確認**: hotel-common起動後
