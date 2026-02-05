# DEV-0181 実装指示書: hotel-saas-rebuild

**タスクID**: DEV-0181 / COM-247
**対象リポジトリ**: hotel-saas-rebuild
**SSOT**: `docs/03_ssot/01_admin_features/SSOT_DEV-0181_DEVICE_SESSION_RESET.md`
**作成日**: 2026-02-05

---

## 概要

客室端末セッションリセット機能のフロントエンド実装。

**実装内容**:
1. APIプロキシ実装（4エンドポイント）
2. 管理画面リセットボタンUI追加
3. QRコードリセットページ新規作成
4. useDeviceReset composable拡張

---

## 1. APIプロキシ実装

### 1.1 デバイスリセットAPIプロキシ

**ファイル**: `server/api/v1/admin/devices/[deviceId]/reset.post.ts`

```typescript
import { defineEventHandler, readBody, getRouterParams } from 'h3';
import { callHotelCommonAPI } from '~/server/utils/api-client';

export default defineEventHandler(async (event) => {
  const { deviceId } = getRouterParams(event);
  const body = await readBody(event);

  return callHotelCommonAPI(event, `/api/v1/admin/devices/${deviceId}/reset`, {
    method: 'POST',
    body,
  });
});
```

### 1.2 トークン生成APIプロキシ

**ファイル**: `server/api/v1/admin/devices/[deviceId]/reset-token.post.ts`

```typescript
import { defineEventHandler, getRouterParams } from 'h3';
import { callHotelCommonAPI } from '~/server/utils/api-client';

export default defineEventHandler(async (event) => {
  const { deviceId } = getRouterParams(event);

  return callHotelCommonAPI(event, `/api/v1/admin/devices/${deviceId}/reset-token`, {
    method: 'POST',
  });
});
```

### 1.3 トークンリセットAPIプロキシ

**ファイル**: `server/api/v1/devices/reset-by-token.post.ts`

```typescript
import { defineEventHandler, readBody } from 'h3';
import { callHotelCommonAPI } from '~/server/utils/api-client';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // 認証不要（トークンベース）
  return callHotelCommonAPI(event, '/api/v1/devices/reset-by-token', {
    method: 'POST',
    body,
    skipAuth: true, // Session認証スキップ
  });
});
```

### 1.4 リセットログ一覧APIプロキシ

**ファイル**: `server/api/v1/admin/devices/reset-logs.get.ts`

```typescript
import { defineEventHandler, getQuery } from 'h3';
import { callHotelCommonAPI } from '~/server/utils/api-client';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const queryString = new URLSearchParams(query as Record<string, string>).toString();

  return callHotelCommonAPI(event, `/api/v1/admin/devices/reset-logs?${queryString}`, {
    method: 'GET',
  });
});
```

---

## 2. 管理画面リセットボタンUI

### 2.1 デバイス一覧ページ修正

**ファイル**: `pages/admin/devices/index.vue`

**追加内容**:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();

// リセット関連
const showResetModal = ref(false);
const selectedDevice = ref<{ id: string; roomId: string } | null>(null);
const isResetting = ref(false);
const resetError = ref<string | null>(null);

/**
 * リセット確認モーダル表示
 */
function confirmReset(device: { id: string; roomId: string }) {
  selectedDevice.value = device;
  showResetModal.value = true;
  resetError.value = null;
}

/**
 * リセット実行
 */
async function executeReset() {
  if (!selectedDevice.value) return;

  isResetting.value = true;
  resetError.value = null;

  try {
    const response = await $fetch(`/api/v1/admin/devices/${selectedDevice.value.id}/reset`, {
      method: 'POST',
    });

    if (response.success) {
      // 成功通知
      showSuccessToast(`客室${selectedDevice.value.roomId}の端末をリセットしました`);
      showResetModal.value = false;
    } else {
      resetError.value = response.error?.message || 'リセットに失敗しました';
    }
  } catch (err: any) {
    resetError.value = err.data?.error?.message || 'リセットに失敗しました';
  } finally {
    isResetting.value = false;
  }
}

/**
 * QRコード生成
 */
async function generateQRCode(device: { id: string; roomId: string }) {
  try {
    const response = await $fetch(`/api/v1/admin/devices/${device.id}/reset-token`, {
      method: 'POST',
    });

    if (response.success) {
      // QRコードモーダル表示またはダウンロード
      showQRCodeModal(response.data.qrCodeUrl, device.roomId);
    }
  } catch (err: any) {
    showErrorToast(err.data?.error?.message || 'QRコード生成に失敗しました');
  }
}
</script>

<template>
  <!-- デバイス一覧テーブルに追加 -->
  <template #item.actions="{ item }">
    <v-btn
      v-if="authStore.hasPermission('device:reset')"
      color="warning"
      size="small"
      @click="confirmReset(item)"
    >
      リセット
    </v-btn>
    <v-btn
      v-if="authStore.hasPermission('device:generate-reset-token')"
      color="info"
      size="small"
      @click="generateQRCode(item)"
    >
      QR生成
    </v-btn>
  </template>

  <!-- リセット確認モーダル -->
  <v-dialog v-model="showResetModal" max-width="400">
    <v-card>
      <v-card-title>端末リセット確認</v-card-title>
      <v-card-text>
        <p>客室 <strong>{{ selectedDevice?.roomId }}</strong> の端末をリセットしますか？</p>
        <p class="text-caption text-grey">
          以下のデータが削除されます：
        </p>
        <ul class="text-caption text-grey">
          <li>localStorage（ゲスト設定）</li>
          <li>sessionStorage（一時データ）</li>
          <li>IndexedDB（キャッシュ）</li>
        </ul>
        <v-alert v-if="resetError" type="error" density="compact" class="mt-4">
          {{ resetError }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showResetModal = false">キャンセル</v-btn>
        <v-btn
          color="warning"
          :loading="isResetting"
          @click="executeReset"
        >
          リセット実行
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

---

## 3. QRコードリセットページ

### 3.1 新規ページ作成

**ファイル**: `pages/device-reset.vue`

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// 状態管理
const status = ref<'loading' | 'ready' | 'resetting' | 'success' | 'error'>('loading');
const errorMessage = ref<string | null>(null);
const deviceInfo = ref<{ deviceId: string; roomId: string } | null>(null);

/**
 * トークンからデバイス情報を取得（JWTデコード）
 */
function decodeToken(token: string): { tenantId: string; deviceId: string; roomId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      tenantId: payload.tenantId,
      deviceId: payload.deviceId,
      roomId: payload.roomId,
    };
  } catch {
    return null;
  }
}

/**
 * 初期化処理
 */
onMounted(async () => {
  const token = route.query.token as string;

  if (!token) {
    status.value = 'error';
    errorMessage.value = 'QRコードが無効です';
    return;
  }

  // トークンデコードでデバイス情報取得
  const decoded = decodeToken(token);
  if (!decoded) {
    status.value = 'error';
    errorMessage.value = '無効なQRコードです';
    return;
  }

  deviceInfo.value = {
    deviceId: decoded.deviceId,
    roomId: decoded.roomId,
  };
  status.value = 'ready';
});

/**
 * リセット実行
 */
async function executeReset() {
  const token = route.query.token as string;

  status.value = 'resetting';
  errorMessage.value = null;

  try {
    const response = await $fetch('/api/v1/devices/reset-by-token', {
      method: 'POST',
      body: { token },
    });

    if (response.success) {
      status.value = 'success';
    } else {
      status.value = 'error';
      errorMessage.value = response.error?.message || 'リセットに失敗しました';
    }
  } catch (err: any) {
    status.value = 'error';
    errorMessage.value = err.data?.error?.message || 'リセットに失敗しました';
  }
}
</script>

<template>
  <div class="device-reset-page">
    <div class="container">
      <!-- ローディング -->
      <div v-if="status === 'loading'" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">確認中...</p>
      </div>

      <!-- リセット確認画面 -->
      <div v-else-if="status === 'ready'" class="text-center">
        <v-icon size="64" color="warning">mdi-refresh</v-icon>
        <h1 class="mt-4">端末リセット</h1>
        <p class="mt-2">
          客室 <strong>{{ deviceInfo?.roomId }}</strong> の端末をリセットします
        </p>
        <v-btn
          color="warning"
          size="large"
          class="mt-4"
          @click="executeReset"
        >
          端末をリセットする
        </v-btn>
      </div>

      <!-- リセット中 -->
      <div v-else-if="status === 'resetting'" class="text-center">
        <v-progress-circular indeterminate color="warning" size="64" />
        <p class="mt-4">リセット中...</p>
      </div>

      <!-- リセット完了 -->
      <div v-else-if="status === 'success'" class="text-center">
        <v-icon size="64" color="success">mdi-check-circle</v-icon>
        <h1 class="mt-4">リセット完了</h1>
        <p class="mt-2">
          客室 <strong>{{ deviceInfo?.roomId }}</strong> の端末がリセットされました
        </p>
      </div>

      <!-- エラー -->
      <div v-else-if="status === 'error'" class="text-center">
        <v-icon size="64" color="error">mdi-alert-circle</v-icon>
        <h1 class="mt-4">エラー</h1>
        <p class="mt-2 text-error">{{ errorMessage }}</p>
        <p class="mt-4 text-caption">
          問題が解決しない場合は、フロントにお問い合わせください。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.container {
  max-width: 400px;
  width: 100%;
}
</style>
```

---

## 4. useDeviceReset Composable拡張

### 4.1 WebSocketイベント処理追加

**ファイル**: `composables/useDeviceReset.ts`

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

interface DeviceResetEvent {
  deviceId: string;
  roomId: string;
  resetMethod: 'admin_panel' | 'qr_code';
  executedBy: string;
  executedAt: string;
  reason?: string;
}

export function useDeviceReset() {
  const isResetting = ref(false);
  const lastResetAt = ref<string | null>(null);
  let ws: WebSocket | null = null;

  /**
   * WebSocket接続
   */
  function connectWebSocket() {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[DeviceReset] WebSocket connected');

      // デバイス登録
      const deviceId = localStorage.getItem('deviceId');
      const roomId = localStorage.getItem('roomId');

      if (deviceId && roomId) {
        ws?.send(JSON.stringify({
          type: 'device:connected',
          payload: { deviceId, roomId },
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'device:reset') {
          handleResetEvent(message.payload as DeviceResetEvent);
        }
      } catch (err) {
        console.error('[DeviceReset] Failed to parse message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[DeviceReset] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[DeviceReset] WebSocket disconnected');
      // 再接続ロジック
      setTimeout(connectWebSocket, 3000);
    };
  }

  /**
   * リセットイベント処理
   */
  async function handleResetEvent(event: DeviceResetEvent) {
    console.log('[DeviceReset] Received reset event:', event);

    isResetting.value = true;

    try {
      // 1. localStorage削除
      localStorage.clear();

      // 2. sessionStorage削除
      sessionStorage.clear();

      // 3. IndexedDB削除
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      // 4. キャッシュ削除（Service Worker）
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      lastResetAt.value = event.executedAt;

      // 5. リロード
      console.log('[DeviceReset] Reloading page...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('[DeviceReset] Reset failed:', err);
    } finally {
      isResetting.value = false;
    }
  }

  /**
   * 手動リセット（デバッグ用）
   */
  async function manualReset() {
    await handleResetEvent({
      deviceId: localStorage.getItem('deviceId') || 'unknown',
      roomId: localStorage.getItem('roomId') || 'unknown',
      resetMethod: 'admin_panel',
      executedBy: 'manual',
      executedAt: new Date().toISOString(),
    });
  }

  onMounted(() => {
    // ゲスト端末の場合のみWebSocket接続
    const isGuestDevice = localStorage.getItem('deviceId');
    if (isGuestDevice) {
      connectWebSocket();
    }
  });

  onUnmounted(() => {
    ws?.close();
  });

  return {
    isResetting,
    lastResetAt,
    manualReset,
    connectWebSocket,
  };
}
```

---

## 5. ルート設定

### 5.1 QRコードリセットページは認証不要

**ファイル**: `middleware/auth.ts`（または `nuxt.config.ts`）

```typescript
// device-reset ページは認証不要
const publicRoutes = [
  '/device-reset',
  // ... 他の公開ルート
];
```

---

## 6. テスト要件

### 6.1 E2Eテスト

```typescript
// tests/e2e/device-reset.spec.ts
describe('Device Reset', () => {
  describe('Admin Panel Reset', () => {
    it('should show reset button for devices', async () => {
      // テスト実装
    });

    it('should show confirmation modal', async () => {
      // テスト実装
    });

    it('should execute reset and show success message', async () => {
      // テスト実装
    });

    it('should show error for unauthorized users', async () => {
      // テスト実装
    });
  });

  describe('QR Code Reset', () => {
    it('should show device info on valid token', async () => {
      // テスト実装
    });

    it('should show error on expired token', async () => {
      // テスト実装
    });

    it('should show error on already used token', async () => {
      // テスト実装
    });

    it('should execute reset and show success', async () => {
      // テスト実装
    });
  });
});
```

### 6.2 手動テスト手順

```markdown
## 管理画面リセットテスト

1. 管理画面にログイン（device:reset権限あり）
2. /admin/devices にアクセス
3. 任意の端末の「リセット」ボタンをクリック
4. 確認モーダルが表示されることを確認
5. 「リセット実行」をクリック
6. 「リセット完了」通知が表示されることを確認
7. 客室端末がリロードされることを確認

## QRコードリセットテスト

1. 管理画面で任意の端末の「QR生成」ボタンをクリック
2. QRコードURLをコピー
3. スマートフォンでURLにアクセス
4. 客室番号が表示されることを確認
5. 「端末をリセットする」ボタンをタップ
6. 「リセット完了」画面が表示されることを確認
7. 客室端末がリロードされることを確認
8. 同じURLに再度アクセス
9. 「このQRコードは既に使用されています」エラーが表示されることを確認
```

---

## 7. チェックリスト

- [ ] APIプロキシ実装（4エンドポイント）
- [ ] デバイス一覧にリセットボタン追加
- [ ] リセット確認モーダル実装
- [ ] QRコードリセットページ実装
- [ ] useDeviceReset WebSocket拡張
- [ ] 認証設定（device-resetは公開）
- [ ] E2Eテスト作成
- [ ] 手動テスト完了

---

**参照SSOT**: `docs/03_ssot/01_admin_features/SSOT_DEV-0181_DEVICE_SESSION_RESET.md`
