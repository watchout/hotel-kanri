#!/usr/bin/env node
/**
 * Create Linear issues for Generic CRUD rollout (PR2)
 */
const { LinearClient } = require('@linear/sdk')

const LINEAR_API_KEY = process.env.LINEAR_API_KEY
if (!LINEAR_API_KEY) {
  console.error('❌ LINEAR_API_KEY not set')
  process.exit(1)
}

// Reuse IDs from migrate-to-linear.js
const TEAM_ID = 'e7971fae-ad3b-434d-9477-9a22fc1c31a6' // OmotenasuAI
const PROJECT_IDS = {
  'hotel-kanri': 'a8b70852-54f7-4be6-b9bc-f662baa318bc',
  'hotel-saas': '7500f252-c38c-41c1-9cd9-ff441d26e822',
  'hotel-common': '04bd20dc-59df-47f0-8ec4-f7f2d797b604',
}

async function getStateId(client, name) {
  const states = await client.workflowStates({ filter: { team: { id: { eq: TEAM_ID } } } })
  const hit = states.nodes.find(s => s.name === name)
  return hit ? hit.id : undefined
}

async function createIssue(client, { title, description, projectKey, priority = 2, state = 'Backlog' }) {
  const data = {
    teamId: TEAM_ID,
    title,
    description,
    priority, // 1=critical,2=high,3=medium,4=low
    projectId: PROJECT_IDS[projectKey]
  }
  if (state !== 'Backlog') {
    const stateId = await getStateId(client, state)
    if (stateId) data.stateId = stateId
  }
  const res = await client.createIssue(data)
  return res
}

function links() {
  return {
    ssot: 'docs/03_ssot/00_foundation/SSOT_GENERIC_RESOURCES_API.md',
    openapiGeneric: 'docs/03_ssot/openapi/generic-resources.yaml',
    openapiStaff: 'docs/03_ssot/openapi/staff-management.yaml',
  }
}

async function main() {
  const client = new LinearClient({ apiKey: LINEAR_API_KEY })
  const L = links()

  const tasks = [
    {
      title: 'PR2: hotel-common 汎用CRUDルーター + 共通MW 実装',
      projectKey: 'hotel-common',
      priority: 1,
      description: `\n目的: 汎用CRUD (/api/v1/admin/resources/{resource}) 追加\n\n参照:\n- ${L.ssot}\n- ${L.openapiGeneric}\n- ${L.openapiStaff} (CRUD deprecated)\n\n受入基準 (DoD):\n- 認証/権限/tenant/ソフトデリートの共通MWを全generic経路に適用\n- generic-resources.yaml spectralエラー0\n- staff CRUDを /resources/staff で回帰OK (後続PRで切替)\n\n実装: routes/api/v1/admin/resources/{list.get,create.post,id.get,id.put,id.delete}.ts + MW`,
    },
    {
      title: 'PR2: hotel-saas /resources/* プロキシ追加',
      projectKey: 'hotel-saas',
      priority: 2,
      description: `\n目的: saas → commonの汎用CRUDプロキシ追加\n\n参照:\n- ${L.ssot}\n- ${L.openapiGeneric}\n\n実装: server/api/v1/admin/resources/* にNitroルートを追加 ($fetch)`,
    },
    {
      title: 'PR2: callHotelCommonAPI<T> をジェネリクス対応し型適用',
      projectKey: 'hotel-saas',
      priority: 2,
      description: `\n目的: 生成型を呼び出し関数に適用し型安全化\n\n参照: ${L.openapiGeneric}\n\n実装: composables/utilにて <T> を導入、呼び出し側でResponse型を指定`,
    },
    {
      title: 'PR2: Feature flag USE_GENERIC_RESOURCES 導入（10%→50%→100%）',
      projectKey: 'hotel-saas',
      priority: 2,
      description: `\n目的: 段階ロールアウトと即時ロールバックのためのフラグ導入\n\n受入基準:\n- flag offで個別CRUDへ即時戻し可\n- 切替時に監視指標(エラー率/レイテンシ)を確認`,
    },
  ]

  console.log('📝 Creating PR2 issues...')
  for (const t of tasks) {
    const res = await createIssue(client, t)
    console.log(`✅ Created: ${t.title} -> ${res?.issue?.identifier || 'N/A'}`)
  }
}

main().catch(e => {
  console.error('❌ Failed:', e)
  process.exit(1)
})


