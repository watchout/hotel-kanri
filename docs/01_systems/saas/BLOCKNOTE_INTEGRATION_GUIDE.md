# BlockNote統合ガイド

## 1. 概要

本ドキュメントは、Vue 3/Nuxt 3環境でBlockNoteエディタを統合するための技術的なガイドラインを提供する。BlockNoteはReactベースのライブラリであるため、Vue環境での統合には特定のアプローチが必要となる。

## 2. 前提条件

- Nuxt 3プロジェクト
- Vue 3の知識
- TypeScriptの基本的な理解
- npm/yarnによるパッケージ管理

## 3. BlockNoteのインストール

```bash
# npmを使用する場合
npm install @blocknote/core @blocknote/react

# yarnを使用する場合
yarn add @blocknote/core @blocknote/react
```

## 4. Vue環境でのReactコンポーネント統合

BlockNoteはReactコンポーネントであるため、Vue環境で使用するには以下のアプローチを取る：

### 4.1 アプローチ1: Vue用ラッパーの作成

BlockNoteのReactコンポーネントをVueコンポーネントでラップする方法。

1. まず、React用のラッパーパッケージをインストール：

```bash
npm install vue-react-wrapper react react-dom
# または
yarn add vue-react-wrapper react react-dom
```

2. Vue用のBlockNoteラッパーコンポーネントを作成：

```vue
<!-- components/admin/layouts/BlockNoteWrapper.vue -->
<template>
  <div ref="blockNoteContainer" class="blocknote-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { wrapReactComponent } from 'vue-react-wrapper';
import { BlockNoteView, useBlockNote } from '@blocknote/react';
import '@blocknote/core/style.css';

const props = defineProps({
  initialContent: {
    type: Object,
    default: () => ({ blocks: [] })
  },
  editable: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:content', 'save']);

const blockNoteContainer = ref(null);
let blockNoteInstance = null;
let unmountReactComponent = null;

// BlockNoteのインスタンスを作成
const createBlockNoteInstance = () => {
  if (blockNoteContainer.value) {
    // 既存のインスタンスをクリーンアップ
    if (unmountReactComponent) {
      unmountReactComponent();
      unmountReactComponent = null;
    }

    // BlockNoteのReactコンポーネントをラップ
    const WrappedBlockNote = wrapReactComponent(BlockNoteView, {
      editor: useBlockNote({
        initialContent: props.initialContent,
        editable: props.editable,
        onEditorContentChange: (editor) => {
          const content = editor.topLevelBlocks;
          emit('update:content', { blocks: content });
        }
      })
    });

    // Reactコンポーネントをマウント
    unmountReactComponent = WrappedBlockNote.mount(blockNoteContainer.value);
  }
};

// 初期マウント時にBlockNoteを初期化
onMounted(() => {
  createBlockNoteInstance();
});

// コンポーネント破棄時にクリーンアップ
onBeforeUnmount(() => {
  if (unmountReactComponent) {
    unmountReactComponent();
  }
});

// propsの変更を監視して再マウント
watch(() => props.initialContent, () => {
  createBlockNoteInstance();
}, { deep: true });

// 公開メソッド
defineExpose({
  getContent: () => {
    if (blockNoteInstance) {
      return { blocks: blockNoteInstance.topLevelBlocks };
    }
    return { blocks: [] };
  },
  saveContent: () => {
    if (blockNoteInstance) {
      emit('save', { blocks: blockNoteInstance.topLevelBlocks });
    }
  }
});
</script>

<style scoped>
.blocknote-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
```

### 4.2 アプローチ2: Web Componentsの使用

BlockNoteをWeb Componentsとしてラップし、Vue内で使用する方法。

1. Web Components用のラッパーを作成：

```javascript
// utils/blocknote-web-component.js
import React from 'react';
import ReactDOM from 'react-dom';
import { BlockNoteView, useBlockNote } from '@blocknote/react';
import '@blocknote/core/style.css';

class BlockNoteElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._content = { blocks: [] };
    this._editable = true;
  }

  get content() {
    return this._content;
  }

  set content(value) {
    this._content = value;
    this._render();
  }

  get editable() {
    return this._editable;
  }

  set editable(value) {
    this._editable = value;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  disconnectedCallback() {
    ReactDOM.unmountComponentAtNode(this.shadowRoot);
  }

  _render() {
    const BlockNoteApp = () => {
      const editor = useBlockNote({
        initialContent: this._content,
        editable: this._editable,
        onEditorContentChange: (editor) => {
          this._content = { blocks: editor.topLevelBlocks };
          this.dispatchEvent(new CustomEvent('contentChange', { detail: this._content }));
        }
      });

      return <BlockNoteView editor={editor} />;
    };

    ReactDOM.render(<BlockNoteApp />, this.shadowRoot);
  }
}

customElements.define('block-note-editor', BlockNoteElement);
```

2. Vue側での使用：

```vue
<!-- components/admin/layouts/BlockNoteEditor.vue -->
<template>
  <div class="blocknote-editor-container">
    <block-note-editor
      ref="blockNoteRef"
      :content="modelValue"
      :editable="editable"
      @contentChange="handleContentChange"
    ></block-note-editor>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import '~/utils/blocknote-web-component';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ blocks: [] })
  },
  editable: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'save']);
const blockNoteRef = ref(null);

// コンテンツ変更ハンドラ
const handleContentChange = (event) => {
  emit('update:modelValue', event.detail);
};

// 保存メソッド
const saveContent = () => {
  if (blockNoteRef.value) {
    emit('save', blockNoteRef.value.content);
  }
};

// 公開メソッド
defineExpose({
  saveContent
});
</script>

<style scoped>
.blocknote-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
```

## 5. カスタムブロックの実装

BlockNoteでは、カスタムブロックを定義して拡張することができる。

### 5.1 カスタムブロック定義

```typescript
// utils/custom-blocks.ts
import { BlockSchema, defaultBlockSchema } from '@blocknote/core';

// ヘッダーブロックの定義
const headerBlockSchema = {
  type: 'header',
  propSchema: {
    logo: { default: '/images/logo.png' },
    showWeather: { default: true },
    showLanguage: { default: true },
    showHome: { default: true }
  },
  content: 'none'
};

// メインコンテンツブロックの定義
const mainContentBlockSchema = {
  type: 'mainContent',
  propSchema: {
    campaignRatio: { default: 65 },
    conciergeRatio: { default: 35 }
  },
  content: 'none'
};

// フッターブロックの定義
const footerBlockSchema = {
  type: 'footer',
  propSchema: {
    buttons: { default: ['roomService', 'facilities', 'tourism', 'survey', 'wifi'] }
  },
  content: 'none'
};

// カスタムブロックを含むスキーマ
export const customBlockSchema = {
  ...defaultBlockSchema,
  header: headerBlockSchema,
  mainContent: mainContentBlockSchema,
  footer: footerBlockSchema
} as BlockSchema;
```

### 5.2 カスタムブロックのレンダリング

```jsx
// utils/custom-block-renderers.jsx
import React from 'react';

// ヘッダーブロックのレンダラー
export const HeaderBlockRenderer = ({ block }) => {
  const { logo, showWeather, showLanguage, showHome } = block.props;

  return (
    <div className="tv-header">
      <div className="logo-area">
        <img src={logo} alt="Logo" />
      </div>
      <div className="header-controls">
        {showWeather && <div className="weather-widget">天気</div>}
        {showLanguage && <div className="language-selector">言語</div>}
        {showHome && <div className="home-button">ホーム</div>}
      </div>
    </div>
  );
};

// メインコンテンツブロックのレンダラー
export const MainContentBlockRenderer = ({ block }) => {
  const { campaignRatio, conciergeRatio } = block.props;

  return (
    <div className="tv-main-content">
      <div className="campaign-area" style={{ width: `${campaignRatio}%` }}>
        キャンペーンエリア
      </div>
      <div className="concierge-area" style={{ width: `${conciergeRatio}%` }}>
        AIコンシェルジュ
      </div>
    </div>
  );
};

// フッターブロックのレンダラー
export const FooterBlockRenderer = ({ block }) => {
  const { buttons } = block.props;

  const buttonLabels = {
    roomService: 'ルームサービス',
    facilities: '館内施設',
    tourism: '観光案内',
    survey: 'アンケート',
    wifi: 'WiFi接続案内'
  };

  return (
    <div className="tv-footer">
      {buttons.map((button, index) => (
        <button key={index} className="footer-button">
          {buttonLabels[button]}
        </button>
      ))}
    </div>
  );
};

// カスタムブロックレンダラーのマップ
export const customBlockRenderers = {
  header: HeaderBlockRenderer,
  mainContent: MainContentBlockRenderer,
  footer: FooterBlockRenderer
};
```

### 5.3 カスタムブロックの統合

```javascript
// BlockNoteの初期化時にカスタムブロックを統合
const editor = useBlockNote({
  initialContent: props.initialContent,
  editable: props.editable,
  schema: customBlockSchema,
  blockRenderers: customBlockRenderers,
  onEditorContentChange: (editor) => {
    const content = editor.topLevelBlocks;
    emit('update:content', { blocks: content });
  }
});
```

## 6. 16:9比率の最適化

BlockNoteエディタを16:9比率のTV表示に最適化するための方法。

### 6.1 16:9コンテナの設定

```vue
<template>
  <div class="tv-viewport-container">
    <div class="tv-content-wrapper">
      <!-- BlockNoteエディタをここに配置 -->
    </div>
  </div>
</template>

<style scoped>
.tv-viewport-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  position: relative;
  background-color: #000;
  margin: 0 auto;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.tv-content-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
```

### 6.2 スケーリング機能

```javascript
// utils/tv-scaler.js
export function initTvScaler(containerSelector, contentSelector) {
  const container = document.querySelector(containerSelector);
  const content = document.querySelector(contentSelector);

  if (!container || !content) return;

  const updateScale = () => {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 16:9比率を維持
    const targetRatio = 16 / 9;
    const currentRatio = containerWidth / containerHeight;

    let scale = 1;
    if (currentRatio > targetRatio) {
      // 幅に合わせる
      scale = containerHeight / (containerWidth / targetRatio);
    } else {
      // 高さに合わせる
      scale = containerWidth / (containerHeight * targetRatio);
    }

    content.style.transform = `scale(${scale})`;
    content.style.transformOrigin = 'top left';
  };

  // 初期スケーリング
  updateScale();

  // リサイズ時にスケーリングを更新
  window.addEventListener('resize', updateScale);

  // クリーンアップ関数を返す
  return () => {
    window.removeEventListener('resize', updateScale);
  };
}
```

## 7. テンプレート機能の実装

### 7.1 テンプレートデータ構造

```typescript
// types/template.ts
export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  content: {
    blocks: any[];
  };
  css: string;
}

export type TemplateType = 'luxury-classic' | 'modern-luxury' | 'family-pop' | 'wa-modern' | 'natural-resort' | 'urban-stylish';
```

### 7.2 テンプレート適用機能

```vue
<!-- components/admin/layouts/TemplateSelector.vue -->
<template>
  <div class="template-selector">
    <h3>テンプレート選択</h3>
    <div class="template-grid">
      <div
        v-for="template in templates"
        :key="template.id"
        :class="['template-item', { active: selectedTemplate === template.id }]"
        @click="selectTemplate(template)"
      >
        <img :src="template.thumbnail" :alt="template.name">
        <div class="template-name">{{ template.name }}</div>
      </div>
    </div>
    <div class="template-actions">
      <button @click="applyTemplate" :disabled="!selectedTemplate">適用</button>
      <button @click="cancel">キャンセル</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  templates: {
    type: Array,
    required: true
  },
  currentTemplate: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['apply', 'cancel']);

const selectedTemplate = ref(props.currentTemplate);

const selectTemplate = (template) => {
  selectedTemplate.value = template.id;
};

const applyTemplate = () => {
  const template = props.templates.find(t => t.id === selectedTemplate.value);
  if (template) {
    emit('apply', template);
  }
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.template-selector {
  padding: 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.template-item {
  border: 2px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.template-item.active {
  border-color: #0d6efd;
}

.template-item img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.template-name {
  padding: 10px;
  text-align: center;
  font-weight: 500;
}

.template-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:first-child {
  background-color: #0d6efd;
  color: white;
}

button:last-child {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

## 8. APIとの連携

### 8.1 ページデータ取得

```typescript
// composables/usePageEditor.ts
import { ref, computed } from 'vue';

export function usePageEditor() {
  const pageData = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  // ページデータの取得
  const fetchPageData = async (pageId) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/v1/admin/pages/${pageId}`);
      if (!response.ok) {
        throw new Error('ページデータの取得に失敗しました');
      }

      pageData.value = await response.json();
    } catch (err) {
      error.value = err.message;
      console.error('ページデータ取得エラー:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // ページデータの保存
  const savePageData = async (pageId, data) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/v1/admin/pages/${pageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('ページデータの保存に失敗しました');
      }

      return await response.json();
    } catch (err) {
      error.value = err.message;
      console.error('ページデータ保存エラー:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // ページの公開
  const publishPage = async (pageId, version) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/v1/admin/pages/${pageId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ version })
      });

      if (!response.ok) {
        throw new Error('ページの公開に失敗しました');
      }

      return await response.json();
    } catch (err) {
      error.value = err.message;
      console.error('ページ公開エラー:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    pageData,
    isLoading,
    error,
    fetchPageData,
    savePageData,
    publishPage
  };
}
```

### 8.2 テンプレート取得

```typescript
// composables/useTemplates.ts
import { ref, onMounted } from 'vue';

export function useTemplates() {
  const templates = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  // テンプレート一覧の取得
  const fetchTemplates = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/admin/templates');
      if (!response.ok) {
        throw new Error('テンプレートの取得に失敗しました');
      }

      templates.value = await response.json();
    } catch (err) {
      error.value = err.message;
      console.error('テンプレート取得エラー:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // 初期化時にテンプレート一覧を取得
  onMounted(() => {
    fetchTemplates();
  });

  return {
    templates,
    isLoading,
    error,
    fetchTemplates
  };
}
```

## 9. まとめ

BlockNoteをVue/Nuxt環境に統合することで、軽量で使いやすいブロックベースのエディタを実現できる。Reactベースのライブラリをうまく活用するためには、適切なラッパーの実装が重要である。また、16:9比率のTV表示に最適化するためには、専用のコンテナとスケーリング機能が必要となる。

このガイドに従うことで、BlockNoteを活用したTOPページエディタの実装が可能となる。

## 10. 参考リンク

- [BlockNote公式ドキュメント](https://www.blocknotejs.org/docs)
- [Vue React Wrapper](https://github.com/jordanbrauer/vue-react-wrapper)
- [Web Components MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [Nuxt 3ドキュメント](https://nuxt.com/docs)
