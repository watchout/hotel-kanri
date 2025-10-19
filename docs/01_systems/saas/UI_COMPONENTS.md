# Hotel-SaaS UIコンポーネント仕様

## 共通コンポーネント

### Button
```vue
<Button
  variant="primary" | "secondary" | "danger"
  size="sm" | "md" | "lg"
  :disabled="boolean"
  :loading="boolean"
  @click="function"
>
  ボタンテキスト
</Button>
```

### Input
```vue
<Input
  type="text" | "number" | "email" | "password"
  v-model="value"
  :placeholder="string"
  :disabled="boolean"
  :error="string"
/>
```

### Card
```vue
<Card
  :title="string"
  :subtitle="string"
  :loading="boolean"
>
  コンテンツ
</Card>
```

## 注文関連コンポーネント

### MenuList
```vue
<MenuList
  :categories="Category[]"
  :loading="boolean"
  @select="function"
/>
```

### MenuItem
```vue
<MenuItem
  :item="MenuItem"
  :available="boolean"
  @add="function"
/>
```

### OrderForm
```vue
<OrderForm
  :items="OrderItem[]"
  :timeRestrictions="TimeRestriction[]"
  @submit="function"
  @cancel="function"
/>
```

### OrderStatus
```vue
<OrderStatus
  :order="Order"
  :loading="boolean"
/>
```

## 館内情報コンポーネント

### InfoList
```vue
<InfoList
  :items="InfoItem[]"
  :loading="boolean"
  @select="function"
/>
```

### AIConcierge
```vue
<AIConcierge
  :loading="boolean"
  @send="function"
/>
```

## 内線コンポーネント

### VoipDialer
```vue
<VoipDialer
  :connected="boolean"
  :calling="boolean"
  @call="function"
  @hangup="function"
/>
```

## スタイルガイド

### カラーパレット
```css
:root {
  --primary: #2563eb;
  --secondary: #64748b;
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;
  --info: #3b82f6;
  --background: #ffffff;
  --text: #1f2937;
}
```

### タイポグラフィ
```css
:root {
  --font-family: 'Noto Sans JP', sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}
```

### スペーシング
```css
:root {
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

### ブレークポイント
```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

## アニメーション

### トランジション
```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

### ローディング
```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading {
  animation: spin 1s linear infinite;
}
``` 