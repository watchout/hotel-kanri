# 参照先移行ガイド

## 概要

本ドキュメントでは、hotel-commonリポジトリからhotel-kanriリポジトリへのドキュメントと設定ファイルの移行に伴い、他リポジトリからの参照先を更新する手順について説明します。

## 移行対象

以下のリポジトリの参照先を更新します：

1. hotel-common
2. hotel-saas
3. hotel-pms
4. hotel-member

## 移行内容

以下の参照先を更新します：

1. ドキュメント参照
   - `hotel-common/docs/*` → `hotel-kanri/docs/*`

2. 設定ファイル参照
   - `hotel-common/config/*` → `hotel-kanri/config/*`

3. スクリプト参照
   - `hotel-common/scripts/*` → `hotel-kanri/scripts/*`

## 移行手順

### 自動移行スクリプトの使用

1. **スクリプトの準備**
   ```bash
   chmod +x scripts/migrate/update-references.sh
   ```

2. **各リポジトリに対してスクリプトを実行**
   ```bash
   ./scripts/migrate/update-references.sh /path/to/hotel-common
   ./scripts/migrate/update-references.sh /path/to/hotel-saas
   ./scripts/migrate/update-references.sh /path/to/hotel-pms
   ./scripts/migrate/update-references.sh /path/to/hotel-member
   ```

3. **Pull Requestの作成**
   スクリプト実行後に表示される手順に従って、各リポジトリでPull Requestを作成します。

### 手動移行手順

自動スクリプトで対応できない場合は、以下の手順で手動で更新します：

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/example/[リポジトリ名].git
   cd [リポジトリ名]
   ```

2. **ブランチの作成**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/update-kanri-references
   ```

3. **参照先の検索**
   ```bash
   grep -r "hotel-common/docs" --include="*.md" .
   grep -r "hotel-common/config" --include="*.{js,ts,json,yml,yaml}" .
   ```

4. **参照先の更新**
   検索結果に基づいて、ファイルを編集し参照先を更新します。

5. **変更のコミット**
   ```bash
   git add .
   git commit -m "docs: hotel-kanriリポジトリへの参照を更新"
   ```

6. **ブランチのプッシュ**
   ```bash
   git push origin feature/update-kanri-references
   ```

7. **Pull Requestの作成**
   GitHubウェブインターフェースでPull Requestを作成します。

## 移行確認

参照先の更新が完了したら、以下の確認を行います：

1. **リンク切れの確認**
   - CI/CDパイプラインのリンク切れチェックが通過することを確認
   - 手動でいくつかのリンクをクリックして確認

2. **ビルドの確認**
   - CI/CDパイプラインのビルドが成功することを確認

3. **動作確認**
   - 開発環境でアプリケーションが正常に動作することを確認

## 重複ドキュメントの削除

すべてのリポジトリの参照先更新が完了したら、hotel-commonリポジトリから重複するドキュメントを削除します：

1. **削除対象の特定**
   ```bash
   cd /path/to/hotel-common
   find docs -type f -name "*.md" | grep -v "README.md"
   ```

2. **削除ブランチの作成**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/remove-duplicate-docs
   ```

3. **ドキュメントの削除**
   ```bash
   # 例: 開発ルールとドキュメント標準の削除
   git rm docs/development-rules-and-documentation-standards.md
   
   # 例: ロードマップの削除
   git rm docs/roadmap/current-roadmap.md
   
   # 例: リポジトリ管理体制の削除
   git rm docs/management/repository-management-structure.md
   
   # 例: ドメイン関連ドキュメントの削除
   git rm docs/domain-management-strategy.md
   git rm docs/dev-server-domain-implementation-plan.md
   ```

4. **README.mdの更新**
   hotel-common/README.mdを編集し、削除したドキュメントへの参照をhotel-kanriリポジトリへの参照に更新します。

5. **変更のコミット**
   ```bash
   git add .
   git commit -m "docs: 重複するドキュメントを削除し、hotel-kanriリポジトリへの参照を追加"
   ```

6. **ブランチのプッシュ**
   ```bash
   git push origin feature/remove-duplicate-docs
   ```

7. **Pull Requestの作成**
   GitHubウェブインターフェースでPull Requestを作成します。

## 注意事項

1. **移行期間中の対応**
   - 移行完了までは両リポジトリのドキュメントを同期して更新します
   - 新しいドキュメントはhotel-kanriリポジトリに作成します

2. **リンク切れの対応**
   - リンク切れが発生した場合は、正しい参照先に更新します
   - 必要に応じてリダイレクトの仕組みを検討します

3. **チームへの周知**
   - 移行計画と進捗状況をチームに定期的に共有します
   - 移行完了後は全チームメンバーに通知します

## 責任者

- **移行責任者**: [役職名]
- **レビュー担当**: [役職名]
- **承認者**: [役職名]

## スケジュール

| フェーズ | 内容 | 期日 | ステータス |
|---------|------|------|----------|
| 1 | 参照先更新スクリプト作成 | YYYY-MM-DD | 完了 |
| 2 | hotel-commonの参照先更新 | YYYY-MM-DD | 進行中 |
| 3 | hotel-saasの参照先更新 | YYYY-MM-DD | 予定 |
| 4 | hotel-pmsの参照先更新 | YYYY-MM-DD | 予定 |
| 5 | hotel-memberの参照先更新 | YYYY-MM-DD | 予定 |
| 6 | 重複ドキュメントの削除 | YYYY-MM-DD | 予定 |

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: YYYY-MM-DD