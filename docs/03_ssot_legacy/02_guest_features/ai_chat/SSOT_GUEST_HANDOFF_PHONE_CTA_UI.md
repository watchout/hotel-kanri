# SSOT_GUEST_HANDOFF_PHONE_CTA_UI.md

**バージョン**: 1.0.0
**最終更新**: 2026-01-24
**ドキュメントID**: SSOT-GUEST-HANDOFF-UI-001
**ステータス**: ✅ 確定

---

## 📋 概要

### 目的

ゲストがAIチャットで「handoff」アクション（スタッフ対応要求）をクリックした際に、60秒の待機状態を表示し、タイムアウト時には電話CTAを提示することで、確実なサポート導線を確保する。

### スコープ

- **対象システム**: hotel-saas（ゲストUI）
- **対象ユーザー**: 客室端末からアクセスするゲスト（デバイス認証）
- **関連タスク**: [DEV-0173] [COM-246] UI実装（通知→電話CTA導線）

### 関連SSOT

- `SSOT_GUEST_AI_HANDOFF.md`（ゲスト側ハンドオフAPI・データベース設計）
- `SSOT_ADMIN_HANDOFF_NOTIFICATION.md`（Admin側通知機能）
- `SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md`（AIチャットWidget）
- `SSOT_SAAS_DEVICE_AUTHENTICATION.md`（デバイス認証）

---

## 🎯 要件ID一覧

### 機能要件（HDF-UI）

| ID | 説明 | 優先度 |
|:---|:-----|:-------|
| HDF-UI-001 | ハンドオフボタンクリックで待機画面表示 | 🔴 必須 |
| HDF-UI-002 | 60秒カウントダウンタイマー表示 | 🔴 必須 |
| HDF-UI-003 | タイムアウト時に電話CTA表示 | 🔴 必須 |
| HDF-UI-004 | スタッフ応答時にチャット画面へ遷移 | 🟡 Phase 2 |
| HDF-UI-005 | キャンセルボタン（待機中止） | 🔴 必須 |

### 非機能要件（HDF-UI-NFR）

| ID | 説明 | 優先度 |
|:---|:-----|:-------|
| HDF-UI-NFR-001 | カウントダウンは1秒ごとに更新 | 🔴 必須 |
| HDF-UI-NFR-002 | 電話番号は24px以上で強調表示 | 🔴 必須 |
| HDF-UI-NFR-003 | エラー時は電話CTAを即座に表示 | 🔴 必須 |
| HDF-UI-NFR-004 | アクセシビリティ対応（WCAG AA準拠） | 🟡 Phase 2 |

---

## 🗄️ データベース設計

**注**: データベーステーブルは`SSOT_GUEST_AI_HANDOFF.md`で定義済み。
このSSOTではUI実装のみを扱う。

参照テーブル:
- `handoff_requests` (ハンドオフリクエスト)

---

## 🔌 API設計

### 使用するAPI

このUI実装では以下の既存APIを使用する（新規APIは不要）：

| Method | Path | 説明 | 定義SSOT |
|:-------|:-----|:-----|:---------|
| POST | `/api/v1/guest/handoff/requests` | ハンドオフリクエスト作成 | SSOT_GUEST_AI_HANDOFF.md |
| GET | `/api/v1/guest/handoff/requests/:id` | リクエスト状態取得 | SSOT_GUEST_AI_HANDOFF.md |

### ポーリング仕様

**Phase 1（MVP）**: クライアント側でステータスポーリング

```typescript
// 2秒間隔でステータスをポーリング
const checkInterval = 2000 // ms
const maxWaitTime = 60000  // 60秒

// GET /api/v1/guest/handoff/requests/:id
// レスポンス: { status: 'PENDING' | 'ACCEPTED' | 'TIMEOUT' | ... }
```

**Phase 2**: WebSocket接続でリアルタイム通知

---

## 🎨 UI設計

### 画面一覧

| 画面名 | 表示条件 | 説明 |
|:-------|:---------|:-----|
| 待機状態画面 | handoffアクションクリック時 | 60秒カウントダウン表示 |
| 電話CTA画面 | タイムアウト or エラー時 | 内線番号を強調表示 |
| 対応開始画面（Phase 2） | スタッフACCEPTED時 | チャット画面へ遷移 |

---

### 画面仕様

#### 1. 待機状態画面

**表示条件**:
- ユーザーがAIChatWidget内で`handoff`アクションをクリック
- POST `/api/v1/guest/handoff/requests` が成功

**レイアウト**:
```
┌─────────────────────────────────────┐
│  AIチャット                   [×]  │
├─────────────────────────────────────┤
│                                     │
│  🕒 スタッフが対応準備中です         │
│                                     │
│     あと 45 秒お待ちください         │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  ███████████░░░░░░░░░░░░░░░░░░      │
│                                     │
│           [待機をキャンセル]          │
│                                     │
└─────────────────────────────────────┘
```

**コンポーネント構成**:
```
components/ai/AIChatWidget.vue
└── components/ai/HandoffWaitingDialog.vue  ← 新規作成
    ├── カウントダウンタイマー
    ├── プログレスバー
    └── キャンセルボタン
```

**機能要件**:
- [ ] カウントダウンは`60 → 59 → 58 → ... → 0`と1秒ごとに更新
- [ ] プログレスバーは残り時間に応じて左から減少
- [ ] 「待機をキャンセル」ボタンでポーリング停止＆元の画面に戻る
- [ ] 2秒間隔でステータスをポーリング（`GET /api/v1/guest/handoff/requests/:id`）
- [ ] ステータスが`ACCEPTED`になったら「スタッフが対応します」表示（Phase 2: チャット画面へ遷移）
- [ ] ステータスが`TIMEOUT`またはカウントダウンが0になったら電話CTA画面へ遷移

---

#### 2. 電話CTA画面

**表示条件**:
- タイムアウト（60秒経過、またはステータスが`TIMEOUT`）
- API呼び出しエラー時
- ユーザーが「待機をキャンセル」した場合（オプション）

**レイアウト**:
```
┌─────────────────────────────────────┐
│  AIチャット                   [×]  │
├─────────────────────────────────────┤
│                                     │
│  ⚠️ スタッフの対応が難しい状況です    │
│                                     │
│  お急ぎの場合はお電話でお問い合わせ   │
│  ください                           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  📞 内線 100                  │  │
│  │  (フロントデスク直通)          │  │
│  └───────────────────────────────┘  │
│                                     │
│              [閉じる]                │
│                                     │
└─────────────────────────────────────┘
```

**コンポーネント構成**:
```
components/ai/AIChatWidget.vue
└── components/ai/HandoffPhoneCTA.vue  ← 新規作成
    ├── アイコン（⚠️ または 📞）
    ├── メッセージ
    ├── 電話番号（強調表示）
    └── 閉じるボタン
```

**機能要件**:
- [ ] 電話番号は**24px以上**のフォントサイズで表示
- [ ] 電話番号は枠線で囲んで視覚的に強調
- [ ] 「閉じる」ボタンでダイアログを閉じる
- [ ] 電話番号はConfig設定から取得（`handoff.fallback_phone`、デフォルト: "内線100"）

**アクセシビリティ**:
- [ ] `aria-live="polite"` でスクリーンリーダー対応
- [ ] コントラスト比4.5:1以上
- [ ] 電話番号は `<a href="tel:100">` でタップ可能（Phase 2）

---

#### 3. 対応開始画面（Phase 2）

**表示条件**:
- ポーリング中にステータスが`ACCEPTED`に変化

**レイアウト**:
```
┌─────────────────────────────────────┐
│  AIチャット                   [×]  │
├─────────────────────────────────────┤
│                                     │
│  ✅ スタッフが対応します             │
│                                     │
│  まもなくチャット画面へ移動します    │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                     │
└─────────────────────────────────────┘
```

**機能要件**（Phase 2）:
- [ ] 2秒後にチャット画面（`/guest/chat`）へ自動遷移
- [ ] チャット画面でスタッフとリアルタイムメッセージング

---

## 📝 実装仕様

### 1. AIChatWidget.vueの修正

**ファイル**: `components/ai/AIChatWidget.vue`

**変更内容**:

```typescript
// 現在のhandleHandoff（ログ出力のみ）
const handleHandoff = (action: AiAction) => {
  console.log('[AIChatWidget] Handoff to:', action.channel)
  closeDialog()
  // TODO: Phase 4でhandoff処理を実装
}

// ↓ 修正後

const handoffDialogOpen = ref(false)
const handoffRequestId = ref<string | null>(null)
const handoffStatus = ref<'waiting' | 'timeout' | 'accepted' | null>(null)

const handleHandoff = async (action: AiAction) => {
  try {
    // 1. ハンドオフリクエストを作成
    const res = await call<{ id: string }>('/api/v1/guest/handoff/requests', {
      method: 'POST',
      body: {
        sessionId: 'chat_session_' + Date.now(), // TODO: 実際のsessionIdを使用
        channel: action.channel || 'front_desk',
        context: {
          lastMessages: [{ role: 'user', content: message.value, timestamp: new Date().toISOString() }],
          currentTopic: 'unknown'
        }
      }
    })

    if (!res.success || !res.data?.id) {
      throw new Error('ハンドオフリクエストの作成に失敗しました')
    }

    // 2. 待機ダイアログを開く
    handoffRequestId.value = res.data.id
    handoffStatus.value = 'waiting'
    handoffDialogOpen.value = true
    closeDialog() // AIChatWidgetは閉じる

  } catch (err: any) {
    console.error('[AIChatWidget] Handoff error:', err)
    // エラー時は即座に電話CTAを表示
    handoffStatus.value = 'timeout'
    handoffDialogOpen.value = true
    closeDialog()
  }
}
```

---

### 2. HandoffWaitingDialog.vueの作成

**ファイル**: `components/ai/HandoffWaitingDialog.vue`

**Props**:
```typescript
interface Props {
  requestId: string
  maxWaitTime?: number  // デフォルト: 60000ms
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'timeout'): void       // タイムアウト時
  (e: 'accepted'): void      // スタッフ応答時
  (e: 'cancel'): void        // キャンセル時
}
```

**実装**:
```typescript
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useApi } from '~/composables/core/useApi'

const props = withDefaults(defineProps<{
  requestId: string
  maxWaitTime?: number
}>(), {
  maxWaitTime: 60000
})

const emit = defineEmits<{
  timeout: []
  accepted: []
  cancel: []
}>()

const { call } = useApi()

const remainingTime = ref(props.maxWaitTime / 1000) // 秒
const pollingInterval = ref<NodeJS.Timeout | null>(null)
const countdownInterval = ref<NodeJS.Timeout | null>(null)

const progress = computed(() => (remainingTime.value / (props.maxWaitTime / 1000)) * 100)

const startPolling = () => {
  // カウントダウン
  countdownInterval.value = setInterval(() => {
    remainingTime.value -= 1
    if (remainingTime.value <= 0) {
      stopPolling()
      emit('timeout')
    }
  }, 1000)

  // ステータスポーリング
  pollingInterval.value = setInterval(async () => {
    try {
      const res = await call(`/api/v1/guest/handoff/requests/${props.requestId}`, {
        method: 'GET'
      })

      if (res.success && res.data?.status === 'ACCEPTED') {
        stopPolling()
        emit('accepted')
      } else if (res.success && res.data?.status === 'TIMEOUT') {
        stopPolling()
        emit('timeout')
      }
    } catch (err) {
      console.error('[HandoffWaitingDialog] Polling error:', err)
    }
  }, 2000) // 2秒間隔
}

const stopPolling = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
}

const handleCancel = () => {
  stopPolling()
  emit('cancel')
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <v-dialog :model-value="true" max-width="420" persistent>
    <v-card>
      <v-card-title class="text-center">
        AIチャット
      </v-card-title>

      <v-card-text class="text-center py-8">
        <v-icon size="48" color="primary" class="mb-4">
          mdi-clock-outline
        </v-icon>

        <div class="text-h6 mb-2">
          スタッフが対応準備中です
        </div>

        <div class="text-h4 font-weight-bold my-4">
          あと {{ remainingTime }} 秒お待ちください
        </div>

        <v-progress-linear
          :model-value="progress"
          color="primary"
          height="8"
          rounded
          class="mb-4"
        />

        <v-btn
          variant="outlined"
          @click="handleCancel"
        >
          待機をキャンセル
        </v-btn>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
```

---

### 3. HandoffPhoneCTA.vueの作成

**ファイル**: `components/ai/HandoffPhoneCTA.vue`

**Props**:
```typescript
interface Props {
  phoneNumber?: string  // デフォルト: "内線100"
}
```

**Emits**:
```typescript
interface Emits {
  (e: 'close'): void
}
```

**実装**:
```typescript
<script setup lang="ts">
const props = withDefaults(defineProps<{
  phoneNumber?: string
}>(), {
  phoneNumber: '内線100'
})

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <v-dialog :model-value="true" max-width="420" persistent>
    <v-card>
      <v-card-title class="text-center">
        AIチャット
      </v-card-title>

      <v-card-text class="text-center py-8">
        <v-icon size="48" color="warning" class="mb-4">
          mdi-alert-circle-outline
        </v-icon>

        <div class="text-h6 mb-2">
          スタッフの対応が難しい状況です
        </div>

        <p class="text-body-1 mb-6">
          お急ぎの場合はお電話でお問い合わせください
        </p>

        <v-card
          variant="outlined"
          class="phone-cta-card mx-auto"
          max-width="300"
        >
          <v-card-text class="text-center py-4">
            <v-icon size="32" color="primary" class="mb-2">
              mdi-phone
            </v-icon>
            <div class="text-h4 font-weight-bold mb-1">
              {{ phoneNumber }}
            </div>
            <div class="text-caption text-grey">
              フロントデスク直通
            </div>
          </v-card-text>
        </v-card>

        <v-btn
          color="primary"
          variant="outlined"
          class="mt-6"
          @click="emit('close')"
        >
          閉じる
        </v-btn>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.phone-cta-card {
  border: 2px solid #1976d2;
}

/* 電話番号は24px以上 */
.text-h4 {
  font-size: 28px !important;
}
</style>
```

---

### 4. AIChatWidget.vueへの統合

**修正内容**:

```vue
<template>
  <div class="ai-chat-widget" :style="widgetStyle">
    <!-- 既存のFABボタンとダイアログ -->
    <!-- ... -->

    <!-- 待機ダイアログ -->
    <HandoffWaitingDialog
      v-if="handoffDialogOpen && handoffStatus === 'waiting' && handoffRequestId"
      :request-id="handoffRequestId"
      @timeout="handoffStatus = 'timeout'"
      @accepted="handoffStatus = 'accepted'"
      @cancel="handoffDialogOpen = false"
    />

    <!-- 電話CTAダイアログ -->
    <HandoffPhoneCTA
      v-if="handoffDialogOpen && handoffStatus === 'timeout'"
      phone-number="内線100"
      @close="handoffDialogOpen = false"
    />

    <!-- Phase 2: 対応開始ダイアログ -->
    <HandoffAcceptedDialog
      v-if="handoffDialogOpen && handoffStatus === 'accepted'"
      @navigate="navigateToChat"
    />
  </div>
</template>

<script setup lang="ts">
// 既存のimport
import HandoffWaitingDialog from '~/components/ai/HandoffWaitingDialog.vue'
import HandoffPhoneCTA from '~/components/ai/HandoffPhoneCTA.vue'

// 状態追加
const handoffDialogOpen = ref(false)
const handoffRequestId = ref<string | null>(null)
const handoffStatus = ref<'waiting' | 'timeout' | 'accepted' | null>(null)

// handleHandoffの実装（上記参照）
const handleHandoff = async (action: AiAction) => { /* 上記の実装 */ }
</script>
```

---

## ✅ Accept（合格条件）

### Phase 1（MVP）

#### HDF-UI-001: ハンドオフボタンクリックで待機画面表示

- [ ] `handoff`アクションボタンをクリックすると`POST /api/v1/guest/handoff/requests`が呼ばれる
- [ ] API成功後、`HandoffWaitingDialog`が表示される
- [ ] AIチャットダイアログは自動的に閉じる

#### HDF-UI-002: 60秒カウントダウンタイマー表示

- [ ] 「あと XX 秒お待ちください」が1秒ごとに更新される
- [ ] プログレスバーが残り時間に応じて減少する
- [ ] カウントダウンが0になったら電話CTA画面へ遷移

#### HDF-UI-003: タイムアウト時に電話CTA表示

- [ ] タイムアウト時に`HandoffPhoneCTA`が表示される
- [ ] 電話番号が24px以上のフォントサイズで表示される
- [ ] 電話番号が枠線で囲まれて強調表示される
- [ ] 「閉じる」ボタンでダイアログが閉じる

#### HDF-UI-005: キャンセルボタン（待機中止）

- [ ] 「待機をキャンセル」ボタンでポーリングが停止する
- [ ] ダイアログが閉じて元の画面に戻る

#### エラーハンドリング

- [ ] API呼び出しエラー時に電話CTAが即座に表示される
- [ ] ネットワークエラー時にもフォールバック表示される

#### セキュリティ

- [ ] デバイス認証が必須（既存の`useApi()`で自動対応）
- [ ] テナント分離が完全（API側で保証）

#### パフォーマンス

- [ ] カウントダウンが1秒ごとに正確に更新される
- [ ] ポーリング間隔が2秒で安定している
- [ ] メモリリークがない（onUnmountedでクリーンアップ）

### Phase 2（WebSocket）

- [ ] ステータスがACCEPTEDになったら対応開始画面を表示
- [ ] 2秒後にチャット画面へ自動遷移
- [ ] WebSocketでリアルタイム通知受信

---

## 🛠️ 実装チェックリスト

### Phase 1（MVP）

#### hotel-saas（ゲストUI）

- [ ] `components/ai/HandoffWaitingDialog.vue`作成
- [ ] `components/ai/HandoffPhoneCTA.vue`作成
- [ ] `components/ai/AIChatWidget.vue`修正（handleHandoff実装）
- [ ] カウントダウンタイマー実装
- [ ] ステータスポーリング実装
- [ ] エラーハンドリング実装
- [ ] UI統合テスト（手動）

#### 既存APIの活用

- [ ] `POST /api/v1/guest/handoff/requests`（既存）
- [ ] `GET /api/v1/guest/handoff/requests/:id`（既存）

### Phase 2（WebSocket）

- [ ] `components/ai/HandoffAcceptedDialog.vue`作成
- [ ] WebSocket接続実装
- [ ] チャット画面遷移実装
- [ ] `/guest/chat`ページ作成（別タスク）

---

## 📊 Config設定（Marketing Injection対応）

| 設定項目 | デフォルト値 | 説明 |
|:---------|:------------|:-----|
| `handoff.timeout_seconds` | 60 | タイムアウト秒数 |
| `handoff.fallback_phone` | "内線100" | フォールバック電話番号 |
| `handoff.polling_interval` | 2000 | ポーリング間隔（ミリ秒） |

---

## 📈 Analytics追跡（Tracking by Default）

| イベント | analytics-id | 記録先 |
|:---------|:-------------|:-------|
| ハンドオフボタンクリック | `handoff-guest-click` | DB必須 |
| 待機画面表示 | `handoff-guest-waiting-view` | DB必須 |
| タイムアウト発生 | `handoff-guest-timeout` | DB必須 |
| 電話CTA表示 | `handoff-guest-phone-cta-view` | DB必須 |
| キャンセルボタンクリック | `handoff-guest-cancel` | DB必須 |
| スタッフ応答通知受信（Phase 2） | `handoff-guest-accepted` | DB必須 |

---

## 🔗 関連ドキュメント

- `SSOT_GUEST_AI_HANDOFF.md`（ゲスト側ハンドオフAPI・データベース設計）
- `SSOT_ADMIN_HANDOFF_NOTIFICATION.md`（Admin側通知機能）
- `SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md`（AIチャットWidget）
- `SSOT_SAAS_DEVICE_AUTHENTICATION.md`（デバイス認証）

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2026-01-24 | 1.0.0 | 初版作成（DEV-0173: UI実装（通知→電話CTA導線）） |

---

**作成者**: Claude Sonnet 4.5
**レビュー**: -
**承認**: -
