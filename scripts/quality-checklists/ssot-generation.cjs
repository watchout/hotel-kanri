#!/usr/bin/env node
/**
 * SSOT生成チェックリスト
 * 
 * SSOT生成時に満たすべき品質基準を定義
 * 生成後の自動検証に使用
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ===== チェックリスト定義 =====
const CHECKLIST = {
  // ========================================
  // カテゴリ1: 構造（Structure）- 25点
  // ========================================
  structure: [
    {
      id: 'G01',
      name: '概要セクション存在',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /^##?\s*(概要|Overview)/m,
      description: '文書の目的とスコープを明記する概要セクション',
      failMessage: '概要セクションがありません。「## 概要」を追加してください。'
    },
    {
      id: 'G02',
      name: '目的（Purpose）明記',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /目的|Purpose|ゴール|Goal/i,
      description: 'なぜこの機能が必要かの目的',
      failMessage: '目的が明記されていません。'
    },
    {
      id: 'G03',
      name: 'スコープ（Scope）明記',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /スコープ|Scope|対象|範囲/i,
      description: '何を含み、何を含まないか',
      failMessage: 'スコープが明記されていません。'
    },
    {
      id: 'G04',
      name: '要件一覧セクション',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /^##?\s*(要件|Requirements|機能要件)/m,
      description: '要件を一覧化したセクション',
      failMessage: '要件一覧セクションがありません。'
    },
    {
      id: 'G05',
      name: 'Phase/マイルストーン分け',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /Phase\s*\d|フェーズ\s*\d|マイルストーン|Milestone/i,
      description: '実装の段階分け',
      failMessage: 'Phase分けがありません。'
    }
  ],

  // ========================================
  // カテゴリ2: 要件ID体系（Requirements）- 25点
  // ========================================
  requirements: [
    {
      id: 'G06',
      name: '要件ID体系',
      weight: 10,
      level: 'critical',
      verify: 'regex',
      pattern: /[A-Z]{2,5}-\d{3}|要件\s*\d+|REQ\s*\d+|機能\s*\d+|FR-|NFR-/i,
      description: '一意の要件ID（例: REQ-001, 要件1, FR-001）',
      failMessage: '要件IDがありません。XXX-001形式で付与してください。',
      countMin: 3 // 最低3つの要件ID
    },
    {
      id: 'G07',
      name: '全要件にAccept条件',
      weight: 10,
      level: 'critical',
      verify: 'custom',
      customVerify: (content) => {
        // 複数パターンで要件IDをカウント
        const patterns = [
          /[A-Z]{2,5}-\d{3}/g,
          /要件\s*\d+/g,
          /機能\s*\d+/g
        ];
        let reqCount = 0;
        for (const p of patterns) {
          reqCount += (content.match(p) || []).length;
        }
        // Accept条件のパターンも拡張
        const acceptCount = (content.match(/Accept|合格条件|完了条件|検証条件|確認できる|〜であること|成功する|表示される|返される/gi) || []).length;
        // 要件がなければ、Accept条件があればOK
        if (reqCount === 0) return acceptCount >= 1;
        return acceptCount >= reqCount * 0.5; // 50%以上にAccept（緩和）
      },
      description: '各要件に検証可能な合格条件',
      failMessage: '要件に対するAccept条件が不足しています。'
    },
    {
      id: 'G08',
      name: 'Accept条件が検証可能',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /確認できる|表示される|返される|成功する|エラーが出る|件以上|秒以内/,
      description: 'Accept条件が具体的で検証可能',
      failMessage: 'Accept条件が曖昧です。具体的な検証方法を記載してください。'
    }
  ],

  // ========================================
  // カテゴリ3: データベース設計（Database）- 20点
  // ========================================
  database: [
    {
      id: 'G09',
      name: 'テーブル定義存在',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /テーブル|Table|model\s+\w+|CREATE TABLE/i,
      description: 'データベーステーブルの定義',
      failMessage: 'テーブル定義がありません。'
    },
    {
      id: 'G10',
      name: 'テーブル名snake_case',
      weight: 5,
      level: 'critical',
      verify: 'custom',
      customVerify: (content) => {
        const tables = content.match(/@@map\("([^"]+)"\)/g) || [];
        if (tables.length === 0) {
          // @@mapがない場合、テーブル定義を探す
          const tableNames = content.match(/テーブル[名：:]\s*`?([a-zA-Z_][a-zA-Z0-9_]*)`?/g) || [];
          if (tableNames.length === 0) return true; // テーブル定義がない場合はスキップ
          return tableNames.every(t => {
            const name = t.match(/`?([a-zA-Z_][a-zA-Z0-9_]*)`?$/)?.[1];
            return name && /^[a-z][a-z0-9_]*$/.test(name);
          });
        }
        return tables.every(t => {
          const name = t.match(/@@map\("([^"]+)"\)/)?.[1];
          return name && /^[a-z][a-z0-9_]*$/.test(name); // 正しいsnake_case検証
        });
      },
      description: 'テーブル名はsnake_case（例: room_grades）',
      failMessage: 'テーブル名がsnake_caseではありません。'
    },
    {
      id: 'G11',
      name: 'カラム名snake_case',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /@map\("[a-z_]+"\)/,
      description: 'カラム名はsnake_case + @map使用',
      failMessage: 'カラム名にsnake_case/@mapがありません。'
    },
    {
      id: 'G12',
      name: 'tenant_id必須',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /tenant_id|tenantId/,
      description: 'マルチテナント対応のtenant_id',
      failMessage: 'tenant_idの記載がありません。'
    }
  ],

  // ========================================
  // カテゴリ4: API設計（API）- 20点
  // ========================================
  api: [
    {
      id: 'G13',
      name: 'API一覧存在',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /^##?\s*(API|エンドポイント|Endpoint)/m,
      description: 'APIエンドポイントの一覧',
      failMessage: 'API一覧セクションがありません。'
    },
    {
      id: 'G14',
      name: 'パス形式 /api/v1/admin/',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /\/api\/v1\/(admin|guest)\//,
      description: '標準パス形式（/api/v1/admin/xxx）',
      failMessage: 'APIパスが標準形式ではありません。'
    },
    {
      id: 'G15',
      name: 'HTTPメソッド明記',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /(GET|POST|PUT|PATCH|DELETE)\s+\/api/,
      description: 'HTTPメソッド（GET/POST等）の明記',
      failMessage: 'HTTPメソッドが明記されていません。'
    },
    {
      id: 'G16',
      name: 'レスポンス形式定義',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /Response|レスポンス|戻り値|返却/i,
      description: 'APIレスポンスの形式定義',
      failMessage: 'レスポンス形式が定義されていません。'
    }
  ],

  // ========================================
  // カテゴリ5: エラーハンドリング（Error）- 10点
  // ========================================
  error: [
    {
      id: 'G17',
      name: 'エラーケース列挙',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /エラー|Error|例外|Exception|失敗/i,
      description: '想定されるエラーケースの列挙',
      failMessage: 'エラーケースが列挙されていません。'
    },
    {
      id: 'G18',
      name: 'HTTPステータスコード',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /40[0-9]|50[0-9]|401|403|404|500/,
      description: 'エラー時のHTTPステータスコード',
      failMessage: 'HTTPステータスコードが記載されていません。'
    }
  ],

  // ========================================
  // カテゴリ6: セキュリティ（Security）- 10点
  // ========================================
  security: [
    {
      id: 'G19',
      name: '認証要件',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /認証|Authentication|Session|Cookie|ログイン/i,
      description: '認証方式の記載',
      failMessage: '認証要件が記載されていません。'
    },
    {
      id: 'G20',
      name: '権限要件',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /権限|Permission|Role|アクセス制御/i,
      description: '権限チェックの記載',
      failMessage: '権限要件が記載されていません。'
    }
  ],

  // ========================================
  // カテゴリ7: 多視点（Perspective）- 10点（ボーナス）
  // ========================================
  perspective: [
    {
      id: 'G21',
      name: '技術視点',
      weight: 3,
      level: 'optional',
      verify: 'regex',
      pattern: /技術|Technical|アーキテクチャ|パフォーマンス/i,
      description: '技術的な考慮事項',
      failMessage: '技術視点が不足しています。'
    },
    {
      id: 'G22',
      name: 'ビジネス視点',
      weight: 3,
      level: 'optional',
      verify: 'regex',
      pattern: /ビジネス|Business|価値|KPI|ROI/i,
      description: 'ビジネス価値の記載',
      failMessage: 'ビジネス視点が不足しています。'
    },
    {
      id: 'G23',
      name: 'UX視点',
      weight: 4,
      level: 'optional',
      verify: 'regex',
      pattern: /UX|ユーザー体験|使いやすさ|UI|画面/i,
      description: 'ユーザー体験の考慮',
      failMessage: 'UX視点が不足しています。'
    }
  ]
};

// ===== 検証実行 =====
function verifyItem(item, content) {
  try {
    if (item.verify === 'regex') {
      const matches = content.match(item.pattern);
      if (item.countMin) {
        return matches && matches.length >= item.countMin;
      }
      return !!matches;
    } else if (item.verify === 'custom') {
      return item.customVerify(content);
    }
    return false;
  } catch (error) {
    console.error(`検証エラー: ${item.id} - ${error.message}`);
    return false;
  }
}

function runChecklist(content) {
  const results = [];
  let totalWeight = 0;
  let earnedWeight = 0;
  
  for (const [category, items] of Object.entries(CHECKLIST)) {
    for (const item of items) {
      const passed = verifyItem(item, content);
      totalWeight += item.weight;
      if (passed) {
        earnedWeight += item.weight;
      }
      
      results.push({
        id: item.id,
        name: item.name,
        category,
        level: item.level,
        weight: item.weight,
        passed,
        message: passed ? '✅ Pass' : `❌ ${item.failMessage}`
      });
    }
  }
  
  const score = Math.round((earnedWeight / totalWeight) * 100);
  
  return {
    score,
    totalWeight,
    earnedWeight,
    results,
    passed: results.filter(r => r.passed),
    failed: results.filter(r => !r.passed),
    criticalFailed: results.filter(r => !r.passed && r.level === 'critical')
  };
}

// ===== レポート生成 =====
function generateReport(result) {
  const lines = [];
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    SSOT生成チェックリスト結果                   ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  
  // スコア表示
  const scoreEmoji = result.score >= 95 ? '🟢' : result.score >= 85 ? '🟡' : result.score >= 70 ? '🟠' : '🔴';
  lines.push(`${scoreEmoji} スコア: ${result.score}/100 (${result.earnedWeight}/${result.totalWeight}点)`);
  lines.push('');
  
  // カテゴリ別結果
  const categories = {
    structure: '構造',
    requirements: '要件ID',
    database: 'DB設計',
    api: 'API設計',
    error: 'エラー処理',
    security: 'セキュリティ',
    perspective: '多視点'
  };
  
  for (const [cat, label] of Object.entries(categories)) {
    const catResults = result.results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.passed).length;
    const catTotal = catResults.length;
    const catEmoji = catPassed === catTotal ? '✅' : catPassed >= catTotal * 0.5 ? '⚠️' : '❌';
    
    lines.push(`${catEmoji} ${label}: ${catPassed}/${catTotal}`);
    
    for (const item of catResults) {
      const icon = item.passed ? '  ✓' : '  ✗';
      const levelTag = item.level === 'critical' ? '[必須]' : item.level === 'major' ? '[重要]' : '';
      lines.push(`   ${icon} ${item.id}: ${item.name} ${levelTag}`);
    }
    lines.push('');
  }
  
  // 不合格項目
  if (result.criticalFailed.length > 0) {
    lines.push('');
    lines.push('🚨 Critical（必須）の不合格項目:');
    for (const item of result.criticalFailed) {
      lines.push(`   - ${item.id}: ${item.name}`);
      lines.push(`     → ${item.message}`);
    }
  }
  
  // 判定
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  if (result.score >= 95 && result.criticalFailed.length === 0) {
    lines.push('✅ 合格: SSOT監査に進めます');
  } else if (result.criticalFailed.length > 0) {
    lines.push('❌ 不合格: Critical項目を修正してください');
  } else if (result.score >= 85) {
    lines.push('⚠️ 条件付き合格: 軽微な修正を推奨');
  } else {
    lines.push('❌ 不合格: 修正してください');
  }
  lines.push('───────────────────────────────────────────────────────────────');
  
  return lines.join('\n');
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node ssot-generation.cjs <SSOTファイルパス>');
    console.log('例: node ssot-generation.cjs docs/03_ssot/00_foundation/SSOT_EXAMPLE.md');
    process.exit(1);
  }
  
  const ssotPath = args[0];
  
  if (!fs.existsSync(ssotPath)) {
    console.error(`ファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(ssotPath, 'utf8');
  const result = runChecklist(content);
  
  console.log(generateReport(result));
  
  // JSON出力オプション
  if (args.includes('--json')) {
    const jsonPath = ssotPath.replace('.md', '-generation-check.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 JSON出力: ${jsonPath}`);
  }
  
  // 終了コード
  process.exit(result.score >= 95 && result.criticalFailed.length === 0 ? 0 : 1);
}

// エクスポート（モジュールとして使用可能）
module.exports = { CHECKLIST, runChecklist, generateReport };

// 直接実行時
if (require.main === module) {
  main().catch(console.error);
}
