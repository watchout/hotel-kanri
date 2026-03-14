# 🚨 TypeScript エラー防止・解決ガイド

**作成日**: 2025年1月19日  
**対象**: 全開発者（必読）  
**優先度**: 🔴 **最高優先度**  
**目的**: TypeScriptエラーによるサーバー停止・API無応答の完全防止

---

## ⚠️ **重大な問題**

### **現在の状況**
- **メモ機能実装が未完了**のため、新機能開発に進めない
- **hotel-commonでTypeScriptエラー大量発生**
- **サーバー停止・起動エラー**でAPI無応答
- **実装検証が不可能**な状態

### **根本原因**
```typescript
// 問題のパターン
❌ 型定義不完全 → コンパイルエラー
❌ インポート不整合 → モジュール解決エラー  
❌ 依存関係未解決 → 実行時エラー
❌ 一時対応の蓄積 → 技術的負債
```

---

## 🛡️ **エラー防止戦略**

### **1. 事前チェック必須項目**

#### **実装開始前の確認**
```bash
# 1. TypeScript コンパイルチェック
cd hotel-common && npm run type-check

# 2. 依存関係確認
npm run build

# 3. サーバー起動テスト
npm run dev

# 4. API疎通確認
curl http://localhost:3400/health
```

#### **実装中の継続チェック**
```bash
# 5分毎の自動チェック（推奨）
watch -n 300 'npm run type-check'

# ファイル保存時の自動チェック
# VSCode設定: "typescript.preferences.includePackageJsonAutoImports": "auto"
```

### **2. メモ機能完了までの対処法**

#### **🚨 緊急対処: TypeScriptエラー解消**

```typescript
// hotel-common/types/memo.ts - 必須型定義
export interface Memo {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  author_id: string;
  source_system: 'saas' | 'pms';
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  category?: string;
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  view_count: number;
  comment_count: number;
  attachment_count: number;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
  deleted_at?: Date;
  created_by: string;
  updated_by?: string;
  archived_by?: string;
  deleted_by?: string;
}

export interface MemoCreateRequest {
  title: string;
  content: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  is_pinned?: boolean;
}

export interface MemoUpdateRequest extends Partial<MemoCreateRequest> {
  id: string;
}

export interface MemoListQuery {
  page?: number;
  pageSize?: number;
  includeReadStatus?: boolean;
  staffId?: string;
  sourceSystem?: 'saas' | 'pms';
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  isArchived?: boolean;
  search?: string;
}

export interface MemoListResponse {
  memos: Memo[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  readStatus?: Record<string, boolean>;
}
```

#### **🔧 最小限API実装（エラー解消用）**

```typescript
// hotel-common/server/api/v1/memos/index.get.ts
export default defineEventHandler(async (event): Promise<MemoListResponse> => {
  try {
    // 最小限の実装でTypeScriptエラーを解消
    const query = getQuery(event) as MemoListQuery;
    
    // TODO: 実際のデータベース実装
    const memos: Memo[] = [];
    
    return {
      memos,
      pagination: {
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message }
    });
  }
});

// hotel-common/server/api/v1/memos/index.post.ts
export default defineEventHandler(async (event): Promise<Memo> => {
  try {
    const body = await readBody(event) as MemoCreateRequest;
    
    // TODO: 実際のデータベース実装
    const memo: Memo = {
      id: crypto.randomUUID(),
      tenant_id: 'temp-tenant',
      title: body.title,
      content: body.content,
      author_id: 'temp-author',
      source_system: 'saas',
      tags: body.tags || [],
      priority: body.priority || 'medium',
      category: body.category,
      is_pinned: body.is_pinned || false,
      is_archived: false,
      is_deleted: false,
      view_count: 0,
      comment_count: 0,
      attachment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'temp-author'
    };
    
    return memo;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message }
    });
  }
});
```

#### **📦 package.json 依存関係確認**

```json
// hotel-common/package.json - 必須依存関係
{
  "dependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "h3": "^1.8.0",
    "nitro": "^2.6.0"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "build": "nitro build",
    "dev": "nitro dev",
    "start": "node .output/server/index.mjs"
  }
}
```

---

## 🔄 **段階的実装戦略**

### **Phase 0: エラー解消（最優先）**
```bash
# 1. 型定義完備
✅ memo.ts 型定義作成
✅ API エンドポイント最小実装
✅ TypeScript コンパイル成功確認

# 2. サーバー起動確認
✅ hotel-common サーバー起動成功
✅ API レスポンス確認
✅ エラーログ解消
```

### **Phase 1: メモ機能完成**
```bash
# 3. データベース実装
✅ Prisma スキーマ定義
✅ マイグレーション実行
✅ CRUD 操作実装

# 4. 統合テスト
✅ hotel-saas 統合確認
✅ hotel-pms 統合確認
✅ エンドツーエンドテスト
```

### **Phase 2: 新機能開発開始**
```bash
# 5. AI機能開発準備
✅ システム設定基盤実装
✅ AIクレジット管理実装
✅ メディア管理統合実装
```

---

## 🚨 **緊急時対処法**

### **サーバー起動エラー時**

```bash
# 1. エラーログ確認
cd hotel-common
npm run dev 2>&1 | tee error.log

# 2. TypeScript エラー特定
npm run type-check

# 3. 依存関係再インストール
rm -rf node_modules package-lock.json
npm install

# 4. キャッシュクリア
rm -rf .nuxt .output dist

# 5. 段階的起動確認
npm run build
npm run start
```

### **API無応答時**

```bash
# 1. プロセス確認
ps aux | grep node

# 2. ポート確認
lsof -i :3400

# 3. 強制終了・再起動
pkill -f "hotel-common"
cd hotel-common && npm run dev

# 4. ヘルスチェック
curl -v http://localhost:3400/health
```

### **TypeScript エラー大量発生時**

```typescript
// 緊急時の型定義修正パターン

// 1. any型の一時使用（最終手段）
const tempData: any = unknownData;

// 2. 型アサーション
const memo = data as Memo;

// 3. オプショナル型の活用
interface TempMemo {
  id?: string;
  title?: string;
  content?: string;
}

// 4. ユニオン型での対応
type MemoStatus = 'draft' | 'published' | 'archived' | string;
```

---

## ✅ **実装チェックリスト**

### **メモ機能完了前の必須作業**

#### **hotel-common**
- [ ] `types/memo.ts` 型定義作成
- [ ] `server/api/v1/memos/` 最小API実装
- [ ] TypeScript コンパイル成功確認
- [ ] サーバー起動成功確認
- [ ] API レスポンス確認

#### **hotel-saas**
- [ ] メモ機能統合確認
- [ ] TypeScript エラー解消
- [ ] ビルド成功確認

#### **統合確認**
- [ ] Docker Compose 起動成功
- [ ] 全サービス疎通確認
- [ ] エラーログ解消

### **新機能開発開始前の必須確認**

- [ ] メモ機能完全動作確認
- [ ] 全TypeScript エラー解消
- [ ] 全サーバー安定起動
- [ ] API 全エンドポイント正常応答
- [ ] 統合テスト全通過

---

## 📋 **継続的品質管理**

### **自動チェック設定**

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.validate.enable": true,
  "typescript.format.enable": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  }
}
```

### **Git Pre-commit Hook**

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🔍 TypeScript チェック実行中..."

# hotel-common チェック
cd hotel-common
if ! npm run type-check; then
  echo "❌ hotel-common TypeScript エラーあり"
  exit 1
fi

# hotel-saas チェック  
cd /Users/kaneko/hotel-saas
if ! npm run type-check; then
  echo "❌ hotel-saas TypeScript エラーあり"
  exit 1
fi

echo "✅ TypeScript チェック完了"
exit 0
```

---

## 🎯 **成功基準**

### **エラー解消完了の判定**
1. **TypeScript コンパイル**: 全エラー0件
2. **サーバー起動**: 全サービス正常起動
3. **API応答**: 全エンドポイント正常応答
4. **統合動作**: システム間連携正常動作

### **新機能開発開始可能の判定**
1. **メモ機能**: 完全動作確認済み
2. **安定性**: 24時間連続稼働確認
3. **パフォーマンス**: レスポンス時間基準内
4. **品質**: テストカバレッジ80%以上

---

**⚠️ 重要**: このガイドに従い、**メモ機能完了まで新機能開発は禁止**。TypeScriptエラーを完全解消してから次のフェーズに進むこと。

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者
