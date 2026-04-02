# hotel-saasデータベース接続問題の解決

**作成日**: 2025年8月18日  
**ステータス**: 解決済み

## 問題概要

hotel-saasプロジェクトから統合データベース（hotel_unified_db）に接続できない問題が報告されました。

## 原因調査

1. **接続情報の確認**:
   - hotel-saas側の接続情報:
     ```
     DATABASE_URL="postgresql://hotel_app:xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9@127.0.0.1:5432/hotel_unified_db"
     ```
   - hotel-common側の接続情報:
     ```
     DATABASE_URL="postgresql://kaneko:@localhost:5432/hotel_unified_db"
     ```

2. **データベースの状態確認**:
   - PostgreSQLサーバーは正常に起動しており、接続を受け付けています
   - `hotel_unified_db`データベースは存在しています
   - `hotel_app`ユーザーは存在していましたが、パスワードが異なっていた可能性があります

3. **権限の確認**:
   - `hotel_app`ユーザーには128の権限が付与されていましたが、一部テーブルへのアクセス権限が不足していた可能性があります

## 実施した対応

1. **ユーザーパスワードの更新**:
   ```sql
   ALTER USER hotel_app WITH PASSWORD 'xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9';
   ```

2. **テーブル権限の付与**:
   ```sql
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hotel_app;
   ```

3. **シーケンス権限の付与**:
   ```sql
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hotel_app;
   ```

4. **接続テスト**:
   - `hotel_app`ユーザーでの接続テストを実施し、正常に接続できることを確認しました
   - テーブル数（32）を確認し、データベースにアクセスできることを確認しました

## 解決策

hotel-saasプロジェクトの接続問題は、以下の対応により解決しました:

1. `hotel_app`ユーザーのパスワードを、hotel-saas側の`.env`ファイルに記載されている値に更新
2. `hotel_app`ユーザーに全テーブルとシーケンスへのアクセス権限を付与
3. 接続テストを実施して正常に動作することを確認

## 今後の対策

1. **接続情報の統一管理**:
   - 各プロジェクト間で接続情報を一元管理する仕組みを導入
   - 環境変数の変更時に自動的に関連プロジェクトに通知する仕組みを構築

2. **権限管理の改善**:
   - データベース権限を定期的に監査
   - 新しいテーブルが作成された際に自動的に適切な権限を付与する仕組みを導入

3. **接続テストの自動化**:
   - CI/CDパイプラインに接続テストを組み込む
   - 定期的な接続状態のモニタリングを実施

## 結論

hotel-saasプロジェクトのデータベース接続問題は、ユーザーパスワードの更新と適切な権限の付与により解決しました。今後は接続情報の一元管理と権限管理の改善により、同様の問題の再発を防止します。
