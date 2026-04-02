
# Hotel Commonコーディング標準規約

## 目的
このドキュメントは、Hotel Commonプロジェクトにおけるコーディング標準を定義し、コードの一貫性、品質、保守性を確保することを目的としています。すべての開発者はこれらの規則に従う必要があります。

## 1. API標準

### 1.1 StandardResponseBuilderの使用

```typescript
// 成功レスポンス - 必ず以下の形式で使用すること
return StandardResponseBuilder.success(res, data, meta?, statusCode?);

// エラーレスポンス - 必ず以下の形式で使用すること
// コード、メッセージ、詳細、ステータスコードの順
const { response, statusCode } = StandardResponseBuilder.error(
  ERROR_CODES.XXX,  // エラーコード（文字列）
  'エラーメッセージ', // エラーメッセージ（文字列）
  details?,        // 詳細情報（任意）
  statusCode?      // HTTPステータスコード（任意、デフォルト400）
);
return res.status(statusCode).json(response);
```

❌ 誤った使用法:
```typescript
// レスポンスオブジェクトを直接渡す
StandardResponseBuilder.error(res, 'CAMPAIGN_ERROR', 'エラーメッセージ', error);

// 引数が不足している
StandardResponseBuilder.success(campaign);
```

✅ 正しい使用法:
```typescript
// 成功レスポンス
return StandardResponseBuilder.success(res, campaign);

// エラーレスポンス
const { response, statusCode } = StandardResponseBuilder.error(
  'CAMPAIGN_ERROR',
  'キャンペーン取得エラー',
  error instanceof Error ? error.message : String(error)
);
return res.status(statusCode).json(response);
```

## 2. ロギング標準

### 2.1 LogEntry型の使用

`LogEntry`インターフェースに定義されていないフィールドを使用しないでください。すべてのカスタムデータは`data`オブジェクト内に配置します。

```typescript
export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  module?: string
  tenantId?: string
  userId?: string
  requestId?: string
  data?: any       // カスタムデータはここに格納
  error?: Error    // エラーオブジェクトはここに格納
}
```

❌ 誤った使用法:
```typescript
this.logger.info('メッセージ', { 
  endpoints: 5,    // LogEntryに直接追加
  token_length: 256  // LogEntryに直接追加
});

this.logger.error('エラー', error);  // unknownをそのまま渡す
```

✅ 正しい使用法:
```typescript
this.logger.info('メッセージ', {
  data: {  // dataオブジェクト内にカスタムデータを配置
    endpoints: 5,
    token_length: 256
  }
});

this.logger.error('エラー', { 
  error: error instanceof Error ? error : new Error(String(error))
});
```

## 3. Prisma関連

### 3.1 PrismaClientのインポート

PrismaClientは必ず以下のパスからインポートしてください：

```typescript
import { PrismaClient } from '@prisma/client';
```

生成されたPrismaクライアントを直接参照しないでください：

❌ 誤った使用法:
```typescript
import { PrismaClient } from '../../generated/prisma';
```

### 3.2 型の使用

Prismaが生成した型を使用する場合は、必ず`@prisma/client`からインポートしてください：

```typescript
import { User, Reservation, Room } from '@prisma/client';
```

## 4. エラーハンドリング

### 4.1 エラーオブジェクトの変換

unknownまたはany型のエラーを扱う場合は、必ずErrorオブジェクトに変換してください：

```typescript
try {
  // 処理
} catch (error) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  this.logger.error('エラーメッセージ', { error: errorObj });
}
```

### 4.2 エラーメッセージの抽出

エラーメッセージを表示する場合は、以下の方法で抽出してください：

```typescript
const errorMessage = error instanceof Error ? error.message : String(error);
```

## 5. 型安全性

### 5.1 暗黙的any型の禁止

すべての変数、パラメータ、戻り値には明示的な型を指定してください：

❌ 誤った使用法:
```typescript
function process(data) {
  return data.map(item => item.name);
}
```

✅ 正しい使用法:
```typescript
function process(data: DataItem[]): string[] {
  return data.map((item: DataItem) => item.name);
}
```

### 5.2 型アサーションの使用制限

型アサーションは最小限に抑え、必要な場合のみ使用してください：

❌ 過剰な使用:
```typescript
const result = someFunction() as any as SpecificType;
```

✅ 適切な使用:
```typescript
const result = someFunction();
if (isSpecificType(result)) {
  const typedResult: SpecificType = result;
  // 処理
}
```

## 6. コードレビュー基準

すべてのコード変更は、以下の基準に基づいてレビューされます：

1. このコーディング標準への準拠
2. TypeScriptコンパイラエラーがないこと
3. 既存の機能が壊れていないこと
4. コードの可読性と保守性

## 7. 実装プロセス

1. 機能実装前に型定義を完成させる
2. 小さな単位でコミットする
3. 変更前にコンパイルエラーがないことを確認する
4. 変更後も`tsc --noEmit`でエラーがないことを確認する

## 8. 実効ルール（強制手段）

本規約の遵守を徹底するため、以下の強制手段を採用します。

- 共通設定の配布と拡張
  - tsconfig: `configs/tsconfig.base.json` を各プロジェクトの `tsconfig.json` で `extends` すること
  - ESLint: ルートに `.eslintrc.*` を設置し、`@typescript-eslint` を用いた型安全ルールを有効化
  - Prettier: ルートに `.prettierrc` を設置
- Gitフック
  - pre-commit で危険なDB操作検出 + `eslint --max-warnings=0` + `tsc --noEmit` を実行（コミットブロック）
- CI（Quality Gate）
  - GitHub Actionsで `eslint` と `tsc --noEmit` を必須チェック化。未合格のPRはマージ不可

### 8.1 自動適用スクリプト

- `scripts/setup-quality-guard.js` を使用して、`tsconfig` の `extends` 設定、ESLint/Prettier 設定、pre-commit フック、CI ワークフローを
  各プロジェクト（hotel-saas / hotel-member / hotel-pms）へ自動適用できます。
- 実行例:
  ```bash
  # hotel-common から一括適用
  node scripts/setup-quality-guard.js

  # 個別適用
  node scripts/setup-quality-guard.js hotel-saas
  ```

## 9. モジュール/ランタイム方針

- Node.js: 20 LTS を推奨
- Module: CommonJS を基本とする（将来ESMへ移行する場合は別紙方針に従う）
- デコレータ: `experimentalDecorators` と `emitDecoratorMetadata` を有効

## 10. パス/エイリアス方針（任意）

- パス解決は Node 互換（moduleResolution: Node）
- 共有型/ユーティリティは `hotel-common` パッケージから輸入

## 遵守の徹底

これらの規則はプロジェクトの品質と一貫性を保つために**絶対に守るべき**ものです。規則に従わないコードは、マージされる前に修正が必要です。
