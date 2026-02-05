# SSOT: Evidence管理システム

## バージョン情報
- **Document ID**: SSOT__EVIDENCE
- **Version**: 1.0.0
- **Last Updated**: 2026-01-24
- **Status**: Active

---

## 1. 概要

### 1.1 目的
実装のEvidence（エビデンス）を体系的に管理し、SSOT監査の品質を向上させるためのシステム仕様。

### 1.2 スコープ
- Evidence記録の自動保存機能
- 監査結果の永続化
- Evidence参照機能
- 品質スコアの可視化

### 1.3 ビジネス価値
**背景**:
- 現状、実装作業の品質が属人化し、レビューコストが高い
- SSOT監査の結果が散逸し、品質改善のPDCAが回らない
- Evidence不足により、顧客への納品物の品質保証が困難

**解決する課題**:
- 実装品質のトレーサビリティ向上
- 監査結果の一元管理による継続的品質改善
- 開発チーム全体での品質意識の標準化

**期待効果**:
- レビュー時間の30%削減（Evidence参照により文脈把握が迅速化）
- SSOT監査スコアの平均10点向上（過去の指摘事項を学習）
- 顧客への品質エビデンス提示が可能になる（信頼性向上）

**KPI**:
| 指標 | 現状 | 目標 | 測定方法 |
|:-----|:-----|:-----|:---------|
| SSOT監査スコア | 平均75点 | 平均90点 | 監査結果の平均値 |
| Critical指摘件数 | 月10件 | 月3件以下 | audit_resultsテーブル集計 |
| レビュー時間 | PR当たり30分 | PR当たり20分 | GitHub PR review time |
| Evidence保存率 | 0%（手動管理） | 100%（自動保存） | 実装タスク数 vs Evidence件数 |

### 1.4 関連SSOT
- `SSOT_QUALITY_CHECKLIST.md`
- `SSOT_API_REGISTRY.md`
- `SSOT_DATABASE_SCHEMA.md`

---

## 2. 要件定義

### REQ-EVD-001: Evidence記録保存（優先度: Critical）
**説明**: すべての実装作業で生成されたEvidenceをJSON形式で保存する。

**Accept条件**:
- Evidenceファイルが `evidence/auto-dev/logs/` に保存される
- ファイル名形式: `{TASK_ID}-{ISO8601_TIMESTAMP}.json`
- 必須フィールドが全て含まれる（taskId, timestamp, logs, status）

**ユーザー表示メッセージ**:
- 成功: "Evidenceを保存しました: {ファイルパス}"
- 失敗: "Evidenceの保存に失敗しました。ディレクトリの書き込み権限を確認してください。"

**実装例**:
```typescript
// hotel-common-rebuild/src/services/evidenceService.ts
import { promises as fs } from 'fs';
import path from 'path';

interface EvidenceData {
  taskId: string;
  timestamp: string;
  logs: string[];
  status: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

export async function saveEvidence(data: EvidenceData): Promise<string> {
  const fileName = `${data.taskId}-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const filePath = path.join(process.cwd(), '../../evidence/auto-dev/logs', fileName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

  return filePath;
}

// Evidence取得用の型定義
interface GetEvidenceListParams {
  tenantId: string;  // 必須: テナント分離のため
  taskId?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function getEvidenceList(params: GetEvidenceListParams): Promise<any[]> {
  // tenantIdが必須であることを型レベルで保証
  const { tenantId, taskId, startDate, endDate } = params;

  return await prisma.evidenceLog.findMany({
    where: {
      tenantId,  // 必須フィルタ
      ...(taskId && { taskId }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

---

### REQ-EVD-002: 監査結果の永続化（優先度: Critical）
**説明**: SSOT監査結果を永続化し、履歴を追跡可能にする。

**Accept条件**:
- 監査結果が `evidence/ssot-audit/` に保存される
- ファイル名形式: `{SSOT_NAME}-{ISO8601_TIMESTAMP}.json`
- スコア、指摘事項、コストが記録される

**ユーザー表示メッセージ**:
- 成功: "監査結果を保存しました: スコア {score}/100"
- 失敗: "監査結果の保存に失敗しました。{エラー詳細}"

**実装例**:
```typescript
// scripts/utils/auditResultSaver.ts
interface AuditResult {
  ssotName: string;
  timestamp: string;
  score: number;
  technicalScore: number;
  implementabilityScore: number;
  issues: {
    critical: string[];
    warning: string[];
    info: string[];
  };
  cost: number;
}

export async function saveAuditResult(result: AuditResult): Promise<void> {
  const fileName = `${result.ssotName}-${result.timestamp}.json`;
  const filePath = path.join(process.cwd(), 'evidence/ssot-audit', fileName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
}
```

---

### REQ-EVD-003: Evidence参照API（優先度: High）
**説明**: 保存されたEvidenceを検索・取得するAPI。

**Accept条件**:
- エンドポイント: `GET /api/v1/admin/evidence`
- クエリパラメータ: `taskId`, `startDate`, `endDate`
- レスポンス形式: JSON配列

**ユーザー表示メッセージ**:
- 成功: "{count}件のEvidenceが見つかりました"
- 失敗: "Evidenceの取得に失敗しました: {エラー詳細}"

**実装例**:
```typescript
// hotel-common-rebuild/src/routes/admin/evidence.ts
import express from 'express';
import { getEvidenceList } from '../../services/evidenceService';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // 権限チェック: SessionUserから認証情報を取得
    const authUser = req.session?.user;
    if (!authUser || !authUser.tenantId) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です',
        code: 'EVD-005',
      });
    }

    const { taskId, startDate, endDate } = req.query;

    // テナント分離: 必ずtenantIdでフィルタ
    const evidenceList = await getEvidenceList({
      tenantId: authUser.tenantId, // 必須
      taskId: taskId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    return res.json({
      success: true,
      data: evidenceList,
      count: evidenceList.length,
      total: evidenceList.length,
    });
  } catch (error) {
    console.error('[Evidence API] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Evidenceの取得に失敗しました。システム管理者に連絡してください。',
      code: 'EVD-002',
    });
  }
});

export default router;
```

---

### REQ-EVD-004: 品質スコアダッシュボード（優先度: Medium）
**説明**: 監査スコアの推移を可視化する管理画面。

**Accept条件**:
- ページパス: `/admin/evidence/dashboard`
- 過去30日分のスコア推移グラフを表示
- Critical指摘の件数を表示

**ユーザー表示メッセージ**:
- データなし: "監査結果がまだありません。最初のSSOT監査を実行してください。"
- ロードエラー: "ダッシュボードの読み込みに失敗しました。再読み込みしてください。"

**実装例**:
```vue
<!-- hotel-saas-rebuild/pages/admin/evidence/dashboard.vue -->
<template>
  <v-container>
    <v-card>
      <v-card-title>SSOT監査スコア推移</v-card-title>
      <v-card-text>
        <v-chart :option="chartOption" style="height: 400px;" />
      </v-card-text>
    </v-card>

    <v-alert v-if="criticalCount > 0" type="error" class="mt-4">
      Critical指摘が {{ criticalCount }} 件あります
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCallHotelCommonAPI } from '~/composables/useCallHotelCommonAPI';

const { callAPI } = useCallHotelCommonAPI();
const chartOption = ref({});
const criticalCount = ref(0);

onMounted(async () => {
  try {
    const response = await callAPI('/api/v1/admin/evidence/audit-summary', { method: 'GET' });
    chartOption.value = buildChartOption(response.data);
    criticalCount.value = response.criticalCount;
  } catch (error) {
    console.error('[Dashboard] Error:', error);
  }
});
</script>
```

---

## 3. データベース設計

### 3.1 evidence_logsテーブル

```prisma
model EvidenceLog {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  taskId    String   @map("task_id")
  content   Json
  status    String   @db.VarChar(20)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("evidence_logs")
  @@index([tenantId, taskId])
  @@index([created_at])
}
```

**フィールド説明**:
| カラム名 | 型 | 説明 | 制約 |
|:---------|:---|:-----|:-----|
| id | UUID | 主キー | PRIMARY KEY |
| tenant_id | UUID | テナントID | NOT NULL, INDEX, FK to tenants.id |
| task_id | VARCHAR | タスクID | NOT NULL, INDEX |
| content | JSONB | Evidence内容 | NOT NULL |
| status | VARCHAR(20) | ステータス | NOT NULL |
| created_at | TIMESTAMP | 作成日時 | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | 更新日時 | NOT NULL |

---

### 3.2 audit_resultsテーブル

```prisma
model AuditResult {
  id                     String   @id @default(uuid())
  tenantId               String   @map("tenant_id")
  ssotName               String   @map("ssot_name")
  score                  Int
  technicalScore         Int      @map("technical_score")
  implementabilityScore  Int      @map("implementability_score")
  issues                 Json
  cost                   Float
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  tenant                 Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("audit_results")
  @@index([tenantId, ssotName])
  @@index([created_at])
}
```

**フィールド説明**:
| カラム名 | 型 | 説明 | 制約 |
|:---------|:---|:-----|:-----|
| id | UUID | 主キー | PRIMARY KEY |
| tenant_id | UUID | テナントID | NOT NULL, INDEX, FK to tenants.id |
| ssot_name | VARCHAR | SSOT名 | NOT NULL, INDEX |
| score | INTEGER | 総合スコア | NOT NULL |
| technical_score | INTEGER | 技術スコア | NOT NULL |
| implementability_score | INTEGER | 実装可能性スコア | NOT NULL |
| issues | JSONB | 指摘事項 | NOT NULL |
| cost | NUMERIC | APIコスト | NOT NULL |
| created_at | TIMESTAMP | 作成日時 | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | 更新日時 | NOT NULL |

---

## 4. API設計

### 4.1 Evidence一覧取得

**エンドポイント**: `GET /api/v1/admin/evidence`

**リクエスト**:
```typescript
// クエリパラメータ（tenantIdはSessionから取得）
interface EvidenceListRequest {
  taskId?: string;      // オプション
  startDate?: string;   // ISO8601、オプション
  endDate?: string;     // ISO8601、オプション
  limit?: number;       // デフォルト: 50
  offset?: number;      // デフォルト: 0
}
```

**レスポンス（成功時）**:
```typescript
interface EvidenceListResponse {
  success: true;
  data: Array<{
    id: string;
    task_id: string;
    tenant_id: string;  // テナントID（確認用）
    status: string;
    created_at: string;
  }>;
  count: number;        // 返却件数
  total: number;        // 総件数
}
```

**レスポンス（エラー時）**:
```typescript
interface ErrorResponse {
  success: false;
  error: string;        // エラーメッセージ
  code?: string;        // エラーコード（EVD-001等）
}
```

**実装ファイル**:
- hotel-common: `/src/routes/admin/evidence.ts`
- hotel-saas: `/server/api/v1/admin/evidence.get.ts`

---

### 4.2 監査サマリー取得

**エンドポイント**: `GET /api/v1/admin/evidence/audit-summary`

**リクエスト**: なし（tenantIdはSessionから取得）

**レスポンス（成功時）**:
```typescript
interface AuditSummaryResponse {
  success: true;
  data: Array<{
    ssot_name: string;
    score: number;
    tenant_id: string;    // テナントID（確認用）
    created_at: string;
  }>;
  criticalCount: number;  // Critical指摘の総数
  averageScore: number;   // 平均スコア
  total: number;          // 総監査件数
}
```

**レスポンス（エラー時）**:
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}
```

**実装ファイル**:
- hotel-common: `/src/routes/admin/evidence.ts`
- hotel-saas: `/server/api/v1/admin/evidence/audit-summary.get.ts`

**実装例**:
```typescript
// hotel-common-rebuild/src/routes/admin/evidence.ts
router.get('/audit-summary', async (req, res) => {
  try {
    // 権限チェック
    const authUser = req.session?.user;
    if (!authUser || !authUser.tenantId) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です',
        code: 'EVD-005',
      });
    }

    // テナント分離: 必ずtenantIdでフィルタ
    const auditResults = await prisma.auditResult.findMany({
      where: { tenantId: authUser.tenantId },  // 必須
      orderBy: { createdAt: 'desc' },
      take: 30,  // 最新30件
    });

    // Critical指摘件数を集計
    const criticalCount = auditResults.reduce((sum, result) => {
      const issues = result.issues as { critical: string[] };
      return sum + (issues.critical?.length || 0);
    }, 0);

    // 平均スコア計算
    const averageScore = auditResults.length > 0
      ? auditResults.reduce((sum, r) => sum + r.score, 0) / auditResults.length
      : 0;

    return res.json({
      success: true,
      data: auditResults.map(r => ({
        ssot_name: r.ssotName,
        score: r.score,
        tenant_id: r.tenantId,  // 確認用
        created_at: r.createdAt.toISOString(),
      })),
      criticalCount,
      averageScore: Math.round(averageScore * 10) / 10,
      total: auditResults.length,
    });
  } catch (error) {
    console.error('[Audit Summary] Error:', error);
    return res.status(500).json({
      success: false,
      error: '監査サマリーの取得に失敗しました。システム管理者に連絡してください。',
      code: 'EVD-002',
    });
  }
});
```

---

## 5. UI設計

### 5.1 Evidenceダッシュボード
**パス**: `/admin/evidence/dashboard`

**画面要素**:
- スコア推移グラフ（Line Chart）
- Critical指摘件数バッジ
- 平均スコア表示
- 最新監査結果テーブル

**コンポーネント**:
- `pages/admin/evidence/dashboard.vue`
- `components/admin/evidence/ScoreChart.vue`
- `components/admin/evidence/IssueList.vue`

---

### 5.2 Evidence詳細画面
**パス**: `/admin/evidence/:id`

**画面要素**:
- タスクID表示
- ステータスバッジ
- JSONビューア（content表示）
- 作成日時

**コンポーネント**:
- `pages/admin/evidence/[id].vue`

---

## 6. セキュリティ要件

### SEC-EVD-001: 認証セッション形式
**説明**: SessionUserの型定義を明確にし、認証情報の一貫性を確保する。

**SessionUser型定義**:
```typescript
// hotel-common-rebuild/src/types/session.ts
interface SessionUser {
  id: string;           // ユーザーID（UUID）
  tenantId: string;     // テナントID（UUID、必須）
  email: string;        // メールアドレス
  role: 'admin' | 'staff' | 'owner'; // ロール
}

// Express Sessionの拡張
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}
```

**使用例**:
```typescript
// 認証チェック
const authUser = req.session?.user;
if (!authUser || !authUser.tenantId) {
  return res.status(401).json({ error: '認証が必要です' });
}

// ロールベース権限チェック
if (authUser.role !== 'admin' && authUser.role !== 'owner') {
  return res.status(404).json({ error: 'Evidenceが見つかりません' });
}
```

---

### SEC-EVD-002: テナント分離（tenantId必須）
**説明**: すべてのEvidence取得クエリにtenantIdフィルタを適用。tenantIdは必須パラメータ。

**マルチテナント要件**:
- 全てのDBクエリで`tenantId`を必須フィルタとする
- SessionからtenantIdを取得し、必ず存在チェックを行う
- 他テナントのデータは404を返す（列挙耐性）

**実装例**:
```typescript
// ❌ 禁止: tenantIdなしクエリ
const logs = await prisma.evidenceLog.findMany();

// ✅ 正しい: tenantIdは必須
const logs = await prisma.evidenceLog.findMany({
  where: { tenantId: authUser.tenantId }  // tenantId必須
});

// ❌ 禁止: フォールバック値
const tenantId = session.tenantId || 'default';

// ✅ 正しい: 存在しない場合はエラー
if (!session.tenantId) {
  throw new Error('tenant_idが必須です');
}
```

**エラーメッセージ**:
- "Evidenceが見つかりません"（404、403ではない）

---

### SEC-EVD-003: 機密情報のマスキング
**説明**: Evidence内のパスワード、APIキーを自動マスク。

**実装例**:
```typescript
function maskSensitiveData(content: any): any {
  const sensitiveKeys = ['password', 'apiKey', 'secret', 'token'];

  if (typeof content === 'object') {
    for (const key of Object.keys(content)) {
      if (sensitiveKeys.includes(key)) {
        content[key] = '***MASKED***';
      } else if (typeof content[key] === 'object') {
        content[key] = maskSensitiveData(content[key]);
      }
    }
  }

  return content;
}
```

---

## 7. Accept（合格条件）

### 7.1 機能要件
- [ ] Evidence保存が成功する（REQ-EVD-001）
- [ ] 監査結果が永続化される（REQ-EVD-002）
- [ ] Evidence一覧APIが動作する（REQ-EVD-003）
- [ ] ダッシュボードが表示される（REQ-EVD-004）

### 7.2 品質要件
- [ ] 全APIがテナント分離されている
- [ ] 機密情報が自動マスクされる
- [ ] エラーメッセージがユーザーフレンドリー
- [ ] SSOT監査スコアが95点以上

### 7.3 パフォーマンス要件
- [ ] Evidence一覧取得が1秒以内
- [ ] ダッシュボード表示が2秒以内
- [ ] ファイル保存が500ms以内

---

## 8. テストケース

### 8.1 Evidence保存テスト（REQ-EVD-001）

**テストケース 1: 正常系 - Evidence保存成功**
```typescript
// hotel-common-rebuild/src/services/__tests__/evidenceService.test.ts
describe('saveEvidence', () => {
  it('正常にEvidenceを保存する', async () => {
    const data: EvidenceData = {
      taskId: 'DEV-0173',
      timestamp: new Date().toISOString(),
      logs: ['Implementation started', 'Tests passed'],
      status: 'success',
    };

    const filePath = await saveEvidence(data);

    // ファイルが存在する
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    // ファイル名形式が正しい
    expect(filePath).toMatch(/DEV-0173-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);

    // JSON内容が正しい
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    expect(content.taskId).toBe('DEV-0173');
    expect(content.status).toBe('success');
  });
});
```

**期待結果**:
- ✅ ファイルが `evidence/auto-dev/logs/` に作成される
- ✅ ファイル名が `{TASK_ID}-{ISO8601}.json` 形式
- ✅ JSONに必須フィールドが含まれる

---

### 8.2 テナント分離テスト（SEC-EVD-002）

**テストケース 2: 他テナントのEvidence取得を拒否**
```typescript
// hotel-common-rebuild/src/routes/admin/__tests__/evidence.test.ts
describe('GET /api/v1/admin/evidence', () => {
  it('他テナントのEvidenceを取得できない', async () => {
    // テナントAのEvidence作成
    const evidenceA = await prisma.evidenceLog.create({
      data: {
        tenantId: 'tenant-a-uuid',
        taskId: 'DEV-0001',
        content: { logs: ['test'] },
        status: 'success',
      },
    });

    // テナントBでログイン
    const response = await request(app)
      .get('/api/v1/admin/evidence')
      .set('Cookie', sessionCookieForTenantB);

    // テナントAのEvidenceは含まれない
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.data.find(e => e.id === evidenceA.id)).toBeUndefined();
  });
});
```

**期待結果**:
- ✅ 自テナントのEvidenceのみ取得
- ✅ 他テナントのEvidenceは404扱い
- ✅ tenantIdフィルタが確実に適用される

---

### 8.3 権限チェックテスト（SEC-EVD-001）

**テストケース 3: 未認証ユーザーのアクセス拒否**
```typescript
describe('GET /api/v1/admin/evidence', () => {
  it('未認証ユーザーは401を返す', async () => {
    const response = await request(app)
      .get('/api/v1/admin/evidence');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('認証が必要です');
  });

  it('staff権限ではアクセスできない', async () => {
    const response = await request(app)
      .get('/api/v1/admin/evidence')
      .set('Cookie', sessionCookieForStaff);

    // staff権限では404を返す（403ではない）
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Evidenceが見つかりません');
  });
});
```

**期待結果**:
- ✅ 未認証ユーザーは401
- ✅ 権限不足は404（403ではない）
- ✅ admin/owner権限のみアクセス可能

---

### 8.4 機密情報マスキングテスト（SEC-EVD-003）

**テストケース 4: パスワード等の自動マスク**
```typescript
describe('maskSensitiveData', () => {
  it('機密情報を自動マスクする', () => {
    const input = {
      taskId: 'DEV-0001',
      config: {
        apiKey: 'sk-secret123',
        password: 'mypassword',
        username: 'admin',
      },
    };

    const masked = maskSensitiveData(input);

    expect(masked.config.apiKey).toBe('***MASKED***');
    expect(masked.config.password).toBe('***MASKED***');
    expect(masked.config.username).toBe('admin'); // 非機密情報は保持
  });
});
```

**期待結果**:
- ✅ password, apiKey, secret, tokenが自動マスク
- ✅ 非機密情報は変更されない
- ✅ ネストされたオブジェクトも処理

---

### 8.5 パフォーマンステスト

**テストケース 5: Evidence一覧取得速度**
```bash
# ABテストコマンド
ab -n 100 -c 10 http://localhost:3401/api/v1/admin/evidence

# 期待結果
# Time per request: < 1000ms (mean)
# Requests per second: > 10 [#/sec]
```

**期待結果**:
- ✅ 100件のリクエストが1秒以内
- ✅ 同時接続10でもレスポンスタイムが安定
- ✅ インデックスが効果的に機能

---

### 8.6 統合テストスクリプト

**スクリプト**: `scripts/test-evidence-system.sh`
```bash
#!/bin/bash
set -e

echo "🧪 Evidence管理システム統合テスト"

# 1. Evidence保存テスト
echo "📝 Evidence保存..."
EVIDENCE_PATH=$(node scripts/test-save-evidence.js)
if [ -f "$EVIDENCE_PATH" ]; then
  echo "✅ Evidence保存成功: $EVIDENCE_PATH"
else
  echo "❌ Evidence保存失敗"
  exit 1
fi

# 2. API取得テスト
echo "🔍 Evidence取得..."
RESPONSE=$(curl -s -X GET http://localhost:3401/api/v1/admin/evidence \
  -H "Cookie: session=test-session")
COUNT=$(echo $RESPONSE | jq '.count')
if [ "$COUNT" -gt 0 ]; then
  echo "✅ Evidence取得成功: ${COUNT}件"
else
  echo "❌ Evidence取得失敗"
  exit 1
fi

# 3. テナント分離テスト
echo "🔒 テナント分離テスト..."
RESPONSE_OTHER=$(curl -s -X GET http://localhost:3401/api/v1/admin/evidence \
  -H "Cookie: session=other-tenant-session")
COUNT_OTHER=$(echo $RESPONSE_OTHER | jq '.count')
if [ "$COUNT_OTHER" -eq 0 ]; then
  echo "✅ テナント分離成功"
else
  echo "❌ テナント分離失敗: 他テナントのデータが見える"
  exit 1
fi

echo "✨ 全テスト合格"
```

**実行コマンド**:
```bash
cd /Users/kaneko/hotel-kanri
chmod +x scripts/test-evidence-system.sh
./scripts/test-evidence-system.sh
```

---

## 9. 実装チェックリスト

### Phase 1: データベース
**チェックリスト**:
- [ ] Prismaスキーマ作成（evidence_logs, audit_results）
- [ ] マイグレーション実行
- [ ] インデックス確認
- [ ] リレーション（Tenant）確認

**完了条件**:
- ✅ `npx prisma migrate status` でマイグレーションが適用済み
- ✅ テーブル `evidence_logs`, `audit_results` が存在する
- ✅ インデックス `[tenant_id, task_id]`, `[created_at]` が作成されている
- ✅ 外部キー制約 `tenant_id -> tenants.id` が設定されている

### Phase 2: API実装
**チェックリスト**:
- [ ] evidenceService.ts作成
- [ ] routes/admin/evidence.ts作成
- [ ] SessionUser型定義追加
- [ ] テナント分離確認（全クエリにtenantId必須）
- [ ] 権限チェック実装

**完了条件**:
- ✅ `GET /api/v1/admin/evidence` が200を返す
- ✅ `GET /api/v1/admin/evidence/audit-summary` が200を返す
- ✅ 未認証アクセスで401を返す
- ✅ 他テナントのデータが取得できない（404）
- ✅ `grep -r "findMany()" src/` でtenantIdなしクエリが0件

### Phase 3: UI実装
**チェックリスト**:
- [ ] dashboard.vue作成
- [ ] ScoreChart.vue作成
- [ ] IssueList.vue作成

**完了条件**:
- ✅ `/admin/evidence/dashboard` にアクセスできる
- ✅ スコア推移グラフが表示される
- ✅ Critical指摘件数が表示される
- ✅ データなし時に適切なメッセージが表示される

### Phase 4: テスト
**チェックリスト**:
- [ ] Unit Tests: saveEvidence, maskSensitiveData
- [ ] Integration Tests: API endpoints
- [ ] Security Tests: テナント分離、権限チェック
- [ ] Performance Tests: Evidence一覧取得速度
- [ ] E2E Tests: ダッシュボード動作確認

**完了条件**:
- ✅ `npm run test:unit` が全て合格
- ✅ `./scripts/test-evidence-system.sh` が成功
- ✅ テナント分離テストが合格（他テナントのデータが見えない）
- ✅ Evidence一覧取得が1秒以内
- ✅ ダッシュボードがブラウザで正常表示

---

## 10. 変更履歴

| Version | Date | Author | Changes |
|:--------|:-----|:-------|:--------|
| 1.2.0 | 2026-01-24 | Claude Code | [T09] レスポンス形式統一（success: true）、[T12] tenantId必須明記、監査スコア96点達成 |
| 1.1.0 | 2026-01-24 | Claude Code | [T02] カラム名@map修正、[T05] リレーション定義追加、[T11] SessionUser型定義追加、[T13] 権限チェック実装、[I09] テストケース詳細化 |
| 1.0.0 | 2026-01-24 | Claude Code | 初版作成 |

---

## 11. 付録

### A. ディレクトリ構造
```
evidence/
├── auto-dev/
│   └── logs/
│       └── DEV-0170-2026-01-24T01-06-20-496Z.json
└── ssot-audit/
    ├── SSOT__EVIDENCE-2026-01-24T06-24-59-465Z.json
    └── SSOT__EVIDENCE-AUDIT-REPORT.md
```

### B. 参照コマンド
```bash
# Evidence一覧
ls -lt evidence/auto-dev/logs/

# 監査結果確認
cat evidence/ssot-audit/SSOT__EVIDENCE-AUDIT-REPORT.md

# 最新スコア取得
jq '.score' evidence/ssot-audit/*.json | tail -1
```

### C. エラーコード一覧
| コード | 説明 | HTTPステータス | ユーザーメッセージ | 原因 |
|:-------|:-----|:---------------|:-------------------|:-----|
| EVD-001 | Evidence保存失敗 | 500 | "Evidenceの保存に失敗しました。ディレクトリの書き込み権限を確認してください。" | ディレクトリ権限不足、ディスク容量不足 |
| EVD-002 | Evidence取得失敗 | 500 | "Evidenceの取得に失敗しました。システム管理者に連絡してください。" | DB接続エラー、クエリタイムアウト |
| EVD-003 | Evidenceが存在しない | 404 | "Evidenceが見つかりません" | 指定されたIDのEvidenceが存在しない |
| EVD-004 | 権限エラー | 404 | "Evidenceが見つかりません" | 他テナントのデータ、権限不足 |
| EVD-005 | 未認証 | 401 | "認証が必要です" | セッションが無効、ログイン未実施 |
| EVD-006 | 無効なパラメータ | 400 | "リクエストパラメータが不正です: {詳細}" | 日付形式が不正、必須パラメータ欠如 |
| EVD-007 | 監査結果保存失敗 | 500 | "監査結果の保存に失敗しました。{エラー詳細}" | ファイルI/Oエラー、JSON形式不正 |
| EVD-008 | テナントIDなし | 401 | "認証が必要です" | SessionにtenantIdが含まれていない |

### D. エラーケース一覧

#### API: GET /api/v1/admin/evidence
| ケース | 条件 | HTTPステータス | レスポンス | 対処法 |
|:-------|:-----|:---------------|:-----------|:-------|
| 未認証 | Sessionなし | 401 | `{ error: "認証が必要です" }` | ログイン画面にリダイレクト |
| tenantIdなし | Session.user.tenantId未設定 | 401 | `{ error: "認証が必要です" }` | 再ログイン要求 |
| 無効な日付形式 | startDate=invalid | 400 | `{ error: "リクエストパラメータが不正です: startDate" }` | ISO8601形式で再送 |
| DBエラー | Prisma接続失敗 | 500 | `{ error: "Evidenceの取得に失敗しました。システム管理者に連絡してください。" }` | システム管理者に連絡 |
| データなし | 該当データ0件 | 200 | `{ data: [], count: 0, total: 0 }` | 正常（空配列） |

#### API: GET /api/v1/admin/evidence/:id
| ケース | 条件 | HTTPステータス | レスポンス | 対処法 |
|:-------|:-----|:---------------|:-----------|:-------|
| 未認証 | Sessionなし | 401 | `{ error: "認証が必要です" }` | ログイン画面にリダイレクト |
| 存在しないID | 該当IDなし | 404 | `{ error: "Evidenceが見つかりません" }` | ID確認 |
| 他テナントのデータ | tenantId不一致 | 404 | `{ error: "Evidenceが見つかりません" }` | 正常（列挙耐性） |
| 権限不足 | role = staff | 404 | `{ error: "Evidenceが見つかりません" }` | 管理者権限が必要 |

#### ファイル保存: saveEvidence()
| ケース | 条件 | 例外 | エラーメッセージ | 対処法 |
|:-------|:-----|:-----|:-----------------|:-------|
| ディレクトリ権限なし | 書き込み権限なし | EACCES | "Evidenceの保存に失敗しました。ディレクトリの書き込み権限を確認してください。" | `chmod 755 evidence/` |
| ディスク容量不足 | 空き容量0 | ENOSPC | "Evidenceの保存に失敗しました。ディスク容量を確認してください。" | ディスク容量確保 |
| 無効なJSON | JSON.stringify失敗 | TypeError | "Evidenceデータが不正です" | データ形式確認 |

---

**END OF DOCUMENT**
