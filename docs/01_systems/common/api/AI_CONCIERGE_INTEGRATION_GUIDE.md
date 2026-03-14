# AIコンシェルジュAPI統合ガイド

このガイドはSaaSチーム向けにAIコンシェルジュAPIの統合手順を説明します。

## 1. 概要

AIコンシェルジュ機能は、ホテル内のTV画面で質問選択インターフェースを提供し、モバイル端末との連携も可能にするシステムです。

### 主な機能
- 階層型の質問・回答ツリー
- セッション管理
- 操作履歴の記録
- QRコードを使ったモバイル連携
- 多言語対応

## 2. 接続情報

### 開発環境
- ベースURL: `http://localhost:3400/api/v1/ai/`
- 認証: 開発環境では認証バイパス有効

### 本番環境
- ベースURL: `https://api.hotel-common.example.com/api/v1/ai/`
- 認証: JWT認証必須

## 3. 認証方法

```javascript
// リクエスト例
const response = await fetch('http://localhost:3400/api/v1/ai/response-tree', {
  headers: {
    'Authorization': 'Bearer <JWT_TOKEN>',
    'Content-Type': 'application/json'
  }
});
```

## 4. 基本的な使用フロー

### TV画面での使用フロー

1. セッション開始
```javascript
// セッション開始
const session = await fetch('http://localhost:3400/api/v1/ai/response-tree/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    treeId: 'tree_123',
    deviceId: 456,
    language: 'ja'
  })
});
const { sessionId, currentNodeId } = await session.json();
```

2. 現在のノード情報取得
```javascript
// ノード情報取得
const nodeResponse = await fetch(`http://localhost:3400/api/v1/ai/response-tree/nodes/${currentNodeId}`);
const node = await nodeResponse.json();
```

3. 子ノード一覧取得
```javascript
// 子ノード一覧取得
const childrenResponse = await fetch(`http://localhost:3400/api/v1/ai/response-tree/nodes/${currentNodeId}/children`);
const children = await childrenResponse.json();
```

4. ノード選択（セッション更新）
```javascript
// 次のノードを選択
await fetch(`http://localhost:3400/api/v1/ai/response-tree/sessions/${sessionId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nodeId: 'selected_node_id',
    action: 'select'
  })
});
```

### モバイル連携フロー

1. TV画面でQRコード生成
```javascript
// モバイル連携リンク作成
const linkResponse = await fetch('http://localhost:3400/api/v1/ai/response-tree/mobile-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'session_123',
    deviceId: 456
  })
});
const { linkCode } = await linkResponse.json();

// QRコード画像URL
const qrCodeUrl = `http://localhost:3400/api/v1/ai/response-tree/qrcode/${linkCode}`;
```

2. モバイル端末での連携確認
```javascript
// モバイルでQRコードスキャン後、連携情報確認
const linkInfoResponse = await fetch(`http://localhost:3400/api/v1/ai/response-tree/mobile-link/${linkCode}`);
const linkInfo = await linkInfoResponse.json();
```

3. モバイル端末での連携実行
```javascript
// モバイル端末で連携実行
await fetch(`http://localhost:3400/api/v1/ai/response-tree/mobile-link/${linkCode}/connect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    connectionId: 'mobile_device_id_or_token'
  })
});
```

## 5. エラーハンドリング

すべてのAPIは標準エラーフォーマットで応答します：

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

主なエラーコード：
- `INVALID_REQUEST`: リクエストパラメータが不正
- `NOT_FOUND`: 指定されたリソースが見つからない
- `SESSION_EXPIRED`: セッションの有効期限切れ
- `LINK_EXPIRED`: モバイル連携リンクの有効期限切れ
- `SERVER_ERROR`: サーバー内部エラー

## 6. 実装例

### Vue.jsでの実装例

```vue
<template>
  <div class="ai-concierge">
    <div v-if="currentNode">
      <h2>{{ currentNode.title }}</h2>
      <p>{{ currentNode.content }}</p>
      
      <div v-if="childNodes.length > 0" class="options">
        <button 
          v-for="child in childNodes" 
          :key="child.id"
          @click="selectNode(child.id)"
          class="option-button"
        >
          {{ child.title }}
        </button>
      </div>
      
      <div v-if="isLeafNode" class="qr-code">
        <button @click="generateQrCode">モバイルで続ける</button>
        <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QRコード" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      sessionId: null,
      currentNode: null,
      childNodes: [],
      qrCodeUrl: null,
      isLeafNode: false
    };
  },
  
  async created() {
    await this.startSession();
  },
  
  methods: {
    async startSession() {
      try {
        const response = await fetch('http://localhost:3400/api/v1/ai/response-tree/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            treeId: 'main_tree',
            deviceId: 123,
            language: 'ja'
          })
        });
        
        const result = await response.json();
        if (result.success) {
          this.sessionId = result.data.sessionId;
          await this.loadNode(result.data.currentNodeId);
        }
      } catch (error) {
        console.error('セッション開始エラー:', error);
      }
    },
    
    async loadNode(nodeId) {
      try {
        const response = await fetch(`http://localhost:3400/api/v1/ai/response-tree/nodes/${nodeId}`);
        const result = await response.json();
        
        if (result.success) {
          this.currentNode = result.data;
          await this.loadChildNodes(nodeId);
        }
      } catch (error) {
        console.error('ノード読み込みエラー:', error);
      }
    },
    
    async loadChildNodes(nodeId) {
      try {
        const response = await fetch(`http://localhost:3400/api/v1/ai/response-tree/nodes/${nodeId}/children`);
        const result = await response.json();
        
        if (result.success) {
          this.childNodes = result.data;
          this.isLeafNode = this.childNodes.length === 0;
        }
      } catch (error) {
        console.error('子ノード読み込みエラー:', error);
      }
    },
    
    async selectNode(nodeId) {
      try {
        await fetch(`http://localhost:3400/api/v1/ai/response-tree/sessions/${this.sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: nodeId,
            action: 'select'
          })
        });
        
        await this.loadNode(nodeId);
      } catch (error) {
        console.error('ノード選択エラー:', error);
      }
    },
    
    async generateQrCode() {
      try {
        const response = await fetch('http://localhost:3400/api/v1/ai/response-tree/mobile-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            deviceId: 123
          })
        });
        
        const result = await response.json();
        if (result.success) {
          this.qrCodeUrl = `http://localhost:3400/api/v1/ai/response-tree/qrcode/${result.data.linkCode}`;
        }
      } catch (error) {
        console.error('QRコード生成エラー:', error);
      }
    }
  }
};
</script>
```

## 7. 注意事項

1. モバイル連携のQRコードは30分で有効期限が切れます
2. セッションは24時間で自動的に終了します
3. 本番環境では必ずJWT認証を使用してください
4. 大量のリクエストを短時間に送らないようにしてください（レート制限あり）

## 8. サポート

統合に関する質問や問題があれば、以下までご連絡ください：
- 担当者: AIコンシェルジュ開発チーム
- メール: ai-concierge@example.com
- 内線: 1234