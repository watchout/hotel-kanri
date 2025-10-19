# hotel-commonからの重複ドキュメント削除ガイド

## 概要

このガイドは、hotel-kanriリポジトリへのドキュメント移行完了後、hotel-commonリポジトリから重複するドキュメントを削除するための手順を説明します。

## 削除対象ドキュメント

以下のドキュメントがhotel-kanriに移行済みのため、hotel-commonから削除対象となります：

1. `docs/development-rules-and-documentation-standards.md`
   - 移行先: `docs/development/development-rules-and-documentation-standards.md`

2. `docs/roadmap/current-roadmap.md`
   - 移行先: `docs/roadmap/current-roadmap.md`

3. `docs/management/repository-management-structure.md`
   - 移行先: `docs/management/repository-management-structure.md`

4. `docs/domain-management-strategy.md`
   - 移行先: `docs/infrastructure/domains/domain-management-strategy.md`

5. `docs/dev-server-domain-implementation-plan.md`
   - 移行先: `docs/infrastructure/domains/dev-server-domain-implementation-plan.md`

## 削除手順

### 手動削除の場合

1. hotel-commonリポジトリをクローンまたは最新化
   ```bash
   git clone <hotel-common-repository-url>
   # または
   cd path/to/hotel-common
   git checkout develop
   git pull origin develop
   ```

2. 新しいブランチを作成
   ```bash
   git checkout -b feature/remove-duplicate-docs
   ```

3. ファイルを削除
   ```bash
   git rm docs/development-rules-and-documentation-standards.md
   git rm docs/roadmap/current-roadmap.md
   git rm docs/management/repository-management-structure.md
   git rm docs/domain-management-strategy.md
   git rm docs/dev-server-domain-implementation-plan.md
   ```

4. README.mdの参照先を更新
   - 各ドキュメントへのリンクをhotel-kanriリポジトリの対応するパスに更新

5. 変更をコミット
   ```bash
   git add .
   git commit -m "docs: 重複するドキュメントを削除し、hotel-kanriリポジトリへの参照を追加"
   ```

6. 変更をプッシュしPRを作成
   ```bash
   git push origin feature/remove-duplicate-docs
   ```

### 自動削除スクリプトの使用

1. 提供されたスクリプトを使用
   ```bash
   cd path/to/hotel-kanri
   ./scripts/migrate/remove-duplicate-docs.sh /path/to/hotel-common
   ```

2. スクリプトの実行結果に従ってPRを作成

## 注意事項

- 削除前に必ずhotel-kanriリポジトリへの移行が完了していることを確認してください
- README.mdなど他のファイルからの参照がある場合は、すべて更新してください
- PRのレビュー時には、参照先の更新が正しく行われていることを確認してください

## 移行後の確認

1. hotel-commonのREADME.mdが正しくhotel-kanriのドキュメントを参照していることを確認
2. 開発チームに移行完了と新しい参照先を通知
3. 必要に応じて他のリポジトリの参照も更新

## トラブルシューティング

- リンク切れが発生した場合は、hotel-kanriリポジトリの正確なパスとブランチ名を確認
- 削除したドキュメントへの参照が他にも残っていないか確認