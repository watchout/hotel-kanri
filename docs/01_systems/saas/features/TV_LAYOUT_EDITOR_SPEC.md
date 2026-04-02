# TV用レイアウトエディタ仕様書

## 📋 概要

ホテル客室TV画面（16:9）用のレイアウトを管理画面から編集できるシステム。
高級ホテル向けの洗練されたUIと直感的な編集機能を提供。

## 🎯 アクセス方法

- **管理画面**: `http://localhost:3100/admin/layouts`
- **「TV用TOPページエディタ」ボタン**をクリック
- **実際のTOPページ**: `http://localhost:3100`

## ✅ 実装済み機能

### 🖥️ **基本エディタ機能**
- **16:9プレビュー**: リアルタイムプレビュー表示
- **自動保存**: 2秒後に自動保存
- **システム設定連携**: ホテル情報の自動取得・同期
- **モーダル表示**: 全画面エディタ

### 🏨 **編集可能な要素**

#### 1. ヘッダー設定
- ホテル名（システム設定連携）
- ロゴアイコン選択
- 「システム設定から同期」ボタン

#### 2. キャンペーン設定
- タイトル
- サブタイトル
- 割引率
- 元価格・特価
- 期間

#### 3. AIコンシェルジュ設定
- 名前
- ステータス

#### 4. サービス設定
- **🎯 ドラッグ&ドロップ対応**: サービス項目の並び替え
- アイコン編集
- タイトル・説明・リンク編集
- サービス追加・削除

#### 5. WiFi設定
- SSID
- パスワード
- 速度・ステータス

### 🎨 **デザイン仕様**
- **背景**: グラデーション（slate-900 → blue-900 → purple-900）
- **パーティクル効果**: 動的アクセント要素
- **ガラスモーフィズム**: backdrop-blur効果
- **高級感**: ゴールドアクセント、シャドウ効果

## ⚠️ 現在の制限事項

### 🚫 **未実装のドラッグ&ドロップ機能**

#### 1. レイアウト構造の変更
- [ ] ヘッダー・メイン・フッターの配置変更
- [ ] キャンペーンとコンシェルジュエリアの位置入れ替え
- [ ] エリアサイズの動的調整

#### 2. 要素の自由配置
- [ ] 新しい要素の追加（テキスト、画像、ボタン等）
- [ ] 要素の自由移動
- [ ] レイヤー管理

#### 3. 高度な編集機能
- [ ] 要素のリサイズハンドル
- [ ] グリッドスナップ機能
- [ ] アンドゥ・リドゥ

## 🛠️ 技術仕様

### データ構造
```typescript
interface LayoutData {
  elements: {
    header: {
      hotel: { name: string; logo: string }
    }
    campaign: {
      title: string;
      subtitle: string;
      discount: string;
      originalPrice: string;
      salePrice: string;
      period: string;
    }
    concierge: {
      name: string;
      status: string;
      quickActions: Array<{icon: string; text: string}>
    }
    services: {
      items: Array<{
        id: string;
        icon: string;
        title: string;
        description: string;
        link: string;
      }>
    }
    wifi: {
      ssid: string;
      password: string;
      speed: string;
      status: string;
    }
  }
}
```

### API連携
- **取得**: `/api/v1/admin/layouts/public/top`
- **保存**: `updateLayout(id, data)`
- **ホテル情報**: `/api/v1/admin/settings/hotel-info`

## 🚀 今後の開発計画

### Phase 1: 基本ドラッグ&ドロップ
- [ ] 要素パレット追加
- [ ] キャンバスへのドロップ機能
- [ ] 基本要素（テキスト、画像、ボタン）

### Phase 2: 高度な編集機能
- [ ] リサイズハンドル
- [ ] 要素のグループ化
- [ ] レイヤー管理パネル

### Phase 3: レイアウトテンプレート
- [ ] プリセットレイアウト
- [ ] テンプレート保存・読み込み
- [ ] レスポンシブ対応

### Phase 4: 高度な機能
- [ ] アニメーション設定
- [ ] 条件表示
- [ ] A/Bテスト機能

## 🔧 開発者向け情報

### コンポーネント構造
```
components/admin/layouts/TopPageEditor.vue
├── プロパティパネル（左側）
│   ├── ヘッダー設定
│   ├── キャンペーン設定
│   ├── AIコンシェルジュ設定
│   ├── サービス設定（ドラッグ&ドロップ対応）
│   └── WiFi設定
└── プレビューエリア（右側）
    └── 16:9 TV画面プレビュー
```

### 現在のドラッグ&ドロップ実装
```typescript
// サービス項目のドラッグ&ドロップ
const onDragStart = (event: DragEvent, index: number, type: string) => {
  draggedIndex.value = index
  draggedType.value = type
}

const onDrop = (event: DragEvent, dropIndex: number, type: string) => {
  // サービス項目の並び替えのみ対応
  if (type === 'service') {
    const items = [...layoutData.value.elements.services.items]
    const draggedItem = items[draggedIndex.value]
    items.splice(draggedIndex.value, 1)
    items.splice(dropIndex, 0, draggedItem)
    layoutData.value.elements.services.items = items
    autoSave()
  }
}
```

## 📝 使用方法

### 基本編集
1. 管理画面 → レイアウト管理 → TV用TOPページエディタ
2. 左側パネルで設定変更
3. 右側でリアルタイムプレビュー確認
4. 自動保存（2秒後）

### サービス項目の並び替え
1. サービス設定セクションを開く
2. サービス項目をドラッグ&ドロップで並び替え
3. 自動保存される

### システム設定連携
1. ヘッダー設定で「システム設定から同期」をクリック
2. システム設定のホテル名が自動反映

## 🎯 次のステップ

本格的なドラッグ&ドロップエディタを実装する場合：

1. **要素パレット**の追加
2. **キャンバス領域**の拡張
3. **ドロップゾーン**の実装
4. **要素選択・編集**システム

現在は**プロパティベース**の編集に特化していますが、より直感的な編集体験のためには上記機能の実装が必要です。

## 🔍 現状の詳細分析

### ✅ **動作するドラッグ&ドロップ**
- **サービス項目の並び替え**: 完全に実装済み
- **ドラッグハンドル**: `heroicons:bars-3` アイコン
- **ビジュアルフィードバック**: ホバー時のシャドウ効果
- **自動保存**: ドロップ後に即座に保存

### ❌ **未実装のドラッグ&ドロップ**
- **レイアウト全体の構造変更**
- **新しい要素の追加**
- **要素間の自由な移動**
- **リサイズ操作**

### 🎨 **現在のアプローチ**
現在のエディタは**設定ベース**のアプローチを採用：
- プロパティパネルでの詳細設定
- リアルタイムプレビュー
- システム設定との連携

### 🚀 **本格的なドラッグ&ドロップエディタへの拡張案**

#### Option 1: ハイブリッドアプローチ
```typescript
// 現在の設定ベース + 限定的なドラッグ&ドロップ
interface EditorMode {
  current: 'property' | 'drag'  // モード切り替え
  allowedOperations: {
    reorder: boolean      // 並び替え（実装済み）
    resize: boolean       // リサイズ
    move: boolean         // 移動
    add: boolean          // 要素追加
  }
}
```

#### Option 2: フルドラッグ&ドロップエディタ
```typescript
// 完全なビジュアルエディタ
interface VisualEditor {
  canvas: CanvasArea
  palette: ElementPalette
  layers: LayerManager
  properties: PropertyPanel
}
```

### 💡 **推奨する次の実装**

#### 🎯 **Phase 1: エリア間ドラッグ&ドロップ**
```typescript
// キャンペーンとコンシェルジュエリアの位置交換
const swapAreas = (area1: 'campaign' | 'concierge', area2: 'campaign' | 'concierge') => {
  // 65% ⟷ 35% の配置変更
}
```

#### 🎯 **Phase 2: 要素パレット**
```vue
<div class="element-palette">
  <div draggable="true" @dragstart="startDrag('text')">📝 テキスト</div>
  <div draggable="true" @dragstart="startDrag('image')">🖼️ 画像</div>
  <div draggable="true" @dragstart="startDrag('button')">🔘 ボタン</div>
</div>
```

#### 🎯 **Phase 3: リサイズハンドル**
```vue
<div class="resizable-element" :style="elementStyle">
  <div class="resize-handle resize-nw"></div>
  <div class="resize-handle resize-ne"></div>
  <!-- 8方向のリサイズハンドル -->
</div>
```

## 📊 **機能比較表**

| 機能 | 現在の状態 | 必要な開発工数 | 優先度 |
|------|------------|----------------|--------|
| サービス項目並び替え | ✅ 完了 | - | - |
| エリア位置交換 | ❌ 未実装 | 中 | 高 |
| 要素パレット | ❌ 未実装 | 大 | 中 |
| リサイズハンドル | ❌ 未実装 | 大 | 低 |
| レイヤー管理 | ❌ 未実装 | 大 | 低 |

## 🛡️ **現在のシステムの強み**

1. **安定性**: プロパティベースで確実に動作
2. **システム連携**: ホテル設定との完全統合
3. **リアルタイム**: 即座のプレビュー更新
4. **自動保存**: データ損失のリスクなし
5. **16:9最適化**: TV画面に特化した設計

## 🎯 **結論**

現在のエディタは**実用的な設定ツール**として十分に機能しています。本格的なドラッグ&ドロップエディタの実装は大きな開発投資が必要ですが、現在のシステムでも以下が可能です：

- ✅ 全要素の詳細設定
- ✅ リアルタイムプレビュー
- ✅ サービス項目の並び替え
- ✅ システム設定連携
- ✅ 自動保存

**次の実装を検討する場合は、ユーザーのニーズと開発リソースを慎重に評価することを推奨します。**
