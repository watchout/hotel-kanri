/**
 * チェックインセッション管理 - API Composable
 * 
 * hotel-saas システム用のセッション管理API
 * セッション単位でのサービス注文・請求管理を実現
 */

import type {
  CheckinSession,
  SessionWithDetails,
  SessionSummary,
  ActiveSession,
  CreateSessionRequest,
  UpdateSessionRequest,
  CheckoutRequest,
  SessionSearchCriteria,
  ServiceOrder,
  CreateOrderRequest,
  UpdateOrderRequest,
  SessionBilling,
  SessionError,
  SessionErrorCode
} from '~/types/checkin-session'

interface UseSessionApiOptions {
  baseUrl?: string;
  timeout?: number;
}

export const useSessionApi = (options: UseSessionApiOptions = {}) => {
  const config = useRuntimeConfig()
  const baseUrl = options.baseUrl || config.public.apiBaseUrl || '/api'
  const timeout = options.timeout || 10000

  // ===== セッション管理API =====

  /**
   * セッション作成（チェックイン時）
   */
  const createSession = async (data: CreateSessionRequest): Promise<CheckinSession> => {
    try {
      const response = await $fetch<CheckinSession>(`${baseUrl}/sessions`, {
        method: 'POST',
        body: data,
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'セッションの作成に失敗しました')
    }
  }

  /**
   * セッション情報取得
   */
  const getSession = async (sessionId: string): Promise<CheckinSession> => {
    try {
      const response = await $fetch<CheckinSession>(`${baseUrl}/sessions/${sessionId}`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'セッション情報の取得に失敗しました')
    }
  }

  /**
   * セッション詳細情報取得（リレーション含む）
   */
  const getSessionWithDetails = async (sessionId: string): Promise<SessionWithDetails> => {
    try {
      const response = await $fetch<SessionWithDetails>(`${baseUrl}/sessions/${sessionId}/details`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'セッション詳細情報の取得に失敗しました')
    }
  }

  /**
   * セッション番号による取得
   */
  const getSessionByNumber = async (sessionNumber: string): Promise<CheckinSession> => {
    try {
      const response = await $fetch<CheckinSession>(`${baseUrl}/sessions/by-number/${sessionNumber}`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'セッション情報の取得に失敗しました')
    }
  }

  /**
   * 部屋のアクティブセッション取得
   */
  const getActiveSessionByRoom = async (roomId: string): Promise<ActiveSession | null> => {
    try {
      const response = await $fetch<ActiveSession | null>(`${baseUrl}/sessions/active-by-room/${roomId}`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'アクティブセッション情報の取得に失敗しました')
    }
  }

  /**
   * 部屋番号からアクティブセッション取得
   */
  const getActiveSessionByRoomNumber = async (roomNumber: string): Promise<ActiveSession | null> => {
    try {
      const response = await $fetch<ActiveSession | null>(`${baseUrl}/sessions/active-by-room-number/${roomNumber}`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'アクティブセッション情報の取得に失敗しました')
    }
  }

  /**
   * セッション更新
   */
  const updateSession = async (sessionId: string, data: UpdateSessionRequest): Promise<CheckinSession> => {
    try {
      const response = await $fetch<CheckinSession>(`${baseUrl}/sessions/${sessionId}`, {
        method: 'PATCH',
        body: data,
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'セッション情報の更新に失敗しました')
    }
  }

  /**
   * チェックアウト処理
   */
  const checkoutSession = async (sessionId: string, data: CheckoutRequest): Promise<SessionBilling> => {
    try {
      const response = await $fetch<SessionBilling>(`${baseUrl}/sessions/${sessionId}/checkout`, {
        method: 'POST',
        body: data,
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'チェックアウト処理に失敗しました')
    }
  }

  /**
   * セッション検索
   */
  const searchSessions = async (criteria: SessionSearchCriteria): Promise<CheckinSession[]> => {
    try {
      const query = new URLSearchParams()
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            query.append(key, value.toISOString())
          } else {
            query.append(key, String(value))
          }
        }
      })

      const response = await $fetch<CheckinSession[]>(`${baseUrl}/sessions/search?${query.toString()}`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'セッション検索に失敗しました')
    }
  }

  /**
   * セッション一覧取得（サマリー形式）
   */
  const getSessionSummaries = async (criteria: SessionSearchCriteria): Promise<SessionSummary[]> => {
    try {
      const query = new URLSearchParams()
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            query.append(key, value.toISOString())
          } else {
            query.append(key, String(value))
          }
        }
      })

      const response = await $fetch<SessionSummary[]>(`${baseUrl}/sessions/summaries?${query.toString()}`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'セッション一覧の取得に失敗しました')
    }
  }

  // ===== サービス注文API =====

  /**
   * サービス注文作成
   */
  const createOrder = async (sessionId: string, data: CreateOrderRequest): Promise<ServiceOrder> => {
    try {
      const response = await $fetch<ServiceOrder>(`${baseUrl}/sessions/${sessionId}/orders`, {
        method: 'POST',
        body: data,
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, 'サービス注文の作成に失敗しました')
    }
  }

  /**
   * セッションの注文履歴取得
   */
  const getSessionOrders = async (sessionId: string): Promise<ServiceOrder[]> => {
    try {
      const response = await $fetch<ServiceOrder[]>(`${baseUrl}/sessions/${sessionId}/orders`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, '注文履歴の取得に失敗しました')
    }
  }

  /**
   * 注文更新
   */
  const updateOrder = async (orderId: string, data: UpdateOrderRequest): Promise<ServiceOrder> => {
    try {
      const response = await $fetch<ServiceOrder>(`${baseUrl}/orders/${orderId}`, {
        method: 'PATCH',
        body: data,
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, '注文情報の更新に失敗しました')
    }
  }

  /**
   * 注文キャンセル
   */
  const cancelOrder = async (orderId: string, reason?: string): Promise<ServiceOrder> => {
    try {
      const response = await $fetch<ServiceOrder>(`${baseUrl}/orders/${orderId}/cancel`, {
        method: 'POST',
        body: { reason },
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, '注文のキャンセルに失敗しました')
    }
  }

  // ===== セッション請求API =====

  /**
   * セッション請求情報取得
   */
  const getSessionBilling = async (sessionId: string): Promise<SessionBilling> => {
    try {
      const response = await $fetch<SessionBilling>(`${baseUrl}/sessions/${sessionId}/billing`, {
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, '請求情報の取得に失敗しました')
    }
  }

  /**
   * セッション請求情報更新（リアルタイム計算）
   */
  const refreshSessionBilling = async (sessionId: string): Promise<SessionBilling> => {
    try {
      const response = await $fetch<SessionBilling>(`${baseUrl}/sessions/${sessionId}/billing/refresh`, {
        method: 'POST',
        timeout
      })
      return response
    } catch (error) {
      throw handleApiError(error, '請求情報の更新に失敗しました')
    }
  }

  // ===== ユーティリティ関数 =====

  /**
   * セッション番号の生成
   */
  const generateSessionNumber = (roomNumber: string, checkInDate: Date): string => {
    const dateStr = checkInDate.toISOString().slice(0, 10).replace(/-/g, '')
    return `${roomNumber}-${dateStr}-001`
  }

  /**
   * セッション状態の判定
   */
  const isActiveSession = (session: CheckinSession): session is ActiveSession => {
    return session.status === 'ACTIVE' || session.status === 'EXTENDED'
  }

  /**
   * セッション期間の計算
   */
  const calculateSessionDuration = (session: CheckinSession): number => {
    const checkOut = session.checkOutAt || new Date()
    const checkIn = new Date(session.checkInAt)
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * セッション番号からの情報抽出
   */
  const parseSessionNumber = (sessionNumber: string) => {
    const parts = sessionNumber.split('-')
    if (parts.length !== 3) {
      throw new Error('Invalid session number format')
    }
    
    const [roomNumber, dateStr, sequence] = parts
    const year = parseInt(dateStr.slice(0, 4))
    const month = parseInt(dateStr.slice(4, 6))
    const day = parseInt(dateStr.slice(6, 8))
    
    return {
      roomNumber,
      checkInDate: new Date(year, month - 1, day),
      sequence: parseInt(sequence)
    }
  }

  // ===== エラーハンドリング =====

  const handleApiError = (error: any, defaultMessage: string): SessionError => {
    if (error?.data?.code) {
      return {
        code: error.data.code,
        message: error.data.message || defaultMessage,
        details: error.data.details
      }
    }

    if (error?.statusCode === 404) {
      return {
        code: SessionErrorCode.SESSION_NOT_FOUND,
        message: 'セッションが見つかりません',
        details: error
      }
    }

    if (error?.statusCode === 409) {
      return {
        code: SessionErrorCode.ROOM_ALREADY_OCCUPIED,
        message: '部屋は既に使用中です',
        details: error
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      details: error
    }
  }

  // ===== リアクティブ状態管理 =====

  const currentSession = ref<CheckinSession | null>(null)
  const sessionOrders = ref<ServiceOrder[]>([])
  const sessionBilling = ref<SessionBilling | null>(null)
  const loading = ref(false)
  const error = ref<SessionError | null>(null)

  /**
   * セッション情報の読み込み
   */
  const loadSession = async (sessionId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const [session, orders, billing] = await Promise.all([
        getSession(sessionId),
        getSessionOrders(sessionId),
        getSessionBilling(sessionId).catch(() => null) // 請求情報がない場合はnull
      ])
      
      currentSession.value = session
      sessionOrders.value = orders
      sessionBilling.value = billing
    } catch (err) {
      error.value = err as SessionError
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 部屋番号からセッション情報の読み込み
   */
  const loadSessionByRoomNumber = async (roomNumber: string) => {
    loading.value = true
    error.value = null
    
    try {
      const session = await getActiveSessionByRoomNumber(roomNumber)
      if (session) {
        await loadSession(session.id)
      } else {
        currentSession.value = null
        sessionOrders.value = []
        sessionBilling.value = null
      }
    } catch (err) {
      error.value = err as SessionError
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * セッション情報のリフレッシュ
   */
  const refreshSession = async () => {
    if (currentSession.value) {
      await loadSession(currentSession.value.id)
    }
  }

  return {
    // API関数
    createSession,
    getSession,
    getSessionWithDetails,
    getSessionByNumber,
    getActiveSessionByRoom,
    getActiveSessionByRoomNumber,
    updateSession,
    checkoutSession,
    searchSessions,
    getSessionSummaries,
    
    // 注文関連
    createOrder,
    getSessionOrders,
    updateOrder,
    cancelOrder,
    
    // 請求関連
    getSessionBilling,
    refreshSessionBilling,
    
    // ユーティリティ
    generateSessionNumber,
    isActiveSession,
    calculateSessionDuration,
    parseSessionNumber,
    
    // リアクティブ状態
    currentSession: readonly(currentSession),
    sessionOrders: readonly(sessionOrders),
    sessionBilling: readonly(sessionBilling),
    loading: readonly(loading),
    error: readonly(error),
    
    // 状態管理関数
    loadSession,
    loadSessionByRoomNumber,
    refreshSession
  }
}





