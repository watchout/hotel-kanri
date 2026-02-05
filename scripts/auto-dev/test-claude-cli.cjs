const { spawnSync } = require('child_process');

console.log('🧪 Claude Code CLI テスト開始...');
const startTime = Date.now();

const result = spawnSync('claude', ['-p', 'Say "Hello World" in Japanese. Reply with only the translation.'], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
  timeout: 60000,
  stdio: ['pipe', 'pipe', 'pipe']
});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`⏱️ 実行時間: ${elapsed}秒`);
console.log(`📤 終了コード: ${result.status}`);

if (result.error) {
  console.log(`❌ エラー: ${result.error.message}`);
} else if (result.status !== 0) {
  console.log(`❌ stderr: ${result.stderr}`);
} else {
  console.log(`✅ 応答: ${result.stdout.substring(0, 200)}`);
}
