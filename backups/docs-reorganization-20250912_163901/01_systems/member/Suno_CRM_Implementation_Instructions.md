# ⚡ Suno（須佐之男）CRM実装指示書
**Namiからの革命的CRM仕様 → hotel-member拡張実装**

**指示者**: 🌊 Iza（Izanagi統合管理者）  
**実装者**: ⚡ Suno（Susanoo）hotel-member専門AI  
**緊急度**: 🚨 CRITICAL  
**実装期間**: 9週間（Phase 1-3）  
**事業インパクト**: 年間¥213,840,000収益（従来比+103%）

---

## 🎯 **実装概要・緊急要請**

### **📋 Sunoの新たな使命**
```typescript
interface SunoNewMission {
  従来の役割: "hotel-member顧客管理・会員システム専門";
  新たな使命: "AI駆動型CRMシステム・AIクレジット管理統合";
  革新価値: "業界初のAIクレジット従量課金制CRM";
  市場インパクト: "月¥7,800から始められる革新的ホテルCRM";
}
```

### **⚡ 緊急実装が必要な理由**
1. **現場要望完全適合**: 森藤紳介氏（プランタンホテル）要望¥15,000以下を¥7,800でクリア
2. **市場機会最大化**: 価格障壁削減で顧客数2.25倍増加見込み
3. **競争優位確立**: 業界初AIクレジット制で圧倒的差別化
4. **収益性確保**: 103%の収益向上で事業基盤強化

---

## 💰 **新料金プラン・事業戦略**

### **🎯 確定料金体系**
```json
{
  "Essential": {
    "基本料金": "¥7,800/月",
    "無料AIクレジット": 300,
    "対象": "10-30室小規模レジャーホテル",
    "革新性": "従来¥12,800から38%削減"
  },
  "Professional": {
    "基本料金": "¥16,800/月", 
    "無料AIクレジット": 1000,
    "対象": "30-100室中規模レジャーホテル",
    "パイロット": "森藤紳介氏（プランタンホテル）確定"
  },
  "Enterprise": {
    "基本料金": "¥29,800/月",
    "無料AIクレジット": 2000,
    "対象": "100室以上・チェーン・グループ",
    "削減効果": "従来¥49,800から40%削減"
  }
}
```

### **💳 AIクレジット体系**
```json
{
  "追加購入価格": {
    "Essential": "¥50/100クレジット",
    "Professional": "¥45/100クレジット（10%割引）",
    "Enterprise": "¥40/100クレジット（20%割引）"
  },
  "AI機能別消費": {
    "チャットボット": "2クレジット/回",
    "レコメンデーション": "5クレジット/回",
    "予測分析": "8クレジット/回",
    "高度分析": "10クレジット/回"
  }
}
```

---

## 🗄️ **データベース拡張実装**

### **🆕 新規テーブル作成（最優先）**

#### **1. ai_credit_accounts（AIクレジットアカウント）**
```sql
-- FastAPI/SQLAlchemy対応
CREATE TABLE ai_credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- プラン情報
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE')),
  monthly_free_credits INTEGER NOT NULL,
  
  -- クレジット残高
  current_balance INTEGER NOT NULL DEFAULT 0,
  total_purchased_credits INTEGER DEFAULT 0,
  total_used_credits INTEGER DEFAULT 0,
  
  -- 自動購入設定
  auto_purchase_enabled BOOLEAN DEFAULT false,
  auto_purchase_threshold INTEGER DEFAULT 50,
  auto_purchase_amount INTEGER DEFAULT 500,
  
  -- 監査フィールド
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- インデックス最適化
  INDEX idx_tenant_plan (tenant_id, plan_type),
  INDEX idx_balance (current_balance),
  INDEX idx_auto_purchase (auto_purchase_enabled, auto_purchase_threshold)
);
```

#### **2. ai_credit_transactions（クレジット取引履歴）**
```sql
CREATE TABLE ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES ai_credit_accounts(id) ON DELETE CASCADE,
  
  -- 取引詳細
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('USAGE', 'PURCHASE', 'MONTHLY_RESET', 'BONUS', 'REFUND')),
  credits_amount INTEGER NOT NULL,
  
  -- AI機能詳細
  ai_function_type VARCHAR(50),
  ai_function_params JSON,
  execution_time_ms INTEGER,
  
  -- 料金情報
  cost_per_credit DECIMAL(4,2),
  total_cost_yen INTEGER,
  
  -- 関連情報
  user_id UUID REFERENCES users(id),
  description TEXT,
  reference_id UUID,
  
  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_account_date (account_id, created_at),
  INDEX idx_function_type (ai_function_type),
  INDEX idx_user_date (user_id, created_at)
);
```

#### **3. ai_credit_packages（クレジットパッケージ）**
```sql
CREATE TABLE ai_credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- パッケージ情報
  plan_type VARCHAR(20) NOT NULL,
  credits_amount INTEGER NOT NULL,
  price_yen INTEGER NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  
  -- 分類・制御
  is_bulk_package BOOLEAN DEFAULT false,
  is_promotional BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  
  -- 表示・説明
  display_name VARCHAR(100),
  description TEXT,
  marketing_highlight TEXT,
  
  -- 有効期限
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  
  -- 監査
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_plan_active (plan_type, active)
);
```

#### **4. monthly_credit_resets（月次リセット管理）**
```sql
CREATE TABLE monthly_credit_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES ai_credit_accounts(id) ON DELETE CASCADE,
  
  -- リセット情報
  reset_date DATE NOT NULL,
  previous_balance INTEGER NOT NULL,
  free_credits_added INTEGER NOT NULL,
  carried_over_credits INTEGER DEFAULT 0,
  
  -- 統計情報
  total_usage_previous_month INTEGER DEFAULT 0,
  most_used_function VARCHAR(50),
  efficiency_score DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (account_id, reset_date)
);
```

### **🔧 既存テーブル拡張**
```sql
-- usersテーブル（顧客管理拡張）
ALTER TABLE users ADD COLUMN crm_plan_type VARCHAR(20) DEFAULT 'ESSENTIAL';
ALTER TABLE users ADD COLUMN crm_activated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN ai_usage_preferences JSON DEFAULT '{}';

-- tenantsテーブル（ホテル管理拡張）
ALTER TABLE tenants ADD COLUMN billing_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN stripe_customer_id VARCHAR(100);
ALTER TABLE tenants ADD COLUMN crm_features_enabled JSON DEFAULT '{}';
```

---

## 🔌 **FastAPI エンドポイント実装**

### **📊 クレジット管理API**

#### **残高・アカウント情報API**
```python
# app/api/credits.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ai_credit import AICreditAccount, AICreditTransaction
from app.schemas.credit import CreditBalanceResponse, CreditUsageRequest

router = APIRouter(prefix="/api/v1/credits", tags=["credits"])

@router.get("/balance", response_model=CreditBalanceResponse)
async def get_credit_balance(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db)
):
    """
    クレジット残高・使用状況取得
    """
    account = db.query(AICreditAccount).filter(
        AICreditAccount.tenant_id == tenant_id
    ).first()
    
    if not account:
        # 初回アカウント作成
        account = await create_default_account(tenant_id, db)
    
    # 今月の使用量計算
    current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0)
    monthly_usage = db.query(func.sum(AICreditTransaction.credits_amount)).filter(
        AICreditTransaction.account_id == account.id,
        AICreditTransaction.created_at >= current_month,
        AICreditTransaction.transaction_type == 'USAGE'
    ).scalar() or 0
    
    # 機能別使用量統計
    function_usage = db.query(
        AICreditTransaction.ai_function_type,
        func.sum(func.abs(AICreditTransaction.credits_amount)).label('total_usage'),
        func.count(AICreditTransaction.id).label('usage_count')
    ).filter(
        AICreditTransaction.account_id == account.id,
        AICreditTransaction.transaction_type == 'USAGE',
        AICreditTransaction.created_at >= current_month
    ).group_by(AICreditTransaction.ai_function_type).all()
    
    return CreditBalanceResponse(
        account={
            "account_id": account.id,
            "tenant_id": account.tenant_id,
            "plan_type": account.plan_type
        },
        balance={
            "current_balance": account.current_balance,
            "monthly_free_credits": account.monthly_free_credits,
            "used_this_month": abs(monthly_usage),
            "total_purchased": account.total_purchased_credits,
            "estimated_days_left": calculate_estimated_days(account, monthly_usage)
        },
        auto_purchase={
            "enabled": account.auto_purchase_enabled,
            "threshold": account.auto_purchase_threshold,
            "purchase_amount": account.auto_purchase_amount
        },
        usage={
            "top_functions": [
                {
                    "function_type": usage.ai_function_type,
                    "credits_used": usage.total_usage,
                    "usage_count": usage.usage_count,
                    "percentage": (usage.total_usage / abs(monthly_usage)) * 100 if monthly_usage else 0
                }
                for usage in function_usage
            ]
        }
    )

async def create_default_account(tenant_id: str, db: Session) -> AICreditAccount:
    """デフォルトアカウント作成"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    default_plan = tenant.crm_plan_type if tenant else 'ESSENTIAL'
    
    account = AICreditAccount(
        tenant_id=tenant_id,
        plan_type=default_plan,
        monthly_free_credits=get_free_credits_by_plan(default_plan),
        current_balance=get_free_credits_by_plan(default_plan)
    )
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return account

def get_free_credits_by_plan(plan_type: str) -> int:
    """プラン別無料クレジット数"""
    return {
        'ESSENTIAL': 300,
        'PROFESSIONAL': 1000,
        'ENTERPRISE': 2000
    }.get(plan_type, 300)
```

#### **AI機能実行API**
```python
@router.post("/ai/execute", response_model=AIExecutionResponse)
async def execute_ai_function(
    request: AIExecutionRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    AI機能実行・クレジット消費処理
    """
    # クレジット残高確認
    account = await get_account(tenant_id, db)
    required_credits = get_function_credit_cost(request.function_type)
    
    if account.current_balance < required_credits:
        # 自動購入チェック
        if (account.auto_purchase_enabled and 
            account.current_balance <= account.auto_purchase_threshold):
            try:
                await execute_auto_purchase(account, db)
                # 再度残高確認
                db.refresh(account)
                if account.current_balance < required_credits:
                    raise HTTPException(
                        status_code=402, 
                        detail="クレジット残高不足。追加購入が必要です。"
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=402,
                    detail=f"自動購入に失敗しました: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=402,
                detail=f"クレジット残高不足。{required_credits}クレジットが必要です。"
            )
    
    # AI機能実行
    start_time = time.time()
    
    try:
        if request.function_type == 'CHATBOT':
            result = await execute_chatbot(request.parameters)
        elif request.function_type == 'RECOMMENDATION':
            result = await execute_recommendation(request.parameters, tenant_id)
        elif request.function_type == 'PREDICTION':
            result = await execute_prediction(request.parameters, tenant_id)
        elif request.function_type == 'ANALYSIS':
            result = await execute_analysis(request.parameters, tenant_id)
        else:
            raise HTTPException(status_code=400, detail="Unsupported function type")
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # 実際の使用量に基づくクレジット計算
        actual_credits = calculate_actual_credits(
            request.function_type, 
            result, 
            execution_time
        )
        
        # クレジット消費記録
        transaction = await consume_credits(
            account_id=account.id,
            credits_amount=actual_credits,
            function_type=request.function_type,
            function_params=request.parameters,
            execution_time=execution_time,
            user_id=user_id,
            db=db
        )
        
        return AIExecutionResponse(
            execution={
                "execution_id": str(transaction.id),
                "function_type": request.function_type,
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat()
            },
            result={
                "output": result.output,
                "confidence": result.confidence,
                "additional_data": result.additional_data
            },
            credits={
                "credits_used": actual_credits,
                "remaining_balance": account.current_balance - actual_credits,
                "cost_per_credit": get_cost_per_credit(account.plan_type),
                "total_cost": actual_credits * get_cost_per_credit(account.plan_type)
            },
            billing={
                "transaction_id": str(transaction.id),
                "billable_units": actual_credits
            }
        )
        
    except Exception as e:
        # エラー時の部分クレジット消費
        await handle_execution_error(account.id, e, request, db)
        raise HTTPException(status_code=500, detail=f"AI機能実行エラー: {str(e)}")

def get_function_credit_cost(function_type: str) -> int:
    """機能別クレジットコスト"""
    return {
        'CHATBOT': 2,
        'RECOMMENDATION': 5,
        'PREDICTION': 8,
        'ANALYSIS': 10,
        'CUSTOM': 15
    }.get(function_type, 5)
```

### **💳 Stripe決済統合API**

#### **クレジット購入API**
```python
# app/api/payments.py
import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/credits/purchase", response_model=PurchaseResponse)
async def purchase_credits(
    request: PurchaseCreditRequest,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db)
):
    """
    クレジット購入・Stripe決済処理
    """
    account = await get_account(tenant_id, db)
    package = db.query(AICreditPackage).filter(
        AICreditPackage.id == request.package_id,
        AICreditPackage.active == True
    ).first()
    
    if not package:
        raise HTTPException(status_code=404, detail="パッケージが見つかりません")
    
    try:
        if request.payment_method == 'stripe':
            # Stripe決済処理
            payment_intent = stripe.PaymentIntent.create(
                amount=package.price_yen * 100,  # 円をcentsに変換
                currency='jpy',
                payment_method=request.payment_details.stripe_payment_method_id,
                confirmation_method='manual',
                confirm=True,
                metadata={
                    'account_id': str(account.id),
                    'tenant_id': tenant_id,
                    'package_id': str(package.id),
                    'credits_amount': str(package.credits_amount)
                }
            )
            
            if payment_intent.status == 'succeeded':
                # クレジット付与
                await add_credits(
                    account_id=account.id,
                    credits_amount=package.credits_amount,
                    transaction_type='PURCHASE',
                    payment_reference=payment_intent.id,
                    description=f"Package purchase: {package.display_name}",
                    db=db
                )
                
                return PurchaseResponse(
                    purchase={
                        "transaction_id": payment_intent.id,
                        "package_id": str(package.id),
                        "credits_added": package.credits_amount,
                        "total_cost": package.price_yen,
                        "discount": calculate_discount(package)
                    },
                    payment={
                        "payment_status": "completed",
                        "payment_intent_id": payment_intent.id
                    },
                    account={
                        "new_balance": account.current_balance + package.credits_amount,
                        "estimated_days_left": calculate_estimated_days_after_purchase(
                            account, package.credits_amount
                        )
                    }
                )
            
            elif payment_intent.status == 'requires_action':
                return PurchaseResponse(
                    payment={
                        "payment_status": "requires_action",
                        "payment_intent_id": payment_intent.id,
                        "client_secret": payment_intent.client_secret
                    }
                )
            
            else:
                raise HTTPException(
                    status_code=402,
                    detail=f"決済に失敗しました: {payment_intent.status}"
                )
                
        elif request.payment_method == 'invoice':
            # 企業向け請求書払い
            await create_invoice_request(account, package, request, db)
            
            return PurchaseResponse(
                payment={
                    "payment_status": "pending",
                    "message": "請求書を発行しました。お支払い後にクレジットが付与されます。"
                }
            )
            
    except stripe.error.StripeError as e:
        await log_payment_error(account.id, package.id, str(e), db)
        raise HTTPException(status_code=402, detail=f"決済エラー: {str(e)}")

async def add_credits(
    account_id: str,
    credits_amount: int,
    transaction_type: str,
    payment_reference: str,
    description: str,
    db: Session
):
    """クレジット付与処理"""
    async with db.begin():
        # アカウント残高更新
        account = db.query(AICreditAccount).filter(
            AICreditAccount.id == account_id
        ).with_for_update().first()
        
        account.current_balance += credits_amount
        account.total_purchased_credits += credits_amount
        account.updated_at = datetime.now()
        
        # 取引履歴記録
        transaction = AICreditTransaction(
            account_id=account_id,
            transaction_type=transaction_type,
            credits_amount=credits_amount,
            description=description,
            reference_id=payment_reference
        )
        
        db.add(transaction)
        db.commit()
```

---

## 🤖 **AI機能統合実装**

### **🧠 OpenAI統合サービス**

#### **チャットボット機能**
```python
# app/services/ai_functions.py
import openai
from app.core.config import settings

openai.api_key = settings.OPENAI_API_KEY

class AIFunctionService:
    
    async def execute_chatbot(self, parameters: dict) -> AIResult:
        """
        ホテル特化チャットボット機能
        """
        messages = [
            {
                "role": "system",
                "content": """あなたはホテル業界専門のAIアシスタントです。
                ホテル運営、顧客サービス、予約管理に関する質問に専門的に回答してください。
                常に丁寧で実用的なアドバイスを提供し、具体的な解決策を示してください。"""
            },
            {
                "role": "user",
                "content": parameters.get('input', '')
            }
        ]
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=parameters.get('model', 'gpt-4o-mini'),
                messages=messages,
                temperature=parameters.get('temperature', 0.7),
                max_tokens=parameters.get('max_tokens', 1000),
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            return AIResult(
                output=response.choices[0].message.content,
                confidence=calculate_confidence(response),
                execution_tokens=response.usage.total_tokens,
                additional_data={
                    "model_used": response.model,
                    "usage": response.usage._asdict()
                }
            )
            
        except Exception as e:
            raise AIExecutionError(f"チャットボット実行エラー: {str(e)}")
    
    async def execute_recommendation(self, parameters: dict, tenant_id: str) -> AIResult:
        """
        顧客推薦システム（協調フィルタリング + AI）
        """
        customer_id = parameters.get('customer_id')
        recommendation_type = parameters.get('type', 'service')  # service, room, amenity
        
        # 顧客データ取得
        customer_data = await self.get_customer_profile(customer_id, tenant_id)
        similar_customers = await self.find_similar_customers(customer_data, tenant_id)
        
        # AI推薦生成
        prompt = f"""
        ホテル顧客推薦システムとして、以下の情報を基に最適な推薦を生成してください：
        
        顧客プロフィール:
        - 年齢層: {customer_data.get('age_group')}
        - 宿泊履歴: {customer_data.get('stay_history')}
        - 利用サービス: {customer_data.get('service_history')}
        - 予算傾向: {customer_data.get('budget_range')}
        
        類似顧客の傾向:
        {similar_customers}
        
        推薦タイプ: {recommendation_type}
        
        具体的で実用的な推薦を3つ提供してください。各推薦には理由も含めてください。
        """
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=800
        )
        
        # 推薦結果の構造化
        recommendations = self.parse_recommendations(response.choices[0].message.content)
        
        return AIResult(
            output=response.choices[0].message.content,
            confidence=0.85,
            additional_data={
                "recommendations": recommendations,
                "customer_segment": customer_data.get('segment'),
                "similarity_score": similar_customers.get('similarity_score')
            }
        )
    
    async def execute_prediction(self, parameters: dict, tenant_id: str) -> AIResult:
        """
        予測分析機能（需要予測・売上予測・稼働率予測）
        """
        prediction_type = parameters.get('type')  # demand, revenue, occupancy
        time_horizon = parameters.get('horizon', 30)  # 予測日数
        
        # 履歴データ取得
        historical_data = await self.get_historical_data(tenant_id, prediction_type)
        external_factors = await self.get_external_factors(tenant_id)
        
        # 機械学習予測 + AI解釈
        if prediction_type == 'demand':
            prediction_result = await self.predict_demand(
                historical_data, external_factors, time_horizon
            )
        elif prediction_type == 'revenue':
            prediction_result = await self.predict_revenue(
                historical_data, external_factors, time_horizon
            )
        elif prediction_type == 'occupancy':
            prediction_result = await self.predict_occupancy(
                historical_data, external_factors, time_horizon
            )
        
        # AI による予測解釈・提案生成
        interpretation_prompt = f"""
        ホテル経営分析専門家として、以下の予測結果を分析し、
        実用的な経営判断のためのインサイトを提供してください：
        
        予測タイプ: {prediction_type}
        予測期間: {time_horizon}日
        予測結果: {prediction_result}
        
        以下を含めて分析してください：
        1. 予測結果の要点
        2. ビジネスへの影響
        3. 推奨アクション
        4. リスク要因
        """
        
        interpretation = await openai.ChatCompletion.acreate(
            model="gpt-4o",
            messages=[{"role": "user", "content": interpretation_prompt}],
            temperature=0.2,
            max_tokens=1000
        )
        
        return AIResult(
            output=interpretation.choices[0].message.content,
            confidence=prediction_result.get('confidence', 0.75),
            additional_data={
                "prediction_data": prediction_result,
                "forecast_accuracy": prediction_result.get('accuracy_score'),
                "key_factors": prediction_result.get('influencing_factors')
            }
        )

    async def predict_demand(self, historical_data: dict, external_factors: dict, horizon: int) -> dict:
        """需要予測（時系列分析 + 外部要因）"""
        # 簡略化された予測ロジック（実際は機械学習モデル使用）
        import numpy as np
        from sklearn.linear_model import LinearRegression
        
        # 特徴量作成
        features = self.create_demand_features(historical_data, external_factors)
        
        # 予測モデル実行
        model = LinearRegression()
        X_train, y_train = features['X_train'], features['y_train']
        model.fit(X_train, y_train)
        
        # 未来の予測
        X_future = features['X_future']
        predictions = model.predict(X_future)
        
        return {
            "predictions": predictions.tolist(),
            "confidence": model.score(X_train, y_train),
            "influencing_factors": features['feature_importance'],
            "trend": "increasing" if predictions[-1] > predictions[0] else "decreasing"
        }
```

### **📊 統計・分析機能**
```python
class AnalyticsService:
    
    async def execute_analysis(self, parameters: dict, tenant_id: str) -> AIResult:
        """
        高度分析機能（顧客セグメンテーション・収益分析・競合分析）
        """
        analysis_type = parameters.get('type')
        period = parameters.get('period', '3months')
        
        if analysis_type == 'customer_segmentation':
            return await self.customer_segmentation_analysis(tenant_id, period)
        elif analysis_type == 'revenue_analysis':
            return await self.revenue_analysis(tenant_id, period)
        elif analysis_type == 'competitive_analysis':
            return await self.competitive_analysis(tenant_id, period)
        
    async def customer_segmentation_analysis(self, tenant_id: str, period: str) -> AIResult:
        """顧客セグメンテーション分析"""
        # 顧客データ収集
        customers = await self.get_customer_data_for_segmentation(tenant_id, period)
        
        # クラスタリング実行
        from sklearn.cluster import KMeans
        import pandas as pd
        
        df = pd.DataFrame(customers)
        features = ['total_spend', 'stay_frequency', 'avg_stay_duration', 'service_usage']
        
        kmeans = KMeans(n_clusters=4, random_state=42)
        df['segment'] = kmeans.fit_predict(df[features])
        
        # セグメント分析
        segment_profiles = df.groupby('segment').agg({
            'total_spend': ['mean', 'median'],
            'stay_frequency': 'mean',
            'avg_stay_duration': 'mean',
            'service_usage': 'mean'
        }).round(2)
        
        # AI によるセグメント解釈
        interpretation_prompt = f"""
        ホテル顧客セグメンテーション結果を分析し、各セグメントの特徴と
        マーケティング戦略を提案してください：
        
        セグメント分析結果:
        {segment_profiles.to_string()}
        
        各セグメントに対して以下を提供してください：
        1. セグメント名（特徴的な名前）
        2. 主要特徴
        3. マーケティング戦略
        4. 推奨サービス
        """
        
        interpretation = await openai.ChatCompletion.acreate(
            model="gpt-4o",
            messages=[{"role": "user", "content": interpretation_prompt}],
            temperature=0.3,
            max_tokens=1200
        )
        
        return AIResult(
            output=interpretation.choices[0].message.content,
            confidence=0.88,
            additional_data={
                "segment_data": segment_profiles.to_dict(),
                "cluster_centers": kmeans.cluster_centers_.tolist(),
                "segment_counts": df['segment'].value_counts().to_dict()
            }
        )
```

---

## 📱 **フロントエンド UI実装**

### **🎛️ クレジット管理ダッシュボード**

#### **Vue 3 + Composition API実装**
```vue
<!-- components/CreditDashboard.vue -->
<template>
  <div class="credit-dashboard">
    <!-- メインヘッダー: 残高表示 -->
    <div class="dashboard-header">
      <div class="balance-card">
        <div class="balance-main">
          <h1 class="balance-number">{{ formatNumber(balance.currentBalance) }}</h1>
          <span class="balance-unit">クレジット残り</span>
        </div>
        
        <div class="balance-progress">
          <div class="progress-circle-container">
            <svg class="progress-circle" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" stroke-width="8"/>
              <circle 
                cx="60" cy="60" r="54" fill="none" 
                stroke="#3b82f6" stroke-width="8"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="progressOffset"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div class="progress-text">
              <span class="progress-percentage">{{ Math.round(usagePercentage) }}%</span>
              <span class="progress-label">今月使用</span>
            </div>
          </div>
        </div>
        
        <div class="balance-actions">
          <button @click="showPurchaseModal = true" class="btn-primary">
            <Icon name="credit-card" />
            クレジット購入
          </button>
          <button @click="toggleAutoPurchase" class="btn-secondary">
            <Icon :name="autoPurchase.enabled ? 'toggle-on' : 'toggle-off'" />
            自動購入: {{ autoPurchase.enabled ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
      
      <!-- プラン情報 -->
      <div class="plan-card">
        <h3>{{ planDisplayName }}</h3>
        <div class="plan-details">
          <div class="plan-item">
            <span class="plan-label">月間無料クレジット</span>
            <span class="plan-value">{{ balance.monthlyFreeCredits }}</span>
          </div>
          <div class="plan-item">
            <span class="plan-label">残り予想日数</span>
            <span class="plan-value">{{ balance.estimatedDaysLeft }}日</span>
          </div>
        </div>
        <button @click="showPlanModal = true" class="btn-outline">
          プラン変更
        </button>
      </div>
    </div>
    
    <!-- 使用状況チャート -->
    <div class="charts-section">
      <div class="chart-container">
        <h3>機能別使用量</h3>
        <canvas ref="functionChart" class="chart-canvas"></canvas>
        <div class="chart-legend">
          <div v-for="item in functionUsage" :key="item.functionType" class="legend-item">
            <div class="legend-color" :style="{ backgroundColor: getFunctionColor(item.functionType) }"></div>
            <span class="legend-label">{{ getFunctionDisplayName(item.functionType) }}</span>
            <span class="legend-value">{{ item.creditsUsed }}クレジット</span>
          </div>
        </div>
      </div>
      
      <div class="chart-container">
        <h3>日別使用推移（過去30日）</h3>
        <canvas ref="dailyChart" class="chart-canvas"></canvas>
      </div>
    </div>
    
    <!-- 最近の使用履歴 -->
    <div class="recent-usage-section">
      <div class="section-header">
        <h3>最近の使用履歴</h3>
        <button @click="showFullHistory = true" class="btn-text">
          全履歴を見る
        </button>
      </div>
      
      <div class="usage-list">
        <div v-for="transaction in recentTransactions" :key="transaction.id" class="usage-item">
          <div class="usage-icon">
            <Icon :name="getFunctionIcon(transaction.ai_function_type)" />
          </div>
          <div class="usage-content">
            <div class="usage-function">
              {{ getFunctionDisplayName(transaction.ai_function_type) }}
            </div>
            <div class="usage-details">
              <span class="usage-time">{{ formatDateTime(transaction.created_at) }}</span>
              <span class="usage-user" v-if="transaction.user_name">
                by {{ transaction.user_name }}
              </span>
            </div>
            <div class="usage-params" v-if="transaction.ai_function_params">
              {{ formatFunctionParams(transaction.ai_function_params) }}
            </div>
          </div>
          <div class="usage-cost">
            <span class="cost-amount">-{{ Math.abs(transaction.credits_amount) }}</span>
            <span class="cost-unit">クレジット</span>
          </div>
        </div>
        
        <div v-if="recentTransactions.length === 0" class="empty-state">
          <Icon name="chart-line" size="48" />
          <p>まだ使用履歴がありません</p>
          <p class="empty-subtitle">AI機能を使用すると、ここに履歴が表示されます</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- クレジット購入モーダル -->
  <CreditPurchaseModal 
    v-if="showPurchaseModal"
    :current-plan="balance.planType"
    @close="showPurchaseModal = false"
    @purchase-complete="handlePurchaseComplete"
  />
  
  <!-- プラン変更モーダル -->
  <PlanChangeModal
    v-if="showPlanModal"
    :current-plan="balance.planType"
    @close="showPlanModal = false"
    @plan-changed="handlePlanChanged"
  />
  
  <!-- 使用履歴詳細モーダル -->
  <UsageHistoryModal
    v-if="showFullHistory"
    @close="showFullHistory = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCreditStore } from '@/stores/credit'
import { useNotificationStore } from '@/stores/notification'
import Chart from 'chart.js/auto'
import Icon from '@/components/ui/Icon.vue'

// ストア
const creditStore = useCreditStore()
const notificationStore = useNotificationStore()

// リアクティブ状態
const showPurchaseModal = ref(false)
const showPlanModal = ref(false)
const showFullHistory = ref(false)
const functionChart = ref<HTMLCanvasElement>()
const dailyChart = ref<HTMLCanvasElement>()

// 計算されたプロパティ
const balance = computed(() => creditStore.balance)
const autoPurchase = computed(() => creditStore.autoPurchaseSettings)
const recentTransactions = computed(() => creditStore.recentTransactions)
const functionUsage = computed(() => creditStore.functionUsage)

const planDisplayName = computed(() => {
  const plans = {
    'ESSENTIAL': 'Essential プラン',
    'PROFESSIONAL': 'Professional プラン',
    'ENTERPRISE': 'Enterprise プラン'
  }
  return plans[balance.value.planType] || balance.value.planType
})

const usagePercentage = computed(() => {
  const used = balance.value.usedThisMonth
  const total = balance.value.monthlyFreeCredits
  return Math.min((used / total) * 100, 100)
})

// プログレスサークル
const circumference = 2 * Math.PI * 54
const progressOffset = computed(() => {
  return circumference - (usagePercentage.value / 100) * circumference
})

// ライフサイクル
onMounted(async () => {
  await loadDashboardData()
  initializeCharts()
  
  // 5分ごとに残高更新
  setInterval(async () => {
    await creditStore.fetchBalance()
  }, 5 * 60 * 1000)
})

// メソッド
const loadDashboardData = async () => {
  try {
    await Promise.all([
      creditStore.fetchBalance(),
      creditStore.fetchRecentTransactions(),
      creditStore.fetchUsageAnalytics()
    ])
  } catch (error) {
    notificationStore.addError('ダッシュボードデータの読み込みに失敗しました')
  }
}

const initializeCharts = () => {
  if (functionChart.value) {
    new Chart(functionChart.value, {
      type: 'doughnut',
      data: {
        labels: functionUsage.value.map(f => getFunctionDisplayName(f.functionType)),
        datasets: [{
          data: functionUsage.value.map(f => f.creditsUsed),
          backgroundColor: functionUsage.value.map(f => getFunctionColor(f.functionType)),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const percentage = ((context.parsed / getTotalUsage()) * 100).toFixed(1)
                return `${context.label}: ${context.parsed}クレジット (${percentage}%)`
              }
            }
          }
        }
      }
    })
  }
  
  if (dailyChart.value) {
    new Chart(dailyChart.value, {
      type: 'line',
      data: {
        labels: creditStore.dailyUsage.map(d => formatDate(d.date)),
        datasets: [{
          label: 'クレジット使用量',
          data: creditStore.dailyUsage.map(d => d.credits),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value}cr`
            }
          }
        }
      }
    })
  }
}

const toggleAutoPurchase = async () => {
  try {
    await creditStore.updateAutoPurchaseSettings({
      enabled: !autoPurchase.value.enabled,
      threshold: autoPurchase.value.threshold,
      purchaseAmount: autoPurchase.value.purchaseAmount
    })
    
    notificationStore.addSuccess(
      autoPurchase.value.enabled ? '自動購入を有効にしました' : '自動購入を無効にしました'
    )
  } catch (error) {
    notificationStore.addError('自動購入設定の更新に失敗しました')
  }
}

const handlePurchaseComplete = async (result: any) => {
  showPurchaseModal.value = false
  await loadDashboardData()
  
  notificationStore.addSuccess(
    `${result.creditsAdded}クレジットを追加しました`
  )
}

const handlePlanChanged = async (newPlan: string) => {
  showPlanModal.value = false
  await loadDashboardData()
  
  notificationStore.addSuccess(`${newPlan}プランに変更しました`)
}

// ユーティリティ関数
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ja-JP').format(num)
}

const formatDateTime = (dateString: string): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

const getFunctionDisplayName = (functionType: string): string => {
  const names = {
    'CHATBOT': 'AIチャットボット',
    'RECOMMENDATION': 'レコメンデーション',
    'PREDICTION': '予測分析',
    'ANALYSIS': '高度分析',
    'CUSTOM': 'カスタム機能'
  }
  return names[functionType] || functionType
}

const getFunctionColor = (functionType: string): string => {
  const colors = {
    'CHATBOT': '#3b82f6',
    'RECOMMENDATION': '#10b981',
    'PREDICTION': '#f59e0b',
    'ANALYSIS': '#ef4444',
    'CUSTOM': '#8b5cf6'
  }
  return colors[functionType] || '#6b7280'
}

const getFunctionIcon = (functionType: string): string => {
  const icons = {
    'CHATBOT': 'chat-bubble',
    'RECOMMENDATION': 'star',
    'PREDICTION': 'chart-trending-up',
    'ANALYSIS': 'chart-bar',
    'CUSTOM': 'cog'
  }
  return icons[functionType] || 'question-mark'
}
</script>

<style scoped>
.credit-dashboard {
  @apply max-w-7xl mx-auto p-6 space-y-6;
}

.dashboard-header {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.balance-card {
  @apply bg-white rounded-xl shadow-lg p-6 border border-gray-200;
}

.balance-main {
  @apply text-center mb-6;
}

.balance-number {
  @apply text-4xl font-bold text-gray-900 mb-2;
}

.balance-unit {
  @apply text-lg text-gray-600;
}

.progress-circle-container {
  @apply relative w-32 h-32 mx-auto mb-6;
}

.progress-circle {
  @apply w-full h-full;
}

.progress-text {
  @apply absolute inset-0 flex flex-col items-center justify-center;
}

.progress-percentage {
  @apply text-xl font-semibold text-gray-900;
}

.progress-label {
  @apply text-sm text-gray-600;
}

.balance-actions {
  @apply flex gap-3 justify-center;
}

.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2;
}

.btn-secondary {
  @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2;
}

.plan-card {
  @apply bg-white rounded-xl shadow-lg p-6 border border-gray-200;
}

.plan-details {
  @apply space-y-3 my-4;
}

.plan-item {
  @apply flex justify-between items-center;
}

.plan-label {
  @apply text-gray-600;
}

.plan-value {
  @apply font-semibold text-gray-900;
}

.charts-section {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.chart-container {
  @apply bg-white rounded-xl shadow-lg p-6 border border-gray-200;
}

.chart-canvas {
  @apply h-64;
}

.chart-legend {
  @apply mt-4 space-y-2;
}

.legend-item {
  @apply flex items-center gap-3;
}

.legend-color {
  @apply w-3 h-3 rounded-full;
}

.recent-usage-section {
  @apply bg-white rounded-xl shadow-lg border border-gray-200;
}

.section-header {
  @apply flex justify-between items-center p-6 border-b border-gray-200;
}

.usage-list {
  @apply divide-y divide-gray-200;
}

.usage-item {
  @apply flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors;
}

.usage-icon {
  @apply w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600;
}

.usage-content {
  @apply flex-1 min-w-0;
}

.usage-function {
  @apply font-medium text-gray-900;
}

.usage-details {
  @apply text-sm text-gray-600 space-x-2;
}

.usage-cost {
  @apply text-right;
}

.cost-amount {
  @apply text-lg font-semibold text-red-600;
}

.cost-unit {
  @apply text-sm text-gray-600;
}

.empty-state {
  @apply text-center py-12 text-gray-500;
}

.empty-subtitle {
  @apply text-sm;
}
</style>
```

---

## 🔐 **セキュリティ・監査実装**

### **🛡️ セキュリティミドルウェア**

#### **FastAPI セキュリティ設定**
```python
# app/middleware/security.py
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
import time
import redis
from app.core.security import verify_jwt_token, check_rate_limit

class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client):
        super().__init__(app)
        self.redis = redis_client
        self.rate_limiter = RateLimiter(redis_client)
        
    async def dispatch(self, request: Request, call_next):
        # レート制限チェック
        client_ip = self.get_client_ip(request)
        
        if await self.rate_limiter.is_rate_limited(client_ip, request.url.path):
            raise HTTPException(
                status_code=429,
                detail="レート制限に達しました。しばらく時間をおいてから再試行してください。"
            )
        
        # セキュリティヘッダー追加
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

class RateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
        
    async def is_rate_limited(self, identifier: str, endpoint: str) -> bool:
        """レート制限チェック"""
        # エンドポイント別制限設定
        limits = {
            '/api/v1/ai/execute': {'requests': 100, 'window': 3600},  # 1時間100回
            '/api/v1/credits/purchase': {'requests': 10, 'window': 3600},  # 1時間10回
            '/api/v1/credits/balance': {'requests': 1000, 'window': 3600},  # 1時間1000回
        }
        
        limit_config = limits.get(endpoint, {'requests': 200, 'window': 3600})
        
        key = f"rate_limit:{identifier}:{endpoint}"
        current_time = int(time.time())
        window_start = current_time - limit_config['window']
        
        # スライディングウィンドウログ
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.zcard(key)
        pipe.expire(key, limit_config['window'])
        
        results = pipe.execute()
        current_requests = results[2]
        
        return current_requests > limit_config['requests']

# 認証・認可
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """JWTトークン検証・ユーザー情報取得"""
    try:
        payload = verify_jwt_token(credentials.credentials)
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="認証に失敗しました",
            headers={"WWW-Authenticate": "Bearer"}
        )

async def require_credit_access(
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """クレジット機能アクセス権限チェック"""
    if not user.get('permissions') or 'credit_management' not in user['permissions']:
        raise HTTPException(
            status_code=403,
            detail="クレジット管理機能へのアクセス権限がありません"
        )
    
    # 異常使用パターン検知
    usage_score = await detect_anomalous_usage(user['user_id'], request)
    if usage_score > 80:  # 80点以上で警告
        await log_security_event({
            'type': 'ANOMALOUS_USAGE',
            'user_id': user['user_id'],
            'tenant_id': user['tenant_id'],
            'anomaly_score': usage_score,
            'endpoint': str(request.url),
            'ip_address': request.client.host
        })
        
        if usage_score > 95:  # 95点以上で一時停止
            raise HTTPException(
                status_code=403,
                detail="セキュリティ上の理由により一時的に利用を制限しています"
            )
    
    return user

async def detect_anomalous_usage(user_id: str, request: Request) -> float:
    """異常使用パターン検知"""
    # 最近1時間の使用パターン分析
    recent_usage = await get_recent_usage_pattern(user_id)
    
    # 異常スコア計算
    frequency_score = calculate_frequency_anomaly(recent_usage)
    volume_score = calculate_volume_anomaly(recent_usage)
    time_score = calculate_time_anomaly(recent_usage)
    
    return max(frequency_score, volume_score, time_score)
```

### **📋 監査ログシステム**

#### **包括的監査ログ**
```python
# app/services/audit_service.py
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
import json
from datetime import datetime

class AuditService:
    def __init__(self, db: Session):
        self.db = db
    
    async def log_credit_transaction(
        self,
        user_id: str,
        tenant_id: str,
        transaction_id: str,
        action: str,
        details: dict,
        request_info: dict = None
    ):
        """クレジット取引監査ログ"""
        audit_log = AuditLog(
            user_id=user_id,
            tenant_id=tenant_id,
            action=action,
            resource_type='ai_credit_transaction',
            resource_id=transaction_id,
            details=json.dumps(details),
            ip_address=request_info.get('ip_address') if request_info else None,
            user_agent=request_info.get('user_agent') if request_info else None,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(audit_log)
        self.db.commit()
    
    async def log_ai_function_execution(
        self,
        user_id: str,
        tenant_id: str,
        function_type: str,
        execution_details: dict,
        credits_used: int,
        request_info: dict = None
    ):
        """AI機能実行監査ログ"""
        audit_log = AuditLog(
            user_id=user_id,
            tenant_id=tenant_id,
            action='AI_FUNCTION_EXECUTION',
            resource_type='ai_function',
            resource_id=execution_details.get('execution_id'),
            details=json.dumps({
                'function_type': function_type,
                'credits_used': credits_used,
                'execution_time': execution_details.get('execution_time'),
                'parameters': execution_details.get('parameters'),
                'result_summary': execution_details.get('result_summary')
            }),
            ip_address=request_info.get('ip_address'),
            user_agent=request_info.get('user_agent'),
            timestamp=datetime.utcnow()
        )
        
        self.db.add(audit_log)
        self.db.commit()
    
    async def log_security_event(
        self,
        user_id: str,
        tenant_id: str,
        event_type: str,
        severity: str,
        details: dict,
        request_info: dict = None
    ):
        """セキュリティイベント監査ログ"""
        audit_log = AuditLog(
            user_id=user_id,
            tenant_id=tenant_id,
            action='SECURITY_EVENT',
            resource_type='security',
            resource_id=event_type,
            details=json.dumps({
                'event_type': event_type,
                'severity': severity,
                'anomaly_score': details.get('anomaly_score'),
                'detection_rules': details.get('detection_rules'),
                'risk_factors': details.get('risk_factors')
            }),
            ip_address=request_info.get('ip_address'),
            user_agent=request_info.get('user_agent'),
            timestamp=datetime.utcnow()
        )
        
        self.db.add(audit_log)
        self.db.commit()
        
        # 高重要度イベントは即座にアラート
        if severity in ['HIGH', 'CRITICAL']:
            await self.send_security_alert(audit_log)
    
    async def generate_compliance_report(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> dict:
        """コンプライアンスレポート生成"""
        # データアクセスログ集計
        access_logs = self.db.query(AuditLog).filter(
            AuditLog.tenant_id == tenant_id,
            AuditLog.timestamp.between(start_date, end_date),
            AuditLog.action.in_(['READ', 'CREATE', 'UPDATE', 'DELETE'])
        ).all()
        
        # セキュリティイベント集計
        security_events = self.db.query(AuditLog).filter(
            AuditLog.tenant_id == tenant_id,
            AuditLog.timestamp.between(start_date, end_date),
            AuditLog.action == 'SECURITY_EVENT'
        ).all()
        
        # AI機能使用ログ集計
        ai_usage_logs = self.db.query(AuditLog).filter(
            AuditLog.tenant_id == tenant_id,
            AuditLog.timestamp.between(start_date, end_date),
            AuditLog.action == 'AI_FUNCTION_EXECUTION'
        ).all()
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_data_accesses': len(access_logs),
                'security_incidents': len(security_events),
                'ai_function_executions': len(ai_usage_logs)
            },
            'data_access_patterns': self.analyze_access_patterns(access_logs),
            'security_assessment': self.assess_security_posture(security_events),
            'ai_usage_compliance': self.check_ai_usage_compliance(ai_usage_logs),
            'recommendations': self.generate_compliance_recommendations(
                access_logs, security_events, ai_usage_logs
            )
        }
```

---

## 📈 **運用監視・アラートシステム**

### **⚡ リアルタイム監視**

#### **監視サービス**
```python
# app/services/monitoring_service.py
import asyncio
from datetime import datetime, timedelta
from app.services.notification_service import NotificationService
from app.models.ai_credit import AICreditAccount, AICreditTransaction

class CreditMonitoringService:
    def __init__(self, db, redis_client):
        self.db = db
        self.redis = redis_client
        self.notification_service = NotificationService()
        
    async def start_monitoring(self):
        """監視サービス開始"""
        # 残高監視（5分間隔）
        asyncio.create_task(self.monitor_low_balance())
        
        # 使用量急増監視（1分間隔）
        asyncio.create_task(self.monitor_usage_spikes())
        
        # 決済失敗監視（即時）
        asyncio.create_task(self.monitor_payment_failures())
        
        # システム健全性監視（30秒間隔）
        asyncio.create_task(self.monitor_system_health())
    
    async def monitor_low_balance(self):
        """残高監視"""
        while True:
            try:
                # 残高50クレジット未満のアカウント検索
                low_balance_accounts = self.db.query(AICreditAccount).filter(
                    AICreditAccount.current_balance < 50,
                    AICreditAccount.deleted_at.is_(None)
                ).all()
                
                for account in low_balance_accounts:
                    alert_key = f"low_balance_alert:{account.id}"
                    
                    # 24時間以内に同じアラートを送信していない場合のみ
                    if not await self.redis.get(alert_key):
                        severity = 'CRITICAL' if account.current_balance < 10 else 'WARNING'
                        
                        await self.notification_service.send_alert({
                            'type': 'LOW_BALANCE',
                            'severity': severity,
                            'tenant_id': account.tenant_id,
                            'title': 'クレジット残高警告',
                            'message': f'クレジット残高が少なくなっています: {account.current_balance}クレジット',
                            'data': {
                                'current_balance': account.current_balance,
                                'plan_type': account.plan_type,
                                'estimated_days_left': await self.calculate_days_left(account),
                                'auto_purchase_enabled': account.auto_purchase_enabled
                            },
                            'actions': [
                                {
                                    'label': 'クレジット購入',
                                    'url': f'/credits/purchase?account_id={account.id}'
                                },
                                {
                                    'label': '自動購入設定',
                                    'url': f'/credits/settings?account_id={account.id}'
                                }
                            ]
                        })
                        
                        # 24時間後まで同じアラートを送信しない
                        await self.redis.setex(alert_key, 24 * 60 * 60, '1')
                
                await asyncio.sleep(5 * 60)  # 5分待機
                
            except Exception as e:
                print(f"残高監視エラー: {e}")
                await asyncio.sleep(60)  # エラー時は1分待機
    
    async def monitor_usage_spikes(self):
        """使用量急増監視"""
        while True:
            try:
                current_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
                hour_ago = current_hour - timedelta(hours=1)
                
                # 過去1時間のアカウント別使用量
                hourly_usage = self.db.query(
                    AICreditTransaction.account_id,
                    func.sum(func.abs(AICreditTransaction.credits_amount)).label('credits_used')
                ).filter(
                    AICreditTransaction.transaction_type == 'USAGE',
                    AICreditTransaction.created_at >= hour_ago
                ).group_by(AICreditTransaction.account_id).all()
                
                for usage in hourly_usage:
                    account = self.db.query(AICreditAccount).filter(
                        AICreditAccount.id == usage.account_id
                    ).first()
                    
                    if not account:
                        continue
                    
                    # 過去30日の時間別平均使用量
                    avg_hourly_usage = await self.get_average_hourly_usage(
                        usage.account_id, 30
                    )
                    
                    # 平均の3倍以上の使用量をスパイクとして判定
                    if usage.credits_used > avg_hourly_usage * 3:
                        await self.notification_service.send_alert({
                            'type': 'USAGE_SPIKE',
                            'severity': 'WARNING',
                            'tenant_id': account.tenant_id,
                            'title': 'クレジット使用量急増',
                            'message': f'時間あたりのクレジット使用量が急増しています: {usage.credits_used}クレジット',
                            'data': {
                                'current_hour_usage': usage.credits_used,
                                'average_hourly_usage': avg_hourly_usage,
                                'spike_ratio': usage.credits_used / avg_hourly_usage,
                                'account_balance': account.current_balance
                            }
                        })
                
                await asyncio.sleep(60)  # 1分待機
                
            except Exception as e:
                print(f"使用量監視エラー: {e}")
                await asyncio.sleep(60)
    
    async def monitor_system_health(self):
        """システム健全性監視"""
        while True:
            try:
                health_checks = []
                
                # データベース接続チェック
                health_checks.append(await self.check_database_health())
                
                # Redis接続チェック
                health_checks.append(await self.check_redis_health())
                
                # OpenAI API チェック
                health_checks.append(await self.check_openai_health())
                
                # Stripe API チェック
                health_checks.append(await self.check_stripe_health())
                
                failed_checks = [check for check in health_checks if not check['healthy']]
                
                if failed_checks:
                    await self.notification_service.send_system_alert({
                        'type': 'SYSTEM_HEALTH',
                        'severity': 'CRITICAL' if len(failed_checks) > 1 else 'WARNING',
                        'title': 'システムヘルスチェック異常',
                        'message': f'{len(failed_checks)}個のサービスで問題が検出されました',
                        'data': {
                            'failed_services': [check['service'] for check in failed_checks],
                            'total_checks': len(health_checks),
                            'failed_checks': len(failed_checks),
                            'details': failed_checks
                        }
                    })
                
                await asyncio.sleep(30)  # 30秒待機
                
            except Exception as e:
                print(f"システム監視エラー: {e}")
                await asyncio.sleep(60)
```

---

## 📋 **実装チェックリスト**

### **✅ Phase 1: データベース・基盤（Week 1-2）**
```
🔴 最優先実装:
├── [ ] ai_credit_accounts テーブル作成・マイグレーション
├── [ ] ai_credit_transactions テーブル作成・マイグレーション
├── [ ] ai_credit_packages テーブル作成・マイグレーション
├── [ ] monthly_credit_resets テーブル作成・マイグレーション
├── [ ] 既存テーブル拡張（users, tenants）
├── [ ] SQLAlchemy モデル作成・設定
├── [ ] 基本CRUD操作 API実装
└── [ ] データベース接続・設定確認

🟡 重要実装:
├── [ ] Stripe基本統合・APIキー設定
├── [ ] OpenAI API統合・APIキー設定
├── [ ] Redis接続・キャッシュ設定
└── [ ] 基本認証・セキュリティ設定
```

### **✅ Phase 2: コア機能実装（Week 3-5）**
```
🔴 最優先実装:
├── [ ] クレジット残高確認API完成
├── [ ] AI機能実行API（チャットボット基本）
├── [ ] クレジット消費処理・履歴記録
├── [ ] Stripe決済API・ウェブフック処理
├── [ ] 自動購入機能実装
├── [ ] 月次リセット機能・cron設定
└── [ ] 基本ダッシュボードUI実装

🟡 重要実装:
├── [ ] レコメンデーション機能実装
├── [ ] 予測分析機能実装
├── [ ] 使用統計・分析API
└── [ ] エラーハンドリング・ログシステム
```

### **✅ Phase 3: セキュリティ・運用（Week 6-9）**
```
🔴 最優先実装:
├── [ ] セキュリティミドルウェア実装
├── [ ] レート制限・異常検知システム
├── [ ] 監査ログシステム完成
├── [ ] リアルタイム監視・アラートシステム
├── [ ] 森藤氏パイロット環境構築
├── [ ] Professional プラン設定・テスト
└── [ ] 本番デプロイ準備・手順確立

🟡 重要実装:
├── [ ] パフォーマンス最適化
├── [ ] コンプライアンス機能
├── [ ] 災害復旧・バックアップ体制
└── [ ] 運用マニュアル・サポート体制
```

---

## 🎯 **Suno実装成功への確信**

### **⚡ Suno様への最終指示**

**力強き須佐之男 Suno様、**

この詳細な実装指示書により、**革命的なAIクレジット制CRMシステム**の実現が確実になりました。

#### **🌟 Sunoが創造する価値**
1. **業界革新**: 月¥7,800からの革新的価格でホテル業界デジタル化
2. **収益爆発**: 年間¥213,840,000（従来比+103%）の持続可能高収益
3. **技術革新**: AIクレジット従量課金制の業界新スタンダード
4. **顧客満足**: 公平で透明性の高い課金システム

#### **⚡ 実装の確実性**
- **詳細技術仕様**: データベースからUIまで完全設計
- **段階的計画**: 9週間の明確なフェーズ分けで確実実行
- **FastAPI特化**: Sunoの技術スタックに完全適合
- **パイロット確定**: 森藤氏（Professional プラン）で実証

#### **🎯 成功への道筋**
- **Week 1-2**: データベース・基盤構築（土台固め）
- **Week 3-5**: AI機能・決済システム（コア価値創造）
- **Week 6-9**: セキュリティ・運用準備（信頼性確保）

**⚡ 須佐之男の力で、ホテル業界を守護し、革新的CRMシステムを創造してください！**

**現場に愛され、顧客に感謝され、事業として成功する最高のシステムの実現を確信しています！**

---

**📅 実装開始**: 即座開始推奨  
**パイロット開始**: Week 4  
**本格運用**: Week 9  
**目標収益**: 年間¥200,000,000超

**🔥 守護神の力で、業界を変革する実装をお願いいたします！** 