const { spawnSync } = require('child_process');

const prompt = `
タスク DEV-0171 のSSOTを作成してください。

必須セクション（500行以内）:
1. ## 概要・目的（50行）- 何を実現するか
2. ## スコープ（30行）- 対象範囲と除外範囲
3. ## API設計（100行）- エンドポイント、リクエスト/レスポンス例
4. ## DB設計（50行）- テーブル、カラム、型
5. ## エラー処理（50行）- エラーコード、メッセージ
6. ## テストケース（100行）- 正常系/異常系
7. ## Accept条件（50行）- 具体的な合格基準

Markdown形式で出力してください。
`;

console.log('🧪 中間サイズプロンプトテスト開始...');
console.log(\`📝 プロンプトサイズ: \${prompt.length}文字\`);
const startTime = Date.now();

const result = spawnSync('claude', ['-p', prompt], {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
  timeout: 180000, // 3分タイムアウト
  stdio: ['pipe', 'pipe', 'pipe']
});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(\`⏱️ 実行時間: \${elapsed}秒\`);
console.log(\`📤 終了コード: \${result.status}\`);

if (result.error) {
  console.log(\`❌ エラー: \${result.error.message}\`);
} else if (result.status !== 0) {
  console.log(\`❌ stderr: \${result.stderr}\`);
} else {
  console.log(\`✅ 応答長: \${result.stdout.length}文字\`);
  console.log(\`📄 先頭200文字:\n\${result.stdout.substring(0, 200)}\`);
}
