# AIコンシェルジュ 視覚的エディタ設計書

## 概要

AIコンシェルジュの質問＆回答ツリーを直感的に編集するための視覚的エディタを実装します。このエディタにより、ホテルスタッフは簡単に階層構造を持つ質問と回答を管理できるようになります。

## 現状分析

現在の実装では、以下の機能が既に存在しています：

1. **ツリー一覧画面** (`pages/admin/concierge/response.vue`)
   - ツリーの一覧表示
   - 新規ツリー作成
   - ツリーの削除
   - ツリーの公開/非公開設定

2. **ツリー編集画面** (`pages/admin/concierge/response/[id].vue`)
   - 階層構造の表示
   - ノード（カテゴリ/質問）の追加
   - ノードの編集
   - ノードの削除

## 改善点

現在の実装は基本的な機能を提供していますが、以下の点で改善が必要です：

1. **視覚的な階層表示**
   - 現在のツリー表示はシンプルなリスト形式
   - より視覚的な階層構造の表示が必要

2. **ドラッグ＆ドロップ操作**
   - ノードの順序変更
   - ノードの親子関係の変更

3. **リアルタイムプレビュー**
   - 編集中のツリーがTV画面でどのように表示されるかをプレビュー

4. **多言語対応編集**
   - 複数言語での質問と回答を同時に編集

## 実装計画

### 1. ビジュアルツリーコンポーネント

```vue
<!-- components/concierge/VisualTreeEditor.vue -->
<template>
  <div class="visual-tree-editor">
    <div class="toolbar">
      <button @click="addRootNode">ルートノード追加</button>
      <button @click="expandAll">すべて展開</button>
      <button @click="collapseAll">すべて折りたたむ</button>
    </div>

    <div class="tree-container">
      <TreeNode
        v-for="node in rootNodes"
        :key="node.id"
        :node="node"
        :selected-node-id="selectedNodeId"
        @select="selectNode"
        @move="moveNode"
        @add-child="addChildNode"
      />
    </div>
  </div>
</template>
```

### 2. ドラッグ＆ドロップ機能

Vue Draggableを使用して、ノードのドラッグ＆ドロップ機能を実装します。

```javascript
import { VueDraggable } from 'vue-draggable-next'

// ドラッグ＆ドロップ処理
function handleDrop(event, targetNode) {
  const draggedNodeId = event.dataTransfer.getData('nodeId')
  const draggedNode = findNodeById(draggedNodeId)

  // 親ノードの変更
  removeNodeFromParent(draggedNode)
  addNodeToParent(draggedNode, targetNode)

  // 変更をサーバーに保存
  saveTreeStructure()
}
```

### 3. リアルタイムプレビュー

```vue
<!-- components/concierge/TreePreview.vue -->
<template>
  <div class="tree-preview">
    <div class="preview-header">
      <h3>TVプレビュー</h3>
      <select v-model="previewLanguage">
        <option value="ja">日本語</option>
        <option value="en">English</option>
        <option value="zh-CN">中文</option>
        <option value="ko">한국어</option>
      </select>
    </div>

    <div class="preview-screen">
      <!-- TV画面のモックアップ -->
      <div class="tv-screen">
        <!-- 現在選択されているビューに応じたコンテンツ -->
        <div v-if="currentView === 'categories'" class="categories-grid">
          <!-- カテゴリ表示 -->
        </div>
        <div v-else-if="currentView === 'questions'" class="questions-list">
          <!-- 質問表示 -->
        </div>
        <div v-else-if="currentView === 'answer'" class="answer-container">
          <!-- 回答表示 -->
        </div>
      </div>

      <!-- ナビゲーションコントロール -->
      <div class="preview-controls">
        <button @click="navigateBack">戻る</button>
        <button @click="navigateHome">ホーム</button>
      </div>
    </div>
  </div>
</template>
```

### 4. 多言語対応編集

```vue
<!-- components/concierge/MultilingualEditor.vue -->
<template>
  <div class="multilingual-editor">
    <div class="language-tabs">
      <button
        v-for="lang in availableLanguages"
        :key="lang.code"
        :class="{ active: currentLang === lang.code }"
        @click="currentLang = lang.code"
      >
        {{ lang.name }}
      </button>
    </div>

    <div class="translation-fields">
      <div v-if="node">
        <div class="form-group">
          <label>タイトル</label>
          <input v-model="translations[currentLang].title" type="text" />
        </div>

        <div class="form-group">
          <label>説明</label>
          <textarea v-model="translations[currentLang].description"></textarea>
        </div>

        <div v-if="node.type === 'question'" class="form-group">
          <label>回答</label>
          <textarea v-model="translations[currentLang].answer.text" rows="6"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>
```

## 技術スタック

1. **フロントエンド**
   - Vue 3 Composition API
   - Vue Draggable (ドラッグ＆ドロップ)
   - Tailwind CSS (スタイリング)

2. **状態管理**
   - Pinia または Vue Composition API

3. **API連携**
   - Fetch API または Axios

## 実装ステップ

1. **ビジュアルツリーコンポーネントの作成**
   - ツリー表示の基本構造実装
   - ノード選択機能の実装

2. **ドラッグ＆ドロップ機能の実装**
   - Vue Draggableの統合
   - ドラッグ＆ドロップイベントハンドラの実装

3. **リアルタイムプレビューの実装**
   - TV画面のモックアップ作成
   - プレビューモードの実装

4. **多言語対応編集の実装**
   - 言語切り替えタブの実装
   - 翻訳フィールドの実装

5. **APIとの連携**
   - ツリー構造の保存API連携
   - 翻訳データの保存API連携

## 今後の拡張計画

1. **バージョン管理機能**
   - 変更履歴の保存
   - 以前のバージョンへの復元機能

2. **テンプレート機能**
   - よく使われるツリー構造のテンプレート化
   - テンプレートからの新規作成機能

3. **インポート/エクスポート機能**
   - JSONフォーマットでのエクスポート
   - エクスポートしたデータのインポート

4. **アクセス権限管理**
   - 編集権限の設定
   - 閲覧のみの権限設定
