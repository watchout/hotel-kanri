/**
 * F-020: ハンドオフ（スタッフ引継）管理 - API Composable
 * 
 * ハンドオフ情報の作成・更新・取得、確認管理
 */

interface HandoffData {
  id?: string
  tenantId: string
  handoffNumber?: string
  fromUserId: string
  toUserId: string
  roomId?: string
  handoffType: 'SHIFT_CHANGE' | 'GUEST_TRANSFER' | 'TASK_DELEGATION' | 'EMERGENCY_TAKEOVER' | 'END_OF_SHIFT'
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ACKNOWLEDGED' | 'CANCELED'
  priority?: number
  description?: string
  estimatedDuration?: number
  actualDuration?: number
  startedAt?: string
  completedAt?: string
}

interface HandoffTask {
  id?: string
  handoffId?: string
  taskNumber?: string
  title: string
  description?: string
  category: 'GUEST_INFO' | 'ROOM_STATUS' | 'MAINTENANCE' | 'CLEANING' | 'BILLING' | 'EMERGENCY' | 'DOCUMENTATION' | 'OTHER'
  priority?: number
  status?: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'DELEGATED' | 'CANCELED'
  dueDate?: string
  completedAt?: string
  notes?: string
  attachmentUrls?: string[]
}

interface HandoffAcknowledgment {
  id?: string
  handoffId: string
  acknowledgedById: string
  acknowledgeType: 'CHECK_IN' | 'CHECK_OUT' | 'PARTIAL_CONFIRM'
  status?: 'PENDING' | 'CONFIRMED' | 'NEEDS_REVISION' | 'DISPUTED'
  checkedItems?: number
  totalItems?: number
  comments?: string
  signatureUrl?: string
}

interface UseHandoffOptions {
  baseUrl?: string
  timeout?: number
}

export const useHandoff = (options: UseHandoffOptions = {}) => {
  const config = useRuntimeConfig()
  const baseUrl = options.baseUrl || config.public.apiBaseUrl || '/api'
  const timeout = options.timeout || 10000

  // ===== ハンドオフ管理API =====

  /**
   * ハンドオフ一覧取得
   */
  const getHandoffs = async (tenantId: string, filters?: {
    status?: string
    limit?: number
    offset?: number
  }) => {
    try {
      const query = new URLSearchParams({
        tenantId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.limit && { limit: filters.limit.toString() }),
        ...(filters?.offset && { offset: filters.offset.toString() }),
      })

      const response = await $fetch(`${baseUrl}/handoffs?${query.toString()}`, {
        method: 'GET',
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to fetch handoffs:', error)
      throw error
    }
  }

  /**
   * ハンドオフ作成
   */
  const createHandoff = async (data: HandoffData) => {
    try {
      const response = await $fetch(`${baseUrl}/handoffs`, {
        method: 'POST',
        body: data,
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to create handoff:', error)
      throw error
    }
  }

  /**
   * ハンドオフ詳細取得
   */
  const getHandoff = async (handoffId: string) => {
    try {
      const response = await $fetch(`${baseUrl}/handoffs/${handoffId}`, {
        method: 'GET',
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to fetch handoff:', error)
      throw error
    }
  }

  /**
   * ハンドオフ更新
   */
  const updateHandoff = async (handoffId: string, data: Partial<HandoffData>) => {
    try {
      const response = await $fetch(`${baseUrl}/handoffs/${handoffId}`, {
        method: 'PATCH',
        body: data,
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to update handoff:', error)
      throw error
    }
  }

  /**
   * ハンドオフタスク追加
   */
  const addTask = async (handoffId: string, task: HandoffTask) => {
    try {
      const response = await $fetch(`${baseUrl}/handoffs/${handoffId}/tasks`, {
        method: 'POST',
        body: task,
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to add task:', error)
      throw error
    }
  }

  /**
   * ハンドオフ確認（チェックイン/チェックアウト）
   */
  const acknowledgeHandoff = async (handoffId: string, ack: HandoffAcknowledgment) => {
    try {
      const response = await $fetch(`${baseUrl}/handoffs/${handoffId}/acknowledge`, {
        method: 'POST',
        body: ack,
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to acknowledge handoff:', error)
      throw error
    }
  }

  /**
   * ハンドオフ開始
   */
  const startHandoff = async (handoffId: string) => {
    try {
      const response = await $fetch(`${baseUrl}/handoffs/${handoffId}`, {
        method: 'PATCH',
        body: {
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString()
        },
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to start handoff:', error)
      throw error
    }
  }

  /**
   * ハンドオフ完了
   */
  const completeHandoff = async (handoffId: string, actualDuration?: number) => {
    try {
      const response = await $fetch(`${baseUrl}/handoffs/${handoffId}`, {
        method: 'PATCH',
        body: {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          ...(actualDuration && { actualDuration })
        },
        timeout
      })
      return response
    } catch (error) {
      console.error('Failed to complete handoff:', error)
      throw error
    }
  }

  return {
    getHandoffs,
    createHandoff,
    getHandoff,
    updateHandoff,
    addTask,
    acknowledgeHandoff,
    startHandoff,
    completeHandoff,
  }
}
