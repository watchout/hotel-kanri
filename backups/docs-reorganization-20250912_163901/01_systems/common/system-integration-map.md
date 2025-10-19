# システム統合マップ (System Integration Map)

**作成日**: 2024年12月28日  
**バージョン**: 1.0.0  
**対象システム**: hotel-common, hotel-member, hotel-pms, hotel-saas  
**目的**: システム間連携の全体像把握・設計確認・運用管理

## 1. 全体アーキテクチャ図 (Overall Architecture)

### 1.1 システム間連携概要

```mermaid
graph TB
    subgraph "Frontend Layer"
        FM[hotel-member<br/>Frontend<br/>Vue 3 + Nuxt 3]
        FP[hotel-pms<br/>Frontend<br/>React + TypeScript]
        FS[hotel-saas<br/>Frontend<br/>Vue 3 + Nuxt 3]
    end

    subgraph "API Gateway Layer"
        AG[API Gateway<br/>nginx/HAProxy]
    end

    subgraph "Application Layer"
        HM[hotel-member<br/>FastAPI + Python<br/>Port: 3200]
        HP[hotel-pms<br/>Express + TypeScript<br/>Port: 3300]
        HS[hotel-saas<br/>Nuxt Server<br/>Port: 3100]
    end

    subgraph "Common Infrastructure"
        HC[hotel-common<br/>統一基盤<br/>Port: 3400]
        
        subgraph "Authentication"
            JWT[JWT Manager]
            RSE[Redis Sessions]
        end
        
        subgraph "Database"
            PG[(PostgreSQL<br/>統一DB)]
        end
        
        subgraph "Event System"
            RMQ[RabbitMQ/Redis<br/>Event Bus]
        end
        
        subgraph "Cache & Queue"
            RED[Redis<br/>Cache + Queue]
        end
    end

    subgraph "External Systems"
        OTA[OTA連携<br/>楽天・じゃらん等]
        PAY[決済システム]
        SMS[SMS/メール配信]
    end

    %% Frontend Connections
    FM -.->|HTTPS + JWT| AG
    FP -.->|HTTPS + JWT| AG
    FS -.->|HTTPS + JWT| AG

    %% API Gateway Routes
    AG -->|/member/*| HM
    AG -->|/pms/*| HP
    AG -->|/saas/*| HS
    AG -->|/common/*| HC

    %% System Interactions
    HM <-->|API + Events| HC
    HP <-->|API + Events| HC
    HS <-->|API + Events| HC

    %% Cross-System APIs
    HM <-.->|Limited API| HP
    HP <-.->|Read-only API| HS
    HM <-.->|Read-only API| HS

    %% Infrastructure Connections
    HC --> JWT
    HC --> RSE
    HC --> PG
    HC --> RMQ
    HC --> RED

    HM --> PG
    HP --> PG
    HS --> PG

    HM --> RMQ
    HP --> RMQ
    HS --> RMQ

    %% External Connections
    HP <-->|API| OTA
    HP <-->|API| PAY
    HM <-->|API| SMS

    classDef frontend fill:#e1f5fe
    classDef application fill:#f3e5f5
    classDef infrastructure fill:#fff3e0
    classDef external fill:#ffebee

    class FM,FP,FS frontend
    class HM,HP,HS application
    class HC,JWT,RSE,PG,RMQ,RED infrastructure
    class OTA,PAY,SMS external
```

## 2. API連携マップ (API Integration Map)

### 2.1 REST API 連携図

```mermaid
sequenceDiagram
    participant HM as hotel-member
    participant HC as hotel-common
    participant HP as hotel-pms
    participant HS as hotel-saas

    Note over HM,HS: 🔐 認証フロー
    HM->>HC: POST /auth/login
    HC->>HC: JWT生成 + Redis保存
    HC-->>HM: JWT Token + User Info

    Note over HM,HS: 👥 顧客管理フロー
    HM->>HC: POST /customers (新規顧客)
    HC->>HC: 統一DB保存 + Event発行
    HC-->>HP: customer.created Event
    HC-->>HS: customer.created Event

    Note over HM,HS: 🏨 予約管理フロー  
    HM->>HP: POST /reservations (会員予約)
    HP->>HC: 予約データ保存
    HC->>HC: Event発行
    HC-->>HM: reservation.created Event
    HC-->>HS: reservation.created Event

    Note over HM,HS: 🛎️ サービス注文フロー
    HS->>HS: POST /orders (新規注文)
    HS->>HP: GET /billing (請求連携)
    HS->>HC: service.ordered Event発行
    HC-->>HP: service.ordered Event
    HP->>HP: 請求データ更新

    Note over HM,HS: 🔄 データ同期フロー
    HP->>HM: PATCH /customers/{id} (限定更新)
    HM->>HC: customer.updated Event発行
    HC-->>HS: customer.updated Event
```

### 2.2 API エンドポイント詳細マッピング

#### hotel-member API
```
🔗 External APIs
POST   /api/v2/auth/login                    # ログイン
POST   /api/v2/auth/refresh                  # トークンリフレッシュ
POST   /api/v2/auth/logout                   # ログアウト

👥 Customer Management APIs  
GET    /api/v2/customers                     # 顧客一覧
POST   /api/v2/customers                     # 顧客作成
GET    /api/v2/customers/{id}                # 顧客詳細
PUT    /api/v2/customers/{id}                # 顧客更新
DELETE /api/v2/customers/{id}                # 顧客削除

💎 Member-Specific APIs
GET    /api/v2/customers/{id}/points         # ポイント履歴
POST   /api/v2/customers/{id}/points         # ポイント操作
GET    /api/v2/customers/{id}/rank           # ランク情報
PUT    /api/v2/customers/{id}/rank           # ランク変更

🏨 Reservation Integration
POST   /api/v2/reservations                  # 会員予約作成
GET    /api/v2/reservations/member/{id}      # 会員予約履歴
```

#### hotel-pms API
```
🏨 Reservation Management APIs
GET    /api/v2/reservations                  # 予約一覧
POST   /api/v2/reservations                  # 予約作成
GET    /api/v2/reservations/{id}             # 予約詳細
PUT    /api/v2/reservations/{id}             # 予約更新
DELETE /api/v2/reservations/{id}             # 予約キャンセル

🛏️ Room Management APIs
GET    /api/v2/rooms                         # 部屋一覧
GET    /api/v2/rooms/availability            # 空室状況
PUT    /api/v2/rooms/{id}/status             # 部屋状態更新
POST   /api/v2/rooms/{id}/maintenance        # メンテナンス設定

👥 Customer Management (Limited)
GET    /api/v2/customers/{id}                # 顧客詳細取得
PATCH  /api/v2/customers/{id}/basic          # 基本情報更新のみ

🏨 Front Office APIs
POST   /api/v2/reservations/{id}/checkin     # チェックイン
POST   /api/v2/reservations/{id}/checkout    # チェックアウト
GET    /api/v2/occupancy/today               # 今日の稼働状況
```

#### hotel-saas API  
```
🛎️ Service Management APIs
POST   /api/v2/orders                        # 注文作成
GET    /api/v2/orders                        # 注文一覧
PUT    /api/v2/orders/{id}/status            # 注文状態更新
GET    /api/v2/orders/customer/{id}          # 顧客注文履歴

🎯 Concierge APIs
POST   /api/v2/concierge/requests            # コンシェルジュ依頼
GET    /api/v2/concierge/services            # 利用可能サービス
PUT    /api/v2/concierge/{id}/status         # 依頼状態更新

👥 Customer Data (Read-Only)
GET    /api/v2/customers/{id}                # 顧客基本情報
GET    /api/v2/customers/search              # 顧客検索
GET    /api/v2/reservations/current          # 現在滞在中ゲスト
```

## 3. 認証連携マップ (Authentication Integration Map)

### 3.1 SSO認証フロー

```mermaid
sequenceDiagram
    participant U as User
    participant FM as hotel-member<br/>Frontend
    participant FP as hotel-pms<br/>Frontend  
    participant FS as hotel-saas<br/>Frontend
    participant HC as hotel-common<br/>Auth Service
    participant R as Redis
    participant DB as PostgreSQL

    Note over U,DB: 🔐 初回ログイン (hotel-member)
    U->>FM: ログイン情報入力
    FM->>HC: POST /auth/login
    HC->>DB: ユーザー認証
    HC->>R: セッション保存
    HC->>HC: JWT生成
    HC-->>FM: JWT + Refresh Token
    FM->>FM: LocalStorage保存
    FM-->>U: ダッシュボード表示

    Note over U,DB: 🔄 システム間移動 (hotel-pms)
    U->>FP: hotel-pms アクセス
    FP->>FP: Cookie確認
    FP->>HC: POST /auth/verify (Cookie送信)
    HC->>R: セッション確認
    HC-->>FP: 認証成功 + ユーザー情報
    FP-->>U: 自動ログイン完了

    Note over U,DB: 🔄 トークンリフレッシュ
    FP->>FP: アクセストークン期限チェック
    FP->>HC: POST /auth/refresh (Cookie送信)
    HC->>R: リフレッシュトークン確認
    HC->>HC: 新JWT生成
    HC->>R: セッション更新
    HC-->>FP: 新アクセストークン
    FP->>FP: LocalStorage更新

    Note over U,DB: 🚪 ログアウト
    U->>FS: ログアウト
    FS->>HC: POST /auth/logout
    HC->>R: セッション削除
    HC->>HC: JWTブラックリスト追加
    HC-->>FS: ログアウト完了
    FS->>FS: LocalStorage削除
    FS-->>U: ログイン画面リダイレクト
```

### 3.2 JWT クレーム統一仕様

```typescript
// 統一JWTペイロード構造
interface UnifiedJWTPayload {
  // RFC 7519 標準クレーム
  iss: "hotel-common-auth"           // 発行者
  sub: string                        // ユーザーID (UUID)
  aud: ["hotel-member", "hotel-pms", "hotel-saas"] // 対象システム
  exp: number                        // 有効期限 (8時間)
  iat: number                        // 発行時刻
  jti: string                        // JWT ID (Redis管理)

  // Hotel固有クレーム
  tenant_id: string                  // テナントID
  email: string                      // メールアドレス  
  role: "STAFF"|"MANAGER"|"ADMIN"|"OWNER"|"SYSTEM"
  level: 1|2|3|4|5                  // 権限レベル
  permissions: string[]              // 詳細権限

  // セッション管理
  session_id: string                 // Redisセッション識別子
  device_id?: string                 // デバイス識別子
  ip_address?: string                // 発行時IP
}
```

## 4. イベント連携マップ (Event Integration Map)

### 4.1 Event-driven アーキテクチャ

```mermaid
graph LR
    subgraph "Event Publishers"
        HM[hotel-member]
        HP[hotel-pms] 
        HS[hotel-saas]
    end

    subgraph "Event Infrastructure"
        EB[Event Bus<br/>Redis Streams/RabbitMQ]
        EQ[Event Queue]
        EH[Event Handler]
    end

    subgraph "Event Consumers"
        HM2[hotel-member<br/>Consumer]
        HP2[hotel-pms<br/>Consumer]
        HS2[hotel-saas<br/>Consumer]
    end

    subgraph "Event Storage"
        DB[(PostgreSQL<br/>system_event)]
        LOG[Event Logs]
    end

    %% Publishing
    HM -->|customer.* events| EB
    HP -->|reservation.* events| EB  
    HS -->|service.* events| EB

    %% Infrastructure
    EB --> EQ
    EQ --> EH
    EH --> DB
    EH --> LOG

    %% Consuming
    EB -.->|customer.updated| HP2
    EB -.->|customer.updated| HS2
    EB -.->|reservation.created| HM2
    EB -.->|reservation.created| HS2
    EB -.->|service.ordered| HP2
```

### 4.2 イベント種別とフロー

#### 4.2.1 顧客関連イベント
```yaml
Publisher: hotel-member
Events:
  customer.created:
    trigger: 新規顧客作成
    payload: { customer_id, tenant_id, customer_data }
    consumers: [hotel-pms, hotel-saas]
    priority: MEDIUM
    
  customer.updated:  
    trigger: 顧客情報更新
    payload: { customer_id, tenant_id, changed_fields, before_data, after_data }
    consumers: [hotel-pms, hotel-saas]
    priority: HIGH
    
  customer.rank_changed:
    trigger: 会員ランク変更
    payload: { customer_id, old_rank, new_rank, effective_date }
    consumers: [hotel-pms, hotel-saas]
    priority: MEDIUM
    
  customer.points_changed:
    trigger: ポイント増減
    payload: { customer_id, point_change, new_balance, transaction_type }
    consumers: [hotel-saas]
    priority: LOW
```

#### 4.2.2 予約関連イベント
```yaml
Publisher: hotel-pms
Events:
  reservation.created:
    trigger: 新規予約作成
    payload: { reservation_id, customer_id, tenant_id, reservation_data }
    consumers: [hotel-member, hotel-saas]
    priority: HIGH
    
  reservation.updated:
    trigger: 予約情報変更
    payload: { reservation_id, changed_fields, before_data, after_data }
    consumers: [hotel-member, hotel-saas]
    priority: HIGH
    
  checkin_checkout.checked_in:
    trigger: チェックイン完了
    payload: { reservation_id, customer_id, room_number, checkin_time }
    consumers: [hotel-member, hotel-saas]
    priority: CRITICAL
    
  checkin_checkout.checked_out:
    trigger: チェックアウト完了  
    payload: { reservation_id, customer_id, checkout_time, final_charges }
    consumers: [hotel-member, hotel-saas]
    priority: CRITICAL
    
  reservation.cancelled:
    trigger: 予約キャンセル
    payload: { reservation_id, cancellation_reason, cancelled_by }
    consumers: [hotel-member, hotel-saas]
    priority: HIGH
```

#### 4.2.3 サービス関連イベント
```yaml
Publisher: hotel-saas  
Events:
  service.ordered:
    trigger: サービス注文作成
    payload: { order_id, customer_id, reservation_id, service_details, amount }
    consumers: [hotel-pms]
    priority: HIGH
    
  service.completed:
    trigger: サービス提供完了
    payload: { order_id, completion_time, satisfaction_rating }
    consumers: [hotel-pms, hotel-member]
    priority: MEDIUM
    
  concierge.requested:
    trigger: コンシェルジュ依頼
    payload: { request_id, customer_id, request_type, details }
    consumers: [hotel-pms]
    priority: MEDIUM
    
  feedback.submitted:
    trigger: フィードバック投稿
    payload: { feedback_id, customer_id, rating, comments }
    consumers: [hotel-member, hotel-pms]
    priority: LOW
```

### 4.3 イベント処理パイプライン

```mermaid
flowchart TD
    A[Event発生] --> B{イベント種別判定}
    
    B -->|CRITICAL| C[即座処理キュー]
    B -->|HIGH| D[高優先度キュー]  
    B -->|MEDIUM| E[通常キュー]
    B -->|LOW| F[低優先度キュー]
    
    C --> G[並列処理<br/>3秒以内]
    D --> H[並列処理<br/>30秒以内]
    E --> I[バッチ処理<br/>5分以内]
    F --> J[バッチ処理<br/>1時間以内]
    
    G --> K[成功確認]
    H --> K
    I --> K  
    J --> K
    
    K -->|成功| L[完了ログ記録]
    K -->|失敗| M[リトライキュー]
    
    M --> N{リトライ回数}
    N -->|3回未満| O[指数バックオフ待機]
    N -->|3回以上| P[デッドレターキュー]
    
    O --> G
    P --> Q[手動確認要求]
```

## 5. データフロー図 (Data Flow Diagram)

### 5.1 顧客データフロー

```mermaid
flowchart LR
    subgraph "hotel-member (Master)"
        CM[Customer Master]
        PM[Points Manager]
        RM[Rank Manager]
    end
    
    subgraph "hotel-pms (Limited)"
        CB[Customer Basic Info]
        SH[Stay History]
    end
    
    subgraph "hotel-saas (Read-Only)"
        CP[Customer Profile]
        OF[Order Feedback]
    end
    
    subgraph "Unified Database"
        UC[customers table]
        UE[system_event table]
    end
    
    %% Master Management
    CM -->|Full CRUD| UC
    PM -->|Points Update| UC
    RM -->|Rank Update| UC
    
    %% Limited Access
    CB -->|Name/Phone/Address Only| UC
    SH <-->|Stay Records| UC
    
    %% Read-Only Access  
    CP <-.->|Read Profile| UC
    OF -->|Feedback Data| UE
    
    %% Event Flow
    UC -->|Events| UE
    UE -.->|Sync Events| CB
    UE -.->|Sync Events| CP
    
    classDef master fill:#4CAF50
    classDef limited fill:#FF9800  
    classDef readonly fill:#2196F3
    classDef database fill:#9C27B0
    
    class CM,PM,RM master
    class CB,SH limited
    class CP,OF readonly
    class UC,UE database
```

### 5.2 予約データフロー

```mermaid
flowchart LR
    subgraph "hotel-pms (Master)"
        RM[Reservation Manager]
        CM[Check-in/out Manager] 
        IM[Inventory Manager]
    end
    
    subgraph "hotel-member (Create Only)"
        RG[Member Reservation]
        RL[Reservation List]
    end
    
    subgraph "hotel-saas (Read-Only)"
        GL[Guest List]
        SI[Service Integration]
    end
    
    subgraph "External Systems"
        OTA[OTA Partners]
        FO[Front Office]
    end
    
    subgraph "Unified Database"
        UR[reservations table]
        RO[rooms table]
        UE[system_event table]
    end
    
    %% Master Management
    RM -->|Full CRUD| UR
    CM -->|Status Updates| UR
    IM -->|Room Assignment| RO
    
    %% Create Access
    RG -->|Member Bookings| UR
    RL <-.->|View History| UR
    
    %% Read-Only Access
    GL <-.->|Current Guests| UR
    SI <-.->|Service Context| UR
    
    %% External Sources
    OTA -->|OTA Bookings| RM
    FO -->|Walk-in/Phone| RM
    
    %% Event Flow
    UR -->|Events| UE
    UE -.->|Sync Events| RL
    UE -.->|Sync Events| GL
    
    classDef master fill:#4CAF50
    classDef create fill:#FF9800
    classDef readonly fill:#2196F3
    classDef external fill:#607D8B
    classDef database fill:#9C27B0
    
    class RM,CM,IM master
    class RG,RL create
    class GL,SI readonly
    class OTA,FO external
    class UR,RO,UE database
```

## 6. 運用監視マップ (Operations Monitoring Map)

### 6.1 監視ポイント

```mermaid
mindmap
  root((統合監視))
    API監視
      レスポンス時間
        平均200ms以下
        95%ile 500ms以下
      エラー率
        全体0.1%以下
        5xx系0.05%以下
      スループット
        リクエスト/秒
        同時接続数
    
    認証監視
      ログイン成功率
        99.9%以上
      トークンリフレッシュ
        自動成功率99%
      セッション管理
        Redis可用性
        セッション継続率
    
    イベント監視
      メッセージ配信
        遅延時間監視
        配信成功率
      キュー状況
        未処理数
        デッドレター
      処理性能
        スループット
        エラー率
    
    データベース監視
      接続プール
        アクティブ接続
        待機時間
      クエリ性能
        スロークエリ
        ロック状況
      データ整合性
        同期状況
        競合検知
    
    システム監視
      リソース使用率
        CPU/メモリ
        ディスクI/O
      ネットワーク
        帯域使用率
        パケットロス
      可用性
        アップタイム
        ヘルスチェック
```

### 6.2 アラート設定

| 監視項目 | 警告閾値 | 重大閾値 | 対応者 | 対応時間 |
|----------|----------|----------|--------|----------|
| API応答時間 | 1秒 | 3秒 | 運用チーム | 5分 |
| エラー率 | 1% | 5% | 開発チーム | 即座 |
| 認証失敗率 | 5% | 10% | セキュリティ | 即座 |
| DB接続エラー | 1件 | 5件 | DBA | 即座 |
| Redis障害 | 接続不可 | - | インフラ | 即座 |
| イベント遅延 | 5分 | 15分 | 開発チーム | 10分 |
| ディスク使用率 | 80% | 90% | インフラ | 30分 |

---

## 📝 実装確認チェックリスト

### API連携
- [ ] 全エンドポイントの動作確認
- [ ] レスポンス形式統一確認
- [ ] エラーハンドリング一貫性
- [ ] 認証ヘッダー統一

### 認証連携  
- [ ] SSO動作確認
- [ ] JWT検証動作確認
- [ ] セッション管理動作確認
- [ ] 自動リフレッシュ動作確認

### イベント連携
- [ ] 全イベント種別の配信確認
- [ ] 優先度別処理確認
- [ ] 失敗時リトライ確認
- [ ] デッドレター処理確認

### 運用監視
- [ ] 監視ダッシュボード設定
- [ ] アラート設定確認
- [ ] ログ収集設定
- [ ] 障害対応手順確認

**注意事項**:
1. この統合マップは実装時の完全なガイドラインです
2. 各連携ポイントの動作確認を必ず実施してください
3. 監視設定は本番稼働前に必ず動作確認してください
4. 障害時の手順書は別途詳細化してください 