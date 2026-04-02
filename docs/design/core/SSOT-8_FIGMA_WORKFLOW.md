# SSOT-8: Figma + AI Design Workflow

**Doc-ID**: SSOT-8
**Version**: 1.0.0
**Created**: 2026-04-03
**Status**: Approved (CEO)
**Source**: hotel-ai-concierge-figma-ai-workflow.md

---


---

## 1. ワークフロー全体像

### 1.1 デザイン→コードのパイプライン

```
Phase 1: 探索・プロトタイプ（1-2日）
  Figma Make（プロンプト→プロトタイプ）
    ↓ 素早くアイデアを形に

Phase 2: デザインシステム構築（3-5日）
  Figma Design（AI支援 + 手動調整）
    ↓ コンポーネント・Variables・トークン定義

Phase 3: コード生成（2-3日）
  Figma MCP → Claude Code
    ↓ デザインをVue/Nuxtコンポーネントに変換

Phase 4: 双方向同期（継続的）
  Claude Code → Figma（Code to Canvas）
    ↓ 実装結果をFigmaに戻してレビュー

Phase 5: テナントカスタマイズ（継続的）
  テーマJSON + Claude API
    ↓ ホテルスタッフが自然言語でテーマ変更
```

### 1.2 ツール構成と役割

| ツール | 役割 | コスト |
|--------|------|--------|
| Figma Make | プロンプトから高忠実度プロトタイプ生成 | AI Credits消費（プランに含む） |
| Figma Design | デザインシステム構築、コンポーネント管理、Variables定義 | Full seat $15-75/月 |
| Figma AI（Design内） | First Draft、自動リネーム、アセット検索、画像編集 | AI Credits消費 |
| Figma MCP Server | FigmaデザインデータをAIコーディングツールに接続 | 無料（ベータ） |
| Claude Code | Figmaデザイン→Vue/Nuxtコード生成、Code to Canvas | Claude Pro/Max |
| Code Connect | Figmaコンポーネントとコードコンポーネントのマッピング | 無料（Figma機能） |

### 1.3 必要なライセンス（MVP段階）

```
Figma:
  Full seat × 1-2名       $15-75/月/人（プランによる）
  ※ Figma MCP利用にはDev or Full seat必須

Claude:
  Claude Pro or Max        $20-100/月
  ※ Claude Code利用に必要

合計: 約$50-250/月（店舗数に依存しない）
```

### 1.4 3つのUIモードの関係

TV画面は以下の3モードで動作する。Figma上での設計も、この3モードを前提に構成する。

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ① アンビエントモード（受動的）                   │
│     無操作時のデフォルト                          │
│     映像 + コンテキスト情報のオーバーレイ           │
│     任意キー押下で②へ遷移                        │
│     Figma工数: 小（映像+オーバーレイのみ）         │
│                                                 │
│  ② レイアウトモード（能動的）★設計の中心★          │
│     従来型のUI操作画面                            │
│     ゾーン構成・メニュー・カード・詳細画面           │
│     2分無操作で①へ戻る                           │
│     Figma工数: 大（全画面・全コンポーネント）       │
│                                                 │
│  ③ 会話モード（対話的）                           │
│     AI会話が画面を占有                            │
│     結果表示は②のコンポーネントを流用              │
│     会話終了で②へ戻る                            │
│     Figma工数: 中（会話UI+②の再構成）             │
│                                                 │
└─────────────────────────────────────────────────┘

モード遷移:
  ① →（任意キー）→ ②
  ② →（2分無操作）→ ①
  ② →（マイクボタン or AIアイコン選択）→ ③
  ③ →（会話終了 or 戻る）→ ②
```

---

## 2. Phase 1: Figma Makeによる高速プロトタイプ

### 2.1 Figma Makeとは

プロンプトを入力するだけで、高忠実度のインタラクティブプロトタイプを自動生成するFigmaの機能。デザインライブラリの読み込みにも対応し、既存のデザインシステムに準拠した出力が可能。

### 2.2 このプロジェクトでの活用方法

#### ステップ1: レイアウトプリセットの探索

各レイアウトプリセット（sidebar-menu / fullscreen-visual / grid-tiles / minimal-zen）の初期案をFigma Makeで高速生成する。

```
プロンプト例（sidebar-menu）:

「ホテル客室TVの画面（1920×1080、ダークモード）を作成。
  左240pxにサイドバーメニュー（温泉・食事・観光・AIコンシェルジュ・
  ルームサービス）。右にコンテンツエリア。
  上部にホテルロゴと時計。下部に操作ガイド。
  日本の高級旅館の雰囲気で、フォント最小24px。
  背景色 #0D1117、カード背景 #161B22。」
```

```
プロンプト例（fullscreen-visual）:

「ホテル客室TVのホーム画面（1920×1080）。
  全画面に美しい風景写真を背景表示。
  画面下部にオーバーレイで半透明メニューバー。
  メニュー項目: AIコンシェルジュ、温泉、食事、観光、サービス。
  右上に時計と天気。和モダンな高級感。
  フォントはセリフ体、文字色白。」
```

#### ステップ2: AI会話画面の探索

```
プロンプト例:

「AIコンシェルジュの会話結果画面（1920×1080、ダークモード）。
  上部にAIアバターと応答テキスト『近くのラーメン屋を3軒見つけました』。
  中央にレストラン推薦カード3枚を横並び（写真・店名・評価・距離）。
  下部に操作ガイド『←→選択 OK詳細 戻る ホームへ』。
  カードは角丸16px、フォーカス状態のカードは青いグロー。」
```

#### ステップ3: アンビエント画面の探索

```
プロンプト例:

「ホテル客室TVのアンビエント画面（1920×1080）。
  背景に温泉旅館の庭園写真。半透明のスクリム。
  右上に大きな時計（80px）と天気。
  左下に控えめな情報カード『露天風呂が空いています』。
  画面下部にごく薄い操作ヒント。全体的にcalm、静かな雰囲気。」
```

### 2.3 Figma Makeの出力をどう使うか

```
Figma Make出力
  ↓ プレビューで確認・フィードバック
  ↓ 良い方向のものを選定
  ↓ 「キャンバスにコピー」でFigma Designに転送
  ↓ Figma Design上でデザインシステムに組み込み
      （コンポーネント化・Variables適用・手動調整）
```

**重要:** Figma Makeの出力はあくまで「出発点」。そのまま実装には使わない。必ずPhase 2でデザインシステムに統合する。

### 2.4 Figma Make利用時の注意

- AI Credits を消費するため、無駄なプロンプトを避ける
- プロンプトは具体的に（サイズ・色・フォントサイズまで指定）
- 出力のコンポーネントはFigmaの正式コンポーネントではないため、手動で変換が必要
- ブランドガイドラインに合わないアイコンやフォントが使われる場合がある

---

## 3. Phase 2: Figma Designでのデザインシステム構築

### 3.1 Figmaファイル構成

```
📁 Hotel AI Concierge（チーム）
  ├── 📄 🎨 Design System          ← コンポーネントライブラリ
  │     ├── Variables（カラー・タイポ・スペーシング）
  │     ├── Components（ボタン・カード・ヘッダー等）
  │     └── Icons（SVGアイコンセット）
  │
  ├── 📄 📺 TV Screens              ← TV画面デザイン
  │     ├── Mode 1: Ambient（アンビエント画面）
  │     ├── Mode 2: Layout（レイアウト画面 ★メイン）
  │     │     ├── Home
  │     │     ├── Category Detail（温泉・食事等）
  │     │     ├── App Launcher
  │     │     ├── Settings
  │     │     └── Welcome / Language Select
  │     └── Mode 3: Conversation（AI会話画面）
  │           ├── Listening State
  │           ├── Thinking State
  │           ├── Result: Cards
  │           ├── Result: Map
  │           └── Result: Text Only
  │
  ├── 📄 📱 Tablet Screens          ← タブレット画面（将来）
  ├── 📄 📱 Mobile Screens          ← スマホ画面（将来）
  │
  ├── 📄 🏨 Tenant Themes           ← テナント別テーマサンプル
  │     ├── Theme: Luxury Hotel
  │     ├── Theme: Traditional Ryokan
  │     ├── Theme: Business Hotel
  │     └── Theme: Resort
  │
  └── 📄 🔄 Prototype Flows         ← プロトタイプフロー
        ├── Guest Journey（CI〜CO）
        ├── AI Conversation Flow
        └── Staff Customization Flow
```

### 3.2 Figma Variablesの設計

デザイントークンをFigma Variables として定義し、テーマの切り替えとCSSへのエクスポートを可能にする。

#### カラーVariables

```
Collection: Colors
  Mode: Default（システム共通）
  Mode: Luxury（高級ホテル向けテーマ）
  Mode: Ryokan（旅館向けテーマ）
  Mode: Business（ビジネスホテル向けテーマ）
  Mode: Resort（リゾート向けテーマ）

Variables:
  color/primary           Default: #1B3A5C   Luxury: #2C3E50   Ryokan: #5B4A3F   ...
  color/primary-light     Default: #2E5A8A   Luxury: #34495E   Ryokan: #7A6B5F   ...
  color/primary-dark      Default: #0F2440   Luxury: #1A252F   Ryokan: #3D3029   ...
  color/secondary         Default: #C9A96E   Luxury: #C9A96E   Ryokan: #D4A76A   ...
  color/accent            Default: #E67E22   Luxury: #E74C3C   Ryokan: #C0392B   ...
  
  bg/base                 Default: #0D1117   （全モード共通 — テナント変更不可）
  bg/surface              Default: #161B22   （全モード共通）
  bg/surface-hover        Default: #1C2333   （全モード共通）
  
  text/primary            Default: #F0F0F0   （全モード共通）
  text/secondary          Default: #8B949E   （全モード共通）
```

#### タイポグラフィVariables

```
Collection: Typography
  Mode: Default（ゴシック体）
  Mode: Serif（明朝体 — 和風テーマ用）

Variables:
  font/primary            Default: Noto Sans JP     Serif: Noto Serif JP
  font/display            Default: Noto Sans JP     Serif: Noto Serif JP

  ※ フォントサイズはVariablesではなくText Stylesで管理
```

#### スペーシングVariables

```
Collection: Spacing
  Mode: Default
  Mode: Senior（シニアモード — 余白拡大）

Variables:
  space/4                 Default: 16    Senior: 20
  space/6                 Default: 24    Senior: 32
  space/8                 Default: 32    Senior: 40
  safe-area/x             Default: 96    Senior: 96（変更なし）
```

### 3.3 Figma AI活用ポイント（Design内）

| 機能 | 使い方 | Credits消費 |
|------|--------|-------------|
| **First Draft** | 新しい画面の叩き台を生成。プロンプトで指示→生成→手動でコンポーネント置換 | 中 |
| **自動リネーム** | 全レイヤーを意味のある名前に一括リネーム。MCP連携の精度向上に直結 | 小 |
| **アセット検索** | 「温泉アイコン」のように自然言語でライブラリ内を検索 | 小 |
| **画像生成（Expand/Erase）** | プレースホルダー画像の生成・編集。プロトタイプの見栄え向上 | 中 |
| **Code-to-Canvas** | 既存のHTMLやReactコードをFigmaのレイヤーに変換 | 中 |

#### First Draftの具体的な使い方

```
Figma Design内で Actions → First Draft を選択

プロンプト例:
「ホテルの温泉詳細画面。左にメニューリスト（大浴場・貸切風呂・足湯）、
  右に選択した温泉の写真と詳細情報（営業時間・混雑状況・泉質）。
  ダークモードで1920×1080。フォント24px以上。」

→ 生成結果を確認
→ レイヤーをコンポーネントライブラリのコンポーネントに差し替え
→ Variablesを適用
→ 手動で微調整
```

#### 自動リネームが重要な理由

```
リネーム前（AIの精度が下がる）:
  Frame 1268
    Group 5
      Rectangle 12
      Text 34

リネーム後（MCP連携の精度が上がる）:
  CategoryDetail
    MenuPanel
      MenuItem-Onsen
      MenuItem-Bath
    ContentPanel
      HeroImage
      InfoSection
```

Figma MCP Serverは**レイヤー名を手がかりにデザイン構造を理解する**。意味のある名前になっていないと、Claude Codeが生成するコードの品質が大幅に下がる。First DraftやMakeで生成した画面は、必ずリネームしてからMCPに渡す。

### 3.4 コンポーネント設計

#### コンポーネントの階層構造

```
Atoms（原子）
  ├── Button（Primary / Secondary / Ghost / Danger）
  ├── Badge（Status: 空き / 混雑 / 満席）
  ├── Icon（64種類のSVGアイコン）
  ├── Avatar（AIコンシェルジュアバター）
  ├── DotIndicator（ページネーション用ドット）
  └── FocusRing（フォーカス状態のグロー）

Molecules（分子）
  ├── InfoBanner（アイコン + タイトル + サブテキスト + ドット）
  ├── DockIcon（アイコン + ラベル + フォーカス状態）
  ├── AppCard（アプリアイコン + 名前 + フォーカス状態）
  ├── RecommendCard（画像 + タイトル + 評価 + 距離 + 価格）
  ├── MenuItem（テキスト + フォーカスインジケーター）
  ├── Toast（アイコン + テキスト + アクセントボーダー）
  └── OperationGuide（アイコン + テキスト × 4項目）

Organisms（有機体）
  ├── Header（ロゴ + ホテル名 + 時計 + 天気）
  ├── MainDock（DockIcon × 5-7）
  ├── AppLauncher（セクションラベル + AppCard × n）
  ├── ConversationPanel（アバター + テキスト + ビジュアルコンポーネント）
  ├── CategoryMenu（MenuItem × n、左パネル）
  ├── CategoryDetail（画像 + 情報テーブル + CTAボタン、右パネル）
  └── AmbientOverlay（時計 + 天気 + 情報カード + 操作ヒント）

Templates（テンプレート = レイアウトプリセット）
  ├── SidebarMenuLayout
  ├── FullscreenVisualLayout
  ├── GridTilesLayout
  └── MinimalZenLayout

Pages（ページ = 実際の画面）
  ├── WelcomeScreen
  ├── LanguageSelectScreen
  ├── HomeScreen（テンプレート × 4バリエーション）
  ├── AmbientScreen（時間帯 × 4バリエーション）
  ├── AIConversationScreen（状態 × 5バリエーション）
  ├── CategoryDetailScreen（カテゴリ × 5）
  ├── AppLauncherScreen
  ├── SettingsScreen
  └── CheckoutScreen
```

#### Figmaでのコンポーネントプロパティ設計

```
コンポーネント: RecommendCard
  Properties:
    - image (Instance Swap) — 写真
    - title (Text) — 店名
    - rating (Text) — 評価（⭐4.5）
    - distance (Text) — 距離（徒歩3分）
    - price (Text) — 価格帯（¥1,000〜）
    - state (Variant) — default / focused / selected / disabled
    - size (Variant) — small / medium / large

コンポーネント: DockIcon
  Properties:
    - icon (Instance Swap) — アイコン
    - label (Text) — ラベルテキスト
    - state (Variant) — default / focused / active
    - showBadge (Boolean) — 通知ドット表示
    - badgeCount (Text) — 通知数（省略可）

コンポーネント: Button
  Properties:
    - label (Text) — ボタンテキスト
    - variant (Variant) — primary / secondary / ghost / danger
    - state (Variant) — default / focused / pressed / disabled
    - icon (Instance Swap) — 左アイコン（省略可）
    - size (Variant) — medium / large
```

### 3.5 フォーカス状態の設計

TV UI特有の設計として、全インタラクティブコンポーネントに**4つの状態**をVariantで定義する。

```
State: default
  → 通常表示。目立たない。

State: focused
  → リモコンのD-padでフォーカスが当たった状態。
  → ボーダーグロー + 微拡大（scale 1.02-1.08）
  → ★最も重要な状態★ TVでは hover が存在しないため

State: pressed
  → OKボタン押下中。縮小（scale 0.95-0.98）
  → 100ms以内に遷移

State: disabled
  → 操作不可。opacity 0.4。フォーカスは受けるがOKに反応しない
```

Figma上では Variant プロパティ `state` で4状態を持たせ、プロトタイプのInteractionsでフォーカス状態の遷移を表現する。

---

## 4. Phase 3: Figma MCP → Claude Codeによるコード生成

### 4.1 セットアップ手順

#### Figma MCP Serverの接続

```bash
# Claude Codeのインストール（未導入の場合）
npm install -g @anthropic-ai/claude-code

# Figmaプラグインのインストール（MCP設定 + Agentスキル含む）
claude plugin add figma

# 接続確認
claude
> /mcp
# → figma サーバーが connected と表示されることを確認
# → Authenticate を選択し、ブラウザでOAuth認証
```

#### リモートMCPサーバー（推奨）

```bash
# リモート接続（Figmaデスクトップアプリ不要）
claude mcp add figma --url https://mcp.figma.com/mcp

# 認証
> /mcp → figma → Authenticate → ブラウザで Allow Access
```

#### デスクトップMCPサーバー（選択ベースの操作時）

```bash
# Figmaデスクトップアプリで:
#   Dev Mode (Shift+D) → Inspect Panel → MCP → Enable

# Claude Codeに追加
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

### 4.2 デザイン→コード変換のワークフロー

#### 基本フロー

```
1. Figma Designでフレームを選択
2. フレームのリンクをコピー（右クリック → Copy link）
3. Claude Codeでプロンプト実行

  > このFigmaデザインをVue 3 + Composition API + Tailwind CSSの
  > コンポーネントとして実装してください。
  > CSS変数はデザイントークンに準拠してください。
  > https://www.figma.com/design/xxxxx/HotelTV?node-id=123-456

4. Claude CodeがMCP経由でデザインデータを読み取り
5. Vue SFC (.vue) ファイルを生成
6. レビュー → 手動調整 → コミット
```

#### コンポーネント単位の変換（推奨）

ページ全体ではなく、**コンポーネント単位で変換する**のがベストプラクティス。

```
変換順序:
  1. Atoms（Button, Badge, Icon）
  2. Molecules（InfoBanner, DockIcon, RecommendCard）
  3. Organisms（Header, MainDock, AppLauncher）
  4. Templates（SidebarMenuLayout）
  5. Pages（HomeScreen）

理由:
  - 小さいコンポーネントほどAIの精度が高い
  - 後のコンポーネントが前のコンポーネントを再利用できる
  - Code Connectの設定がしやすい
```

#### プロンプトテンプレート

```
コンポーネント変換用:

「このFigmaコンポーネントをVue 3のSFCとして実装してください。
  - Composition API + <script setup> を使用
  - スタイリングはTailwind CSS
  - カラーはCSS Custom Properties（--color-primary等）を使用
  - Props: Figmaのコンポーネントプロパティをそのまま Vue props に
  - フォーカス状態: :focus-visible で表現
  - アニメーション: CSS transitionで実装
  - レスポンシブ対応は不要（TV固定解像度）
  https://www.figma.com/design/xxxxx?node-id=xxx」
```

```
ページ変換用:

「このFigma画面をVue 3のページコンポーネントとして実装してください。
  - 既存のコンポーネント（Button, Card等）をimportして使用
  - フォーカスナビゲーション:
    - data-focus-zone属性でゾーン分割
    - ↑↓でゾーン間移動、←→でゾーン内移動
  - キーボードイベント: ArrowUp/Down/Left/Right + Enter + Escape
  - 画面遷移: vue-routerのpushで遷移、Escapeで戻る
  https://www.figma.com/design/xxxxx?node-id=xxx」
```

### 4.3 Code Connectの設定

FigmaコンポーネントとVueコンポーネントの対応関係を定義し、MCP連携時のコード品質を向上させる。

```bash
# Code Connect の初期化
npx figma-code-connect init

# 設定ファイル: figma.config.json
{
  "codeConnect": {
    "parser": "vue",
    "include": ["src/components/**/*.vue"],
    "figmaFileUrl": "https://www.figma.com/design/xxxxx/HotelTV"
  }
}
```

```typescript
// src/components/Button.figma.ts — Code Connect マッピング定義

import figma from '@figma/code-connect'
import Button from './Button.vue'

figma.connect(Button, 'https://www.figma.com/design/xxxxx?node-id=1:100', {
  props: {
    label: figma.string('label'),
    variant: figma.enum('variant', {
      'primary': 'primary',
      'secondary': 'secondary',
      'ghost': 'ghost',
      'danger': 'danger',
    }),
    disabled: figma.boolean('disabled'),
  },
  example: (props) => `<Button variant="${props.variant}" ${props.disabled ? 'disabled' : ''}>${props.label}</Button>`
})
```

```typescript
// src/components/RecommendCard.figma.ts

import figma from '@figma/code-connect'
import RecommendCard from './RecommendCard.vue'

figma.connect(RecommendCard, 'https://www.figma.com/design/xxxxx?node-id=2:200', {
  props: {
    title: figma.string('title'),
    rating: figma.string('rating'),
    distance: figma.string('distance'),
    price: figma.string('price'),
    imageSrc: figma.string('image'),
    size: figma.enum('size', {
      'small': 'sm',
      'medium': 'md',
      'large': 'lg',
    }),
  },
  example: (props) =>
    `<RecommendCard
      title="${props.title}"
      rating="${props.rating}"
      distance="${props.distance}"
      :image-src="${props.imageSrc}"
      size="${props.size}"
    />`
})
```

Code Connectを設定すると、Claude Codeが新しい画面を実装する際に既存のコンポーネントを正しく再利用するようになる。

### 4.4 MCP連携の注意点と制約

| 項目 | 注意 |
|------|------|
| レイヤー名の品質 | 意味のある名前でないとAIの理解度が低下。リネーム必須 |
| Auto Layoutの使用 | Auto Layout使用時の方がコード変換精度が高い。手動配置は避ける |
| 1回の変換単位 | 1コンポーネントor1画面ずつ。複数画面の一括変換は精度低下 |
| ビジネスロジック | MCPはデザインデータのみ。状態管理・API呼び出しは手動追加 |
| イベントハンドラ | Figmaには存在しない。コード生成後に手動で追加 |
| トークン消費 | 複雑な画面ほどトークン消費が多い。予算管理が必要 |
| 片道切符 | Design→Code は高品質。Code→Design→Code の往復は情報欠損あり |

---

## 5. Phase 4: 双方向同期（Code to Canvas）

### 5.1 Claude Code → Figma の流れ

```
1. Claude Codeで実装した画面をブラウザでプレビュー
2. Claude Codeで以下を入力:

  > この画面をFigmaに送ってください

3. ブラウザにキャプチャーツールバーが表示
4. 画面をキャプチャー（複数ページ可）
5. Figma Designに編集可能なレイヤーとして出力

用途:
  - 実装結果のデザインレビュー
  - デザインとの差分確認
  - デザイナーによるアノテーション・フィードバック
```

### 5.2 双方向ワークフロー

```
            ┌─────────────────┐
            │    Figma Design  │
            │  （デザインの源泉）│
            └────────┬────────┘
                     │
           Figma MCP │ Design → Code
                     ▼
            ┌─────────────────┐
            │   Claude Code    │
            │  （実装・調整）    │
            └────────┬────────┘
                     │
       Code to Canvas│ Code → Design
                     ▼
            ┌─────────────────┐
            │  Figma Design    │
            │  （レビュー・修正）│
            └────────┬────────┘
                     │
           Figma MCP │ 修正を反映
                     ▼
            ┌─────────────────┐
            │   Claude Code    │
            │  （最終調整）      │
            └─────────────────┘

注意: このサイクルは2往復程度に留める。
往復が増えるほどビジネスロジックの欠損リスクが高まる。
```

### 5.3 レビュー時のFigmaコメント活用

```
デザイナーがCode to Canvasの結果をレビュー:

  ❌「このカードの角丸が違う」
     → Figmaコメントで指摘、スクリーンショット付き

  ❌「フォーカス時のグローが薄すぎる」
     → Figmaコメントで参考デザインを添付

  ✅「ヘッダーの配置は完璧」
     → Resolveして完了マーク

→ 開発者はFigmaコメントを確認してコード修正
→ 修正版を再度 Code to Canvas でFigmaに送信
→ デザイナーが最終確認 → 承認
```

---

## 6. Phase 5: テナントテーマのカスタマイズフロー

### 6.1 デザイントークン → CSS Variables → テーマJSON

```
Figma Variables（デザインの正）
  ↓ エクスポート（Variables REST API or プラグイン）
CSS Custom Properties（コードの正）
  ↓ テナントごとの値をDB管理
テーマJSON（テナント設定）
  ↓ Claude APIが自然言語から生成・更新
動的テーマ適用（ランタイム）
```

### 6.2 Figmaでのテーマプレビュー

新しいホテルのテーマを作成する際のフロー:

```
1. ホテルからブランドカラー・ロゴ・雰囲気の要望を受け取る

2. Figma DesignでVariablesのModeを追加
   例: 「Yamabuki」モードを新規作成

3. カラーVariablesに値を設定
   color/primary = #5B4A3F（焦げ茶）
   color/secondary = #D4A76A（金）

4. Figma上で全画面がリアルタイムにテーマ反映
   → レイアウトプリセットを選択して確認

5. 承認後、テーマJSONとしてエクスポート
   → hotel-saasのDBに保存

6. スタッフが管理画面から自然言語で微調整可能
   「もう少し赤みを足したい」
   → Claude APIがJSON更新 → プレビュー → 適用
```

### 6.3 新テンプレート追加のフロー

```
1. Figma MakeやFirst Draftで新レイアウト案を探索
2. Figma Designでコンポーネントを使って正式デザイン
3. Figma MCP → Claude Codeでコード化
4. Code Connectでマッピング定義
5. hotel-saasのテンプレート一覧に追加
6. テナントが選択可能に

→ テンプレート追加 = アップセル商品
  「スタンダード: 3テンプレート」
  「プレミアム: 全テンプレート + カスタム対応」
```

---

## 7. Figma AIスキル（Skills）の活用

### 7.1 スキルとは

Figma MCP Serverと組み合わせて使うMarkdownファイル。AIエージェントの動作をカスタマイズし、プロジェクト固有のルールを強制できる。

### 7.2 プロジェクト専用スキルの作成

```markdown
# /figma-hotel-tv スキル

## コンテキスト
ホテル客室TV向けUIの実装。1920×1080固定、ダークモード、リモコンD-pad操作。

## ルール
- 全てのインタラクティブ要素に `data-focusable` 属性を付与すること
- フォーカス状態は `:focus-visible` で定義（:hover は使わない）
- スクロールは一切使用しない。情報の溢れはページネーションで対応
- フォントサイズは24px（1.5rem）以上。20px以下は操作ガイドのみ許可
- 画面は16:9固定。レスポンシブ対応不要
- カラーは全てCSS Custom Properties（var(--color-xxx)）を使用
- z-indexの階層:
    - 0: 背景映像
    - 10: UIコンテンツ
    - 50: トースト通知
    - 100: モーダル/ダイアログ
    - 999: システムオーバーレイ

## コンポーネントの規約
- Vue 3 + Composition API + `<script setup>`
- プロパティ名はFigmaのコンポーネントプロパティ名と一致させる
- emitイベント名は `on` + PascalCase（例: onSelect, onFocusChange）
- アニメーションはCSS transitionを使用。JavaScriptアニメーションは禁止

## フォーカスナビゲーション
- `data-focus-zone="zoneName"` でゾーンを定義
- 同一ゾーン内は ←→ で移動
- ゾーン間は ↑↓ で移動
- Enterキー = OK（決定）
- Escapeキー = 戻る
```

このスキルファイルをプロジェクトルートに配置すると、Claude Codeが自動的に読み込み、全コード生成でこのルールに従う。

---

## 8. MVP段階の実行計画

### 8.1 MVPで作るもの

```
最小限の画面セット:
  ① ホーム画面（sidebar-menuレイアウト1種のみ）
  ② AIコンシェルジュ画面（テキスト入力 + カード結果表示）
  ③ カテゴリ詳細画面（温泉の1画面のみ）
  ④ アプリランチャー（Netflix, YouTube, TVer の3アプリ）
  ⑤ アンビエント画面（時計+天気のシンプル版）

最小限のコンポーネント:
  - Button（primary / secondary）
  - DockIcon（5アイコン）
  - AppCard（3アプリ）
  - RecommendCard（AIの結果表示用）
  - Header（ロゴ+時計+天気）
  - OperationGuide（操作ヒント）
  - Toast（通知）
  - FocusRing（フォーカスインジケーター）
```

### 8.2 MVP実行タイムライン

```
Week 1: 探索 + デザインシステム基盤
  Day 1-2:
    - Figma Makeで4つのレイアウトプリセットを探索
    - AI会話画面のバリエーションを5パターン生成
    - 方向性を決定

  Day 3-5:
    - Figma DesignにVariables定義（カラー・タイポ・スペーシング）
    - Atomsコンポーネント作成（Button, Badge, Icon, FocusRing）
    - Moleculesコンポーネント作成（DockIcon, AppCard, RecommendCard）

Week 2: 画面デザイン + コード生成
  Day 6-7:
    - Organisms作成（Header, MainDock, AppLauncher）
    - ホーム画面デザイン完成
    - カテゴリ詳細画面デザイン完成

  Day 8-9:
    - AI会話画面デザイン完成
    - アンビエント画面デザイン完成
    - 全レイヤーのリネーム（MCP精度向上のため）

  Day 10:
    - Figma MCP → Claude Code でAtoms/Moleculesをコード生成
    - Code Connect設定

Week 3: 実装 + レビュー
  Day 11-12:
    - Organisms → Pages のコード生成
    - フォーカスナビゲーション実装
    - 画面遷移実装

  Day 13-14:
    - Code to Canvas でFigmaに戻してデザインレビュー
    - フィードバック反映
    - テーマJSON構造の確定

  Day 15:
    - 1ホテル分のテーマ適用テスト
    - Google TV実機での表示確認
    - MVP完成
```

### 8.3 MVPで後回しにするもの

| 項目 | 理由 | Phase |
|------|------|-------|
| 残り3レイアウトプリセット | sidebar-menuで検証してから | Phase 2 |
| 音声入力 | テキスト入力で先にAI体験を検証 | Phase 2 |
| サウンドデザイン | 視覚UIが固まってから | Phase 2 |
| シニアモード | 標準モードの完成度優先 | Phase 3 |
| 子供モード | 標準モードの完成度優先 | Phase 3 |
| 多言語UI（8言語） | まず日本語+英語の2言語 | Phase 2 |
| タブレット/スマホUI | TV版が確定してから | Phase 3 |
| テンプレートのアップセル機能 | ビジネスモデル検証後 | Phase 3 |

---

## 9. ファイル命名・出力規約

### 9.1 Figma内の命名規則

```
ページ名:
  🎨 Design System
  📺 TV / Home
  📺 TV / Category Detail
  📺 TV / AI Conversation
  📺 TV / Ambient
  📺 TV / App Launcher

フレーム名:
  TV-Home-SidebarMenu-Default
  TV-Home-SidebarMenu-Focused-Onsen
  TV-CategoryDetail-Onsen-Default
  TV-Conversation-Result-Cards
  TV-Ambient-Morning

コンポーネント名:
  Atoms/Button
  Atoms/Badge
  Molecules/DockIcon
  Molecules/RecommendCard
  Organisms/Header
  Organisms/MainDock
```

### 9.2 生成コードの出力先

```
src/
  components/
    atoms/
      Button.vue
      Badge.vue
      Icon.vue
      FocusRing.vue
    molecules/
      DockIcon.vue
      AppCard.vue
      RecommendCard.vue
      InfoBanner.vue
      Toast.vue
    organisms/
      Header.vue
      MainDock.vue
      AppLauncher.vue
      ConversationPanel.vue
      CategoryMenu.vue
    templates/
      SidebarMenuLayout.vue
      FullscreenVisualLayout.vue
  pages/
    tv/
      index.vue          ← ホーム
      ambient.vue        ← アンビエント
      conversation.vue   ← AI会話
      category/
        [id].vue         ← カテゴリ詳細
  styles/
    tokens.css           ← デザイントークン（CSS Variables）
    focus.css            ← フォーカスナビゲーション
  composables/
    useFocusNavigation.ts ← フォーカス管理ロジック
    useAmbientState.ts    ← アンビエント状態管理
    useTheme.ts           ← テーマ動的適用
  figma/
    Button.figma.ts       ← Code Connect定義
    RecommendCard.figma.ts
    ...
```

---

## 10. チェックリスト

### Phase 1 完了条件
- [ ] Figma Makeで4レイアウトプリセットの探索完了
- [ ] AI会話画面のバリエーション5パターン生成完了
- [ ] レイアウト方針の決定（sidebar-menuをMVPに採用）

### Phase 2 完了条件
- [ ] Figma Variables定義完了（カラー・タイポ・スペーシング）
- [ ] 全Atomsコンポーネント作成完了（4種）
- [ ] 全Moleculesコンポーネント作成完了（7種）
- [ ] 全Organismsコンポーネント作成完了（7種）
- [ ] MVP対象の全画面デザイン完了（5画面）
- [ ] 全レイヤーのリネーム完了
- [ ] フォーカス状態の4 Variant 全コンポーネントに設定

### Phase 3 完了条件
- [ ] Figma MCPの接続・認証完了
- [ ] Atoms/Molecules のコード生成完了
- [ ] Code Connect マッピング設定完了
- [ ] Organisms/Pages のコード生成完了
- [ ] フォーカスナビゲーション実装完了
- [ ] テーマJSON構造の確定

### Phase 4 完了条件
- [ ] Code to Canvas で全画面のデザインレビュー完了
- [ ] デザイナーフィードバック反映完了
- [ ] Google TV実機での表示確認完了

### Phase 5 完了条件
- [ ] 1ホテル分のテーマ適用テスト完了
- [ ] スタッフ向け自然言語カスタマイズのプロトタイプ動作確認

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-04-03 | 1.0 | 初版作成 |
