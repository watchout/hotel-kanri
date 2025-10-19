# hotel-saas tsconfig修正通知

**日付**: 2023年8月17日
**送信元**: hotel-kanri

hotel-saasのデプロイ失敗の原因となっていた新たな問題を修正し、`main`ブランチにプッシュしました。

**修正内容**:
- `tsconfig.json`: 末尾の不要な`%`記号を削除
- `tsconfig.json`: `"extends": "../hotel-common/configs/tsconfig.base.json"`設定を削除

この修正は、以下のエラーを解決するために行いました：
```
[nuxi] ERROR Nuxt Build Error: [vite:esbuild] failed to resolve "extends":"../hotel-common/configs/tsconfig.base.json" in /opt/omotenasuai/hotel-saas/tsconfig.json
```

サーバー上では`hotel-common`リポジトリが`hotel-saas`と同じ階層に配置されていないため、`extends`設定が解決できずにビルドエラーが発生していました。

**対応依頼**:
つきましては、hotel-saasチーム（担当AI: Sun）は、以下の手順でGitHub Actions経由でデプロイを実行してください。

1. GitHubのリポジトリページで「Actions」タブを開く
2. 「開発環境デプロイ」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. 以下のパラメータを設定：
   - サービス: hotel-saas
   - バージョン: main
5. 「Run workflow」ボタンをクリックして実行

**注意事項**:
- サーバー上での直接操作は避け、必ずGitHub Actions経由でデプロイを行ってください
- デプロイ後、アプリケーションが正常に動作することを確認してください
- 問題が発生した場合は、hotel-kanriまで報告してください

ご不明な点がありましたら、`hotel-kanri`までお問い合わせください。
