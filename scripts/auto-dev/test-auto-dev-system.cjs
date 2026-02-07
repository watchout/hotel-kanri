#!/usr/bin/env node
/**
 * 自動開発システム統合テスト
 * 
 * 全コンポーネントが正しく動作するかを確認する
 * 
 * Usage:
 *   node test-auto-dev-system.cjs
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ===== 設定 =====
const SCRIPTS_DIR = __dirname;
const QUEUE_FILE = path.join(SCRIPTS_DIR, '../../task-queue.json');

// ===== テストユーティリティ =====

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n   Expected: ${expected}\n   Actual: ${actual}`);
  }
}

function assertIncludes(str, substring, message = '') {
  if (!str.includes(substring)) {
    throw new Error(`${message}\n   String does not include: ${substring}`);
  }
}

function assertFileExists(filePath, message = '') {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${message}\n   File not found: ${filePath}`);
  }
}

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      timeout: 30000,
      ...options
    });
  } catch (error) {
    if (options.expectFail) {
      return error.stdout || error.stderr || '';
    }
    throw error;
  }
}

// ===== テストケース =====

console.log('\n🧪 自動開発システム統合テスト\n');
console.log('━'.repeat(60));

// Test 1: ファイル存在確認
test('task-queue.json が存在する', () => {
  assertFileExists(QUEUE_FILE);
});

test('queue-manager.cjs が存在する', () => {
  assertFileExists(path.join(SCRIPTS_DIR, 'queue-manager.cjs'));
});

test('claude-background-runner.md が存在する', () => {
  assertFileExists(path.join(SCRIPTS_DIR, 'claude-background-runner.md'));
});

test('sync-plane-to-queue.cjs が存在する', () => {
  assertFileExists(path.join(SCRIPTS_DIR, 'sync-plane-to-queue.cjs'));
});

test('auto-fix-notification.yml が存在する', () => {
  assertFileExists(path.join(SCRIPTS_DIR, '../../.github/workflows/auto-fix-notification.yml'));
});

// Test 2: queue-manager コマンドテスト
test('queue-manager help コマンドが動作する', () => {
  const output = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} help`);
  assertIncludes(output, 'タスクキュー管理スクリプト');
  assertIncludes(output, 'add <taskId>');
});

test('queue-manager list コマンドが動作する', () => {
  const output = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} list`);
  assertIncludes(output, 'タスクキュー状態');
});

test('queue-manager stats コマンドが動作する', () => {
  const output = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} stats`);
  assertIncludes(output, 'タスクキュー統計');
});

// Test 3: タスク追加・処理フロー
test('タスク追加（SSOT必須チェック）が動作する', () => {
  // SSOTなしで追加を試みる
  const output = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} add TEST-0001`, { expectFail: true });
  assertIncludes(output, 'SSOT パスが必須です');
});

test('タスク追加（存在しないSSoT）がエラーになる', () => {
  const output = runCommand(
    `node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} add TEST-0002 --ssot docs/03_ssot/nonexistent.md`,
    { expectFail: true }
  );
  assertIncludes(output, 'SSOT ファイルが見つかりません');
});

// Test 4: 実際のSSOTでタスク追加
test('タスク追加（有効なSSOT）が成功する', () => {
  // 既存のSSOTを使用
  const ssotPath = 'docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md';
  const fullPath = path.join(SCRIPTS_DIR, '../..', ssotPath);
  
  if (fs.existsSync(fullPath)) {
    const output = runCommand(
      `node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} add TEST-9999 --ssot ${ssotPath}`
    );
    assertIncludes(output, 'キューに追加しました');
    
    // リストで確認
    const listOutput = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} list`);
    assertIncludes(listOutput, 'TEST-9999');
  } else {
    throw new Error('テスト用SSOTファイルが見つかりません');
  }
});

test('タスク開始が成功する', () => {
  const output = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} start TEST-9999`);
  assertIncludes(output, '処理を開始しました');
  
  // リストで処理中を確認
  const listOutput = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} list`);
  assertIncludes(listOutput, '処理中');
  assertIncludes(listOutput, 'TEST-9999');
});

test('タスク完了が成功する', () => {
  const output = runCommand(
    `node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} complete TEST-9999 --prUrl https://github.com/test/pr/1`
  );
  assertIncludes(output, '完了しました');
  
  // リストで完了を確認
  const listOutput = runCommand(`node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} list`);
  assertIncludes(listOutput, 'TEST-9999');
});

// Test 5: クリーンアップ
test('キュークリア（クリーンアップ）が成功する', () => {
  const output = runCommand(
    `node ${path.join(SCRIPTS_DIR, 'queue-manager.cjs')} clear --force --all`
  );
  assertIncludes(output, 'クリアしました');
});

// Test 6: sync-plane-to-queue ヘルプ
test('sync-plane-to-queue help コマンドが動作する', () => {
  const output = runCommand(`node ${path.join(SCRIPTS_DIR, 'sync-plane-to-queue.cjs')} --help`);
  assertIncludes(output, 'Plane → task-queue.json 同期スクリプト');
});

// Test 7: claude-background-runner.md の内容確認
test('claude-background-runner.md に必須セクションが含まれる', () => {
  const content = fs.readFileSync(path.join(SCRIPTS_DIR, 'claude-background-runner.md'), 'utf8');
  assertIncludes(content, 'Step 1: タスクキューの確認');
  assertIncludes(content, 'Step 4: SSOTを読み込む');
  assertIncludes(content, '絶対禁止パターン');
  assertIncludes(content, 'hotel-saasでPrisma直接使用');
});

// Test 8: auto-fix-notification.yml の内容確認
test('auto-fix-notification.yml に必須設定が含まれる', () => {
  const content = fs.readFileSync(
    path.join(SCRIPTS_DIR, '../../.github/workflows/auto-fix-notification.yml'),
    'utf8'
  );
  assertIncludes(content, 'workflow_run');
  assertIncludes(content, 'CI - Quality Gate');
  assertIncludes(content, 'notify-failure');
  assertIncludes(content, 'needs-human-review');
});

// ===== 結果サマリー =====

console.log('\n' + '━'.repeat(60));
console.log('📊 テスト結果');
console.log('━'.repeat(60));
console.log(`✅ 成功: ${testsPassed}`);
console.log(`❌ 失敗: ${testsFailed}`);
console.log('━'.repeat(60));

if (testsFailed > 0) {
  console.log('\n⚠️ 一部のテストが失敗しました。上記のエラーを確認してください。\n');
  process.exit(1);
} else {
  console.log('\n🎉 全てのテストが成功しました！\n');
  process.exit(0);
}
