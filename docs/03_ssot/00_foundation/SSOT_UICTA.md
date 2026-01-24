## ✅ SSOT作成完了報告

### 作成したSSO

- **ファイル名**: `SSOT_GUEST_HANDOFF_PHONE_CTA_UI.md`
- **パス**: `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/ai_chat/`
- **バージョン**: v1.0.0
- **優先度**: 🔴 必須
- **対象システム**: hotel-saas（ゲストUI）
- **行数**: 698行

---

### SSOT概要

**目的**: ゲストがAIチャットで「handoff」アクション（スタッフ対応要求）をクリックした際に、60秒の待機状態を表示し、タイムアウト時には電話CTAを提示することで、確実なサポート導線を確保する。

**スコープ**:
- ゲスト側のUI実装（待機画面、電話CTA画面）
- 既存APIの活用（新規APIは不要）
- カウントダウンタイマー＋ポーリング
- エラー時のフォールバック

---

### Phase 1: 既存調査結果

#### ✅ 既存SSOT確認済み

1. **SSOT_GUEST_AI_HANDOFF.md** - ゲスト側ハンドオフAPI・データベース設計
2. **SSOT_ADMIN_HANDOFF_NOTIFICATION.md** - Admin側通知機能
3. **SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md** - AIチャットWidget
4. **SSOT_SAAS_DEVICE_AUTHENTICATION.md** - デバイス認証
5. **SSOT_QUALITY_CHECKLIST.md** - SSOT品質基準

#### ✅ 既存ソース確認済み

- `/Users/kaneko/hotel-saas-rebuild/components/ai/AIChatWidget.vue`
  - 現在の`handleHandoff`はログ出力のみ（268-273行目）
  - 今回のSSOTで実装を追加
  
- `/Users/kaneko/hotel-saas-rebuild/pages/admin/handoff/index.vue`
  - Admin側UI実装済み（DEV-0172で完了）
  
- `/Users/kaneko/hotel-saas-rebuild/composables/useHandoffRequests.ts`
- `/Users/kaneko/hotel-saas-rebuild/composables/useHandoffPolling.ts`
  - Admin側のcomposables実装済み

#### ✅ 整合性確認済み

- **認証**: デバイス認証（`useApi()`で自動対応）
- **APIパス**: `/api/v1/guest/handoff/requests`（既存、`SSOT_GUEST_AI_HANDOFF.md`で定義済み）
- **データベース**: `handoff_requests`テーブル（既存、変更なし）
- **命名規則**: snake_case + @map（Prisma）
- **Config設定**: Marketing Injection対応（`handoff.fallback_phone`等）

---

### Phase 2: SSOT作成チェック

#### ✅ データベース命名規則準拠

- 新規テーブルなし（既存の`handoff_requests`を使用）

#### ✅ APIルーティングガイドライン準拠

- 新規APIなし（既存APIを活用）
- ゲスト側: `/api/v1/guest/handoff/requests`
- Admin側: `/api/v1/admin/handoff/requests`

#### ✅ UI実装可能性確認済み

- **新規コンポーネント**:
  - `components/ai/HandoffWaitingDialog.vue`（待機画面）
  - `components/ai/HandoffPhoneCTA.vue`（電話CTA画面）
  
- **既存コンポーネント修正**:
  - `components/ai/AIChatWidget.vue`（handleHandoff実装）
  
- **UIフレームワーク**: Vuetify 3（既存パターンと統一）
- **レスポンシブ**: max-width="420"（既存AIチャットと同じ）

#### ✅ システム間連携想定済み

- hotel-saas → hotel-common: 既存API呼び出し（`useApi()`）
- ポーリング: クライアント側（2秒間隔）
- Phase 2: WebSocket（将来実装）

---

### Phase 3: 最終チェック

#### ✅ ロードマップ記載のファイル名

- ファイル名: `SSOT_GUEST_HANDOFF_PHONE_CTA_UI.md`
- 配置場所: `docs/03_ssot/02_guest_features/ai_chat/`
- 他の関連SSOT（`SSOT_GUEST_AI_HANDOFF.md`等）と同じディレクトリに配置

#### ✅ 品質基準クリア

- [ ] ✅ これ以上のクオリティで作れないレベル
- [ ] ✅ 曖昧な表現なし（具体的な実装例あり）
- [ ] ✅ エラーハンドリング明記
- [ ] ✅ Accept条件明確（Phase 1のチェックリスト）
- [ ] ✅ Config設定対応（Marketing Injection）
- [ ] ✅ Analytics追跡定義（Tracking by Default）

#### ✅ 自己チェックリスト全項目クリア

**整合性チェック**:
- [x] 既存のドキュメント及びソースに準拠
- [x] 既存SSOTと変数やパスに矛盾なし
- [x] データベース命名規則準拠（該当なし、既存テーブル使用）
- [x] APIルーティングガイドライン準拠（該当なし、既存API使用）

**品質チェック**:
- [x] これ以上のクオリティで作れないレベル
- [x] システム間連携を完璧に想定
- [x] 現在のUI構成をそのまま使える（Vuetify 3）

**形式チェック**:
- [x] 管理画面用と客室端末用でSSOT分離（このSSOTは客室端末用）
- [x] バージョン情報記載（v1.0.0）
- [x] 関連SSOTへのリンクあり

**実装可能性チェック**:
- [x] 実装手順が明確（コンポーネント単位で定義）
- [x] エラーハンドリング定義済み
- [x] Accept条件明確（Phase 1のチェックリスト）
- [x] 実装チェックリストあり

---

## 📊 SSOT構成

### 必須セクション

1. **概要**（目的、スコープ、関連SSOT）✅
2. **要件ID一覧**（機能要件、非機能要件）✅
3. **データベース設計**（既存テーブル参照のみ）✅
4. **API設計**（既存API活用、新規なし）✅
5. **UI設計**（画面一覧、画面仕様、レイアウト）✅
6. **実装仕様**（具体的なコード例）✅
7. **Accept**（合格条件、Phase別チェックリスト）✅

### 追加セクション

- **実装チェックリスト**（Phase 1/Phase 2）✅
- **Config設定**（Marketing Injection対応）✅
- **Analytics追跡**（Tracking by Default）✅
- **関連ドキュメント**（5件のSSOT参照）✅
- **変更履歴**（v1.0.0初版）✅

---

## 🎯 主要機能

### Phase 1（MVP）

1. **待機画面表示** (HDF-UI-001)
   - handoffアクションクリック時
   - 60秒カウントダウンタイマー
   - プログレスバー
   - ポーリング（2秒間隔）

2. **電話CTA表示** (HDF-UI-003)
   - タイムアウト時
   - 電話番号強調表示（24px以上）
   - フォールバック番号（内線100）

3. **キャンセル機能** (HDF-UI-005)
   - 待機中止ボタン
   - ポーリング停止

### Phase 2（将来）

- スタッフ応答時にチャット画面へ遷移
- WebSocket接続でリアルタイム通知

---

## 🔍 品質保証

### テストケース（Accept条件）

- [ ] handoffボタンクリック→待機画面表示
- [ ] カウントダウンが1秒ごとに更新
- [ ] 60秒経過で電話CTA表示
- [ ] キャンセルボタンで画面終了
- [ ] エラー時に電話CTA即座表示
- [ ] 電話番号が24px以上で表示
- [ ] プログレスバーが正常動作
- [ ] メモリリークなし（onUnmounted）

### セキュリティ

- デバイス認証必須（`useApi()`で自動）
- テナント分離完全（API側で保証）
- XSS対策（Vueのエスケープ）

---

## 次のステップ

このSSOTに基づいて実装を開始してよろしいでしょうか？

実装範囲:
1. `components/ai/HandoffWaitingDialog.vue`作成
2. `components/ai/HandoffPhoneCTA.vue`作成
3. `components/ai/AIChatWidget.vue`修正（handleHandoff実装）
4. 統合テスト

実装時間目安: 2-3時間（コンポーネント作成＋統合＋テスト）
