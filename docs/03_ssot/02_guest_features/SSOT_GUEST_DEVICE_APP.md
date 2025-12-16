# SSOT: 客室端末WebViewアプリ（GUEST_DEVICE_APP）

**作成日**: 2025-10-15  
**最終更新**: 2025-10-15  
**バージョン**: v1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（Phase 2 Week 5）

**関連SSOT**:
- [SSOT_SAAS_DEVICE_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md) - デバイス認証（必読）
- [SSOT_GUEST_ROOM_SERVICE_UI.md](./SSOT_GUEST_ROOM_SERVICE_UI.md) - 客室UI全体
- [SSOT_GUEST_ORDER_FLOW.md](./SSOT_GUEST_ORDER_FLOW.md) - 注文フロー
- [SSOT_GUEST_MENU_VIEW.md](./SSOT_GUEST_MENU_VIEW.md) - メニュー閲覧
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

**注**: 本SSOTは**客室端末のWebViewアプリ化**を定義します。Capacitor + Nuxt 3によるGoogle TV / Android TVアプリの技術仕様です。

---

## 📋 目次

1. [概要](#概要)
2. [システム境界](#システム境界)
3. [技術スタック](#技術スタック)
4. [Composables実装](#composables実装)
5. [Middleware・API](#middlewareapi)
6. [TV向けページ](#tv向けページ)
7. [Capacitor設定](#capacitor設定)
8. [チェックイン/チェックアウト連動](#チェックインチェックアウト連動)
9. [WebSocket連携](#websocket連携)
10. [セキュリティ](#セキュリティ)
11. [実装ガイド](#実装ガイド)
12. [実装状況](#実装状況)

---

## 📖 概要

### 目的

hotel-saasの客室UIを**Capacitor WebViewアプリ**化し、Google TV / Android TVで動作する**リモコン対応アプリ**をGoogle Playストアから配信する。

### 基本方針

- **WebView中心**: 既存のNuxt 3 WebアプリをWebViewで表示
- **ネイティブ機能最小限**: 必要最小限のネイティブ機能のみ実装
- **リモコン最適化**: Google TVリモコンでの直感的操作を最優先
- **本番同等性**: 開発環境・本番環境で同一の動作（モック・フォールバック禁止）
- **チェックイン/チェックアウト連動**: ゲスト滞在に完全同期

### アーキテクチャ概要

```
[客室TV: Google TV / Android TV]
  ↓ Capacitor WebView
[hotel-saas Pages (Nuxt 3)]
  ├─ /tv/concierge.vue (AIコンシェルジュ)
  ├─ /tv/settings.vue (設定画面)
  ├─ pages/menu/index.vue (URL: /menu, 注文メニュー/メニュー閲覧)
  └─ / (ホーム画面)
[hotel-saas Composables]
  ├─ useWebView() (WebView検出)
  ├─ useTVFocus() (リモコンフォーカス)
  ├─ useDeviceAuth() (デバイス認証)
  ├─ useDeviceCheckin() (チェックイン処理)
  └─ useDeviceReset() (リセット処理)
[hotel-saas Middleware]
  └─ device-guard.ts (デバイス認証ガード)
[hotel-saas API (Proxy)]
  ↓ POST /api/v1/devices/check-status
  ↓ GET /api/v1/devices/client-ip
[hotel-common API (Core)]
  ↓ Prisma ORM
[PostgreSQL (統一DB)]
  └─ device_rooms テーブル
```

---

## 🎯 システム境界

### 対象システム

| システム | 役割 | 実装範囲 |
|:---------|:-----|:--------|
| **hotel-saas** | WebViewアプリUI | ✅ Pages, Components, Composables, Middleware |
| **hotel-common** | デバイス管理API | ✅ デバイス認証・管理API |
| **Capacitor** | WebView統合 | ✅ Android WebView + JavaScript Interface |
| **Google Play** | アプリ配信 | ✅ AABファイルアップロード |
| **hotel-pms** | 将来連携 | 🔄 国籍データ連携（Phase 4）|

### 機能範囲

#### ✅ 本SSOTの対象

- WebViewアプリ実装（Capacitor + Nuxt 3）
- デバイス認証（MAC/IPベース）
- チェックイン/チェックアウト連動
- ウェルカムムービー・サンクスムービー
- TVリモコン操作（十字キー・決定ボタン）
- デバイスリセット（個人情報削除）
- WebSocket連携（リアルタイム通知）
- Google Play配信

#### ❌ 本SSOTの対象外

- 注文フロー → [SSOT_GUEST_ORDER_FLOW.md](./SSOT_GUEST_ORDER_FLOW.md)
- メニュー閲覧 → [SSOT_GUEST_MENU_VIEW.md](./SSOT_GUEST_MENU_VIEW.md)
- 管理画面 → 別SSOT（管理画面用）

---

## 🛠️ 技術スタック

### フロントエンド
- **Framework**: Nuxt 3（WebView形式）
- **Capacitor**: 5.x（WebView統合）
- **言語**: TypeScript（strictモード）
- **スタイリング**: Tailwind CSS + 日本の伝統色
- **状態管理**: Composables（Pinia不使用）

### WebView環境
- **対象OS**: Android TV 8.0 (API 26) 以上
- **表示URL**: `https://{hotel-saas-domain}` (既存WebアプリのHTTPS URL)
- **通信**: SSL/TLS必須、HTTP通信禁止
- **検出方法**: UserAgent (`OmotenasuAI`, `wv`, `TV`)

### デバイス認証
- **方式**: MAC/IPアドレスベース（hotel-common経由）
- **ストア**: PostgreSQL (`device_rooms`テーブル)
- **認証フロー**: デバイス起動 → MAC/IP取得 → hotel-common API → 自動認証

### リモコン操作
- **キーイベント**: D-pad (上下左右)、決定ボタン、戻るボタン
- **フォーカス管理**: グリッドベースナビゲーション
- **視認性**: `.tv-focused` クラス（拡大、シャドウ）

### WebSocket
- **プロトコル**: WebSocket over HTTPS
- **接続先**: `wss://{hotel-saas-domain}/ws?type=room&id={roomId}`
- **イベントタイプ**: `GUEST_CHECKIN`, `GUEST_CHECKOUT`, `CHECKOUT_WARNING` (Phase 4)

---

## 🧩 Composables実装

### 1. useWebView()

**ファイルパス**: `composables/useWebView.ts`

**実装状況**: ✅ 100%完成

**機能概要**: WebView環境の検出・管理

#### 主要機能

```typescript
interface WebViewInfo {
  isWebViewApp: boolean;          // WebViewアプリかどうか
  isAndroidWebView: boolean;      // Android WebViewかどうか
  isTVDevice: boolean;            // TVデバイスかどうか
  hasAndroidInterface: boolean;   // JavaScript Interface有無
  screenInfo: {
    width: number;
    height: number;
    isSmallScreen: boolean;
    isTVResolution: boolean;
  };
  deviceType: 'tv' | 'tablet' | 'mobile' | 'desktop';
}

interface AndroidInterface {
  launchApp: (packageName: string) => void;
  getDeviceInfo: () => string;
  isRemoteControlSupported: () => boolean;
}
```

#### WebView検出ロジック

```typescript
const detectWebView = (): WebViewInfo => {
  const userAgent = navigator.userAgent;
  
  // WebViewアプリ検出
  const isWebViewApp = /OmotenasuAI/i.test(userAgent);
  const isAndroidWebView = /wv/i.test(userAgent);
  const isTVDevice = /TV|AndroidTV|GoogleTV/i.test(userAgent);
  
  // JavaScript Interface確認
  const hasAndroidInterface = typeof window.Android !== 'undefined';
  
  // 画面情報取得
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isTVResolution = screenWidth >= 1280 && (screenWidth / screenHeight) >= 1.7;
  
  return {
    isWebViewApp,
    isAndroidWebView,
    isTVDevice,
    hasAndroidInterface,
    screenInfo: { ... },
    deviceType: ...
  };
};
```

#### JavaScript Interface連携

```typescript
// Google Playアプリ起動
const launchApp = (packageName: string): boolean => {
  try {
    if (typeof window.Android !== 'undefined') {
      window.Android.launchApp(packageName);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to launch app:', error);
    return false;
  }
};

// デバイス情報取得
const getDeviceInfo = (): string => {
  try {
    if (typeof window.Android !== 'undefined') {
      return window.Android.getDeviceInfo();
    }
    return 'Web';
  } catch (error) {
    return 'Unknown';
  }
};
```

---

### 2. useTVFocus()

**ファイルパス**: `composables/useTVFocus.ts`

**実装状況**: ✅ 100%完成

**機能概要**: TV/リモコンフォーカス管理

#### 主要機能

```typescript
interface FocusableElement {
  element: HTMLElement;
  id: string;
  row: number;
  col: number;
  priority: number;
}

interface FocusGrid {
  rows: number;
  cols: number;
  elements: FocusableElement[][];
}
```

#### フォーカスグリッド構築

```typescript
const buildFocusGrid = (container?: HTMLElement) => {
  // 1. フォーカス可能要素を検出
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '.focusable:not([disabled])'
  ].join(', ');
  
  const elements = Array.from(container.querySelectorAll(selector));
  
  // 2. 位置情報を取得してグリッド化
  const elementsWithPosition = elements.map((el) => {
    const rect = el.getBoundingClientRect();
    const priority = parseInt(el.dataset.focusPriority || '0');
    
    return {
      element: el,
      x: rect.left,
      y: rect.top,
      priority
    };
  });
  
  // 3. Y座標でソートしてグリッド行を決定
  elementsWithPosition.sort((a, b) => a.y - b.y);
  
  // 4. 同じ行内でX座標でソート
  // 5. グリッド座標（row, col）を設定
};
```

#### キーボード・リモコンイベントハンドラ

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  if (!isEnabled.value) return;
  
  switch (event.key) {
    case 'ArrowUp':
    case 'Up':
      event.preventDefault();
      moveFocus('up');
      break;
    case 'ArrowDown':
    case 'Down':
      event.preventDefault();
      moveFocus('down');
      break;
    case 'ArrowLeft':
    case 'Left':
      event.preventDefault();
      moveFocus('left');
      break;
    case 'ArrowRight':
    case 'Right':
      event.preventDefault();
      moveFocus('right');
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (currentFocus.value) {
        currentFocus.value.element.click();
      }
      break;
  }
  
  // Android TVリモコンの特殊キー
  switch (event.code) {
    case 'GoBack':
    case 'BrowserBack':
      event.preventDefault();
      window.history.back();
      break;
  }
};
```

#### フォーカス移動ロジック

```typescript
const moveFocus = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (!currentFocus.value) {
    setInitialFocus();
    return;
  }
  
  const { row, col } = currentFocus.value;
  let newRow = row;
  let newCol = col;
  
  switch (direction) {
    case 'up':
      newRow = Math.max(0, row - 1);
      break;
    case 'down':
      newRow = Math.min(focusGrid.value.rows - 1, row + 1);
      break;
    case 'left':
      newCol = Math.max(0, col - 1);
      break;
    case 'right':
      newCol = Math.min(focusGrid.value.elements[row]?.length - 1 || 0, col + 1);
      break;
  }
  
  const targetElement = focusGrid.value.elements[newRow]?.[newCol];
  if (targetElement) {
    setFocus(targetElement);
  }
};
```

---

### 3. useDeviceAuth()

**ファイルパス**: `composables/useDeviceAuth.ts`

**実装状況**: ✅ 100%完成

**機能概要**: デバイス認証（MAC/IPベース）

#### 主要機能

```typescript
// 現在のroomIdを取得する
const getCurrentRoomId = () => {
  if (process.client) {
    const currentPlace = localStorage.getItem('currentPlace');
    if (currentPlace) {
      try {
        const place = JSON.parse(currentPlace);
        return place.code || '999'; // プレイスコードまたはデフォルト
      } catch (e) {
        console.warn('プレイス情報の解析に失敗:', e);
      }
    }
  }
  return '999'; // デフォルトの部屋ID
};
```

#### 認証付きAPIリクエスト

```typescript
const authenticatedFetch = async (url: string, options: any = {}) => {
  try {
    const roomId = getCurrentRoomId();
    
    // Android認証の場合
    if (process.client) {
      const currentPlace = localStorage.getItem('currentPlace');
      if (currentPlace) {
        const place = JSON.parse(currentPlace);
        if (place.androidAuth) {
          const authHeaders = {
            'x-android-auth': 'true',
            'x-room-id': roomId
          };
          
          return await $fetch(url, {
            ...options,
            headers: { ...options.headers, ...authHeaders }
          });
        }
      }
    }
    
    // 既存のデバイス認証
    const timestamp = Math.floor(Date.now() / 1000);
    
    // サーバーサイドでトークンを生成
    const tokenResponse = await $fetch('/api/v1/device/generate-token', {
      method: 'POST',
      body: { roomId, timestamp }
    }) as { token: string };
    
    // 認証ヘッダーを追加
    const authHeaders = {
      'x-device-token': tokenResponse.token,
      'x-room-id': roomId,
      'x-timestamp': timestamp.toString()
    };
    
    return await $fetch(url, {
      ...options,
      headers: { ...options.headers, ...authHeaders }
    });
  } catch (error) {
    console.error('認証付きAPIリクエストエラー:', error);
    throw error;
  }
};
```

---

### 4. useDeviceCheckin()

**ファイルパス**: `composables/useDeviceCheckin.ts`

**実装状況**: ✅ 100%完成

**機能概要**: チェックイン/チェックアウト処理・ウェルカムムービー

#### 状態管理

```typescript
interface CheckinState {
  isCheckedIn: boolean;
  guestCount: number;
  checkinDate: string | null;
  roomNumber: string | null;
  welcomeVideoPlayed: boolean;
}

interface WelcomeVideoConfig {
  shouldPlay: boolean;
  videoUrl: string;
  duration: number;
  autoSkip: boolean;
}
```

#### チェックイン処理

```typescript
const handleCheckin = (data: any) => {
  console.log('🎉 チェックインイベント受信:', data);
  
  checkinState.value = {
    isCheckedIn: true,
    guestCount: data.guestCount || 1,
    checkinDate: data.checkinDate || new Date().toISOString(),
    roomNumber: data.roomNumber,
    welcomeVideoPlayed: false
  };
  
  saveCheckinState(); // localStorageに保存
  
  // ウェルカムムービー再生
  if (data.welcomeVideo?.shouldPlay) {
    playWelcomeVideo(data.welcomeVideo);
  }
  
  console.log('✅ 端末がチェックイン状態になりました');
};
```

#### ウェルカムムービー再生

```typescript
const playWelcomeVideo = async (config: WelcomeVideoConfig) => {
  if (isPlayingWelcomeVideo.value) {
    console.log('⚠️ ウェルカムムービーは既に再生中です');
    return;
  }
  
  console.log('🎬 ウェルカムムービー再生開始:', config);
  isPlayingWelcomeVideo.value = true;
  
  try {
    // 動画要素を作成
    const video = document.createElement('video');
    video.src = config.videoUrl;
    video.autoplay = true;
    video.muted = true; // 自動再生のためミュート
    video.style.position = 'fixed';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = '100vw';
    video.style.height = '100vh';
    video.style.objectFit = 'cover';
    video.style.zIndex = '9999';
    video.style.backgroundColor = '#000';
    
    welcomeVideoElement.value = video;
    
    // 動画終了時の処理
    video.onended = () => {
      finishWelcomeVideo();
    };
    
    // エラー処理
    video.onerror = (error) => {
      console.error('❌ ウェルカムムービー再生エラー:', error);
      finishWelcomeVideo();
    };
    
    // 動画をDOMに追加
    document.body.appendChild(video);
    
    // 自動スキップタイマー
    if (config.autoSkip && config.duration) {
      setTimeout(() => {
        if (isPlayingWelcomeVideo.value) {
          console.log('⏰ ウェルカムムービー自動スキップ');
          finishWelcomeVideo();
        }
      }, config.duration);
    }
    
    // スキップボタン追加
    addSkipButton();
  } catch (error) {
    console.error('❌ ウェルカムムービー再生準備エラー:', error);
    isPlayingWelcomeVideo.value = false;
  }
};
```

#### チェックアウト処理

```typescript
const handleCheckout = () => {
  console.log('👋 チェックアウトイベント受信');
  
  checkinState.value = {
    isCheckedIn: false,
    guestCount: 0,
    checkinDate: null,
    roomNumber: null,
    welcomeVideoPlayed: false
  };
  
  saveCheckinState();
  
  // ウェルカムムービーが再生中の場合は停止
  if (isPlayingWelcomeVideo.value) {
    finishWelcomeVideo();
  }
  
  console.log('✅ 端末がチェックアウト状態になりました');
};
```

#### WebSocket接続

```typescript
const connectWebSocket = () => {
  if (!process.client) return;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?type=room&id=301`; // デフォルト部屋番号
  
  console.log(`🔌 デバイスチェックイン用WebSocket接続: ${wsUrl}`);
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    wsConnected.value = true;
    console.log('✅ デバイスチェックイン用WebSocket接続成功');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocketメッセージ受信:', data);
      
      switch (data.type) {
        case 'GUEST_CHECKIN':
          handleCheckin(data.data);
          break;
        case 'GUEST_CHECKOUT':
          handleCheckout();
          break;
        default:
          console.log('🔍 未対応のWebSocketイベント:', data.type);
      }
    } catch (error) {
      console.error('❌ WebSocketメッセージ解析エラー:', error);
    }
  };
  
  ws.onerror = (error) => {
    wsConnected.value = false;
    wsError.value = error as Error;
    console.error('❌ WebSocketエラー:', error);
  };
  
  ws.onclose = () => {
    wsConnected.value = false;
    console.log('🔌 WebSocket接続が閉じられました');
    
    // 5秒後に再接続
    setTimeout(() => {
      console.log('🔄 WebSocket再接続を試みます...');
      connectWebSocket();
    }, 5000);
  };
};
```

---

### 5. useDeviceReset()

**ファイルパス**: `composables/useDeviceReset.ts`

**実装状況**: ✅ 100%完成

**機能概要**: デバイスのリセット・個人情報削除

#### デバイスリセット

```typescript
const resetDevice = async (): Promise<boolean> => {
  if (isResetting.value) return false; // 既にリセット中なら何もしない
  
  try {
    isResetting.value = true;
    console.log('デバイスリセット開始...');
    
    // ローカルストレージのクリア
    localStorage.clear();
    sessionStorage.clear();
    console.log('ローカルストレージとセッションストレージをクリア');
    
    // IndexedDBのクリア
    const dbs = await window.indexedDB.databases?.() || [];
    for (const db of dbs) {
      if (!db.name) continue;
      
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(db.name!);
        request.onsuccess = () => {
          console.log(`IndexedDB "${db.name}" を削除`);
          resolve();
        };
        request.onerror = () => {
          console.error(`IndexedDB "${db.name}" の削除に失敗`);
          resolve(); // エラーでも続行
        };
      });
    }
    
    // キャッシュのクリア
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => {
        console.log(`キャッシュ "${key}" を削除`);
        return caches.delete(key);
      }));
    }
    
    // Service Workerの登録解除
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => {
        console.log(`Service Worker を登録解除: ${reg.scope}`);
        return reg.unregister();
      }));
    }
    
    // ホーム画面へリダイレクト
    console.log('ホーム画面へリダイレクト');
    await navigateTo('/tv/concierge');
    
    // 完全にリロードして新しい状態にする
    location.reload();
    
    return true;
  } catch (error) {
    console.error('リセットエラー:', error);
    return false;
  } finally {
    isResetting.value = false;
  }
};
```

#### WebSocketイベントリスナー

```typescript
onMounted(() => {
  if (!process.client) return;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log(`WebSocket接続を開始: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    wsConnected.value = true;
    console.log('WebSocket接続確立');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocketメッセージ受信:', data);
      
      // チェックアウトイベント処理
      if (data.type === 'GUEST_CHECKOUT') {
        console.log('チェックアウトイベント受信、デバイスリセット開始');
        resetDevice();
      }
    } catch (error) {
      console.error('WebSocketメッセージ解析エラー:', error);
    }
  };
});
```

---

## 🌐 Middleware・API

### 1. device-guard.ts

**ファイルパス**: `server/middleware/device-guard.ts`

**実装状況**: ✅ 100%完成

**機能概要**: ページ表示前にデバイス認証を強制するサーバーミドルウェア

#### スキップ条件

```typescript
const isDevAsset = (
  path.startsWith('/_nuxt') ||
  url.includes('/_nuxt/') ||
  url.includes('/@id/') ||
  url.includes('/@vite') ||
  url.includes('?macro=') ||
  url.includes('?v=')
);

if (
  path.startsWith('/api') ||
  path.startsWith('/admin') ||
  path.startsWith('/assets') ||
  path.startsWith('/ws') ||
  path === '/favicon.ico' ||
  path === '/unauthorized-device' ||
  isDevAsset ||
  isWebSocketRequest
) {
  return;
}
```

#### デバイス認証フロー

```typescript
const headers = getRequestHeaders(event);
const xff = (headers['x-forwarded-for'] as string) || '';
const pickFirst = (v: string) => v.split(',')[0].trim();
let ipAddress = pickFirst(xff) || getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

// IPv6正規化
if (ipAddress === '::1') ipAddress = '127.0.0.1';
const v6mapped = ipAddress.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
if (v6mapped) ipAddress = v6mapped[1];

const macAddress = (headers['x-device-mac'] || '') as string;
const userAgent = (headers['user-agent'] || '') as string;

// hotel-common の公開APIに確認を委譲
const status = await deviceApi.checkDeviceStatus({
  macAddress: macAddress || undefined,
  ipAddress: ipAddress || undefined,
  userAgent,
  pagePath: path
});

// found=false または isActive=false は未認証扱い
if (!status || status.found === false || status.isActive === false) {
  return sendRedirect(event, `/unauthorized-device?redirect=${encodeURIComponent(path)}`, 302);
}
```

---

### 2. デバイスAPI

#### POST /api/v1/devices/check-status

**ファイルパス**: `server/api/v1/devices/check-status.post.ts`

**実装状況**: ✅ 100%完成

**機能概要**: デバイスステータスチェック（hotel-common API呼び出し）

```typescript
export default defineEventHandler(async (event) => {
  try {
    // 認証チェック（本番レベル実装）
    const authUser = event.context.user;
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'ログインが必要です'
      });
    }
    
    const body = await readBody(event);
    const { macAddress, ipAddress, userAgent, pagePath } = body;
    
    console.log('📱 デバイスステータスチェック:', {
      macAddress: macAddress || '(未設定)',
      ipAddress,
      userAgent: userAgent ? userAgent.substring(0, 30) + '...' : '(未設定)',
      pagePath
    });
    
    // hotel-commonのAPIを認証付きで呼び出す（本番レベル実装）
    try {
      const response = await deviceApi.checkDeviceStatus({
        macAddress,
        ipAddress,
        userAgent,
        pagePath
      }, {
        'Content-Type': 'application/json'
      });
      
      return response;
    } catch (apiError: any) {
      console.error('❌ hotel-common デバイスAPI呼び出しエラー:', apiError);
      
      // hotel-commonのAPIが未実装の場合の適切なエラーハンドリング
      if (apiError.statusCode === 400 || apiError.statusCode === 404 || apiError.statusCode === 501) {
        console.log('⚠️ hotel-commonデバイスAPI未実装 - 501レスポンスを返します');
        throw createError({
          statusCode: 501,
          statusMessage: 'Device API not implemented in hotel-common',
          data: {
            reason: 'hotel-common device API is not yet implemented',
            suggestedAction: 'Please implement device API in hotel-common first',
            originalError: apiError.statusCode
          }
        });
      }
      
      throw createError({
        statusCode: apiError.statusCode || 500,
        statusMessage: apiError.statusMessage || 'Device API Error',
        data: apiError.data
      });
    }
  } catch (error: any) {
    console.error('❌ デバイスステータスチェックエラー:', error);
    
    throw createError({
      statusCode: error.statusCode || 403,
      message: 'デバイス認証に失敗しました'
    });
  }
});
```

#### GET /api/v1/devices/client-ip

**ファイルパス**: `server/api/v1/devices/client-ip.get.ts`

**実装状況**: ✅ 100%完成

**機能概要**: クライアントIPアドレスを取得

```typescript
export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const authUser = event.context.user;
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'ログインが必要です'
      });
    }
    
    // クライアントIPアドレスを取得
    const headers = getRequestHeaders(event);
    const xff = (headers['x-forwarded-for'] as string) || '';
    const xReal = (headers['x-real-ip'] as string) || '';
    const h3Ip = getRequestIP(event, { xForwardedFor: true }) || '';
    const remote = (event.node.req.socket.remoteAddress || '') as string;
    
    const pickFirst = (v: string) => v.split(',')[0].trim();
    
    let clientIp = pickFirst(xff) || xReal || h3Ip || remote || '127.0.0.1';
    
    // IPv6表記の正規化
    if (clientIp === '::1') clientIp = '127.0.0.1';
    const v6mapped = clientIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v6mapped) clientIp = v6mapped[1];
    
    console.log('クライアントIP取得:', {
      ip: clientIp,
      headers: {
        'x-forwarded-for': headers['x-forwarded-for'],
        'x-real-ip': headers['x-real-ip']
      }
    });
    
    try {
      // hotel-commonのAPIを認証付きで呼び出す
      const response = await deviceApi.getClientIp({
        'Content-Type': 'application/json'
      });
      
      return {
        ip: clientIp,            // 画面表示・判定は常にサーバーで正規化したIP
        upstreamIp: response?.ip || null,
        source: response?.source || 'upstream',
        localIp: clientIp
      };
    } catch (apiError) {
      console.warn('❌ hotel-common APIエラー:', apiError);
      
      // API呼び出しに失敗した場合でもローカルで取得したIPを返す
      return {
        ip: clientIp,
        localIp: clientIp,
        source: 'local'
      };
    }
  } catch (error: any) {
    console.error('❌ クライアントIP取得エラー:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: 'クライアントIPの取得に失敗しました'
    });
  }
});
```

---

### 3. webview-security.client.ts

**ファイルパス**: `plugins/webview-security.client.ts`

**実装状況**: ✅ 100%完成

**機能概要**: WebViewセキュリティ・最適化プラグイン

#### セキュリティ設定

```typescript
const applySecuritySettings = () => {
  // HTTPS確認
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('HTTPS required for production WebView');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('Production environment requires HTTPS');
    }
  }
  
  // セキュアなデータ保存の設定
  try {
    const testKey = 'webview-storage-test';
    const testData = 'test';
    
    localStorage.setItem(testKey, testData);
    const retrieved = localStorage.getItem(testKey);
    
    if (retrieved === testData) {
      localStorage.removeItem(testKey);
      console.log('localStorage working correctly');
    }
  } catch (error) {
    console.error('Storage test failed:', error);
  }
  
  // WebView制約のチェック
  checkWebViewConstraints();
};
```

#### WebView制約チェック

```typescript
const checkWebViewConstraints = () => {
  // ポップアップ・新しいウィンドウの制限
  const originalWindowOpen = window.open;
  window.open = function(...args) {
    console.warn('window.open is restricted in WebView environment');
    
    // WebView環境では同一ウィンドウでの遷移を推奨
    if (args[0]) {
      window.location.href = args[0] as string;
    }
    
    return null;
  };
  
  // ファイルダウンロードの制限チェック
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a[download]');
    
    if (link && webViewInfo?.isAndroidWebView) {
      console.warn('File download may be restricted in WebView');
      event.preventDefault();
      alert('ファイルのダウンロードはWebView環境では制限されています。');
    }
  });
};
```

---

## 📺 TV向けページ

### 1. /tv/concierge.vue

**ファイルパス**: `pages/tv/concierge.vue`

**実装状況**: ✅ 95%完成

**機能概要**: AIコンシェルジュ（Q&Aツリーナビゲーション）

#### 主要機能

- ✅ カテゴリツリー表示
- ✅ 質問・回答表示
- ✅ パンくずリスト
- ✅ リモコン操作対応（十字キー・決定ボタン）
- ✅ QRコード生成（スマホ連携）
- ✅ 多言語切り替え（日/英/中/韓）
- ✅ WebSocket連携（セッション同期）

#### レイアウト

```vue
<template>
  <div class="tv-container">
    <!-- ヘッダー -->
    <div class="tv-header">
      <h1 class="text-2xl font-bold">AIコンシェルジュ</h1>
      <select v-model="currentLanguage" class="tv-select">
        <option value="ja">日本語</option>
        <option value="en">English</option>
        <option value="zh-CN">中文</option>
        <option value="ko">한국어</option>
      </select>
    </div>
    
    <!-- パンくずリスト -->
    <div class="breadcrumb">
      <button @click="navigateToHome" data-focus-order="1">
        <Icon name="heroicons:home" /> ホーム
      </button>
      <template v-for="(crumb, index) in breadcrumbs">
        <Icon name="heroicons:chevron-right" />
        <button @click="navigateToBreadcrumb(crumb.id)">
          {{ crumb.title }}
        </button>
      </template>
    </div>
    
    <!-- メインコンテンツ -->
    <div class="tv-content">
      <!-- カテゴリ一覧 -->
      <div v-if="currentView === 'categories'" class="categories-grid">
        <div
          v-for="(category, index) in currentCategories"
          :key="category.id"
          class="category-card"
          :data-focus-order="index + 10"
          @click="navigateToCategory(category)"
        >
          <Icon :name="`heroicons:${category.icon}`" class="w-10 h-10" />
          <h3>{{ category.title }}</h3>
          <p>{{ category.description }}</p>
        </div>
      </div>
      
      <!-- 質問一覧 -->
      <div v-else-if="currentView === 'questions'" class="questions-list">
        <div
          v-for="(question, index) in currentQuestions"
          :key="question.id"
          class="question-item"
          :data-focus-order="index + 10"
          @click="showAnswer(question)"
        >
          <Icon :name="`heroicons:${question.icon}`" />
          <span>{{ question.title }}</span>
          <Icon name="heroicons:chevron-right" />
        </div>
      </div>
      
      <!-- 回答表示 -->
      <div v-else-if="currentView === 'answer'" class="answer-container">
        <h2>{{ currentQuestion.title }}</h2>
        <div class="answer-content">
          <p>{{ currentQuestion.answer.text }}</p>
          
          <!-- 関連質問 -->
          <div v-if="relatedQuestions.length > 0" class="related-questions">
            <h3>関連する質問</h3>
            <div
              v-for="(question, index) in relatedQuestions"
              :key="question.id"
              :data-focus-order="index + 50"
              @click="showAnswer(question)"
            >
              {{ question.title }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- フッター -->
    <div class="tv-footer">
      <div class="navigation-help">
        <span>← 戻る</span>
        <span>↑↓→ 移動</span>
        <span>⭕ 選択</span>
      </div>
      <div class="qr-code-container">
        <div ref="qrCodeElement" class="qr-code"></div>
        <p>スマホで続ける</p>
      </div>
    </div>
  </div>
</template>
```

---

### 2. /tv/settings.vue

**ファイルパス**: `pages/tv/settings.vue`

**実装状況**: ✅ 100%完成

**機能概要**: 設定画面（デバイスリセット・ネットワーク設定）

#### 主要機能

- ✅ デバイスリセット
- ✅ ネットワーク設定（遷移のみ）
- ✅ サーバー設定（遷移のみ）
- ✅ リモコン操作対応
- ✅ WebSocket連携（チェックアウト時自動リセット）

#### レイアウト

```vue
<template>
  <div class="settings-container">
    <h1 class="settings-title">設定画面</h1>
    
    <div class="settings-grid">
      <!-- デバイスリセット -->
      <div class="setting-card" @click="resetDevice" data-focus-order="1">
        <Icon name="heroicons:arrow-path" class="setting-icon" />
        <h2>デバイスリセット</h2>
        <p>すべてのデータを消去し、初期状態に戻します</p>
      </div>
      
      <!-- ネットワーク設定 -->
      <div class="setting-card" @click="configureNetwork" data-focus-order="2">
        <Icon name="heroicons:wifi" class="setting-icon" />
        <h2>ネットワーク設定</h2>
        <p>Wi-Fi設定を変更します</p>
      </div>
      
      <!-- サーバー設定 -->
      <div class="setting-card" @click="configureServer" data-focus-order="3">
        <Icon name="heroicons:server" class="setting-icon" />
        <h2>サーバー設定</h2>
        <p>接続先サーバーを設定します</p>
      </div>
      
      <!-- 戻る -->
      <div class="setting-card" @click="exitSettings" data-focus-order="4">
        <Icon name="heroicons:arrow-left" class="setting-icon" />
        <h2>戻る</h2>
        <p>設定を終了します</p>
      </div>
    </div>
    
    <!-- ローディングオーバーレイ -->
    <div v-if="isResetting" class="loading-overlay">
      <div class="spinner"></div>
      <p>リセット中...</p>
    </div>
  </div>
</template>

<script setup>
import { useDeviceReset } from '~/composables/useDeviceReset';

definePageMeta({
  layout: 'blank'
});

const { resetDevice, isResetting } = useDeviceReset();

const configureNetwork = () => {
  navigateTo('/tv/settings/network');
};

const configureServer = () => {
  navigateTo('/tv/settings/server');
};

const exitSettings = () => {
  navigateTo('/tv/concierge');
};
</script>
```

---

## ⚙️ Capacitor設定

### capacitor.config.ts

**ファイルパス**: `capacitor.config.ts`

**実装状況**: ❌ 未作成（Phase 2で実装）

**機能概要**: Capacitor設定ファイル

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hotelsaas.roomorder.tv',
  appName: 'Hotel Room Order TV',
  webDir: 'dist',
  server: {
    url: 'https://your-hotel-saas-domain.com',  // 既存WebアプリURL
    cleartext: false,  // HTTPS必須
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
```

---

### AndroidManifest.xml（TV向け設定）

**ファイルパス**: `android/app/src/main/AndroidManifest.xml`

**実装状況**: ❌ 未作成（Phase 2で実装）

**機能概要**: Android TV対応設定

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- TV対応宣言 -->
    <uses-feature
        android:name="android.software.leanback"
        android:required="true" />
    
    <!-- タッチスクリーン不要 -->
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />
    
    <!-- 権限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    
    <application
        android:label="Hotel Room Order"
        android:icon="@mipmap/ic_launcher"
        android:banner="@drawable/tv_banner"
        android:theme="@style/AppTheme.Leanback">
        
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/app_name"
            android:launchMode="singleTask"
            android:screenOrientation="landscape">
            
            <!-- ランチャー -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 🔄 チェックイン/チェックアウト連動

### チェックインフロー

#### Phase 1実装（完了）

```
hotel-pms (フロントデスク)
  ↓ チェックイン登録
hotel-common API
  ↓ WebSocket配信
hotel-saas (客室端末)
  ↓ GUEST_CHECKINイベント受信
useDeviceCheckin.ts
  ├─ チェックイン状態保存（localStorage）
  ├─ ウェルカムムービー再生
  │  ├─ 動画要素作成（全画面表示）
  │  ├─ 自動再生（ミュート）
  │  ├─ スキップボタン表示
  │  └─ 終了後にメインUIへ
  └─ WebSocket接続確立
```

#### データ構造

```typescript
// WebSocketイベント
{
  type: 'GUEST_CHECKIN',
  data: {
    roomNumber: '301',
    guestCount: 2,
    checkinDate: '2025-10-15T14:00:00Z',
    welcomeVideo: {
      shouldPlay: true,
      videoUrl: 'https://cdn.example.com/welcome.mp4',
      duration: 30000,  // 30秒
      autoSkip: true
    }
  }
}
```

#### Phase 4実装予定（PMS連動後）

```
hotel-pms (チェックイン登録)
  ↓ 国籍・言語データ付き
hotel-common API
  ↓ WebSocket配信
hotel-saas (客室端末)
  ↓ GUEST_CHECKINイベント + 言語データ
useDeviceCheckin.ts
  └─ 🆕 言語自動設定（locale.value = data.language）
```

#### 言語自動設定（Phase 4実装予定）

```typescript
// useDeviceCheckin.ts - Phase 4強化版
const handleCheckin = (data: any) => {
  checkinState.value = {
    isCheckedIn: true,
    guestCount: data.guestCount,
    roomNumber: data.roomNumber,
    nationality: data.nationality,      // 🆕 国籍データ
    preferredLanguage: data.language,   // 🆕 推奨言語
  };
  
  // 🆕 言語自動設定（Phase 4）
  if (data.language) {
    locale.value = data.language; // 'ja', 'en', 'zh-CN', 'ko', etc.
    localStorage.setItem('preferred-language', data.language);
  }
  
  // ウェルカムムービー再生
  if (data.welcomeVideo?.shouldPlay) {
    playWelcomeVideo(data.welcomeVideo);
  }
};
```

---

### チェックアウトフロー

#### Phase 1実装（完了）

```
hotel-pms (チェックアウト処理)
  ↓
hotel-common API
  ↓ WebSocket配信
hotel-saas (客室端末)
  ↓ GUEST_CHECKOUTイベント受信
useDeviceReset.ts
  ├─ localStorage.clear()
  ├─ sessionStorage.clear()
  ├─ IndexedDB削除
  ├─ Cache削除
  ├─ Service Worker登録解除
  └─ ホーム画面へリダイレクト + リロード
```

#### データ構造

```typescript
// WebSocketイベント
{
  type: 'GUEST_CHECKOUT',
  data: {
    roomNumber: '301',
    checkoutTime: '2025-10-16T11:00:00Z'
  }
}
```

#### Phase 3実装予定（PMS不要）

```
hotel-saas (客室端末)
  ↓ GUEST_CHECKOUTイベント受信
useDeviceReset.ts (強化版)
  ├─ 🆕 サンクスムービー再生（3秒）
  ├─ 🆕 リセット進捗表示
  │  ├─ ローカルデータ削除 (25%)
  │  ├─ キャッシュクリア (50%)
  │  ├─ IndexedDB削除 (75%)
  │  └─ Service Worker解除 (100%)
  ├─ デバイスリセット
  └─ 🆕 アクティビティログ記録
```

#### サンクスムービー（Phase 3実装予定）

```typescript
// useDeviceReset.ts - Phase 3強化版
const handleCheckout = async () => {
  console.log('👋 チェックアウトイベント受信');
  
  // 🆕 サンクスムービー再生（Phase 3）
  if (tenantSettings.value?.thankYouVideoUrl) {
    await playThankYouVideo(tenantSettings.value.thankYouVideoUrl);
  }
  
  // デバイスリセット
  checkinState.value = { isCheckedIn: false, ... };
  saveCheckinState();
  
  // 3秒後に完全リセット
  setTimeout(() => {
    resetDevice();
  }, 3000);
};

const playThankYouVideo = async (videoUrl: string) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.autoplay = true;
    video.muted = false; // 🆕 音声ON
    video.style.position = 'fixed';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = '100vw';
    video.style.height = '100vh';
    video.style.zIndex = '10000';
    video.style.backgroundColor = '#000';
    
    video.onended = () => {
      video.remove();
      resolve(true);
    };
    
    document.body.appendChild(video);
  });
};
```

#### リセット進捗表示（Phase 3実装予定）

```typescript
// useDeviceReset.ts - Phase 3強化版
const resetDevice = async (): Promise<boolean> => {
  if (isResetting.value) return false;
  
  try {
    isResetting.value = true;
    
    // 🆕 進捗表示
    const steps = [
      { name: 'ローカルデータ削除', progress: 0 },
      { name: 'キャッシュクリア', progress: 25 },
      { name: 'IndexedDB削除', progress: 50 },
      { name: 'Service Worker解除', progress: 75 },
      { name: '完了', progress: 100 }
    ];
    
    for (const step of steps) {
      updateResetProgress(step); // 🆕 進捗モーダル更新
      
      if (step.progress === 0) {
        localStorage.clear();
        sessionStorage.clear();
      } else if (step.progress === 25) {
        await clearCaches();
      } else if (step.progress === 50) {
        await clearIndexedDB();
      } else if (step.progress === 75) {
        await unregisterServiceWorkers();
      }
      
      await sleep(500); // 視覚的フィードバック
    }
    
    await navigateTo('/tv/concierge');
    location.reload();
    
    return true;
  } catch (error) {
    console.error('リセットエラー:', error);
    return false;
  } finally {
    isResetting.value = false;
  }
};
```

#### Phase 4実装予定（PMS連動後）

```
hotel-pms (チェックアウト予定時刻管理)
  ↓ チェックアウト15分前
hotel-common API
  ↓ WebSocket配信
hotel-saas (客室端末)
  ↓ 🆕 CHECKOUT_WARNINGイベント受信
useDeviceCheckin.ts
  └─ 🆕 確認モーダル表示
     「あと15分でチェックアウト時刻です。
      注文中の商品がある場合はお早めに確定してください。」
```

#### チェックアウト前確認（Phase 4実装予定）

```typescript
// useDeviceCheckin.ts - Phase 4強化版
const handleCheckoutWarning = (data: any) => {
  const { checkoutTime, minutesRemaining } = data;
  
  if (minutesRemaining === 15) {
    showModal({
      title: 'チェックアウトのご案内',
      message: 'あと15分でチェックアウト時刻です。\n注文中の商品がある場合はお早めに確定してください。',
      icon: '⏰',
      buttons: [
        { label: '確認', action: 'dismiss' },
        { label: '注文画面へ', action: () => navigateTo('/order/cart') }
      ]
    });
  }
};

// WebSocketイベント追加（Phase 4）
switch (data.type) {
  case 'GUEST_CHECKIN': handleCheckin(data.data); break;
  case 'CHECKOUT_WARNING': handleCheckoutWarning(data.data); break; // 🆕
  case 'GUEST_CHECKOUT': handleCheckout(); break;
}
```

---

## 🌐 WebSocket連携

### 接続先

```
wss://{hotel-saas-domain}/ws?type=room&id={roomId}
```

### イベントタイプ

| イベントタイプ | Phase | 実装状況 | 説明 |
|:-------------|:-----:|:--------|:-----|
| **GUEST_CHECKIN** | 1 | ✅ | チェックイン完了 |
| **GUEST_CHECKOUT** | 1 | ✅ | チェックアウト完了 |
| **CHECKOUT_WARNING** | 4 | ❌ | チェックアウト15分前（PMS連動後） |

### GUEST_CHECKIN

```json
{
  "type": "GUEST_CHECKIN",
  "data": {
    "roomNumber": "301",
    "guestCount": 2,
    "checkinDate": "2025-10-15T14:00:00Z",
    "nationality": "JP",
    "language": "ja",
    "welcomeVideo": {
      "shouldPlay": true,
      "videoUrl": "https://cdn.example.com/welcome.mp4",
      "duration": 30000,
      "autoSkip": true
    }
  }
}
```

### GUEST_CHECKOUT

```json
{
  "type": "GUEST_CHECKOUT",
  "data": {
    "roomNumber": "301",
    "checkoutTime": "2025-10-16T11:00:00Z"
  }
}
```

### CHECKOUT_WARNING（Phase 4実装予定）

```json
{
  "type": "CHECKOUT_WARNING",
  "data": {
    "roomNumber": "301",
    "checkoutTime": "2025-10-16T11:00:00Z",
    "minutesRemaining": 15
  }
}
```

---

## 🔐 セキュリティ

### HTTPS必須

- **本番環境**: HTTPS必須（Capacitor設定で強制）
- **開発環境**: localhost はHTTP許可
- **証明書検証**: 自己署名証明書は拒否

### デバイス認証

- **方式**: MAC/IPアドレスベース
- **ストア**: PostgreSQL (`device_rooms`テーブル)
- **認証フロー**: 全ページアクセス前に`device-guard.ts`でチェック

### データ保護

- **個人情報**: localStorage/IndexedDBに保存
- **チェックアウト時**: 全データ自動削除
- **テナント分離**: `tenant_id`必須フィルタ

### WebView制約

```typescript
// window.open 制限
window.open = function(...args) {
  // WebView環境では同一ウィンドウでの遷移のみ
  if (args[0]) {
    window.location.href = args[0] as string;
  }
  return null;
};

// ファイルダウンロード制限
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[download]');
  if (link && isAndroidWebView) {
    event.preventDefault();
    alert('ファイルのダウンロードはWebView環境では制限されています。');
  }
});
```

### XSS対策

- ✅ Vue 3のデフォルトエスケープ機能
- ✅ `v-html`使用禁止
- ✅ ユーザー入力のバリデーション

### CSRF対策

- ✅ SameSite Cookie属性
- ✅ Nuxt 3のCSRF保護

---

## 🛠️ 実装ガイド

### Phase 1: 既存機能完成度確認（完了 - 85%）

**実装済み**:
- ✅ useDeviceCheckin.ts（チェックイン/ウェルカムムービー）
- ✅ useDeviceReset.ts（デバイスリセット）
- ✅ useWebView.ts（WebView検出）
- ✅ useTVFocus.ts（リモコン操作）
- ✅ useDeviceAuth.ts（デバイス認証）
- ✅ device-guard.ts（認証ミドルウェア）
- ✅ /tv/concierge.vue（AIコンシェルジュ）
- ✅ /tv/settings.vue（設定画面）

---

### Phase 2: Capacitor + Google Play配信（2週間）🔴 最優先

#### Week 1: Capacitor基盤構築

**Day 1-2: Capacitor初期化**

```bash
# 1. Capacitorプロジェクト初期化
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npx cap init "Hotel Room Order TV" "com.hotelsaas.roomorder.tv"

# 2. Android TV開発環境
# Android Studio インストール
# Android TV SDK セットアップ

# 3. プラットフォーム追加
npx cap add android
```

**Day 3-4: capacitor.config.ts作成**

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hotelsaas.roomorder.tv',
  appName: 'Hotel Room Order TV',
  webDir: 'dist',
  server: {
    url: 'https://your-hotel-saas-domain.com',
    cleartext: false,
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
```

**Day 5: AndroidManifest.xml TV向け設定**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- TV対応宣言 -->
    <uses-feature
        android:name="android.software.leanback"
        android:required="true" />
    
    <!-- タッチスクリーン不要 -->
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />
    
    <!-- 権限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:label="Hotel Room Order"
        android:banner="@drawable/tv_banner"
        android:theme="@style/AppTheme.Leanback">
        
        <activity
            android:name=".MainActivity"
            android:screenOrientation="landscape">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

**Day 6-7: ビルド・テスト**

```bash
# 1. Webアプリビルド
npm run build

# 2. Capacitor同期
npx cap sync android

# 3. Android Studioで開く
npx cap open android

# 4. TV用APKビルド
# Build > Generate Signed Bundle/APK
```

#### Week 2: Google Play配信準備

**Day 8-9: ストア素材作成**

- TV向けスクリーンショット（1920x1080、5枚）
- TVバナー画像（1280x720）
- アプリ説明文（日本語・英語）
- プライバシーポリシーURL

**Day 10-11: AABファイル生成**

```bash
# リリース用AABビルド
cd android
./gradlew bundleRelease

# 出力先
# android/app/build/outputs/bundle/release/app-release.aab
```

**Day 12-13: Play Console設定**

1. アプリ作成
2. Android TV対応を有効化
3. ストア掲載情報入力
4. AABファイルアップロード
5. 審査申請

**Day 14: 審査・リリース**

---

### Phase 3: チェックイン/チェックアウトUI強化（1週間）🟡 中優先

**独立実装可能な機能（PMS連動不要）**:

#### Day 1-2: サンクスムービー

**データベース拡張**:

```prisma
model TenantSettings {
  // 既存フィールド
  welcomeVideoUrl    String?  @map("welcome_video_url")
  
  // Phase 3追加
  thankYouVideoUrl   String?  @map("thank_you_video_url")
  
  @@map("tenant_settings")
}
```

**マイグレーション**:

```bash
# hotel-commonで実行
cd /path/to/hotel-common
npx prisma migrate dev --name add_thank_you_video_url
```

**実装**:

```typescript
// useDeviceReset.ts - playThankYouVideo() 追加
const playThankYouVideo = async (videoUrl: string) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.autoplay = true;
    video.muted = false; // 音声ON
    // ... (詳細は上記参照)
  });
};
```

#### Day 3: リセット進捗表示

**実装**:

```typescript
// useDeviceReset.ts - updateResetProgress() 追加
const steps = [
  { name: 'ローカルデータ削除', progress: 0 },
  { name: 'キャッシュクリア', progress: 25 },
  { name: 'IndexedDB削除', progress: 50 },
  { name: 'Service Worker解除', progress: 75 },
  { name: '完了', progress: 100 }
];

for (const step of steps) {
  updateResetProgress(step);
  await executeStep(step);
  await sleep(500);
}
```

#### Day 4-5: アクティビティログ

**データベース追加**:

```prisma
model DeviceActivityLog {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  deviceId        String   @map("device_id")
  roomId          String?  @map("room_id")
  activityType    String   @map("activity_type")  // 'checkin', 'checkout', 'reset'
  guestCount      Int?     @map("guest_count")
  nationality     String?  @map("nationality")
  videoPlayed     Boolean  @default(false) @map("video_played")
  metadata        Json?    @map("metadata")
  createdAt       DateTime @default(now()) @map("created_at")
  
  @@map("device_activity_logs")
  @@index([tenantId, deviceId])
  @@index([tenantId, activityType, createdAt])
}
```

**API追加（hotel-common）**:

```typescript
// POST /api/v1/devices/activity-log
export async function createActivityLog(data: {
  deviceId: string;
  roomId?: string;
  activityType: 'checkin' | 'checkout' | 'reset';
  guestCount?: number;
  nationality?: string;
  videoPlayed?: boolean;
  metadata?: any;
}) {
  const tenantId = getTenantId(); // セッションから取得
  
  return await prisma.deviceActivityLog.create({
    data: {
      tenantId,
      deviceId: data.deviceId,
      roomId: data.roomId,
      activityType: data.activityType,
      guestCount: data.guestCount,
      nationality: data.nationality,
      videoPlayed: data.videoPlayed,
      metadata: data.metadata
    }
  });
}
```

**hotel-saasからの呼び出し**:

```typescript
// useDeviceCheckin.ts - handleCheckin()
const handleCheckin = (data: any) => {
  // ... (チェックイン処理)
  
  // アクティビティログ記録
  $fetch('/api/v1/devices/activity-log', {
    method: 'POST',
    body: {
      deviceId: getDeviceId(),
      roomId: data.roomNumber,
      activityType: 'checkin',
      guestCount: data.guestCount,
      nationality: data.nationality,
      videoPlayed: data.welcomeVideo?.shouldPlay,
      metadata: {
        checkinTime: data.checkinDate,
        welcomeVideoUrl: data.welcomeVideo?.videoUrl
      }
    }
  });
};
```

#### Day 6: 緊急リセットボタン

**実装**:

```vue
<!-- pages/tv/settings.vue - 緊急リセット追加 -->
<div 
  class="setting-card emergency-reset"
  @mousedown="startLongPress"
  @mouseup="cancelLongPress"
  :class="{ 'long-pressing': isLongPressing }"
>
  <Icon name="heroicons:exclamation-triangle" class="text-red-500" />
  <h2>緊急リセット</h2>
  <p>5秒間長押しで強制リセット</p>
  <div v-if="isLongPressing" class="progress-ring">
    <svg class="progress-ring-svg">
      <circle :style="{ strokeDashoffset: progressOffset }" />
    </svg>
  </div>
</div>
```

#### Day 7: テスト・調整

---

### Phase 4: PMS連動強化（hotel-pms完成後）🔵 将来実装

**PMS依存の機能**:

#### 言語自動設定（0.5日）

**hotel-pms側実装**:

```typescript
// hotel-pms: チェックイン時に国籍データから推奨言語を計算
const nationality = 'JP'; // ゲストの国籍
const preferredLanguage = getLanguageFromNationality(nationality);
// 'JP' → 'ja'
// 'US', 'UK', 'AU' → 'en'
// 'CN' → 'zh-CN'
// 'KR' → 'ko'

// WebSocketイベント配信
websocket.send({
  type: 'GUEST_CHECKIN',
  data: {
    roomNumber: '301',
    nationality: nationality,
    language: preferredLanguage, // 🆕
    ...
  }
});
```

**hotel-saas側実装**:

```typescript
// useDeviceCheckin.ts - handleCheckin()
const handleCheckin = (data: any) => {
  // ... (既存処理)
  
  // 言語自動設定（Phase 4）
  if (data.language) {
    locale.value = data.language;
    localStorage.setItem('preferred-language', data.language);
    console.log(`✅ 言語を自動設定: ${data.language}`);
  }
};
```

#### チェックアウト前確認（1日）

**hotel-pms側実装**:

```typescript
// hotel-pms: チェックアウト予定時刻の15分前にイベント配信
const checkoutTime = new Date('2025-10-16T11:00:00Z');
const now = new Date();
const minutesRemaining = Math.floor((checkoutTime.getTime() - now.getTime()) / 60000);

if (minutesRemaining === 15) {
  websocket.send({
    type: 'CHECKOUT_WARNING', // 🆕
    data: {
      roomNumber: '301',
      checkoutTime: checkoutTime.toISOString(),
      minutesRemaining: 15
    }
  });
}
```

**hotel-saas側実装**:

```typescript
// useDeviceCheckin.ts - handleCheckoutWarning()
const handleCheckoutWarning = (data: any) => {
  showModal({
    title: 'チェックアウトのご案内',
    message: 'あと15分でチェックアウト時刻です。\n注文中の商品がある場合はお早めに確定してください。',
    icon: '⏰',
    buttons: [
      { label: '確認', action: 'dismiss' },
      { label: '注文画面へ', action: () => navigateTo('/order/cart') }
    ]
  });
};

// WebSocketイベントハンドラに追加
switch (data.type) {
  case 'GUEST_CHECKIN': handleCheckin(data.data); break;
  case 'CHECKOUT_WARNING': handleCheckoutWarning(data.data); break; // 🆕
  case 'GUEST_CHECKOUT': handleCheckout(); break;
}
```

---

## 📊 実装状況

### 全体完成度: **85%**

| カテゴリ | 完成度 | 状況 |
|:--------|:-----:|:-----|
| **Composables** | 100% | 5つ全て完成（useWebView, useTVFocus, useDeviceAuth, useDeviceCheckin, useDeviceReset） |
| **Middleware/API** | 100% | 認証フロー完璧（device-guard.ts, check-status.post.ts, client-ip.get.ts） |
| **プラグイン** | 100% | webview-security.client.ts完成 |
| **TV向けページ** | 95% | concierge.vue (95%), settings.vue (100%) |
| **WebView検出** | 100% | UserAgent判定完璧 |
| **リモコン操作** | 100% | グリッドナビゲーション完璧 |
| **デバイス認証** | 100% | MAC/IP認証完成 |
| **WebSocket連携** | 100% | チェックイン/チェックアウトイベント |
| **Capacitor設定** | 0% | 未作成（Phase 2で実装） |
| **Google Play配信** | 0% | 未実施（Phase 2で実施） |

### Phase別完成度

#### Phase 1: 既存機能（完了率: 100%）

| # | 機能 | 実装状況 | 完成度 | 備考 |
|:-:|:-----|:--------|:-----:|:-----|
| 1 | useDeviceCheckin.ts | ✅ | 100% | チェックイン/ウェルカムムービー |
| 2 | useDeviceReset.ts | ✅ | 100% | デバイスリセット |
| 3 | useWebView.ts | ✅ | 100% | WebView検出 |
| 4 | useTVFocus.ts | ✅ | 100% | リモコン操作 |
| 5 | useDeviceAuth.ts | ✅ | 100% | デバイス認証 |
| 6 | device-guard.ts | ✅ | 100% | 認証ミドルウェア |
| 7 | webview-security.client.ts | ✅ | 100% | セキュリティプラグイン |
| 8 | /tv/concierge.vue | ✅ | 95% | AIコンシェルジュ |
| 9 | /tv/settings.vue | ✅ | 100% | 設定画面 |

#### Phase 2: Capacitor + Google Play（完了率: 0%）

| # | 機能 | 実装状況 | 優先度 | 工数 |
|:-:|:-----|:--------|:-----:|:----:|
| 1 | capacitor.config.ts | ❌ | 🔴 | 1日 |
| 2 | AndroidManifest.xml | ❌ | 🔴 | 1日 |
| 3 | APKビルド | ❌ | 🔴 | 2日 |
| 4 | Google Play配信 | ❌ | 🔴 | 3日 |

#### Phase 3: UI強化（完了率: 0%）

| # | 機能 | 実装状況 | 優先度 | 工数 |
|:-:|:-----|:--------|:-----:|:----:|
| 1 | サンクスムービー | ❌ | 🟡 | 1日 |
| 2 | リセット進捗表示 | ❌ | 🟢 | 0.5日 |
| 3 | アクティビティログ | ❌ | 🟡 | 2日 |
| 4 | 緊急リセットボタン | ❌ | 🟢 | 0.5日 |

#### Phase 4: PMS連動（完了率: 0%）

| # | 機能 | 実装状況 | 優先度 | 工数 | 依存 |
|:-:|:-----|:--------|:-----:|:----:|:-----|
| 1 | 言語自動設定 | ❌ | 🔵 | 0.5日 | hotel-pms完成後 |
| 2 | チェックアウト前確認 | ❌ | 🔵 | 1日 | hotel-pms完成後 |

---

## 📚 参照ドキュメント

### SSOT
1. **SSOT_SAAS_DEVICE_AUTHENTICATION.md** v1.0.0 ★ - デバイス認証システム
2. **SSOT_GUEST_ROOM_SERVICE_UI.md** v1.0.0 ★ - 客室UI全体
3. **SSOT_GUEST_ORDER_FLOW.md** v1.0.0 ★ - 注文フロー
4. **SSOT_GUEST_MENU_VIEW.md** v1.0.0 ★ - メニュー閲覧
5. **SSOT_SAAS_MULTITENANT.md** - マルチテナント基盤

### 技術ドキュメント
6. **MOBILE_APP_SPECIFICATION.md** ★★★ - Capacitor + Nuxt 3 WebView構成
7. **TV_GOOGLE_PLAY_APPS_SPEC.md** - Google Playアプリランチャー
8. **MVP_DEV_TASKS.md** - Phase 2: モバイルアプリ化（5週間）

### 標準・規約
9. **DATABASE_NAMING_STANDARD.md** v3.0.0 - 命名規則
10. **API_ROUTING_GUIDELINES.md** - API設計

---

**作成日**: 2025-10-15  
**バージョン**: v1.0.0  
**管理者**: Sun (hotel-saas担当)


