# hotel-common テスト負債（lint 6k+エラー）解消

## 📋 概要

- **優先度**: P2（機能影響なし、品質改善）
- **影響範囲**: hotel-common CI（lint-and-typecheck, api-monitoring）
- **発見日**: 2025-10-26
- **関連PR**: PR#6, PR#7

## 🚨 問題

### 現状
- test-*.ts ファイルに **6028個のlint問題**（3603エラー、2425警告）
- CI失敗により新規PRマージがブロックされる可能性

### 主なエラー種別
```
@typescript-eslint/no-explicit-any: 約1500件
@typescript-eslint/no-implicit-any-catch: 約500件
no-console: 約1000件
import/order: 約200件
@typescript-eslint/explicit-function-return-type: 約800件
@typescript-eslint/no-unused-vars: 約500件
```

## 🎯 解消方針

### Phase 1: 自動修正可能な問題（502件）
```bash
npm run lint -- --fix test-*.ts
```

### Phase 2: パターン別手動修正
- 型安全性向上（implicit-any-catch, no-explicit-any）
- Console削除・Logger切替
- Import順序整理

### Phase 3: テストファイルの整理統合
- 重複テストの統合
- 未使用テストファイルの削除

## 📅 実施計画

Week 1: 自動修正 + 型安全性向上
Week 2: Logger統合 + Import整理
Week 3: テスト整理 + CI緑化

## 🎖️ 受入基準

- npm run lint でエラー0、警告100件以下
- CI成功
- 既存テスト動作に影響なし

---

**作成日**: 2025-10-26  
**優先度**: P2  
**ステータス**: Open
