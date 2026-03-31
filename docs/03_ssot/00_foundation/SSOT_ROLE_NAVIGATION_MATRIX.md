# SSOT: ロール×ナビゲーション表示制御マトリクス

**ドキュメントID**: SSOT_ROLE_NAVIGATION_MATRIX
**バージョン**: 1.0.0
**作成日**: 2026-03-31
**最終更新**: 2026-03-31
**ステータス**: 🟡 ドラフト（CTO承認待ち）

**関連SSOT**:
- SSOT_SAAS_PERMISSION_SYSTEM.md（legacy/01_admin_features） — 権限コード定義
- SSOT_PRICING_ENTITLEMENTS.md（legacy/00_foundation） — プラン×機能マトリクス
- SSOT_SAAS_ADMIN_AUTHENTICATION.md — 管理画面認証

---

## 1. ロール定義

### 1.1 システムロール（adminテーブル）

| ロール | AdminLevel | 対象 | 説明 |
|:--|:--|:--|:--|
| Super Admin | superadmin | SaaS運営者 | 全テナント管理、システム設定 |
| Group Admin | groupadmin | ホテルグループ管理者 | グループ内テナント管理 |
| Chain Admin | chainadmin | チェーン管理者 | チェーン内テナント管理 |

### 1.2 テナントロール（roles + staff_tenant_membershipsテーブル）

| ロール | テナント内の役割 | 説明 |
|:--|:--|:--|
| オーナー | tenant-owner | テナント管理者。全機能にアクセス可能 |
| マネージャー | tenant-manager | 運用管理。スタッフ管理、設定変更が可能 |
| スタッフ | tenant-staff | 日常業務。注文処理、ハンドオフ対応 |

---

## 2. ナビゲーション表示マトリクス

### 2.1 管理画面サイドバー

| メニュー | パス | superadmin | オーナー | マネージャー | スタッフ |
|:--|:--|:--:|:--:|:--:|:--:|
| ダッシュボード | /admin | ✅ | ✅ | ✅ | ✅ |
| テナント管理 | /admin/tenants | ✅ | ❌ | ❌ | ❌ |
| メニュー管理 | /admin/menu/items | ✅ | ✅ | ✅ | ❌ |
| デバイス管理 | /admin/devices | ✅ | ✅ | ✅ | ❌ |
| ハンドオフ管理 | /admin/handoff | ✅ | ✅ | ✅ | ✅ |
| 注文モニタ | /admin/orders | ✅ | ✅ | ✅ | ✅ |
| スタッフ管理 | /admin/staff | ✅ | ✅ | ✅ | ❌ |
| ETA設定 | /admin/settings/eta | ✅ | ✅ | ❌ | ❌ |
| Webhook設定 | /admin/settings/webhooks | ✅ | ✅ | ❌ | ❌ |
| ロール・権限 | /admin/settings/roles | ✅ | ✅ | ❌ | ❌ |
| 通知管理 | /admin/notifications | ✅ | ✅ | ✅ | ✅ |

### 2.2 対応する権限コード

| メニュー | 必要な権限コード |
|:--|:--|
| ダッシュボード | (なし — 全ロール) |
| テナント管理 | `system:tenants:manage` |
| メニュー管理 | `hotel-saas:menu:read` |
| デバイス管理 | `hotel-saas:devices:read` |
| ハンドオフ管理 | (なし — 全ロール) |
| 注文モニタ | (なし — 全ロール) |
| スタッフ管理 | `hotel-saas:staff:read` |
| ETA設定 | `hotel-saas:settings:write` |
| Webhook設定 | `hotel-saas:settings:write` |
| ロール・権限 | `hotel-saas:roles:write` |
| 通知管理 | (なし — 全ロール) |

---

## 3. APIアクセス制御マトリクス

| APIパス | メソッド | superadmin | オーナー | マネージャー | スタッフ |
|:--|:--|:--:|:--:|:--:|:--:|
| /api/v1/admin/auth/* | ALL | ✅ | ✅ | ✅ | ✅ |
| /api/v1/admin/tenants | GET/POST | ✅ | ❌ | ❌ | ❌ |
| /api/v1/admin/menu/* | ALL | ✅ | ✅ | ✅ | ❌ |
| /api/v1/admin/devices/* | ALL | ✅ | ✅ | ✅ | ❌ |
| /api/v1/admin/handoff/* | ALL | ✅ | ✅ | ✅ | ✅ |
| /api/v1/admin/orders/* | GET | ✅ | ✅ | ✅ | ✅ |
| /api/v1/admin/orders/* | PUT | ✅ | ✅ | ✅ | ✅ |
| /api/v1/admin/staff | GET | ✅ | ✅ | ✅ | ❌ |
| /api/v1/admin/staff | POST/PUT/DELETE | ✅ | ✅ | ✅ | ❌ |
| /api/v1/admin/roles/* | ALL | ✅ | ✅ | ❌ | ❌ |
| /api/v1/admin/permissions | GET | ✅ | ✅ | ❌ | ❌ |
| /api/v1/admin/eta/* | ALL | ✅ | ✅ | ❌ | ❌ |
| /api/v1/admin/webhooks/* | ALL | ✅ | ✅ | ❌ | ❌ |
| /api/v1/admin/dashboard/* | GET | ✅ | ✅ | ✅ | ✅ |
| /api/v1/admin/notifications/* | ALL | ✅ | ✅ | ✅ | ✅ |
| /api/v1/admin/media/* | ALL | ✅ | ✅ | ✅ | ❌ |

---

## 4. 実装方針

### 4.1 セッションAPIの拡張
`/api/v1/admin/auth/session` のレスポンスに以下を追加:
```json
{
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "オーナー",
    "permissions": ["hotel-saas:menu:read", "hotel-saas:staff:read", ...]
  }
}
```

### 4.2 フロントエンド制御
`layouts/admin.vue` で `v-if` による表示制御:
```vue
<v-list-item v-if="hasPermission('system:tenants:manage')" to="/admin/tenants">
```

### 4.3 バックエンド制御
既存の `requirePermission` ミドルウェアをルートに適用:
```typescript
router.get('/staff', requirePermission('hotel-saas:staff:read'), handler)
```

---

## 改訂履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2026-03-31 | 1.0.0 | 初版: ロール×ナビゲーション表示制御マトリクス |
