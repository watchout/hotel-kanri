# BlockNoteベース TOPページエディタ 詳細仕様書

## 1. 概要

本仕様書は、hotel-saasプロジェクトにおけるTOPページエディタをBlockNoteベースで実装するための詳細仕様を定義するものである。従来のGrapesJSベースのエディタから、より軽量で使いやすいBlockNoteベースのエディタへの移行を目的としている。

## 2. 背景と目的

### 2.1 背景

現在のGrapesJSベースのエディタでは、以下の課題が発生している：

- 16:9比率のTV表示に適合させる際に表示の問題が発生
- エディタ内でのサイズ調整が難しく、正確なプレビューが困難
- 複雑な設定が必要で、トラブルシューティングが困難

### 2.2 目的

BlockNoteベースのエディタ実装により、以下の目標を達成する：

- コードを書けないユーザーでも直感的に編集可能なインターフェースの提供
- 16:9比率のTV表示に最適化されたエディタ環境の構築
- 軽量で高速な編集体験の実現
- テンプレートベースの編集ワークフローの確立

## 3. 機能要件

### 3.1 基本機能

#### 3.1.1 エディタ基本機能

- ブロックベースの編集インターフェース
- リッチテキスト編集（太字、斜体、リンク等）
- ドラッグ＆ドロップによるブロック並べ替え
- コピー＆ペースト機能
- 元に戻す・やり直し機能

#### 3.1.2 カスタムブロック

以下のカスタムブロックを実装する：

- **ヘッダーブロック**：ロゴ、天気、言語切替、ホームボタンを配置
- **メインコンテンツブロック**：キャンペーン情報（左65%）とAIコンシェルジュ（右35%）
- **フッターブロック**：5つのナビゲーションボタンを配置
- **画像ブロック**：画像の挿入と編集
- **ボタンブロック**：クリック可能なボタンの挿入
- **区切りブロック**：セクション間の区切り線

#### 3.1.3 テンプレート機能

以下のテンプレートを事前定義する：

1. **ラグジュアリークラシック**：ゴールドベースの高級感あるデザイン
2. **モダンラグジュアリー**：シンプルで洗練されたデザイン
3. **ファミリーポップ**：カラフルで親しみやすいデザイン
4. **和モダン**：和のテイストを取り入れたモダンなデザイン
5. **ナチュラルリゾート**：自然を感じる落ち着いたデザイン
6. **アーバンスタイリッシュ**：都会的でスタイリッシュなデザイン

#### 3.1.4 保存と公開機能

- 下書き保存機能
- 公開前のプレビュー機能
- バージョン履歴機能（最新10件まで）
- 公開/非公開切り替え機能

### 3.2 UI/UX要件

#### 3.2.1 エディタUI

- シンプルで直感的なツールバー
- サイドパネルでのブロック選択
- プロパティパネルでのブロック設定
- ドラッグハンドルによる並べ替え
- リアルタイムプレビュー

#### 3.2.2 16:9比率の最適化

- エディタ表示領域を16:9比率に固定
- スケーリング機能による異なる解像度への対応
- 表示範囲外の警告表示
- グリッドガイド表示

#### 3.2.3 レスポンシブ設計

- 編集時の画面サイズ切り替え機能
- 異なるTV解像度でのプレビュー機能
  - 1280×720 (720p)
  - 1920×1080 (1080p)

## 4. 技術仕様

### 4.1 使用技術

- **BlockNote**: ベースとなるブロックエディタライブラリ
- **Vue 3/Nuxt 3**: フレームワーク
- **TypeScript**: 型安全な実装
- **TailwindCSS**: スタイリング

### 4.2 データ構造

#### 4.2.1 ページデータ構造

```typescript
interface PageData {
  id: string;
  title: string;
  content: BlockNoteContent;
  template: TemplateType;
  css: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  isPublished: boolean;
}

type TemplateType = 'luxury-classic' | 'modern-luxury' | 'family-pop' | 'wa-modern' | 'natural-resort' | 'urban-stylish';

interface BlockNoteContent {
  blocks: Block[];
  version: string;
}

interface Block {
  id: string;
  type: string;
  props: Record<string, any>;
  content?: Block[];
}
```

#### 4.2.2 カスタムブロック定義

```typescript
interface CustomBlockDefinition {
  type: string;
  name: string;
  icon: string;
  render: (props: any) => JSX.Element;
  props: Record<string, PropDefinition>;
}

interface PropDefinition {
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'image';
  label: string;
  default: any;
  options?: any[];
}
```

### 4.3 API仕様

#### 4.3.1 ページデータ取得API

```
GET /api/v1/admin/pages/top
```

レスポンス:
```json
{
  "id": "top-page",
  "title": "トップページ",
  "content": { ... },
  "template": "luxury-classic",
  "css": "...",
  "version": 1,
  "createdAt": "2023-08-01T00:00:00Z",
  "updatedAt": "2023-08-01T00:00:00Z",
  "publishedAt": "2023-08-01T00:00:00Z",
  "isPublished": true
}
```

#### 4.3.2 ページデータ保存API

```
POST /api/v1/admin/pages/top
```

リクエストボディ:
```json
{
  "content": { ... },
  "template": "luxury-classic",
  "css": "...",
  "isPublished": false
}
```

#### 4.3.3 ページ公開API

```
POST /api/v1/admin/pages/top/publish
```

リクエストボディ:
```json
{
  "version": 1
}
```

#### 4.3.4 テンプレート一覧取得API

```
GET /api/v1/admin/templates
```

レスポンス:
```json
[
  {
    "id": "luxury-classic",
    "name": "ラグジュアリークラシック",
    "thumbnail": "/images/templates/luxury-classic.jpg",
    "content": { ... },
    "css": "..."
  },
  ...
]
```

### 4.4 コンポーネント構成

```
components/
  admin/
    layouts/
      BlockNoteEditor.vue       # BlockNoteエディタコンポーネント
      BlockNoteToolbar.vue      # エディタツールバー
      BlockNotePreview.vue      # プレビューコンポーネント
      blocks/                   # カスタムブロック
        HeaderBlock.vue
        MainContentBlock.vue
        FooterBlock.vue
        ImageBlock.vue
        ButtonBlock.vue
        DividerBlock.vue
      templates/                # テンプレート
        LuxuryClassicTemplate.vue
        ModernLuxuryTemplate.vue
        FamilyPopTemplate.vue
        WaModernTemplate.vue
        NaturalResortTemplate.vue
        UrbanStylishTemplate.vue
```

## 5. 実装計画

### 5.1 フェーズ1: 基盤構築

- BlockNoteライブラリの導入
- 基本的なエディタコンポーネントの実装
- APIとの連携

### 5.2 フェーズ2: カスタムブロック実装

- 各カスタムブロックの実装
- ブロック間の相互作用の実装
- スタイリングの適用

### 5.3 フェーズ3: テンプレート実装

- テンプレートの定義
- テンプレート適用機能の実装
- テンプレートプレビュー機能の実装

### 5.4 フェーズ4: 16:9最適化

- 16:9比率の表示最適化
- スケーリング機能の実装
- レスポンシブ対応

### 5.5 フェーズ5: テストと調整

- 各機能のテスト
- パフォーマンス最適化
- UX改善

## 6. 制約事項

- BlockNoteはReactベースのライブラリであるため、Vue環境での統合には追加の対応が必要
- 16:9比率の厳密な維持が必要
- TV表示に適したUIサイズ（ボタン、フォント等）の確保
- エディタ内での操作性とTV表示の両立

## 7. 参考資料

- [BlockNote公式ドキュメント](https://www.blocknotejs.org/docs)
- [TV_LAYOUT_SPECIFICATION.md](../features/TV_LAYOUT_SPECIFICATION.md)
- 既存のTOPページデザイン仕様書

## 8. 承認

本仕様書は、以下の関係者によって承認されています。

- プロジェクト管理者: _________________
- 開発責任者: _________________
- デザイン責任者: _________________

承認日: 2025年__月__日
