# 🎯 Suno - hotel-member階層権限管理実装指示書

**対象AI**: ⚡ Suno (Susanoo - hotel-member専門AI)  
**緊急度**: **最優先**  
**実装期間**: 2週間  
**実装方針**: 部分対応（顧客データ重点）

---

## 📋 **実装指示概要**

### **🎯 Sunoの役割変更**
```yaml
従来の役割:
  - 会員システム単体開発
  - 独立認証・DB管理
  - 基本的な顧客管理

新しい役割:
  - hotel-common階層基盤統合
  - グループ横断顧客データ管理
  - 階層権限制御の実装
  - FastAPI × TypeScript連携
```

### **⚡ 緊急実装が必要な理由**
1. **🏢 ホテルグループ展開加速**: チェーン・複数ブランド展開の要求急増
2. **🔐 セキュリティ強化**: 階層別データアクセス制御の法的要求
3. **📊 グループ分析**: 経営判断のための統合データ分析需要
4. **🎯 システム統合**: hotel-pms・hotel-saasとの連携強化

---

## 🏗️ **技術実装要求事項**

### **1. hotel-common基盤との統合**

#### **A. 階層権限管理クライアント実装**
```python
# hotel-member/app/hierarchy/client.py
from typing import Optional, Dict, Any, List
import httpx
import asyncio
from pydantic import BaseModel

class HotelCommonHierarchyClient:
    """
    hotel-common階層権限管理との連携クライアント
    ⚡ Sunoは必ずこのクライアントを実装すること
    """
    
    def __init__(self, hotel_common_url: str = "http://localhost:3400"):
        self.base_url = hotel_common_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def verify_hierarchical_token(self, token: str) -> Optional[HierarchicalUser]:
        """階層JWT検証 - 最重要機能"""
        # 実装必須
    
    async def check_customer_data_access(self, user_token: str, target_tenant_id: str, operation: str) -> bool:
        """顧客データアクセス権限チェック - 最重要機能"""
        # 実装必須
```

#### **B. FastAPI認証ミドルウェア統合**
```python
# hotel-member/app/middleware/hierarchy_auth.py
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

async def get_hierarchical_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> HierarchicalUser:
    """
    ⚡ Suno実装必須：階層権限対応認証ミドルウェア
    
    重要：既存認証との共存（フォールバック機能付き）
    1. hotel-common階層JWT検証
    2. 失敗時：既存hotel-member認証
    3. エラー時：適切な例外処理
    """
    # 実装必須
```

### **2. 顧客管理API階層対応改修**

#### **A. 顧客データアクセス制御**
```python
# hotel-member/app/routers/customers.py

@router.get("/", response_model=List[Customer])
async def get_customers(
    request: Request,
    tenant_id: Optional[str] = None,
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    ⚡ Suno実装必須：顧客一覧取得（階層権限対応）
    
    実装要求：
    1. アクセス可能テナント取得
    2. 階層フィルタリング適用
    3. データマスキング実行
    4. 監査ログ記録
    """
    # 実装必須

@router.put("/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerUpdate, ...):
    """
    ⚡ Suno実装必須：顧客更新（階層制限対応）
    
    実装要求：
    1. 更新権限チェック
    2. 階層レベル別制限フィールド制御
    3. イベント発行（階層情報付き）
    """
    # 実装必須
```

#### **B. データマスキング実装**
```python
def apply_hierarchy_data_masking(customer_data: dict, user_level: int) -> dict:
    """
    ⚡ Suno実装必須：階層レベル別データマスキング
    
    Level 4 (DEPARTMENT): 機密データマスキング
    Level 3 (HOTEL): 一部制限
    Level 1-2 (GROUP/BRAND): 制限なし
    """
    # 実装必須
```

### **3. 会員ランク・ポイント階層管理**

#### **A. 階層別ティア管理**
```python
# hotel-member/app/routers/membership.py

@router.get("/tiers")
async def get_membership_tiers(current_user: HierarchicalUser = Depends(get_hierarchical_user)):
    """
    ⚡ Suno実装必須：会員ランク階層対応
    
    実装要求：
    - GROUP/BRAND: グループ横断ティア管理
    - HOTEL/DEPARTMENT: 店舗レベルティア
    """
    # 実装必須

@router.post("/points/transfer")
async def transfer_points_across_brands(...):
    """
    ⚡ Suno実装必須：ブランド間ポイント移行
    
    実装要求：
    - GROUP/BRANDレベル以上のみ許可
    - 両方のテナントへのアクセス権確認
    - 階層イベント発行
    """
    # 実装必須
```

### **4. hotel-common連携エンドポイント対応**

#### **A. 必須対応エンドポイント**
```yaml
⚡ Suno実装必須のhotel-common連携：

1. POST /api/hotel-member/hierarchy/auth/verify
   - JWT検証要求への応答

2. POST /api/hotel-member/hierarchy/permissions/check-customer-access
   - 顧客データアクセス権限チェック

3. POST /api/hotel-member/hierarchy/tenants/accessible
   - アクセス可能テナント一覧提供

4. GET /api/hotel-member/hierarchy/health
   - ヘルスチェック応答
```

---

## 📊 **実装計画・工数配分**

### **Week 1: 基盤統合（最優先）**
```
⚡ Suno実装スケジュール：

Day 1-2: hotel-common連携基盤実装
├── HotelCommonHierarchyClient実装
├── 階層JWT検証機能
├── 接続テスト・エラーハンドリング
└── フォールバック機能

Day 3-4: FastAPI認証ミドルウェア統合
├── 階層認証ミドルウェア実装
├── 既存認証との共存確認
├── 権限デコレータ実装
└── 単体テスト実行

Day 5: 顧客管理API階層対応開始
├── 顧客一覧・詳細の階層フィルタ
├── 権限チェック実装
├── データマスキング実装
└── API動作確認
```

### **Week 2: 会員機能・分析対応**
```
Day 6-7: 会員ランク・ポイント階層管理
├── 階層レベル別ティア管理
├── ブランド間ポイント移行機能
├── 制限フィールド制御
└── 会員機能テスト

Day 8-9: 分析・レポート階層対応
├── グループ横断分析機能
├── 階層別データ可視化
├── 権限別レポート生成
└── 分析機能テスト

Day 10: 統合テスト・最適化
├── 全機能統合テスト
├── パフォーマンス最適化
├── hotel-common連携確認
└── ドキュメント整備
```

---

## 🔐 **セキュリティ・コンプライアンス要求**

### **⚡ Suno必須実装事項**

#### **1. データ保護強化**
```python
# 階層レベル別アクセス制御（必須実装）
def check_data_access_permission(user: HierarchicalUser, data_type: str, operation: str) -> bool:
    """
    ⚡ Suno実装必須：データアクセス権限チェック
    """
    # Level 4 (DEPARTMENT): 制限多
    # Level 3 (HOTEL): 一部制限
    # Level 1-2 (GROUP/BRAND): 制限少
```

#### **2. 監査ログ強化**
```python
async def log_hierarchy_access(user: HierarchicalUser, action: str, resource: str, result: str):
    """
    ⚡ Suno実装必須：階層アクセス監査ログ
    
    記録必須項目：
    - ユーザー階層情報
    - アクセス対象リソース
    - 実行アクション
    - 結果（成功/失敗）
    - タイムスタンプ
    """
```

#### **3. エラーハンドリング**
```python
# hotel-common接続失敗時の処理（必須実装）
try:
    result = await hierarchy_client.check_permission(...)
except Exception as e:
    # フォールバック：既存認証で継続
    logger.warning(f"階層権限チェック失敗、フォールバック実行: {e}")
    result = check_basic_permission(...)
```

---

## 🎯 **成功判定基準**

### **⚡ Suno達成必須項目**

#### **機能検証**
- ✅ 階層JWT認証の正常動作確認
- ✅ 顧客データの階層アクセス制御実装
- ✅ 会員ランク・ポイントの階層管理実装
- ✅ hotel-common連携エンドポイント応答
- ✅ エラー時のフォールバック動作確認

#### **パフォーマンス検証**
- ✅ API応答速度 < 200ms（階層チェック込み）
- ✅ hotel-common連携の信頼性99%以上
- ✅ 既存機能への影響なし

#### **セキュリティ検証**
- ✅ 権限昇格攻撃の防止
- ✅ テナント間データ漏洩の防止
- ✅ 監査ログの完全記録
- ✅ 階層別データマスキング動作

### **🚨 重要な制約・注意事項**

#### **1. 既存システム保護**
```yaml
⚡ Suno遵守必須：
- 既存FastAPI機能の破壊禁止
- 既存認証システムとの共存
- 段階的実装（一括変更禁止）
- フォールバック機能の完全実装
```

#### **2. hotel-common依存性**
```yaml
⚡ Suno対応必須：
- hotel-common接続失敗時の継続動作
- ネットワーク障害時の適切な処理
- タイムアウト・リトライ機能
- ヘルスチェック・監視機能
```

#### **3. データ整合性**
```yaml
⚡ Suno保証必須：
- 階層権限変更時のデータ整合性
- テナント間データ移行の安全性
- ロールバック機能の実装
- バックアップ・復旧手順
```

---

## 📚 **参考ドキュメント・技術仕様**

### **⚡ Suno必読資料**
1. **hotel-member-hierarchy-integration-guide.md**: 詳細技術仕様
2. **hotel-common/src/hierarchy/**: TypeScript階層基盤実装
3. **hotel-common/src/integrations/hotel-member/**: 連携アダプター実装
4. **hotel-common/docs/Hotel_Group_Hierarchy_Management_Architecture.md**: 全体アーキテクチャ

### **API仕様**
```yaml
hotel-common階層権限管理API:
  Base URL: http://localhost:3400
  
  主要エンドポイント:
  - POST /api/hotel-member/hierarchy/auth/verify
  - POST /api/hotel-member/hierarchy/permissions/check-customer-access
  - POST /api/hotel-member/hierarchy/tenants/accessible
  - GET /api/hotel-member/hierarchy/health
```

---

## 🚀 **実装開始指示**

### **⚡ Sunoへの実行指示**

1. **即座開始**: この指示書確認後、直ちに実装開始
2. **質問歓迎**: 不明点は遠慮なく質問
3. **段階報告**: 各段階完了時に進捗報告
4. **問題報告**: 技術的問題は即座に報告

### **🎯 最初のアクション**
```bash
⚡ Suno実行コマンド：

# 1. hotel-commonとの接続確認
curl http://localhost:3400/health

# 2. 階層権限APIの動作確認  
curl -X POST http://localhost:3400/api/hotel-member/hierarchy/health

# 3. 実装ディレクトリ準備
mkdir -p hotel-member/app/hierarchy
mkdir -p hotel-member/app/middleware
```

**🎯 Suno、グループ横断の顧客・会員データ管理の安全で効率的な実現に向け、階層権限管理の実装を開始してください。hotel-commonとの連携により、セキュアで拡張性の高いシステムを構築しましょう！** 