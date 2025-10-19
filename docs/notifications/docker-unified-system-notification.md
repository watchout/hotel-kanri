# 🚨 重要通知: Docker統合システム構造への移行

**発信者**: Iza（統合管理者）  
**日付**: 2025年1月18日  
**対象**: Sun（hotel-saas）、Luna（hotel-pms）、Suno（hotel-member）、全開発チーム  
**緊急度**: 🔴 **HIGH** - 即座対応必須  

---

## 📢 **重要な変更通知**

**UNIFY-DEVプロジェクトの一環として、4システム完全Docker統合を実施します。**

### 🎯 **変更の概要**

#### **旧構造（廃止予定）**
```
❌ PM2ベース個別デプロイ
❌ 各システム独立環境
❌ 手動環境構築
❌ 環境差異による問題
```

#### **新構造（2025年1月18日より有効）**
```
✅ Docker統合コンテナ環境
✅ 統一PostgreSQL（hotel_unified_db）
✅ Event-driven連携
✅ オフライン対応完備
```

---

## 🎯 **各システム担当者への指示**

### ☀️ **Sun（hotel-saas担当）**

#### **現在の状況**
- ✅ **Docker化完了済み**
- ✅ **統合環境で稼働中**

#### **今後のタスク**
```markdown
📋 **優先度: 中**
1. PWAオフライン機能の強化
2. ServiceWorker最適化  
3. 注文同期ロジック改善
4. 新Docker環境での動作検証継続
```

#### **重要な変更点**
- **開発環境**: `docker compose up -d saas`
- **ファイル編集**: `/Users/kaneko/hotel-saas/`（実プロジェクト）
- **ポート**: 3100（変更なし）
- **データベース**: `hotel_unified_db`（統合済み）

---

### 🌙 **Luna（hotel-pms担当）**

#### **現在の状況**
- 🔄 **Docker化実装中**
- ❗ **緊急対応必須**

#### **今後のタスク**
```markdown
📋 **優先度: 最高**
1. 🚨 Dockerfile作成（即座開始）
2. 🚨 オフライン業務継続機能実装
3. 🚨 予約同期ロジック設計
4. Electron版Docker対応（3301ポート）
```

#### **重要な変更点**
- **開発環境**: `docker compose up -d pms`（準備中）
- **ファイル編集**: `/Users/kaneko/hotel-pms/`（実プロジェクト）
- **ポート**: 3300（ブラウザ版）、3301（Electron版）
- **データベース**: `hotel_unified_db`（移行必須）
- **最重要**: **オフライン時のフロント業務継続**

#### **緊急実装項目**
```typescript
// 必須実装: オフライン予約管理
interface OfflineReservation {
  localId: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  reservationData: ReservationData;
  createdAt: Date;
}
```

---

### ⚡ **Suno（hotel-member担当）**

#### **現在の状況**
- 🔄 **Docker化実装中**
- ❗ **対応必須**

#### **今後のタスク**
```markdown
📋 **優先度: 高**
1. 🚨 Dockerfile作成
2. 会員データキャッシュ戦略設計
3. プライバシー保護強化
4. API/UI分離対応（3200/8080ポート）
```

#### **重要な変更点**
- **開発環境**: `docker compose up -d member`（準備中）
- **ファイル編集**: `/Users/kaneko/hotel-member/`（実プロジェクト）
- **ポート**: 3200（API）、8080（UI）
- **データベース**: `hotel_unified_db`（移行必須）
- **役割**: **顧客マスタの正本保持**

#### **データ管理責任**
```typescript
// 顧客マスタ管理（正本）
interface CustomerMaster {
  id: string;
  basicInfo: CustomerBasicInfo;
  membershipInfo: MembershipInfo;
  privacySettings: PrivacySettings;
  pointBalance: number;
}
```

---

## 🔧 **統一開発環境**

### **新しい開発フロー**
```bash
# 1. プロジェクトルートに移動
cd /Users/kaneko/hotel-kanri

# 2. 全システム起動
docker compose -f docker-compose.unified.yml up -d

# 3. 個別システム起動
docker compose -f docker-compose.unified.yml up -d saas
docker compose -f docker-compose.unified.yml up -d pms
docker compose -f docker-compose.unified.yml up -d member
docker compose -f docker-compose.unified.yml up -d common

# 4. ログ確認
docker compose -f docker-compose.unified.yml logs -f [service_name]

# 5. 停止
docker compose -f docker-compose.unified.yml down
```

### **ファイル編集**
```bash
# 実プロジェクトファイルを直接編集
/Users/kaneko/hotel-saas/     # ← Sun担当
/Users/kaneko/hotel-pms/      # ← Luna担当  
/Users/kaneko/hotel-member/   # ← Suno担当
/Users/kaneko/hotel-common/   # ← Iza担当

# 自動反映: Docker Volume Mount
# ファイル変更 → 即座にコンテナに反映 → ホットリロード
```

---

## 🌐 **オフライン対応設計**

### **システム別オフライン戦略**

#### **hotel-pms（最重要）**
```typescript
// フロント業務の完全継続
✅ 予約作成・変更
✅ チェックイン/アウト  
✅ 部屋状況管理
✅ 顧客情報参照
📦 IndexedDB永続化
🔄 オンライン復帰時自動同期
```

#### **hotel-saas（PWA対応）**
```typescript
// サービス注文の継続
✅ サービス注文（ローカル保存）
✅ メニュー表示（キャッシュ）
✅ AI基本応答（ローカルデータ）
📦 バックグラウンド同期
🔄 注文データ自動送信
```

#### **hotel-member（参照系メイン）**
```typescript
// 会員情報の参照継続
✅ 会員情報表示
✅ ポイント残高参照
✅ 利用履歴表示
❌ 新規登録（オンライン必須）
⚠️ ポイント利用（制限あり）
```

---

## 📊 **統一データベース**

### **PostgreSQL統一DB**
```sql
-- 統一データベース: hotel_unified_db
-- 接続情報: postgresql://hotel_app:password@db:5432/hotel_unified_db

-- 各システムのテーブル構成
┌─────────────────────────────────────────┐
│           hotel_unified_db              │
├─────────────────────────────────────────┤
│ saas_*     │ AIコンシェルジュ関連        │
│ pms_*      │ フロント業務関連           │
│ member_*   │ 会員管理関連              │
│ common_*   │ 共通機能関連              │
│ events_*   │ イベント管理関連           │
└─────────────────────────────────────────┘
```

---

## 🚢 **デプロイメント**

### **Dokku統合デプロイ**
```bash
# 各システム個別デプロイ
git subtree push --prefix=/Users/kaneko/hotel-saas dokku-saas main
git subtree push --prefix=/Users/kaneko/hotel-pms dokku-pms main
git subtree push --prefix=/Users/kaneko/hotel-member dokku-member main
git subtree push --prefix=/Users/kaneko/hotel-common dokku-common main
```

---

## ⚠️ **重要な注意事項**

### **🚨 即座対応必須**
1. **Luna**: hotel-pmsのDocker化を最優先で実施
2. **Suno**: hotel-memberのDocker化を並行実施
3. **Sun**: 現在の動作継続、PWA強化準備

### **🚫 使用禁止**
- PM2ベースのデプロイ手順
- 個別環境での開発
- 旧docker-compose.yml

### **✅ 使用推奨**
- 新統合Docker環境
- `docker-compose.unified.yml`
- 統一PostgreSQL接続

---

## 📚 **関連ドキュメント**

- **📖 新構造詳細**: `docs/architecture/docker/unified-docker-architecture-2025.md`
- **🔧 開発ガイド**: `docs/development/docker-development-guide.md`
- **🚀 デプロイガイド**: `docs/deployment/dokku-unified-deploy.md`
- **🌐 オフライン設計**: `docs/architecture/offline/offline-strategy.md`

---

## 🤝 **サポート・質問**

### **緊急時連絡**
- **統合管理**: Iza（統合管理者）
- **技術サポート**: hotel-kanri開発チーム

### **質問・課題報告**
1. 新構造に関する技術的質問
2. Docker化実装での課題
3. オフライン対応の設計相談
4. システム間連携の問題

---

**🎯 この通知を確認次第、各担当者は即座に新構造への移行作業を開始してください。**

**📅 移行完了目標: 2025年1月25日**

---

**Iza（統合管理者）**  
**2025年1月18日**
