# hotel-common src Lint Debt（P2）

## 📋 概要

- **優先度**: P2（機能影響なし、CI品質改善）
- **影響範囲**: hotel-common CI（機能PRのブロック）
- **発見日**: 2025-10-26
- **関連PR**: PR#6, PR#7, PR#8

## 🚨 問題

### 現状
- src配下のESLint違反 **約1900件**（エラー1254件、警告658件）
- 機能PRのCIが失敗し、マージがブロックされる

### 主なエラー種別
```
@typescript-eslint/no-explicit-any: 約600件
import/order: 約300件
no-console: 約200件
@typescript-eslint/ban-types: 約100件
@typescript-eslint/explicit-function-return-type: 約150件
その他TypeScript厳格ルール: 約550件
```

### 対象ファイル
- `src/**/*.ts` 全般（本番コード）
- 特に以下が多数:
  - `src/server/integration-server.ts`
  - `src/routes/**/*.ts`
  - `src/services/**/*.ts`
  - `src/integrations/**/*.ts`

## 🎯 解消方針

### Phase 1: 自動修正可能な問題（約240件）
```bash
npm run lint -- --fix src/**
```

**期待効果**: 約13%のエラーを自動解消

### Phase 2: パターン別手動修正

#### 2.1 import順序整理（高優先度・高効果）
```typescript
// eslint-plugin-import推奨設定へリライト
// Before
import express from 'express'
import { config } from 'dotenv'

// After
import { config } from 'dotenv'

import express from 'express'
```

#### 2.2 any型の段階削減（中優先度）
```typescript
// Before
function handler(req: any, res: any) { ... }

// After
import type { Request, Response } from 'express'
function handler(req: Request, res: Response) { ... }
```

#### 2.3 Console削除・Logger切替（中優先度）
```typescript
// Before
console.log('Debug:', data);

// After (最小限ラップ)
import { logger } from './utils/logger'
logger.debug('Debug:', data);
// または開発環境のみ
if (process.env.NODE_ENV === 'development') {
  logger.debug('Debug:', data);
}
```

#### 2.4 型定義の厳格化（低優先度・段階対応）
```typescript
// Before
const data: {} = ...

// After
const data: Record<string, unknown> = ...
// または具体的な型定義
interface DataType { ... }
const data: DataType = ...
```

### Phase 3: パッケージ別/ディレクトリ別の段階PR

**ロールアウト計画**:
1. Week 1: `src/routes/**` の import順序整理
2. Week 2: `src/services/**` の any型削減
3. Week 3: `src/integrations/**` のlogger統合
4. Week 4: 残存エラーの個別対応

## 📅 実施計画

### Week 1: 自動修正 + import順序
- [ ] `npm run lint --fix` 実行
- [ ] import順序整理（routes/）
- [ ] 部分PRマージ・CI確認

### Week 2: any型削減 + logger統合
- [ ] any型の主要箇所修正
- [ ] logger統合（console置換）
- [ ] 部分PRマージ・CI確認

### Week 3: 型定義厳格化
- [ ] ban-types対応（Function, Boolean等）
- [ ] explicit-function-return-type対応
- [ ] 部分PRマージ・CI確認

### Week 4: 最終仕上げ
- [ ] 残存エラーの個別対応
- [ ] 全体CI緑化確認
- [ ] ドキュメント更新

## 🎖️ 受入基準

- [ ] `npm run lint` でsrc配下がエラー0、警告100件以下
- [ ] CI（lint-and-typecheck）が成功
- [ ] 既存機能の動作に影響なし
- [ ] 型安全性の向上が確認できる
- [ ] PR#6, PR#7, PR#8相当の機能PRがCI緑化できる

## 📊 見積もり

- **工数**: 3〜4週間（段階的PR）
- **リスク**: 低（段階的ロールアウト、各PR小粒度）
- **効果**: CI安定化、コード品質向上、機能開発速度向上

## 🔗 関連情報

- **PR#6**: https://github.com/watchout/hotel-common/pull/6（ビルド緑化、CI緑化済み）
- **PR#7**: https://github.com/watchout/hotel-common/pull/7（doc-only、CLOSED）
- **PR#8**: https://github.com/watchout/hotel-common/pull/8（Generic Resources API、CLOSED）
- **テスト負債**: `/Users/kaneko/hotel-kanri/docs/issues/HOTEL_COMMON_TEST_LINT_DEBT.md`
- **実装レポート（PR2）**: `/Users/kaneko/hotel-kanri/docs/implementation-reports/PR2_COOKIE_REDIS_AUTH_REPORT.md`
- **実装レポート（PR3）**: `/Users/kaneko/hotel-kanri/docs/reports/GENERIC_RESOURCES_API_COMPLETION_20251026.md`

## 💡 推奨アプローチ

### 段階的PR戦略
1. **小粒度PR**: 1PR = 1ディレクトリまたは1エラー種別
2. **並行作業可能**: 複数のディレクトリを同時並行で修正
3. **早期フィードバック**: 各PRごとにCI確認
4. **リスク分散**: 問題発生時の影響範囲を最小化

### CI整合性確保
- 各PRでCI緑化を確認
- mainブランチは常にCI緑を維持
- 機能PR（PR#8等）のrebase/cherry-pickが容易に

---

**作成日**: 2025-10-26  
**優先度**: P2  
**ステータス**: Open  
**担当**: 未定
