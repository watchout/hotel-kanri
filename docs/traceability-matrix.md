# 🔗 トレーサビリティマトリクス

**生成日時**: 2025-10-21T03:38:45.830Z  
**総要件数**: 5件

---

## 📋 マトリクス

| 要件ID | タイトル | SSOT | ADR | 実装 | QAS | 完全性 |
|:-------|:--------|:-----|:----|:-----|:----|:------:|
| PERM-001 | 権限フォーマット | [SSOT_SAAS_PERMISSION_SYSTEM](../docs/03_ssot/01_admin_features/SSOT_SAAS_PERMISSION_SYSTEM.md) | - | - | - | ❌ 25% |
| PERM-002 | 個別権限のみ（ワイルドカード廃止） | [SSOT_SAAS_PERMISSION_SYSTEM](../docs/03_ssot/01_admin_features/SSOT_SAAS_PERMISSION_SYSTEM.md) | - | - | - | ❌ 25% |
| PERM-009 | 権限階層構造 | [SSOT_SAAS_PERMISSION_SYSTEM](../docs/03_ssot/01_admin_features/SSOT_SAAS_PERMISSION_SYSTEM.md) | - | - | - | ❌ 25% |
| AUTH-001 | メールアドレスは必須・形式検証 | [SSOT_REQUIREMENT_ID_SYSTEM](../docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md) | - | - | - | ❌ 25% |
| AUTH-002 | パスワードは12〜64文字 | [SSOT_REQUIREMENT_ID_SYSTEM](../docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md) | - | - | - | ❌ 25% |

---

## 📊 統計

### 完全性分布

- ✅ 完全（75%以上）: 0件
- 🟡 部分的（50-74%）: 0件
- ❌ 不完全（50%未満）: 5件

### カテゴリ別

- PERM: 3件
- AUTH: 2件

---

## 🎯 改善優先度

### High Priority（完全性50%未満）

- **PERM-001**: 権限フォーマット
  - SSOT: SSOT_SAAS_PERMISSION_SYSTEM
  - 不足: ADR, 実装, QAS

- **PERM-002**: 個別権限のみ（ワイルドカード廃止）
  - SSOT: SSOT_SAAS_PERMISSION_SYSTEM
  - 不足: ADR, 実装, QAS

- **PERM-009**: 権限階層構造
  - SSOT: SSOT_SAAS_PERMISSION_SYSTEM
  - 不足: ADR, 実装, QAS

- **AUTH-001**: メールアドレスは必須・形式検証
  - SSOT: SSOT_REQUIREMENT_ID_SYSTEM
  - 不足: ADR, 実装, QAS

- **AUTH-002**: パスワードは12〜64文字
  - SSOT: SSOT_REQUIREMENT_ID_SYSTEM
  - 不足: ADR, 実装, QAS


---

## 📚 凡例

- **要件ID**: XXX-nnn形式（例: AUTH-001）
- **SSOT**: 要件を定義したSSOT
- **ADR**: 関連する技術的意思決定
- **実装**: 要件を実装したファイル
- **QAS**: 関連する品質属性シナリオ
- **完全性**: トレーサビリティの完全性（0-100%）
  - 100%: SSOT + ADR + 実装 + QAS 全て存在
  - 75%: 3要素存在
  - 50%: 2要素存在
  - 25%: 1要素存在

---

ここまで読み込んだらまず「traceability-matrix.md 読了」と表示すること
