# G3フェーズ実施指示書（UNIFY-DEV）

## 概要
G2フェーズが全サービスで成功したことを受け、G3フェーズ（開発サーバー適用）を実施します。このフェーズでは、ローカル環境で検証済みの統合設定を開発サーバーに適用します。

## 目標
1. 全サービスを開発サーバー上で統合DB（hotel_unified_db）に接続
2. 正準ポート（3100/3200/3300/8080/3400）での稼働確認
3. サブドメインを通じたアクセス確認
4. サービス間連携の検証

## 共通指示事項

### 1. 環境変数設定
- `UNIFY_ENV=dev`
- `DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db`
- 各サービスの`.env`ファイルを更新

### 2. PM2設定の確認・更新
- `ecosystem.config.js`に環境変数設定が反映されていることを確認
- ポート設定が正準値（3100/3200/3300/8080/3400）であることを確認
- ログ設定の確認

### 3. デプロイ後の検証
- `/health`エンドポイント（または`/api/health`）の応答確認
- サブドメイン経由でのアクセス確認
- サービス間連携の確認

## 担当者別指示

### Sun（hotel-saas担当）

#### 作業内容
1. **環境変数設定**
   - `.env.production`の更新
   ```
   UNIFY_ENV=dev
   DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db
   PORT=3100
   ```

2. **PM2設定確認**
   - `ecosystem.config.js`の環境変数とポート設定確認
   - ログパスの確認

3. **デプロイ実施**
   - hotel-kanriリポジトリのGitHub Actionsを使用
   - 必要に応じてビルドスクリプトの修正（CSSの`import.meta`エラー対応）

4. **検証**
   - `https://dev-app.omotenasuai.com/api/health`の応答確認
   - hotel-common APIへの接続確認

5. **報告**
   - デプロイ結果をG3報告書としてまとめる
   - 発生した問題と解決策を記録

### Suno（hotel-member担当）

#### 作業内容
1. **環境変数設定**
   - API（FastAPI）の`.env.production`更新
   ```
   UNIFY_ENV=dev
   DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db
   PORT=3200
   ```
   - UI（Nuxt）の`.env.production`更新
   ```
   UNIFY_ENV=dev
   PORT=8080
   API_URL=http://localhost:3200
   ```

2. **PM2設定確認**
   - API用とUI用の`ecosystem.config.js`確認
   - ポート設定（3200/8080）確認

3. **デプロイ実施**
   - hotel-kanriリポジトリのGitHub Actionsを使用
   - APIとUIの両方のデプロイ確認

4. **検証**
   - `https://dev-crm.omotenasuai.com/health`の応答確認
   - hotel-common APIへの接続確認

5. **報告**
   - デプロイ結果をG3報告書としてまとめる

### Luna（hotel-pms担当）

#### 作業内容
1. **環境変数設定**
   - `.env.production`の更新
   ```
   UNIFY_ENV=dev
   DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db
   PORT=3300
   ```

2. **PM2設定確認**
   - `ecosystem.config.js`の環境変数とポート設定確認
   - Electron版の設定確認（必要に応じて）

3. **デプロイ実施**
   - hotel-kanriリポジトリのGitHub Actionsを使用

4. **検証**
   - `https://dev-pms.omotenasuai.com/health`の応答確認
   - hotel-common APIへの接続確認

5. **報告**
   - デプロイ結果をG3報告書としてまとめる

### Iza（hotel-common担当）

#### 作業内容
1. **環境変数設定**
   - `.env.production`の更新
   ```
   UNIFY_ENV=dev
   DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db
   PORT=3400
   ```

2. **PM2設定確認**
   - `ecosystem.config.js`の環境変数とポート設定確認

3. **Nginx設定確認**
   - 各サブドメインの設定確認
   ```
   dev-app.omotenasuai.com → 3100
   dev-crm.omotenasuai.com → 3200/8080
   dev-pms.omotenasuai.com → 3300
   dev-api.omotenasuai.com → 3400
   ```

4. **デプロイ実施**
   - hotel-kanriリポジトリのGitHub Actionsを使用

5. **統合検証**
   - 全サービスの`/health`エンドポイント確認
   - サービス間連携の確認
   - 統合DBへの接続確認

6. **報告**
   - G3フェーズ全体の統合報告書作成

## デプロイ順序

1. hotel-common（基盤サービス）
2. hotel-member（認証・会員基盤）
3. hotel-pms（予約・運用基盤）
4. hotel-saas（フロントエンド・顧客向け）

## タイムライン

1. 準備フェーズ: 各サービスの環境変数・PM2設定の更新（1日）
2. デプロイフェーズ: 順次デプロイと個別検証（1日）
3. 統合検証フェーズ: サービス間連携の確認（1日）
4. 報告フェーズ: G3報告書の作成と共有（0.5日）

## 注意事項

1. **パスワード管理**
   - 本番パスワードをコードにコミットしないこと
   - 環境変数として外部管理すること

2. **デプロイ調整**
   - 各サービスのデプロイ前に他チームと調整すること
   - デプロイ完了後は速やかに報告すること

3. **ロールバック準備**
   - 問題発生時のロールバック手順を準備しておくこと
   - 旧設定のバックアップを取得しておくこと

4. **監視体制**
   - デプロイ後24時間は監視を強化すること
   - エラーログを定期的に確認すること

## 報告フォーマット

G3報告書には以下の内容を含めてください：

1. デプロイ日時
2. デプロイしたバージョン
3. 環境変数設定（パスワード除く）
4. PM2プロセス状態
5. ヘルスチェック結果
6. 発生した問題と解決策
7. 次のステップ（G4準備）

## 連絡体制

問題発生時は以下の順で連絡してください：

1. 担当チーム内で対応
2. 統合管理者（Iza）に報告
3. 必要に応じて全体MTG招集

以上の指示に従い、G3フェーズを計画的に実施してください。
