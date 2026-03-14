=== hotel-saas ログ確認UI 包括設計書 ===

【設計日】2025年9月27日
【対象システム】hotel-saas
【設計範囲】利用者向けログ確認UI + スーパーアドミン管理画面

【必読ドキュメント】
★★★ /Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_LOGGING_STANDARDS.md
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/saas/CURRENT_LOG_STATUS_MATRIX.md
★★☆ /Users/kaneko/hotel-kanri/docs/architecture/COMPREHENSIVE_LOG_SYSTEM_SUMMARY.md

## 🎯 【設計方針】

### **既存システムとの整合性**
✅ 既存の操作ログUI（/admin/front-desk/history）を拡張・発展
✅ hotel-common統合APIとの連携を維持
✅ 日本の伝統色カラーパレットを継承
✅ TailwindCSS + Nuxt3アーキテクチャを維持

### **新ログシステムとの統合**
✅ 7つのログテーブル（既存1個+新規6個）に対応
✅ 統一ログレベル（CRITICAL/ERROR/WARN/INFO/DEBUG）準拠
✅ 管理画面操作ログの特別要件対応
✅ セキュリティアラート・異常検知機能

## 📱 【1. 利用者向けログ確認画面設計】

### **1-1. 統合操作ログ画面**
**パス**: `/admin/logs/operations`
**目的**: 既存の業務履歴を全ログタイプに拡張

#### **画面構成**
```vue
<template>
  <div class="p-6">
    <!-- ヘッダー -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">操作ログ</h1>
      <p class="text-gray-600">全ての操作履歴・エラー・セキュリティイベントを確認できます</p>
    </div>

    <!-- ログタイプ選択タブ -->
    <div class="mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button v-for="tab in logTabs" :key="tab.id"
            @click="activeTab = tab.id"
            :class="tabClass(tab.id)">
            <component :is="tab.icon" class="w-5 h-5 mr-2" />
            {{ tab.label }}
            <span v-if="tab.count" class="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </div>
    </div>

    <!-- フィルター・検索エリア（既存UIを拡張） -->
    <LogFilterPanel 
      v-model:searchMode="searchMode"
      v-model:selectedPeriod="selectedPeriod"
      v-model:selectedType="selectedType"
      v-model:selectedLevel="selectedLevel"
      v-model:roomNumber="roomNumber"
      v-model:customStartDate="customStartDate"
      v-model:customStartTime="customStartTime"
      v-model:customEndDate="customEndDate"
      v-model:customEndTime="customEndTime"
      :log-type="activeTab"
      @apply-filters="applyFilters"
      @apply-custom-search="applyCustomSearch"
    />

    <!-- ログ一覧表示 -->
    <LogListDisplay
      :logs="logs"
      :loading="loading"
      :log-type="activeTab"
      @show-details="showLogDetails"
    />

    <!-- ページネーション -->
    <LogPagination
      v-if="!loading && logs.length > 0"
      :current-page="currentPage"
      :total-pages="totalPages"
      :total-count="totalCount"
      @change-page="changePage"
    />

    <!-- 詳細表示モーダル -->
    <LogDetailsModal
      v-if="selectedLog"
      :log="selectedLog"
      :log-type="activeTab"
      @close="selectedLog = null"
    />
  </div>
</template>
```

#### **ログタイプタブ構成**
```typescript
const logTabs = [
  {
    id: 'operations',
    label: '業務操作',
    icon: 'ClipboardDocumentListIcon',
    description: 'チェックイン・注文・会計等の業務操作',
    api: '/api/v1/admin/operation-logs',
    count: 0
  },
  {
    id: 'auth',
    label: '認証ログ',
    icon: 'KeyIcon', 
    description: 'ログイン・ログアウト・認証エラー',
    api: '/api/v1/logs/auth/search',
    count: 0
  },
  {
    id: 'ai',
    label: 'AI操作',
    icon: 'CpuChipIcon',
    description: 'AIコンシェルジュ・自動処理',
    api: '/api/v1/logs/ai-operation/search', 
    count: 0
  },
  {
    id: 'billing',
    label: '請求処理',
    icon: 'CreditCardIcon',
    description: '課金・請求・決済処理',
    api: '/api/v1/logs/billing/search',
    count: 0
  },
  {
    id: 'security',
    label: 'セキュリティ',
    icon: 'ShieldCheckIcon',
    description: '不正アクセス・異常操作',
    api: '/api/v1/logs/security/search',
    count: 0
  },
  {
    id: 'device',
    label: 'デバイス',
    icon: 'DevicePhoneMobileIcon',
    description: 'デバイス接続・使用状況',
    api: '/api/v1/logs/device-usage/search',
    count: 0
  }
]
```

### **1-2. フィルターパネル拡張**
**コンポーネント**: `LogFilterPanel.vue`

#### **新機能追加**
```vue
<!-- ログレベル選択 -->
<div>
  <label class="block text-sm font-medium text-gray-700 mb-2">ログレベル</label>
  <select v-model="selectedLevel" class="w-full border border-gray-300 rounded-md px-3 py-2">
    <option value="">すべて</option>
    <option value="CRITICAL">🔴 CRITICAL</option>
    <option value="ERROR">🟠 ERROR</option>
    <option value="WARN">🟡 WARN</option>
    <option value="INFO">🔵 INFO</option>
    <option value="DEBUG">⚪ DEBUG</option>
  </select>
</div>

<!-- セキュリティフィルター（セキュリティタブ時のみ表示） -->
<div v-if="logType === 'security'">
  <label class="block text-sm font-medium text-gray-700 mb-2">脅威レベル</label>
  <select v-model="selectedThreatLevel" class="w-full border border-gray-300 rounded-md px-3 py-2">
    <option value="">すべて</option>
    <option value="HIGH">🔴 高</option>
    <option value="MEDIUM">🟡 中</option>
    <option value="LOW">🟢 低</option>
  </select>
</div>

<!-- AI操作フィルター（AIタブ時のみ表示） -->
<div v-if="logType === 'ai'">
  <label class="block text-sm font-medium text-gray-700 mb-2">AI機能</label>
  <select v-model="selectedAiFunction" class="w-full border border-gray-300 rounded-md px-3 py-2">
    <option value="">すべて</option>
    <option value="CONCIERGE">コンシェルジュ</option>
    <option value="RECOMMENDATION">レコメンド</option>
    <option value="TRANSLATION">翻訳</option>
    <option value="ANALYSIS">分析</option>
  </select>
</div>
```

### **1-3. ログ詳細表示モーダル**
**コンポーネント**: `LogDetailsModal.vue`

#### **統一詳細表示**
```vue
<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
      <!-- ヘッダー -->
      <div class="flex items-center justify-between pb-4 border-b">
        <div class="flex items-center space-x-3">
          <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', log.bgColor]">
            <component :is="getLogIcon(log.type)" :class="['w-5 h-5', log.textColor]" />
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ log.action }}</h3>
            <p class="text-sm text-gray-500">{{ formatDateTime(log.timestamp) }}</p>
          </div>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 基本情報 -->
      <div class="py-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-500">ログレベル</label>
            <div class="flex items-center space-x-2 mt-1">
              <span :class="getLevelBadgeClass(log.level)">{{ log.level }}</span>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">実行者</label>
            <p class="text-sm text-gray-900 mt-1">{{ log.user_name || log.staff_name || '不明' }}</p>
          </div>
          <div v-if="log.room_number">
            <label class="text-sm font-medium text-gray-500">客室</label>
            <p class="text-sm text-gray-900 mt-1">{{ log.room_number }}</p>
          </div>
          <div v-if="log.ip_address">
            <label class="text-sm font-medium text-gray-500">IPアドレス</label>
            <p class="text-sm text-gray-900 mt-1">{{ log.ip_address }}</p>
          </div>
        </div>

        <!-- ログタイプ別詳細情報 -->
        <LogTypeSpecificDetails :log="log" :log-type="logType" />

        <!-- 変更内容（操作ログの場合） -->
        <div v-if="log.old_values || log.new_values" class="border-t pt-4">
          <label class="text-sm font-medium text-gray-500">変更内容</label>
          <div class="mt-2 space-y-2">
            <div v-if="log.old_values" class="bg-red-50 border border-red-200 rounded-md p-3">
              <p class="text-sm font-medium text-red-800">変更前</p>
              <pre class="text-xs text-red-700 mt-1 whitespace-pre-wrap">{{ formatJsonData(log.old_values) }}</pre>
            </div>
            <div v-if="log.new_values" class="bg-green-50 border border-green-200 rounded-md p-3">
              <p class="text-sm font-medium text-green-800">変更後</p>
              <pre class="text-xs text-green-700 mt-1 whitespace-pre-wrap">{{ formatJsonData(log.new_values) }}</pre>
            </div>
          </div>
        </div>

        <!-- エラー詳細（エラーログの場合） -->
        <div v-if="log.error_message || log.stack_trace" class="border-t pt-4">
          <label class="text-sm font-medium text-gray-500">エラー詳細</label>
          <div class="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
            <p v-if="log.error_message" class="text-sm text-red-800">{{ log.error_message }}</p>
            <details v-if="log.stack_trace" class="mt-2">
              <summary class="text-xs text-red-600 cursor-pointer">スタックトレース</summary>
              <pre class="text-xs text-red-600 mt-1 whitespace-pre-wrap">{{ log.stack_trace }}</pre>
            </details>
          </div>
        </div>

        <!-- 生データ -->
        <details class="border-t pt-4">
          <summary class="text-sm font-medium text-gray-500 cursor-pointer">生データ（JSON）</summary>
          <pre class="text-xs text-gray-600 mt-2 bg-gray-50 p-3 rounded-md overflow-x-auto">{{ JSON.stringify(log, null, 2) }}</pre>
        </details>
      </div>

      <!-- フッター -->
      <div class="flex justify-end pt-4 border-t space-x-3">
        <button @click="exportLog" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          エクスポート
        </button>
        <button @click="$emit('close')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>
```

## 🛡️ 【2. スーパーアドミン管理画面設計】

### **2-1. 全体アーキテクチャ**
**パス**: `/admin/super-admin/*`
**アクセス制御**: 最高権限レベル（SUPER_ADMIN）のみ

#### **メニュー構造**
```typescript
const superAdminMenu = {
  dashboard: {
    path: '/admin/super-admin/dashboard',
    label: 'ダッシュボード',
    icon: 'ChartBarIcon',
    description: 'リアルタイム監視・統計'
  },
  security: {
    path: '/admin/super-admin/security',
    label: 'セキュリティ監視',
    icon: 'ShieldCheckIcon',
    description: 'アラート・脅威検知'
  },
  logs: {
    path: '/admin/super-admin/logs',
    label: 'ログ分析',
    icon: 'DocumentMagnifyingGlassIcon', 
    description: '高度なログ分析・レポート'
  },
  system: {
    path: '/admin/super-admin/system',
    label: 'システム設定',
    icon: 'CogIcon',
    description: 'プラン・料金・システム設定'
  },
  tenants: {
    path: '/admin/super-admin/tenants',
    label: 'テナント管理',
    icon: 'BuildingOfficeIcon',
    description: 'テナント・契約管理'
  }
}
```

### **2-2. リアルタイム監視ダッシュボード**
**パス**: `/admin/super-admin/dashboard`

#### **画面レイアウト**
```vue
<template>
  <div class="p-6 space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">スーパーアドミン ダッシュボード</h1>
        <p class="text-gray-600">システム全体のリアルタイム監視</p>
      </div>
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-sm text-gray-600">リアルタイム更新中</span>
        </div>
        <button @click="refreshAll" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <ArrowPathIcon class="w-4 h-4 mr-2" />
          更新
        </button>
      </div>
    </div>

    <!-- アラートバー -->
    <AlertBanner :alerts="criticalAlerts" />

    <!-- メトリクス概要 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="アクティブテナント"
        :value="metrics.activeTenants"
        :change="metrics.tenantChange"
        icon="BuildingOfficeIcon"
        color="blue"
      />
      <MetricCard
        title="今日のエラー"
        :value="metrics.todayErrors"
        :change="metrics.errorChange"
        icon="ExclamationTriangleIcon"
        color="red"
      />
      <MetricCard
        title="セキュリティアラート"
        :value="metrics.securityAlerts"
        :change="metrics.securityChange"
        icon="ShieldExclamationIcon"
        color="orange"
      />
      <MetricCard
        title="システム稼働率"
        :value="`${metrics.uptime}%`"
        :change="metrics.uptimeChange"
        icon="ServerIcon"
        color="green"
      />
    </div>

    <!-- チャート・グラフエリア -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- ログ発生トレンド -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">ログ発生トレンド（24時間）</h3>
        <LogTrendChart :data="logTrendData" />
      </div>

      <!-- エラー分布 -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">エラー分布</h3>
        <ErrorDistributionChart :data="errorDistributionData" />
      </div>
    </div>

    <!-- リアルタイムログストリーム -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">リアルタイムログストリーム</h3>
        <div class="flex items-center space-x-2">
          <button 
            @click="toggleAutoScroll"
            :class="[
              'px-3 py-1 text-sm rounded-md',
              autoScroll ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            ]"
          >
            {{ autoScroll ? '自動スクロール ON' : '自動スクロール OFF' }}
          </button>
          <button @click="clearLogStream" class="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md">
            クリア
          </button>
        </div>
      </div>
      <div class="h-96 overflow-y-auto p-4">
        <RealTimeLogStream 
          :logs="realtimeLogs" 
          :auto-scroll="autoScroll"
          @log-click="showLogDetails"
        />
      </div>
    </div>

    <!-- システム状態 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SystemStatusCard
        title="hotel-saas"
        :status="systemStatus.saas"
        :metrics="systemMetrics.saas"
      />
      <SystemStatusCard
        title="hotel-common"
        :status="systemStatus.common"
        :metrics="systemMetrics.common"
      />
      <SystemStatusCard
        title="hotel-member"
        :status="systemStatus.member"
        :metrics="systemMetrics.member"
      />
    </div>
  </div>
</template>
```

### **2-3. セキュリティアラートシステム**
**パス**: `/admin/super-admin/security`

#### **アラート管理画面**
```vue
<template>
  <div class="p-6 space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">セキュリティ監視</h1>
        <p class="text-gray-600">脅威検知・異常操作・不正アクセスの監視</p>
      </div>
      <div class="flex items-center space-x-4">
        <button @click="runSecurityScan" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
          <MagnifyingGlassIcon class="w-4 h-4 mr-2" />
          セキュリティスキャン実行
        </button>
      </div>
    </div>

    <!-- 脅威レベル概要 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <ThreatLevelCard
        level="CRITICAL"
        :count="threatCounts.critical"
        color="red"
        description="即座に対応が必要"
      />
      <ThreatLevelCard
        level="HIGH"
        :count="threatCounts.high"
        color="orange"
        description="24時間以内に対応"
      />
      <ThreatLevelCard
        level="MEDIUM"
        :count="threatCounts.medium"
        color="yellow"
        description="1週間以内に対応"
      />
      <ThreatLevelCard
        level="LOW"
        :count="threatCounts.low"
        color="green"
        description="監視継続"
      />
    </div>

    <!-- アクティブアラート -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">アクティブアラート</h3>
      </div>
      <div class="divide-y divide-gray-200">
        <SecurityAlert
          v-for="alert in activeAlerts"
          :key="alert.id"
          :alert="alert"
          @acknowledge="acknowledgeAlert"
          @resolve="resolveAlert"
          @escalate="escalateAlert"
        />
      </div>
    </div>

    <!-- 異常検知パターン -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AnomalyDetectionPanel :patterns="anomalyPatterns" />
      <SecurityTrendChart :data="securityTrendData" />
    </div>

    <!-- セキュリティ設定 -->
    <SecuritySettingsPanel 
      :settings="securitySettings"
      @update-settings="updateSecuritySettings"
    />
  </div>
</template>
```

### **2-4. ログ分析・レポート機能**
**パス**: `/admin/super-admin/logs`

#### **高度なログ分析画面**
```vue
<template>
  <div class="p-6 space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">ログ分析・レポート</h1>
        <p class="text-gray-600">高度なログ分析・パターン検出・レポート生成</p>
      </div>
      <div class="flex items-center space-x-4">
        <button @click="generateReport" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
          <DocumentArrowDownIcon class="w-4 h-4 mr-2" />
          レポート生成
        </button>
      </div>
    </div>

    <!-- 分析クエリビルダー -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">分析クエリビルダー</h3>
      <LogQueryBuilder 
        v-model:query="analysisQuery"
        @execute="executeAnalysis"
      />
    </div>

    <!-- 分析結果 -->
    <div v-if="analysisResults" class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">分析結果</h3>
      <LogAnalysisResults :results="analysisResults" />
    </div>

    <!-- 定期レポート管理 -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">定期レポート</h3>
      </div>
      <ScheduledReportsManager 
        :reports="scheduledReports"
        @create-report="createScheduledReport"
        @edit-report="editScheduledReport"
        @delete-report="deleteScheduledReport"
      />
    </div>
  </div>
</template>
```

## 🔧 【3. API統合更新設計】

### **3-1. 既存API拡張**
**ファイル**: `server/api/v1/admin/operation-logs.get.ts`

#### **新ログタイプ対応**
```typescript
// 新しいログタイプルーティング
const LOG_TYPE_API_MAP = {
  operations: '/api/v1/admin/operation-logs',
  auth: '/api/v1/logs/auth/search', 
  ai: '/api/v1/logs/ai-operation/search',
  billing: '/api/v1/logs/billing/search',
  security: '/api/v1/logs/security/search',
  device: '/api/v1/logs/device-usage/search'
}

// ログレベルフィルタリング
const LOG_LEVEL_PRIORITY = {
  CRITICAL: 5,
  ERROR: 4,
  WARN: 3,
  INFO: 2,
  DEBUG: 1
}
```

### **3-2. 新規API追加**
**ファイル**: `server/api/v1/admin/logs/[type]/search.get.ts`

#### **統合ログ検索API**
```typescript
export default defineEventHandler(async (event) => {
  const logType = getRouterParam(event, 'type')
  const query = getQuery(event)
  
  // 認証・テナント確認
  const authUser = await verifyAuth(event)
  const tenantId = getTenantId(event, authUser)
  
  // ログタイプ別API呼び出し
  const apiEndpoint = LOG_TYPE_API_MAP[logType]
  if (!apiEndpoint) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid log type' })
  }
  
  // hotel-common統合API呼び出し
  const response = await callHotelCommonAPI(apiEndpoint, query, authUser, tenantId)
  
  return response
})
```

## 📊 【4. 実装優先順位】

### **Phase 1: 基盤拡張（1-3日）**
□ 既存操作ログUIの新ログタイプ対応
□ LogFilterPanel拡張（ログレベル・タイプ別フィルター）
□ 統合ログ検索API実装

### **Phase 2: 詳細機能（4-7日）**  
□ LogDetailsModal統合実装
□ ログタイプ別詳細表示コンポーネント
□ エクスポート機能実装

### **Phase 3: スーパーアドミン基盤（8-12日）**
□ スーパーアドミンレイアウト・認証
□ ダッシュボード基本機能
□ リアルタイムログストリーム

### **Phase 4: 高度機能（13-18日）**
□ セキュリティアラートシステム
□ 異常検知・パターン分析
□ ログ分析・レポート機能

### **Phase 5: 運用機能（19-21日）**
□ 定期レポート・通知機能
□ システム設定・テナント管理
□ パフォーマンス最適化

## ⚠️ 【重要な実装注意事項】

### **既存システムとの整合性**
❌ 既存の操作ログUI（/admin/front-desk/history）を削除・変更しない
✅ 新しい統合ログUI（/admin/logs/operations）として拡張実装
✅ 既存APIエンドポイントとの互換性を維持

### **パフォーマンス考慮**
✅ リアルタイム更新はWebSocket使用
✅ 大量ログ表示時の仮想スクロール実装
✅ ログ検索結果のキャッシュ機能

### **セキュリティ要件**
✅ スーパーアドミン機能は最高権限レベルのみアクセス可能
✅ ログ詳細表示時の機密情報マスキング
✅ 監査ログの改ざん防止機能

この設計により、既存システムとの整合性を保ちながら、包括的なログ管理UIを実現できます。
