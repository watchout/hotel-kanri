# AIコンシェルジュ 質問＆回答ツリー仕様書

*Version: 1.0.0 - 2025-07-30*

## 1. 概要

AIコンシェルジュの質問＆回答ツリー機能は、TVリモコン操作に最適化された階層型ナビゲーションシステムを提供します。ホテルスタッフが直感的に質問と回答のツリー構造を管理できる機能を実装します。

## 2. 目的

- TVリモコンでの簡単な操作で情報にアクセスできるUIを提供
- 質問と回答の階層構造を視覚的に管理できる管理画面の実装
- スマホ連携によるチャット形式での詳細な対話機能の提供

## 3. 質問＆回答ツリーの構造

### 3.1 データ構造

```typescript
// ツリーノード（カテゴリまたは質問）
interface TreeNode {
  id: string;
  type: 'category' | 'question';
  title: string;
  description?: string;
  icon?: string;
  order: number;
  parentId: string | null;
  children?: string[]; // 子ノードのID配列
}

// 質問ノード固有のデータ
interface QuestionNode extends TreeNode {
  type: 'question';
  answer: {
    text: string;
    media?: {
      type: 'image' | 'pdf' | 'video';
      url: string;
      caption?: string;
    }[];
    relatedQuestions?: string[]; // 関連質問のID配列
  };
  translations?: {
    [languageCode: string]: {
      title: string;
      answer: {
        text: string;
        media?: {
          caption?: string;
        }[];
      };
    };
  };
}

// カテゴリノード固有のデータ
interface CategoryNode extends TreeNode {
  type: 'category';
  isRoot?: boolean;
}

// ツリー全体の構造
interface ResponseTree {
  id: string;
  name: string;
  rootCategoryIds: string[];
  nodes: {
    [nodeId: string]: TreeNode;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  version: number;
}
```

### 3.2 階層制限

- 最大3階層まで（カテゴリ > サブカテゴリ > 質問）
- 各カテゴリ内の項目数は最大8個まで（TVでの表示最適化）

## 4. 質問＆回答ツリーのセットアップフロー

### 4.1 テンプレート選択
- 基本テンプレート（一般的なホテル質問カテゴリが事前定義）
- 空のツリー（ゼロから構築）
- 既存データインポート（CSV/JSON）

### 4.2 ツリー構造の定義
1. **メインカテゴリの設定**
   - 施設案内、客室サービス、周辺情報などの大分類
   - カテゴリ名と簡単な説明の入力
   - アイコン選択（視覚的識別用）

2. **サブカテゴリの追加**
   - 各メインカテゴリ下に第2階層の質問グループを作成
   - 例：施設案内 → レストラン、スパ、プールなど

3. **質問項目の登録**
   - 最終階層に具体的な質問項目を追加
   - 例：レストラン → 「営業時間は？」「予約は必要？」など
   - 質問の表示順序の調整

### 4.3 回答コンテンツの作成
1. **回答テキストの入力**
   - 各質問に対する回答文の入力
   - リッチテキストエディタでの書式設定
   - 多言語対応の場合は言語ごとの入力フィールド

2. **メディア添付**
   - 関連画像の追加（レストランの写真など）
   - PDFファイルのリンク（メニュー表など）
   - 動画コンテンツの埋め込み（施設紹介動画など）

3. **関連質問の設定**
   - 現在の質問に関連する他の質問へのリンク
   - 「次におすすめの質問」の設定

### 4.4 プレビューと検証
1. **ツリー構造の視覚化**
   - 完成したツリー構造の全体図表示
   - ノード間の関係性の確認
   - バランス調整（各カテゴリの質問数など）

2. **ユーザー体験のシミュレーション**
   - TV画面でのナビゲーション体験のプレビュー
   - リモコン操作のテスト
   - 実際の表示サイズと可読性の確認

### 4.5 公開と更新計画
1. **公開設定**
   - 即時公開または日時指定公開の選択
   - 特定の部屋タイプのみに公開などの制限設定
   - テスト公開（スタッフのみ閲覧可）オプション

2. **更新サイクルの設定**
   - 定期的な見直しリマインダーの設定
   - 季節情報など期限付きコンテンツの有効期限設定
   - 更新担当者のアサイン

## 5. 管理画面のUI設計

### 5.1 視覚的エディタ
1. **ツリービュー**
   - フォルダ構造のような階層表示
   - ドラッグ&ドロップでの並べ替え
   - 展開/折りたたみ機能

2. **マインドマップビュー**
   - 放射状の視覚的ツリー表示
   - ノードの追加・削除・編集
   - 全体構造の俯瞰

3. **テーブルビュー**
   - 表形式での質問・回答一覧
   - 一括編集機能
   - フィルタリングとソート

### 5.2 編集ツール
1. **ノード編集パネル**
   - 質問テキスト入力
   - 回答エディタ（リッチテキスト対応）
   - メディア添付ツール

2. **バルクオペレーション**
   - 複数質問の一括移動
   - カテゴリ全体のコピー/移動
   - テンプレートからの一括追加

3. **バージョン管理**
   - 変更履歴の記録
   - 以前のバージョンへの復元
   - 変更内容の差分表示

## 6. TV向け表示UI

### 6.1 ナビゲーション
- 大きなボタンと明確なフォーカス表示
- リモコンの十字キーで直感的に操作
- 常に表示される「戻る」「ホーム」ボタン
- 現在位置の階層パンくずリスト

### 6.2 コンテンツ表示
- 大きなフォントサイズと高コントラスト
- 画像は適切なサイズで表示
- スクロールは最小限に抑える
- 関連質問を下部に表示

### 6.3 QRコード連携
- 画面右下に常時QRコードを表示
- スキャンするとスマホでチャット形式の対話が可能
- セッション同期による会話の継続性

## 7. スマホ連携UI

### 7.1 チャットインターフェース
- モバイル最適化されたチャットUI
- テキスト入力による自由な質問
- 多言語対応（言語切替機能）
- 音声入力オプション

### 7.2 拡張機能
- 位置情報と連携した周辺施設案内
- 予約機能との連携（レストラン予約等）
- 画像・写真のアップロード機能（質問の補足として）

## 8. APIエンドポイント

### 8.1 管理API
```
GET    /api/v1/admin/concierge/response-trees
POST   /api/v1/admin/concierge/response-trees
GET    /api/v1/admin/concierge/response-trees/:id
PUT    /api/v1/admin/concierge/response-trees/:id
DELETE /api/v1/admin/concierge/response-trees/:id
POST   /api/v1/admin/concierge/response-trees/:id/publish
POST   /api/v1/admin/concierge/response-trees/:id/unpublish
POST   /api/v1/admin/concierge/response-trees/:id/duplicate
GET    /api/v1/admin/concierge/response-trees/:id/versions
POST   /api/v1/admin/concierge/response-trees/:id/restore/:versionId
```

### 8.2 クライアントAPI
```
GET    /api/v1/concierge/response-tree
GET    /api/v1/concierge/response-tree/node/:nodeId
POST   /api/v1/concierge/response-tree/search
GET    /api/v1/concierge/qr-session/:sessionId
```

## 9. データベースモデル

```prisma
model ResponseTree {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  publishedAt DateTime?
  version     Int      @default(1)

  // 関連
  nodes       ResponseNode[]
  versions    ResponseTreeVersion[]
}

model ResponseNode {
  id          String   @id @default(cuid())
  treeId      String
  type        String   // 'category' or 'question'
  title       String
  description String?
  icon        String?
  order       Int      @default(0)
  parentId    String?
  isRoot      Boolean  @default(false)

  // 質問ノード固有のフィールド
  answer      Json?    // テキスト、メディア、関連質問を含む

  // 関連
  tree        ResponseTree @relation(fields: [treeId], references: [id], onDelete: Cascade)
  parent      ResponseNode? @relation("NodeHierarchy", fields: [parentId], references: [id])
  children    ResponseNode[] @relation("NodeHierarchy")
  translations ResponseNodeTranslation[]

  @@index([treeId])
  @@index([parentId])
  @@index([type])
}

model ResponseNodeTranslation {
  id          String   @id @default(cuid())
  nodeId      String
  language    String
  title       String
  answer      Json?

  // 関連
  node        ResponseNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@unique([nodeId, language])
  @@index([language])
}

model ResponseTreeVersion {
  id          String   @id @default(cuid())
  treeId      String
  version     Int
  data        Json     // ツリー全体のスナップショット
  createdAt   DateTime @default(now())
  createdBy   String
  comment     String?

  // 関連
  tree        ResponseTree @relation(fields: [treeId], references: [id], onDelete: Cascade)

  @@unique([treeId, version])
}
```

## 10. 実装フェーズ

1. **Phase 1: データモデルとAPI実装**
   - Prismaモデルの作成
   - 基本的なCRUD APIの実装
   - テンプレートデータの作成

2. **Phase 2: 管理画面UI実装**
   - ツリービューコンポーネント
   - ノード編集フォーム
   - バージョン管理機能

3. **Phase 3: TV表示UI実装**
   - リモコン操作対応のナビゲーション
   - コンテンツ表示コンポーネント
   - QRコード生成と表示

4. **Phase 4: スマホ連携機能実装**
   - チャットインターフェース
   - セッション同期機能
   - 拡張機能（位置情報連携など）

## 11. テスト計画

1. **単体テスト**
   - APIエンドポイントのテスト
   - UIコンポーネントのテスト
   - データモデルの整合性テスト

2. **統合テスト**
   - ツリー編集から表示までの一連のフロー
   - 多言語対応の検証
   - バージョン管理の動作確認

3. **ユーザビリティテスト**
   - TVリモコン操作の使いやすさ
   - スマホ連携の円滑さ
   - 管理画面での編集効率

## 12. 今後の拡張可能性

1. **AI支援機能**
   - 回答文の自動生成・提案
   - 質問パターンの分析と構造最適化提案
   - 未回答質問の自動検出

2. **高度な分析**
   - 利用統計ダッシュボード
   - 人気質問のランキング
   - ユーザー行動パターンの分析

3. **外部システム連携**
   - 予約システムとの連携
   - CRMシステムとの連携
   - 外部コンテンツ（天気、観光情報など）の統合
