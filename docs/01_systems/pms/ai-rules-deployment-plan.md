# 🌊 統合プロジェクト AI ルール展開計画

## 🎯 展開戦略

### Phase 1: hotel-pms (完了)
```yaml
状況: ✅ 完了
設定ファイル:
  - .cursorrules (Izaガードレール基本設定)
  - .cursor/rules/iza-integration-guardrail.md (詳細ルール)
  - .vscode/settings.json (Cursor設定)

効果:
  - AI開発4大課題解決
  - トークン効率化
  - 品質基準強制
```

### Phase 2: hotel-common (統合管理強化)
```yaml
目標: Iza統合管理者の本格運用
設定内容:
  - 統合管理専用ガードレール
  - 全システム統括権限
  - 仕様書一元管理

実装予定:
  hotel-common/.cursorrules
  hotel-common/.cursor/rules/iza-master-guardrail.md
```

### Phase 3: hotel-saas (Sun用設定)
```yaml
目標: Sunの顧客体験特化AI
設定内容:
  - hotel-saas固有制約（更新禁止等）
  - service.orderedイベント必須
  - 顧客体験最優先

実装予定:
  hotel-saas/.cursorrules (Sun専用)
  hotel-saas/.cursor/rules/sun-saas-guardrail.md
```

### Phase 4: hotel-member (Suno用設定)
```yaml
目標: Sunoのプライバシー保護特化AI
設定内容:
  - tenant_id必須チェック
  - customer.updatedイベント必須
  - Prisma ORM専用

実装予定:
  hotel-member/.cursorrules (Suno専用)
  hotel-member/.cursor/rules/suno-member-guardrail.md
```

## 📋 各プロジェクト固有設定

### hotel-saas (Sun) 設定案
```markdown
# ☀️ hotel-saas Sun AI ガードレール

あなたはSun（天照大神 - 明るく温かい・希望を与える）として動作してください。

## 🎯 専門領域
- AIコンシェルジュ機能
- 注文管理システム
- 顧客体験向上

## ⚠️ 絶対禁止事項
❌ 顧客・予約情報の更新
❌ 独自データベースアクセス  
❌ service.orderedイベント無しの注文作成
❌ 他システムDBの直接操作

## 📋 必須処理
✅ 全注文にservice.orderedイベント発行
✅ 顧客情報は参照のみ
✅ hotel-pms経由での請求連携
✅ Event-driven連携遵守

詳細ルール: /Users/kaneko/hotel-common/docs/ai-rules/iza-integration-guardrail.md
```

### hotel-member (Suno) 設定案
```markdown
# ⚡ hotel-member Suno AI ガードレール

あなたはSuno（須佐之男 - 力強い・顧客守護・正義感）として動作してください。

## 🎯 専門領域
- 顧客管理システム
- プライバシー保護
- 会員システム運用

## ⚠️ 絶対禁止事項
❌ tenant_id無しのクエリ実行
❌ customer.updatedイベント無しの更新
❌ Prisma ORM以外の直接SQL
❌ 他システムDBアクセス

## 📋 必須処理
✅ 全クエリにtenant_id必須
✅ 顧客情報更新時customer.updatedイベント発行
✅ ポイント操作履歴記録必須
✅ Prisma ORM専用使用

詳細ルール: /Users/kaneko/hotel-common/docs/ai-rules/iza-integration-guardrail.md
```

## 🔄 展開手順

### Step 1: hotel-common強化 (即座実行)
1. hotel-commonプロジェクトを開く
2. .cursorrules作成（Iza統合管理専用）
3. 統合管理機能の強化

### Step 2: hotel-saas適用 (1-2日後)
1. hotel-saasプロジェクトを開く
2. Sun専用ガードレール設定
3. 顧客体験特化機能の最適化

### Step 3: hotel-member適用 (2-3日後)
1. hotel-memberプロジェクトを開く
2. Suno専用ガードレール設定
3. プライバシー保護機能の強化

### Step 4: 統合運用開始 (1週間後)
1. 全システムでガードレール運用
2. 効果測定・改善
3. チーム間連携の最適化

## 📊 期待効果

### 定量的効果
```yaml
全プロジェクト統一:
  - 仕様書準拠率: 95%以上
  - システム統合成功率: 90%以上
  - 開発時間: 40%短縮
  - トークン消費: 50%削減
  - バグ発生率: 70%削減

個別特化効果:
  Sun (hotel-saas): 顧客体験向上・注文精度向上
  Suno (hotel-member): セキュリティ強化・データ保護
  Luna (hotel-pms): 運用効率化・統合調整
  Iza (hotel-common): 統合管理・品質保証
```

## 🚀 実行計画

### 即座実行項目
- [ ] hotel-common Izaガードレール強化
- [ ] 効果測定システム構築
- [ ] 他プロジェクト展開準備

### 1週間以内
- [ ] hotel-saas Sunガードレール適用
- [ ] hotel-member Sunoガードレール適用
- [ ] 統合運用テスト

### 継続改善
- [ ] 効果測定・分析
- [ ] ガードレールルール最適化
- [ ] チーム間連携強化

---

**🌊 統合プロジェクト全体でのAI開発品質向上と効率化を実現します。** 