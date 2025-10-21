# コマンドリファレンス

**最終更新**: 2025-10-21  
**対象**: 全開発者・AI  
**参照方法**: `ripgrep MCP` または `/read-quote`

---

## 📝 5つのコマンド一覧

| コマンド | 用途 | 出力形式 |
|---------|------|---------|
| **/rfv** | Request For Verification（承認依頼） | EPA形式 |
| **/diff-only** | Diffのみ出力（説明不要） | Unified Diff |
| **/read-quote** | ファイル要約＋引用 | 箇条書き＋引用 |
| **/test-report** | テスト実行報告 | 成否＋トップ3ログ |
| **/pick-task** | 次タスク選択 | タスク一覧→確定 |

---

## 1️⃣ /rfv（Request For Verification）

**いつ使う？**: 実装を開始する前に、必ず使う

**フォーマット：**
```markdown
【RFV: Request For Verification】

Task: <id or alias>

Evidence（要点3＋引用：パス/行区間）
1. SSOT #section の要約
   path/to/file.md#L10-L20
2. 既存実装の構造
   path/to/code.ts#L45-L60
3. スキーマ定義
   prisma/schema.prisma#L120-L125

Plan（≤5ステップ）
1. 〜を把握
2. 〜を実装
3. 〜をテスト
4. 〜を更新
5. CI確認

Risk / Open points
- リスク: 〜
- 不明点: 〜

Ask（承認? or 選択肢A/B）
承認お願いします。
```

**使用例：**
```
Task: r1 — /rfv

Evidence:
1. SSOT #roles-create: Role作成はPOST /api/roles、name必須、ユニーク制約
   docs/SSOT_SAAS_PERMISSION_SYSTEM.md#L45-L52
2. 既存routes: GET /api/roles のみ実装済み、バリデータはyup使用
   apps/server/src/routes/roles.ts#L10-L25
3. schema.prisma: Role.name に@@unique制約あり
   prisma/schema.prisma#L120-L125

Plan:
1. POST /api/roles エンドポイント追加
2. yupバリデータ作成（name: string required）
3. 重複時409返却
4. 正常/異常テスト追加
5. CI確認

Risk:
- ユニーク制約違反時のエラーハンドリング

Ask: 承認お願いします。
```

---

## 2️⃣ /diff-only（Diff出力のみ）

**いつ使う？**: 実装時、説明不要で差分だけ欲しい時

**ルール：**
- 出力は **Unified Diff** のみ
- 説明・余談は一切含めない
- 関連テストの追加/更新も Diff に含める

**使用例：**
```
ユーザー: OK。Diff only

AI: 
--- a/apps/server/src/routes/roles.ts
+++ b/apps/server/src/routes/roles.ts
@@ -10,6 +10,15 @@
 router.get('/', async (req, res) => {
   // 既存のGET実装
 });
+
+router.post('/', async (req, res) => {
+  const { name } = req.body;
+  const role = await prisma.role.create({ data: { name } });
+  res.status(201).json(role);
+});

（テスト差分も続く）
```

---

## 3️⃣ /read-quote（ファイル要約＋引用）

**いつ使う？**: SSOTや既存実装を調査する時

**フォーマット：**
```markdown
対象:
- files:
  - <path#Lstart-Lend>

出力:
- 要約(箇条書き3)
- 仕様/実装の引用（パス/行番号付き）
- 影響範囲(型/関数/エンドポイント)
```

**使用例：**
```
ユーザー: /read-quote
対象:
- files:
  - docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md#L45-L80

AI:
要約:
1. 全クエリにtenant_id必須（マルチテナント分離）
2. セッションからtenantId取得→WHERE句に追加
3. フォールバック値（'default'等）使用禁止

引用:
docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md#L45-L52
> 全てのデータベースクエリは、必ずtenant_idでフィルタする。
> セッションにtenantIdが存在しない場合はエラーを返却する。

影響範囲:
- 型: Session.tenantId (string, 必須)
- 関数: getSession(), requireTenantId()
- エンドポイント: 全API（/api/*）
```

---

## 4️⃣ /test-report（テスト実行報告）

**いつ使う？**: テスト実行後、結果を簡潔に報告する時

**ルール：**
- 成功/失敗のみ
- 失敗時はトップ3ログ
- 次アクション（修正案 or スキップ理由）

**使用例：**
```
ユーザー: テスト実行して

AI:
❌ 失敗: 250 tests, 3 failed

失敗トップ3:
1. roles.create.spec.ts:45
   Expected 201, got 500
   → バリデーションエラーハンドリング不足
   
2. roles.create.spec.ts:60
   Expected 409, got 201
   → ユニーク制約チェック未実装
   
3. roles.create.spec.ts:75
   Expected body.name='manager', got undefined
   → レスポンス返却ロジック不足

次アクション:
- 修正案A: バリデーション追加（yup schema）
- 修正案B: Prisma catch で P2002 エラー判定
Diff only で修正しますか？
```

---

## 5️⃣ /pick-task（次タスク選択）

**いつ使う？**: 次にやるタスクを選ぶ時

**フロー：**
1. `.cursor/taskcards/*.yaml` を更新順に最大10件列挙
2. `id / alias / title` を番号付きで表示
3. ユーザーの番号 or alias を受けて確定
4. 「現在のTask: <id> (<alias>) - <title>」のみ返す

**使用例：**
```
ユーザー: /pick-task

AI:
1. PMS-12 (r1) - 権限管理のロール作成APIを追加
2. BUG-45 (b1) - 注文APIでテナントID欠落バグ
3. REFACTOR-8 (f1) - エラーハンドラ共通化
4. DOC-23 (s1) - 権限システムSSO作成
5. INVEST-5 (i1) - スロークエリ調査

番号 or alias を入力してください。

ユーザー: b1

AI:
現在のTask: BUG-45 (b1) - 注文APIでテナントID欠落バグ
```

---

## 🎯 コマンド選択ガイド

| シーン | 使うコマンド |
|--------|------------|
| 実装開始前 | `/rfv` |
| 承認後の実装 | `/diff-only` |
| SSOT調査 | `/read-quote` |
| テスト実行後 | `/test-report` |
| タスク選択 | `/pick-task` |

---

## 🔗 関連ドキュメント

- **EPA運用ガード**: `.cursor/rules/00-guardrails.md`
- **TaskCard利用ガイド**: `.cursor/reference/taskcard-usage-guide.md`
- **EPAワークフロー**: `.cursor/reference/epa-workflow.md`
