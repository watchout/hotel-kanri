# 🛡️ Gatekeeper運用ガイド

**最終更新**: 2025年11月7日  
**対象**: hotel-saas-rebuild / hotel-common-rebuild  
**目的**: Gatekeeper承認フローの標準化と運用効率化

---

## 🎯 Gatekeeperの役割

### 第三者品質ゲート

- ✅ SSOT準拠の確認
- ✅ 実装証跡の検証
- ✅ CI/CD品質ゲート通過の確認
- ✅ セキュリティ・アーキテクチャの監査

### やらないこと

- ❌ 実装の詳細レビュー（専門チームが担当）
- ❌ コードスタイルの指摘（Linterが担当）
- ❌ 機能要件の定義（Product Ownerが担当）

---

## 👥 Gatekeeper体制

### Team構成

```
@watchout/gatekeepers
├─ Primary Gatekeeper（最優先承認者）
├─ Secondary Gatekeeper（Primary不在時）
└─ AI Gatekeeper（学習・補助）※Phase 1は承認権限なし
```

### 役割分担

| 役割 | 担当 | 権限 | 対応時間 |
|------|------|------|---------|
| **Primary** | @gatekeeper-primary | 承認・差し戻し | 平日9-18時 |
| **Secondary** | @gatekeeper-secondary | 承認・差し戻し | 平日10-19時 |
| **AI** | @gatekeeper-ai | コメントのみ | 24時間 |

---

## ⏱️ 承認タイムアウトとエスカレーション

### 標準フロー

```
PR作成 → CI実行（10分）
  ↓
✅ CI Green
  ↓
⏰ 0-30分: Primary Gatekeeper承認待ち
  ↓
⏰ 30-60分: Secondary Gatekeeper自動通知
  ↓
⏰ 60分超過: Project Leadにエスカレーション
```

### 自動通知設定

GitHub Actionsで自動通知（今後実装予定）:

```yaml
# .github/workflows/gatekeeper-alert.yml
- name: Alert Secondary after 30min
  if: PR未承認 && 経過時間 > 30分
  run: |
    slack-notify @gatekeeper-secondary
    
- name: Escalate after 60min
  if: PR未承認 && 経過時間 > 60分
  run: |
    slack-notify @project-lead
```

---

## 📋 承認基準（Accept Criteria）

### 必須確認項目（Phase 1-4共通）

#### 1. PR本文の必須セクション

- [ ] **## 参照SSOT** - Path/Version/要件ID記載
- [ ] **## Linear/Plane** - Issue URLまたはID記載
- [ ] **## テスト・証跡** - CRUD Verify、静的監査結果
- [ ] **## CI** - 実行URL、全ジョブGreen

#### 2. CI結果

- [ ] **pr-base-check**: ✅ PASS（baseがdevelop）
- [ ] **evidence-check**: ✅ PASS（必須セクション検出）
- [ ] **ssot-compliance**: ✅ PASS（SSOT/要件ID検出）
- [ ] **lint-and-typecheck**: ✅ PASS（警告0）
- [ ] **unit-tests**: ✅ PASS
- [ ] **crud-verify**: ✅ PASS（Artifact保存）
- [ ] **build**: ✅ PASS
- [ ] **security**: ✅ PASS（または許容範囲）
- [ ] **quality-gate**: ✅ PASS（統括）

#### 3. SSOT準拠

- [ ] 参照SSOTのPathが実在
- [ ] Versionが正しい（vX.Y.Z形式）
- [ ] 要件IDが全て実装されている
- [ ] Accept（合格条件）を満たしている

#### 4. アーキテクチャ遵守

- [ ] hotel-saasからのPrisma直接使用なし
- [ ] tenant_idフォールバックなし
- [ ] 環境分岐ロジックなし
- [ ] API Routingガイドライン遵守

---

## ✅ 承認フロー

### Step 1: 初期確認（1分）

```markdown
1. PR本文の必須セクション確認
2. CI結果のサマリー確認（quality-gate Green?）
3. 明らかな問題があれば即差し戻し
```

### Step 2: 詳細確認（3-5分）

```markdown
1. 参照SSOTを開いて、要件ID・Acceptを確認
2. 変更ファイル一覧を確認（変更範囲が適切？）
3. CRUD Verify結果（Artifact）を確認
4. 静的監査ログを確認
```

### Step 3: 判定

#### ✅ 承認（Approve）

```markdown
条件:
- 全チェック項目がクリア
- SSOT準拠が確認できた
- 証跡が十分

コメント例:
Gatekeeper承認: ✅
- CI: 全ジョブGreen（quality-gate含む）
- SSOT: [SSOT_XXX.md v1.0.0] 準拠確認
- 要件ID: XXX-001, XXX-002 完全実装
- 証跡: CRUD Verify成功、静的監査クリア
```

#### 🔄 差し戻し（Request Changes）

```markdown
条件:
- 必須項目の不足
- SSOT非準拠
- 証跡不十分
- CI失敗

コメント例:
Gatekeeper差戻: ❌（再提出可）

不足:
- [ ] PR本文の「## 参照SSOT」にVersionが未記載
- [ ] crud-verify-results.txt がArtifact未保存
- [ ] 要件ID XXX-003 が未実装

対応後、証跡を添えて再提出してください。
```

#### ⏸️ 保留（Comment）

```markdown
条件:
- 判断に迷う
- 追加情報が必要
- 他チームの意見が必要

コメント例:
⏸️ 判断保留 - 追加情報必要

確認事項:
- [ ] この実装はSSOT_XXX.mdのAccept-003を満たしていますか？
- [ ] hotel-commonのAPI変更が必要に見えますが、別PRで対応予定ですか？

回答いただき次第、承認判断します。
```

---

## 🚨 緊急時の対応

### Gatekeeper全員不在時

```markdown
優先度1（緊急リリース）:
1. @project-lead に連絡
2. Branch Protectionの一時的なバイパス申請
3. マージ後、事後レビューを実施

優先度2-3（通常PR）:
1. 次の営業日まで待機
2. Slack #gatekeeper-queue に追加
```

### 判断に迷う場合

```markdown
1. Slack #gatekeeper-discuss に投稿
2. 他のGatekeeperの意見を求める
3. 30分以内に返信がない場合 → @project-lead にエスカレート
```

---

## 📊 運用メトリクス（週次レポート）

### 記録する指標

```markdown
週次（毎週金曜日17:00）:
- 承認PR数
- 差し戻しPR数（理由別）
- 平均承認時間
- 60分超過PR数（エスカレーション件数）
- AI Gatekeeperの精度（Phase 2以降）
```

### 改善アクション

```markdown
承認時間が60分超過が週3件以上:
  → Secondary Gatekeeperの追加検討

差し戻し率が30%以上:
  → PRテンプレート改善、開発者教育

AI Gatekeeperの精度が90%以上（Phase 2以降）:
  → 正式メンバーへの昇格検討
```

---

## 🔄 Phase別の運用調整

### Phase 1（基盤構築）: 厳格体制

```markdown
承認者: Primary + Secondary（人間のみ）
対象: 全ファイル
基準: 100%準拠必須
AI: 学習モード（承認権限なし）
```

### Phase 2-3（機能実装）: バランス体制

```markdown
承認者: Primary + Secondary + AI（検討）
対象: 
  - コア実装: Gatekeeper必須
  - ドキュメント: 専門チームのみ
基準: SSOT準拠（一部柔軟対応）
AI: 補助承認（人間の最終確認あり）
```

### Phase 4（統合・リリース）: 再厳格化

```markdown
承認者: Primary + Secondary（必須2名）
対象: 全ファイル
基準: 100%準拠必須
AI: 使用しない（人間の判断のみ）
```

---

## 📚 関連ドキュメント

- **承認基準詳細**: `/Users/kaneko/hotel-kanri/docs/rebuild/AGENT_PROMPT_GATEKEEPER.md`
- **Branch Protection**: `/Users/kaneko/hotel-kanri/docs/rebuild/BRANCH_PROTECTION_SETUP.md`
- **CI/CD設定**: `/Users/kaneko/hotel-kanri/docs/rebuild/OPERATIONS.md`
- **SSOT一覧**: `/Users/kaneko/hotel-kanri/docs/03_ssot/README.md`

---

## 🤝 Gatekeeper設定（アカウント種別別）

### 現状: 個人アカウント運用（Phase 1）

**watchoutは個人アカウント**のため、GitHub Team機能は使用できません。

#### CODEOWNERS設定

```
# .github/CODEOWNERS
* @watchout  ← 個人指定
```

#### Branch Protection設定

```
Repository Settings → Branches → develop
- Require a pull request before merging: ON
- Require approvals: 1
- Require review from Code Owners: ON
- Dismiss stale pull request approvals: ON
```

**効果**:
- ✅ @watchout（あなた）の承認が必須
- ✅ 基本的な承認フローは機能
- ❌ 複数Gatekeeperの自動振り分けは不可

---

### 将来: Organization移行（Phase 2以降推奨）

#### 1. Organization作成

https://github.com/organizations/plan → "Create a free organization"

```
Organization name: watchout-hotel（例）
Contact email: your-email@example.com
Plan: Free
```

#### 2. リポジトリ移行

```
GitHub UI: Repository Settings → Transfer ownership
移行元: watchout（個人アカウント）
移行先: watchout-hotel（Organization）
```

#### 3. Team作成

https://github.com/orgs/watchout-hotel/teams/new

```
Team name: gatekeepers
Description: Rebuild Project Quality Gate Reviewers
Visibility: Visible
Members:
  - Primary Gatekeeper
  - Secondary Gatekeeper
  - AI Gatekeeper（Phase 2以降）
```

#### 4. CODEOWNERS更新

```diff
- * @watchout
+ * @watchout-hotel/gatekeepers
```

#### 5. 動作確認

PRを作成してTeamが自動アサインされることを確認

---

## 📞 連絡先

- **Primary Gatekeeper**: @gatekeeper-primary（Slack DM可）
- **Secondary Gatekeeper**: @gatekeeper-secondary（Slack DM可）
- **緊急連絡**: @project-lead（Slack: #rebuild-emergency）
- **質問・相談**: Slack #gatekeeper-discuss

