# Phase 2: hotel-saas-rebuild 連続実行指示

**生成日**: 2026-02-05
**対象ブランチ**: 新規ブランチを作成して実装
**実行モード**: 連続実行（1タスク完了 → 次タスクへ自動進行）
**前提条件**: hotel-common-rebuild の Phase 1 実装が完了していること

---

## 実行ルール

### テスト方針
- **実APIテスト**: モック禁止、hotel-common の実APIに対してテスト
- テストファイル: `tests/` ディレクトリに配置
- テスト実行: `npm test`

### 停止条件（以下のいずれかに該当したら即座に停止して報告）
1. **CORE/CONTRACT層の不明点**: 仕様が曖昧で判断できない
2. **矛盾の検出**: SSOT内または既存コードとの矛盾
3. **破壊的変更**: 既存UIの互換性を壊す変更が必要
4. **セキュリティ懸念**: 認証・認可・データ漏洩リスク
5. **hotel-common APIエラー**: 期待するAPIが動作しない

### 進行ルール
- DETAIL層の判断は自律的に進む（相談不要）
- 各タスク完了時にコミット
- 全タスク完了後にプッシュ

### API呼び出しルール
```typescript
// hotel-common への呼び出しは必ず callHotelCommonAPI を使用
import { callHotelCommonAPI } from '~/server/utils/api-proxy'

// ❌ 禁止
const data = await $fetch('http://localhost:3401/...')

// ✅ 正しい
const data = await callHotelCommonAPI(event, '/api/v1/...', { method: 'GET' })
```

---

## タスク1: DEV-0181 - 客室端末セッションリセット（UI側）

### 1.1 概要
管理画面からのリモートリセットUIとQRコードリセットページの実装。

### 1.2 APIプロキシ実装

#### プロキシ 1-1: デバイスリセット
```typescript
// server/api/v1/admin/devices/[deviceId]/reset.post.ts
import { callHotelCommonAPI } from '~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const deviceId = getRouterParam(event, 'deviceId')
  const body = await readBody(event)

  return await callHotelCommonAPI(event, `/api/v1/admin/devices/${deviceId}/reset`, {
    method: 'POST',
    body
  })
})
```

#### プロキシ 1-2: トークン生成
```typescript
// server/api/v1/admin/devices/[deviceId]/reset-token.post.ts
```

#### プロキシ 1-3: トークンリセット
```typescript
// server/api/v1/devices/reset-by-token.post.ts
```

#### プロキシ 1-4: ログ一覧
```typescript
// server/api/v1/admin/devices/reset-logs.get.ts
```

### 1.3 管理画面UI実装

#### 1.3.1 デバイス一覧にリセットボタン追加
```vue
<!-- pages/admin/devices/index.vue に追加 -->
<template>
  <div>
    <!-- 既存のデバイス一覧テーブル -->
    <table>
      <tr v-for="device in devices" :key="device.id">
        <!-- 既存カラム -->
        <td>
          <button @click="confirmReset(device)" class="btn-danger">
            リセット
          </button>
        </td>
      </tr>
    </table>

    <!-- リセット確認モーダル -->
    <Modal v-model="showResetModal">
      <template #header>端末リセット確認</template>
      <template #body>
        <p>客室 {{ selectedDevice?.roomId }} の端末をリセットしますか？</p>
        <p class="text-sm text-gray-500">
          以下のデータが削除されます：
          <ul>
            <li>localStorage</li>
            <li>sessionStorage</li>
            <li>IndexedDB</li>
          </ul>
        </p>
      </template>
      <template #footer>
        <button @click="showResetModal = false">キャンセル</button>
        <button @click="executeReset" :disabled="isResetting" class="btn-danger">
          {{ isResetting ? 'リセット中...' : 'リセット実行' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
const showResetModal = ref(false)
const selectedDevice = ref<Device | null>(null)
const isResetting = ref(false)

function confirmReset(device: Device) {
  selectedDevice.value = device
  showResetModal.value = true
}

async function executeReset() {
  if (!selectedDevice.value) return
  isResetting.value = true

  try {
    await $fetch(`/api/v1/admin/devices/${selectedDevice.value.id}/reset`, {
      method: 'POST'
    })
    showToast('リセット完了', 'success')
  } catch (error) {
    if (error.statusCode === 403) {
      showToast('この操作を実行する権限がありません', 'error')
    } else if (error.statusCode === 404) {
      showToast('デバイスが見つかりません', 'error')
    } else {
      showToast('リセットに失敗しました', 'error')
    }
  } finally {
    isResetting.value = false
    showResetModal.value = false
  }
}
</script>
```

#### 1.3.2 QRコードリセットページ
```vue
<!-- pages/device-reset.vue（新規作成） -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <!-- ローディング中 -->
    <div v-if="isLoading" class="text-center">
      <Spinner />
      <p>トークンを検証中...</p>
    </div>

    <!-- エラー表示 -->
    <div v-else-if="error" class="bg-red-50 p-6 rounded-lg max-w-md">
      <h2 class="text-red-600 font-bold">エラー</h2>
      <p>{{ error }}</p>
    </div>

    <!-- リセット確認画面 -->
    <div v-else-if="tokenInfo" class="bg-white p-6 rounded-lg shadow-lg max-w-md">
      <h1 class="text-xl font-bold mb-4">端末リセット</h1>
      <div class="mb-4">
        <p><strong>客室番号:</strong> {{ tokenInfo.roomId }}</p>
        <p><strong>デバイスID:</strong> {{ tokenInfo.deviceId }}</p>
      </div>
      <button
        @click="executeReset"
        :disabled="isResetting || isCompleted"
        class="w-full bg-blue-600 text-white py-3 rounded-lg"
      >
        {{ isResetting ? 'リセット中...' : '端末をリセットする' }}
      </button>
    </div>

    <!-- 完了画面 -->
    <div v-else-if="isCompleted" class="bg-green-50 p-6 rounded-lg max-w-md text-center">
      <CheckCircleIcon class="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 class="text-green-600 font-bold text-xl">リセット完了</h2>
      <p class="mt-2">客室端末のリセットが完了しました</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isLoading = ref(true)
const isResetting = ref(false)
const isCompleted = ref(false)
const error = ref<string | null>(null)
const tokenInfo = ref<{ roomId: string; deviceId: string } | null>(null)

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    error.value = '無効なURLです'
    isLoading.value = false
    return
  }

  try {
    // JWTペイロードをデコード（検証はサーバーで行う）
    const payload = JSON.parse(atob(token.split('.')[1]))
    tokenInfo.value = {
      roomId: payload.roomId,
      deviceId: payload.deviceId
    }
  } catch {
    error.value = '無効なQRコードです'
  } finally {
    isLoading.value = false
  }
})

async function executeReset() {
  const token = route.query.token as string
  isResetting.value = true

  try {
    await $fetch('/api/v1/devices/reset-by-token', {
      method: 'POST',
      body: { token }
    })
    isCompleted.value = true
  } catch (err: any) {
    const code = err.data?.error?.code
    if (code === 'TOKEN_EXPIRED') {
      error.value = 'QRコードの有効期限が切れています。フロントにお問い合わせください。'
    } else if (code === 'TOKEN_ALREADY_USED') {
      error.value = 'このQRコードは既に使用されています'
    } else {
      error.value = 'リセットに失敗しました'
    }
  } finally {
    isResetting.value = false
  }
}
</script>
```

### 1.4 useDeviceReset composable 拡張

```typescript
// composables/useDeviceReset.ts
export function useDeviceReset() {
  const wsConnection = ref<WebSocket | null>(null)

  function connectWebSocket(deviceId: string) {
    const ws = new WebSocket(`${getWsUrl()}/devices/${deviceId}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === 'DEVICE_RESET') {
        resetDevice()
      }
    }

    ws.onerror = (error) => {
      console.error('[DeviceReset] WebSocket error:', error)
      // 再接続ロジック
      setTimeout(() => connectWebSocket(deviceId), 5000)
    }

    wsConnection.value = ws
  }

  function resetDevice() {
    // 1. localStorage削除
    localStorage.clear()

    // 2. sessionStorage削除
    sessionStorage.clear()

    // 3. IndexedDB削除
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => {
        if (db.name) indexedDB.deleteDatabase(db.name)
      })
    })

    // 4. キャッシュ削除
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }

    // 5. リロード
    window.location.reload()
  }

  function disconnect() {
    wsConnection.value?.close()
    wsConnection.value = null
  }

  return {
    connectWebSocket,
    resetDevice,
    disconnect
  }
}
```

### 1.5 実装ファイル一覧

```
server/api/v1/
├── admin/devices/
│   ├── [deviceId]/
│   │   ├── reset.post.ts           # プロキシ
│   │   └── reset-token.post.ts     # プロキシ
│   └── reset-logs.get.ts           # プロキシ
└── devices/
    └── reset-by-token.post.ts      # プロキシ

pages/
├── admin/devices/index.vue         # 修正（リセットボタン追加）
└── device-reset.vue                # 新規

composables/
└── useDeviceReset.ts               # 修正（WebSocket処理追加）
```

### 1.6 テスト要件

```typescript
// tests/device-reset.test.ts
describe('Device Reset UI', () => {
  it('should show reset button in device list')
  it('should open confirmation modal on click')
  it('should call API and show success message')
  it('should handle permission error')

  describe('QR Code Reset Page', () => {
    it('should decode token and show device info')
    it('should execute reset on button click')
    it('should show error for expired token')
    it('should show completion screen on success')
  })
})
```

---

## タスク2: DEV-0210 - 必須ログ3イベント（UI側）

### 2.1 概要
ANSWER_SHOWN, LINK_CLICK イベントをフロントエンドから発火。

### 2.2 APIプロキシ実装

```typescript
// server/api/v1/internal/logs/events.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return await callHotelCommonAPI(event, '/api/v1/internal/logs/events', {
    method: 'POST',
    body
  })
})
```

### 2.3 useEventLog composable

```typescript
// composables/useEventLog.ts
type EventType = 'ANSWER_SHOWN' | 'LINK_CLICK' | 'HANDOFF_TRIGGERED'

export function useEventLog() {
  const deviceStore = useDeviceStore()

  const logEvent = async (
    eventType: EventType,
    metadata: Record<string, unknown>
  ) => {
    try {
      await $fetch('/api/v1/internal/logs/events', {
        method: 'POST',
        body: {
          eventType,
          sessionId: deviceStore.sessionId,
          roomId: deviceStore.roomId,
          metadata
        }
      })
    } catch (error) {
      // ログ失敗はサイレントに処理（UXを阻害しない）
      console.warn('[EventLog] Failed to log event:', error)
    }
  }

  return { logEvent }
}
```

### 2.4 AIChatWidget.vue へのイベント発火追加

```vue
<!-- components/ai/AIChatWidget.vue -->
<script setup lang="ts">
const { logEvent } = useEventLog()

// FAQ回答表示時
async function onAnswerDisplayed(answer: FaqAnswer) {
  await logEvent('ANSWER_SHOWN', {
    questionText: currentQuestion.value,
    answerId: answer.id,
    answerCategory: answer.category
  })
}

// ディープリンククリック時
async function onLinkClick(url: string, linkIndex: number, answerId: string) {
  await logEvent('LINK_CLICK', {
    linkUrl: url,
    linkIndex,
    answerId
  })

  // 元の遷移処理
  window.open(url, '_blank')
}
</script>

<template>
  <div class="ai-chat-widget">
    <!-- 回答表示部分 -->
    <div
      v-for="(message, idx) in messages"
      :key="idx"
      @vue:mounted="message.type === 'answer' && onAnswerDisplayed(message)"
    >
      <div v-if="message.type === 'answer'" class="answer">
        <p>{{ message.text }}</p>
        <!-- ディープリンク -->
        <a
          v-for="(link, linkIdx) in message.links"
          :key="linkIdx"
          @click.prevent="onLinkClick(link.url, linkIdx, message.id)"
          :href="link.url"
        >
          {{ link.label }}
        </a>
      </div>
    </div>
  </div>
</template>
```

### 2.5 管理画面ログビューア（オプション）

```vue
<!-- pages/admin/logs/events.vue -->
<template>
  <div>
    <h1>イベントログ</h1>

    <!-- フィルター -->
    <div class="filters">
      <select v-model="filters.eventType">
        <option value="">全て</option>
        <option value="ANSWER_SHOWN">ANSWER_SHOWN</option>
        <option value="LINK_CLICK">LINK_CLICK</option>
        <option value="HANDOFF_TRIGGERED">HANDOFF_TRIGGERED</option>
      </select>
      <input type="date" v-model="filters.from" />
      <input type="date" v-model="filters.to" />
      <button @click="fetchLogs">検索</button>
    </div>

    <!-- サマリー -->
    <div class="summary">
      <div>ANSWER_SHOWN: {{ summary.ANSWER_SHOWN }}</div>
      <div>LINK_CLICK: {{ summary.LINK_CLICK }}</div>
      <div>HANDOFF_TRIGGERED: {{ summary.HANDOFF_TRIGGERED }}</div>
      <div>クリック率: {{ (summary.conversionRate?.answerToClick * 100).toFixed(1) }}%</div>
    </div>

    <!-- ログ一覧 -->
    <table>
      <thead>
        <tr>
          <th>日時</th>
          <th>イベント</th>
          <th>セッションID</th>
          <th>メタデータ</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ formatDate(log.createdAt) }}</td>
          <td>{{ log.eventType }}</td>
          <td>{{ log.sessionId }}</td>
          <td>{{ JSON.stringify(log.metadata) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- ページネーション -->
    <Pagination v-model="page" :total="total" :limit="limit" />
  </div>
</template>
```

### 2.6 実装ファイル一覧

```
server/api/v1/
├── internal/logs/
│   └── events.post.ts              # プロキシ
└── admin/logs/
    ├── events.get.ts               # プロキシ
    └── summary.get.ts              # プロキシ

composables/
└── useEventLog.ts                  # 新規

components/ai/
└── AIChatWidget.vue                # 修正

pages/admin/logs/
└── events.vue                      # 新規（オプション）
```

### 2.7 テスト要件

```typescript
// tests/event-log.test.ts
describe('Event Logging', () => {
  it('should log ANSWER_SHOWN when FAQ answer is displayed')
  it('should log LINK_CLICK when deep link is clicked')
  it('should not block UI on log failure')
  it('should include correct metadata')
})
```

---

## タスク3: DEV-0190 - DND/頻度制御（UI側）

### 3.1 概要
DNDアイコン表示、設定トグル、Quietモード対応。

### 3.2 APIプロキシ実装

```typescript
// server/api/v1/guest/dnd/status.get.ts
export default defineEventHandler(async (event) => {
  return await callHotelCommonAPI(event, '/api/v1/guest/dnd/status', {
    method: 'GET'
  })
})

// server/api/v1/guest/dnd/status.put.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await callHotelCommonAPI(event, '/api/v1/guest/dnd/status', {
    method: 'PUT',
    body
  })
})

// server/api/v1/guest/notifications/limit.get.ts
export default defineEventHandler(async (event) => {
  return await callHotelCommonAPI(event, '/api/v1/guest/notifications/limit', {
    method: 'GET'
  })
})
```

### 3.3 useDnd composable

```typescript
// composables/useDnd.ts
export function useDnd() {
  const dndStatus = ref<DndStatus | null>(null)
  const notificationLimit = ref<NotificationLimit | null>(null)
  const isLoading = ref(false)

  async function fetchDndStatus() {
    isLoading.value = true
    try {
      const { data } = await $fetch('/api/v1/guest/dnd/status')
      dndStatus.value = data
    } finally {
      isLoading.value = false
    }
  }

  async function toggleDnd(enabled: boolean) {
    await $fetch('/api/v1/guest/dnd/status', {
      method: 'PUT',
      body: { isDndEnabled: enabled }
    })
    await fetchDndStatus()
  }

  async function fetchNotificationLimit() {
    const { data } = await $fetch('/api/v1/guest/notifications/limit')
    notificationLimit.value = data
  }

  // 通知を表示してよいか判定
  function canShowNotification(): boolean {
    // Quietモード中は表示しない
    if (dndStatus.value?.isQuietMode) return false

    // 手動DND中は表示しない
    if (dndStatus.value?.isDndEnabled) return false

    // 制限到達済みは表示しない
    if (notificationLimit.value?.isLimitReached) return false

    return true
  }

  return {
    dndStatus,
    notificationLimit,
    isLoading,
    fetchDndStatus,
    toggleDnd,
    fetchNotificationLimit,
    canShowNotification
  }
}
```

### 3.4 DNDアイコンコンポーネント

```vue
<!-- components/guest/DndIcon.vue -->
<template>
  <div class="dnd-icon" @click="showSettings = true">
    <MoonIcon
      v-if="dndStatus?.isQuietMode || dndStatus?.isDndEnabled"
      class="w-6 h-6 text-indigo-500"
    />
    <BellIcon v-else class="w-6 h-6 text-gray-400" />

    <!-- ツールチップ -->
    <div v-if="dndStatus?.isQuietMode" class="tooltip">
      おやすみモード ({{ dndStatus.quietModeStart }} - {{ dndStatus.quietModeEnd }})
    </div>
  </div>

  <!-- 設定モーダル -->
  <Modal v-model="showSettings">
    <template #header>通知設定</template>
    <template #body>
      <div class="space-y-4">
        <!-- Quietモード表示 -->
        <div v-if="dndStatus?.isQuietMode" class="bg-indigo-50 p-4 rounded-lg">
          <p class="text-indigo-700">
            おやすみモード中 ({{ dndStatus.quietModeStart }} - {{ dndStatus.quietModeEnd }})
          </p>
          <p class="text-sm text-indigo-500">この時間帯は通知されません</p>
        </div>

        <!-- DND手動切り替え -->
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">おやすみモード</p>
            <p class="text-sm text-gray-500">通知をすべて停止します</p>
          </div>
          <Toggle
            :model-value="dndStatus?.isDndEnabled"
            @update:model-value="toggleDnd"
          />
        </div>

        <!-- 残り通知回数 -->
        <div v-if="notificationLimit" class="text-sm text-gray-500">
          残り通知回数: {{ notificationLimit.remainingNotifications }} / {{ notificationLimit.maxNotifications }}
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
const { dndStatus, notificationLimit, fetchDndStatus, toggleDnd, fetchNotificationLimit } = useDnd()
const showSettings = ref(false)

onMounted(async () => {
  await Promise.all([
    fetchDndStatus(),
    fetchNotificationLimit()
  ])
})
</script>
```

### 3.5 ヘッダーへの統合

```vue
<!-- layouts/guest.vue または components/GuestHeader.vue -->
<template>
  <header class="flex items-center justify-between p-4">
    <Logo />
    <div class="flex items-center space-x-4">
      <DndIcon />
      <!-- 他のアイコン -->
    </div>
  </header>
</template>
```

### 3.6 通知表示の制御

```typescript
// 通知を表示する前にDND状態をチェック
const { canShowNotification, fetchNotificationLimit } = useDnd()

async function showRecommendation(recommendation: Recommendation) {
  // DND/頻度チェック
  if (!canShowNotification()) {
    console.log('[Notification] Blocked by DND/frequency limit')
    return
  }

  // 通知を表示
  showNotificationUI(recommendation)

  // カウントを更新（サーバー側で処理）
  await fetchNotificationLimit()
}
```

### 3.7 実装ファイル一覧

```
server/api/v1/guest/
├── dnd/
│   ├── status.get.ts               # プロキシ
│   └── status.put.ts               # プロキシ
└── notifications/
    └── limit.get.ts                # プロキシ

composables/
└── useDnd.ts                       # 新規

components/guest/
└── DndIcon.vue                     # 新規

layouts/
└── guest.vue                       # 修正（DndIcon追加）
```

### 3.8 テスト要件

```typescript
// tests/dnd.test.ts
describe('DND UI', () => {
  it('should show moon icon during quiet mode')
  it('should show bell icon during normal hours')
  it('should toggle DND on button click')
  it('should block notifications when DND enabled')
  it('should block notifications when limit reached')
})
```

---

## 実行チェックリスト

### タスク1: DEV-0181
- [ ] APIプロキシ 4ファイル作成
- [ ] デバイス一覧にリセットボタン追加
- [ ] 確認モーダル実装
- [ ] device-reset.vue ページ作成
- [ ] useDeviceReset.ts WebSocket処理追加
- [ ] テスト作成・実行
- [ ] コミット

### タスク2: DEV-0210
- [ ] APIプロキシ 3ファイル作成
- [ ] useEventLog.ts composable作成
- [ ] AIChatWidget.vue にログ発火追加
- [ ] 管理画面ログビューア作成（オプション）
- [ ] テスト作成・実行
- [ ] コミット

### タスク3: DEV-0190
- [ ] APIプロキシ 3ファイル作成
- [ ] useDnd.ts composable作成
- [ ] DndIcon.vue コンポーネント作成
- [ ] ゲストレイアウトにDndIcon追加
- [ ] 通知表示制御ロジック追加
- [ ] テスト作成・実行
- [ ] コミット

### 完了後
- [ ] 全テスト通過確認
- [ ] プッシュ

---

## 注意事項

1. **$fetch直接使用禁止**: hotel-common へは必ず `callHotelCommonAPI` 経由
2. **モック禁止**: テストは実APIに対して実行
3. **エラーハンドリング**: ユーザーフレンドリーなメッセージを表示
4. **ログ失敗はサイレント**: UXを阻害しない
5. **DND状態は毎回チェック**: 通知表示前に必ず `canShowNotification()` を呼ぶ
