# 📖 Cursor AI プロンプト・ガードレール一覧

**最終更新**: 2025年10月22日  
**バージョン**: 2.2.0  
**管理者**: hotel-kanri統合管理

---

## 🏷️ タグ体系（v2.2.0新規）

**hotel-kanriプロジェクト専用のタグ体系を採用しました。**

Cursor標準のコマンド（`/edit`, `/new`, `@filename`）との衝突を避けるため、**`>>`記号**を使用します。

### 利用可能なタグ

| タグ | 用途 | 例 |
|------|------|-----|
| `>> write` | SSOT新規作成 | `>> write SSOT_SAAS_STAFF_MANAGEMENT` |
| `>> impl` | SSOT実装 | `>> impl SSOT_SAAS_PERMISSION_SYSTEM` |
| `>> fix` | バグ修正 | `>> fix SSOT_SAAS_ORDER_MANAGEMENT バグ内容` |
| `>> rfv` | SSOT実装検証 | `>> rfv SSOT_SAAS_MENU_MANAGEMENT` |
| `>> next` | 次タスク選択 | `>> next` |

### 使用例

```
>> write SSOT_SAAS_STAFF_MANAGEMENT
>> impl SSOT_SAAS_PERMISSION_SYSTEM
>> fix SSOT_SAAS_ORDER_MANAGEMENT 削除エラー
>> rfv SSOT_SAAS_MENU_MANAGEMENT
>> next
```

**注意**: タグなしの通常の会話も可能です。タグは明確な指示が必要な時のみ使用してください。

---

## 🎯 このディレクトリの目的

このディレクトリには、hotel-kanriプロジェクトで使用する**AI向けの指示書・ガードレール**が格納されています。

これらのドキュメントは、AIが以下を実現するために設計されています：

1. **SSOT準拠の徹底** - ドキュメント通りの実装
2. **エラー時の自動停止** - 推測で実装を続けない
3. **システム境界の厳守** - アーキテクチャ違反の防止
4. **本番同等性の確保** - 開発・本番で同じ実装

---

## 📚 ドキュメント一覧

### 🚨 エラー発生時（最優先）

| ファイル名 | 目的 | 参照タイミング |
|-----------|------|-------------|
| **error_detection_protocol.md** | エラー検知時の自動停止プロトコル | エラー発生時（最優先） |
| **system_boundary_violations.md** | システム境界違反パターン集 | 実装方針検討時 |
| **ssot_implementation_guard.md** | SSOT実装時の総合ガードレール | SSOT実装全般 |

**推奨フロー**:
```
エラー発生
  ↓
error_detection_protocol.md（自動停止）
  ↓
system_boundary_violations.md（パターン確認）
  ↓
ssot_implementation_guard.md（実装継続）
```

---

### 📝 SSOT作成・実装

| ファイル名 | 目的 | 参照タイミング |
|-----------|------|-------------|
| **write_new_ssot.md** | SSOT作成ルール | SSOT作成時 |
| **retest_new_ssot.md** | SSOT再テストルール | SSOT更新時 |
| **ssot_creation_instructions_phase1_v2.md** | SSOT作成（Phase 1） | Phase 1実装時 |
| **ssot_creation_instructions_phase2_v2.md** | SSOT作成（Phase 2） | Phase 2実装時 |
| **ssot_creation_quick_start.md** | SSOT作成クイックスタート | SSOT作成開始時 |
| **ssot_implementation_enforcement.md** | SSOT実装強制ルール | SSOT実装時 |
| **ssot_multilingual_integration_workflow.md** | 多言語統合ワークフロー | 多言語実装時 |

---

### 📊 進捗・実装状況管理

| ファイル名 | 目的 | 参照タイミング |
|-----------|------|-------------|
| **progress_management_guardrails.md** | 進捗管理ガードレール | 進捗更新時 |
| **implementation_status_guardrails.md** | 実装状況管理ガードレール | 実装完了判定時 |

**重要**: 進捗管理は `SSOT_PROGRESS_MASTER.md` のみで行う

---

### 🛠️ 技術標準

| ファイル名 | 目的 | 参照タイミング |
|-----------|------|-------------|
| **database_naming_standard_reference.md** | データベース命名規則 | DB設計時 |
| **api_routing_standard_reference.md** | APIルーティング標準 | API実装時 |

---

### 📦 アーカイブ

| ディレクトリ | 内容 |
|-----------|------|
| **_archived/** | 旧バージョンのプロンプトファイル |

---

## 🔄 使用フロー

### 1. SSOT作成時

```
Phase 1: データベース設計
  ↓
write_new_ssot.md 確認
  ↓
ssot_creation_instructions_phase1_v2.md 実行
  ↓
progress_management_guardrails.md 更新

Phase 2: API・フロントエンド実装
  ↓
ssot_creation_instructions_phase2_v2.md 実行
  ↓
implementation_status_guardrails.md 更新
```

### 2. SSOT実装時

```
実装開始
  ↓
ssot_implementation_guard.md 確認
  ↓
実装中...
  ↓
【エラー発生】
  ↓
error_detection_protocol.md（自動停止）
  ↓
system_boundary_violations.md（パターン確認）
  ↓
SSOT再確認
  ↓
ユーザーに報告
  ↓
承認後実装再開
```

### 3. エラー発生時

```
エラー検知
  ↓
【Step 1】実装即座停止 🛑
  ↓
【Step 2】error_detection_protocol.md 確認
  ↓
【Step 3】該当SSOT特定
  ↓
【Step 4】SSOT再読み込み 📖
  ↓
【Step 5】system_boundary_violations.md 確認
  ↓
【Step 6】ユーザー報告 📢
  ↓
【Step 7】承認待ち ⏸️
  ↓
【Step 8】承認後実装再開 ✅
```

---

## 🚨 緊急時の対応

### エラーが発生した場合

**最優先**: `error_detection_protocol.md`

以下のキーワードを含むエラーは即座に実装停止：

```
- "Error"、"エラー"、"失敗"
- "Connection refused"、"接続できない"
- "undefined"、"null"
- "Prisma"、"Database"
- "Authentication failed"、"認証失敗"
- "tenant_id"、"テナントID"
```

### システム境界違反の疑いがある場合

**最優先**: `system_boundary_violations.md`

以下のパターンを実装しようとしていないか確認：

```typescript
// ❌ Pattern 1: hotel-saasでのPrisma直接使用
import { PrismaClient } from '@prisma/client';

// ❌ Pattern 2: フォールバック値の使用
const tenantId = session.tenantId || 'default';

// ❌ Pattern 3: 環境分岐実装
if (process.env.NODE_ENV === 'development') { ... }
```

---

## 📖 ドキュメント関連図

```
.cursorrules（最優先ルール）
  ↓
┌─────────────────────────────────────┐
│  エラー発生時（緊急停止プロトコル）    │
│  - error_detection_protocol.md      │
│  - system_boundary_violations.md    │
│  - ssot_implementation_guard.md     │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  SSOT作成・実装                      │
│  - write_new_ssot.md                │
│  - ssot_creation_instructions_*.md  │
│  - ssot_implementation_enforcement  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  進捗・実装状況管理                   │
│  - progress_management_guardrails   │
│  - implementation_status_guardrails │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  技術標準                            │
│  - database_naming_standard         │
│  - api_routing_standard             │
└─────────────────────────────────────┘
```

---

## ✅ チェックリスト

### 実装開始前

- [ ] 該当SSOTを読んだか？
- [ ] システムの役割を理解したか？
  - [ ] hotel-saas: プロキシ専用
  - [ ] hotel-common: API基盤・DB層
- [ ] `ssot_implementation_guard.md`を確認したか？
- [ ] 技術標準（DB命名規則、APIルーティング）を確認したか？

### エラー発生時

- [ ] 実装を即座に停止したか？
- [ ] `error_detection_protocol.md`を確認したか？
- [ ] 該当SSOTを再読み込みしたか？
- [ ] `system_boundary_violations.md`で違反パターンを確認したか？
- [ ] ユーザーに報告したか？

### 実装完了時

- [ ] SSOT準拠を確認したか？
- [ ] `implementation_status_guardrails.md`に従って実装状況を更新したか？
- [ ] `progress_management_guardrails.md`に従って進捗を更新したか？
- [ ] 動作確認を行ったか？

---

## 🆕 更新履歴

### v2.1.0 (2025年10月10日)

**追加**:
- `error_detection_protocol.md` - エラー検知時の自動停止プロトコル
- `system_boundary_violations.md` - システム境界違反パターン集
- `.cursorrules` に「緊急停止ルール」セクションを追加

**更新**:
- `ssot_implementation_guard.md` - 関連ドキュメント参照を追加

**理由**:
- SSOT実装中にエラーが発生すると、AIが「問題解決モード」に入り、SSOT確認をスキップしてしまう問題を解決
- システム境界違反（hotel-saasでのPrisma直接使用等）の自動検知を強化

### v2.0.0 (2025年10月5日)

**統合**:
- 包括的な `.cursorrules` の作成
- SSOT実装強制プロトコルの追加
- 進捗管理ガードレールの統合

---

## 📞 サポート

このディレクトリのドキュメントに関する質問や改善提案は、プロジェクト管理者にお問い合わせください。

---

**最終更新**: 2025年10月10日  
**バージョン**: 2.1.0  
**管理者**: hotel-kanri統合管理

