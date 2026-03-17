<template>
  <div class="handoffs-page">
    <div class="page-header">
      <h1>ハンドオフ管理</h1>
      <button class="btn-primary" @click="openCreateModal">
        + 新規ハンドオフ作成
      </button>
    </div>

    <!-- フィルター -->
    <div class="filter-section">
      <select v-model="filter.status" @change="loadHandoffs">
        <option value="">すべて</option>
        <option value="PENDING">未開始</option>
        <option value="IN_PROGRESS">進行中</option>
        <option value="COMPLETED">完了</option>
        <option value="ACKNOWLEDGED">確認済み</option>
      </select>
    </div>

    <!-- ハンドオフ一覧 -->
    <div class="handoffs-list">
      <div v-if="loading" class="loading">
        ロード中...
      </div>
      <div v-else-if="handoffs.length === 0" class="empty-state">
        ハンドオフがありません
      </div>
      <div v-else class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>ハンドオフID</th>
              <th>種別</th>
              <th>引継元</th>
              <th>引継先</th>
              <th>ステータス</th>
              <th>優先度</th>
              <th>開始時刻</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in handoffs" :key="h.id" :class="`status-${h.status.toLowerCase()}`">
              <td class="handoff-number">
                <NuxtLink :to="`/handoffs/${h.id}`">
                  {{ h.handoffNumber }}
                </NuxtLink>
              </td>
              <td class="handoff-type">{{ formatHandoffType(h.handoffType) }}</td>
              <td>{{ h.fromUserId }}</td>
              <td>{{ h.toUserId }}</td>
              <td class="status">
                <span :class="`badge badge-${h.status.toLowerCase()}`">
                  {{ formatStatus(h.status) }}
                </span>
              </td>
              <td class="priority">{{ formatPriority(h.priority) }}</td>
              <td class="timestamp">
                {{ formatDateTime(h.startedAt) }}
              </td>
              <td class="actions">
                <button v-if="h.status === 'PENDING'" @click="startHandoff(h.id)" class="btn-sm btn-start">
                  開始
                </button>
                <button v-if="h.status === 'IN_PROGRESS'" @click="completeHandoff(h.id)" class="btn-sm btn-complete">
                  完了
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新規作成モーダル -->
    <HandoffForm
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @submit="handleCreateHandoff"
    />
  </div>
</template>

<script setup lang="ts">
import type { StaffHandoff } from '~/types/handoff'

const { getHandoffs, createHandoff, startHandoff: startHandoffApi, completeHandoff: completeHandoffApi } = useHandoff()

const handoffs = ref<StaffHandoff[]>([])
const loading = ref(false)
const showCreateModal = ref(false)
const filter = ref({
  status: '',
})

onMounted(() => {
  loadHandoffs()
})

const loadHandoffs = async () => {
  try {
    loading.value = true
    const response = await getHandoffs('tenant-1', {
      status: filter.value.status || undefined,
    })
    if (response.success && response.data) {
      handoffs.value = response.data
    }
  } catch (error) {
    console.error('Failed to load handoffs:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  showCreateModal.value = true
}

const handleCreateHandoff = async (data: any) => {
  try {
    await createHandoff({
      tenantId: 'tenant-1',
      ...data,
    })
    showCreateModal.value = false
    await loadHandoffs()
  } catch (error) {
    console.error('Failed to create handoff:', error)
  }
}

const startHandoff = async (handoffId: string) => {
  try {
    await startHandoffApi(handoffId)
    await loadHandoffs()
  } catch (error) {
    console.error('Failed to start handoff:', error)
  }
}

const completeHandoff = async (handoffId: string) => {
  try {
    await completeHandoffApi(handoffId)
    await loadHandoffs()
  } catch (error) {
    console.error('Failed to complete handoff:', error)
  }
}

const formatHandoffType = (type: string) => {
  const typeMap: Record<string, string> = {
    'SHIFT_CHANGE': 'シフト交代',
    'GUEST_TRANSFER': '客室引継',
    'TASK_DELEGATION': 'タスク委譲',
    'EMERGENCY_TAKEOVER': '緊急引継',
    'END_OF_SHIFT': 'シフト終了',
  }
  return typeMap[type] || type
}

const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'PENDING': '未開始',
    'IN_PROGRESS': '進行中',
    'COMPLETED': '完了',
    'ACKNOWLEDGED': '確認済み',
    'CANCELED': 'キャンセル',
  }
  return statusMap[status] || status
}

const formatPriority = (priority: number) => {
  if (priority === 1) return '高'
  if (priority === 3) return '中'
  if (priority === 5) return '低'
  return priority.toString()
}

const formatDateTime = (date?: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('ja-JP')
}
</script>

<style scoped lang="css">
.handoffs-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.btn-primary {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background: #0056b3;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-section select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.handoffs-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.loading,
.empty-state {
  padding: 40px;
  text-align: center;
  color: #666;
}

.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background: #f5f5f5;
  border-bottom: 2px solid #ddd;
}

.table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.table tbody tr:hover {
  background: #f9f9f9;
}

.status {
  display: inline-block;
}

.badge {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.badge-pending {
  background: #fff3cd;
  color: #856404;
}

.badge-in_progress {
  background: #cfe2ff;
  color: #084298;
}

.badge-completed {
  background: #d1e7dd;
  color: #0f5132;
}

.badge-acknowledged {
  background: #d1e7dd;
  color: #0f5132;
}

.actions {
  text-align: right;
}

.btn-sm {
  padding: 6px 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 5px;
}

.btn-start {
  background: #28a745;
  color: white;
}

.btn-start:hover {
  background: #218838;
}

.btn-complete {
  background: #007bff;
  color: white;
}

.btn-complete:hover {
  background: #0056b3;
}

.handoff-number {
  font-weight: 600;
  color: #007bff;
}

a {
  color: #007bff;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
