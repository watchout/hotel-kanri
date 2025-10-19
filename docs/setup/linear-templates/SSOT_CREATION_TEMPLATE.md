# Linear Issue Template: SSOT作成

## テンプレート名
SSOT Creation Task

## テンプレート内容（Description）

```markdown
## 📋 Definition of Ready（Spec Ready → Dev Ready）

### 目的 & 非対象
- [ ] **目的**: この機能が解決する問題を明記
- [ ] **Out of Scope**: 今回実装しない範囲を明記

### 受入条件（AC: Acceptance Criteria）
- [ ] 受入条件1が検証可能な文で記載されている
- [ ] 受入条件2が検証可能な文で記載されている
- [ ] 受入条件3が検証可能な文で記載されている

### 要件ID
- [ ] 要件ID（XXX-nnn形式）が付与されている
  - 例: AUTH-001, PERM-002, DB-003

### 影響範囲
- [ ] **データベース**: あり / なし / 詳細:
- [ ] **権限変更**: あり / なし / 詳細:
- [ ] **外部API**: あり / なし / 詳細:
- [ ] **ログ変更**: あり / なし / 詳細:
- [ ] **翻訳対応**: あり / なし / 対象言語:

### SSOT参照
- [ ] 参照SSOT: `docs/03_ssot/.../SSOT_XXX.md`
- [ ] 関連SSOT: （あれば記載）

### テスト観点
- [ ] **正常系**: 
- [ ] **境界値**: 
- [ ] **異常系**: 
- [ ] **権限チェック**: 
- [ ] **パフォーマンス**: 

### システム間連携
- [ ] hotel-saas実装が必要: はい / いいえ
- [ ] hotel-common実装が必要: はい / いいえ
- [ ] hotel-pms連携が必要: はい / いいえ

---

## ✅ Definition of Done（QA → Release Candidate）

### SSOT品質
- [ ] SSOT_QUALITY_CHECKLIST.md の全項目をクリア
- [ ] データベース命名規則準拠（snake_case + @map）
- [ ] APIルーティング準拠（Express順序、RESTful設計）
- [ ] SessionUser統一（user.user_id使用）
- [ ] 既存SSOTとの整合性確認

### ドキュメント
- [ ] SSOT_PROGRESS_MASTER.md 更新
- [ ] README.md 更新（必要な場合）
- [ ] 変更履歴記載

### レビュー
- [ ] SSOTレビュー完了（1名以上）
- [ ] データベース設計レビュー完了
- [ ] API設計レビュー完了

---

## 📎 関連リンク

- SSOT品質チェックリスト: `/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`
- 要件ID体系: `/docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md`
- データベース命名規則: `/docs/standards/DATABASE_NAMING_STANDARD.md`
- APIルーティングガイドライン: `/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`

---

## 🚀 実装手順

1. SSOT_QUALITY_CHECKLIST.md を読む（15分）
2. 既存コード・SSOT調査（15分）
3. SSOT作成（30分）
4. 品質チェック（10分）
5. PR作成

**見積もり**: 2日（4ポイント）
```

## 使い方

1. Linearで「New issue」をクリック
2. 「Choose template」で「SSOT Creation Task」を選択
3. タイトルを `[SSOT作成] SSOT_XXX` に設定
4. チェックボックスを埋める
5. Status を「Backlog」に設定
6. Assignee、Labels、Project を設定
7. 「Create issue」

