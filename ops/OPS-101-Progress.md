# OPS-101 進捗管理ポリシー

**制定日**: 2025年10月21日  
**バージョン**: 1.0.0  
**ステータス**: Active  
**所有者**: Eng Lead  
**上位ポリシー**: OPS-000 Charter  

---

## 📋 目的

進捗管理の**唯一の真実（Canonical）**を定義し、ツール切替（Plane/Linear/ファイル）時も一貫した運用を保証する。

---

## 🎯 基本原則

### 1. 唯一の真実（Single Source of Truth）

**`ops/policy.yml` の `progress.tool` で選んだツールが唯一の真実（カノニカル）**

- ✅ **Plane運用時**: Plane Issues / Cycles / Projects が唯一の真実
- ✅ **Linear運用時**: Linear Issues / Projects が唯一の真実
- ✅ **File運用時**: `docs/03_ssot/SSOT_PROGRESS_MASTER.md` が唯一の真実

### 2. エクスポートの原則

**週次エクスポートは"参照用"のみ。編集は禁止**

- ✅ 週次エクスポート（`weekly_export.enabled: true` の場合）
- ✅ エクスポート先ファイルは**参照のみ**
- ❌ エクスポート先ファイルの手動編集は**禁止**

### 3. 依存関係の管理

**依存関係は必ずツール上で管理する**

- ✅ Blocked by / Depends on の設定
- ✅ 依存関係を無視したタスク開始は**禁止**
- ✅ AIは依存関係を確認してからタスク選択

---

## 📊 ツール別運用

### Plane運用（`progress.tool: plane`）

#### 記録場所

```
Plane Issues（唯一の真実）
  ├─ Cycles（週次）
  ├─ Projects（Phase別）
  └─ States（Backlog/In Progress/Done）
```

#### やること

- ✅ タスクの作成・更新
- ✅ ステータス管理（Backlog → In Progress → Done）
- ✅ 工数記録（Estimate + Actual）
- ✅ 依存関係管理（Blocked by / Depends on）
- ✅ ラベル管理（SSOT作成/実装/バージョンアップ）
- ✅ 担当者アサイン（Sun/Luna/Suno/Iza）

#### やらないこと

- ❌ SSOT_PROGRESS_MASTER.md の手動更新
- ❌ Markdownファイルでの進捗管理
- ❌ 他ツール（Linear等）との併用

#### 週次エクスポート

```bash
# 毎週月曜8時に自動実行
npm run ops:export-progress

# 出力先
docs/03_ssot/SSOT_PROGRESS_MASTER.md（参照用）
```

---

### Linear運用（`progress.tool: linear`）

#### 記録場所

```
Linear Issues（唯一の真実）
  ├─ Projects（Phase別）
  ├─ Cycles（週次）
  └─ States（Backlog/In Progress/Done）
```

#### やること

- ✅ タスクの作成・更新
- ✅ ステータス管理（Backlog → In Progress → Done）
- ✅ 工数記録（Estimate + Actual）
- ✅ 依存関係管理（Blocked by / Depends on）
- ✅ ラベル管理（SSOT作成/実装/バージョンアップ）
- ✅ 担当者アサイン（Sun/Luna/Suno/Iza）

#### やらないこと

- ❌ SSOT_PROGRESS_MASTER.md の手動更新
- ❌ Markdownファイルでの進捗管理
- ❌ 他ツール（Plane等）との併用

#### 週次エクスポート

```bash
# 毎週月曜8時に自動実行
npm run ops:export-progress

# 出力先
docs/03_ssot/SSOT_PROGRESS_MASTER.md（参照用）
```

---

### File運用（`progress.tool: file`）

#### 記録場所

```
docs/03_ssot/SSOT_PROGRESS_MASTER.md（唯一の真実）
```

#### やること

- ✅ SSOT_PROGRESS_MASTER.md の手動更新
- ✅ Phase別進捗の記録
- ✅ タスクステータスの更新（✅ / ❌）
- ✅ 完了日の記録

#### やらないこと

- ❌ 他のファイルでの進捗管理
- ❌ ツール（Plane/Linear）との併用

#### エクスポート

```
エクスポート不要（ファイルが唯一の真実）
```

---

## 🎯 タスク選択ルール（AI必読）

**絶対ルール**: タスクを開始する前に、以下の順序で選択する

### 優先順位

#### Priority 1（最優先）

1. Status = "Backlog" または "Spec Ready"
2. Priority = 1（最高優先度）
3. 依存関係 = ブロックされていない（Blocked byなし）
4. Assignee = 自分（Sun/Luna/Suno/Iza）

#### Priority 2（高優先）

1. Status = "Backlog" または "Spec Ready"
2. Priority = 2
3. 依存関係 = ブロックされていない

#### Priority 3（通常）

1. Status = "Backlog"
2. Priority = 3
3. 依存関係 = ブロックされていない

### 禁止事項

❌ **絶対禁止**:
- 依存関係を無視してタスクを開始する
- 「Blocked by」が設定されているタスクを開始する
- 自分（Assignee）以外のタスクを開始する
- Priorityを無視してタスクを選択する

✅ **正しい対応**:
1. ツール（Plane/Linear）で次のタスクを検索
2. 依存関係を確認
3. ブロックされていないタスクを選択
4. ユーザーに「次のタスク: XXX-123」を報告
5. ユーザーの承認を得てから開始

### 依存関係の理解

```
SSOT作成 → hotel-common実装 → hotel-saas実装

例:
- PLANE-1: SSOT作成: SSOT_ADMIN_PERMISSIONS
- PLANE-2: hotel-common実装: SSOT_ADMIN_PERMISSIONS (Blocked by PLANE-1)
- PLANE-3: hotel-saas実装: SSOT_ADMIN_PERMISSIONS (Blocked by PLANE-2)

正しい順序:
1. PLANE-1を完了
2. PLANE-2を開始（PLANE-1完了後）
3. PLANE-3を開始（PLANE-2完了後）

間違った順序:
❌ PLANE-1未完了でPLANE-2を開始
❌ PLANE-2未完了でPLANE-3を開始
```

---

## 🔄 ロードマップ修正フロー

### Step 1: AIが検知（Cursor）

- 依存関係の問題
- 新規タスク必要
- 工数見積もりの変更

### Step 2: ユーザーに提案（Cursor）

- 理由・影響範囲・工数変化を明示
- 「以下の変更を提案します」

### Step 3: ユーザー承認

- 「承認します」または「却下」

### Step 4: ツール自動更新

**Plane/Linear運用時**:
```bash
# API経由で自動更新
npm run ops:sync-task -- --task-id PLANE-123 --status done
```

**File運用時**:
```bash
# ファイル直接更新
vim docs/03_ssot/SSOT_PROGRESS_MASTER.md
```

### Step 5: ドキュメント記録（Git）

```bash
git add docs/03_ssot/SSOT_PROGRESS_MASTER.md
git commit -m "chore: update progress - PLANE-123 completed"
```

---

## ❌ 絶対禁止事項

### ユーザー承認なしの変更

- ❌ タスクの追加・削除
- ❌ 優先度・依存関係の変更
- ❌ Phase構成の変更

### 承認不要な操作

- ✅ ステータス変更（Backlog → In Progress → Done）
- ✅ コメント追加
- ✅ 工数実績記録

---

## 📊 週次レポート

### 自動生成内容

```markdown
## 📊 週次進捗レポート（YYYY-MM-DD）

### Phase別進捗
- Phase 1: ████████░░ 80% (8/10)
- Phase 2: ███░░░░░░░ 30% (3/10)

### 完了タスク（今週）
- PLANE-123: SSOT_SAAS_PERMISSION_SYSTEM v1.0.0完成
- PLANE-124: hotel-common実装完了

### 次週予定
- PLANE-125: SSOT_SAAS_MEDIA_MANAGEMENT 実装開始
```

### 出力先

- **Plane/Linear運用時**: `docs/03_ssot/SSOT_PROGRESS_MASTER.md`（参照用）
- **File運用時**: 出力なし（ファイルが唯一の真実）

---

## 🔧 ツール切替手順

### Plane → Linear

1. `ops/policy.yml` を変更
   ```yaml
   progress:
     tool: linear  # plane → linear
   ```

2. opsctl 実行
   ```bash
   npm run ops:apply
   ```

3. データ移行
   ```bash
   npm run ops:migrate -- --from plane --to linear
   ```

4. CI確認 → マージ

### Linear → File

1. `ops/policy.yml` を変更
   ```yaml
   progress:
     tool: file  # linear → file
     weekly_export:
       enabled: false  # エクスポート無効化
   ```

2. opsctl 実行
   ```bash
   npm run ops:apply
   ```

3. 最終エクスポート
   ```bash
   npm run ops:export-progress -- --final
   ```

4. CI確認 → マージ

---

## 📚 関連ドキュメント

- **OPS-000**: Charter → `ops/OPS-000-Charter.md`
- **ops/policy.yml**: 実環境設定
- **scripts/linear/**: Linear連携スクリプト（非推奨、参考用）
- **docs/03_ssot/SSOT_PROGRESS_MASTER.md**: 進捗ファイル（参照用）

---

## 📅 発効日と履歴

| バージョン | 日付 | 変更内容 | 承認者 |
|:---------|:-----|:---------|:------|
| 1.0.0 | 2025-10-21 | 初版制定 | Eng Lead |

---

**管理ファイル**: `/Users/kaneko/hotel-kanri/ops/OPS-101-Progress.md`  
**最終更新**: 2025年10月21日  
**バージョン**: 1.0.0  
**ステータス**: Active

