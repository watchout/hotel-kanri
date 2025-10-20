#!/usr/bin/env node

/**
 * Linear依存関係設定スクリプト
 * 
 * 目的:
 * - SSOT_PROGRESS_MASTER.mdの依存関係をLinear Issueに反映
 * - 「Blocked by」関係を自動設定
 * - AIが次にやるべきタスクを明確にする
 * 
 * 使用:
 * LINEAR_API_KEY=xxx node scripts/linear/set-dependencies.js
 */

const { LinearClient } = require('@linear/sdk');
const fs = require('fs');

// ==========================================
// 設定
// ==========================================

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error('❌ エラー: LINEAR_API_KEY環境変数が設定されていません');
  process.exit(1);
}

const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// ==========================================
// 依存関係ルール定義
// ==========================================

const DEPENDENCY_RULES = [
  // Phase 1: SSOT作成
  {
    pattern: /SSOT作成: (.+)/,
    blockedBy: [],
    priority: 1,
  },
  
  // Phase 2: hotel-common実装
  {
    pattern: /hotel-common実装: (.+)/,
    blockedBy: (title) => {
      // 対応するSSOT作成タスクを検索
      const ssotName = title.replace('hotel-common実装: ', '');
      return [`SSOT作成: ${ssotName}`];
    },
    priority: 2,
  },
  
  // Phase 3: hotel-saas実装
  {
    pattern: /hotel-saas実装: (.+)/,
    blockedBy: (title) => {
      // 対応するhotel-common実装タスクを検索
      const ssotName = title.replace('hotel-saas実装: ', '');
      return [`hotel-common実装: ${ssotName}`];
    },
    priority: 3,
  },
];

// ==========================================
// 依存関係設定
// ==========================================

async function setDependencies() {
  console.log('📋 Linear依存関係設定を開始します...\n');
  
  // Step 1: 全Issueを取得
  console.log('Step 1: 全Issueを取得中...');
  const issues = await client.issues({
    filter: {
      team: { name: { eq: 'omotenasu-ai' } },
    },
  });
  
  const allIssues = [];
  for await (const issue of issues.nodes) {
    allIssues.push({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name || 'Unknown',
      priority: issue.priority,
    });
  }
  
  console.log(`✅ ${allIssues.length}件のIssueを取得しました\n`);
  
  // Step 2: 依存関係を設定
  console.log('Step 2: 依存関係を設定中...');
  
  let setCount = 0;
  let skipCount = 0;
  
  for (const issue of allIssues) {
    // 依存関係ルールに一致するか確認
    for (const rule of DEPENDENCY_RULES) {
      if (rule.pattern.test(issue.title)) {
        // ブロック元Issue を検索
        const blockedByTitles = typeof rule.blockedBy === 'function'
          ? rule.blockedBy(issue.title)
          : rule.blockedBy;
        
        if (blockedByTitles.length === 0) {
          skipCount++;
          continue;
        }
        
        for (const blockedByTitle of blockedByTitles) {
          const blockerIssue = allIssues.find(i => i.title === blockedByTitle);
          
          if (!blockerIssue) {
            console.log(`⚠️  ブロック元Issue が見つかりません: ${blockedByTitle}`);
            continue;
          }
          
          // 依存関係を作成
          try {
            await client.issueRelationCreate({
              issueId: issue.id,
              relatedIssueId: blockerIssue.id,
              type: 'blocks', // blockerIssue blocks issue
            });
            
            console.log(`✅ ${issue.identifier} ← blocked by ← ${blockerIssue.identifier}`);
            setCount++;
          } catch (error) {
            console.error(`❌ 依存関係設定エラー: ${error.message}`);
          }
        }
        
        // Priority設定
        if (issue.priority !== rule.priority) {
          try {
            await client.updateIssue(issue.id, {
              priority: rule.priority,
            });
            console.log(`✅ ${issue.identifier} の優先度を ${rule.priority} に設定`);
          } catch (error) {
            console.error(`❌ 優先度設定エラー: ${error.message}`);
          }
        }
        
        break;
      }
    }
  }
  
  console.log(`\n📊 依存関係設定完了:`);
  console.log(`   - 設定: ${setCount}件`);
  console.log(`   - スキップ: ${skipCount}件`);
}

// ==========================================
// メイン処理
// ==========================================

async function main() {
  try {
    await setDependencies();
    console.log('\n✅ Linear依存関係設定が完了しました！');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();

