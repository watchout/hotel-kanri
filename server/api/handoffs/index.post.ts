/**
 * POST /api/handoffs
 * ハンドオフ作成
 * Body:
 *   - tenantId: テナントID（必須）
 *   - fromUserId: 引き継ぎ元スタッフID（必須）
 *   - toUserId: 引き継ぎ先スタッフID（必須）
 *   - handoffType: ハンドオフ種別（必須）
 *   - roomId?: 対象客室ID
 *   - description?: 説明
 *   - priority?: 優先度（デフォルト: 3）
 *   - estimatedDuration?: 推定時間（分）
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const {
      tenantId,
      fromUserId,
      toUserId,
      handoffType,
      roomId,
      description,
      priority = 3,
      estimatedDuration,
    } = body

    // バリデーション
    const errors: string[] = []
    if (!tenantId) errors.push('tenantId is required')
    if (!fromUserId) errors.push('fromUserId is required')
    if (!toUserId) errors.push('toUserId is required')
    if (!handoffType) errors.push('handoffType is required')

    if (errors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: errors.join(', '),
      })
    }

    // TODO: DB insert with Prisma
    // const handoffNumber = `HO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    // const handoff = await prisma.staff_handoffs.create({
    //   data: {
    //     id: nanoid(),
    //     tenant_id: tenantId,
    //     handoff_number: handoffNumber,
    //     from_user_id: fromUserId,
    //     to_user_id: toUserId,
    //     room_id: roomId,
    //     handoff_type: handoffType,
    //     status: 'PENDING',
    //     priority,
    //     description,
    //     estimated_duration: estimatedDuration,
    //   },
    //   include: {
    //     tasks: true,
    //     acknowledgments: true,
    //   },
    // })

    // Mock response
    const mockHandoffNumber = `HO-${Date.now()}-001`
    return {
      success: true,
      data: {
        id: 'mock-id',
        handoffNumber: mockHandoffNumber,
        status: 'PENDING',
        fromUserId,
        toUserId,
        handoffType,
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('POST /api/handoffs error:', error)
    throw error
  }
})
