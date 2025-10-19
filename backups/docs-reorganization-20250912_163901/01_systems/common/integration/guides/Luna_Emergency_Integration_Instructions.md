# 🌙 Luna 緊急統合実装指示書

**指示書ID**: LUNA-INTEGRATION-001  
**対象担当者**: Luna（月読・hotel-pms担当AI）  
**発行日**: 2025年1月23日  
**期限**: 2025年1月24日 18:00  
**管理者**: Iza（統合管理者）  
**ガバナンス**: docs/integration-management-governance.md準拠

---

## 🚨 **緊急性と背景**

### **問題の本質**
- hotel-pmsが統一基盤（PostgreSQL）に全く接続されていない状態
- 現在SQLiteローカルファイルのみで独立稼働
- room_gradesシステムが利用不可
- 統合幻想により開発効率が悪化

### **統合完了の具体的基準**
```bash
# 以下のコマンドが成功すること
psql postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db -c "SELECT * FROM room_grades LIMIT 1;"
curl -s http://localhost:3300/api/room-grades | grep -q "grade_name"

# 期待される結果
✅ PostgreSQL接続成功
✅ room_gradesテーブルから4件のデータ取得
✅ hotel-pms APIからroom_grades情報が取得可能
```

---

## 📝 **詳細実装手順**

### **Step 1: 事前準備**
```bash
# 1.1 hotel-pmsディレクトリに移動
cd /Users/kaneko/hotel-pms

# 1.2 現在の状況確認
ls -la .env database.sqlite package.json

# 1.3 現在のSQLiteデータバックアップ
cp database.sqlite database.sqlite.backup_$(date +%Y%m%d_%H%M%S)
```

### **Step 2: 統一基盤への接続設定**
```bash
# 2.1 .envファイル作成
cat > .env << 'EOF'
# PostgreSQL統一基盤接続設定
DATABASE_URL="postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db"

# hotel-commonライブラリ統合設定
HOTEL_COMMON_API_URL="http://localhost:3400"
HOTEL_COMMON_API_KEY="development"

# 開発モード設定
NODE_ENV="development"
PMS_PORT="3300"

# ログレベル
LOG_LEVEL="debug"
EOF

# 2.2 hotel-common依存関係追加
npm install ../hotel-common

# 2.3 Prismaクライアント統合
npm install @prisma/client prisma
```

### **Step 3: 統一基盤スキーマ統合**
```bash
# 3.1 hotel-commonのPrismaスキーマをコピー
cp ../hotel-common/prisma/schema.prisma ./prisma/schema.prisma

# 3.2 Prismaクライアント生成
npx prisma generate

# 3.3 接続確認
npx prisma db pull
```

### **Step 4: データベース接続コード実装**
```typescript
// src/database/connection.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

export { prisma }

// 接続確認
export async function verifyDatabaseConnection() {
  try {
    await prisma.$connect()
    const roomGrades = await prisma.room_grade.findMany()
    console.log('✅ PostgreSQL統一基盤接続成功:', roomGrades.length + '件のroom_grades')
    return true
  } catch (error) {
    console.error('❌ データベース接続エラー:', error)
    return false
  }
}
```

### **Step 5: room_grades活用API実装**
```typescript
// src/api/room-grades.ts
import { prisma } from '../database/connection'

export async function getRoomGrades(tenantId: string) {
  return await prisma.room_grade.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
      is_public: true
    },
    orderBy: {
      grade_level: 'asc'
    }
  })
}

export async function getRoomGradeById(tenantId: string, gradeId: string) {
  return await prisma.room_grade.findFirst({
    where: {
      id: gradeId,
      tenant_id: tenantId
    }
  })
}
```

### **Step 6: 動作確認・検証**
```bash
# 6.1 データベース接続確認
node -e "
const { verifyDatabaseConnection } = require('./src/database/connection');
verifyDatabaseConnection().then(result => {
  console.log('接続結果:', result ? '成功' : '失敗');
  process.exit(result ? 0 : 1);
});
"

# 6.2 hotel-pms起動確認
npm run dev &
sleep 5

# 6.3 API動作確認
curl -s http://localhost:3300/api/room-grades

# 6.4 統合確認スクリプト実行
../hotel-common/scripts/integration-verification.sh
```

---

## 🎯 **完了確認基準**

### **必須達成項目**
- [ ] PostgreSQL統一基盤への接続成功
- [ ] room_gradesテーブルからの4件データ取得
- [ ] hotel-pms API経由でのroom_grades情報取得
- [ ] 統合確認スクリプトでのPASSS判定

### **報告書提出**
完了時は以下の証拠を添付して報告：
```bash
# 実行ログ
psql postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db -c "SELECT grade_name FROM room_grades;"
curl -s http://localhost:3300/api/room-grades | jq .
```

---

## ⚠️ **重要注意事項**

### **データ保護**
- 既存のSQLiteデータは必ずバックアップ
- PostgreSQL移行は段階的に実行
- 問題発生時は即座に報告

### **質問・サポート**
- 技術的な問題は即座にIzaに報告
- 手順が不明な場合は推測で進まず確認を求める
- 完了確認は必ず証拠付きで報告

### **期限管理**
- **期限**: 2025年1月24日 18:00
- 進捗は6時間ごとに報告
- 遅れそうな場合は早期に相談

---

## 📞 **緊急連絡**

問題発生時の連絡方法：
- 即座にユーザーに状況報告
- 具体的なエラーメッセージを添付
- 推測ではなく事実のみを報告

**🌙 Luna、統一基盤統合の実装を開始してください！** 