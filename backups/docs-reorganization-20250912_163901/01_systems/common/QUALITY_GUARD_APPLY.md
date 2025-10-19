# 品質ガード適用ガイド

本ガイドは `hotel-common/docs/CODING_STANDARDS.md` の規約を、hotel-saas / hotel-member / hotel-pms / hotel-common に徹底適用するための手順です。

## 1. 前提
- Node.js 20+ を使用
- 各プロジェクトは `hotel-common` と同階層に配置

## 2. 自動適用スクリプトの実行

```
cd ../hotel-common
# 一括適用（saas/member/pms）
node scripts/setup-quality-guard.js
# 個別適用
node scripts/setup-quality-guard.js hotel-saas
```

適用内容:
- `tsconfig.json` が `../hotel-common/configs/tsconfig.base.json` を `extends`
- `.eslintrc.cjs` / `.prettierrc.json` を配置
- `.eslintignore` / `.prettierignore` を配置
- `.github/workflows/quality-gate.yml` を配置
- pre-commit フック（危険DB検知 + ESLint + 型チェック + 規約違反検知）を設定
- `package.json` に `quality:*` スクリプトと Node 20 エンジンを追加/更新

## 3. 依存インストールと検証

```
# 各プロジェクトルートで
npm install
npm run quality:all     # ESLint + TypeScript 型チェック
npm run quality:detect  # 規約違反検知（パターンチェック）
```

## 4. CI での強制
- 各プロジェクトに配置された `.github/workflows/quality-gate.yml` により、PR で以下を必須チェック化:
  - `eslint` / `tsc --noEmit`
  - 規約違反検知（`scripts/detect-coding-violations.js`）

## 5. 検知対象（代表例）
- StandardResponseBuilder 未使用での `res.json` / `res.status(...).json` 直呼び
- `@prisma/client` 以外からの Prisma 生成物 import（例: `generated/prisma`）
- `any` / `as any` の使用
- `StandardResponseBuilder.error(res, ...)` の誤用
- ログの誤用（`logger.info(..., { ... })` で `data` 直下以外にカスタム項目を置く）

## 6. 収束手順
1) 自動適用で共通設定を導入
2) `npm run quality:ci` を回し、エラーをカテゴリごとに修正
3) Codemod/置換で共通違反（API/ログ/Prisma import/`any`）を一括修正
4) CI を必須化し、以後の再発をブロック

---
詳細な規約は `docs/CODING_STANDARDS.md` を参照してください。
