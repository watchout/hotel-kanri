---
title: MVP DEV TASKS – AI Request Sheet
version: 1.0
---

# CONTEXT
INCLUDE docs/MVP_OVERVIEW.md
INCLUDE docs/ORDER_BACKEND_P4.md   # 詳細バックエンド仕様
INCLUDE docs/concierge/AI_CONCIERGE_SPEC.md  # AIコンシェルジュ仕様
INCLUDE docs/phone/IP_PHONE_SPEC.md  # 内線IP電話仕様

# GLOBAL GOAL
Sprint S0-S2 で「客室→配膳完了」までを通しデモ可能にする。
Sprint S3-S4 で「AIコンシェルジュ」機能を実装する。
Sprint S5-S6 で「内線IP電話拡張」機能を実装する。

# MASTER TASK LIST

| ID | Sprint | 内容 | 担当 | DoD |
|----|--------|------|------|-----|
| **S0-1** | S0 | Prisma schema & migrate (SQLite) | BE | migrate dev OK |
| S0-2 | S0 | `POST /orders` + Zod validate | BE | Vitest 201/400/401 |
| S0-3 | S0 | BasicAuth middleware scaffold | BE | 401 テスト |
| S0-4 | S0 | Vitest CI setup | DevOps | Actions 緑 |
| **S0-5** | S0 | 認証システム分離（客室/管理画面） | BE | 相互独立動作確認 |
| **S1-1** | S1 | `pages/orders.vue` + MenuList | FE | UX≥4/5 |
| S1-2 | S1 | `stores/order.ts` (Pinia) | FE | unit pass |
| S1-3 | S1 | Menu mock JSON provider | FE | 100 % hit |
| S1-4 | S1 | Playwright happy path test | QA | 緑 |
| **S1-5** | S1 | デバイス認証ミドルウェア実装 | BE | リダイレクト動作 |
| **S2-1** | S2 | `pages/orders/manage.vue` | FE | 更新反映 |
| S2-2 | S2 | WebSocket server `/ws/orders` | BE | latency <1 s |
| S2-3 | S2 | SFX player util | FE | 再生100 % |
| S2-4 | S2 | E2E: room-kitchen-delivery flow | QA | 緑 |
| **S2-5** | S2 | 管理画面認証ロール実装 | BE | 権限分離確認 |
| **S3-1** | S3 | AIコンシェルジュUI実装 | FE | チャットUI完成 |
| **S3-2** | S3 | `/api/v1/concierge/chat` API実装 | BE | 応答時間<2秒 |
| **S3-3** | S3 | 客室TOPページへのコンシェルジュ統合 | FE | UX≥4/5 |
| **S3-4** | S3 | RAG用ベクトルDB実装 | BE | 検索精度確認 |
| **S3-5** | S3 | 多言語切替機能 | FE | 10言語対応 |
| **S3-5-1** | S3 | useLocale拡張（10言語対応） | FE | 翻訳キー<90% |
| **S3-5-2** | S3 | ハードコード文字列の置換 | FE | カバレッジ100% |
| **S3-5-3** | S3 | グローバル言語切替UI | FE | レイアウト安定 |
| **S3-5-4** | S3 | コンテンツ翻訳API連携 | BE | 自動翻訳<2秒 |
| **S4-1** | S4 | 管理画面: コンテンツアップロード | FE/BE | PDF/テキスト対応 |
| **S4-2** | S4 | 管理画面: 会話ログ・分析 | FE/BE | インサイト表示 |
| **S4-3** | S4 | 利用制限機能実装 | BE | コスト制御確認 |
| **S4-4** | S4 | E2E: AIコンシェルジュフロー | QA | 緑 |
| **S4-5** | S4 | パフォーマンス最適化 | BE | 応答時間<1.5秒 |
| **S5-1** | S5 | WebRTCシグナリングサーバー実装 | BE | NAT越え動作確認 |
| **S5-2** | S5 | スタッフ用電話アプリ/PWA実装 | FE | バックグラウンド通知動作 |
| **S5-3** | S5 | ホテル識別・マルチテナント対応 | BE | 複数ホテル間通話テスト |
| **S5-4** | S5 | 通話録音機能実装 | BE | 録音品質評価 |
| **S5-5** | S5 | 内線経由注文入力UI実装 | FE | 3ステップ以内完了 |
| **S6-1** | S6 | 通話履歴管理機能実装 | FE/BE | 検索・フィルタ動作 |
| **S6-2** | S6 | 文字起こし機能連携 | BE | 認識精度85%以上 |
| **S6-3** | S6 | オペレーター管理機能実装 | FE/BE | 複数ホテル割当動作 |
| **S6-4** | S6 | E2E: 電話注文フロー | QA | 緑 |
| **S6-5** | S6 | セキュリティ強化・最適化 | DevOps | 暗号化・権限設定確認 |

# CURSOR PROMPT EXAMPLE

# Hotel SaaS MVP 開発タスクリスト

## 現在の進捗状況

### ✅ 完了済み
- [x] 基本認証システム（デバイス認証・管理者認証）
- [x] デバイス管理システム（CRUD、検索、フィルタ）
- [x] プレイス管理システム（プレイス・プレイスタイプ）
- [x] オーダー管理システム（注文処理、キッチン・配達画面）
- [x] メニュー管理システム（商品・カテゴリ・タグ）
- [x] 統計・分析システム（フェーズ3完了、約80%完成度）

### 🚧 進行中
- [ ] インフォメーション管理システム（次の実装予定）

---

## Phase 1: インフォメーション管理システム
**期間**: 2-3週間  
**目標**: ホテル案内・FAQ・AIコンシェルジュ機能の実装

### 1.1 記事管理システム
- [ ] 記事CRUD機能実装
- [ ] 画像・動画アップロード機能
- [ ] 多言語対応
- [ ] カテゴリ・タグ管理

### 1.2 FAQ管理システム
- [ ] FAQ CRUD機能実装
- [ ] AI回答システム統合
- [ ] 利用統計・分析機能

### 1.3 客室向けインフォメーション画面
- [ ] 記事表示画面
- [ ] FAQ検索・表示機能
- [ ] AIチャット機能

---

## Phase 2: モバイルアプリ化（Google TV最適化版） 🆕
**期間**: 5週間（WebView形式により短縮）  
**目標**: 客室UIのGoogle TV向けWebViewアプリ化

### 2.1 WebView基盤構築（Week 1）
- [ ] **Capacitorプロジェクト初期化**
  - [ ] `@capacitor/core`, `@capacitor/cli` インストール
  - [ ] `@capacitor/android` セットアップ
  - [ ] `capacitor.config.ts` 設定（WebView形式）
  - [ ] Android TV開発環境構築

- [ ] **WebView実装**
  - [ ] 既存WebアプリのWebView表示
  - [ ] SSL/HTTPS通信確認
  - [ ] 自動起動時のWebアプリ画面表示

- [ ] **Android TV設定**
  - [ ] AndroidManifest.xml TV対応設定
  - [ ] 横画面固定・TV専用ランチャー設定
  - [ ] 基本APKビルド成功

### 2.2 リモコン操作システム（Week 2-3）
- [ ] **十字キー操作実装**
  - [ ] D-pad（上下左右）イベント処理
  - [ ] 決定ボタン・戻るボタン対応
  - [ ] WebView内への操作イベント送信

- [ ] **フォーカス管理システム**
  - [ ] `TVFocusManager` クラス実装
  - [ ] フォーカス可能要素の自動検出
  - [ ] 視覚的フォーカス表示（ハイライト）

- [ ] **WebApp側TV対応**
  - [ ] `useTVDetection` composable作成
  - [ ] TV用CSS適用（大きなフォント・ボタン）
  - [ ] フォーカス移動ロジック実装

### 2.3 TV向けUI最適化（Week 3-4）
- [ ] **大画面レイアウト**
  - [ ] 10フィート視聴距離対応
  - [ ] 商品グリッド3列表示
  - [ ] カート固定表示（右上）

- [ ] **操作性改善**
  - [ ] 商品選択→カート追加の簡単操作
  - [ ] 注文確定までの最短フロー
  - [ ] エラー状態の分かりやすい表示

- [ ] **WebView統合最適化**
  - [ ] `WebAppBridge` クラス実装
  - [ ] ネイティブ⇔Web間の通信確立
  - [ ] デバイス情報の自動送信

### 2.4 テスト・品質保証（Week 4）
- [ ] **実機テスト**
  - [ ] Google TV（Chromecast with Google TV）
  - [ ] Android TV（Sony BRAVIA等）
  - [ ] エミュレータでの動作確認

- [ ] **操作性テスト**
  - [ ] リモコン操作の直感性確認
  - [ ] フォーカス移動の自然さ
  - [ ] 注文フローの完了テスト

- [ ] **パフォーマンステスト**
  - [ ] WebView読み込み速度
  - [ ] 操作レスポンス時間
  - [ ] メモリ使用量確認

### 2.5 Google Play配信準備（Week 5）
- [ ] **TV向けストア素材作成**
  - [ ] TVバナー（1280x720）必須
  - [ ] TVスクリーンショット（1920x1080）× 8枚
  - [ ] アプリアイコン（512x512）

- [ ] **Google Play Console設定**
  - [ ] Android TV対応有効化
  - [ ] アプリ情報入力（日本語・英語）
  - [ ] TV専用説明文作成

- [ ] **リリース準備**
  - [ ] リリース用AABビルド
  - [ ] TV向け設定最終確認
  - [ ] 審査申請

---

## Phase 3: 運用・保守体制構築
**期間**: 継続的  
**目標**: アプリの継続的改善・運用体制確立

### 3.1 監視・分析システム
- [ ] **アプリ分析統合**
  - [ ] Firebase Analytics or Google Analytics
  - [ ] クラッシュレポート（Firebase Crashlytics）
  - [ ] パフォーマンス監視

- [ ] **利用統計収集**
  - [ ] 画面遷移分析
  - [ ] 注文パターン分析
  - [ ] デバイス別利用状況

### 3.2 継続的改善
- [ ] **A/Bテスト機能**
  - [ ] UI/UXの最適化テスト
  - [ ] 機能利用率の改善

- [ ] **フィードバック収集**
  - [ ] アプリ内フィードバック機能
  - [ ] レビュー・評価の分析

### 3.3 将来拡張準備
- [ ] **iOS版検討**
  - [ ] iOS開発環境準備
  - [ ] App Store配信準備

- [ ] **機能拡張**
  - [ ] 音声注文機能
  - [ ] AR/VR対応検討
  - [ ] IoT連携機能

---

## 技術要件・制約事項 🆕

### 開発環境
- **必須ツール**: Android Studio, Node.js 18+, Capacitor CLI
- **対象OS**: Android TV 8.0 (API level 26) 以上
- **対象デバイス**: Google TV, Android TV（32インチ以上推奨）

### WebView要件 🆕
- **表示URL**: 既存WebアプリのHTTPS URL
- **通信**: SSL/TLS必須、HTTP通信禁止
- **操作**: リモコン操作への完全対応
- **表示**: 横画面固定、10フィート視聴距離対応

### パフォーマンス要件
- **起動時間**: 5秒以内（WebView読み込み含む）
- **操作レスポンス**: 0.5秒以内
- **フォーカス移動**: 滑らかなアニメーション
- **メモリ使用量**: 256MB以下

### セキュリティ要件
- **通信**: HTTPS必須、証明書検証
- **WebView**: セキュアな設定、デバッグ無効
- **認証**: 既存デバイス認証システム継続利用

---

## リスク管理 🆕

### 技術的リスク
- **WebView互換性**: 既存WebアプリのTV表示 → 事前検証・調整
- **リモコン操作**: 複雑な操作の簡素化 → プロトタイプでの検証
- **フォーカス管理**: 要素間移動の自然さ → ユーザビリティテスト

### スケジュールリスク
- **Google Play審査**: TV向けアプリの審査期間 → 余裕を持ったスケジュール
- **実機テスト**: TV端末の調達 → エミュレータとの併用

### 品質リスク
- **操作性**: リモコン操作の学習コスト → 直感的なUI設計
- **表示品質**: 大画面での視認性 → 実機での詳細確認

---

**最終更新**: 2024年12月（Google TV最適化版）  
**次回更新予定**: インフォメーション実装完了後

```markdown
# CONTEXT
INCLUDE docs/MVP_DEV_TASKS.md

# TASK
Implement **S0-2 POST /orders** including unit tests.

# OUTPUT
Pull Request + passing Vitest.