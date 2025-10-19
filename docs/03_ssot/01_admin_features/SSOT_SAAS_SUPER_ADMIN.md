# 🔐 SSOT: スーパーアドミン機能

**Doc-ID**: SSOT-SAAS-SUPER-ADMIN-001  
**バージョン**: 2.0.1  
**作成日**: 2025年10月7日  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: Iza（統合管理者）

**関連SSOT**:
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤（技術的仕組み）
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - スタッフログイン認証
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - データベーススキーマ
- [SSOT_PRODUCTION_PARITY_RULES.md](../00_foundation/SSOT_PRODUCTION_PARITY_RULES.md) - 本番同等ルール

---

## 📋 目次

1. [概要](#概要)
2. [必須要件（CRITICAL）](#必須要件critical)
3. [SSOTに準拠しないと発生する問題](#ssoに準拠しないと発生する問題)
4. [スーパーアドミンの定義](#スーパーアドミンの定義)
5. [主要機能](#主要機能)
6. [データベース設計](#データベース設計)
7. [API仕様](#api仕様)
8. [フロントエンド実装](#フロントエンド実装)
9. [セキュリティ](#セキュリティ)
10. [既存実装状況](#既存実装状況)
11. [実装チェックリスト](#実装チェックリスト)

---

## 📋 概要

### 目的
システム全体の基幹設定を管理するための総合管理画面の完全な仕様を定義する。

### 適用範囲
- スーパーアドミン認証
- テナント管理（CRUD）
- 料金プラン管理（動的編集）
- AI管理機能
- 使用量モニタリング
- アラート機能
- システム全体設定

### 対象ユーザー
- **システム管理者**（我々）
- **スーパーアドミン権限を持つユーザー**

### 技術スタック
- **フロントエンド**: Vue 3 + Nuxt 3 + TypeScript
- **バックエンド**: Express + TypeScript (hotel-common)
- **データベース**: PostgreSQL + Prisma
- **認証**: Session認証（Redis + HttpOnly Cookie）
- **アクセス方法**: 独立したサブドメインまたは特別なパス（`/admin/super-admin`）

---

## ⚠️ 必須要件（CRITICAL）

### 1. スーパーアドミン専用認証

**スーパーアドミンは通常のスタッフ認証とは完全に分離すること。**

#### 正しい実装
- ✅ `super_admin_users`テーブルで管理
- ✅ 専用の認証エンドポイント（`/api/v1/super-admin/auth/login`）
- ✅ 2FA必須
- ✅ IPホワイトリスト対応
- ✅ セッションタイムアウト: 15分

#### 禁止事項
- ❌ `staff`テーブルでスーパーアドミンを管理
- ❌ 通常のスタッフログインAPIを使用
- ❌ 2FAなしでのログイン許可

---

### 2. 全テナントアクセス権限

**スーパーアドミンは全テナントのデータにアクセス可能。**

#### 実装要件
```typescript
// スーパーアドミン判定
if (req.user.role === 'super_admin') {
  // テナントIDフィルタを適用しない
  const tenants = await prisma.tenant.findMany();
} else {
  // 通常のスタッフはテナントIDフィルタ必須
  const tenantId = req.user.tenant_id;
  if (!tenantId) {
    throw new Error('Tenant ID required');
  }
}
```

---

### 3. 本番同等実装

**開発環境と本番環境で同じ実装を保証すること。**

#### 禁止パターン
```typescript
// ❌ 絶対禁止
const tenantId = user.tenant_id || 'default';

// ❌ 環境分岐
if (process.env.NODE_ENV === 'development') {
  // 開発環境だけの実装
}
```

#### 正しい実装
```typescript
// ✅ 正しい
const tenantId = user.tenant_id;
if (!tenantId && user.role !== 'super_admin') {
  throw createError({
    statusCode: 400,
    message: 'Tenant ID required'
  });
}
```

**参照**: [SSOT_PRODUCTION_PARITY_RULES.md](../00_foundation/SSOT_PRODUCTION_PARITY_RULES.md)

---

## ❌ SSOTに準拠しないと発生する問題

### 🔴 問題1: 通常スタッフがスーパーアドミン機能にアクセス

**症状**: 権限のないスタッフが全テナントのデータを閲覧・編集できてしまう

**原因**: 
```typescript
// ❌ 間違った実装
if (req.user) {
  // 全ユーザーがアクセス可能
  const tenants = await prisma.tenant.findMany();
}
```

**対応策（SSOTに記載済み）**:
```typescript
// ✅ 正しい実装
if (req.user.role !== 'super_admin') {
  throw createError({
    statusCode: 403,
    message: 'Super admin access required'
  });
}
```

---

### 🔴 問題2: プラン変更時のデータ整合性エラー

**症状**: プラン変更後、テナントが機能制限を超えて使用できてしまう

**原因**: プラン変更時に既存データの検証を行っていない

**対応策（SSOTに記載済み）**:
```typescript
// プラン変更前に使用状況を確認
const currentUsage = await getTenantUsage(tenantId);
if (currentUsage.deviceCount > newPlan.maxDevices) {
  throw new Error('Current device count exceeds new plan limit');
}
```

---

## 🎯 スーパーアドミンの定義

### 役割
システム全体の統括管理を行う最高権限ユーザー

### 主要権限

#### 1. システム管理
- AIモデル設定・価格調整
- 為替レート設定
- システム全体の設定変更

#### 2. テナント管理
- 全テナントの監視・管理
- テナント作成・編集・削除
- プラン変更・課金設定
- システム利用状況分析

#### 3. プラン管理
- 料金プランの作成・編集・削除
- 機能制限の動的変更
- プラン適用・変更

#### 4. AI管理
- AIモデル管理
- クレジット管理
- AI使用統計

#### 5. 使用量モニタリング
- テナントごとの使用状況
- リアルタイムダッシュボード
- トレンド分析

#### 6. アラート管理
- 使用量上限アラート
- セキュリティアラート
- システムエラー通知

#### 7. ログ管理
- システムログ閲覧
- サーバーログ閲覧
- ログ検索・分析
- エラー調査支援

#### 8. AIプロンプト管理 ⭐ **重要**
- システムプロンプト管理
- 業態別プロンプト設定
- 言語別プロンプト設定
- 機能別プロンプト設定
- プロンプトバージョン管理

#### 9. システム全体設定
- メンテナンスモード
- グローバル設定
- APIレート制限
- セッションタイムアウト

#### 10. 為替レート管理
- 通貨レート設定
- 自動更新設定
- 履歴管理

#### 11. 通知テンプレート管理
- メール通知テンプレート
- Slack通知テンプレート
- SMS通知テンプレート

#### 12. バックアップ・復元
- データベースバックアップ
- テナントデータエクスポート/インポート
- 設定バックアップ/復元

#### 13. 監査ログ閲覧
- スーパーアドミン操作履歴
- テナント管理操作履歴
- プラン変更履歴
- セキュリティイベント

#### 14. システムヘルスチェック
- データベース接続状態
- Redis接続状態
- 各システム稼働状態
- APIレスポンスタイム
- エラー発生率

#### 15. 技術管理
- データベース管理
- セキュリティ設定
- バックアップ・復旧

### アクセス可能エリア
```
/admin/super-admin/*        # スーパーアドミン専用エリア
  ├─ /dashboard             # ダッシュボード
  ├─ /tenants/*             # テナント管理
  ├─ /plans/*               # プラン管理
  ├─ /ai/*                  # AI管理
  ├─ /usage/*               # 使用量監視
  ├─ /alerts/*              # アラート管理
  ├─ /logs/*                # ログ管理
  ├─ /prompts/*             # AIプロンプト管理
  ├─ /exchange-rates/*      # 為替レート管理
  ├─ /notification-templates/* # 通知テンプレート管理
  ├─ /backup/*              # バックアップ・復元
  ├─ /audit-logs/*          # 監査ログ閲覧
  ├─ /health/*              # システムヘルスチェック
  └─ /settings/*            # システム設定
```

---

## 📊 主要機能

### 1. テナント管理機能

#### テナントCRUD

**テナント作成**:
- ウィザード形式のUI
- 基本情報入力（名前、ドメイン、連絡先）
- プラン選択
- 初期設定
- 確認・作成

**テナント編集**:
- 基本情報の更新
- プラン変更
- ステータス変更（active/suspended/deleted）

**テナント削除**:
- 論理削除（`is_deleted = true`）
- 削除前の確認ダイアログ
- 削除理由の記録

#### テナント状態管理

| 状態 | 説明 | 動作 |
|-----|------|------|
| `active` | 有効 | 全機能利用可能 |
| `suspended` | 一時停止 | ログイン不可、データ保持 |
| `deleted` | 削除済み | アクセス不可、データ保持（復元可能） |

---

### 2. 料金プラン管理機能

#### プランマスター管理

**プラン定義**:
```typescript
interface Plan {
  id: string
  systemType: 'hotel-saas' | 'hotel-pms' | 'hotel-member'
  businessType: 'leisure' | 'omotenasuai'
  planType: 'economy' | 'professional' | 'enterprise'
  planCategory: string
  
  // 料金設定
  monthlyPrice: number
  additionalDeviceCost: number
  roomTerminalCost: number
  frontDeskCost: number
  kitchenCost: number
  barCost: number
  housekeepingCost: number
  managerCost: number
  commonAreaCost: number
  multilingualUpgradePrice: number
  
  // 数値制限
  maxDevices: number
  maxMonthlyOrders: number
  maxMonthlyAiRequests: number
  maxStorageGB: number
  
  // 機能フラグ（ON/OFF制御）
  enableAiConcierge: boolean
  enableMultilingual: boolean
  enableLayoutEditor: boolean
  enableFacilityGuide: boolean
  enableAiBusinessSupport: boolean
  
  // メタ情報
  displayName: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

**重要**: 既存の`system_plan_restrictions`テーブルを使用

**参照**: [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - `system_plan_restrictions`テーブル定義

---

#### プラン作成

**UI画面**: `/admin/super-admin/plans/create`

**入力項目**:

1. **基本情報**
   - システム種別（hotel-saas/hotel-pms/hotel-member）
   - 業態種別（leisure/omotenasuai）
   - プラン種別（economy/professional/enterprise）
   - プランカテゴリ（細分化用）
   - 表示名
   - 説明文

2. **料金設定**
   - 月額基本料金
   - 追加デバイス料金
   - 端末種別ごとの料金
     - 客室端末
     - フロント端末
     - キッチン端末
     - バー端末
     - 清掃端末
     - マネージャー端末
     - 共用エリア端末
   - 多言語アップグレード料金

3. **数値制限設定**
   - 最大デバイス数
   - 月間最大注文数
   - 月間最大AIリクエスト数
   - 最大ストレージ容量（GB）

4. **機能制御設定**（ON/OFF切り替え）
   - AIコンシェルジュ機能
   - 多言語機能
   - レイアウトエディタ
   - 施設ガイド機能
   - AIビジネスサポート

**バリデーション**:
- 同一の`systemType + businessType + planType + planCategory`の組み合わせは不可
- 月額料金は0円以上
- 数値制限は0以上
- 表示名・説明文は必須

**作成フロー**:
```
1. 基本情報入力
   ↓
2. 料金設定
   ↓
3. 数値制限設定
   ↓
4. 機能制御設定
   ↓
5. プレビュー確認
   ↓
6. 作成実行
   ↓
7. 完了通知
```

---

#### プラン編集（動的機能制御）

**UI画面**: `/admin/super-admin/plans/[id]/edit`

**編集可能項目**:

1. **料金設定の変更**
   - 月額料金の調整
   - 各種端末料金の調整
   - 即座に全テナントに反映

2. **数値制限の動的変更**
   - デバイス数上限の変更
   - 注文数上限の変更
   - AIリクエスト数上限の変更
   - ストレージ上限の変更

3. **機能フラグの動的ON/OFF**
   - AIコンシェルジュ機能の有効化/無効化
   - 多言語機能の有効化/無効化
   - レイアウトエディタの有効化/無効化
   - 施設ガイド機能の有効化/無効化
   - AIビジネスサポートの有効化/無効化

**重要な仕様**:

1. **即時反映**
   - プラン設定変更後、即座に全テナントに反映
   - キャッシュのクリア（Redis）
   - テナントへの通知（オプション）

2. **既存テナントへの影響確認**
   - 変更前に影響を受けるテナント数を表示
   - 制限値を下げる場合の警告表示
   - 機能を無効化する場合の影響範囲表示

3. **ダウングレード時の動作**
   - **デバイス数削減**: 超過分のデバイスを自動無効化（最終ログイン日時が古い順）
   - **注文数削減**: 新規注文を制限、既存注文は保持
   - **AI機能無効化**: 既存のAI設定は保持、新規リクエストを拒否
   - **ストレージ削減**: 新規アップロードを制限、既存ファイルは保持

4. **アップグレード時の動作**
   - 即座に新機能が利用可能
   - 無効化されていたデバイスを再有効化
   - 制限が緩和されたことをテナントに通知

**編集フロー**:
```
1. プラン選択
   ↓
2. 現在の設定確認
   ↓
3. 変更内容入力
   ↓
4. 影響を受けるテナント確認
   ├─ 影響なし → 即座に適用
   └─ 影響あり → 警告表示
       ↓
5. 確認ダイアログ
   ├─ 「このプランを使用している〇〇件のテナントに影響します」
   ├─ 「デバイス数超過: △△件のテナント」
   └─ 「機能無効化: ××件のテナント」
       ↓
6. 適用実行
   ↓
7. テナントへの通知（オプション）
   ↓
8. 完了
```

**UI表示例**:

```
┌─────────────────────────────────────────────┐
│ プラン編集: エコノミープラン（レジャー向け）│
├─────────────────────────────────────────────┤
│                                             │
│ 【数値制限】                                │
│ ┌─────────────────────────────────────┐    │
│ │ 最大デバイス数: [30] → [50]         │    │
│ │ 影響: 5件のテナントで制限が緩和     │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ 【機能制御】                                │
│ ┌─────────────────────────────────────┐    │
│ │ AIコンシェルジュ: [OFF] → [ON]      │    │
│ │ 影響: 120件のテナントで機能が有効化 │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ レイアウトエディタ: [ON] → [OFF]    │    │
│ │ ⚠️ 警告: 80件のテナントで機能が     │    │
│ │         無効化されます               │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [キャンセル]  [プレビュー]  [適用]         │
└─────────────────────────────────────────────┘
```

---

#### プラン削除

**UI画面**: `/admin/super-admin/plans/[id]`

**削除方式**: 論理削除（`is_deleted = true`）

**削除条件**:
- ✅ 使用中のテナントがいない場合のみ削除可能
- ❌ 1件でもテナントが使用している場合は削除不可

**削除前チェック**:
```typescript
// 使用中テナント数を確認
const tenantCount = await prisma.tenantSystemPlan.count({
  where: { planId: planId }
});

if (tenantCount > 0) {
  throw new Error(`このプランは${tenantCount}件のテナントが使用中のため削除できません`);
}
```

**削除フロー**:
```
1. プラン選択
   ↓
2. 削除ボタンクリック
   ↓
3. 使用中テナント確認
   ├─ 使用中 → エラー表示（削除不可）
   └─ 未使用 → 確認ダイアログ
       ↓
4. 削除理由入力（任意）
   ↓
5. 削除実行（論理削除）
   ↓
6. 完了
```

#### プラン変更フロー

```
1. テナント選択
   ↓
2. 現在のプラン確認
   ↓
3. 新しいプラン選択
   ↓
4. 使用状況確認（制限超過チェック）
   ↓
5. 影響確認（ダウングレード時）
   ↓
6. 確認・適用
   ↓
7. テナントに通知
```

**ダウングレード時の注意**:
- デバイス数超過の場合、超過分を無効化
- AI機能無効化の場合、既存のAI設定を保持
- ストレージ超過の場合、アップロード制限

---

### 3. AI管理機能

#### AIモデル管理

**利用可能なモデル**:
- GPT-4
- GPT-3.5-turbo
- Claude 3
- その他

**モデル設定**:
- temperature
- max_tokens
- top_p
- frequency_penalty
- presence_penalty

**モデルごとのコスト設定**:
```typescript
interface ModelCost {
  modelName: string
  inputTokenCost: number   // 1000トークンあたりの料金
  outputTokenCost: number  // 1000トークンあたりの料金
  currency: 'USD' | 'JPY'
}
```

#### クレジット管理

**クレジット割り当て**:
- テナントごとのクレジット設定
- 月次自動補充
- 手動補充

**クレジット消費**:
- AIリクエストごとに消費
- トークン数ベースの計算
- 消費履歴の記録

**クレジット残高確認**:
- リアルタイム残高表示
- 消費予測
- アラート設定（残高10%以下）

#### AI使用統計

**テナントごとの使用量**:
- 総リクエスト数
- 総トークン数
- モデル別使用量
- コスト分析

**異常検知**:
- 急激な使用量増加
- 異常なリクエストパターン
- 不正利用の疑い

---

### 4. 使用量モニタリング機能

#### 監視項目

| 項目 | 説明 | 制限値 |
|-----|------|--------|
| デバイス数 | 登録済みデバイス数 | プランごとに設定 |
| 注文数 | 月間注文数 | プランごとに設定 |
| AI使用量 | 月間AIトークン数 | プランごとに設定 |
| ストレージ使用量 | 画像・動画の合計サイズ | プランごとに設定 |
| API呼び出し数 | 月間API呼び出し数 | プランごとに設定 |

#### リアルタイムダッシュボード

**全体概要**:
- 全テナントの使用状況
- 制限値に対する使用率
- トレンドグラフ
- コスト予測

**テナント別詳細**:
- 使用量の推移
- 制限値との比較
- 異常検知
- アラート履歴

---

### 5. アラート機能

#### アラート種類

| アラート種類 | 説明 | 重要度 |
|------------|------|--------|
| `usage_limit` | 使用量上限到達（90%、100%） | High |
| `security` | セキュリティアラート | Critical |
| `payment` | 支払い遅延 | High |
| `system_error` | システムエラー | Medium |
| `anomaly` | 異常な使用パターン | Medium |

#### 通知方法

**メール通知**:
- テナント管理者に送信
- スーパーアドミンに送信

**Slack通知**:
- 専用チャンネルに投稿
- メンション機能

**SMS通知**（緊急時のみ）:
- Critical レベルのアラート
- システムダウン時

**管理画面内通知**:
- ベルアイコンで通知
- 未読件数表示

#### アラート設定

**閾値設定**:
- 使用量90%でWarning
- 使用量100%でCritical

**通知先設定**:
- メールアドレス
- Slack Webhook URL
- 電話番号（SMS用）

**通知頻度設定**:
- 即時通知
- 1時間ごと
- 1日1回

---

### 6. ログ管理機能

#### 目的
各ホテル（テナント）のシステムログ・サーバーログを一元管理し、エラー調査・サポート対応を効率化する。

#### アラート管理との違い

| 項目 | アラート管理 | ログ管理 |
|-----|------------|---------|
| **目的** | 異常検知→即座の通知→対応促進 | 詳細な履歴保存→事後分析→根本原因調査 |
| **重点** | リアルタイム性 | 網羅性・検索性 |
| **運用** | 今すぐ対応が必要な問題を通知 | 過去に何が起きたかを詳細に追跡 |
| **技術** | 閾値監視、ルールベース、通知配信 | ログ収集、長期保存、全文検索、フィルタリング |

#### 主要機能

**システムログ閲覧**:
- hotel-saas
- hotel-pms
- hotel-member
- hotel-common

**サーバーログ閲覧**:
- Nginx
- PM2
- PostgreSQL
- Redis

**ログ検索・フィルタリング**:
- テナント別フィルタ
- 日時範囲指定
- ログレベル（error/warn/info/debug）
- キーワード検索
- サービス別フィルタ

**ログダウンロード**:
- CSV形式
- JSON形式
- 期間指定エクスポート

**ログ保持期間設定**:
- テナント別設定
- デフォルト: 90日間
- 重要ログ: 1年間

#### ログレベル定義

| レベル | 説明 | 用途 |
|-------|------|------|
| `error` | エラー | システムエラー、例外、障害 |
| `warn` | 警告 | 潜在的な問題、非推奨機能の使用 |
| `info` | 情報 | 通常の動作、重要なイベント |
| `debug` | デバッグ | 開発・デバッグ用の詳細情報 |

#### ログコンテキスト情報

**システムログ**:
- エラースタック
- リクエスト情報（URL、メソッド、パラメータ）
- ユーザー情報（ID、テナントID）
- IPアドレス
- User Agent
- タイムスタンプ

**サーバーログ**:
- サーバー種別
- プロセスID
- メモリ使用量
- CPU使用率
- タイムスタンプ

---

### 7. AIプロンプト管理機能 ⭐ **最重要**

#### 目的
AIコンシェルジュの応答品質を動的に調整し、ホテルの業態や言語に応じた最適なプロンプトを提供する。

#### プロンプトの階層構造

```
システムプロンプト（全テナント共通）
  ↓
業態別プロンプト（leisure/omotenasuai）
  ↓
言語別プロンプト（ja/en/zh/ko等）
  ↓
機能別プロンプト（order/facility/tourism等）
  ↓
テナント別オーバーライド（個別カスタマイズ）
```

**優先順位**: テナント別 > 機能別 > 言語別 > 業態別 > システム

---

#### プロンプト種別

##### 1. システムプロンプト（全テナント共通）

**用途**: 全AIコンシェルジュの基本動作を定義

**内容例**:
```
あなたはホテルのAIコンシェルジュです。
以下のルールを厳守してください：
1. 丁寧で親しみやすい言葉遣いを心がける
2. お客様の要望を正確に理解し、適切な提案を行う
3. 不明な点は確認し、推測で回答しない
4. プライバシーに配慮し、個人情報を適切に扱う
5. ホテルのブランドイメージを損なわない対応を心がける
```

**管理項目**:
- プロンプト本文
- 有効/無効フラグ
- バージョン番号
- 作成日時・更新日時
- 作成者・更新者

---

##### 2. 業態別プロンプト

**業態種別**:
- `leisure`: レジャーホテル向け
- `omotenasuai`: おもてなすAI向け

**レジャーホテル向けプロンプト例**:
```
このホテルはカップル向けのレジャーホテルです。
以下の点に特に注意してください：
1. プライバシーを最重視する
2. ロマンティックな雰囲気を大切にする
3. 特別な記念日のサポートを積極的に提案する
4. 客室内サービス（ルームサービス、アメニティ等）を充実させる
5. 周辺の観光スポットやデートスポットを提案する
```

**おもてなすAI向けプロンプト例**:
```
このホテルは高品質なおもてなしを提供するホテルです。
以下の点に特に注意してください：
1. 最高級のホスピタリティを提供する
2. お客様一人ひとりに合わせたパーソナライズされた対応
3. 日本の伝統的なおもてなしの心を大切にする
4. 細やかな気配りと先回りしたサービス提案
5. 文化的な背景を考慮した対応
```

---

##### 3. 言語別プロンプト

**対応言語**:
- `ja`: 日本語
- `en`: 英語
- `zh`: 中国語（簡体字）
- `zh-TW`: 中国語（繁体字）
- `ko`: 韓国語

**言語別の注意事項**:
```typescript
{
  ja: "敬語を適切に使用し、丁寧な日本語で対応してください。",
  en: "Use polite and professional English. Avoid slang or overly casual expressions.",
  zh: "使用礼貌和专业的中文。注意文化差异，提供适合中国客人的服务建议。",
  ko: "정중하고 전문적인 한국어를 사용하세요. 문화적 차이를 고려하여 대응하세요."
}
```

---

##### 4. 機能別プロンプト

**機能種別**:
- `order`: 注文受付（ルームサービス、飲食注文）
- `facility`: 施設案内（館内施設、設備説明）
- `tourism`: 観光案内（周辺観光スポット、交通案内）
- `concierge`: コンシェルジュ（予約代行、手配）
- `housekeeping`: ハウスキーピング（清掃依頼、アメニティ追加）
- `checkout`: チェックアウト（精算、荷物預かり）

**注文受付プロンプト例**:
```
お客様からの注文を受け付けます。
以下の手順で対応してください：
1. 注文内容を正確に確認する
2. 数量、オプション、アレルギー情報を確認する
3. 提供時間の希望を確認する
4. 注文内容を復唱して確認する
5. 注文を確定し、提供予定時刻を伝える
```

**施設案内プロンプト例**:
```
ホテルの施設についてご案内します。
以下の情報を提供してください：
1. 施設の場所（フロア、部屋番号）
2. 営業時間・利用可能時間
3. 利用方法・注意事項
4. 料金（有料の場合）
5. 予約の必要性
```

---

#### プロンプト管理機能

##### プロンプト作成

**UI画面**: `/admin/super-admin/prompts/create`

**入力項目**:
1. **基本情報**
   - プロンプト名
   - プロンプト種別（system/business/language/function）
   - 対象業態（leisure/omotenasuai）※業態別の場合
   - 対象言語（ja/en/zh/ko）※言語別の場合
   - 対象機能（order/facility/tourism等）※機能別の場合

2. **プロンプト内容**
   - プロンプト本文（Markdown対応）
   - 変数埋め込み可能（`{{hotelName}}`, `{{customerName}}`等）

3. **メタ情報**
   - 説明文
   - タグ（検索用）
   - 有効/無効フラグ

**バリデーション**:
- プロンプト本文は必須
- 同一の種別・対象の組み合わせは1つのみ
- 変数の構文チェック

---

##### プロンプト編集

**UI画面**: `/admin/super-admin/prompts/[id]/edit`

**編集可能項目**:
- プロンプト本文
- 説明文
- タグ
- 有効/無効フラグ

**重要な仕様**:

1. **バージョン管理**
   - 編集時に自動的に新バージョンを作成
   - 過去のバージョンを保持（最大100バージョン）
   - バージョン間の差分表示
   - 過去バージョンへのロールバック可能

2. **変更履歴**
   - 変更日時
   - 変更者
   - 変更内容（diff形式）
   - 変更理由（任意）

3. **即時反映**
   - プロンプト更新後、即座に全テナントに反映
   - Redisキャッシュのクリア
   - 実行中のAIセッションは次回リクエストから適用

---

##### プロンプトプレビュー

**機能**: 実際のAI応答をテスト

**UI画面**: `/admin/super-admin/prompts/[id]/preview`

**機能詳細**:
1. テスト用の入力を送信
2. 選択したプロンプトでAI応答を生成
3. 応答内容を確認
4. 複数パターンのテストが可能

**テスト項目**:
- 業態別の応答の違い
- 言語別の応答の違い
- 機能別の応答の違い
- 変数埋め込みの動作確認

---

##### プロンプトテンプレート

**用途**: よく使うプロンプトパターンを保存

**テンプレート例**:
- 丁寧な接客プロンプト
- カジュアルな接客プロンプト
- 多言語対応プロンプト
- 業態別プロンプト

**機能**:
- テンプレートから新規プロンプト作成
- テンプレートの共有
- テンプレートのインポート/エクスポート

---

#### プロンプト変数

**利用可能な変数**:
```typescript
{
  // ホテル情報
  hotelName: string,           // ホテル名
  hotelAddress: string,        // ホテル住所
  hotelPhone: string,          // ホテル電話番号
  
  // お客様情報
  customerName: string,        // お客様名
  roomNumber: string,          // 客室番号
  checkInDate: string,         // チェックイン日
  checkOutDate: string,        // チェックアウト日
  
  // 現在時刻
  currentTime: string,         // 現在時刻
  currentDate: string,         // 現在日付
  
  // 言語
  language: string,            // 言語コード（ja/en/zh/ko）
  
  // 業態
  businessType: string         // 業態（leisure/omotenasuai）
}
```

**使用例**:
```
いらっしゃいませ、{{hotelName}}へようこそ。
{{customerName}}様、{{roomNumber}}号室でございますね。
本日は{{currentDate}}でございます。
何かご用命がございましたら、お気軽にお申し付けください。
```

---

### 8. システム全体設定

#### グローバル設定

**デフォルトプラン設定**:
- 新規テナント作成時のデフォルトプラン

**システム全体の機能ON/OFF**:
- AI機能の有効/無効
- 多言語機能の有効/無効
- レイアウトエディタの有効/無効

**メンテナンスモード**:
- 全テナントのアクセス制限
- メンテナンス画面表示
- スーパーアドミンのみアクセス可能

**APIレート制限**:
- テナントごとのレート制限
- IPごとのレート制限

#### セキュリティ設定

**パスワードポリシー**:
- 最小文字数
- 複雑さ要件
- 有効期限

**セッションタイムアウト**:
- スーパーアドミン: 15分
- 通常スタッフ: 1時間

**IPホワイトリスト**:
- スーパーアドミンアクセス制限
- 許可IPアドレスリスト

**2FA強制**:
- スーパーアドミンは2FA必須
- 通常スタッフは任意

---

## 🗄️ データベース設計

### 既存テーブル（マルチテナントSSOTで定義済み）

#### `tenants`
- スーパーアドミンから管理
- 詳細: [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md)

#### `system_plan_restrictions`
- スーパーアドミンから動的に編集可能
- 詳細: [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md)

#### `tenant_system_plan`
- テナント×プランの紐付け
- 詳細: [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md)

---

### 新規テーブル（スーパーアドミン専用）

#### `super_admin_users`

**Prismaスキーマ**:
```prisma
model SuperAdminUser {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String    @map("password_hash")
  name              String
  role              String    // 'super_admin', 'admin'
  isActive          Boolean   @default(true) @map("is_active")
  twoFactorSecret   String?   @map("two_factor_secret")
  twoFactorEnabled  Boolean   @default(false) @map("two_factor_enabled")
  lastLoginAt       DateTime? @map("last_login_at")
  lastLoginIp       String?   @map("last_login_ip")
  failedLoginCount  Int       @default(0) @map("failed_login_count")
  lockedUntil       DateTime? @map("locked_until")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  @@index([email])
  @@index([isActive])
  @@map("super_admin_users")
}
```

**重要フィールド**:
- `twoFactorSecret`: TOTP秘密鍵
- `twoFactorEnabled`: 2FA有効フラグ
- `failedLoginCount`: ログイン失敗回数（5回で30分ロック）
- `lockedUntil`: ロック解除日時

---

#### `tenant_usage_logs`

**Prismaスキーマ**:
```prisma
model TenantUsageLog {
  id                String    @id @default(uuid())
  tenantId          String    @map("tenant_id")
  date              DateTime  @db.Date
  deviceCount       Int       @map("device_count")
  orderCount        Int       @map("order_count")
  aiTokenCount      Int       @map("ai_token_count")
  storageGb         Float     @map("storage_gb")
  apiCallCount      Int       @map("api_call_count")
  createdAt         DateTime  @default(now()) @map("created_at")
  
  tenant            Tenant    @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, date], map: "uniq_tenant_date")
  @@index([tenantId])
  @@index([date])
  @@map("tenant_usage_logs")
}
```

**データ収集**:
- 日次バッチで集計
- リアルタイム更新（オプション）

---

#### `ai_credit_transactions`

**Prismaスキーマ**:
```prisma
model AiCreditTransaction {
  id                String    @id @default(uuid())
  tenantId          String    @map("tenant_id")
  amount            Int       // クレジット量（正：追加、負：消費）
  type              String    // 'allocation', 'consumption', 'refund'
  description       String?
  modelName         String?   @map("model_name")
  tokenCount        Int?      @map("token_count")
  requestId         String?   @map("request_id")
  createdAt         DateTime  @default(now()) @map("created_at")
  
  tenant            Tenant    @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([type])
  @@index([createdAt])
  @@map("ai_credit_transactions")
}
```

**トランザクション種類**:
- `allocation`: クレジット割り当て
- `consumption`: クレジット消費
- `refund`: クレジット返金

---

#### `system_alerts`

**Prismaスキーマ**:
```prisma
model SystemAlert {
  id                String    @id @default(uuid())
  tenantId          String?   @map("tenant_id")  // nullの場合はシステム全体のアラート
  alertType         String    @map("alert_type")  // 'usage_limit', 'security', 'payment', etc.
  severity          String    // 'low', 'medium', 'high', 'critical'
  title             String
  message           String
  metadata          Json?     // 追加情報
  isResolved        Boolean   @default(false) @map("is_resolved")
  resolvedAt        DateTime? @map("resolved_at")
  resolvedBy        String?   @map("resolved_by")
  createdAt         DateTime  @default(now()) @map("created_at")
  
  tenant            Tenant?   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([alertType])
  @@index([severity])
  @@index([isResolved])
  @@index([createdAt])
  @@map("system_alerts")
}
```

**重要度**:
- `low`: 情報レベル
- `medium`: 注意レベル
- `high`: 警告レベル
- `critical`: 緊急レベル

---

#### `super_admin_audit_logs`

**Prismaスキーマ**:
```prisma
model SuperAdminAuditLog {
  id                String    @id @default(uuid())
  adminId           String    @map("admin_id")
  action            String    // 'create', 'update', 'delete', 'login', etc.
  targetType        String    @map("target_type")  // 'tenant', 'plan', 'alert', etc.
  targetId          String?   @map("target_id")
  beforeData        Json?     @map("before_data")
  afterData         Json?     @map("after_data")
  ipAddress         String    @map("ip_address")
  userAgent         String    @map("user_agent")
  createdAt         DateTime  @default(now()) @map("created_at")
  
  @@index([adminId])
  @@index([action])
  @@index([targetType])
  @@index([createdAt])
  @@map("super_admin_audit_logs")
}
```

**監査対象**:
- 全操作を記録
- 変更前後の値を保存
- 操作者の記録
- IPアドレス・User Agent

---

#### `system_logs`

**Prismaスキーマ**:
```prisma
model SystemLog {
  id          String    @id @default(uuid())
  tenantId    String?   @map("tenant_id")  // nullの場合はシステム全体のログ
  service     String    // 'hotel-saas' | 'hotel-pms' | 'hotel-member' | 'hotel-common'
  level       String    // 'error' | 'warn' | 'info' | 'debug'
  message     String    @db.Text
  context     Json?     // エラースタック、リクエスト情報等
  userId      String?   @map("user_id")     // 関連ユーザー（あれば）
  ipAddress   String?   @map("ip_address")
  userAgent   String?   @map("user_agent")
  timestamp   DateTime  @default(now())
  
  tenant      Tenant?   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId, timestamp])
  @@index([service, level, timestamp])
  @@index([level, timestamp])
  @@map("system_logs")
}
```

**重要フィールド**:
- `service`: どのシステムからのログか
- `level`: ログレベル（error/warn/info/debug）
- `context`: エラースタック、リクエスト情報等の詳細情報
- `timestamp`: ログ発生日時

---

#### `server_logs`

**Prismaスキーマ**:
```prisma
model ServerLog {
  id          String    @id @default(uuid())
  server      String    // 'nginx' | 'pm2' | 'postgresql' | 'redis'
  level       String    // 'error' | 'warn' | 'info' | 'debug'
  message     String    @db.Text
  context     Json?     // プロセスID、メモリ使用量等
  timestamp   DateTime  @default(now())
  
  @@index([server, level, timestamp])
  @@index([level, timestamp])
  @@map("server_logs")
}
```

**重要フィールド**:
- `server`: どのサーバーからのログか
- `context`: プロセスID、メモリ使用量、CPU使用率等

---

#### `ai_prompts`

**Prismaスキーマ**:
```prisma
model AiPrompt {
  id                String    @id @default(uuid())
  name              String    // プロンプト名
  promptType        String    @map("prompt_type")  // 'system' | 'business' | 'language' | 'function'
  businessType      String?   @map("business_type")  // 'leisure' | 'omotenasuai'
  language          String?   // 'ja' | 'en' | 'zh' | 'zh-TW' | 'ko'
  functionType      String?   @map("function_type")  // 'order' | 'facility' | 'tourism' | 'concierge' | 'housekeeping' | 'checkout'
  content           String    @db.Text  // プロンプト本文
  description       String?   // 説明文
  tags              String[]  // タグ（検索用）
  isActive          Boolean   @default(true) @map("is_active")
  version           Int       @default(1)
  createdBy         String    @map("created_by")
  updatedBy         String    @map("updated_by")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  versions          AiPromptVersion[]
  
  @@unique([promptType, businessType, language, functionType], map: "uniq_prompt_combination")
  @@index([promptType])
  @@index([businessType])
  @@index([language])
  @@index([functionType])
  @@index([isActive])
  @@map("ai_prompts")
}
```

**重要フィールド**:
- `promptType`: プロンプトの種別
- `businessType`: 業態種別（業態別プロンプトの場合）
- `language`: 言語コード（言語別プロンプトの場合）
- `functionType`: 機能種別（機能別プロンプトの場合）
- `content`: プロンプト本文
- `version`: バージョン番号

**ユニーク制約**:
- `promptType + businessType + language + functionType`の組み合わせは1つのみ

---

#### `ai_prompt_versions`

**Prismaスキーマ**:
```prisma
model AiPromptVersion {
  id                String    @id @default(uuid())
  promptId          String    @map("prompt_id")
  version           Int
  content           String    @db.Text
  description       String?
  changeReason      String?   @map("change_reason")  // 変更理由
  createdBy         String    @map("created_by")
  createdAt         DateTime  @default(now()) @map("created_at")
  
  prompt            AiPrompt  @relation(fields: [promptId], references: [id])
  
  @@unique([promptId, version], map: "uniq_prompt_version")
  @@index([promptId])
  @@index([createdAt])
  @@map("ai_prompt_versions")
}
```

**重要フィールド**:
- `promptId`: 元のプロンプトID
- `version`: バージョン番号
- `content`: そのバージョンのプロンプト本文
- `changeReason`: 変更理由

**用途**: プロンプトのバージョン管理、変更履歴の保持

---

#### `exchange_rates`

**Prismaスキーマ**:
```prisma
model ExchangeRate {
  id                String    @id @default(uuid())
  baseCurrency      String    @map("base_currency")  // 基準通貨（JPY）
  targetCurrency    String    @map("target_currency")  // 対象通貨（USD, EUR, CNY等）
  rate              Float     // レート
  source            String?   // データソース（'manual' | 'auto' | 'api_name'）
  effectiveDate     DateTime  @map("effective_date")  // 適用日
  createdBy         String?   @map("created_by")  // 作成者（手動設定の場合）
  createdAt         DateTime  @default(now()) @map("created_at")
  
  @@unique([baseCurrency, targetCurrency, effectiveDate], map: "uniq_exchange_rate")
  @@index([baseCurrency, targetCurrency])
  @@index([effectiveDate])
  @@map("exchange_rates")
}
```

**重要フィールド**:
- `baseCurrency`: 基準通貨（通常はJPY）
- `targetCurrency`: 対象通貨
- `rate`: 為替レート
- `source`: データソース（手動 or 自動）
- `effectiveDate`: 適用日

---

#### `notification_templates`

**Prismaスキーマ**:
```prisma
model NotificationTemplate {
  id                String    @id @default(uuid())
  name              String    // テンプレート名
  templateType      String    @map("template_type")  // 'email' | 'slack' | 'sms'
  category          String    // カテゴリ（'alert' | 'tenant_notification' | 'system'）
  subject           String?   // 件名（メールの場合）
  content           String    @db.Text  // 本文
  variables         String[]  // 利用可能な変数
  isActive          Boolean   @default(true) @map("is_active")
  createdBy         String    @map("created_by")
  updatedBy         String    @map("updated_by")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  @@index([templateType])
  @@index([category])
  @@index([isActive])
  @@map("notification_templates")
}
```

**重要フィールド**:
- `templateType`: 通知種別（email/slack/sms）
- `category`: カテゴリ
- `subject`: 件名（メールの場合）
- `content`: 本文（変数埋め込み可能）
- `variables`: 利用可能な変数リスト

---

#### `system_health_checks`

**Prismaスキーマ**:
```prisma
model SystemHealthCheck {
  id                String    @id @default(uuid())
  checkType         String    @map("check_type")  // 'database' | 'redis' | 'api' | 'service'
  target            String    // チェック対象（'hotel-saas' | 'hotel-pms' | 'hotel-member' | 'hotel-common'）
  status            String    // 'healthy' | 'degraded' | 'down'
  responseTime      Int?      @map("response_time")  // レスポンスタイム（ms）
  errorMessage      String?   @map("error_message")
  metadata          Json?     // 追加情報
  checkedAt         DateTime  @default(now()) @map("checked_at")
  
  @@index([checkType, target])
  @@index([status])
  @@index([checkedAt])
  @@map("system_health_checks")
}
```

**重要フィールド**:
- `checkType`: チェック種別
- `target`: チェック対象
- `status`: ステータス（healthy/degraded/down）
- `responseTime`: レスポンスタイム
- `checkedAt`: チェック日時

**用途**: システムヘルスチェックの履歴保存

---

## 🌐 API仕様

### 認証API

#### POST /api/v1/super-admin/auth/login

**リクエスト**:
```typescript
{
  email: string,
  password: string,
  twoFactorCode?: string  // 2FA有効時は必須
}
```

**レスポンス（成功）**:
```typescript
{
  success: true,
  data: {
    sessionId: string,
    user: {
      id: string,
      email: string,
      name: string,
      role: 'super_admin' | 'admin',
      twoFactorEnabled: boolean
    }
  }
}
```

**Set-Cookie**:
```
super-admin-session-id=<sessionId>; HttpOnly; Secure; SameSite=Strict; Max-Age=900
```

**エラーレスポンス**:
- `401 INVALID_CREDENTIALS`: 認証失敗
- `403 TWO_FACTOR_REQUIRED`: 2FAコード必要
- `403 ACCOUNT_LOCKED`: アカウントロック中

---

### テナント管理API

#### GET /api/v1/super-admin/tenants

**リクエスト**:
```
GET /api/v1/super-admin/tenants?page=1&limit=20&status=active
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    tenants: Array<{
      id: string,
      name: string,
      domain: string,
      planType: string,
      status: 'active' | 'suspended' | 'deleted',
      contactEmail: string,
      createdAt: string,
      updatedAt: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

#### POST /api/v1/super-admin/tenants

**リクエスト**:
```typescript
{
  name: string,
  domain: string,
  planType: string,
  contactEmail: string,
  settings?: object
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    tenant: {
      id: string,
      name: string,
      domain: string,
      planType: string,
      status: 'active',
      contactEmail: string,
      createdAt: string
    }
  }
}
```

**エラーレスポンス**:
- `400 VALIDATION_ERROR`: バリデーションエラー
- `409 DOMAIN_ALREADY_EXISTS`: ドメイン重複

---

#### PUT /api/v1/super-admin/tenants/:id

**リクエスト**:
```typescript
{
  name?: string,
  domain?: string,
  planType?: string,
  contactEmail?: string,
  status?: 'active' | 'suspended' | 'deleted',
  settings?: object
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    tenant: {
      id: string,
      name: string,
      // ... 更新後の情報
    }
  }
}
```

---

#### DELETE /api/v1/super-admin/tenants/:id

**リクエスト**:
```
DELETE /api/v1/super-admin/tenants/:id?reason=契約終了
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    message: 'Tenant deleted successfully'
  }
}
```

**注意**: 論理削除（`is_deleted = true`）

---

### プラン管理API

#### GET /api/v1/super-admin/plans

**レスポンス**:
```typescript
{
  success: true,
  data: {
    plans: Array<{
      id: string,
      systemType: string,
      businessType: string,
      planType: string,
      planCategory: string,
      monthlyPrice: number,
      maxDevices: number,
      enableAiConcierge: boolean,
      enableMultilingual: boolean,
      enableLayoutEditor: boolean,
      maxMonthlyOrders: number,
      maxMonthlyAiRequests: number,
      maxStorageGB: number,
      displayName: string,
      description: string,
      isActive: boolean
    }>
  }
}
```

---

#### POST /api/v1/super-admin/plans

**リクエスト**:
```typescript
{
  systemType: 'hotel-saas' | 'hotel-pms' | 'hotel-member',
  businessType: 'leisure' | 'omotenasuai',
  planType: 'economy' | 'professional' | 'enterprise',
  planCategory: string,
  monthlyPrice: number,
  maxDevices: number,
  enableAiConcierge: boolean,
  enableMultilingual: boolean,
  enableLayoutEditor: boolean,
  maxMonthlyOrders: number,
  maxMonthlyAiRequests: number,
  maxStorageGB: number,
  displayName: string,
  description: string
}
```

---

#### PUT /api/v1/super-admin/plans/:id

**リクエスト**:
```typescript
{
  // 基本情報（変更不可）
  // systemType, businessType, planType, planCategory は変更不可
  
  // 料金設定（変更可能）
  monthlyPrice?: number,
  additionalDeviceCost?: number,
  roomTerminalCost?: number,
  frontDeskCost?: number,
  kitchenCost?: number,
  barCost?: number,
  housekeepingCost?: number,
  managerCost?: number,
  commonAreaCost?: number,
  multilingualUpgradePrice?: number,
  
  // 数値制限（動的変更可能）
  maxDevices?: number,
  maxMonthlyOrders?: number,
  maxMonthlyAiRequests?: number,
  maxStorageGB?: number,
  
  // 機能フラグ（動的ON/OFF可能）
  enableAiConcierge?: boolean,
  enableMultilingual?: boolean,
  enableLayoutEditor?: boolean,
  enableFacilityGuide?: boolean,
  enableAiBusinessSupport?: boolean,
  
  // メタ情報
  displayName?: string,
  description?: string
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    plan: {
      id: string,
      // ... 更新後のプラン情報
    },
    impact: {
      affectedTenantCount: number,  // 影響を受けるテナント数
      warnings: Array<{
        type: 'device_limit_exceeded' | 'feature_disabled' | 'storage_exceeded',
        tenantCount: number,
        message: string
      }>
    }
  }
}
```

**重要な動作**:
1. プラン更新後、即座に全テナントに反映
2. Redisキャッシュをクリア
3. 影響を受けるテナントをレスポンスで返す
4. ダウングレード時の警告を含む

---

#### GET /api/v1/super-admin/plans/:id/impact

**説明**: プラン変更前に影響を確認するAPI

**リクエスト**:
```
GET /api/v1/super-admin/plans/:id/impact?maxDevices=20&enableAiConcierge=false
```

**クエリパラメータ**: 変更予定の値

**レスポンス**:
```typescript
{
  success: true,
  data: {
    currentPlan: {
      // 現在のプラン設定
    },
    proposedChanges: {
      // 変更予定の内容
    },
    impact: {
      totalTenants: number,  // このプランを使用しているテナント総数
      affectedTenants: number,  // 影響を受けるテナント数
      details: {
        deviceLimitExceeded: {
          count: number,
          tenantIds: string[]
        },
        featureDisabled: {
          count: number,
          features: string[],
          tenantIds: string[]
        },
        storageExceeded: {
          count: number,
          tenantIds: string[]
        }
      },
      warnings: Array<{
        severity: 'low' | 'medium' | 'high',
        message: string
      }>
    }
  }
}
```

---

#### POST /api/v1/super-admin/tenants/:id/change-plan

**リクエスト**:
```typescript
{
  newPlanId: string,
  effectiveDate?: string  // デフォルト: 即時
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    message: 'Plan changed successfully',
    warnings?: Array<string>  // ダウングレード時の警告
  }
}
```

---

### AI管理API

#### GET /api/v1/super-admin/ai/models

**レスポンス**:
```typescript
{
  success: true,
  data: {
    models: Array<{
      id: string,
      name: string,
      provider: 'openai' | 'anthropic',
      inputTokenCost: number,
      outputTokenCost: number,
      isActive: boolean
    }>
  }
}
```

---

#### GET /api/v1/super-admin/ai/credits/:tenantId

**レスポンス**:
```typescript
{
  success: true,
  data: {
    tenantId: string,
    balance: number,
    monthlyAllocation: number,
    consumed: number,
    remaining: number
  }
}
```

---

#### POST /api/v1/super-admin/ai/credits/allocate

**リクエスト**:
```typescript
{
  tenantId: string,
  amount: number,
  description?: string
}
```

---

### 使用量監視API

#### GET /api/v1/super-admin/usage/overview

**レスポンス**:
```typescript
{
  success: true,
  data: {
    totalTenants: number,
    activeTenants: number,
    totalDevices: number,
    totalOrders: number,
    totalAiTokens: number,
    totalStorageGB: number
  }
}
```

---

#### GET /api/v1/super-admin/usage/:tenantId

**レスポンス**:
```typescript
{
  success: true,
  data: {
    tenantId: string,
    currentMonth: {
      deviceCount: number,
      orderCount: number,
      aiTokenCount: number,
      storageGb: number,
      apiCallCount: number
    },
    limits: {
      maxDevices: number,
      maxMonthlyOrders: number,
      maxMonthlyAiRequests: number,
      maxStorageGB: number
    },
    usageRate: {
      devices: number,  // パーセンテージ
      orders: number,
      aiTokens: number,
      storage: number
    }
  }
}
```

---

### アラート管理API

#### GET /api/v1/super-admin/alerts

**レスポンス**:
```typescript
{
  success: true,
  data: {
    alerts: Array<{
      id: string,
      tenantId: string | null,
      alertType: string,
      severity: 'low' | 'medium' | 'high' | 'critical',
      title: string,
      message: string,
      isResolved: boolean,
      createdAt: string
    }>
  }
}
```

---

#### POST /api/v1/super-admin/alerts/:id/resolve

**リクエスト**:
```typescript
{
  resolution: string  // 解決内容
}
```

---

### ログ管理API

#### GET /api/v1/super-admin/logs/system

**リクエスト**:
```
GET /api/v1/super-admin/logs/system?tenantId=xxx&service=hotel-saas&level=error&keyword=timeout&startDate=2025-10-01&endDate=2025-10-07&page=1&limit=50
```

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `tenantId` | string | ❌ | テナントID（指定しない場合は全テナント） |
| `service` | string | ❌ | サービス名（hotel-saas/hotel-pms/hotel-member/hotel-common） |
| `level` | string | ❌ | ログレベル（error/warn/info/debug） |
| `keyword` | string | ❌ | キーワード検索 |
| `startDate` | string | ❌ | 開始日時（ISO 8601形式） |
| `endDate` | string | ❌ | 終了日時（ISO 8601形式） |
| `page` | number | ✅ | ページ番号 |
| `limit` | number | ✅ | 1ページあたりの件数 |

**レスポンス**:
```typescript
{
  success: true,
  data: {
    logs: Array<{
      id: string,
      tenantId: string | null,
      service: string,
      level: string,
      message: string,
      context: object | null,
      userId: string | null,
      ipAddress: string | null,
      userAgent: string | null,
      timestamp: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

#### GET /api/v1/super-admin/logs/server

**リクエスト**:
```
GET /api/v1/super-admin/logs/server?server=nginx&level=error&keyword=connection&startDate=2025-10-01&endDate=2025-10-07&page=1&limit=50
```

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `server` | string | ❌ | サーバー名（nginx/pm2/postgresql/redis） |
| `level` | string | ❌ | ログレベル（error/warn/info/debug） |
| `keyword` | string | ❌ | キーワード検索 |
| `startDate` | string | ❌ | 開始日時（ISO 8601形式） |
| `endDate` | string | ❌ | 終了日時（ISO 8601形式） |
| `page` | number | ✅ | ページ番号 |
| `limit` | number | ✅ | 1ページあたりの件数 |

**レスポンス**:
```typescript
{
  success: true,
  data: {
    logs: Array<{
      id: string,
      server: string,
      level: string,
      message: string,
      context: object | null,
      timestamp: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

#### GET /api/v1/super-admin/logs/system/export

**リクエスト**:
```
GET /api/v1/super-admin/logs/system/export?tenantId=xxx&service=hotel-saas&level=error&startDate=2025-10-01&endDate=2025-10-07&format=csv
```

**クエリパラメータ**: GET /api/v1/super-admin/logs/systemと同じ + `format`

| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `format` | string | ✅ | エクスポート形式（csv/json） |

**レスポンス**:
- Content-Type: `text/csv` または `application/json`
- ファイルダウンロード

---

#### GET /api/v1/super-admin/logs/server/export

**リクエスト**:
```
GET /api/v1/super-admin/logs/server/export?server=nginx&level=error&startDate=2025-10-01&endDate=2025-10-07&format=json
```

**クエリパラメータ**: GET /api/v1/super-admin/logs/serverと同じ + `format`

**レスポンス**:
- Content-Type: `text/csv` または `application/json`
- ファイルダウンロード

---

## 🎨 フロントエンド実装

### レイアウト

**ファイル**: `/Users/kaneko/hotel-saas/layouts/super-admin.vue`

```vue
<template>
  <div class="super-admin-layout">
    <SuperAdminSidebar />
    <div class="main-content">
      <SuperAdminHeader />
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
```

---

### 画面一覧

#### 1. ダッシュボード
- **パス**: `/admin/super-admin/dashboard`
- **ファイル**: `/pages/admin/super-admin/dashboard/index.vue`
- **内容**: 全体概要、使用量サマリー、アラート一覧

#### 2. テナント管理
- **テナント一覧**: `/admin/super-admin/tenants`
- **テナント詳細**: `/admin/super-admin/tenants/[id]`
- **テナント作成**: `/admin/super-admin/tenants/create`
- **テナント編集**: `/admin/super-admin/tenants/[id]/edit`

#### 3. プラン管理
- **プラン一覧**: `/admin/super-admin/plans`
- **プラン作成**: `/admin/super-admin/plans/create`
- **プラン編集**: `/admin/super-admin/plans/[id]/edit`

#### 4. AI管理
- **モデル管理**: `/admin/super-admin/ai/models`
- **クレジット管理**: `/admin/super-admin/ai/credits`
- **使用統計**: `/admin/super-admin/ai/usage`

#### 5. 使用量監視
- **リアルタイムダッシュボード**: `/admin/super-admin/usage`
- **テナント別詳細**: `/admin/super-admin/usage/[tenantId]`

#### 6. アラート管理
- **アラート一覧**: `/admin/super-admin/alerts`
- **アラート詳細**: `/admin/super-admin/alerts/[id]`

#### 7. ログ管理
- **システムログ**: `/admin/super-admin/logs/system`
- **サーバーログ**: `/admin/super-admin/logs/server`
- **ログ詳細**: `/admin/super-admin/logs/[id]`

#### 8. システム設定
- **グローバル設定**: `/admin/super-admin/settings`
- **セキュリティ設定**: `/admin/super-admin/settings/security`

---

### Composable

#### useSuperAdmin

**ファイル**: `/Users/kaneko/hotel-saas/composables/useSuperAdmin.ts`

```typescript
export const useSuperAdmin = () => {
  const user = ref<SuperAdminUser | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  
  const login = async (email: string, password: string, twoFactorCode?: string) => {
    const response = await $fetch('/api/v1/super-admin/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: { email, password, twoFactorCode }
    })
    
    if (response.success) {
      user.value = response.data.user
      return true
    }
    return false
  }
  
  const logout = async () => {
    await $fetch('/api/v1/super-admin/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
    user.value = null
  }
  
  return {
    user,
    isAuthenticated,
    login,
    logout
  }
}
```

---

## 🔒 セキュリティ

### 認証・認可

#### 1. スーパーアドミン専用認証
- 専用の認証エンドポイント
- `super_admin_users`テーブルで管理
- 通常のスタッフ認証とは完全に分離

#### 2. 2FA必須
- TOTP方式（Google Authenticator等）
- バックアップコード発行
- 2FA無効化は管理者承認必須

#### 3. IPホワイトリスト
- スーパーアドミンアクセス制限
- 許可IPアドレスリスト管理
- 違反時は即座にブロック

#### 4. セッションタイムアウト
- スーパーアドミン: 15分
- 自動ログアウト
- 再認証必須

---

### 監査ログ

#### 記録対象
- 全操作を記録
- 変更前後の値を保存
- 操作者の記録
- IPアドレス・User Agent
- タイムスタンプ

#### ログ保持期間
- 最低1年間
- 法令遵守のため長期保存

---

### データ保護

#### 1. 機密情報の暗号化
- パスワード: bcrypt
- 2FA秘密鍵: AES-256
- APIキー: 暗号化保存

#### 2. アクセス制御
- スーパーアドミンのみアクセス可能
- 権限レベルによる制限
- 監査ログで追跡

#### 3. データバックアップ
- 日次自動バックアップ
- 週次フルバックアップ
- 災害復旧計画

---

## 📊 既存実装状況

### hotel-saas

| 機能 | 実装状況 | ファイル |
|-----|---------|---------|
| スーパーアドミン認証 | ❌ 未実装 | - |
| テナント管理UI | ❌ 未実装 | - |
| プラン管理UI | ❌ 未実装 | - |
| AI管理UI | ❌ 未実装 | - |
| 使用量監視UI | ❌ 未実装 | - |
| アラート管理UI | ❌ 未実装 | - |
| ログ管理UI | ❌ 未実装 | - |
| システム設定UI | ❌ 未実装 | - |

---

### hotel-common

| 機能 | 実装状況 | ファイル |
|-----|---------|---------|
| スーパーアドミン認証API | ❌ 未実装 | - |
| テナント管理API | 🟡 部分実装 | `/src/api/tenant-service-api.ts` |
| プラン管理API | 🟡 部分実装 | `/src/api/tenant-service-api.ts` |
| AI管理API | ❌ 未実装 | - |
| 使用量監視API | ❌ 未実装 | - |
| アラート管理API | ❌ 未実装 | - |
| ログ管理API | ❌ 未実装 | - |

**注記**: テナント管理API、プラン管理APIは基本的なCRUD操作のみ実装済み。スーパーアドミン専用の機能は未実装。

---

### データベース

| テーブル | 実装状況 | 説明 |
|---------|---------|------|
| `tenants` | ✅ 実装済み | マルチテナントSSOTで定義 |
| `system_plan_restrictions` | ✅ 実装済み | マルチテナントSSOTで定義 |
| `tenant_system_plan` | ✅ 実装済み | マルチテナントSSOTで定義 |
| `super_admin_users` | ❌ 未実装 | 新規作成必要 |
| `tenant_usage_logs` | ❌ 未実装 | 新規作成必要 |
| `ai_credit_transactions` | ❌ 未実装 | 新規作成必要 |
| `system_alerts` | ❌ 未実装 | 新規作成必要 |
| `super_admin_audit_logs` | ❌ 未実装 | 新規作成必要 |
| `system_logs` | ❌ 未実装 | 新規作成必要 |
| `server_logs` | ❌ 未実装 | 新規作成必要 |
| `ai_prompts` | ❌ 未実装 | 新規作成必要 |
| `ai_prompt_versions` | ❌ 未実装 | 新規作成必要 |
| `exchange_rates` | ❌ 未実装 | 新規作成必要 |
| `notification_templates` | ❌ 未実装 | 新規作成必要 |
| `system_health_checks` | ❌ 未実装 | 新規作成必要 |

---

## ✅ 実装チェックリスト

### Phase 1: 必須機能（最優先）

#### データベース
- [ ] `super_admin_users`テーブル作成
- [ ] `tenant_usage_logs`テーブル作成
- [ ] `ai_credit_transactions`テーブル作成
- [ ] `system_alerts`テーブル作成
- [ ] `super_admin_audit_logs`テーブル作成
- [ ] `system_logs`テーブル作成
- [ ] `server_logs`テーブル作成
- [ ] `ai_prompts`テーブル作成
- [ ] `ai_prompt_versions`テーブル作成
- [ ] `exchange_rates`テーブル作成
- [ ] `notification_templates`テーブル作成
- [ ] `system_health_checks`テーブル作成
- [ ] マイグレーション実行

#### hotel-common
- [ ] スーパーアドミン認証API実装
  - [ ] `POST /api/v1/super-admin/auth/login`
  - [ ] `POST /api/v1/super-admin/auth/logout`
  - [ ] `GET /api/v1/super-admin/auth/me`
- [ ] テナント管理API実装
  - [ ] `GET /api/v1/super-admin/tenants`
  - [ ] `GET /api/v1/super-admin/tenants/:id`
  - [ ] `POST /api/v1/super-admin/tenants`
  - [ ] `PUT /api/v1/super-admin/tenants/:id`
  - [ ] `DELETE /api/v1/super-admin/tenants/:id`
- [ ] プラン管理API実装
  - [ ] `GET /api/v1/super-admin/plans`
  - [ ] `POST /api/v1/super-admin/plans`
  - [ ] `PUT /api/v1/super-admin/plans/:id`（動的機能制御対応）
  - [ ] `GET /api/v1/super-admin/plans/:id/impact`（影響確認）
  - [ ] `POST /api/v1/super-admin/tenants/:id/change-plan`
- [ ] プラン変更時の影響確認ロジック実装
  - [ ] デバイス数超過チェック
  - [ ] 機能無効化影響チェック
  - [ ] ストレージ超過チェック
- [ ] プラン変更時の自動処理実装
  - [ ] Redisキャッシュクリア
  - [ ] 超過デバイス自動無効化
  - [ ] テナント通知
- [ ] 基本的な使用量監視API実装
  - [ ] `GET /api/v1/super-admin/usage/overview`
  - [ ] `GET /api/v1/super-admin/usage/:tenantId`
- [ ] AIプロンプト管理API実装 ⭐ **重要**
  - [ ] `GET /api/v1/super-admin/prompts`
  - [ ] `POST /api/v1/super-admin/prompts`
  - [ ] `PUT /api/v1/super-admin/prompts/:id`
  - [ ] `DELETE /api/v1/super-admin/prompts/:id`
  - [ ] `GET /api/v1/super-admin/prompts/:id/versions`
  - [ ] `POST /api/v1/super-admin/prompts/:id/rollback`
  - [ ] `POST /api/v1/super-admin/prompts/:id/preview`
- [ ] 為替レート管理API実装
  - [ ] `GET /api/v1/super-admin/exchange-rates`
  - [ ] `POST /api/v1/super-admin/exchange-rates`
  - [ ] `PUT /api/v1/super-admin/exchange-rates/:id`
- [ ] 通知テンプレート管理API実装
  - [ ] `GET /api/v1/super-admin/notification-templates`
  - [ ] `POST /api/v1/super-admin/notification-templates`
  - [ ] `PUT /api/v1/super-admin/notification-templates/:id`
- [ ] システムヘルスチェックAPI実装
  - [ ] `GET /api/v1/super-admin/health`
  - [ ] `GET /api/v1/super-admin/health/history`

#### hotel-saas
- [ ] スーパーアドミンレイアウト作成
  - [ ] `/layouts/super-admin.vue`
  - [ ] `/components/SuperAdminSidebar.vue`
  - [ ] `/components/SuperAdminHeader.vue`
- [ ] 認証画面実装
  - [ ] `/pages/admin/super-admin/login.vue`
  - [ ] `useSuperAdmin` Composable
- [ ] ダッシュボード実装
  - [ ] `/pages/admin/super-admin/dashboard/index.vue`
- [ ] テナント管理画面実装
  - [ ] `/pages/admin/super-admin/tenants/index.vue`
  - [ ] `/pages/admin/super-admin/tenants/[id].vue`
  - [ ] `/pages/admin/super-admin/tenants/create.vue`
  - [ ] `/pages/admin/super-admin/tenants/[id]/edit.vue`
- [ ] プラン管理画面実装
  - [ ] `/pages/admin/super-admin/plans/index.vue`（プラン一覧）
  - [ ] `/pages/admin/super-admin/plans/create.vue`（プラン作成）
  - [ ] `/pages/admin/super-admin/plans/[id]/edit.vue`（プラン編集・動的機能制御）
  - [ ] プラン編集画面の影響確認UI実装
    - [ ] 変更前後の比較表示
    - [ ] 影響を受けるテナント数表示
    - [ ] 警告メッセージ表示
    - [ ] 確認ダイアログ
- [ ] AIプロンプト管理画面実装 ⭐ **重要**
  - [ ] `/pages/admin/super-admin/prompts/index.vue`（プロンプト一覧）
  - [ ] `/pages/admin/super-admin/prompts/create.vue`（プロンプト作成）
  - [ ] `/pages/admin/super-admin/prompts/[id]/edit.vue`（プロンプト編集）
  - [ ] `/pages/admin/super-admin/prompts/[id]/preview.vue`（プレビュー）
  - [ ] `/pages/admin/super-admin/prompts/[id]/versions.vue`（バージョン履歴）
- [ ] 為替レート管理画面実装
  - [ ] `/pages/admin/super-admin/exchange-rates/index.vue`
- [ ] 通知テンプレート管理画面実装
  - [ ] `/pages/admin/super-admin/notification-templates/index.vue`
- [ ] システムヘルスチェック画面実装
  - [ ] `/pages/admin/super-admin/health/index.vue`

---

### Phase 2: 重要機能（高優先度）

#### hotel-common
- [ ] プラン変更フロー実装（拡張）
  - [ ] 使用状況確認
  - [ ] ダウングレード時の警告
  - [ ] テナント通知
  - [ ] プラン変更履歴記録
- [ ] 機能制御の動的適用
  - [ ] プラン変更時の即時反映
  - [ ] 機能フラグの検証ロジック
  - [ ] 制限値超過時の自動対応
- [ ] アラート機能実装
  - [ ] `GET /api/v1/super-admin/alerts`
  - [ ] `POST /api/v1/super-admin/alerts/:id/resolve`
  - [ ] アラート自動生成
- [ ] AI管理（基本）実装
  - [ ] `GET /api/v1/super-admin/ai/models`
  - [ ] `GET /api/v1/super-admin/ai/credits/:tenantId`
  - [ ] `POST /api/v1/super-admin/ai/credits/allocate`

#### hotel-saas
- [ ] 使用量監視画面実装
  - [ ] `/pages/admin/super-admin/usage/index.vue`
  - [ ] `/pages/admin/super-admin/usage/[tenantId].vue`
- [ ] アラート管理画面実装
  - [ ] `/pages/admin/super-admin/alerts/index.vue`
  - [ ] `/pages/admin/super-admin/alerts/[id].vue`
- [ ] ログ管理画面実装（基本）
  - [ ] `/pages/admin/super-admin/logs/system.vue`
  - [ ] `/pages/admin/super-admin/logs/server.vue`
- [ ] AI管理画面実装（基本）
  - [ ] `/pages/admin/super-admin/ai/models/index.vue`
  - [ ] `/pages/admin/super-admin/ai/credits/index.vue`

---

### Phase 3: 拡張機能（中優先度）

#### hotel-common
- [ ] AIクレジット管理
  - [ ] 月次自動補充
  - [ ] クレジット消費履歴
- [ ] 詳細な使用量分析
  - [ ] トレンド分析
  - [ ] コスト予測
- [ ] レポート機能
  - [ ] 月次レポート
  - [ ] 年次レポート
- [ ] ログ管理（拡張）
  - [ ] ログ保持期間設定API
  - [ ] ログ統計・分析API
  - [ ] ログアラート連携

#### hotel-saas
- [ ] AI使用統計画面実装
  - [ ] `/pages/admin/super-admin/ai/usage/index.vue`
- [ ] ログ管理画面実装（拡張）
  - [ ] `/pages/admin/super-admin/logs/[id].vue` （ログ詳細）
  - [ ] ログ検索フィルタ高度化
  - [ ] ログ統計ダッシュボード
- [ ] システム設定画面実装
  - [ ] `/pages/admin/super-admin/settings/index.vue`
  - [ ] `/pages/admin/super-admin/settings/security.vue`

---

### Phase 4: 高度な機能（低優先度）

- [ ] 予測分析
- [ ] 自動スケーリング
- [ ] カスタムアラート
- [ ] 多言語対応
- [ ] テーマカスタマイズ

---

## 📚 関連SSOT

- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤（技術的仕組み）
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - スタッフログイン認証
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - データベーススキーマ
- [SSOT_PRODUCTION_PARITY_RULES.md](../00_foundation/SSOT_PRODUCTION_PARITY_RULES.md) - 本番同等ルール
- [SSOT_SAAS_PERMISSION_SYSTEM.md](../00_foundation/SSOT_SAAS_PERMISSION_SYSTEM.md) - 権限管理（作成予定）
- [SSOT_SAAS_BILLING.md](./SSOT_SAAS_BILLING.md) - 請求管理（作成予定）
- [SSOT_SAAS_AUDIT_LOG.md](./SSOT_SAAS_AUDIT_LOG.md) - 監査ログ（作成予定）

---

## 🔄 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2025-10-7 | 初版作成 | Iza |
| 1.1.0 | 2025-10-7 | ログ管理機能を追加（アラート管理と分離） | Iza |
| 1.2.0 | 2025-10-7 | プラン別機能制御の動的設定機能を追加（料金・数値制限・機能フラグの動的変更、影響確認API、即時反映） | Iza |
| 2.0.0 | 2025-10-7 | 重要機能を大幅追加：AIプロンプト管理（システム/業態/言語/機能別、バージョン管理）、システム全体設定、為替レート管理、通知テンプレート管理、バックアップ・復元、監査ログ閲覧、システムヘルスチェック | Iza |
| 2.0.1 | 2025-10-7 | 品質チェック：Prismaスキーマの`@default()`を`uuid()`に統一（既存スキーマとの整合性） | Iza |

---

**最終更新**: 2025年10月7日  
**作成者**: AI Assistant (Iza - 統合管理者)  
**承認者**: Iza（統合管理者）

---

**このSSOTは、既存のドキュメント（SSOT_SAAS_SUPER_ADMIN_MEMO.md）と実装状況を基に作成されています。**  
**想像や推測による記載は一切含まれていません。**
