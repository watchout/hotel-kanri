# Hotel-Common 開発制御・ガバナンス体制

## 目的

API統合仕様書およびシステム設計を**確実に遵守**し、品質の高い統合基盤を維持するための開発制御体制を定義する。

## 1. 開発制御の3つの柱

### 1.1 自動化による強制制御
- **事前防止**：違反を commit 前に検知・防止
- **継続監視**：CI/CD パイプラインでの品質維持
- **即座修正**：問題発生時の自動的な修正提案

### 1.2 人的プロセス制御
- **段階的レビュー**：設計→実装→統合の各段階でのチェック
- **相互確認**：複数人によるクロスチェック体制
- **知識共有**：問題パターンの蓄積と横展開

### 1.3 文書化による継続制御
- **明確な基準**：判断に迷わない具体的なルール
- **追跡可能性**：変更理由と影響範囲の記録
- **更新プロセス**：ルール自体の改善サイクル

## 2. 必須自動化ツール

### 2.1 コード品質制御
```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts --fix",
    "format": "prettier src/**/*.ts --write",
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run format && npm run type-check",
    "pre-commit": "npm run validate && npm run test"
  }
}
```

### 2.2 API仕様遵守チェック
- **エンドポイント規約チェック**：命名規則、HTTP動詞の使用
- **レスポンス形式検証**：統一JSONフォーマットの強制
- **エラーコード一貫性**：定義済みエラーコードの使用確認
- **認証ヘッダー検証**：必須ヘッダーの存在確認

### 2.3 データベース整合性チェック
- **スキーマ変更承認**：破壊的変更の事前検証
- **ソーストラッキング必須**：origin_system等の必須フィールド確認
- **マイグレーション安全性**：ロールバック可能性の保証

## 3. 開発プロセス制御

### 3.1 機能開発フロー
```
1. 要件確認
   ↓
2. API仕様適合性確認 ← **必須チェックポイント**
   ↓
3. 設計ドキュメント作成
   ↓
4. 実装 + 自動テスト
   ↓
5. レビュー（設計・実装・統合）
   ↓
6. CI/CD承認 ← **自動化チェック**
   ↓
7. デプロイ
```

### 3.2 レビュープロセス
#### 必須レビュー項目
- [ ] API仕様書との適合性確認
- [ ] エラーハンドリングの一貫性
- [ ] セキュリティ要件の満足
- [ ] パフォーマンス影響の評価
- [ ] 既存システムとの互換性
- [ ] ドキュメント更新の完了

#### レビュー実行ルール
- **最低2名承認**：設計者 + 統合担当者
- **チェックリスト必須**：上記項目の全て確認
- **修正後再レビュー**：変更箇所の再確認必須

### 3.3 緊急時対応プロセス [[memory:3150174]]
```
Phase 1: 問題分析（必須実行）
- 根本原因の特定
- 影響範囲の確認
- 緊急度レベルの判定

Phase 2: 解決策検討（必須実行）
- 複数選択肢の列挙
- リスク評価の実施
- データ保護優先の確認

Phase 3: 実行前確認（必須実行）
- ユーザーへの提示
- 承認後の実行
- 作業記録の保存
```

## 4. コーディング規約

### 4.1 TypeScript規約
```typescript
// 良い例：型安全性の確保
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 悪い例：any型の使用
function processData(data: any): any {
  return data;
}
```

### 4.2 API実装規約
```typescript
// 必須：統一エラーハンドリング
try {
  const result = await processRequest(request);
  return {
    success: true,
    data: result
  };
} catch (error) {
  return {
    success: false,
    error: {
      code: 'E001', // 定義済みエラーコード必須
      message: getErrorMessage(error)
    }
  };
}

// 必須：ソーストラッキング情報
const updateData = {
  ...requestData,
  updated_by_system: 'hotel-common',
  synced_at: new Date(),
  origin_system: request.headers['x-source-system']
};
```

### 4.3 データベース操作規約
```typescript
// 必須：トランザクション管理
await prisma.$transaction(async (tx) => {
  // 複数テーブル操作は必ずトランザクション内で実行
  await tx.customer.update(updateData);
  await tx.system_event.create(auditData);
});

// 必須：マルチテナント対応
const query = {
  where: {
    tenant_id: request.tenantId, // 必須条件
    ...otherConditions
  }
};
```

## 5. 自動検証機構

### 5.1 Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# 1. コード品質チェック
npm run lint || exit 1
npm run format || exit 1
npm run type-check || exit 1

# 2. API仕様適合性チェック
npm run api-spec-check || exit 1

# 3. テスト実行
npm run test || exit 1

echo "✅ All checks passed. Proceeding with commit."
```

### 5.2 CI/CD Pipeline
```yaml
name: Quality Gate
on: [push, pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - name: Code Quality
        run: npm run validate
      
      - name: API Specification Compliance
        run: npm run api-spec-check
      
      - name: Database Schema Validation
        run: npm run schema-check
      
      - name: Security Scan
        run: npm run security-check
      
      - name: Integration Test
        run: npm run test:integration
```

## 6. 違反パターンと対策

### 6.1 よくある違反パターン
1. **統一レスポンス形式の無視**
   - 検知：レスポンス形式チェッカー
   - 防止：型定義の強制使用

2. **エラーコードの勝手な追加**
   - 検知：エラーコード定義チェック
   - 防止：事前承認プロセス

3. **認証ヘッダーの不備**
   - 検知：ヘッダー検証ミドルウェア
   - 防止：認証テンプレートの使用強制

4. **ソーストラッキング情報の欠落**
   - 検知：データベース制約
   - 防止：ORM設定での自動付与

### 6.2 段階的制裁措置
1. **Warning**: 自動修正提案
2. **Error**: Commit/Push ブロック
3. **Critical**: レビュー必須 + 承認者増加

## 7. 教育・周知体制

### 7.1 新規参加者向け
- **オンボーディング資料**：このドキュメント + API仕様書
- **実践演習**：サンプル実装での練習
- **メンター制度**：経験者によるサポート

### 7.2 継続的な知識共有
- **週次振り返り**：問題パターンの共有
- **四半期アップデート**：ルールの見直し
- **ベストプラクティス集**：成功事例の蓄積

## 8. 効果測定・改善

### 8.1 測定指標
- **仕様違反率**：月次での違反検出数
- **修正時間**：違反修正にかかる平均時間
- **レビュー効率**：レビュー時間と発見問題数
- **統合エラー率**：システム間連携でのエラー発生率

### 8.2 改善サイクル
- **月次レビュー**：指標確認と問題分析
- **四半期改善**：ルール・ツールのアップデート
- **年次戦略見直し**：開発制御体制の抜本的改善

## 9. 実装ロードマップ

### Phase 1: 基盤整備（1週間）
- [ ] ESLint + Prettier 導入
- [ ] Pre-commit hook 設定
- [ ] CI/CD パイプライン構築

### Phase 2: 検証機構（2週間）
- [ ] API仕様適合性チェッカー開発
- [ ] データベース整合性検証ツール
- [ ] 自動テストフレームワーク

### Phase 3: プロセス定着（継続）
- [ ] チーム教育・周知
- [ ] 運用ルールの調整
- [ ] 効果測定・改善サイクル

---

**重要**: このドキュメントで定義された制御体制は、**API統合仕様書の確実な遵守**を目的としています。技術的な制約だけでなく、人的プロセスと継続的改善により、品質の高い統合基盤を維持します。 