# 🔧 SSOT-ページ整合性改善プロジェクト

## 背景

FAQ自動応答（DEV-0160シリーズ）実装時に、SSOTで参照されるページが存在しないリンク切れが発生しました。

**問題箇所**:
- `SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md` で `/info/luggage`、`/info/wifi` を参照
- しかし `hotel-saas-rebuild/pages/info/` ディレクトリが存在しない

**根本原因**:
1. ゲスト向けPage Registryが存在しない
2. SSOT品質チェックリストに「リンク先存在確認」がない
3. SSOT作成時にPage Registryを参照していない

---

## タスク一覧

| タスクID | 内容 | 優先度 | 依存 |
|----------|------|--------|------|
| DEV-0175 | SSOT_GUEST_PAGE_REGISTRY.md 作成 | 🔴 高 | なし |
| DEV-0176 | FAQ SSOT修正（リンク先暫定対応） | 🔴 高 | DEV-0175 |
| DEV-0177 | SSOT品質チェックリスト更新 | 🟡 中 | DEV-0175 |
| DEV-0178 | /info/* ゲスト向け情報ページ実装 | 🟡 中 | DEV-0175 |
| DEV-0179 | リンク整合性自動チェックスクリプト作成 | 🟢 低 | DEV-0175, DEV-0177 |

---

## DEV-0175: SSOT_GUEST_PAGE_REGISTRY.md 作成

### 目的
ゲスト向けページの正式な一覧を作成し、SSOTとの整合性を管理可能にする

### 作成場所
`/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_GUEST_PAGE_REGISTRY.md`

### 必要な内容

1. **現在実装済みのページ一覧**
```bash
find /Users/kaneko/hotel-saas-rebuild/pages -name "*.vue" -type f | grep -v admin | sort
```

2. **計画中のページ一覧**（各SSOTから抽出）
```bash
grep -r "url.*:.*\"/" /Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/ | grep -v admin
```

3. **テンプレート形式**
```markdown
# SSOT: ゲスト向けページレジストリ

## 実装済みページ

| パス | ファイル | 状態 | 関連SSOT |
|------|----------|------|----------|
| /menu | pages/menu/index.vue | ✅ 実装済み | SSOT_GUEST_MENU_VIEW |
| /menu/category/[id] | pages/menu/category/[id].vue | ✅ 実装済み | SSOT_GUEST_MENU_VIEW |
| /order/history | pages/order/history.vue | ✅ 実装済み | SSOT_GUEST_ORDER_FLOW |

## 計画中ページ

| パス | ファイル | 状態 | 関連SSOT | 優先度 |
|------|----------|------|----------|--------|
| /info/wifi | pages/info/wifi.vue | ❌ 未実装 | SSOT_GUEST_AI_FAQ_AUTO_RESPONSE | 高 |
| /info/luggage | pages/info/luggage.vue | ❌ 未実装 | SSOT_GUEST_AI_FAQ_AUTO_RESPONSE | 高 |
```

### 完了条件
- [ ] 実装済みページ全件を記載
- [ ] 計画中ページ（SSOTで参照されているが未実装）を記載
- [ ] 各ページの関連SSOTを明記
- [ ] FAQ SSOTの関連SSOTにPage Registryを追加

---

## DEV-0176: FAQ SSOT修正

### 目的
リンク切れを解消し、ユーザー体験を損なわないようにする

### 対象ファイル
- `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md`
- `/Users/kaneko/hotel-common-rebuild/config/faq/_default.json`

### 修正内容

**handoffに変更（推奨・即時対応）**
```json
// Before
{ "type": "info", "url": "/info/luggage", "label": { "ja": "荷物預かりの場所" } }

// After
{ "type": "handoff", "channel": "front_desk", "label": { "ja": "荷物預かりについて問い合わせ" } }
```

### 完了条件
- [ ] リンク切れ箇所を全て修正
- [ ] FAQ設定ファイル（_default.json）も同様に修正
- [ ] 動作確認（curlでFAQ応答を確認）

---

## DEV-0177: SSOT品質チェックリスト更新

### 目的
SSOT作成時にリンク先存在確認を必須化し、再発を防止

### 対象ファイル
`/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`

### 追加内容

```markdown
### 2-5. ページ遷移・リンク整合性確認（新規追加）

**チェック項目**:
- [ ] SSOTで参照するURL/リンク先がPage Registryに存在するか
- [ ] 新規ページを定義する場合、Page Registryに追加したか
- [ ] アクションのurlフィールドが有効なパスか
- [ ] deeplink/info/externalの遷移先が実在するか
```

### 完了条件
- [ ] チェックリストに「ページ遷移・リンク整合性確認」セクション追加
- [ ] チェック項目4件を追加

---

## DEV-0178: /info/* ゲスト向け情報ページ実装

### 目的
FAQ自動応答からリンクされる情報ページを実装

### 作成ファイル

```
hotel-saas-rebuild/pages/info/
├── wifi.vue      # Wi-Fi接続マニュアル
└── luggage.vue   # 荷物預かり案内
```

### 実装要件

**共通**:
- デバイス認証必須（ensureGuestContext使用）
- 多言語対応（ja/en/zh）

**wifi.vue**:
- Wi-Fi接続手順を表示
- トラブルシューティング

**luggage.vue**:
- 荷物預かり場所の案内
- 受付時間

### 完了条件
- [ ] /info/wifi ページ実装・動作確認
- [ ] /info/luggage ページ実装・動作確認
- [ ] FAQ SSOTのURLを本来のパスに復帰
- [ ] Page Registryを更新

---

## DEV-0179: リンク整合性自動チェックスクリプト作成

### 目的
CI/pre-commitでSSOT内のリンク切れを自動検出

### 作成ファイル
`/Users/kaneko/hotel-kanri/scripts/quality/check-ssot-links.cjs`

### 実装要件

```javascript
#!/usr/bin/env node
/**
 * SSOT内のURL参照がPage Registryに存在するかチェック
 */
// 1. Page Registryから有効なパス一覧を取得
// 2. 全SSOTファイルからURL参照を抽出
// 3. Page Registryに存在しないURLを報告
// 4. エラーがあればexit code 1
```

### 完了条件
- [ ] スクリプト作成
- [ ] 単体テスト
- [ ] pre-commit hookに追加

---

## 実行順序

```
1. DEV-0175 実行（30-60分）
2. DEV-0176 実行（15-30分）
3. 動作確認（FAQ応答テスト）
4. DEV-0177 実行（15-30分）
5. DEV-0178 実行（2-3時間）※オプション
6. DEV-0179 実行（1-2時間）※オプション
```

---

## 参照ドキュメント

- `/Users/kaneko/hotel-kanri/.cursorrules` - プロジェクトルール
- `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`
- `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md`
- `/Users/kaneko/hotel-common-rebuild/config/faq/_default.json`

---

## 完了報告フォーマット

各タスク完了時に以下を報告：

```markdown
## DEV-017X 完了報告

### 実施内容
- [実施した内容]

### 変更ファイル
- [変更ファイル一覧]

### 確認結果
- [動作確認結果]
```
