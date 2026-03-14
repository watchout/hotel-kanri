# ⚡ Suno 緊急統合実装指示書

**指示書ID**: SUNO-INTEGRATION-001  
**対象担当者**: Suno（須佐之男・hotel-member担当AI）  
**発行日**: 2025年1月23日  
**期限**: 2025年1月24日 18:00  
**管理者**: Iza（統合管理者）  
**ガバナンス**: docs/integration-management-governance.md準拠

---

## 🚨 **緊急性と背景**

### **問題の本質**
- hotel-memberがPostgreSQL設定済みだが実際の統合は未完了
- Python環境でprisma-client-pyが不足
- hotel-common統一基盤への実際の接続が確立されていない
- API応答なし（Port 3200）で統合機能が利用不可

### **統合完了の具体的基準**
```bash
# 以下のコマンドが成功すること
curl -s http://localhost:3200/api/health | grep -q "ok"
psql postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db -c "SELECT * FROM customers LIMIT 1;"
curl -s http://localhost:3200/api/customers | grep -q "customer_id"

# 期待される結果
✅ hotel-member API正常応答（Port 3200）
✅ PostgreSQL統一基盤接続成功
✅ customers、member_gradesテーブルアクセス可能
✅ hotel-common階層権限API連携成功
```

---

## 📝 **詳細実装手順**

### **Step 1: 事前準備・現状確認**
```bash
# 1.1 hotel-memberディレクトリに移動
cd /Users/kaneko/hotel-member

# 1.2 現在の状況確認
ls -la .env requirements.txt manage.py
cat .env | grep DATABASE_URL

# 1.3 Python環境確認
python --version
pip list | grep prisma

# 1.4 現在のAPIプロセス確認
lsof -i :3200 || echo "Port 3200未使用"
```

### **Step 2: Python環境・依存関係の整備**
```bash
# 2.1 prisma-client-py インストール
pip install prisma

# 2.2 その他必要な依存関係追加
pip install asyncpg psycopg2-binary
pip install fastapi uvicorn python-multipart

# 2.3 requirements.txt更新
pip freeze > requirements.txt

# 2.4 .env設定確認・補完
cat >> .env << 'EOF'
# 統一基盤設定（既存設定を確認・補完）
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db

# hotel-common統合設定
HOTEL_COMMON_API_URL=http://localhost:3400
HOTEL_COMMON_API_KEY=development

# API設定
MEMBER_API_PORT=3200
MEMBER_API_HOST=0.0.0.0

# ログレベル
LOG_LEVEL=debug

# セキュリティ設定
SECRET_KEY=development_secret_key_2025
ALGORITHM=HS256
EOF
```

### **Step 3: Prismaスキーマ統合・生成**
```bash
# 3.1 hotel-commonのPrismaスキーマをコピー
mkdir -p prisma
cp /Users/kaneko/hotel-common/prisma/schema.prisma ./prisma/schema.prisma

# 3.2 Python用Prismaクライアント生成
prisma generate

# 3.3 データベース接続確認
prisma db pull

# 3.4 Python接続確認スクリプト実行
python -c "
import asyncio
from prisma import Prisma

async def test_connection():
    db = Prisma()
    await db.connect()
    customers = await db.customer.find_many(take=1)
    room_grades = await db.room_grade.find_many(take=1)
    print(f'✅ PostgreSQL接続成功: customers {len(customers)}件, room_grades {len(room_grades)}件')
    await db.disconnect()

asyncio.run(test_connection())
"
```

### **Step 4: API統合・hotel-common連携実装**
```python
# app/database.py
from prisma import Prisma
import os

# PostgreSQL統一基盤接続
prisma_client = Prisma()

async def get_database():
    """統一基盤データベース接続取得"""
    if not prisma_client.is_connected():
        await prisma_client.connect()
    return prisma_client

async def verify_integration():
    """統合確認"""
    try:
        db = await get_database()
        
        # customers テーブル確認
        customers = await db.customer.find_many(take=1)
        
        # room_grades テーブル確認  
        room_grades = await db.room_grade.find_many(take=1)
        
        return {
            "database_connection": "success",
            "customers_accessible": len(customers) >= 0,
            "room_grades_accessible": len(room_grades) >= 0,
            "integration_status": "completed"
        }
    except Exception as e:
        return {
            "database_connection": "failed", 
            "error": str(e),
            "integration_status": "failed"
        }
```

```python
# app/integrations/hotel_common.py
import httpx
import os

HOTEL_COMMON_URL = os.getenv("HOTEL_COMMON_API_URL", "http://localhost:3400")
API_KEY = os.getenv("HOTEL_COMMON_API_KEY", "development")

class HotelCommonClient:
    def __init__(self):
        self.base_url = HOTEL_COMMON_URL
        self.headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
    
    async def verify_hierarchy_permissions(self, token: str, customer_id: str):
        """階層権限統合確認"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/hotel-member/hierarchy/auth/verify",
                json={"token": token},
                headers=self.headers
            )
            return response.json()
    
    async def check_customer_access(self, user_id: str, customer_id: str):
        """顧客アクセス権限確認"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/hotel-member/hierarchy/permissions/check-customer-access",
                json={
                    "user_id": user_id,
                    "customer_id": customer_id,
                    "action": "read"
                },
                headers=self.headers
            )
            return response.json()
```

### **Step 5: API起動・健全性確認**
```bash
# 5.1 FastAPI サーバー起動
uvicorn app.main:app --host 0.0.0.0 --port 3200 --reload &

# 5.2 起動確認（30秒待機）
sleep 30

# 5.3 Health Check API確認
curl -s http://localhost:3200/api/health

# 5.4 統合確認API実行
curl -s http://localhost:3200/api/integration/verify

# 5.5 hotel-common連携確認
curl -s http://localhost:3200/api/hotel-common/health
```

### **Step 6: 動作確認・検証**
```bash
# 6.1 データベース統合確認
python -c "
import asyncio
from app.database import verify_integration

async def main():
    result = await verify_integration()
    print('統合確認結果:', result)

asyncio.run(main())
"

# 6.2 API応答確認
curl -s http://localhost:3200/api/customers?limit=1

# 6.3 階層権限統合確認
curl -s -X POST http://localhost:3200/api/hierarchy/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "test_token"}'

# 6.4 統合確認スクリプト実行
/Users/kaneko/hotel-common/scripts/integration-verification.sh
```

---

## 🎯 **完了確認基準**

### **必須達成項目**
- [ ] Python環境でのPostgreSQL統一基盤接続成功
- [ ] hotel-member API（Port 3200）の正常応答
- [ ] customers、room_gradesテーブルへのアクセス成功
- [ ] hotel-common階層権限APIとの連携成功
- [ ] 統合確認スクリプトでの hotel-member PASS判定

### **完了証拠の提出**
```bash
# 必要な証拠ログ
curl -s http://localhost:3200/api/health
python -c "from app.database import verify_integration; import asyncio; print(asyncio.run(verify_integration()))"
curl -s http://localhost:3200/api/customers?limit=1
```

---

## ⚠️ **重要注意事項**

### **現在の状況への配慮**
- **既存の.env設定を尊重**: PostgreSQL設定は既に正しく設定済み
- **Python環境の段階的整備**: prisma-client-pyの追加のみ
- **既存コードとの互換性**: 既存実装を壊さない統合

### **hotel-common緊急サーバー活用**
- **Port 3400で稼働中**: 階層権限APIが利用可能
- **フォールバックモード**: 開発用に全て許可設定
- **JWT検証要求**: 既に受信・応答確認済み

### **データ保護・セキュリティ**
- 顧客データの取り扱いは最小限に留める
- PostgreSQL統一基盤への接続は読み取り専用で開始
- 問題発生時は即座に報告・接続停止

### **期限管理・進捗報告**
- **期限**: 2025年1月24日 18:00
- **進捗報告**: 6時間ごと（02:00, 08:00, 14:00）
- **質問・サポート**: 不明点は推測せず即座に確認

---

## 📞 **緊急連絡・サポート**

### **技術的問題の連絡方法**
- Prisma接続エラー: 具体的なエラーメッセージを添付
- API起動エラー: ポート競合・依存関係エラーの詳細
- hotel-common連携エラー: 具体的なHTTPステータス・レスポンス

### **利用可能なリソース**
- **hotel-common緊急サーバー**: Port 3400で稼働中
- **PostgreSQL統一基盤**: customers、room_grades実装済み
- **自動検証スクリプト**: /Users/kaneko/hotel-common/scripts/integration-verification.sh

---

## 🎯 **統合成功後の次段階**

### **Luna統合との連携**
- hotel-pmsとの予約データ連携準備
- 顧客情報の統一管理実現
- room_gradesを活用した会員特典システム

### **完全統合への道筋**
```typescript
interface IntegrationRoadmap {
  今回: "PostgreSQL統一基盤統合"
  次回: "hotel-pms連携・予約データ統合"  
  最終: "Event-driven リアルタイム同期"
}
```

**⚡ Suno、統一基盤への緊急統合実装を開始してください！** 