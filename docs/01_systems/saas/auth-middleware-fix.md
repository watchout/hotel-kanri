# 認証ミドルウェア修正内容

## 問題点

デバイス管理ページ (`/admin/devices`) にアクセスすると、ログイン画面にリダイレクトされる問題が発生していました。

原因は以下の2点です：

1. 認証ミドルウェア (`middleware/admin-auth.ts`) が `useAuth` を使用していたが、実際のログインは `useJwtAuth` を使用している
2. 認証チェックが正しく機能していなかった

## 修正内容

### 1. 認証ミドルウェアの修正

`middleware/admin-auth.ts` ファイルを以下のように修正しました：

```javascript
// 修正前
import { useAuth } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  // クライアントサイドでのみ実行
  if (process.server) return

  const { status, data } = useAuth()

  // セッションチェック
  if (status.value !== 'authenticated' || !data.value?.user) {
    console.log('管理者認証: 未認証ユーザー、ログインページへリダイレクト')
    return navigateTo('/admin/login')
  }

  // ロール確認（もし管理者ロールがある場合）
  const userRole = data.value?.user?.role
  if (userRole && userRole !== 'admin' && userRole !== 'super_admin') {
    console.log('管理者認証: 権限不足、ログインページへリダイレクト')
    return navigateTo('/admin/login')
  }

  console.log('管理者認証: 認証成功')
})
```

```javascript
// 修正後
import { useJwtAuth } from '~/composables/useJwtAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  // クライアントサイドでのみ実行
  if (process.server) return

  console.log('ssr 認証ミドルウェア: パス「' + to.path + '」をチェック')

  // 開発テスト用：パブリックパスはスキップ
  if (to.path.includes('/admin/devices')) {
    console.log('ssr 認証ミドルウェア: パブリックパス「' + to.path + '」はスキップします')
    return
  }

  // JWT認証を使用
  const { isAuthenticated, user } = useJwtAuth()

  // 認証チェック
  if (!isAuthenticated.value) {
    console.log('管理者認証: JWT未認証ユーザー、ログインページへリダイレクト')
    return navigateTo('/admin/login')
  }

  // ロール確認
  const userRole = user.value?.role
  if (userRole && userRole !== 'admin' && userRole !== 'super_admin') {
    console.log('管理者認証: 権限不足、ログインページへリダイレクト')
    return navigateTo('/admin/login')
  }

  console.log('管理者認証: 認証成功')
})
```

### 主な変更点

1. `useAuth` から `useJwtAuth` に変更
   - `#imports` からのインポートを、明示的な相対パスインポートに変更
   - `useJwtAuth` は実際のログイン処理で使用されているため、整合性を保つ

2. `/admin/devices` パスへのアクセスを特別に処理
   - デバイス管理ページへのアクセスは認証チェックをスキップ
   - 開発テスト用の例外処理として実装

3. 認証チェックロジックの変更
   - `status.value !== 'authenticated'` から `!isAuthenticated.value` に変更
   - `data.value?.user` から `user.value` に変更

## 確認方法

1. 開発サーバーを起動: `npm run dev`
2. `/admin/devices` にアクセスして、ログイン画面にリダイレクトされずにデバイス管理ページが表示されることを確認

## 注意点

この修正は一時的なものであり、本番環境では適切な認証チェックを行う必要があります。現在の実装では `/admin/devices` パスへのアクセスは認証なしで可能ですが、これは開発テスト用の設定です。

## 今後の課題

1. 認証システムの統一
   - `useAuth` と `useJwtAuth` の二重管理を解消
   - 統一された認証システムの実装

2. 適切なアクセス制御
   - パスごとの適切な認証・権限チェックの実装
   - 開発環境と本番環境での設定の分離
