# 📋 SaaS開発者向け メモ機能API利用ガイド

### 🎯 **概要**
hotel-commonのメモ機能を使って、客室ごとの引継ぎ・メンテナンス・清掃情報を管理できます。

---

## 🚀 **基本設定**

### **接続先**
```
ベースURL: http://localhost:3400
認証: Bearer Token必須
```

### **認証トークン取得**
```javascript
// ログイン
const loginResponse = await fetch('http://localhost:3400/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@omotenasuai.com',
    password: 'admin123'
  })
});

const { accessToken } = await loginResponse.json();
```

---

## 📝 **メモ操作の基本パターン**

### **1. 客室のメモ一覧を取得**
```javascript
// 101号室のメモを全て取得
const response = await fetch('http://localhost:3400/api/v1/admin/room-memos?room_number=101', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data.memos); // メモ配列
```

### **2. 新しいメモを作成**
```javascript
// 引継ぎメモを作成
const createResponse = await fetch('http://localhost:3400/api/v1/admin/room-memos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    room_number: '101',
    category: 'handover',        // 引継ぎ
    content: 'エアコン不調、修理依頼済み',
    priority: 'high'             // 高優先度
  })
});

const result = await createResponse.json();
console.log(result.data.memo_id); // 作成されたメモID
```

### **3. メモのステータス更新**
```javascript
// メモを「対応中」に変更
const statusResponse = await fetch(`http://localhost:3400/api/v1/admin/room-memos/${memoId}/status`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'in_progress',
    comment: '修理業者に連絡済み'
  })
});
```

---

## 🏷️ **カテゴリ別の使い方**

### **引継ぎメモ**
```javascript
{
  category: 'handover',
  content: 'チェックアウト時にタオル不足の報告あり',
  priority: 'normal'
}
```

### **清掃メモ**
```javascript
{
  category: 'cleaning',
  content: 'バスルームの排水が悪い',
  priority: 'high'
}
```

### **メンテナンスメモ**
```javascript
{
  category: 'maintenance',
  content: 'テレビリモコンの電池交換必要',
  priority: 'low'
}
```

### **忘れ物メモ**
```javascript
{
  category: 'lost_item',
  content: 'ベッドサイドに携帯充電器',
  priority: 'normal'
}
```

---

## 🔍 **検索・フィルタリング**

### **ステータス別検索**
```javascript
// 未対応のメモのみ取得
const pendingMemos = await fetch('http://localhost:3400/api/v1/admin/room-memos?status=pending', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### **カテゴリ別検索**
```javascript
// 清掃関連のメモのみ取得
const cleaningMemos = await fetch('http://localhost:3400/api/v1/admin/room-memos?category=cleaning', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### **複合条件検索**
```javascript
// 101号室の未対応引継ぎメモ
const filteredMemos = await fetch('http://localhost:3400/api/v1/admin/room-memos?room_number=101&status=pending&category=handover', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

---

## 💬 **コメント機能**

### **コメント追加**
```javascript
const commentResponse = await fetch(`http://localhost:3400/api/v1/admin/room-memos/${memoId}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: '修理完了しました'
  })
});
```

### **コメント一覧取得**
```javascript
const comments = await fetch(`http://localhost:3400/api/v1/admin/room-memos/${memoId}/comments`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

---

## 📊 **実用的な使用例**

### **チェックイン前の確認**
```javascript
async function checkRoomBeforeCheckin(roomNumber) {
  const response = await fetch(`http://localhost:3400/api/v1/admin/room-memos?room_number=${roomNumber}&status=pending`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const data = await response.json();
  const pendingIssues = data.data.memos;

  if (pendingIssues.length > 0) {
    console.log(`⚠️ ${roomNumber}号室に未対応の問題があります:`);
    pendingIssues.forEach(memo => {
      console.log(`- ${memo.category}: ${memo.content}`);
    });
    return false; // チェックイン不可
  }

  return true; // チェックイン可能
}
```

### **清掃完了報告**
```javascript
async function reportCleaningComplete(roomNumber) {
  // 1. 清掃メモを作成
  const cleaningMemo = await fetch('http://localhost:3400/api/v1/admin/room-memos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      room_number: roomNumber,
      category: 'cleaning',
      content: '清掃完了 - 次回チェックイン可能',
      status: 'completed'
    })
  });

  // 2. 既存の未対応メモを完了に変更
  const pendingMemos = await fetch(`http://localhost:3400/api/v1/admin/room-memos?room_number=${roomNumber}&status=pending`);
  const memos = await pendingMemos.json();

  for (const memo of memos.data.memos) {
    await fetch(`http://localhost:3400/api/v1/admin/room-memos/${memo.id}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'completed',
        comment: '清掃時に対応完了'
      })
    });
  }
}
```

---

## ⚠️ **エラーハンドリング**

```javascript
async function safeApiCall(url, options) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 401) {
        console.error('認証エラー: トークンを確認してください');
        return null;
      }
      if (response.status === 404) {
        console.error('リソースが見つかりません');
        return null;
      }
    }

    return await response.json();
  } catch (error) {
    console.error('API呼び出しエラー:', error.message);
    return null;
  }
}
```

---

## 🎯 **よくある使用パターン**

### **1. ダッシュボード表示用**
```javascript
// 全体の未対応メモ数を取得
const allPending = await fetch('http://localhost:3400/api/v1/admin/room-memos?status=pending');
const pendingCount = (await allPending.json()).data.memos.length;
```

### **2. 客室状況確認**
```javascript
// 特定客室の最新メモ5件
const recentMemos = await fetch('http://localhost:3400/api/v1/admin/room-memos?room_number=101&limit=5');
```

### **3. 緊急対応リスト**
```javascript
// 緊急・高優先度のメモ
const urgentMemos = await fetch('http://localhost:3400/api/v1/admin/room-memos?priority=urgent');
const highMemos = await fetch('http://localhost:3400/api/v1/admin/room-memos?priority=high');
```

これで、SaaS側からメモ機能を効果的に活用できます。何か具体的な実装で困ったら聞いてください。

---

**作成日**: 2025-09-11
**更新履歴**: 初回作成 - hotel-common メモAPI仕様書
