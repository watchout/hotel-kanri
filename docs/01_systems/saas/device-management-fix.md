# デバイス管理ページの修正内容

## 問題点

デバイス管理ページ (`/admin/devices`) で以下の問題が発生していました：

1. `ConfirmModal` コンポーネントが解決できない
   ```
   [Vue warn]: Failed to resolve component: ConfirmModal
   ```

2. 認証エラーによりAPIリクエストが失敗
   ```
   デバイス一覧取得エラー: FetchError: [GET] "/api/v1/admin/devices": 403 Forbidden
   ```

## 修正内容

### 1. ConfirmModalコンポーネントの解決問題

`pages/admin/devices/index.vue` ファイルで `ConfirmModal` コンポーネントをインポートしていませんでした。
また、コンポーネントのプロパティとイベントが正しく設定されていませんでした。

**修正点：**
- `ConfirmModal` コンポーネントを明示的にインポート
- コンポーネントのプロパティを正しく設定（`v-if` → `:show`）
- イベント名を正しく設定（`@close` → `@cancel`）

```javascript
// インポート追加
import ConfirmModal from '~/components/common/ConfirmModal.vue';

// プロパティとイベント修正
<ConfirmModal
  :show="showDeviceModal"
  :title="editingDevice ? 'デバイス編集' : 'デバイス追加'"
  message=""
  @cancel="closeDeviceModal"
  @confirm="saveDevice"
  :confirmText="editingDevice ? '更新' : '追加'"
>
```

### 2. 認証ミドルウェアの問題

`middleware/admin-auth.ts` ファイルで認証チェックが無効化されていました。
開発テスト用のコードがコメントアウトされずに残っていたため、認証チェックが常にスキップされていました。

**修正点：**
- 認証を無効化する `return` 文を削除

```javascript
export default defineNuxtRouteMiddleware(async (to) => {
  // 開発テスト用：認証を一時的に無効化
  return  // ← この行を削除

  // クライアントサイドでのみ実行
  if (process.server) return
  ...
```

## 確認方法

1. 開発サーバーを起動: `npm run dev`
2. ブラウザで `/admin/login` にアクセスしてログイン
3. `/admin/devices` にアクセスしてデバイス管理ページが正しく表示されることを確認
4. 各機能（デバイスの追加、編集、リセット、チェックアウト）が正常に動作することを確認

## 注意点

- 認証ミドルウェアを有効化したため、ログインが必要になります
- 認証情報が有効でない場合は、`/admin/login` にリダイレクトされます
- テスト用のログイン情報：
  - Email: admin@omotenasuai.com
  - Password: password
