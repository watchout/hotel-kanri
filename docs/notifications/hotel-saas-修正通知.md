# hotel-saasリポジトリ修正通知

## 修正日時
2023年8月17日

## 修正者
hotel-kanri (統合管理チーム)

## 修正内容
hotel-saasのデプロイ失敗の原因となっていた問題を修正しました。以下の修正を行いました：

1. Vueファイルの末尾の%記号を削除
   - layouts/fullscreen.vue
   - layouts/receipt.vue
   - layouts/operation.vue
   - layouts/info.vue

2. server/utils/prisma.tsのエクスポート形式を修正
   - `export default prisma %` → `export { prisma }`

3. assets/css/billing-fix.cssの末尾の%記号を削除

4. nuxt.config.tsからbilling-fix.cssの参照を削除
   - `css: ["~/assets/css/tailwind.css", "~/assets/css/billing-fix.css"]` → `css: ["~/assets/css/tailwind.css"]`

5. package.jsonの依存関係を修正
   - reactのバージョンを18.2.0に変更
   - vue-i18nを追加

## 修正理由
これらの問題により、GitHub Actionsを通じたデプロイプロセスでNuxtのビルドが失敗していました。特に、末尾の%記号とimport.metaの使用がモジュールモードでエラーを引き起こしていました。

## 対応依頼
hotel-saasチーム（Sun）は以下の対応をお願いします：

1. 最新の変更をpullして、ローカル環境を最新の状態に更新してください
   ```
   git pull origin main
   ```

2. 今後、ファイルの末尾に%記号を追加しないようにしてください

3. 依存関係の競合に注意してください（特にreactとnext-authの組み合わせ）

4. 将来的にはNode.jsをv20以上にアップグレードすることを検討してください（lru-cacheなどの依存関係がNode.js v20以上を要求しています）

## 確認事項
この修正により、GitHub Actionsを通じたデプロイが正常に行われるようになる予定です。何か問題があれば、hotel-kanriまでご連絡ください。
