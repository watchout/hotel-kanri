#!/usr/bin/env node

/**
 * SSOT準拠チェック（要件ID必須）
 * 
 * PRに以下が含まれているかチェック：
 * 1. SSOT参照（docs/03_ssot/へのパス）
 * 2. 要件ID（XXX-nnn形式）
 * 3. Out of scope の記載
 * 
 * 使い方:
 *   node scripts/check-ssot-citations.js
 * 
 * 環境変数:
 *   GITHUB_TOKEN: GitHub API トークン
 *   PR_NUMBER: PR番号
 *   GITHUB_PR_BODY: PR本文（直接指定）
 */

const fs = require('fs');
const { execSync } = require('child_process');

// GitHub PR本文を取得（環境変数 or gh CLI）
let prBody = '';

try {
  if (process.env.GITHUB_PR_BODY && process.env.GITHUB_PR_BODY.trim().length > 0) {
    // 環境変数から取得（優先）
    console.log('📥 環境変数からPR本文を取得中...');
    prBody = process.env.GITHUB_PR_BODY;
  } else if (process.env.GITHUB_TOKEN && process.env.PR_NUMBER) {
    // フォールバック: gh CLI
    console.log('📥 gh CLIからPR本文を取得中...');
    const cmd = `gh pr view ${process.env.PR_NUMBER} --json body -q .body`;
    prBody = execSync(cmd, { encoding: 'utf-8' });
  } else {
    console.warn('⚠️  PR本文を取得できません（ローカル実行時はスキップ）');
    console.log('✅ ローカル実行のため、チェックをスキップします');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ PR本文の取得に失敗しました:', error.message);
  process.exit(1);
}

// チェック1: SSOT参照があるか
const ssotPattern = /docs\/03_ssot\/[a-zA-Z0-9_/]+\.md/g;
const ssotMatches = prBody.match(ssotPattern);
const hasSSOT = ssotMatches && ssotMatches.length > 0;

// チェック2: 要件ID（XXX-nnn形式）があるか
const requirementIdPattern = /[A-Z]+-\d{3}/g;
const requirementIds = prBody.match(requirementIdPattern);
const hasIds = requirementIds && requirementIds.length > 0;

// チェック3: Out of scope の記載があるか
const hasOutOfScope = /Out of scope/i.test(prBody);

// 結果判定
const errors = [];
const warnings = [];

if (!hasSSOT) {
  errors.push('❌ SSOT参照が見つかりません。');
  errors.push('   → PRテンプレートの「読了したSSO」にSSOTファイルパスを記入してください。');
  errors.push('   例: docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md');
}

if (!hasIds) {
  errors.push('❌ 要件ID（XXX-nnn形式）が見つかりません。');
  errors.push('   → PRテンプレートの「対象要件ID」に要件IDを記入してください。');
  errors.push('   例: AUTH-001, AUTH-002');
}

if (!hasOutOfScope) {
  warnings.push('⚠️  Out of scope の記載がありません。');
  warnings.push('   → 対象外の機能を明記してください。該当なしの場合は「なし」と記入。');
}

// 警告を表示
if (warnings.length > 0) {
  console.warn('\n⚠️  警告\n');
  warnings.forEach(warn => console.warn(warn));
}

// エラーがあれば失敗
if (errors.length > 0) {
  console.error('\n🚨 SSOT準拠チェック失敗\n');
  errors.forEach(err => console.error(err));
  console.error('\n📖 詳細ドキュメント:');
  console.error('   /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md');
  console.error('\n💡 PRテンプレート:');
  console.error('   /Users/kaneko/hotel-kanri/.github/PULL_REQUEST_TEMPLATE.md\n');
  process.exit(1);
}

// 成功
console.log('\n✅ SSOT準拠チェック成功\n');
console.log(`   📄 SSOT参照: ${ssotMatches.length}件`);
ssotMatches.forEach(ssot => console.log(`      - ${ssot}`));
console.log(`   🎯 要件ID: ${requirementIds.length}件`);
console.log(`      ${requirementIds.join(', ')}`);
console.log(`   📋 Out of scope: 記載済み\n`);






