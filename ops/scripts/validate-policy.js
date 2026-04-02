#!/usr/bin/env node

/**
 * validate-policy - OPS v1 ポリシー検証スクリプト
 * 
 * 目的:
 * - ops/policy.yml の設定に基づき矛盾を検出
 * - forbid_when_* ルールのチェック
 * - CIで自動実行
 * 
 * 使用:
 * npm run ops:lint
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===========================================
// 設定
// ===========================================

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const POLICY_FILE = path.join(PROJECT_ROOT, 'ops/policy.yml');

// ===========================================
// ポリシー読み込み
// ===========================================

function loadPolicy() {
  if (!fs.existsSync(POLICY_FILE)) {
    console.error('❌ エラー: ops/policy.yml が見つかりません');
    process.exit(1);
  }
  
  const content = fs.readFileSync(POLICY_FILE, 'utf8');
  return yaml.parse(content);
}

// ===========================================
// 矛盾検出
// ===========================================

async function validatePolicy(policy) {
  console.log('🔍 OPS Policy Lint - 矛盾検出中...\n');
  console.log(`進捗管理ツール: ${policy.progress.tool}\n`);
  
  const errors = [];
  const tool = policy.progress.tool;
  
  // ツール別の禁止パターンチェック
  const ruleset = policy.compliance[`forbid_when_${tool}`];
  
  if (!ruleset) {
    console.log(`ℹ️  ${tool} 用のコンプライアンスルールが見つかりません\n`);
    return errors;
  }
  
  console.log(`📋 ${ruleset.length}件のルールを確認中...\n`);
  
  for (const rule of ruleset) {
    const pattern = new RegExp(rule.pattern, 'i');
    const message = rule.message || `Forbidden pattern: ${rule.pattern}`;
    
    // ファイルのグロブ展開
    for (const globPattern of rule.files) {
      const files = await glob(globPattern, { 
        cwd: PROJECT_ROOT,
        ignore: ['node_modules/**', '**/node_modules/**']
      });
      
      for (const file of files) {
        const filePath = path.join(PROJECT_ROOT, file);
        
        if (!fs.existsSync(filePath)) continue;
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (pattern.test(content)) {
          errors.push({
            file,
            pattern: rule.pattern,
            message
          });
        }
      }
    }
  }
  
  return errors;
}

// ===========================================
// 結果表示
// ===========================================

function displayResults(errors) {
  if (errors.length === 0) {
    console.log('✅ OPS policy compliance ✅\n');
    console.log('矛盾は検出されませんでした。\n');
    return 0;
  }
  
  console.log(`❌ ${errors.length}件の矛盾が検出されました:\n`);
  
  for (const error of errors) {
    console.log(`📄 ${error.file}`);
    console.log(`   パターン: ${error.pattern}`);
    console.log(`   理由: ${error.message}\n`);
  }
  
  console.log('対処方法:');
  console.log('1. npm run ops:apply でテンプレートを再生成');
  console.log('2. 手動で該当箇所を修正\n');
  
  return 1;
}

// ===========================================
// メイン処理
// ===========================================

async function main() {
  console.log('🚀 OPS Policy Lint - 自動検証\n');
  console.log('=' .repeat(50) + '\n');
  
  try {
    const policy = loadPolicy();
    const errors = await validatePolicy(policy);
    const exitCode = displayResults(errors);
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:\n');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

