# hotel-saas 修正通知

**日付**: 2023年8月17日
**送信元**: hotel-kanri

hotel-saasのデプロイ失敗の原因となっていた以下の問題を修正し、`main`ブランチにプッシュしました。

**修正内容**:
- `plugins/tv-remote-control.client.js`: 不足していたプラグインファイルを作成しました
- `assets/css/billing-fix.css`: CSS構文エラーを修正しました（閉じブレースの追加）

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