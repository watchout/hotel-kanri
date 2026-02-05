# タスク依存関係整合性チェック レポート

**実行日時**: 2026-01-23  
**実行者**: 設計AI  
**対象**: docs/03_ssot/ (121ファイル)  
**実装スキーマ**: hotel-common-rebuild/prisma/schema.prisma

---

## 📊 エグゼクティブサマリー

### 発見された問題

| 問題 | 重大度 | 影響範囲 |
|:-----|:------:|:---------|
| 基盤テーブル未実装のまま機能実装完了 | 🔴 高 | DEV-0172, 0173 他 |
| 依存関係がPlaneで設定されていない | 🔴 高 | 全機能タスク |
| ハードコード値が本番コードに混入 | 🟠 中 | handoff.routes.ts 他 |

### 推奨対応

1. **即時**: 基盤タスクを「In Progress」に変更し最優先で実装
2. **短期**: 完了済みタスクのハードコード箇所をConfig参照に修正
3. **恒久**: 依存関係チェックをプロセスに組み込む

---

## 🔴 基盤テーブル不整合一覧

### SSOTで定義済み・Prismaスキーマに未実装

| 基盤テーブル | 定義SSOT | 用途 | Planeタスク | 現状態 |
|:-------------|:---------|:-----|:------------|:------:|
| `tenant_settings` | SSOT_MARKETING_INTEGRATION.md | Config First（ハードコード禁止） | [Foundation] 設計: Config管理テーブル | Backlog |
| `ai_conversion_logs` | SSOT_MARKETING_INTEGRATION.md | Tracking by Default（Analytics） | [Foundation] 設計: Analytics基盤 | Backlog |
| `subscription_plans` | SSOT_PRICING_ENTITLEMENTS.md | 料金プラン管理 | DEV-0409 | Backlog |
| `tenant_subscriptions` | SSOT_PRICING_ENTITLEMENTS.md | テナント契約管理 | DEV-0409 | Backlog |
| `ai_credit_transactions` | SSOT_PRICING_ENTITLEMENTS.md | AIクレジット履歴 | DEV-0409 | Backlog |

---

## 🟠 依存関係が破綻しているタスク

### 完了済みだが基盤未実装

| タスク | 内容 | 依存基盤 | 問題 |
|:-------|:-----|:---------|:-----|
| **DEV-0172** | ハンドオフAPI | tenant_settings | ⚠️ `timeoutSeconds: 60` がハードコード |
| **DEV-0173** | ハンドオフUI | tenant_settings | ⚠️ 設定値がハードコード |

### 実装待ちで基盤に依存

| タスク | 内容 | 依存基盤 |
|:-------|:-----|:---------|
| DEV-0151-0164 | AI FAQ自動応答 | ai_conversion_logs |
| AI機能全般 | AIキャラクター等 | tenant_settings.ai_character |
| Super Admin機能 | プラン管理等 | subscription_plans |

---

## 📊 SSOT別 基盤参照状況

### tenant_settings を参照するSSO（20箇所）

| SSOT | 参照内容 |
|:-----|:---------|
| SSOT_MARKETING_INTEGRATION.md | 定義元（15箇所） |
| SSOT_GUEST_MENU_VIEW.md | TenantSettings拡張（2箇所） |
| SSOT_GUEST_DEVICE_APP.md | thankYouVideoUrl等（1箇所） |
| SSOT_ADMIN_BILLING.md | 通貨・税率設定（2箇所） |

---

## ✅ Prismaスキーマに実装済みテーブル（主要）

| テーブル | SSOT対応 |
|:---------|:--------:|
| `handoff_requests` | ✅ |
| `handoff_notification_logs` | ✅ |
| `staff` | ✅ |
| `tenants` | ✅ |
| `orders` | ✅ |
| `menu_items` | ✅ |
| `device_rooms` | ✅ |
| `roles` / `permissions` | ✅ |

---

## 🛠️ 推奨アクション

### Phase 1: 基盤実装（最優先）

| 順序 | タスク | 内容 | Plane操作 |
|:----:|:-------|:-----|:----------|
| 1 | tenant_settings | Config管理テーブル + API | → In Progress |
| 2 | ai_conversion_logs | Analytics基盤 | → In Progress（tenant_settings完了後） |
| 3 | DEV-0409 | 料金プラン/エンタイトルメント | → In Progress（基盤完了後） |

### Phase 2: 技術的負債解消

| タスク | 内容 |
|:-------|:-----|
| DEV-0172修正 | HANDOFF_CONFIG をDB参照に変更 |
| DEV-0173修正 | UI設定値をConfig参照に変更 |

### Phase 3: プロセス改善

| 改善項目 | 内容 |
|:---------|:-----|
| プロンプト生成時チェック | 依存基盤が実装済みか自動検証 |
| SSOT作成ルール追加 | 「依存基盤」セクション必須化 |
| Plane依存関係設定 | 基盤→機能の依存リンク必須化 |

---

## 📋 Plane操作指示

### 1. 基盤タスクを最優先化

```
タスク: [Foundation] 設計: Config管理テーブル（tenant_settings）
ID: 5f3c8d2d-a482-4e92-ad27-075da46b974b
操作: State → In Progress, Priority → Urgent

タスク: [Foundation] 設計: Analytics基盤（GA4 + ai_conversion_logs）
操作: State → Todo, Priority → High
依存: tenant_settings完了後

タスク: DEV-0409 SSOT: 料金プラン
ID: a6ef0871-dc62-4ce8-890b-56cc47fbbc8d
操作: State → Todo, Priority → High
依存: 基盤完了後
```

### 2. 完了済みタスクにTODOコメント追加

```
タスク: DEV-0172, DEV-0173
コメント: 「⚠️ 技術的負債: tenant_settings実装後にConfig参照に修正必要」
```

---

## 📝 変更履歴

| 日付 | 内容 |
|:-----|:-----|
| 2026-01-23 | 初版作成 |

---

## 関連ドキュメント

- `docs/03_ssot/00_foundation/SSOT_MARKETING_INTEGRATION.md`
- `docs/03_ssot/00_foundation/SSOT_PRICING_ENTITLEMENTS.md`
- `docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md`
