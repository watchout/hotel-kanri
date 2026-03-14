# SSOT監査コマンド

## 使い方

```
>> audit <SSOTファイル名>
```

## 例

```
>> audit SSOT_SAAS_PERMISSION_SYSTEM
```

## 動作

1. 指定されたSSOTファイルを特定
2. `scripts/ssot-audit/audit-ssot.cjs`を実行
3. 監査レポートを表示

## 実行コマンド

```bash
node scripts/ssot-audit/audit-ssot.cjs docs/03_ssot/00_foundation/<SSOT名>.md
```

## 出力

- スコア（100点満点）
- Critical指摘（必須修正）
- Warning指摘（推奨修正）
- レポートファイル

## コスト

約$0.01/回（GPT-4o-mini × 2）
