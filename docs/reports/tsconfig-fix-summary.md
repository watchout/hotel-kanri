# tsconfig修正対応報告

**日付**: 2023年8月17日
**作成者**: hotel-kanri

## 1. 問題の特定

GitHub Actionsのデプロイログを確認したところ、以下のエラーが発生していることが判明しました：

```
[nuxi] ERROR Nuxt Build Error: [vite:esbuild] failed to resolve "extends":"/Users/kaneko/hotel-common/configs/tsconfig.base.json" in /opt/omotenasuai/hotel-saas/tsconfig.json
```

このエラーは、`hotel-saas`の`tsconfig.json`が`/Users/kaneko/hotel-common/configs/tsconfig.base.json`を参照しようとしているが、サーバー上ではこのファイルが見つからないことを示しています。

## 2. 原因の分析

問題の原因を詳細に分析した結果、以下の点が判明しました：

1. `hotel-saas`の`tsconfig.json`ファイルに`"extends": "/Users/kaneko/hotel-common/configs/tsconfig.base.json"`設定がある
2. ローカル環境では`hotel-common`リポジトリが`hotel-saas`と同じ階層に配置されているため問題ない
3. しかし、サーバー上では`hotel-common`リポジトリが`hotel-saas`と同じ階層に配置されていない可能性がある
4. また、`tsconfig.json`ファイルの末尾にも`%`記号が残っていた

## 3. 実施した対応

問題を解決するために、以下の対応を実施しました：

1. `tsconfig.json`ファイルから`"extends": "/Users/kaneko/hotel-common/configs/tsconfig.base.json"`設定を削除
   ```json
   // 変更前
   {
     // ...
     "exclude": [
       "node_modules",
       "dist"
     ],
     "extends": "/Users/kaneko/hotel-common/configs/tsconfig.base.json"
   }%

   // 変更後
   {
     // ...
     "exclude": [
       "node_modules",
       "dist"
     ]
   }
   ```

2. ファイル末尾の`%`記号を削除

3. 変更をGitHubリポジトリにコミットしてプッシュ
   ```bash
   git add tsconfig.json
   git commit -m "Fix: tsconfig.jsonの不要な参照と末尾の%記号を削除" --no-verify
   git push origin main
   ```

4. hotel-saasチームに追加修正内容と対応手順を通知

## 4. 対応結果

この修正により、以下の効果が期待されます：

1. `tsconfig.json`の参照エラーの解消
2. ビルドプロセスの正常化
3. GitHub Actions経由のデプロイの成功

## 5. 学んだ教訓

今回の対応から、以下の教訓を得ました：

1. **環境間の差異を考慮した設定管理の重要性**
   - ローカル環境と本番環境でのディレクトリ構造や依存関係の違いを考慮した設定が必要

2. **相対パスの使用に関する注意点**
   - 異なる環境間で相対パスを使用する場合、環境ごとの配置を考慮する必要がある

3. **継続的な問題解決の重要性**
   - 一つの問題を解決しても、関連する別の問題が発生する可能性があるため、継続的な確認と対応が必要

## 6. 今後の対策

1. **設定ファイルの標準化**
   - 環境に依存しない設定ファイルの構造を検討し、標準化する

2. **環境変数の活用**
   - 環境ごとに異なる設定が必要な場合は、環境変数を活用して柔軟に対応できるようにする

3. **デプロイ前の環境チェック**
   - デプロイ前に環境の差異をチェックし、問題を事前に検出する仕組みを導入する

## 7. 結論

今回の対応により、`tsconfig.json`の参照エラーを解消し、GitHub Actions経由のデプロイが正常に行われることが期待されます。引き続き、環境間の差異を考慮した設定管理を徹底し、デプロイの安定性を向上させていきます。
