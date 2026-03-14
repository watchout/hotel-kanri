#!/usr/bin/env node

/**
 * ハルシネーション検出スクリプト
 * 
 * 目的:
 * - AIが実在しないファイル・関数・変数を参照していないかチェック
 * - プレースホルダーの使用を検出
 * - 曖昧表現の使用を検出
 * 
 * 実行:
 * node scripts/quality/detect-hallucination.cjs <file-path>
 */

const fs = require('fs');
const path = require('path');

// ==========================================
// ハルシネーションパターン定義
// ==========================================

const HALLUCINATION_PATTERNS = [
  // プレースホルダー検出
  {
    pattern: /\/\/ TODO:|\/\/ FIXME:|\/\/ PLACEHOLDER:/gi,
    severity: 'high',
    message: 'プレースホルダーコメントが残っています',
  },
  {
    pattern: /@ts-ignore|@ts-expect-error/gi,
    severity: 'high',
    message: 'TypeScript型エラーを無視しています（ハルシネーションの可能性）',
  },
  {
    pattern: /any\s+as\s+\w+/gi,
    severity: 'medium',
    message: 'any型を使用した型アサーション（不確実性の兆候）',
  },
  
  // 存在しないモジュール検出
  {
    pattern: /from\s+['"]@\/(?:types|utils|helpers)\/\w+['"]/gi,
    severity: 'high',
    message: '実在しない可能性のあるモジュールインポート',
  },
  
  // 曖昧表現検出（コメント内）
  {
    pattern: /\/\/.*(?:たぶん|おそらく|かもしれません|だと思います)/gi,
    severity: 'medium',
    message: 'コメント内に曖昧表現が含まれています',
  },
  
  // 未実装関数の呼び出し
  {
    pattern: /fetchData\(\)|getData\(\)|handleSubmit\(\)/gi,
    severity: 'high',
    message: '一般的なプレースホルダー関数名が使用されています',
  },
];

// ==========================================
// ファイル検査
// ==========================================

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const issues = [];
  
  HALLUCINATION_PATTERNS.forEach(({ pattern, severity, message }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        issues.push({
          line: index + 1,
          severity,
          message,
          code: line.trim(),
        });
      }
    });
  });
  
  return issues;
}

// ==========================================
// 結果出力
// ==========================================

function printResults(filePath, issues) {
  if (issues.length === 0) {
    console.log(`✅ ハルシネーション検出: 問題なし (${filePath})`);
    return true;
  }
  
  console.error(`\n🚨 ハルシネーション検出: ${issues.length}件の問題 (${filePath})\n`);
  
  issues.forEach((issue, index) => {
    const icon = issue.severity === 'high' ? '❌' : '⚠️';
    console.error(`${icon} [${issue.severity.toUpperCase()}] Line ${issue.line}`);
    console.error(`   ${issue.message}`);
    console.error(`   Code: ${issue.code}`);
    console.error('');
  });
  
  return false;
}

// ==========================================
// メイン処理
// ==========================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('使用方法: node detect-hallucination.cjs <file-path>');
    process.exit(1);
  }
  
  const filePath = args[0];
  const issues = checkFile(filePath);
  const passed = printResults(filePath, issues);
  
  process.exit(passed ? 0 : 1);
}

main();

