#!/usr/bin/env node
/**
 * テスト実行チェックリスト
 * 
 * 実装後のテストを体系的に実行し、スコア化
 * ハッカソンノウハウ: デモ可能な状態を常に維持
 * 
 * @version 1.0.0
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ===== 設定（環境変数対応）=====
const CONFIG = {
  saasUrl: process.env.SAAS_URL || 'http://localhost:3101',
  commonUrl: process.env.COMMON_URL || 'http://localhost:3401',
  testEmail: process.env.TEST_EMAIL || 'owner@test.omotenasuai.com',
  testPassword: process.env.TEST_PASSWORD || 'owner123',
  testTenant: process.env.TEST_TENANT_ID || 'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  cookieFile: process.env.COOKIE_FILE || '/tmp/test_session.txt',
  timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
  // UI検証用の設定
  brandName: process.env.BRAND_NAME || 'OmotenasuAI'
};

// ===== チェックリスト定義 =====
const CHECKLIST = {
  // ========================================
  // カテゴリ1: 前提条件（Prerequisites）- 15点
  // ========================================
  prerequisites: [
    {
      id: 'E01',
      name: 'hotel-common起動確認',
      weight: 5,
      level: 'critical',
      verify: 'http',
      url: `${CONFIG.commonUrl}/health`,
      expectedStatus: 200,
      description: 'hotel-common-rebuildが起動しているか',
      failMessage: 'hotel-common-rebuildが起動していません。npm run devを実行してください。'
    },
    {
      id: 'E02',
      name: 'hotel-saas起動確認',
      weight: 5,
      level: 'critical',
      verify: 'http',
      url: `${CONFIG.saasUrl}/api/v1/health`,
      expectedStatus: 200,
      description: 'hotel-saas-rebuildが起動しているか',
      failMessage: 'hotel-saas-rebuildが起動していません。npm run devを実行してください。'
    },
    {
      id: 'E03',
      name: 'Cookie初期化',
      weight: 5,
      level: 'major',
      verify: 'custom',
      customVerify: async () => {
        try {
          if (fs.existsSync(CONFIG.cookieFile)) {
            fs.unlinkSync(CONFIG.cookieFile);
          }
          return true;
        } catch {
          return false;
        }
      },
      description: '古いCookieを削除',
      failMessage: 'Cookie初期化に失敗しました。'
    }
  ],

  // ========================================
  // カテゴリ2: 認証（Auth）- 20点
  // ========================================
  auth: [
    {
      id: 'E04',
      name: 'ログイン成功',
      weight: 10,
      level: 'critical',
      verify: 'api',
      method: 'POST',
      url: `${CONFIG.saasUrl}/api/v1/admin/auth/login`,
      body: { email: CONFIG.testEmail, password: CONFIG.testPassword },
      saveCookie: true,
      expectedBody: { success: true },
      description: 'テストユーザーでログイン',
      failMessage: 'ログインに失敗しました。テストユーザーの存在を確認してください。'
    },
    {
      id: 'E05',
      name: 'Cookie発行確認',
      weight: 5,
      level: 'critical',
      verify: 'custom',
      customVerify: async () => {
        return fs.existsSync(CONFIG.cookieFile) && 
               fs.statSync(CONFIG.cookieFile).size > 0;
      },
      description: 'SessionCookieが発行されたか',
      failMessage: 'Cookieが発行されませんでした。'
    },
    {
      id: 'E06',
      name: 'テナント切替成功',
      weight: 5,
      level: 'critical',
      verify: 'api',
      method: 'POST',
      url: `${CONFIG.saasUrl}/api/v1/admin/switch-tenant`,
      body: { tenantId: CONFIG.testTenant },
      useCookie: true,
      expectedBody: { success: true },
      description: 'テストテナントに切り替え',
      failMessage: 'テナント切替に失敗しました。'
    }
  ],

  // ========================================
  // カテゴリ3: API検証（API）- 35点
  // ========================================
  api: [
    {
      id: 'E07',
      name: 'GET API成功',
      weight: 10,
      level: 'critical',
      verify: 'api',
      method: 'GET',
      url: `${CONFIG.saasUrl}/api/v1/guest/categories`,
      useCookie: true,
      expectedBody: { success: true },
      description: 'カテゴリ一覧取得',
      failMessage: 'GET APIが失敗しました。',
      saveResponse: 'categories'
    },
    {
      id: 'E08',
      name: 'データ件数確認（1件以上）',
      weight: 5,
      level: 'major',
      verify: 'custom',
      customVerify: async (context) => {
        const categories = context.responses?.categories;
        if (!categories) return false;
        const count = categories.data?.categories?.length || 0;
        return count >= 1;
      },
      description: 'データが1件以上存在',
      failMessage: 'データが0件です。seedを実行してください。'
    },
    {
      id: 'E09',
      name: 'Menu API成功',
      weight: 10,
      level: 'critical',
      verify: 'api',
      method: 'GET',
      url: `${CONFIG.saasUrl}/api/v1/guest/menus`,
      useCookie: true,
      expectedBody: { success: true },
      description: 'メニュー一覧取得',
      failMessage: 'Menu APIが失敗しました。',
      saveResponse: 'menus'
    },
    {
      id: 'E10',
      name: 'レスポンス形式確認',
      weight: 5,
      level: 'major',
      verify: 'custom',
      customVerify: async (context) => {
        const menus = context.responses?.menus;
        if (!menus) return false;
        // 標準レスポンス形式 { success: true, data: {...} }
        return menus.success === true && typeof menus.data === 'object';
      },
      description: '標準レスポンス形式',
      failMessage: 'レスポンス形式が標準ではありません。'
    },
    {
      id: 'E11',
      name: '認証エラー確認（401）',
      weight: 5,
      level: 'major',
      verify: 'api',
      method: 'GET',
      url: `${CONFIG.saasUrl}/api/v1/admin/tenants`,
      useCookie: false, // Cookieなし
      expectedStatus: 401,
      description: '未認証時に401が返る',
      failMessage: '未認証時に401が返りません。'
    }
  ],

  // ========================================
  // カテゴリ4: UI検証（UI）- 20点
  // ========================================
  ui: [
    {
      id: 'E12',
      name: 'ページSSR成功',
      weight: 10,
      level: 'critical',
      verify: 'http',
      url: `${CONFIG.saasUrl}/menu`,
      expectedStatus: 200,
      useCookie: true,
      description: '/menuページが表示される',
      failMessage: '/menuページのSSRに失敗しました。'
    },
    {
      id: 'E13',
      name: 'エラー表示なし',
      weight: 5,
      level: 'major',
      verify: 'html',
      url: `${CONFIG.saasUrl}/menu`,
      useCookie: true,
      notContains: ['エラー', 'Error', 'データの取得に失敗'],
      description: 'エラーメッセージが表示されない',
      failMessage: 'ページにエラーメッセージが表示されています。'
    },
    {
      id: 'E14',
      name: 'データ表示確認',
      weight: 5,
      level: 'major',
      verify: 'html',
      url: `${CONFIG.saasUrl}/menu`,
      useCookie: true,
      contains: [CONFIG.brandName],
      description: 'データが表示されている',
      failMessage: 'ページにデータが表示されていません。'
    }
  ],

  // ========================================
  // カテゴリ5: クリーンアップ（Cleanup）- 10点
  // ========================================
  cleanup: [
    {
      id: 'E15',
      name: 'Cookie削除',
      weight: 5,
      level: 'minor',
      verify: 'custom',
      customVerify: async () => {
        try {
          if (fs.existsSync(CONFIG.cookieFile)) {
            fs.unlinkSync(CONFIG.cookieFile);
          }
          return true;
        } catch {
          return false;
        }
      },
      description: 'テスト用Cookieを削除',
      failMessage: 'Cookie削除に失敗しました。'
    },
    {
      id: 'E16',
      name: '一時ファイル削除',
      weight: 5,
      level: 'minor',
      verify: 'custom',
      customVerify: async () => {
        const tempFiles = ['/tmp/menu.html', '/tmp/category.html', '/tmp/item.html'];
        for (const f of tempFiles) {
          if (fs.existsSync(f)) {
            fs.unlinkSync(f);
          }
        }
        return true;
      },
      description: '一時ファイルを削除',
      failMessage: '一時ファイル削除に失敗しました。'
    }
  ]
};

// ===== HTTP/API呼び出し =====
async function callHttp(url, options = {}) {
  const curlArgs = ['-sS', '-o', '/dev/stdout', '-w', '\n%{http_code}'];
  
  if (options.method) {
    curlArgs.push('-X', options.method);
  }
  
  if (options.body) {
    curlArgs.push('-H', 'Content-Type: application/json');
    curlArgs.push('-d', JSON.stringify(options.body));
  }
  
  if (options.saveCookie) {
    curlArgs.push('-c', CONFIG.cookieFile);
  }
  
  if (options.useCookie && fs.existsSync(CONFIG.cookieFile)) {
    curlArgs.push('-b', CONFIG.cookieFile);
  }
  
  curlArgs.push(url);
  
  try {
    const result = execSync(`curl ${curlArgs.map(a => `"${a}"`).join(' ')}`, {
      encoding: 'utf8',
      timeout: CONFIG.timeout
    });
    
    const lines = result.trim().split('\n');
    const statusCode = parseInt(lines.pop());
    const body = lines.join('\n');
    
    let json = null;
    try {
      json = JSON.parse(body);
    } catch {}
    
    return { statusCode, body, json };
  } catch (error) {
    return { statusCode: 0, error: error.message };
  }
}

// ===== 検証実行 =====
async function verifyItem(item, context) {
  try {
    switch (item.verify) {
      case 'http': {
        const result = await callHttp(item.url, { useCookie: item.useCookie });
        return result.statusCode === item.expectedStatus;
      }
      
      case 'api': {
        const result = await callHttp(item.url, {
          method: item.method,
          body: item.body,
          saveCookie: item.saveCookie,
          useCookie: item.useCookie
        });
        
        if (item.saveResponse && result.json) {
          context.responses = context.responses || {};
          context.responses[item.saveResponse] = result.json;
        }
        
        if (item.expectedStatus) {
          return result.statusCode === item.expectedStatus;
        }
        
        if (item.expectedBody) {
          for (const [key, value] of Object.entries(item.expectedBody)) {
            if (result.json?.[key] !== value) return false;
          }
        }
        
        return result.statusCode >= 200 && result.statusCode < 300;
      }
      
      case 'html': {
        const result = await callHttp(item.url, { useCookie: item.useCookie });
        
        if (item.contains) {
          for (const text of item.contains) {
            if (!result.body.includes(text)) return false;
          }
        }
        
        if (item.notContains) {
          for (const text of item.notContains) {
            if (result.body.includes(text)) return false;
          }
        }
        
        return true;
      }
      
      case 'custom': {
        return await item.customVerify(context);
      }
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`検証エラー: ${item.id} - ${error.message}`);
    return false;
  }
}

async function runChecklist(testType = 'admin') {
  const results = [];
  let totalWeight = 0;
  let earnedWeight = 0;
  const context = { responses: {} };
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    テスト実行チェックリスト                     ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  for (const [category, items] of Object.entries(CHECKLIST)) {
    console.log(`📋 ${category.toUpperCase()}`);
    
    for (const item of items) {
      process.stdout.write(`   ${item.id}: ${item.name}... `);
      
      const passed = await verifyItem(item, context);
      totalWeight += item.weight;
      if (passed) {
        earnedWeight += item.weight;
        console.log('✅');
      } else {
        console.log('❌');
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
    console.log('');
  }
  
  const score = Math.round((earnedWeight / totalWeight) * 100);
  
  return {
    score,
    totalWeight,
    earnedWeight,
    results,
    passed: results.filter(r => r.passed),
    failed: results.filter(r => !r.passed),
    criticalFailed: results.filter(r => !r.passed && r.level === 'critical'),
    context
  };
}

// ===== レポート生成 =====
function generateReport(result) {
  const lines = [];
  
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  
  // スコア表示
  const scoreEmoji = result.score === 100 ? '🎉' : result.score >= 85 ? '🟢' : result.score >= 70 ? '🟡' : '🔴';
  lines.push(`${scoreEmoji} テストスコア: ${result.score}/100 (${result.earnedWeight}/${result.totalWeight}点)`);
  lines.push(`   Pass: ${result.passed.length}/${result.results.length}`);
  lines.push('');
  
  // 不合格項目
  if (result.failed.length > 0) {
    lines.push('❌ 失敗した項目:');
    for (const item of result.failed) {
      const levelTag = item.level === 'critical' ? ' [CRITICAL]' : '';
      lines.push(`   - ${item.id}: ${item.name}${levelTag}`);
      lines.push(`     → ${item.message}`);
    }
    lines.push('');
  }
  
  // 判定
  lines.push('───────────────────────────────────────────────────────────────');
  if (result.score === 100) {
    lines.push('🎉 ALL TESTS PASSED - commit/PR可能です');
  } else if (result.criticalFailed.length === 0 && result.score >= 85) {
    lines.push('⚠️ 軽微な問題あり - 確認後にcommit/PR可能');
  } else {
    lines.push('❌ テスト失敗 - 修正してください');
  }
  lines.push('───────────────────────────────────────────────────────────────');
  
  return lines.join('\n');
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'admin';
  
  const result = await runChecklist(testType);
  console.log(generateReport(result));
  
  // JSON出力オプション
  if (args.includes('--json')) {
    const jsonPath = path.join(__dirname, `test-result-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 JSON出力: ${jsonPath}`);
  }
  
  // 終了コード
  process.exit(result.score === 100 ? 0 : 1);
}

// エクスポート
module.exports = { CHECKLIST, runChecklist, generateReport, CONFIG };

// 直接実行時
if (require.main === module) {
  main().catch(console.error);
}
