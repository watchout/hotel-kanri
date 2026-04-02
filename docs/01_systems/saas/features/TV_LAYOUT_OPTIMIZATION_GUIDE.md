# TV用16:9レイアウト最適化ガイド

## 概要

このドキュメントは、hotel-saasプロジェクトにおけるTV用16:9レイアウトの最適化に関する問題点と解決策をまとめたものです。特にGrapesJSエディタと実際のTV表示の一致性を確保するための方法を説明します。

## 問題点

### 1. 16:9比率の維持が困難

- **問題**: コンテンツ量が多い場合、16:9の枠内に収まらずオーバーフローする
- **影響**: エディタでの表示と実際のTV表示に差異が生じる
- **原因**: 固定サイズ指定とコンテンツの動的な増減の不一致

### 2. エディタ表示の不整合

- **問題**: GrapesJSエディタでの表示が実際のTV表示と異なる
- **影響**: 編集時に正確なプレビューができない
- **原因**: エディタのキャンバスサイズとスケーリング設定の不適切さ

### 3. レスポンシブ性の欠如

- **問題**: 異なる解像度のTV（720p, 1080p等）に対応できない
- **影響**: 一部の環境で表示が崩れる可能性
- **原因**: 固定サイズ指定と柔軟なスケーリングの欠如

## 解決策

### 1. TvScalerコンポーネントの実装

```javascript
// components/tv/TvScaler.js
export function initTvScaler(containerSelector = '.tv-viewport-container', contentSelector = '.tv-content-wrapper') {
  // コンテナとコンテンツ要素を取得
  const container = document.querySelector(containerSelector);
  const content = document.querySelector(contentSelector);

  if (!container || !content) return;

  // 理想的な16:9の高さを計算
  const containerWidth = container.clientWidth;
  const idealHeight = containerWidth * (9 / 16);

  // コンテンツの実際の高さを取得
  const contentHeight = content.scrollHeight;

  // 常にスケーリングを適用して、確実に16:9に収める
  const scale = Math.min(0.98, idealHeight / contentHeight);

  // スケーリングを適用
  content.style.transformOrigin = 'top center';
  content.style.transform = `scale(${scale})`;

  // コンテンツを中央に配置
  const scaledContentHeight = contentHeight * scale;
  if (scaledContentHeight < idealHeight) {
    const verticalMargin = (idealHeight - scaledContentHeight) / 2;
    content.style.marginTop = `${verticalMargin}px`;
  }
}
```

### 2. 16:9コンテナの標準化

```html
<!-- 標準的な16:9コンテナ構造 -->
<div class="tv-viewport-container">
  <div class="tv-content-wrapper">
    <!-- ここにコンテンツを配置 -->
  </div>
</div>
```

```css
/* 16:9ビューポートコンテナのスタイル */
.tv-viewport-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  position: relative;
  max-width: 1920px;
  max-height: 1080px;
}

.tv-content-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}
```

### 3. GrapesJSエディタの最適化

```javascript
// GrapesJSエディタの設定
const editor = grapesjs.init({
  // ...
  deviceManager: {
    devices: [
      {
        name: 'TV-Edit',
        width: '800px',
        height: '450px'
      },
      {
        name: 'TV-720p',
        width: '1280px',
        height: '720px'
      },
      {
        name: 'TV-1080p',
        width: '1920px',
        height: '1080px'
      }
    ],
    deviceSelected: 'TV-Edit'
  },
  canvas: {
    frameClass: 'tv-viewport-container',
    wrapper: '.tv-content-wrapper',
    autoscale: false,
    frameOffset: 0
  }
});
```

### 4. フレキシブルレイアウトの採用

```css
/* フレキシブルレイアウト */
.luxury-tv-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.luxury-header {
  flex-shrink: 0; /* ヘッダーは縮小しない */
}

.luxury-main {
  flex: 1; /* メインコンテンツは可能な限り拡大 */
  min-height: 0; /* Firefoxでのフレックスバグ対策 */
  display: flex;
}

.luxury-footer {
  flex-shrink: 0; /* フッターは縮小しない */
}
```

## 実装手順

1. **TvScalerコンポーネントの追加**
   - `components/tv/TvScaler.js` を作成
   - スケーリングロジックを実装

2. **16:9コンテナ構造の標準化**
   - すべてのTV表示ページに `.tv-viewport-container` と `.tv-content-wrapper` を適用
   - CSSで16:9のアスペクト比を強制

3. **GrapesJSエディタの設定調整**
   - デバイスマネージャーに複数のTV解像度を追加
   - キャンバス設定を最適化

4. **フレキシブルレイアウトの適用**
   - Flexboxを使用して要素の伸縮性を確保
   - 重要な要素（ヘッダー、フッター）は `flex-shrink: 0` で固定

## デバッグツール

開発環境では、以下のデバッグツールを利用できます：

```javascript
// デバッグモードを有効化
export function enableTvScalerDebug() {
  const container = document.querySelector('.tv-viewport-container');
  if (container) {
    // 16:9の枠を可視化
    const debugElement = document.createElement('div');
    debugElement.className = 'tv-viewport-debug';
    container.appendChild(debugElement);

    // 情報表示
    const infoElement = document.createElement('div');
    infoElement.className = 'tv-viewport-info';
    infoElement.innerHTML = '16:9 デバッグモード';
    container.appendChild(infoElement);
  }
}
```

## ベストプラクティス

1. **コンテンツ量の適正化**
   - 16:9の枠内に収まる適切なコンテンツ量を意識する
   - 重要な情報は上部に配置

2. **スケーリングの自動適用**
   - ページ読み込み後に `initTvScaler()` を呼び出す
   - コンテンツ変更時に再度スケーリングを適用

3. **エディタでの確認**
   - 編集前に適切なデバイスサイズを選択
   - 実際のTV表示を定期的に確認

4. **リモコン操作の考慮**
   - 全ての操作可能要素に `data-focus-order` 属性を設定
   - フォーカス状態のスタイルを適切に定義

## 注意点

- スケーリングによって文字が小さくなりすぎないよう注意
- 複雑なアニメーションはスケーリング後に崩れる可能性がある
- 画像のアスペクト比は個別に管理する必要がある

## まとめ

16:9のTV表示を最適化するには、以下の点が重要です：

1. 標準化された16:9コンテナ構造の採用
2. 動的なスケーリングによるコンテンツの適合
3. フレキシブルレイアウトによる要素の配置
4. エディタと実際の表示の一致性確保

これらの対策により、様々な解像度のTVで一貫した表示が可能になります。
