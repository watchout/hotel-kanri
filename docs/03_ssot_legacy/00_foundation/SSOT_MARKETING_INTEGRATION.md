# SSOT: Marketing Integration（マーケティング視点の開発統合）

**作成日**: 2026-01-19  
**最終更新**: 2026-01-19  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（全開発タスク必須）

---

## 📋 このSSOTの目的

**高品質な機能開発と高速なマーケティングを両立させるためのルール定義**

### 背景

通常のスタートアップは「機能（What）」を売るが、本プロジェクトは**「高品質な機能を量産できるエンジン（How）」**自体を評価額に上乗せする戦略を採用。

そのため、開発体制に以下のマーケティング視点を組み込む：

1. **Config First**: テストマーケの高速PDCAを実現
2. **Tracking by Default**: KPI証明・DD対策
3. **Doc is Asset**: バイアウト時の評価額向上

---

## 🎯 1. Config First（ハードコード禁止）

### 1.1 目的

**「明日からこのイベントやりたい」という現場スピードに対応**

- 店舗ごとの独自イベント（新宿店限定ハニトー、女子会プラン等）
- A/Bテスト（文言変更、価格変更）
- AIキャラクター調整

### 1.2 Config化すべき項目

| カテゴリ | 項目例 | 保存先 |
|:---------|:-------|:-------|
| **AIキャラクター** | 名前、口調、人格、ウェルカムメッセージ | `tenant_settings.ai_character` |
| **キャンペーン** | 文言、バナー画像、表示期間 | `tenant_settings.campaigns` |
| **価格** | 基本価格、割引率、特別価格 | `tenant_settings.pricing` |
| **表示設定** | 営業時間、対応言語、表示順 | `tenant_settings.display` |

### 1.3 技術仕様

#### データベース設計

```prisma
model tenant_settings {
  id         Int      @id @default(autoincrement())
  tenant_id  String   @db.Uuid
  category   String   // 'ai_character' | 'campaigns' | 'pricing' | 'display'
  key        String
  value      Json
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  @@unique([tenant_id, category, key])
  @@map("tenant_settings")
}
```

#### Config取得API

```typescript
// GET /api/v1/admin/settings/:category
// GET /api/v1/admin/settings/:category/:key

// 使用例
const aiCharacter = await getConfig('ai_character', 'welcome_message', tenantId)
// → "いらっしゃいませ！{customer_name}様"
```

#### Hot Reload対応

```typescript
// キャッシュ戦略
// - Redis: 60秒TTL
// - 更新時: キャッシュ無効化
// - フォールバック: DB直接取得

async function getConfig(category: string, key: string, tenantId: string) {
  const cacheKey = `config:${tenantId}:${category}:${key}`
  
  // 1. Redisから取得
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)
  
  // 2. DBから取得
  const setting = await prisma.tenant_settings.findUnique({
    where: { tenant_id_category_key: { tenant_id: tenantId, category, key } }
  })
  
  // 3. キャッシュ保存
  if (setting) {
    await redis.setex(cacheKey, 60, JSON.stringify(setting.value))
  }
  
  return setting?.value ?? null
}
```

### 1.4 ハードコードOKな項目

| 項目 | 理由 |
|:-----|:-----|
| システムエラーメッセージ | 開発者向け、変更不要 |
| ログ出力メッセージ | デバッグ用、変更不要 |
| 技術的定数 | ポート番号、タイムアウト値等 |
| SSOTで定義された仕様 | 変更にはSSO更新が必要 |

### 1.5 実装チェックリスト

```markdown
## Config First チェック

- [ ] UIに表示するテキスト・文言はハードコードしていないか？
- [ ] 価格・割引率はハードコードしていないか？
- [ ] AIの口調・人格設定はハードコードしていないか？
- [ ] キャンペーン関連のパラメータはハードコードしていないか？
- [ ] Config取得にはgetConfig()を使用しているか？
```

---

## 📊 2. Tracking by Default（計測必須）

### 2.1 目的

**効果測定できない機能は存在しないのと同じ**

- UI/UX改善用（GA4）
- KPI証明用（独自DB）
- DD対策（生データエクスポート）

### 2.2 計測アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   DB            │
│   (GA4 + Tag)   │     │   (Log MW)      │     │   (ai_logs)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2.3 フロントエンド計測

#### 必須: data-analytics-id

```vue
<!-- ❌ 禁止 -->
<button @click="sendMessage">送信</button>

<!-- ✅ 必須 -->
<button 
  data-analytics-id="ai-chat-send"
  @click="sendMessage"
>
  送信
</button>
```

#### analytics-id 命名規則

```
{コンポーネント}-{アクション}[-{詳細}]

例:
- ai-chat-send
- ai-recommend-click
- cart-add-item
- order-confirm
- menu-category-select
```

#### GA4連携（GTM経由）

```javascript
// 自動収集設定
// GTMで data-analytics-id を持つ要素のクリックを自動追跡
```

### 2.4 バックエンド計測

#### APIログ（必須）

```typescript
// 全APIエンドポイントで必須
router.post('/', async (req, res) => {
  const startTime = Date.now()
  
  console.log('[POST /api/v1/xxx] start', {
    tenantId,
    userId,
    requestId: req.headers['x-request-id']
  })
  
  try {
    // 処理
    
    console.log('[POST /api/v1/xxx] success', {
      tenantId,
      duration: Date.now() - startTime
    })
  } catch (error) {
    console.error('[POST /api/v1/xxx] error', {
      tenantId,
      error: error.message,
      duration: Date.now() - startTime
    })
    throw error
  }
})
```

#### AI変換ログ（DB記録必須）

```prisma
model ai_conversion_logs {
  id                    Int      @id @default(autoincrement())
  tenant_id             String   @db.Uuid
  session_id            String   // AIチャットセッション
  room_id               String?  // 客室ID
  recommendation_item_id Int?    // 推奨した商品ID
  conversion_type       String   // 'view' | 'cart' | 'order'
  metadata              Json?    // 追加情報
  created_at            DateTime @default(now())
  
  @@index([tenant_id, created_at])
  @@index([recommendation_item_id])
  @@map("ai_conversion_logs")
}
```

#### 変換ログ記録API

```typescript
// POST /api/v1/analytics/conversion
interface ConversionLog {
  sessionId: string
  recommendationItemId?: number
  conversionType: 'view' | 'cart' | 'order'
  metadata?: Record<string, unknown>
}
```

### 2.5 計測すべきイベント一覧

| イベント | analytics-id | DB記録 | 優先度 |
|:---------|:-------------|:------:|:------:|
| AIチャット開始 | `ai-chat-open` | ✅ | 🔴 |
| AIチャット送信 | `ai-chat-send` | ✅ | 🔴 |
| AI推奨クリック | `ai-recommend-click` | ✅ | 🔴 |
| メニュー閲覧 | `menu-view` | ❌ | 🟡 |
| カテゴリ選択 | `menu-category-select` | ❌ | 🟡 |
| 商品詳細表示 | `item-detail-view` | ❌ | 🟡 |
| カート追加 | `cart-add` | ✅ | 🔴 |
| カート削除 | `cart-remove` | ❌ | 🟢 |
| 注文確定 | `order-confirm` | ✅ | 🔴 |

### 2.6 実装チェックリスト

```markdown
## Tracking by Default チェック

- [ ] 全てのCTAボタンに `data-analytics-id` を付与したか？
- [ ] APIエンドポイントにリクエストログを出力しているか？
- [ ] AI推奨→CV の因果関係を記録しているか？
- [ ] 追加したanalytics-id一覧: [記載]
```

---

## 📚 3. Doc is Asset（ドキュメント = 資産）

### 3.1 目的

**バイアウト時の評価額向上（リスク減額要因の排除）**

買収企業が確認する項目：
- 属人性がない（誰でも引き継げる）
- 品質が保証されている（QOS準拠）
- 生データがエクスポート可能

### 3.2 ドキュメント品質基準

| ドキュメント | 更新頻度 | 責任者 |
|:-------------|:---------|:-------|
| SSOT | 機能変更時（即時） | 実装担当AI |
| API Registry | API追加時（即時） | 実装担当AI |
| トレーサビリティマトリクス | 週次（自動生成） | CI |
| ADR | 重要決定時 | 設計AI |

### 3.3 英語化計画

| フェーズ | 対象 | 時期 |
|:---------|:-----|:-----|
| Phase 1 | README、主要SSOT | MVP完成後 |
| Phase 2 | API仕様書 | Year 1 Q3 |
| Phase 3 | 全ドキュメント | Year 2 |

### 3.4 DD準備チェックリスト

```markdown
## DD準備チェック（バイアウト時）

### コード品質
- [ ] TypeScript strictモード
- [ ] テストカバレッジ80%以上
- [ ] Lint/Format統一

### ドキュメント
- [ ] SSOT完備
- [ ] API仕様書完備
- [ ] ADR（重要決定記録）完備
- [ ] トレーサビリティマトリクス

### データ
- [ ] 生データエクスポート機能
- [ ] KPIダッシュボード
- [ ] ai_conversion_logs による因果関係証明
```

---

## 📋 4. 実装ガイド

### 4.1 新機能開発時のフロー

```
1. SSOT確認
   ↓
2. Config First チェック
   - ハードコードすべきでない項目を洗い出し
   - tenant_settings設計
   ↓
3. Tracking by Default チェック
   - 計測すべきイベントを洗い出し
   - analytics-id命名
   ↓
4. 実装
   ↓
5. Marketing Injection 完了報告
   ↓
6. PR作成
```

### 4.2 Marketing Injection 完了報告テンプレート

```markdown
## Marketing Injection 完了報告

### Config First
- [ ] Config化した項目: [一覧]
- [ ] 使用したgetConfig呼び出し: [一覧]
- [ ] ハードコード理由（例外がある場合）: [理由]

### Tracking by Default
- [ ] 追加したanalytics-id: [一覧]
- [ ] DB記録するイベント: [一覧]
- [ ] APIログ出力: あり/なし

### 備考
- [特記事項]
```

---

## 📝 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-19 | 1.0.0 | 初版作成 |

---

## 関連ドキュメント

- `.cursorrules` - Marketing Injection Rules
- `docs/standards/prompt-templates/COMMON_SECTIONS.md` - プロンプトテンプレート
- `docs/03_ssot/00_foundation/SSOT_PRICING_ENTITLEMENTS.md` - 料金プラン
- `docs/03_ssot/00_foundation/SSOT_BUYOUT_STRATEGY.md` - バイアウト戦略
