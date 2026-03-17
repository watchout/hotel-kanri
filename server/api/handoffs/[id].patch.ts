/**
 * PATCH /api/handoffs/:id
 * ハンドオフ更新
 * Body:
 *   - status?: ステータス更新
 *   - description?: 説明更新
 *   - estimatedDuration?: 推定時間更新
 *   - actualDuration?: 実際の時間
 *   - completedAt?: 完了時刻
 */
export default defineEventHandler(async (event) => {
  try {
    const { id } = event.context.params || {}
    const body = await readBody(event)

    if (!id || typeof id !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid handoff ID',
      })
    }

    const { status, description, estimatedDuration, actualDuration, completedAt } = body

    // TODO: DB update with Prisma
    // const handoff = await prisma.staff_handoffs.update({
    //   where: { id },
    //   data: {
    //     ...(status && { status }),
    //     ...(description !== undefined && { description }),
    //     ...(estimatedDuration !== undefined && { estimated_duration: estimatedDuration }),
    //     ...(actualDuration !== undefined && { actual_duration: actualDuration }),
    //     ...(completedAt !== undefined && { completed_at: completedAt ? new Date(completedAt) : null }),
    //   },
    //   include: {
    //     tasks: true,
    //     acknowledgments: true,
    //   },
    // })

    // Mock response
    return {
      success: true,
      data: {
        id,
        status: status || 'PENDING',
        updatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('PATCH /api/handoffs/:id error:', error)
    throw error
  }
})
