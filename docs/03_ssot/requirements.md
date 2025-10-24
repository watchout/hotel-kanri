# SSOT要件マスター（スタッフ管理 抜粋）

最終更新: 2025-10-23

対象SSOT: `docs/03_ssot/01_admin_features/SSOT_SAAS_STAFF_MANAGEMENT.md` v1.2.1
OpenAPI: `docs/03_ssot/openapi/staff-management.yaml`

## コア機能（要件ID ⇔ OpenAPI OperationId）

| 要件ID | 機能 | Method/Path | OperationId | Accept概要 |
|---|---|---|---|---|
| STAFF-001 | 招待 | POST /staffs/invite | inviteStaff | メール送信/重複409 |
| STAFF-002 | 受諾 | POST /staffs/accept-invitation | acceptInvitation | トークン検証/パスワード設定 |
| STAFF-003 | 一覧 | GET /staffs | listStaffs | ページネーション/検索/フィルタ |
| STAFF-004 | 詳細 | GET /staffs/{id} | getStaff | 詳細取得 |
| STAFF-005 | 更新 | PUT /staffs/{id} | updateStaff | 名前/メール/役職更新 |
| STAFF-006 | 削除 | DELETE /staffs/{id} | deleteStaff | 論理削除 |
| STAFF-007 | 復元 | POST /staffs/{id}/restore | restoreStaff | 復元成功 |
| STAFF-013 | ロック | POST /staffs/{id}/lock | lockStaff | ロック状態へ |
| STAFF-014 | ロック解除 | POST /staffs/{id}/unlock | unlockStaff | アンロック |
| STAFF-017 | 招待キャンセル | POST /staffs/{id}/cancel-invite | cancelInvitation | キャンセル |
| STAFF-018 | 招待再送 | POST /staffs/{id}/resend-invite | resendInvitation | 再送 |

## セキュリティ（要件ID ⇔ 検証ポイント）

| 要件ID | 検証 | エラー |
|---|---|---|
| STAFF-SEC-001 | 権限 `system:staff:manage`/`view` | 403 |
| STAFF-SEC-002 | テナント分離 | 404（情報秘匿） |
| STAFF-SEC-003 | 自己削除禁止 | 400 |
| STAFF-SEC-004 | 最後のOWNER削除禁止 | 400 |
| STAFF-SEC-005/006 | 招待トークン期限/一回限り | 400 |

## トレーサビリティ（例）

```
STAFF-003（一覧）
 ├─ OpenAPI: listStaffs
 ├─ common: /src/routes/api/v1/admin/staff.get.ts
 ├─ saas proxy: /server/api/v1/admin/staffs.get.ts
 └─ tests: staff.api.test.ts / e2e
```


