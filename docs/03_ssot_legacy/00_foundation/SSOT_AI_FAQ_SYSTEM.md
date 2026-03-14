# SSOT: AIコンシェルジュシステム（AI FAQ System）

**最終更新**: 2026年1月19日
**バージョン**: 1.0.0
**ステータス**: DRAFT
**関連**: `SSOT_MARKETING_STRATEGY.md`

---

## 1. コンセプト：おもてなしAI "Luna"

単なる「自動応答ボット」ではなく、**「売上を作り、ファンを増やすコンシェルジュ」**として定義する。
キーワードマッチング（旧世代）ではなく、**意図分類（Intent Classification）**と**コンテキスト理解**を核とする。

---

## 2. アーキテクチャ原則

### 2.1 Intent-based Routing
- ユーザーの入力をLLMで解析し、「意図（Intent）」に分類してから処理を行う。
- キーワード一致に頼らないため、「ゆらぎ」に強く、文脈（入室直後、深夜など）を考慮可能。

### 2.2 Config Separation
- **ロジック（hotel-common）**: 意図分類、API連携、レスポンス生成の仕組み。
- **コンテンツ（JSON）**: テナントごとの回答内容、口調、メニュー、価格設定。
- これにより、テナント（バリアン等）ごとの独自性をコーディングなしで実現する。

### 2.3 Upsell Driven
- 全ての回答に「次のアクション（Action）」を含めることを推奨。
- 特に「注文（Order）」「予約（Reserve）」への導線を強化し、収益機会を逃さない。

---

## 3. データ構造（Tenant Config）

`hotel-common/config/faq/tenant-{id}.json`

```json
{
  "tenantId": "tenant-balian-001",
  "persona": {
    "name": "Luna",
    "role": "resort_concierge",
    "tone": "friendly_polite",
    "suffix": "ですよ♪"
  },
  "faqEntries": [
    {
      "id": "faq-menu",
      "intent": "food_inquiry",
      "keywords": ["メニュー", "お腹すいた", "ご飯"],
      "responses": {
        "ja": "当リゾート自慢のアジアンメニューはいかがですか？今はナシゴレンが人気ですよ♪",
        "en": "How about our signature Asian dishes? Nasi Goreng is popular right now!",
        "zh": "要不要试试我们的特色亚洲菜？现在印尼炒饭很受欢迎哦♪"
      },
      "actions": [
        {
          "type": "deeplink",
          "label": { "ja": "メニューを見る", "en": "View Menu" },
          "url": "/menu",
          "metrics": { "conversionCategory": "view_menu" }
        }
      ]
    },
    {
      "id": "faq-recommend",
      "intent": "recommendation",
      "contextRules": ["time_range:18:00-22:00"],
      "responses": {
        "ja": "ディナータイムですね。ハニトーとシャンパンのセットで、特別な夜にしませんか？",
        "en": "It's dinner time. How about a Honey Toast and Champagne set for a special night?"
      },
      "actions": [
        {
          "type": "deeplink",
          "label": { "ja": "今すぐ注文する", "en": "Order Now" },
          "url": "/menu/category/specials?item=honey-toast-set&highlight=true",
          "metrics": { "conversionCategory": "upsell_click" }
        }
      ]
    }
  ]
}
```

---

## 4. 機能仕様

### 4.1 意図分類フロー
1. **Input**: ゲストの発話
2. **Pre-filter**: キーワードによる高速フィルタ（低レイテンシ化）
3. **LLM Analysis**: 
   - 文脈（Context）: 時間帯、滞在ステータス
   - 意図（Intent）: `food_inquiry`, `facility_guide`, `trouble_shooting` 等
4. **Response Gen**: 
   - 該当IntentのJSONデータを取得
   - ペルソナ設定に基づき回答を整形（または固定文言を使用）
   - 多言語対応

### 4.2 アクションタイプ（Action Types）

| タイプ | 動作 | マーケティング目的 |
|:---|:---|:---|
| `deeplink` | アプリ内ページ遷移 | メニュー閲覧、施設案内への誘導 |
| `handoff` | 有人チャット/電話へ切替 | クレーム対応、複雑な相談の解決 |
| `upsell` | **商品カード表示（画像+価格）** | 衝動買いの誘発（CVR向上） |
| `control` | **IoT制御（照明・空調）** | "魔法のような"体験の提供 |

### 4.3 トラッキング（Tracking）

以下のイベントを自動計測する。

- `faq_intent_matched`: どの意図が多く質問されているか
- `faq_action_clicked`: アクションのクリック率（CTR）
- `faq_upsell_conversion`: AI経由での注文完了（CVR）
- `faq_feedback`: 回答へのGood/Bad評価

---

## 5. バリアン・パイロット仕様（Phase 1 MVP）

### 5.1 実装スコープ
- **対象**: バリアン新宿本店（仮想）
- **言語**: 日本語、英語
- **必須インテント**:
  - `early_checkin` / `late_checkout`
  - `food_inquiry` / `recommendation` (ハニトー推し)
  - `amenity_request` (非対面注文)
  - `vod_help` (操作方法)
  - `wifi_help`

### 5.2 成功基準
- AI経由の注文率（AI Upsell Rate）: 5%以上
- 解決率（Feedback Good率）: 80%以上

---

## 6. 今後の拡張（Roadmap）

- **Phase 2**: プロファイルベースのパーソナライズ（アレルギー、宗教対応）
- **Phase 3**: IoT連携（照明・エアコン制御アクションの実装）
- **Phase 4**: 音声対話（Voice I/F）への対応
