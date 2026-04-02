# サーバー起動問題の修正記録

**修正日時:** 2025年8月18日

## 問題の概要

hotel-saasアプリケーションで以下の問題が発生していました：

1. サーバー起動時に「JS heap out of memory」エラーが発生
2. GrapesJSエディタの依存関係が解決できない
3. Prisma関連のインポートエラー
4. 重複インポートの警告
5. API呼び出し時の「Invalid lazy handler result」エラー

## 修正内容

### 1. GrapesJSエディタ関連の修正

- `components/admin/layouts/GrapesJsEditor.vue`ファイルを削除
- `components/admin/layouts/SimpleGrapesJsEditor.vue`ファイルを削除
- 参照元のコンポーネント（`TemplateEditor.vue`と`template-editor.vue`）を修正し、GrapesJSエディタの代わりにプレースホルダーを表示するよう変更

### 2. Prisma関連の修正

- `server/utils/db-mock.ts`ファイルを削除
- `server/utils/prisma.ts`ファイルを削除
- 以下のファイルのインポート文を修正：
  - `server/services/llm.ts`
  - `server/services/credit.ts`
  - `server/services/knowledge.ts`
  - `server/services/info-integration.ts`
- すべてのPrisma関連のインポートを`server/utils/db-service.ts`からのインポートに統一

### 3. キャッシュクリア

- `.nuxt`ディレクトリを削除
- `node_modules/.vite`ディレクトリを削除
- `node_modules/.cache`ディレクトリを削除

### 4. API関連の修正

- Nuxt Authが期待する以下のダミーAPIエンドポイントを作成：
  - `server/api/auth/session.get.ts`
  - `server/api/auth/csrf.get.ts`
  - `server/api/auth/providers.get.ts`

## 今後の注意点

1. **GrapesJSエディタの扱い**
   - GrapesJSエディタは依存関係の問題により一時的に無効化されています
   - 将来的に必要であれば、別のエディタライブラリへの移行を検討してください

2. **Prisma直接アクセスの禁止**
   - hotel-saasからPrismaを直接使用することは避け、常に`db-service.ts`経由でアクセスしてください
   - 最終的には、hotel-commonのAPIを使用する形に移行する必要があります

3. **重複インポートの警告**
   - 重複インポートの警告は現在も発生していますが、アプリケーションの動作に影響はありません
   - 将来的には`db-service.ts`に一本化することで解決できます

4. **メモリ使用量の監視**
   - サーバー起動時に`NODE_OPTIONS="--max-old-space-size=8192"`を使用して、Node.jsのメモリ制限を増やしています
   - メモリ使用量を定期的に監視し、必要に応じて調整してください

## 復旧手順（問題が再発した場合）

1. キャッシュをクリア：
   ```bash
   rm -rf .nuxt node_modules/.vite node_modules/.cache
   ```

2. サーバーを再起動（メモリ制限を増やして）：
   ```bash
   NODE_OPTIONS="--max-old-space-size=8192" npm run dev -- --host 0.0.0.0 --port 3100
   ```

3. それでも問題が解決しない場合は、このコミット（cbfa075）に戻してください：
   ```bash
   git checkout cbfa075
   ```
