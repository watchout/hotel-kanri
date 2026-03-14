# SSOT: ゲスト向けページレジストリ

**Doc-ID**: SSOT-GUEST-PAGE-REGISTRY-001
**バージョン**: 1.0.0
**作成日**: 2026年1月15日
**最終更新**: 2026年1月15日
**ステータス**: ✅ 確定
**所有者**: Luna（hotel-saas担当AI）
**優先度**: 🔴 最高（全SSOT作成時必須参照）

**Planeタスク**: DEV-0175

---

## 概要

### 目的

ゲスト向けページの正式な一覧を管理し、SSOTとの整合性を確保するための中央レジストリ。

### 適用範囲

- **対象システム**: hotel-saas-rebuild（ゲスト向けフロントエンド）
- **対象パス**: `/pages/` 配下の非admin系ページ
- **参照タイミング**: 新規SSOT作成時、リンク定義時

### 背景

FAQ自動応答（DEV-0160シリーズ）実装時、SSOTで参照されるページが存在しないリンク切れが発生。このレジストリにより再発を防止する。

---

## 実装済みページ

| パス | ファイル | 状態 | 関連SSOT | 備考 |
|------|----------|------|----------|------|
| `/menu` | `pages/menu/index.vue` | ✅ 実装済み | SSOT_GUEST_MENU_VIEW | メニュー一覧 |
| `/menu/category/[id]` | `pages/menu/category/[id].vue` | ✅ 実装済み | SSOT_GUEST_MENU_VIEW | カテゴリ別メニュー |
| `/menu/item/[id]` | `pages/menu/item/[id].vue` | ✅ 実装済み | SSOT_GUEST_MENU_VIEW | 商品詳細 |
| `/order/history` | `pages/order/history.vue` | ✅ 実装済み | SSOT_GUEST_ORDER_FLOW | 注文履歴 |
| `/unauthorized-device` | `pages/unauthorized-device.vue` | ✅ 実装済み | SSOT_SAAS_DEVICE_AUTHENTICATION | 未認証デバイス画面 |
| `/info/wifi` | `pages/info/wifi.vue` | ✅ 実装済み | SSOT_GUEST_AI_FAQ_AUTO_RESPONSE | Wi-Fi接続ガイド |
| `/info/luggage` | `pages/info/luggage.vue` | ✅ 実装済み | SSOT_GUEST_AI_FAQ_AUTO_RESPONSE | 荷物預かり案内 |

---

## 計画中ページ

現在、計画中のページはありません。

---

## 実装履歴

| パス | 実装日 | DEVタスク | 備考 |
|------|--------|-----------|------|
| `/info/wifi` | 2026-01-15 | DEV-0178 | FAQ自動応答からのリンク先 |
| `/info/luggage` | 2026-01-15 | DEV-0178 | FAQ自動応答からのリンク先 |

---

## SSOT連携ルール

### 新規SSOT作成時

1. **SSOT内でURLを定義する前にこのレジストリを確認**
2. **未実装ページを参照する場合は「計画中ページ」セクションに追加**
3. **`handoff` アクションを代替として使用（即時対応）**

### リンク整合性チェック

```bash
# スクリプト: scripts/quality/check-ssot-links.cjs
# CI/pre-commitで自動実行

# 手動チェック
node scripts/quality/check-ssot-links.cjs
```

---

## アクションタイプとURL要否

| アクションタイプ | URL必須 | レジストリ確認 | 備考 |
|-----------------|---------|----------------|------|
| `deeplink` | ✅ | ✅ 必須 | アプリ内遷移 |
| `info` | ✅ | ✅ 必須 | 情報ページ表示 |
| `external` | ✅ | ❌ 不要 | 外部サイト |
| `upsell` | ❌ | - | 商品IDで指定 |
| `handoff` | ❌ | - | チャネル指定 |

---

## 更新履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-15 | 初版作成（DEV-0175） | Luna |

---

**最終更新**: 2026年1月15日
**作成者**: Luna（hotel-saas担当AI）
