<template>
  <div class="handoff-detail-page">
    <div v-if="loading" class="loading">ロード中...</div>
    <div v-else-if="handoff">
      <div class="page-header">
        <NuxtLink to="/handoffs" class="btn-back">← 戻る</NuxtLink>
        <h1>{{ handoff.handoffNumber }}</h1>
        <div class="status-badge" :class="`badge-${handoff.status.toLowerCase()}`">
          {{ formatStatus(handoff.status) }}
        </div>
      </div>

      <!-- 基本情報 -->
      <div class="card">
        <h2>ハンドオフ情報</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>種別</label>
            <div>{{ formatHandoffType(handoff.handoffType) }}</div>
          </div>
          <div class="info-item">
            <label>引継元</label>
            <div>{{ handoff.fromUserId }}</div>
          </div>
          <div class="info-item">
            <label>引継先</label>
            <div>{{ handoff.toUserId }}</div>
          </div>
          <div class="info-item">
            <label>優先度</label>
            <div>{{ formatPriority(handoff.priority) }}</div>
          </div>
          <div class="info-item">
            <label>説明</label>
            <div>{{ handoff.description || '-' }}</div>
          </div>
          <div class="info-item">
            <label>推定時間</label>
            <div>{{ handoff.estimatedDuration ? `${handoff.estimatedDuration}分` : '-' }}</div>
          </div>
          <div class="info-item">
            <label>実績時間</label>
            <div>{{ handoff.actualDuration ? `${handoff.actualDuration}分` : '-' }}</div>
          </div>
          <div class="info-item">
            <label>開始時刻</label>
            <div>{{ formatDateTime(handoff.startedAt) }}</div>
          </div>
          <div class="info-item">
            <label>完了時刻</label>
            <div>{{ formatDateTime(handoff.completedAt) }}</div>
          </div>
        </div>
      </div>

      <!-- タスク一覧 -->
      <div class="card">
        <div class="section-header">
          <h2>タスク</h2>
          <button class="btn-primary" @click="showAddTaskModal = true">
            + タスク追加
          </button>
        </div>

        <div v-if="handoff.tasks && handoff.tasks.length > 0" class="tasks-list">
          <div v-for="task in handoff.tasks" :key="task.id" class="task-item">
            <div class="task-header">
              <input type="checkbox" :checked="task.status === 'COMPLETED'" @change="e => updateTaskStatus(task.id, e.target.checked ? 'COMPLETED' : 'PENDING')">
              <span class="task-title">{{ task.title }}</span>
              <span class="task-category">{{ formatTaskCategory(task.category) }}</span>
            </div>
            <div class="task-details">
              <p v-if="task.description">{{ task.description }}</p>
              <p v-if="task.notes">
                <strong>メモ:</strong> {{ task.notes }}
              </p>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          タスクがありません
        </div>
      </div>

      <!-- 確認履歴 -->
      <div class="card">
        <h2>確認履歴</h2>
        <div v-if="handoff.acknowledgments && handoff.acknowledgments.length > 0" class="acknowledgments-list">
          <div v-for="ack in handoff.acknowledgments" :key="ack.id" class="ack-item">
            <div class="ack-header">
              <span class="ack-type">{{ formatAckType(ack.acknowledgeType) }}</span>
              <span class="ack-timestamp">{{ formatDateTime(ack.acknowledgedAt) }}</span>
            </div>
            <div class="ack-status">
              ステータス: <span :class="`badge-${ack.status.toLowerCase()}`">{{ formatAckStatus(ack.status) }}</span>
            </div>
            <p v-if="ack.comments">{{ ack.comments }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
          確認がまだありません
        </div>
      </div>

      <!-- アクション -->
      <div class="card actions-section">
        <h2>アクション</h2>
        <div class="button-group">
          <button
            v-if="handoff.status === 'PENDING'"
            class="btn-primary"
            @click="startHandoff"
          >
            ハンドオフ開始
          </button>
          <button
            v-if="handoff.status === 'IN_PROGRESS'"
            class="btn-success"
            @click="completeHandoff"
          >
            ハンドオフ完了
          </button>
          <button
            v-if="['COMPLETED', 'IN_PROGRESS'].includes(handoff.status)"
            class="btn-info"
            @click="showAckModal = true"
          >
            確認
          </button>
        </div>
      </div>

      <!-- タスク追加モーダル -->
      <HandoffTaskForm
        v-if="showAddTaskModal"
        :handoff-id="handoff.id"
        @close="showAddTaskModal = false"
        @submit="handleAddTask"
      />

      <!-- 確認モーダル -->
      <HandoffAcknowledgeForm
        v-if="showAckModal"
        :handoff-id="handoff.id"
        :total-tasks="handoff.tasks?.length || 0"
        @close="showAckModal = false"
        @submit="handleAcknowledge"
      />
    </div>
    <div v-else class="error">
      ハンドオフが見つかりません
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StaffHandoff, HandoffTask } from '~/types/handoff'

const route = useRoute()
const { getHandoff, addTask, acknowledgeHandoff, startHandoff: startHandoffApi, completeHandoff: completeHandoffApi } = useHandoff()

const handoff = ref<StaffHandoff | null>(null)
const loading = ref(true)
const showAddTaskModal = ref(false)
const showAckModal = ref(false)

const handoffId = computed(() => route.params.id as string)

onMounted(async () => {
  try {
    const response = await getHandoff(handoffId.value)
    if (response.success && response.data) {
      handoff.value = response.data
    }
  } catch (error) {
    console.error('Failed to load handoff:', error)
  } finally {
    loading.value = false
  }
})

const startHandoff = async () => {
  try {
    await startHandoffApi(handoffId.value)
    const response = await getHandoff(handoffId.value)
    if (response.success && response.data) {
      handoff.value = response.data
    }
  } catch (error) {
    console.error('Failed to start handoff:', error)
  }
}

const completeHandoff = async () => {
  try {
    await completeHandoffApi(handoffId.value)
    const response = await getHandoff(handoffId.value)
    if (response.success && response.data) {
      handoff.value = response.data
    }
  } catch (error) {
    console.error('Failed to complete handoff:', error)
  }
}

const handleAddTask = async (task: HandoffTask) => {
  try {
    await addTask(handoffId.value, task)
    showAddTaskModal.value = false
    const response = await getHandoff(handoffId.value)
    if (response.success && response.data) {
      handoff.value = response.data
    }
  } catch (error) {
    console.error('Failed to add task:', error)
  }
}

const handleAcknowledge = async (ack: any) => {
  try {
    await acknowledgeHandoff(handoffId.value, ack)
    showAckModal.value = false
    const response = await getHandoff(handoffId.value)
    if (response.success && response.data) {
      handoff.value = response.data
    }
  } catch (error) {
    console.error('Failed to acknowledge:', error)
  }
}

const updateTaskStatus = (taskId: string, newStatus: string) => {
  // TODO: API call to update task status
  console.log(`Update task ${taskId} to ${newStatus}`)
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

const formatTaskCategory = (category: string) => {
  const categoryMap: Record<string, string> = {
    'GUEST_INFO': 'ゲスト情報',
    'ROOM_STATUS': '客室状況',
    'MAINTENANCE': 'メンテナンス',
    'CLEANING': '清掃',
    'BILLING': '請求',
    'EMERGENCY': '緊急',
    'DOCUMENTATION': '書類',
    'OTHER': 'その他',
  }
  return categoryMap[category] || category
}

const formatAckType = (type: string) => {
  const typeMap: Record<string, string> = {
    'CHECK_IN': 'チェックイン',
    'CHECK_OUT': 'チェックアウト',
    'PARTIAL_CONFIRM': '部分確認',
  }
  return typeMap[type] || type
}

const formatAckStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'PENDING': '未確認',
    'CONFIRMED': '確認済み',
    'NEEDS_REVISION': '修正必要',
    'DISPUTED': '異議あり',
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
.handoff-detail-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  gap: 15px;
}

.btn-back {
  padding: 8px 12px;
  background: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
}

.btn-back:hover {
  background: #e0e0e0;
}

.page-header h1 {
  flex-grow: 1;
  margin: 0;
  font-size: 24px;
}

.status-badge {
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.info-item label {
  display: block;
  font-weight: 600;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.info-item div {
  font-size: 14px;
  color: #333;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 12px;
  background: #fafafa;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.task-title {
  flex-grow: 1;
  font-weight: 500;
}

.task-category {
  background: #e8f4f8;
  color: #0c5aa0;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.task-details {
  margin-top: 8px;
  padding-left: 24px;
  font-size: 13px;
  color: #666;
}

.task-details p {
  margin: 5px 0;
}

.acknowledgments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ack-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
  background: #f0f8f0;
}

.ack-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 500;
}

.ack-type {
  background: #d1e7dd;
  color: #0f5132;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.ack-timestamp {
  font-size: 12px;
  color: #666;
}

.ack-status {
  margin: 8px 0;
  font-size: 13px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #999;
}

.actions-section {
  text-align: center;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-primary,
.btn-success,
.btn-info {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}

.error {
  padding: 40px;
  text-align: center;
  color: #c33;
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
</style>
