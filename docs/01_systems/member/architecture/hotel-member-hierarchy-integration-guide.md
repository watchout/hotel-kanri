# 🎯 hotel-member 階層権限管理統合ガイド

**対象システム**: hotel-member (AI顧客管理システム)  
**実装方針**: 部分的階層対応（顧客データ重点）  
**技術スタック**: FastAPI + Python + hotel-common連携  
**実装期間**: 2週間（段階的適用）

---

## 📋 **実装概要**

### **🎯 対応方針**
hotel-memberでは**顧客データの階層共有**に焦点を当てた部分的実装を行います。

```yaml
実装対象:
  ✅ 顧客基本情報の階層アクセス制御
  ✅ 会員ランク・ポイントの階層別管理  
  ✅ JWT階層認証の統合
  ✅ API権限チェックの部分適用

実装対象外:
  ❌ 複雑な組織管理UI
  ❌ 全機能への階層権限適用
  ❌ 既存フロー破壊的変更
```

### **📊 優先度マトリックス**

| 機能 | 階層対応必要性 | 実装優先度 | 実装時期 |
|------|----------------|------------|----------|
| **顧客基本情報管理** | HIGH | 🔴 最優先 | Week 1 |
| **会員ランク・ポイント** | MEDIUM | 🟡 中優先 | Week 2 |
| **JWT認証統合** | HIGH | 🔴 最優先 | Week 1 |
| **予約導線** | LOW | 🔵 低優先 | 将来 |
| **マーケティング配信** | LOW | 🔵 低優先 | 将来 |

---

## 🏗️ **技術実装設計**

### **1. FastAPI × hotel-common 連携アーキテクチャ**

```python
# hotel-member/app/hierarchy/client.py
from typing import Optional, Dict, Any, List
import httpx
import asyncio
from pydantic import BaseModel

class HierarchyContext(BaseModel):
    organization_id: str
    organization_level: int  # 1-4
    organization_type: str   # GROUP/BRAND/HOTEL/DEPARTMENT
    organization_path: str
    access_scope: List[str]
    data_access_policies: Dict[str, Dict[str, str]]

class HierarchicalUser(BaseModel):
    user_id: str
    tenant_id: str
    email: str
    role: str
    level: int
    permissions: List[str]
    hierarchy_context: Optional[HierarchyContext]
    accessible_tenants: List[str]

class HotelCommonHierarchyClient:
    """
    hotel-common階層権限管理との連携クライアント
    """
    
    def __init__(self, hotel_common_url: str = "http://localhost:3400"):
        self.base_url = hotel_common_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def verify_hierarchical_token(self, token: str) -> Optional[HierarchicalUser]:
        """
        階層JWT検証
        """
        try:
            response = await self.client.post(
                f"{self.base_url}/api/hierarchy/auth/verify",
                json={"token": token},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return HierarchicalUser(**data["user"])
            return None
            
        except Exception as e:
            print(f"階層JWT検証エラー: {e}")
            return None
    
    async def check_customer_data_access(
        self, 
        user_token: str,
        target_tenant_id: str,
        operation: str = "READ"
    ) -> bool:
        """
        顧客データアクセス権限チェック
        """
        try:
            response = await self.client.post(
                f"{self.base_url}/api/hierarchy/permissions/check",
                json={
                    "token": user_token,
                    "target_resource": {
                        "tenant_id": target_tenant_id,
                        "data_type": "CUSTOMER"
                    },
                    "operation": operation
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("allowed", False)
            return False
            
        except Exception as e:
            print(f"顧客データアクセス権限チェックエラー: {e}")
            return False
    
    async def get_accessible_tenants(self, user_token: str) -> List[str]:
        """
        アクセス可能テナント一覧取得
        """
        try:
            user = await self.verify_hierarchical_token(user_token)
            if user:
                return user.accessible_tenants
            return []
            
        except Exception as e:
            print(f"アクセス可能テナント取得エラー: {e}")
            return []

# グローバルクライアントインスタンス
hierarchy_client = HotelCommonHierarchyClient()
```

### **2. FastAPI認証ミドルウェア統合**

```python
# hotel-member/app/middleware/hierarchy_auth.py
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
from app.hierarchy.client import hierarchy_client, HierarchicalUser

security = HTTPBearer()

async def get_hierarchical_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> HierarchicalUser:
    """
    階層権限対応認証ミドルウェア
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="認証が必要です")
    
    token = credentials.credentials
    
    # 1. hotel-common階層JWT検証
    user = await hierarchy_client.verify_hierarchical_token(token)
    if not user:
        # 2. フォールバック：既存hotel-member認証
        try:
            # 既存のhotel-member JWT検証ロジック
            payload = jwt.decode(token, "member_secret", algorithms=["HS256"])
            
            # 階層コンテキストなしのベーシックユーザー作成
            user = HierarchicalUser(
                user_id=payload["user_id"],
                tenant_id=payload.get("tenant_id", "default"),
                email=payload["email"],
                role=payload.get("role", "STAFF"),
                level=payload.get("level", 3),
                permissions=payload.get("permissions", []),
                hierarchy_context=None,
                accessible_tenants=[payload.get("tenant_id", "default")]
            )
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="無効なトークンです")
    
    return user

async def require_customer_data_access(
    operation: str = "READ"
):
    """
    顧客データアクセス権限必須デコレータ
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # リクエストからユーザー・テナント情報取得
            request = kwargs.get("request") or args[0]
            user = kwargs.get("current_user")
            target_tenant_id = kwargs.get("tenant_id") or request.path_params.get("tenant_id")
            
            if not user or not target_tenant_id:
                raise HTTPException(status_code=400, detail="認証またはテナント情報が不足しています")
            
            # 階層権限チェック
            has_access = await hierarchy_client.check_customer_data_access(
                user_token=request.headers.get("authorization", "").replace("Bearer ", ""),
                target_tenant_id=target_tenant_id,
                operation=operation
            )
            
            if not has_access:
                raise HTTPException(
                    status_code=403, 
                    detail=f"テナント {target_tenant_id} の顧客データへの {operation} 権限がありません"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

### **3. 顧客管理API階層対応**

```python
# hotel-member/app/routers/customers.py
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from app.middleware.hierarchy_auth import get_hierarchical_user, require_customer_data_access
from app.hierarchy.client import hierarchy_client, HierarchicalUser
from app.models.customer import Customer, CustomerCreate, CustomerUpdate

router = APIRouter(prefix="/api/v2/customers", tags=["customers"])

@router.get("/", response_model=List[Customer])
@require_customer_data_access("READ")
async def get_customers(
    request: Request,
    tenant_id: Optional[str] = None,
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    顧客一覧取得（階層権限対応）
    """
    # アクセス可能テナント取得
    accessible_tenants = await hierarchy_client.get_accessible_tenants(
        request.headers.get("authorization", "").replace("Bearer ", "")
    )
    
    # テナントフィルタリング
    target_tenants = accessible_tenants
    if tenant_id:
        if tenant_id not in accessible_tenants:
            raise HTTPException(status_code=403, detail="指定テナントへのアクセス権限がありません")
        target_tenants = [tenant_id]
    
    # 顧客データ取得（階層フィルタ適用）
    customers = []
    for tenant in target_tenants:
        tenant_customers = await get_customers_by_tenant(tenant)
        customers.extend(tenant_customers)
    
    return customers

@router.get("/{customer_id}", response_model=Customer)
async def get_customer(
    customer_id: str,
    request: Request,
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    顧客詳細取得（階層権限対応）
    """
    # 顧客のテナント取得
    customer = await get_customer_from_db(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="顧客が見つかりません")
    
    # 階層権限チェック
    has_access = await hierarchy_client.check_customer_data_access(
        user_token=request.headers.get("authorization", "").replace("Bearer ", ""),
        target_tenant_id=customer.tenant_id,
        operation="READ"
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="この顧客データへのアクセス権限がありません")
    
    return customer

@router.post("/", response_model=Customer)
@require_customer_data_access("CREATE")
async def create_customer(
    customer_data: CustomerCreate,
    request: Request,
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    顧客作成（階層権限対応）
    """
    # テナント権限確認
    target_tenant_id = customer_data.tenant_id or current_user.tenant_id
    
    accessible_tenants = await hierarchy_client.get_accessible_tenants(
        request.headers.get("authorization", "").replace("Bearer ", "")
    )
    
    if target_tenant_id not in accessible_tenants:
        raise HTTPException(status_code=403, detail="指定テナントでの顧客作成権限がありません")
    
    # 顧客作成
    customer = await create_customer_in_db(customer_data, target_tenant_id)
    
    # イベント発行（階層情報付き）
    await publish_customer_created_event(customer, current_user.hierarchy_context)
    
    return customer

@router.put("/{customer_id}", response_model=Customer)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    request: Request,
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    顧客更新（階層権限対応）
    """
    # 既存顧客取得
    customer = await get_customer_from_db(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="顧客が見つかりません")
    
    # 更新権限チェック
    has_access = await hierarchy_client.check_customer_data_access(
        user_token=request.headers.get("authorization", "").replace("Bearer ", ""),
        target_tenant_id=customer.tenant_id,
        operation="UPDATE"
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="この顧客データの更新権限がありません")
    
    # 階層レベル別更新制限
    if current_user.hierarchy_context:
        restricted_fields = get_hierarchy_restricted_fields(
            current_user.hierarchy_context.organization_level,
            current_user.hierarchy_context.organization_type
        )
        
        # 制限フィールドの更新チェック
        for field in restricted_fields:
            if hasattr(customer_data, field) and getattr(customer_data, field) is not None:
                raise HTTPException(
                    status_code=403, 
                    detail=f"フィールド '{field}' の更新権限がありません"
                )
    
    # 顧客更新
    updated_customer = await update_customer_in_db(customer_id, customer_data)
    
    # イベント発行
    await publish_customer_updated_event(updated_customer, current_user.hierarchy_context)
    
    return updated_customer

def get_hierarchy_restricted_fields(level: int, org_type: str) -> List[str]:
    """
    階層レベル別更新制限フィールド取得
    """
    if level == 4:  # DEPARTMENT
        return ["membership_tier", "points_balance", "credit_limit"]
    elif level == 3:  # HOTEL
        return ["membership_tier"]
    else:  # GROUP/BRAND
        return []  # 制限なし
```

### **4. 会員ランク・ポイント階層管理**

```python
# hotel-member/app/routers/membership.py
from fastapi import APIRouter, Depends, HTTPException, Request
from app.middleware.hierarchy_auth import get_hierarchical_user, HierarchicalUser
from app.hierarchy.client import hierarchy_client
from app.models.membership import MembershipTier, PointsTransaction

router = APIRouter(prefix="/api/v2/membership", tags=["membership"])

@router.get("/tiers")
async def get_membership_tiers(
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    会員ランク一覧取得（階層対応）
    """
    if not current_user.hierarchy_context:
        # 階層コンテキストなし：基本ティアのみ
        return await get_basic_membership_tiers(current_user.tenant_id)
    
    # 階層レベル別ティア取得
    accessible_tenants = current_user.accessible_tenants
    organization_level = current_user.hierarchy_context.organization_level
    
    if organization_level <= 2:  # GROUP/BRAND
        # グループ横断ティア管理
        return await get_cross_brand_membership_tiers(accessible_tenants)
    else:  # HOTEL/DEPARTMENT
        # 店舗レベルティア
        return await get_hotel_membership_tiers(current_user.tenant_id)

@router.post("/points/transfer")
async def transfer_points_across_brands(
    from_tenant_id: str,
    to_tenant_id: str,
    customer_id: str,
    points: int,
    request: Request,
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    ブランド間ポイント移行（階層権限必須）
    """
    if not current_user.hierarchy_context:
        raise HTTPException(status_code=403, detail="ブランド間ポイント移行には階層権限が必要です")
    
    # GROUP/BRANDレベル以上のみ許可
    if current_user.hierarchy_context.organization_level > 2:
        raise HTTPException(status_code=403, detail="ブランド間ポイント移行権限がありません")
    
    # 両方のテナントへのアクセス権確認
    accessible_tenants = current_user.accessible_tenants
    if from_tenant_id not in accessible_tenants or to_tenant_id not in accessible_tenants:
        raise HTTPException(status_code=403, detail="指定テナントへのアクセス権限がありません")
    
    # ポイント移行実行
    transaction = await execute_cross_brand_points_transfer(
        from_tenant_id, to_tenant_id, customer_id, points, current_user.user_id
    )
    
    # 階層イベント発行
    await publish_cross_brand_points_event(transaction, current_user.hierarchy_context)
    
    return {"success": True, "transaction_id": transaction.id}

@router.get("/analytics/group-summary")
async def get_group_membership_analytics(
    current_user: HierarchicalUser = Depends(get_hierarchical_user)
):
    """
    グループ全体会員分析（階層権限必須）
    """
    if not current_user.hierarchy_context:
        raise HTTPException(status_code=403, detail="グループ分析には階層権限が必要です")
    
    # GROUP/BRANDレベル以上のみ許可
    if current_user.hierarchy_context.organization_level > 2:
        raise HTTPException(status_code=403, detail="グループ分析権限がありません")
    
    # データアクセス権限チェック
    has_analytics_access = await hierarchy_client.check_customer_data_access(
        user_token=request.headers.get("authorization", "").replace("Bearer ", ""),
        target_tenant_id="group_analytics",
        operation="READ"
    )
    
    if not has_analytics_access:
        raise HTTPException(status_code=403, detail="分析データアクセス権限がありません")
    
    # グループ横断分析データ取得
    analytics = await generate_group_membership_analytics(
        current_user.accessible_tenants,
        current_user.hierarchy_context.organization_level
    )
    
    return analytics
```

### **5. 設定・初期化**

```python
# hotel-member/app/main.py
from fastapi import FastAPI, Request
from app.hierarchy.client import hierarchy_client
from app.middleware.hierarchy_auth import get_hierarchical_user

app = FastAPI(title="Hotel Member Management (Hierarchy Enabled)")

@app.on_event("startup")
async def startup_event():
    """
    アプリケーション起動時処理
    """
    print("🎯 hotel-member階層権限管理統合開始...")
    
    # hotel-common接続確認
    try:
        # ヘルスチェック
        response = await hierarchy_client.client.get(f"{hierarchy_client.base_url}/health")
        if response.status_code == 200:
            print("✅ hotel-common階層基盤接続成功")
        else:
            print("⚠️ hotel-common階層基盤接続不安定")
    except Exception as e:
        print(f"❌ hotel-common階層基盤接続失敗: {e}")
        print("🔄 既存認証での動作継続（フォールバックモード）")

@app.middleware("http")
async def hierarchy_context_middleware(request: Request, call_next):
    """
    階層コンテキスト付与ミドルウェア
    """
    # Authorization ヘッダーから階層情報抽出
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        user = await hierarchy_client.verify_hierarchical_token(token)
        if user:
            # リクエストに階層コンテキスト付与
            request.state.hierarchy_user = user
            request.state.accessible_tenants = user.accessible_tenants
    
    response = await call_next(request)
    return response

# 既存API統合
from app.routers import customers, membership
app.include_router(customers.router)
app.include_router(membership.router)
```

---

## 📊 **実装計画・工数見積**

### **Week 1: 基盤統合**
```
Day 1-2: hotel-common連携クライアント実装
├── HotelCommonHierarchyClient実装
├── 階層JWT検証機能
├── 権限チェック機能
└── 接続テスト・ヘルスチェック

Day 3-4: FastAPI認証ミドルウェア統合
├── 階層認証ミドルウェア実装
├── 既存認証との統合・フォールバック
├── 権限デコレータ実装
└── 単体テスト

Day 5: 顧客管理API階層対応
├── 顧客一覧・詳細取得の階層フィルタ
├── 顧客作成・更新の権限チェック
├── 階層イベント発行
└── API動作テスト
```

### **Week 2: 会員機能拡張**
```
Day 6-7: 会員ランク・ポイント階層管理
├── 階層レベル別ティア管理
├── ブランド間ポイント移行機能
├── 階層別制限フィールド制御
└── 会員機能テスト

Day 8-9: 分析・レポート階層対応
├── グループ横断分析機能
├── 階層別データ可視化
├── 権限別レポート生成
└── 分析機能テスト

Day 10: 統合テスト・最適化
├── 全機能統合テスト
├── パフォーマンス最適化
├── エラーハンドリング強化
└── ドキュメント整備
```

---

## 🔐 **セキュリティ・コンプライアンス**

### **データ保護強化**
```python
# 階層レベル別データマスキング
def apply_hierarchy_data_masking(customer_data: dict, user_level: int) -> dict:
    """
    階層レベル別データマスキング適用
    """
    if user_level >= 3:  # HOTEL/DEPARTMENT
        # 機密データマスキング
        customer_data["phone"] = mask_phone_number(customer_data.get("phone"))
        customer_data["address"] = mask_address(customer_data.get("address"))
    
    if user_level == 4:  # DEPARTMENT
        # さらに制限
        customer_data.pop("credit_card_info", None)
        customer_data.pop("income_level", None)
    
    return customer_data
```

### **監査ログ強化**
```python
async def log_hierarchy_access(
    user: HierarchicalUser,
    action: str,
    resource_type: str,
    resource_id: str,
    target_tenant: str,
    result: str
):
    """
    階層アクセス監査ログ記録
    """
    log_entry = {
        "timestamp": datetime.utcnow(),
        "user_id": user.user_id,
        "organization_id": user.hierarchy_context.organization_id if user.hierarchy_context else None,
        "organization_level": user.hierarchy_context.organization_level if user.hierarchy_context else None,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "target_tenant": target_tenant,
        "result": result,
        "access_scope": user.accessible_tenants
    }
    
    await save_audit_log(log_entry)
```

---

## 🎯 **成功指標・検証項目**

### **機能検証**
- ✅ 階層JWT認証の正常動作
- ✅ 顧客データの階層アクセス制御
- ✅ 会員ランク・ポイントの階層管理
- ✅ ブランド間データ共有機能
- ✅ 権限エラーの適切な処理

### **パフォーマンス検証**
- ✅ API応答速度 < 200ms（階層チェック込み）
- ✅ 同時ユーザー100人での安定動作
- ✅ hotel-common連携の信頼性99%以上

### **セキュリティ検証**
- ✅ 権限昇格攻撃の防止
- ✅ テナント間データ漏洩の防止
- ✅ 監査ログの完全記録

**🎯 hotel-member階層権限管理統合により、グループ横断の顧客・会員データ管理が安全かつ効率的に実現されます。** 