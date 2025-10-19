erDiagram
    users {
        INT      id PK
        ENUM     role     "guest/front/kitchen/server/admin"
        VARCHAR  name
        VARCHAR  room_number
        VARCHAR  language
        TIMESTAMP created_at
    }

    menu_items {
        INT      id PK
        VARCHAR  name
        TEXT     description
        DECIMAL  price
        VARCHAR  image_url
        BOOLEAN  is_active
        TIMESTAMP created_at
    }

    orders {
        INT      id PK
        INT      guest_id FK
        ENUM     status   "pending/preparing/delivering/completed/cancelled"
        DECIMAL  total_amount
        TIMESTAMP ordered_at
        TIMESTAMP completed_at
    }

    order_items {
        INT      id PK
        INT      order_id FK
        INT      menu_item_id FK
        INT      quantity
        DECIMAL  price
    }

    chat_sessions {
        INT      id PK
        INT      guest_id FK
        TIMESTAMP started_at
        TIMESTAMP last_message_at
    }

    chat_messages {
        INT      id PK
        INT      session_id FK
        ENUM     sender   "guest/ai/front"
        TEXT     message
        TIMESTAMP created_at
    }

    voip_calls {
        INT      id PK
        INT      guest_id FK
        VARCHAR  destination   "front|room|external"
        TIMESTAMP started_at
        TIMESTAMP ended_at
        VARCHAR  recording_url
    }

    %% Relationships
    users      ||--o{ orders         : places
    orders     ||--|{ order_items    : contains
    menu_items ||--o{ order_items    : "ordered in"
    users      ||--o{ chat_sessions  : initiates
    chat_sessions ||--o{ chat_messages : "has"
    users      ||--o{ voip_calls     : "makes"