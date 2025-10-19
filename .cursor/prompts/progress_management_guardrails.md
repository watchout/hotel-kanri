# 🛡️ 進捗管理ガードレール

**作成日**: 2025年10月9日  
**目的**: 進捗管理の混乱を防ぐための絶対ルール

---

## 🚨 絶対ルール

### ルール1: 進捗管理ファイルは1つだけ

**唯一の進捗管理ファイル**:
```
/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md
```

❌ **禁止事項**:
- 他のファイルで進捗を記録する
- プロンプトファイルに進捗を書く
- README.mdに進捗を書く
- Phase別の進捗ファイルを作る

✅ **正しい対応**:
- 進捗は `SSOT_PROGRESS_MASTER.md` だけに記録
- 他のファイルは `SSOT_PROGRESS_MASTER.md` を参照する

---

### ルール2: ファイルの役割を明確にする

#### 進捗管理ファイル（1つだけ）
```
SSOT_PROGRESS_MASTER.md
```
- 目的: 現在の状態・次のアクション
- 内容: 何が完成/作業中/未着手か
- 更新: 毎日更新

#### ガイドファイル（複数OK）
```
README.md                  # 概要・構造・使い方
SSOT_CREATION_RULES.md     # 作成ルール
SSOT_PROGRESS_MASTER.md    # 進捗管理・ロードマップ統合（唯一のファイル）
write_new_ssot.md          # 作成手順書
```
- 目的: 「何をどうやるか」のガイド
- 内容: ルール、手順、方針
- 更新: 必要に応じて（頻繁ではない）

---

## ❌ 違反パターン

### パターン1: 進捗ファイルの乱立

```
❌ 禁止:
- ssot_creation_progress_phase1.md
- phase0_progress_saas.md
- phase0_progress_common.md
- progress_2025_10.md
```

**問題**: どれが最新か分からない、更新漏れが発生する

**正しい対応**: `SSOT_PROGRESS_MASTER.md` 1つだけ

---

### パターン2: README.mdに進捗を書く

```markdown
❌ 禁止:
## 進捗サマリー
- Phase 1: ✅ 完了
- Phase 2: 🔄 進行中
```

**問題**: README.mdの本来の役割（概要・構造）と混在する

**正しい対応**: 
- README.mdは概要・構造のみ
- 進捗は `SSOT_PROGRESS_MASTER.md` に記録

---

### パターン3: プロンプトファイルに進捗を書く

```markdown
❌ 禁止:
## フェーズ1で作成するSSOT

1. SSOT_SAAS_SUPER_ADMIN.md（✅ 完成）
2. SSOT_ADMIN_SYSTEM_LOGS.md（🔄 作業中）
```

**問題**: プロンプトファイルは作業手順書であり、進捗管理ではない

**正しい対応**:
- プロンプトファイルは「どう作成するか」のガイドのみ
- 進捗は `SSOT_PROGRESS_MASTER.md` に記録

---

## ✅ 正しいワークフロー

### SSOT作成開始時

1. **SSOT_PROGRESS_MASTER.md を開く**
2. **該当SSOTのステータスを「🟡 作成中」に変更**
3. **開始日を記録**
4. **作業開始**

### SSOT作業中

1. **毎日終業時に SSOT_PROGRESS_MASTER.md を更新**
2. **進捗状況を記録**（例: 「Phase 3まで完了」）

### SSOT完成時

1. **SSOT_PROGRESS_MASTER.md を開く**
2. **該当SSOTのステータスを「✅ 完成」に変更**
3. **バージョン番号を記録**
4. **完成日を記録**
5. **次のアクションを確認**

---

## 🔍 AI自己チェックリスト

作業開始前に必ず確認：

- [ ] 進捗を記録しようとしているファイルは `SSOT_PROGRESS_MASTER.md` か？
- [ ] 他のファイルに進捗を書こうとしていないか？
- [ ] プロンプトファイルと進捗管理ファイルを混同していないか？
- [ ] README.mdに進捗を書こうとしていないか？

**1つでも「いいえ」がある場合**: 即座に停止し、`SSOT_PROGRESS_MASTER.md` を開く

---

## 🚨 エラー発生時の対応

### エラー: 進捗ファイルが複数存在する

**対応**:
1. `SSOT_PROGRESS_MASTER.md` に統合
2. 他の進捗ファイルを削除または`_archived/`に移動
3. 今後は `SSOT_PROGRESS_MASTER.md` だけを使用

### エラー: どのファイルに何を書くか分からない

**判断基準**:

| 記録内容 | ファイル |
|---------|---------|
| 現在の状態（完成/作業中/未着手） | `SSOT_PROGRESS_MASTER.md` |
| 次のアクション | `SSOT_PROGRESS_MASTER.md` |
| 作成ルール・手順 | `SSOT_CREATION_RULES.md` |
| 概要・構造 | `README.md` |
| 全体計画・ロードマップ | `SSOT_PROGRESS_MASTER.md` |
| 作成手順書 | `write_new_ssot.md` |

---

## 📝 更新履歴

| 日付 | 更新内容 | 担当 |
|------|---------|------|
| 2025-10-09 | 初版作成 | 統合管理 |

---

**ガードレールファイル**: `/Users/kaneko/hotel-kanri/.cursor/prompts/progress_management_guardrails.md`  
**最終更新**: 2025年10月9日


