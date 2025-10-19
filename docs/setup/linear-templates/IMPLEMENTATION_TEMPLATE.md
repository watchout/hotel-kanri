# Linear Issue Template: 実装タスク

## テンプレート名
Implementation Task

## テンプレート内容（Description）

```markdown
## 📋 Definition of Ready（Spec Ready → Dev Ready）

### 目的 & 非対象
- [ ] **目的**: この実装が解決する問題を明記
- [ ] **Out of Scope**: 今回実装しない範囲を明記

### 受入条件（AC: Acceptance Criteria）
- [ ] AC1: 
- [ ] AC2: 
- [ ] AC3: 

### 要件ID & SSOT参照
- [ ] **対象要件ID**: XXX-001, XXX-002
- [ ] **参照SSOT**: `docs/03_ssot/.../SSOT_XXX.md @ v1.0.0`
- [ ] **SSOT作成Issue**: LIN-####

### 影響範囲
- [ ] **データベース**: あり / なし / マイグレーション:
- [ ] **権限変更**: あり / なし / 詳細:
- [ ] **外部API**: あり / なし / エンドポイント:
- [ ] **ログ追加**: あり / なし / 種類:
- [ ] **課金影響**: あり / なし / 詳細:

### UIモック/参照画面
- [ ] Figmaリンク: 
- [ ] 参照画面: 

### テスト観点
- [ ] **正常系**: 
- [ ] **境界値**: 
- [ ] **異常系**: 
- [ ] **権限チェック**: 
- [ ] **パフォーマンス**: 

### コントラクト差分
- [ ] OpenAPI差分レビュー済み: はい / いいえ / 該当なし
- [ ] スキーマ変更レビュー済み: はい / いいえ / 該当なし

---

## ✅ Definition of Done（QA → Release Candidate）

### テスト
- [ ] **単体テスト**: カバレッジ >= 80%
- [ ] **統合テスト**: グリーン
- [ ] **E2Eテスト**: 主要フロー全てグリーン
- [ ] **契約テスト**: OpenAPI整合確認（API変更の場合）
- [ ] **パフォーマンステスト**: 応答時間 <= 300ms（該当する場合）

### ログ・監査
- [ ] **構造化ログ**: 追加済み（JSON形式）
- [ ] **監査ログ**: 追加済み（userId, hotelId, event, level, correlationId）
- [ ] **PIIマスク**: 個人情報をマスク済み
- [ ] **エラーログ**: エラーハンドリング適切

### セキュリティ
- [ ] **認証チェック**: 全エンドポイントで実装
- [ ] **権限チェック**: RBAC準拠
- [ ] **入力検証**: Zod/JSON Schemaで実装
- [ ] **SQLインジェクション対策**: Prisma使用
- [ ] **XSS対策**: 出力エスケープ

### コード品質
- [ ] **TypeScript strict**: エラー0件
- [ ] **ESLint**: エラー0件
- [ ] **型安全**: any型なし（unknownを使用）
- [ ] **コメント**: 複雑なロジックにJSDoc

### ドキュメント
- [ ] **SSOT更新**: 実装状況を更新
- [ ] **README更新**: 必要に応じて
- [ ] **リリースノート**: 記載済み
- [ ] **ロールバック手順**: 記載済み
- [ ] **Runbook**: 運用手順記載（本番影響がある場合）

### レビュー
- [ ] **コードレビュー**: 1名以上承認
- [ ] **QAレビュー**: 受入条件×テスト観点確認
- [ ] **セキュリティレビュー**: 完了（該当する場合）

---

## 📎 関連リンク

- SSOT実装チェックリスト: `/docs/03_ssot/00_foundation/SSOT_IMPLEMENTATION_CHECKLIST.md`
- 実装ガードプロンプト: `/.cursor/prompts/implementation_guard_with_requirement_id.md`
- PRテンプレート: `/.github/PULL_REQUEST_TEMPLATE.md`

---

## 🚀 実装手順

1. SSOT_IMPLEMENTATION_CHECKLIST.md を読む（10分）
2. 既存コード調査（15分）
3. テスト作成（30分）
4. 実装（1-2時間）
5. テストをグリーンに（30分）
6. PR作成

**見積もり**: 3日（6ポイント）
```

## 使い方

1. Linearで「New issue」をクリック
2. 「Choose template」で「Implementation Task」を選択
3. タイトルを `[hotel-XXX実装] SSOT_XXX` に設定
4. チェックボックスを埋める
5. Status を「Backlog」に設定
6. 依存関係: 対応するSSOT作成Issueを「Blocked by」に設定
7. 「Create issue」

