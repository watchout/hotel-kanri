# Linear セットアップガイド

**作成日**: 2025年10月18日  
**バージョン**: 1.0.0  
**対象**: hotel-kanriプロジェクト  
**目的**: Linearを唯一の進捗管理ツールとして導入する

---

## 📋 目次

1. [チーム設定](#チーム設定)
2. [プロジェクト設定](#プロジェクト設定)
3. [ラベル設定](#ラベル設定)
4. [テンプレート設定](#テンプレート設定)
5. [サイクル設定](#サイクル設定)
6. [運用フロー](#運用フロー)

---

## 👥 チーム設定

### 1. Workspace作成

**Workspace名**: `hotel-kanri`

**Settings → General**:
- Workspace URL: `hotel-kanri.linear.app`
- Timezone: `Asia/Tokyo`
- Week starts on: `Monday`

---

### 2. Teams（チーム）作成

#### **Team 1: Sun（天照大神）- hotel-saas担当**

```
Team Name: Sun (hotel-saas)
Identifier: SUN
Description: hotel-saas担当 - 管理画面UI/UX、顧客体験向上
Icon: ☀️
Color: #F59E0B (Amber)

Settings:
├─ Default Cycle Duration: 1 week
├─ Start Day: Monday
└─ Estimate Type: Points (1 point = 4 hours)
```

#### **Team 2: Luna（月読）- hotel-pms担当**

```
Team Name: Luna (hotel-pms)
Identifier: LUNA
Description: hotel-pms担当 - フロント業務、予約管理、オペレーション
Icon: 🌙
Color: #6366F1 (Indigo)

Settings:
├─ Default Cycle Duration: 1 week
├─ Start Day: Monday
└─ Estimate Type: Points (1 point = 4 hours)
```

#### **Team 3: Suno（須佐之男）- hotel-member担当**

```
Team Name: Suno (hotel-member)
Identifier: SUNO
Description: hotel-member担当 - 顧客管理、プライバシー保護
Icon: ⚡
Color: #8B5CF6 (Purple)

Settings:
├─ Default Cycle Duration: 1 week
├─ Start Day: Monday
└─ Estimate Type: Points (1 point = 4 hours)
```

#### **Team 4: Iza（伊邪那岐）- hotel-common担当**

```
Team Name: Iza (hotel-common)
Identifier: IZA
Description: hotel-common担当 - API基盤、データベース層、システム統合
Icon: 🌊
Color: #06B6D4 (Cyan)

Settings:
├─ Default Cycle Duration: 1 week
├─ Start Day: Monday
└─ Estimate Type: Points (1 point = 4 hours)
```

---

## 🎯 プロジェクト設定

### 1. Projects（プロジェクト）= Phase管理

#### **Project 1: Phase 0 - 緊急エラー対応**

```
Project Name: Phase 0: 緊急エラー対応
Identifier: P0
Status: ✅ Completed
Start Date: 2025-10-10
Target Date: 2025-10-13
Lead: Iza

Description:
JWT認証削除、環境分岐削除、システム稼働率100点達成

Milestone:
- システム稼働率100点達成
- Phase 1開始可能状態
```

#### **Project 2: Phase 1 - 基盤完成**

```
Project Name: Phase 1: 基盤完成
Identifier: P1
Status: 🟡 In Progress
Start Date: 2025-10-15
Target Date: 2025-11-11
Lead: Iza

Description:
権限システム、メディア管理、メール送信、統計分析基盤の完成

Milestone:
- 権限管理システムが全管理画面で動作
- メディア管理が使用可能
- メール送信が使用可能
- 統計分析機能がv1.2.0以上

Sub-projects:
├─ Week 1: 権限・メディア基盤
├─ Week 2: コア機能バージョンアップ
├─ Week 3: 管理機能強化
└─ Week 4: 統計・分析基盤
```

#### **Project 3: Phase 2 - 客室端末完成**

```
Project Name: Phase 2: 客室端末完成
Identifier: P2
Status: ⏳ Planned
Start Date: 2025-11-12
Target Date: 2025-12-02
Lead: Sun

Description:
注文フロー、メニュー閲覧、キャンペーン表示、AIチャット基礎

Milestone:
- 客室端末の全基本機能が動作
- WebViewアプリが安定稼働
- AIチャット基礎機能が動作

Sub-projects:
├─ Week 5: SSOT作成（注文・メニュー・デバイス）
├─ Week 6: キャンペーン機能
└─ Week 7: AIチャット基礎
```

#### **Project 4: Phase 3 - AIチャット完成**

```
Project Name: Phase 3: AIチャット完成
Identifier: P3
Status: ⏳ Planned
Start Date: 2025-12-03
Target Date: 2025-12-16
Lead: Sun

Description:
観光連携、音声入力、Q&A Tree、多言語対応

Milestone:
- AIチャット全機能が動作
- 観光情報連携が完成
- 音声入力が動作
```

#### **Project 5: Phase 4 - 多言語・監視**

```
Project Name: Phase 4: 多言語・監視完成
Identifier: P4
Status: ⏳ Planned
Start Date: 2025-12-17
Target Date: 2025-12-30
Lead: Luna

Description:
15言語完全対応、ログ監視、AI分析、PMS連携基礎

Milestone:
- 15言語対応が動作
- ログ監視システムが動作
- PMS連携準備完了
```

#### **Project 6: Phase 5 - 拡張機能**

```
Project Name: Phase 5: 拡張機能
Identifier: P5
Status: ⏳ Planned
Start Date: 2025-12-31
Target Date: 2026-01-13
Lead: Iza

Description:
決済連携、施設予約、ビジネス管理機能

Milestone:
- 決済連携が動作
- 施設予約システムが動作
```

---

## 🏷️ ラベル設定

### 1. Type（種別）

```
🏷️ ssot-creation
   Description: SSOT作成タスク
   Color: #10B981 (Green)

🏷️ implementation
   Description: 実装タスク
   Color: #3B82F6 (Blue)

🏷️ version-up
   Description: バージョンアップタスク
   Color: #8B5CF6 (Purple)

🏷️ bug-fix
   Description: バグ修正
   Color: #EF4444 (Red)

🏷️ refactoring
   Description: リファクタリング
   Color: #F59E0B (Amber)
```

### 2. System（システム）

```
🏷️ hotel-saas
   Description: hotel-saasシステム
   Color: #F59E0B (Amber)

🏷️ hotel-common
   Description: hotel-commonシステム
   Color: #06B6D4 (Cyan)

🏷️ hotel-pms
   Description: hotel-pmsシステム
   Color: #6366F1 (Indigo)

🏷️ hotel-member
   Description: hotel-memberシステム
   Color: #8B5CF6 (Purple)
```

### 3. Priority（優先度）

```
🏷️ critical
   Description: 緊急（即座対応）
   Color: #DC2626 (Red 600)

🏷️ high
   Description: 高優先度
   Color: #F59E0B (Amber)

🏷️ medium
   Description: 中優先度
   Color: #3B82F6 (Blue)

🏷️ low
   Description: 低優先度
   Color: #10B981 (Green)
```

### 4. Category（カテゴリ）

```
🏷️ foundation
   Description: 基盤機能（00_foundation）
   Color: #6B7280 (Gray)

🏷️ admin
   Description: 管理画面機能（01_admin_features）
   Color: #8B5CF6 (Purple)

🏷️ guest
   Description: 客室端末機能（02_guest_features）
   Color: #F59E0B (Amber)

🏷️ business
   Description: ビジネス機能（03_business_features）
   Color: #10B981 (Green)

🏷️ monitoring
   Description: 監視機能（04_monitoring）
   Color: #EF4444 (Red)
```

### 5. Status Indicator（状態）

```
🏷️ blocked
   Description: ブロックされている
   Color: #DC2626 (Red)

🏷️ waiting-approval
   Description: 承認待ち
   Color: #F59E0B (Amber)

🏷️ needs-review
   Description: レビュー必要
   Color: #3B82F6 (Blue)

🏷️ ready-to-start
   Description: 開始準備完了
   Color: #10B981 (Green)
```

---

## 📝 テンプレート設定

### 1. SSOT作成タスクテンプレート

```markdown
## 📋 SSOT作成タスク

**SSOT名**: [SSOT_XXX.md]
**バージョン**: v1.0.0
**カテゴリ**: [foundation/admin/guest/business/monitoring]
**システム**: [hotel-saas/hotel-common/hotel-pms/hotel-member]

---

## 🎯 目的

[このSSOTで定義する機能の概要]

---

## 📚 必読ドキュメント（作成前）

- [ ] `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`
- [ ] `SSOT_QUALITY_CHECKLIST.md`
- [ ] `DATABASE_NAMING_STANDARD.md`
- [ ] `API_ROUTING_GUIDELINES.md`

---

## ✅ チェックリスト

### 事前調査（15分）

- [ ] 既存実装ソースを確認
- [ ] 既存データベーステーブルを確認
- [ ] 関連SSOTを確認
- [ ] UIコンポーネントを確認

### SSOT作成

- [ ] 目的・スコープの定義
- [ ] データモデルの定義（snake_case必須）
- [ ] API仕様の定義（パス確認）
- [ ] システム間連携の定義
- [ ] 実装ガイドの記載

### 品質チェック

- [ ] DATABASE_NAMING_STANDARD準拠
- [ ] API_ROUTING_GUIDELINES準拠
- [ ] SessionUser型統一確認
- [ ] 既存SSOTとの矛盾なし

### 完了処理

- [ ] retest_new_ssot.mdでチェック
- [ ] SSOT_PROGRESS_MASTER.md更新
- [ ] Gitコミット

---

## 📎 関連リンク

- SSOT: [リンク]
- 既存実装: [リンク]
- 関連Issue: [リンク]
```

### 2. 実装タスクテンプレート

```markdown
## 🛠️ 実装タスク

**機能名**: [機能名]
**SSOT**: [SSOT_XXX.md v1.0.0]
**システム**: [hotel-saas/hotel-common/hotel-pms/hotel-member]
**実装バージョン**: v1.0.0

---

## 🎯 実装内容

[実装する機能の概要]

---

## 📚 必読ドキュメント（実装前）

- [ ] 該当SSOT（最新版）
- [ ] `SSOT_IMPLEMENTATION_CHECKLIST.md`
- [ ] `DATABASE_NAMING_STANDARD.md`
- [ ] `API_ROUTING_GUIDELINES.md`

---

## ✅ 実装チェックリスト

### Phase 1: データベース実装

- [ ] Prismaスキーマ更新（snake_case）
- [ ] マイグレーションファイル作成
- [ ] マイグレーション実行
- [ ] テストデータ投入

### Phase 2: API実装

- [ ] APIエンドポイント実装（SSOT通り）
- [ ] 認証・テナントID検証
- [ ] バリデーション実装
- [ ] エラーハンドリング

### Phase 3: フロントエンド実装

- [ ] Composable作成
- [ ] UIコンポーネント実装
- [ ] ページ実装
- [ ] エラー表示

### Phase 4: テスト

- [ ] APIテスト（Postman/curl）
- [ ] 単体テスト
- [ ] 手動UIテスト

### Phase 5: SSOT準拠確認

- [ ] データベース命名確認
- [ ] APIパス確認
- [ ] SessionUser型確認
- [ ] システム間連携確認

---

## 📎 関連リンク

- SSOT: [リンク]
- Git Branch: [リンク]
- 関連Issue: [リンク]
```

---

## 🔄 サイクル設定

### 1. Cycles（サイクル）= 週次管理

**Settings → Cycles**:

```
Enable Cycles: ✅ Yes
Cycle Duration: 1 week
Start Day: Monday
Auto-archive: After 2 cycles
Cooldown Period: 0 days
```

### 2. 初期サイクル作成

#### **Cycle 1: Week 1 (10/15-10/21) 権限・メディア基盤**

```
Name: Week 1: 権限・メディア基盤
Start: 2025-10-15
End: 2025-10-21
Scope: 4 issues
Status: ✅ Completed
```

#### **Cycle 2: Week 2 (10/22-10/28) コア機能バージョンアップ**

```
Name: Week 2: コア機能バージョンアップ
Start: 2025-10-22
End: 2025-10-28
Scope: 5 issues
Status: 🟡 In Progress
```

（Week 3以降も同様に作成）

---

## 🔄 運用フロー

### 1. タスク開始フロー

```markdown
1. Linearダッシュボードを開く
2. "My Issues" → "Todo" から次のタスクを選択
3. タスク詳細を確認
   - Description
   - Related documents
   - Checklist
4. Status を "In Progress" に変更
5. タイマー開始（Time Tracking）
6. 実装開始
```

### 2. 進捗更新フロー

```markdown
Daily:
1. 実装中のタスクにコメント追加
   - 今日やったこと
   - 進捗率（%）
   - 明日やること
   - ブロッカー（あれば）

2. サブタスク完了時はチェック

3. ブロッカーがある場合:
   - Status を "Blocked" に変更
   - "Blocked by" に依存先Issueを設定
   - コメントに理由を記載
```

### 3. タスク完了フロー

```markdown
1. 実装完了チェック
   - [ ] 全サブタスク完了
   - [ ] テスト完了
   - [ ] SSOT準拠確認完了
   - [ ] ドキュメント更新完了

2. Status を "Done" に変更

3. タイマー停止

4. 実績工数を記録
   - Estimate: 3d
   - Actual: 2.5d

5. 関連ドキュメントへのリンク追加
   - SSOT
   - Git PR
   - 実装ファイル

6. 次のタスクが自動で "Ready to start" に
```

### 4. ロードマップ修正フロー

```markdown
Step 1: AIが検知（Cursor）
  - 依存関係の問題
  - 優先度変更の必要性
  - 新規タスクの追加

Step 2: ユーザーに提案（Cursor）
  AI: 「ロードマップ修正を提案します」
  - 修正内容
  - 理由
  - 影響範囲
  - 工数変化

Step 3: ユーザー承認
  User: 「承認します」または「却下」

Step 4: Linear自動更新（Linear API）
  - タスク作成/更新
  - 依存関係設定
  - 担当者アサイン
  - チームに通知

Step 5: ドキュメント記録（Git）
  - 変更履歴コミット
  - CHANGELOG更新
```

---

## 🔔 通知設定

### 1. Personal Notifications

```
Settings → Notifications → Personal

✅ 通知ON:
├─ Issue assigned to me
├─ Issue I'm subscribed to is updated
├─ Someone mentions me
├─ Blocked issue is unblocked
├─ Cycle ends in 1 day
└─ Issue due date in 1 day

❌ 通知OFF:
├─ Every comment on issues I created
└─ Every status change
```

### 2. Team Notifications

```
Settings → Notifications → Team

✅ 通知ON:
├─ New issue created in team
├─ Issue moved to "Blocked"
├─ Issue marked as "High Priority"
└─ Cycle completed
```

---

## 📊 ダッシュボード設定

### 1. Personal Dashboard

```
Views:
├─ My Issues (Active)
│   Filter: Assigned to me + Status != Done
│   Sort: Priority (High → Low)
│
├─ Blocked
│   Filter: Assigned to me + Status = Blocked
│   Sort: Created date (New → Old)
│
├─ This Week
│   Filter: Assigned to me + Current Cycle
│   Sort: Priority
│
└─ Completed This Week
    Filter: Assigned to me + Completed this cycle
    Sort: Completed date
```

### 2. Team Dashboard

```
Views:
├─ Team Roadmap
│   View: Roadmap
│   Projects: All
│   Timeline: 14 weeks
│
├─ Current Cycle
│   Filter: Current Cycle
│   Group by: Assignee
│   Sort: Status
│
├─ Burndown Chart
│   Type: Burndown
│   Scope: Current Project
│
└─ Velocity Chart
    Type: Velocity
    Period: Last 4 cycles
```

---

## 🎯 次のステップ

1. ✅ アカウント作成（完了）
2. ⏳ チーム・プロジェクト設定（このガイドに従って実施）
3. ⏳ データ移行スクリプト実行
4. ⏳ .cursorrules にLinear運用ルール追記
5. ⏳ 運用開始

---

**次は**: データ移行スクリプトの作成に進みます。

