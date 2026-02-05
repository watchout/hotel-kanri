#!/usr/bin/env node
/**
 * SSOT Validator - 必須要素の機械チェック（落とす条件ベース）
 * 
 * Usage:
 *   node ssot-validator.cjs <ssot-file.md>
 *   node ssot-validator.cjs --all  # 全SSOTをチェック
 * 
 * Exit codes:
 *   0: PASS（全チェック通過）
 *   1: FAIL（必須要素欠落）
 *   2: WARN（警告のみ）
 */

const fs = require('fs')
const path = require('path')

// ============================================================
// 必須チェック項目（落とす条件）
// ============================================================

const REQUIRED_YAML_FIELDS = [
  'doc_id',
  'title',
  'version',
  'status',
  'owner',
  'updated_at'
]

// 既存形式（Markdownヘッダー）との互換性を保つための代替パターン
const LEGACY_HEADER_PATTERNS = {
  doc_id: /\*\*Doc-ID\*\*:\s*(\S+)/i,
  title: /^#\s+.*SSOT:\s*(.+)$/m,
  version: /\*\*バージョン\*\*:\s*(\S+)/i,
  status: /\*\*ステータス\*\*:\s*(.+)/i,
  owner: /\*\*所有者\*\*:\s*(.+)/i,
  updated_at: /\*\*最終更新\*\*:\s*(\S+)/i
}

const REQUIRED_SECTIONS = [
  { pattern: /^##[#]?.*概要|^##[#]?.*Overview|^##[#]?.*重要事項|^##[#]?.*目的/m, name: 'Overview（概要）' },
  { pattern: /^##[#]?.*必須要件|^##[#]?.*CRITICAL|^##[#]?.*機能要件|^##[#]?.*要件|^##[#]?.*必須ルール/m, name: 'Requirements（要件）' },
  { pattern: /^##[#]?.*合格条件|^##[#]?.*Acceptance|Accept:/m, name: 'Acceptance Criteria', optional: true },
  { pattern: /^##[#]?.*データベース|^##[#]?.*Data Model|^###.*テーブル|```prisma|```sql/m, name: 'Data Model（DB）', optional: true },
  { pattern: /^##[#]?.*API|^###.*エンドポイント/m, name: 'API Contract', optional: true },
  { pattern: /^##[#]?.*セキュリティ|^##[#]?.*Security|認証.*\|/m, name: 'Security', optional: true }
]

const MARKETING_INJECTION_SECTIONS = [
  { pattern: /^##[#]?.*Config|^###.*設定一覧|^##[#]?.*設定/m, name: 'Configuration（Config First）' },
  { pattern: /^##[#]?.*Tracking|^##[#]?.*Analytics|^###.*イベント一覧/m, name: 'Analytics & Tracking' }
]

// ============================================================
// YAML Front Matter パーサー
// ============================================================

function parseYamlFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  
  const yaml = {}
  const lines = match[1].split('\n')
  let currentKey = null
  let inArray = false
  
  for (const line of lines) {
    // キー: 値 の形式
    const kvMatch = line.match(/^(\w+):\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const value = kvMatch[2].trim()
      
      if (value === '' || value === '[]') {
        yaml[currentKey] = []
        inArray = true
      } else if (value.startsWith('[') && value.endsWith(']')) {
        yaml[currentKey] = value.slice(1, -1).split(',').map(s => s.trim())
        inArray = false
      } else {
        yaml[currentKey] = value
        inArray = false
      }
    } else if (inArray && line.match(/^\s+-\s+(.+)$/)) {
      // 配列要素
      const arrayValue = line.match(/^\s+-\s+(.+)$/)[1]
      if (!Array.isArray(yaml[currentKey])) yaml[currentKey] = []
      yaml[currentKey].push(arrayValue)
    }
  }
  
  return yaml
}

// ============================================================
// バリデーション
// ============================================================

function validateSsot(filePath) {
  const results = {
    file: filePath,
    errors: [],    // 落とす条件
    warnings: [],  // 警告
    passed: true
  }
  
  // ファイル読み込み
  let content
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch (err) {
    results.errors.push(`ファイルが読めません: ${err.message}`)
    results.passed = false
    return results
  }
  
  // 1. YAML Front Matter チェック（または旧形式ヘッダー）
  let yaml = parseYamlFrontMatter(content)
  let isLegacyFormat = false
  
  if (!yaml) {
    // 旧形式（Markdownヘッダー）からの抽出を試行
    yaml = {}
    isLegacyFormat = true
    
    for (const [field, pattern] of Object.entries(LEGACY_HEADER_PATTERNS)) {
      const match = content.match(pattern)
      if (match) {
        yaml[field] = match[1].trim()
      }
    }
    
    // 旧形式でも必須フィールドが見つかればOK
    const foundFields = Object.keys(yaml).filter(k => yaml[k])
    if (foundFields.length < 3) {
      results.warnings.push('YAML Front Matter が見つかりません（v2形式への移行を推奨）')
    }
  }
  
  // 必須フィールドチェック
  const missingFields = []
  for (const field of REQUIRED_YAML_FIELDS) {
    if (!yaml[field] || yaml[field] === '') {
      missingFields.push(field)
    }
  }
  
  if (missingFields.length > 0) {
    if (isLegacyFormat && missingFields.length <= 3) {
      // 旧形式で一部欠落は警告のみ
      results.warnings.push(`メタ情報: フィールド "${missingFields.join(', ')}" が欠落しています（v2形式への移行を推奨）`)
    } else if (!isLegacyFormat) {
      // v2形式で欠落はエラー
      for (const field of missingFields) {
        results.errors.push(`YAML: 必須フィールド "${field}" が欠落しています`)
        results.passed = false
      }
    }
  }
  
  // doc_id形式チェック（あれば）
  if (yaml.doc_id) {
    // 許容パターン:
    // - SSOT-CATEGORY-NAME-001
    // - SSOT-SAAS-AUTH-ADMIN-001
    // - SSOT_DEV-0XXX_NAME
    // - SSOT-FOUNDATION-XXX-001
    const validPatterns = [
      /^SSOT-[A-Z]+-[A-Z0-9]+-\d+$/i,           // SSOT-CATEGORY-NAME-001
      /^SSOT-[A-Z]+-[A-Z]+-[A-Z]+-\d+$/i,       // SSOT-SAAS-AUTH-ADMIN-001
      /^SSOT_DEV-\d+_.+$/i                       // SSOT_DEV-0XXX_NAME
    ]
    const isValid = validPatterns.some(p => p.test(yaml.doc_id))
    if (!isValid) {
      results.warnings.push(`doc_id の形式が推奨パターンと異なります: ${yaml.doc_id}`)
    }
  }
  
  // status値チェック（あれば）
  const validStatuses = ['draft', 'review', 'approved', 'implemented', 'deprecated', '🟡 作成中', '🟢 完了', '❌ 未実装']
  if (yaml.status && !validStatuses.some(s => yaml.status.includes(s))) {
    results.warnings.push(`status "${yaml.status}" は標準形式ではありません`)
  }
  
  // tickets:フィールドチェック（タスク紐付け必須）
  const hasTickets = yaml.tickets && Array.isArray(yaml.tickets) && yaml.tickets.length > 0
  if (!hasTickets) {
    // 旧形式でも警告（v2形式なら強い警告）
    if (isLegacyFormat) {
      results.warnings.push('tickets: が未設定です。関連タスクIDを追加してください（SSOT_CREATION_RULES.md Phase 0-A参照）')
    } else {
      // v2形式ではより強い警告
      results.warnings.push('tickets: が空です。開発タスクとの紐付けが必要です（運用必須）')
    }
  } else {
    // tickets:のフォーマット検証（DEV-XXXX形式）
    const invalidTickets = yaml.tickets.filter(t => !/^DEV-\d{4}$/.test(t))
    if (invalidTickets.length > 0) {
      results.warnings.push(`tickets: に無効な形式があります: ${invalidTickets.join(', ')}（DEV-XXXX形式推奨）`)
    }
  }
  
  // updated_at古すぎチェック（90日超）
  if (yaml.status && yaml.status.includes('approved') && yaml.updated_at) {
    try {
      const updatedDate = new Date(yaml.updated_at)
      if (!isNaN(updatedDate.getTime())) {
        const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceUpdate > 90) {
          results.warnings.push(`approved状態ですが更新が ${Math.floor(daysSinceUpdate)}日前です（要レビュー）`)
        }
      }
    } catch (e) {
      // 日付パースエラーは無視
    }
  }
  
  // Marketing Injection必須チェック（v2形式のみ）
  if (!isLegacyFormat) {
    if (yaml.requires_config === true || yaml.requires_config === 'true') {
      const hasConfig = MARKETING_INJECTION_SECTIONS[0].pattern.test(content)
      if (!hasConfig) {
        results.errors.push('requires_config: true ですが Configuration セクションがありません')
        results.passed = false
      }
    }
    
    if (yaml.requires_tracking === true || yaml.requires_tracking === 'true') {
      const hasTracking = MARKETING_INJECTION_SECTIONS[1].pattern.test(content)
      if (!hasTracking) {
        results.errors.push('requires_tracking: true ですが Analytics & Tracking セクションがありません')
        results.passed = false
      }
    }
  }
  
  // 2. 必須セクションチェック
  for (const section of REQUIRED_SECTIONS) {
    if (!section.pattern.test(content)) {
      if (section.optional) {
        // v2で推奨だが旧形式では任意
        if (!isLegacyFormat) {
          results.warnings.push(`推奨セクション "${section.name}" が見つかりません`)
        }
      } else {
        results.errors.push(`必須セクション "${section.name}" が見つかりません`)
        results.passed = false
      }
    }
  }
  
  // 3. CRITICAL Requirements が空でないかチェック
  const criticalMatch = content.match(/^##[#]?.*(?:必須要件|CRITICAL).*\n([\s\S]*?)(?=\n##[^#]|\n---|\Z)/m)
  if (criticalMatch) {
    const criticalContent = criticalMatch[1].trim()
    if (criticalContent.length < 50) {
      results.errors.push('CRITICAL Requirements セクションが空または不十分です')
      results.passed = false
    }
  }
  
  // 4. Acceptance Criteria が空でないかチェック（v2のみ必須）
  const acMatch = content.match(/^##[#]?.*(?:合格条件|Acceptance).*\n([\s\S]*?)(?=\n##[^#]|\n---|\Z)/m)
  if (acMatch) {
    const acContent = acMatch[1].trim()
    if (acContent.length < 50) {
      if (!isLegacyFormat) {
        results.warnings.push('Acceptance Criteria セクションが空または不十分です')
      }
    }
  } else if (!isLegacyFormat) {
    // v2形式ではAcceptance Criteriaは推奨
    results.warnings.push('Acceptance Criteria セクションの追加を推奨します')
  }
  
  // 5. Prisma スキーマ形式チェック
  const prismaMatches = content.matchAll(/```prisma\n([\s\S]*?)```/g)
  let hasPrisma = false
  let hasTenantId = false
  let hasMap = false
  
  for (const match of prismaMatches) {
    hasPrisma = true
    const prismaContent = match[1]
    
    // tenant_id チェック（関連テーブルやDeviceRoomなどはtenantId不要の場合もある）
    if (prismaContent.includes('tenantId') || prismaContent.includes('tenant_id')) {
      hasTenantId = true
    }
    
    // @@map チェック
    if (prismaContent.includes('@@map(')) {
      hasMap = true
    }
  }
  
  if (hasPrisma) {
    // 新規テーブル定義でtenantIdがない場合のみ警告
    // 既存テーブルの拡張（// ... 既存フィールド 等を含む）は警告しない
    if (!hasTenantId && !content.includes('既存フィールド') && !content.includes('テーブル拡張')) {
      results.warnings.push('Prisma: tenant_id フィールドが見つかりません（新規テーブルの場合は必須）')
    }
    
    if (!hasMap) {
      results.warnings.push('Prisma: @@map("table_name") が見つかりません（snake_case命名必須）')
    }
  }
  
  // 6. Marketing Injection セクションチェック（v2推奨）
  const hasConfig = /Config|設定|tenant_settings/i.test(content)
  const hasTracking = /Tracking|Analytics|analytics[-_]id/i.test(content)
  
  if (!hasConfig && !isLegacyFormat) {
    results.warnings.push('Config First: 設定セクションの追加を推奨します')
  }
  if (!hasTracking && !isLegacyFormat) {
    results.warnings.push('Tracking by Default: Analyticsセクションの追加を推奨します')
  }
  
  return results
}

// ============================================================
// メイン実行
// ============================================================

function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: node ssot-validator.cjs <ssot-file.md>')
    console.log('       node ssot-validator.cjs --all')
    process.exit(1)
  }
  
  let files = []
  
  if (args[0] === '--all') {
    // 全SSOTファイルを検索
    const ssotDir = path.join(__dirname, '../../docs/03_ssot')
    const findFiles = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          findFiles(fullPath)
        } else if (entry.name.startsWith('SSOT_') && entry.name.endsWith('.md')) {
          files.push(fullPath)
        }
      }
    }
    findFiles(ssotDir)
  } else {
    files = [args[0]]
  }
  
  let hasErrors = false
  let hasWarnings = false
  
  console.log('='.repeat(60))
  console.log('SSOT Validator - 必須要素チェック')
  console.log('='.repeat(60))
  console.log('')
  
  for (const file of files) {
    const results = validateSsot(file)
    
    const relativePath = path.relative(process.cwd(), file)
    
    if (results.passed && results.warnings.length === 0) {
      console.log(`✅ PASS: ${relativePath}`)
    } else if (results.passed && results.warnings.length > 0) {
      console.log(`⚠️  WARN: ${relativePath}`)
      for (const warn of results.warnings) {
        console.log(`   - ${warn}`)
      }
      hasWarnings = true
    } else {
      console.log(`❌ FAIL: ${relativePath}`)
      for (const err of results.errors) {
        console.log(`   🔴 ${err}`)
      }
      for (const warn of results.warnings) {
        console.log(`   🟡 ${warn}`)
      }
      hasErrors = true
    }
    console.log('')
  }
  
  console.log('='.repeat(60))
  console.log(`チェック完了: ${files.length}ファイル`)
  console.log('='.repeat(60))
  
  if (hasErrors) {
    console.log('❌ 必須要素の欠落があります。修正してください。')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  警告があります。確認を推奨します。')
    process.exit(2)
  } else {
    console.log('✅ 全チェック通過')
    process.exit(0)
  }
}

main()
