# 開発ガイドライン統合仕様書

**Doc-ID**: SPEC-2025-014
**Version**: 1.0
**Status**: Active
**Owner**: 金子裕司
**Linked-Docs**: SPEC-2025-006, SPEC-2025-013, SPEC-2025-001

---

## 📋 **概要**

hotel-saasプロジェクトの開発ガイドライン統合仕様書です。開発ロードマップ、コーディング規約、品質保証、開発プロセス、技術標準を統合的に定義し、一貫した開発体制を確立します。

## 🎯 **開発目標**

### **基本方針**
- **品質第一**: 本番レベルの実装品質を常に維持
- **一貫性**: 統一されたコーディング規約・アーキテクチャ
- **効率性**: 開発効率と保守性の最適化
- **拡張性**: 将来の機能拡張に対応可能な設計

### **成功指標**
- コード品質スコア: 9.0/10以上
- テストカバレッジ: 90%以上
- バグ発生率: 0.1%以下
- 開発効率: 前年比150%向上

## 🗓️ **開発ロードマップ2025**

### **年間開発計画**
```yaml
2025年開発目標:
  技術目標:
    - マルチテナント基盤完全実装: ✅ 完了
    - hotel-common API統合: 🔄 進行中 (65%完了)
    - 3WAY販売システム稼働: ⏳ 計画中
    - システム稼働率99.9%達成: 🎯 目標

  ビジネス目標:
    - 代理店ネットワーク200社構築: ⏳ 計画中
    - 紹介経由売上比率60%達成: ⏳ 計画中
    - 月間解約率1%以下維持: 🎯 目標
    - 海外展開3カ国開始: ⏳ 計画中
```

### **四半期別開発計画**
```typescript
interface QuarterlyPlan {
  // Q1 (1-3月): 基盤構築フェーズ（進行中）
  q1_foundation: {
    status: 'in_progress'
    completion: '75%'
    key_deliverables: [
      'multitenancy_implementation',
      'api_integration_completion',
      'authentication_system_optimization',
      'database_migration_completion'
    ]
    milestones: {
      january: 'マルチテナント基盤開発完了'
      february: '販売システム基盤構築'
      march: 'PMS連携基盤実装'
    }
  }

  // Q2 (4-6月): 機能拡張フェーズ
  q2_expansion: {
    status: 'planned'
    key_deliverables: [
      'advanced_analytics_implementation',
      'ai_concierge_enhancement',
      'mobile_optimization',
      'performance_optimization'
    ]
    milestones: {
      april: '高度分析機能実装'
      may: 'AIコンシェルジュ強化'
      june: 'モバイル最適化完了'
    }
  }

  // Q3 (7-9月): 統合・最適化フェーズ
  q3_integration: {
    status: 'planned'
    key_deliverables: [
      'pms_integration_completion',
      'third_party_integrations',
      'automation_features',
      'security_enhancement'
    ]
    milestones: {
      july: 'PMS連携3社完了'
      august: '外部システム統合'
      september: '自動化機能実装'
    }
  }

  // Q4 (10-12月): グローバル展開フェーズ
  q4_global: {
    status: 'planned'
    key_deliverables: [
      'internationalization',
      'multi_currency_support',
      'regional_compliance',
      'global_deployment'
    ]
    milestones: {
      october: '国際化対応完了'
      november: '多通貨対応実装'
      december: '海外展開開始'
    }
  }
}
```

## 💻 **技術標準・アーキテクチャ**

### **技術スタック標準**
```yaml
フロントエンド:
  フレームワーク: Nuxt 3.16.2+
  UIライブラリ: Vue 3.5.13+
  言語: TypeScript 5.0+
  スタイリング: Tailwind CSS 3.4+
  状態管理: Pinia (Nuxt標準)

バックエンド:
  ランタイム: Node.js 20+
  フレームワーク: Nitro (Nuxt Server)
  API統合: hotel-common REST API
  認証: JWT (統合認証システム)

データベース:
  開発環境: SQLite (ローカル開発)
  本番環境: PostgreSQL (hotel-common統合DB)
  ORM: Prisma (hotel-common側のみ)

インフラ:
  コンテナ: Docker + Docker Compose
  CI/CD: GitHub Actions
  監視: Prometheus + Grafana
  ログ: Winston + ELK Stack
```

### **アーキテクチャ原則**
```typescript
interface ArchitecturePrinciples {
  // 統合アーキテクチャ原則
  integration_architecture: {
    principle: 'hotel-common中心統合'
    implementation: [
      'hotel-saasは表示層・プロキシ層のみ',
      'ビジネスロジックはhotel-commonに集約',
      'データアクセスはAPI経由のみ',
      '認証・認可はhotel-common統合システム使用'
    ]
  }

  // API設計原則
  api_design: {
    pattern: 'RESTful API + GraphQL (将来)'
    authentication: 'JWT Bearer Token'
    error_handling: '統一エラーレスポンス形式'
    versioning: 'URL Path Versioning (/api/v1/)'
  }

  // フロントエンド設計原則
  frontend_design: {
    pattern: 'Composition API + Composables'
    state_management: 'Pinia Stores'
    routing: 'File-based Routing (Nuxt)'
    styling: 'Utility-first CSS (Tailwind)'
  }

  // セキュリティ原則
  security_principles: {
    authentication: 'JWT統合認証システム'
    authorization: 'Role-based Access Control'
    data_protection: 'TLS 1.3 + データ暗号化'
    input_validation: 'Zod Schema Validation'
  }
}
```

## 📝 **コーディング規約**

### **TypeScript規約**
```typescript
// ✅ 推奨パターン
interface UserProfile {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff' | 'guest'
  createdAt: Date
  updatedAt: Date
}

// 関数定義（明示的な戻り値型）
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const apiClient = useApiClient()
  const response = await apiClient.authenticatedFetch<UserProfile>(
    `/api/v1/users/${userId}`
  )
  return response.data
}

// Composable定義
export function useUserProfile() {
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchProfile = async (userId: string) => {
    loading.value = true
    error.value = null

    try {
      profile.value = await fetchUserProfile(userId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return {
    profile: readonly(profile),
    loading: readonly(loading),
    error: readonly(error),
    fetchProfile
  }
}

// ❌ 禁止パターン
const data: any = await fetch('/api/users') // any型禁止
const mockData = [{ id: 1, name: 'test' }] // モックデータ禁止
await prisma.user.findMany() // 直接Prisma使用禁止
```

### **Vue.js規約**
```vue
<!-- ✅ 推奨パターン -->
<template>
  <div class="user-profile-container">
    <LoadingSpinner v-if="loading" />
    <ErrorMessage v-else-if="error" :message="error" />
    <UserProfileCard v-else-if="profile" :profile="profile" />
    <EmptyState v-else message="プロフィールが見つかりません" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  userId: string
}

const props = defineProps<Props>()

// Composable使用
const { profile, loading, error, fetchProfile } = useUserProfile()

// ライフサイクル
onMounted(async () => {
  await fetchProfile(props.userId)
})

// 監視
watch(() => props.userId, async (newUserId) => {
  if (newUserId) {
    await fetchProfile(newUserId)
  }
})
</script>

<style scoped>
.user-profile-container {
  @apply p-6 bg-white rounded-lg shadow-md;
}
</style>
```

### **API実装規約**
```typescript
// ✅ 推奨パターン（hotel-saas API プロキシ）
export default defineEventHandler(async (event) => {
  // 認証チェック（必須）
  const authUser = await verifyAuth(event)
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // リクエスト検証
  const query = getQuery(event)
  const validatedQuery = await validateQuery(query, querySchema)

  try {
    // hotel-common API呼び出し
    const response = await $fetch(`${HOTEL_COMMON_API_URL}/api/v1/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authUser.token}`,
        'Content-Type': 'application/json'
      },
      query: validatedQuery
    })

    return response
  } catch (error) {
    // エラーハンドリング
    console.error('API Error:', error)
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?.data?.message || 'Internal Server Error'
    })
  }
})

// バリデーションスキーマ
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional()
})
```

## 🧪 **品質保証・テスト戦略**

### **テスト体系**
```yaml
テストピラミッド:
  単体テスト (70%):
    対象:
      - Composables
      - Utility関数
      - API プロキシ関数
      - バリデーション関数

    ツール:
      - Vitest (テストランナー)
      - @vue/test-utils (Vue テスト)
      - MSW (API モック)

    カバレッジ目標: 90%以上

  統合テスト (20%):
    対象:
      - API統合
      - 認証フロー
      - データフロー
      - エラーハンドリング

    ツール:
      - Vitest + Supertest
      - Test Containers
      - Cypress (Component Testing)

    カバレッジ目標: 80%以上

  E2Eテスト (10%):
    対象:
      - ユーザージャーニー
      - クリティカルパス
      - ブラウザ互換性
      - パフォーマンス

    ツール:
      - Playwright
      - Lighthouse CI
      - Percy (Visual Testing)

    実行頻度: 毎回CI/CD
```

### **品質ゲート**
```typescript
interface QualityGates {
  // コード品質
  code_quality: {
    typescript_errors: 0
    eslint_errors: 0
    prettier_compliance: '100%'
    sonarqube_rating: 'A'
    code_duplication: '<3%'
  }

  // テスト品質
  test_quality: {
    unit_test_coverage: '>90%'
    integration_test_coverage: '>80%'
    e2e_test_pass_rate: '100%'
    mutation_testing_score: '>80%'
  }

  // パフォーマンス
  performance: {
    lighthouse_performance: '>90'
    lighthouse_accessibility: '>95'
    lighthouse_best_practices: '>90'
    lighthouse_seo: '>90'
    bundle_size: '<2MB'
  }

  // セキュリティ
  security: {
    snyk_vulnerabilities: 0
    owasp_zap_score: 'A'
    dependency_audit: 'passed'
    security_headers: 'A+'
  }
}
```

## 🔄 **開発プロセス**

### **Git ワークフロー**
```yaml
ブランチ戦略 (Git Flow):
  main:
    - 本番環境デプロイ用
    - 常に安定状態を維持
    - タグ付けでリリース管理

  develop:
    - 開発統合ブランチ
    - 機能ブランチのマージ先
    - ステージング環境デプロイ

  feature/*:
    - 機能開発用ブランチ
    - develop からブランチ作成
    - 完了後 develop にマージ

  hotfix/*:
    - 緊急修正用ブランチ
    - main からブランチ作成
    - main と develop 両方にマージ

コミット規約 (Conventional Commits):
  format: "type(scope): description"

  types:
    - feat: 新機能
    - fix: バグ修正
    - docs: ドキュメント
    - style: コードスタイル
    - refactor: リファクタリング
    - test: テスト
    - chore: その他

  例:
    - feat(auth): JWT認証システム実装
    - fix(api): ユーザー取得APIのエラーハンドリング修正
    - docs(readme): セットアップ手順更新
```

### **コードレビュープロセス**
```yaml
レビュー基準:
  必須チェック項目:
    - [ ] 機能要件を満たしているか
    - [ ] コーディング規約に準拠しているか
    - [ ] テストが適切に書かれているか
    - [ ] セキュリティ上の問題がないか
    - [ ] パフォーマンスに問題がないか
    - [ ] ドキュメントが更新されているか

  レビュー担当:
    - 機能レビュー: テックリード
    - セキュリティレビュー: セキュリティエンジニア
    - パフォーマンスレビュー: インフラエンジニア
    - UI/UXレビュー: デザイナー

  承認条件:
    - 最低2名の承認
    - 全自動テスト通過
    - セキュリティスキャン通過
    - パフォーマンステスト通過
```

### **CI/CD パイプライン**
```yaml
継続的インテグレーション:
  トリガー: Pull Request作成・更新

  ステップ:
    1. 依存関係インストール
    2. 静的解析 (ESLint, TypeScript)
    3. 単体テスト実行
    4. 統合テスト実行
    5. セキュリティスキャン
    6. ビルド検証
    7. E2Eテスト実行
    8. パフォーマンステスト

  品質ゲート:
    - 全テスト通過必須
    - カバレッジ90%以上
    - セキュリティ脆弱性0件
    - パフォーマンス基準クリア

継続的デプロイメント:
  ステージング:
    - develop ブランチマージ時
    - 自動デプロイ
    - スモークテスト実行

  本番:
    - main ブランチマージ時
    - 手動承認後デプロイ
    - Blue-Green デプロイ
    - ロールバック準備
```

## 📚 **開発ツール・環境**

### **開発環境セットアップ**
```yaml
必須ツール:
  エディタ: VS Code (推奨設定あり)
  Node.js: v20.x LTS
  パッケージマネージャー: npm (v10.x)
  Git: v2.40+
  Docker: v24.x
  Docker Compose: v2.20+

VS Code拡張機能:
  必須:
    - Vue Language Features (Volar)
    - TypeScript Vue Plugin (Volar)
    - ESLint
    - Prettier
    - GitLens

  推奨:
    - Auto Rename Tag
    - Bracket Pair Colorizer
    - Path Intellisense
    - REST Client
    - Thunder Client

環境変数テンプレート:
  .env.example:
    NODE_ENV=development
    NUXT_PUBLIC_API_BASE_URL=http://localhost:3100
    HOTEL_COMMON_API_URL=http://localhost:3400
    JWT_SECRET=your-jwt-secret
    DATABASE_URL=file:./prisma/dev.db
```

### **デバッグ・監視ツール**
```yaml
開発時デバッグ:
  Vue Devtools: ブラウザ拡張機能
  Nuxt DevTools: 統合開発ツール
  Network Tab: API通信監視
  Console Logging: 構造化ログ出力

本番監視:
  APM: New Relic / DataDog
  ログ: Winston + ELK Stack
  メトリクス: Prometheus + Grafana
  エラー追跡: Sentry
  アップタイム監視: Pingdom
```

## 📖 **ドキュメント管理**

### **ドキュメント体系**
```yaml
技術ドキュメント:
  API仕様書: OpenAPI 3.0形式
  アーキテクチャ図: Mermaid記法
  データベース設計: ER図 + DDL
  デプロイ手順: Markdown + Scripts

コードドキュメント:
  関数・クラス: JSDoc形式
  型定義: TypeScript型注釈
  README: プロジェクト概要・セットアップ
  CHANGELOG: 変更履歴管理

プロセスドキュメント:
  開発ガイドライン: 本ドキュメント
  コーディング規約: ESLint設定
  レビューガイド: チェックリスト
  デプロイガイド: 手順書
```

### **ナレッジ共有**
```yaml
定期ミーティング:
  デイリースタンドアップ: 進捗・課題共有
  週次レビュー: 成果・改善点討議
  月次振り返り: プロセス改善
  四半期計画: ロードマップ更新

技術共有:
  Tech Talk: 新技術・ベストプラクティス
  Code Review: 知識伝達・品質向上
  ペアプログラミング: スキル向上
  勉強会: 外部知識取り込み
```

## 🚀 **パフォーマンス最適化**

### **フロントエンド最適化**
```yaml
バンドル最適化:
  Code Splitting: ルート別分割
  Tree Shaking: 未使用コード除去
  Dynamic Import: 遅延ローディング
  Asset Optimization: 画像・フォント最適化

レンダリング最適化:
  SSR/SSG: サーバーサイドレンダリング
  Lazy Loading: コンポーネント遅延読み込み
  Virtual Scrolling: 大量データ表示
  Memoization: 計算結果キャッシュ

ネットワーク最適化:
  HTTP/2: 多重化通信
  Compression: Gzip/Brotli圧縮
  CDN: コンテンツ配信最適化
  Caching: ブラウザキャッシュ活用
```

### **バックエンド最適化**
```yaml
API最適化:
  Response Caching: レスポンスキャッシュ
  Database Indexing: インデックス最適化
  Query Optimization: クエリ最適化
  Connection Pooling: 接続プール

スケーラビリティ:
  Horizontal Scaling: 水平スケーリング
  Load Balancing: 負荷分散
  Auto Scaling: 自動スケーリング
  Microservices: マイクロサービス化
```

## 🔒 **セキュリティガイドライン**

### **開発時セキュリティ**
```yaml
コードセキュリティ:
  Input Validation: 入力値検証
  Output Encoding: 出力エンコーディング
  SQL Injection Prevention: パラメータ化クエリ
  XSS Prevention: CSP設定

認証・認可:
  JWT Security: トークン管理
  Session Management: セッション管理
  Password Security: パスワード暗号化
  MFA Implementation: 多要素認証

データ保護:
  Encryption at Rest: 保存時暗号化
  Encryption in Transit: 転送時暗号化
  PII Protection: 個人情報保護
  Data Anonymization: データ匿名化
```

## 📊 **メトリクス・KPI管理**

### **開発メトリクス**
```yaml
品質メトリクス:
  バグ密度: バグ数/KLOC
  テストカバレッジ: カバレッジ率
  コード複雑度: サイクロマティック複雑度
  技術的負債: SonarQube指標

生産性メトリクス:
  開発速度: ストーリーポイント/スプリント
  リードタイム: 要件〜リリース時間
  デプロイ頻度: デプロイ回数/週
  復旧時間: MTTR (Mean Time To Recovery)

ビジネスメトリクス:
  ユーザー満足度: NPS スコア
  システム稼働率: アップタイム率
  パフォーマンス: レスポンス時間
  セキュリティ: インシデント数
```

---

## 📋 **関連ドキュメント**

- **SPEC-2025-006**: システムアーキテクチャ設計仕様書
- **SPEC-2025-013**: 移行・統合戦略仕様書
- **SPEC-2025-001**: プロジェクト管理フレームワーク
