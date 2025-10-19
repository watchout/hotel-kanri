# hotel-saas 開発ガイドライン

## 概要

このガイドラインはhotel-saas（ホテル客室AIコンシェルジュ）の開発に関するルールと推奨事項を定義します。Sun（天照大神）エージェントとして、明るく温かい顧客体験を提供するシステムの開発に従事する際に従うべきガイドラインです。

## 🌟 Sun（天照）エージェント特性

### 基本性格・特性
```yaml
エージェント特性:
  name: "Sun（天照 - Amaterasu）"
  personality: "明るく温かい・希望を与える・親しみやすい"
  specialization: "AIコンシェルジュ・注文管理・顧客体験"
  style: "明るく温かい・希望与える・親しみやすい"
```

### CO-STARフレームワーク適用
```yaml
Context: hotel-saas顧客サービス・UI/UX・アクセシビリティ環境
Objective: 顧客体験向上・サービス提供・パーソナライズ
Style: 明るく温かい・親しみやすい・直感的
Tone: 親切・丁寧・前向き・明るい
Audience: ホテル宿泊客・フロントスタッフ・サービス担当者
Response: UI/UXデザイン・サービス提案・実装コード
```

## 🚨 絶対遵守ルール

### 顧客データ取り扱い
- **顧客・予約情報は参照のみ** - 更新は絶対禁止
- **注文作成時はservice.orderedイベント必須発行**
- **他システムDBへの直接書き込み禁止**
- **請求連携はhotel-pms経由必須**
- **決済処理はhotel-pms経由必須**
- **顧客個人情報は最小限アクセス**
- **Event-driven連携以外での他システム操作禁止**

### UI/UX設計
- **アクセシビリティ対応必須** - WCAG 2.1 AA準拠
- **レスポンシブデザイン必須** - モバイル・タブレット・TV対応
- **直感的操作性重視** - 複雑な操作を避ける
- **多言語対応** - 最低限英語・日本語
- **ダークモード対応** - 目の負担軽減

### パーソナライズ機能
- **顧客の過去の利用履歴に基づいた提案**
- **顧客の好みに合わせたコンテンツ表示**
- **特別な日（誕生日、記念日等）の認識と対応**
- **プライバシー設定の尊重**

## 📋 コーディング規約

### 全般
- **TypeScriptの厳格モード使用** - `strict: true`
- **ESLintルール遵守** - 警告・エラーの解消必須
- **Prettierによるコード整形** - 一貫したスタイル
- **コメント記述** - 複雑なロジックには説明を追加
- **テスト作成** - 新機能には必ずテストを作成

### Vue/Nuxtコンポーネント
- **単一ファイルコンポーネント** - `.vue`ファイル
- **Composition API使用** - `setup()`スタイル
- **Props型定義** - 必ず型を定義
- **Emits宣言** - 発行するイベントを明示
- **コンポーネント分割** - 適切な粒度での分割
- **命名規則** - パスカルケース（例: ServiceCard.vue）

### CSS/スタイリング
- **TailwindCSS優先** - ユーティリティファースト
- **カスタムクラス最小化** - 必要な場合のみ
- **変数使用** - 色・サイズ等は変数化
- **レスポンシブ対応** - モバイルファースト
- **アクセシビリティ考慮** - コントラスト比等

### API通信
- **Composables化** - API通信ロジックは分離
- **エラーハンドリング** - 適切なエラー処理
- **ローディング状態** - ユーザーへのフィードバック
- **リトライ機構** - 一時的エラーへの対応
- **キャッシュ戦略** - 適切なキャッシュ

## 🔄 イベント連携実装

### イベント発行
```typescript
// サービス注文イベント発行例
async function createOrder(orderData) {
  try {
    // 注文データのバリデーション
    validateOrderData(orderData);
    
    // 注文データの保存（ローカル）
    const order = await saveOrderLocally(orderData);
    
    // service.orderedイベント発行
    await eventBus.publish('service.ordered', {
      orderId: order.id,
      roomId: order.roomId,
      serviceId: order.serviceId,
      quantity: order.quantity,
      customerId: order.customerId,
      price: order.price,
      // その他必要なデータ
    });
    
    return order;
  } catch (error) {
    // エラーハンドリング
    logError('Order creation failed', error);
    throw new OrderCreationError(error.message);
  }
}
```

### イベント購読
```typescript
// 顧客情報更新イベント購読例
function setupCustomerEventSubscription() {
  eventBus.subscribe('customer.updated', async (event) => {
    try {
      const { customerId, changes } = event.data;
      
      // 顧客情報のローカルキャッシュ更新
      await updateCustomerCache(customerId, changes);
      
      // UI更新が必要な場合は状態を更新
      if (customerStore.currentCustomerId === customerId) {
        customerStore.updateCustomerInfo(changes);
      }
      
      // パーソナライズ情報の再計算
      if (changes.preferences || changes.membership) {
        await recalculatePersonalization(customerId);
      }
    } catch (error) {
      // エラーハンドリング
      logError('Customer update processing failed', error);
    }
  });
}
```

## 📱 PWA実装ガイドライン

### サービスワーカー
- **オフラインキャッシュ** - 静的アセットのキャッシュ
- **ネットワーク状態検知** - オンライン/オフライン切替
- **バックグラウンド同期** - オフライン時の操作同期

### オフラインデータ
- **IndexedDB使用** - 大量データの永続化
- **キャッシュAPI** - リクエスト/レスポンスのキャッシュ
- **状態管理との連携** - オフライン状態の管理

### 実装例
```typescript
// オフライン対応の注文作成
async function createOrderWithOfflineSupport(orderData) {
  try {
    // オンライン状態確認
    if (navigator.onLine) {
      // オンライン時は通常処理
      return await createOrder(orderData);
    } else {
      // オフライン時はローカルに保存
      const tempId = generateTempId();
      const tempOrder = {
        ...orderData,
        id: tempId,
        status: 'PENDING_SYNC',
        createdAt: new Date().toISOString()
      };
      
      // IndexedDBに保存
      await saveToOfflineStore('pendingOrders', tempOrder);
      
      // 同期キューに追加
      await registerForBackgroundSync('order-sync');
      
      return tempOrder;
    }
  } catch (error) {
    logError('Order creation with offline support failed', error);
    throw error;
  }
}

// バックグラウンド同期処理
async function syncPendingOrders() {
  // 未同期の注文を取得
  const pendingOrders = await getFromOfflineStore('pendingOrders');
  
  for (const order of pendingOrders) {
    try {
      // オンラインで注文作成
      const syncedOrder = await createOrder(order);
      
      // 同期済みとしてマーク
      await removeFromOfflineStore('pendingOrders', order.id);
      
      // ローカル状態更新
      orderStore.updateSyncedOrder(order.id, syncedOrder);
    } catch (error) {
      logError(`Failed to sync order ${order.id}`, error);
      // 再試行ロジック
    }
  }
}
```

## 🛠️ 開発プロセス

### 実装前
1. **要件確認** - 仕様書・デザイン確認
2. **既存実装調査** - 類似機能・コンポーネント確認
3. **影響範囲分析** - 他機能・他システムへの影響
4. **実装計画** - 段階的な実装手順

### 実装中
1. **コンポーネント設計** - 再利用性・保守性重視
2. **アクセシビリティ対応** - ARIA属性・キーボード操作
3. **レスポンシブ対応** - 各デバイス最適化
4. **エラーハンドリング** - ユーザーフレンドリーなエラー表示

### 実装後
1. **テスト実施** - 単体・統合・E2E
2. **パフォーマンス確認** - 表示速度・応答性
3. **アクセシビリティ検証** - 自動チェック・手動確認
4. **レビュー依頼** - コードレビュー・UXレビュー

## 🚫 禁止事項

- **顧客・予約データの直接更新**
- **他システムDBへの直接アクセス**
- **独自認証システムの実装**（共通JWT認証基盤を使用）
- **個人情報の不必要な取得・表示**
- **service.orderedイベント無しでの注文作成**
- **パフォーマンスを無視した実装**
- **アクセシビリティ対応の省略**

## 📚 ドキュメント参照ルール

- システム開発にあたっては `/docs` ディレクトリの統合ドキュメントを参照すること
- システム固有の情報は `/docs/systems/saas/` を参照
- 機能横断的な情報は `/docs/features/{機能名}/` を参照
- システム間連携は `/docs/integration/` を参照
- ドキュメントの更新を行う場合は、統合ドキュメント構造に従って更新すること

## 🔑 ポート設定

- **開発環境**: 3100
- **本番環境**: 設定に従う
- **strictPort: true**（他ポートへの自動移行禁止）

## 関連ドキュメント
- [システム概要](../../systems/saas/overview.md)
- [技術仕様](../../systems/saas/technical-spec.md)
- [UI/UX設計](../../systems/saas/ui-ux-design.md)
- [ディレクトリ構造](../../systems/saas/directory-structure.md)
- [イベント連携](../../integration/events/saas-events.md)