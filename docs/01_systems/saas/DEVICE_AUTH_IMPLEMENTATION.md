# デバイス認証実装ガイド
*Status: draft — 2025-05-12*

---

## 目次
1. [概要](#1-概要)
2. [技術的アプローチ](#2-技術的アプローチ)
3. [認証フローの実装](#3-認証フローの実装)
4. [管理画面の実装](#4-管理画面の実装)
5. [テスト戦略](#5-テスト戦略)
6. [デプロイ計画](#6-デプロイ計画)

---

## 1. 概要

このドキュメントは、ホテル客室のSTB/タブレットからのアクセスを簡素化するためのデバイス認証機能の実装ガイドです。本機能により、宿泊客はログイン操作なしでルームサービスオーダーシステムを利用できるようになります。

### 主な目標
- ユーザー体験の向上（明示的なログイン操作の省略）
- セキュリティの確保（デバイスと部屋の紐づけによる認証）
- 運用負荷の軽減（チェックイン/アウト時の自動処理）

---

## 2. 技術的アプローチ

### 2.1 デバイス識別

クライアントデバイスを識別するために以下の方法を使用します：

```typescript
// 1. IPアドレスの取得
// サーバーサイド（Nuxt 3 API Route）
const getClientIP = (event: H3Event) => {
  return getRequestHeader(event, 'x-forwarded-for') || 
         getRequestHeader(event, 'x-real-ip') || 
         event.node.req.socket.remoteAddress
}

// 2. MACアドレスの取得（可能な場合）
// クライアントサイド（JavaScript）
const getMacAddress = async () => {
  try {
    // WebRTCを使用したネットワークインターフェース情報の取得
    const connections = await navigator.mediaDevices.enumerateDevices()
    // ローカルIPアドレスとMACアドレスを関連付ける実装
    // 注: ブラウザのセキュリティ制限により完全なMACアドレス取得は困難
    // 実際にはデバイス固有の識別子（fingerprint）の利用を検討
  } catch (error) {
    console.error('MAC address retrieval failed:', error)
    return null
  }
}
```

### 2.2 データモデル

`prisma/schema.prisma`にデバイス管理用のモデルを追加します：

```prisma
model DeviceRoom {
  id          Int      @id @default(autoincrement())
  macAddress  String?  @unique
  ipAddress   String?
  deviceName  String
  roomId      String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastUsedAt  DateTime?
  deviceType  String?

  room        Room     @relation(fields: [roomId], references: [id])
  accessLogs  DeviceAccessLog[]
}
```

---

## 3. 認証フローの実装

### 3.1 ミドルウェアの作成

`middleware/deviceAuth.ts`を作成して認証フローを実装します：

```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  // オーダー関連ページの場合のみ認証処理を行う
  if (!to.path.startsWith('/order')) {
    return
  }

  const { $auth } = useNuxtApp()
  
  // 既に認証済みの場合はスキップ
  if ($auth.loggedIn) {
    return
  }
  
  // デバイス識別情報を取得
  const deviceInfo = await useDeviceIdentifier()
  
  try {
    // デバイス認証APIを呼び出し
    const { authenticated, roomId, redirectUrl } = await $fetch('/api/v1/device/auth', {
      method: 'POST',
      body: deviceInfo
    })
    
    if (authenticated && roomId) {
      // 認証成功: 自動ログイン処理
      await $auth.loginWithDeviceAuth(roomId)
      return
    }
    
    // 認証失敗: リダイレクト
    if (redirectUrl) {
      return navigateTo(redirectUrl)
    }
    
    // フォールバック: 通常のログイン画面へ
    return navigateTo('/login')
  } catch (error) {
    console.error('Device authentication failed:', error)
    return navigateTo('/login')
  }
})
```

### 3.2 認証APIエンドポイント

`server/api/v1/device/auth.post.ts`を作成して認証APIを実装します：

```typescript
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// リクエストボディのバリデーション
const deviceInfoSchema = z.object({
  ipAddress: z.string(),
  macAddress: z.string().optional(),
  userAgent: z.string()
})

export default defineEventHandler(async (event) => {
  try {
    // リクエストボディの取得とバリデーション
    const body = await readBody(event)
    const deviceInfo = deviceInfoSchema.parse(body)
    
    // IPアドレスまたはMACアドレスでデバイスを検索
    const device = await prisma.deviceRoom.findFirst({
      where: {
        OR: [
          { ipAddress: deviceInfo.ipAddress },
          deviceInfo.macAddress ? { macAddress: deviceInfo.macAddress } : undefined
        ].filter(Boolean),
        isActive: true
      },
      include: {
        room: true
      }
    })
    
    // デバイスログの記録
    await prisma.deviceAccessLog.create({
      data: {
        deviceId: device?.id || 0,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        status: device ? 'success' : 'failed'
      }
    })
    
    if (device) {
      // デバイスの最終使用日時を更新
      await prisma.deviceRoom.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() }
      })
      
      // 認証成功
      return {
        authenticated: true,
        roomId: device.roomId,
        roomNumber: device.room.number
      }
    }
    
    // 認証失敗
    return {
      authenticated: false,
      redirectUrl: '/device-registration'
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Invalid device information'
      })
    }
    throw error
  }
})
```

---

## 4. 管理画面の実装

### 4.1 デバイス管理ページ

`pages/admin/devices/index.vue`でデバイス一覧画面を実装します：

```vue
<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">デバイス管理</h1>
        <p class="mt-2 text-sm text-gray-700">客室デバイスの一覧と管理</p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <NuxtLink
          to="/admin/devices/create"
          class="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          新規デバイス登録
        </NuxtLink>
      </div>
    </div>

    <!-- 検索とフィルター -->
    <div class="mt-6 flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <label for="search" class="sr-only">検索</label>
        <div class="relative rounded-md shadow-sm">
          <input
            type="text"
            id="search"
            v-model="searchQuery"
            class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="デバイス名または部屋番号を検索..."
            @input="debouncedSearch"
          />
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <div class="w-full sm:w-64">
        <select
          v-model="filterStatus"
          class="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          @change="fetchDevices"
        >
          <option value="">全ステータス</option>
          <option value="active">有効</option>
          <option value="inactive">無効</option>
        </select>
      </div>
    </div>

    <!-- デバイス一覧テーブル -->
    <div class="mt-6 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table v-if="devices.length > 0" class="min-w-full divide-y divide-gray-300">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">デバイス名</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">部屋番号</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">IPアドレス</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">MACアドレス</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">最終使用日時</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ステータス</th>
            <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span class="sr-only">アクション</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-for="device in devices" :key="device.id" class="hover:bg-gray-50">
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
              {{ device.deviceName }}
              <div class="text-xs text-gray-500">{{ device.deviceType || '-' }}</div>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{{ device.roomId }}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{{ device.ipAddress || '-' }}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{{ device.macAddress || '-' }}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
              {{ device.lastUsedAt ? formatDate(device.lastUsedAt) : '未使用' }}
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm">
              <span :class="device.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="inline-flex rounded-full px-2 text-xs font-semibold leading-5">
                {{ device.isActive ? '有効' : '無効' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm font-medium">
              <div class="flex space-x-3">
                <NuxtLink :to="`/admin/devices/${device.id}/edit`" class="text-indigo-600 hover:text-indigo-900">編集</NuxtLink>
                <button @click="confirmDelete(device)" class="text-red-600 hover:text-red-900">削除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="bg-white px-6 py-12 text-center text-gray-500">
        <p v-if="loading">読み込み中...</p>
        <p v-else>デバイスデータがありません</p>
      </div>
    </div>

    <!-- 削除確認モーダル -->
    <ConfirmModal
      v-if="showDeleteModal"
      :title="`デバイスの削除`"
      :message="`「${deviceToDelete?.deviceName}」を削除しますか？削除後は元に戻せません。`"
      @confirm="deleteDevice"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

// データと状態管理
const devices = ref([])
const searchQuery = ref('')
const filterStatus = ref('')
const loading = ref(true)
const showDeleteModal = ref(false)
const deviceToDelete = ref(null)

// デバイス一覧の取得
const fetchDevices = async () => {
  loading.value = true
  try {
    const params = {
      search: searchQuery.value,
      status: filterStatus.value,
    }
    
    const response = await $fetch('/api/v1/admin/devices', { params })
    devices.value = response.devices
  } catch (error) {
    console.error('デバイス一覧の取得に失敗しました', error)
  } finally {
    loading.value = false
  }
}

// 日付のフォーマット
const formatDate = (dateString) => {
  return format(new Date(dateString), 'yyyy/MM/dd HH:mm', { locale: ja })
}

// 削除確認ダイアログを表示
const confirmDelete = (device) => {
  deviceToDelete.value = device
  showDeleteModal.value = true
}

// 削除のキャンセル
const cancelDelete = () => {
  deviceToDelete.value = null
  showDeleteModal.value = false
}

// デバイスの削除
const deleteDevice = async () => {
  if (!deviceToDelete.value) return
  
  try {
    await $fetch(`/api/v1/admin/devices/${deviceToDelete.value.id}`, {
      method: 'DELETE',
    })
    
    // 一覧を再取得
    fetchDevices()
    cancelDelete()
  } catch (error) {
    console.error('デバイスの削除に失敗しました', error)
  }
}

// 検索のディバウンス処理
const debouncedSearch = useDebounceFn(() => {
  fetchDevices()
}, 300)

// 初期データ取得
onMounted(() => {
  fetchDevices()
})
</script>
```

### 4.2 デバイス登録・編集ページ

`pages/admin/devices/create.vue`と`pages/admin/devices/[id]/edit.vue`でデバイスの作成・編集機能を実装します。

---

## データ削除ポリシー

### 論理削除の適用

当システムでは、データの整合性維持と履歴追跡のため、デバイスデータは**論理削除（ソフトデリート）**を使用します。

1. **論理削除の理由**
   - デバイスIDはアクセスログ（`DeviceAccessLog`）などの関連テーブルから参照されている
   - 物理削除すると過去のログ参照時にエラーが発生する可能性がある
   - 誤削除からの復旧が容易になる

2. **実装詳細**
   - 削除操作はデバイスの物理削除ではなく以下のフラグを更新する:
     ```
     isDeleted: true,
     deletedAt: 現在日時
     ```
   - 通常の検索・一覧表示では `isDeleted: false` のデバイスのみ表示
   - ログや履歴表示では削除済みデバイスの情報も表示（「[削除済み]」などの表示付き）

3. **isDeletedとisActiveの違い**
   - `isDeleted`: データベース上の論理削除フラグ（削除済みか否か）
   - `isActive`: 運用上のステータスフラグ（有効か無効か）
   - 両方組み合わせて使用: `{ isActive: true, isDeleted: false }` = 有効なデバイス

### 運用ガイドライン

1. **一時的な無効化**: デバイスを一時的に使用停止する場合は `isActive = false` に設定
2. **完全な削除**: デバイスを完全に除外する場合は論理削除を使用（`isDeleted = true`）
3. **削除済みデバイスの復元**: 誤って削除した場合は `isDeleted = false, deletedAt = null` に戻す

---

## 5. テスト戦略

### 5.1 単体テスト
- デバイス認証APIのバリデーションテスト
- IPアドレス取得ロジックのテスト
- 認証セッション生成のテスト

### 5.2 統合テスト
- デバイス情報に基づく認証フローのテスト
- 部屋情報との紐づけテスト
- アクセスログ記録の検証

### 5.3 E2Eテスト
- 実際のIPアドレスを使用した認証テスト
- 管理画面からのデバイス登録・編集・削除テスト
- セッション維持とタイムアウトのテスト

---

## 6. デプロイ計画

### 6.1 段階的ロールアウト
1. **開発環境**: 全機能のテスト
2. **テスト環境**: 限定部屋での試験運用
3. **本番環境**: フロア単位での段階的導入

### 6.2 モニタリングとフィードバック
- デバイス認証失敗率のモニタリング
- 認証所要時間の計測
- ユーザー（宿泊客・ホテルスタッフ）からのフィードバック収集

### 6.3 ロールバックプラン
- 認証失敗率が15%を超えた場合に従来の認証方式へ一時的に戻す手順
- クイックフィックスのための緊急デプロイパイプラインの整備 