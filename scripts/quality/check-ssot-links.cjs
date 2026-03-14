#!/usr/bin/env node
/**
 * SSOT内のURL参照がPage Registryに存在するかチェック
 *
 * 使用方法:
 *   node scripts/quality/check-ssot-links.cjs
 *
 * DEV-0179: リンク整合性自動チェックスクリプト
 */

const fs = require('fs');
const path = require('path');

// パス設定
const HOTEL_KANRI = '/Users/kaneko/hotel-kanri';
const SSOT_DIR = path.join(HOTEL_KANRI, 'docs/03_ssot');
const PAGE_REGISTRY_PATH = path.join(SSOT_DIR, '00_foundation/SSOT_GUEST_PAGE_REGISTRY.md');

/**
 * Page Registryから有効なパス一覧を取得
 */
function getValidPaths() {
  const content = fs.readFileSync(PAGE_REGISTRY_PATH, 'utf-8');
  const paths = new Set();

  // テーブル行からパスを抽出（| `/path` | 形式）
  const tableRowRegex = /\|\s*`([^`]+)`\s*\|/g;
  let match;

  while ((match = tableRowRegex.exec(content)) !== null) {
    const extractedPath = match[1];
    // パスらしいものだけ追加（/で始まるもの）
    if (extractedPath.startsWith('/')) {
      // 動的パラメータを正規表現パターンに変換
      const pattern = extractedPath.replace(/\[([^\]]+)\]/g, '[^/]+');
      paths.add(pattern);
    }
  }

  return paths;
}

/**
 * SSOTファイルからURL参照を抽出
 */
function extractUrlReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const references = [];

  // JSON内のurl/urlフィールドを抽出
  // "url": "/info/wifi" や "url": "/menu" など
  const urlPatterns = [
    /"url"\s*:\s*"([^"]+)"/g,
    /"url"\s*:\s*'([^']+)'/g,
    /url:\s*"([^"]+)"/g,
    /url:\s*'([^']+)'/g,
  ];

  for (const pattern of urlPatterns) {
    let match;
    const regex = new RegExp(pattern.source, 'g');
    while ((match = regex.exec(content)) !== null) {
      const url = match[1];
      // 内部パスのみ（/で始まり、httpで始まらない）
      if (url.startsWith('/') && !url.startsWith('//')) {
        // クエリパラメータを除去
        const cleanUrl = url.split('?')[0];
        references.push({
          url: cleanUrl,
          originalUrl: url,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
  }

  return references;
}

/**
 * URLがPage Registryのパターンにマッチするか確認
 */
function isValidUrl(url, validPaths) {
  for (const pattern of validPaths) {
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * ディレクトリを再帰的に探索してSSOTファイルを取得
 */
function getSsotFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getSsotFiles(fullPath));
    } else if (entry.name.endsWith('.md') && entry.name.startsWith('SSOT_')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 SSOT リンク整合性チェック');
  console.log('='.repeat(50));

  // Page Registryの存在確認
  if (!fs.existsSync(PAGE_REGISTRY_PATH)) {
    console.error('❌ Page Registryが見つかりません:', PAGE_REGISTRY_PATH);
    process.exit(1);
  }

  // 有効なパス一覧を取得
  const validPaths = getValidPaths();
  console.log(`📋 Page Registry: ${validPaths.size} パスを検出`);
  console.log('   有効なパス:', Array.from(validPaths).join(', '));
  console.log('');

  // SSOTファイルを取得
  const ssotFiles = getSsotFiles(SSOT_DIR);
  console.log(`📁 SSOTファイル: ${ssotFiles.length} 件`);
  console.log('');

  // 各SSOTファイルをチェック
  const errors = [];
  let totalUrls = 0;

  for (const file of ssotFiles) {
    const references = extractUrlReferences(file);
    totalUrls += references.length;

    for (const ref of references) {
      if (!isValidUrl(ref.url, validPaths)) {
        errors.push({
          file: path.relative(HOTEL_KANRI, file),
          line: ref.line,
          url: ref.originalUrl,
          cleanUrl: ref.url
        });
      }
    }
  }

  // 結果表示
  console.log('📊 チェック結果');
  console.log('-'.repeat(50));
  console.log(`   検査したURL参照: ${totalUrls} 件`);
  console.log(`   エラー: ${errors.length} 件`);
  console.log('');

  if (errors.length > 0) {
    console.log('❌ 以下のURLがPage Registryに存在しません:');
    console.log('');

    for (const error of errors) {
      console.log(`   📄 ${error.file}:${error.line}`);
      console.log(`      URL: ${error.url}`);
      console.log('');
    }

    console.log('💡 対応方法:');
    console.log('   1. ページが実装済みの場合: Page Registryに追加してください');
    console.log('   2. ページが未実装の場合: handoffタイプに変更するか、Page Registryの計画中ページに追加してください');
    console.log('');
    console.log('   参照: docs/03_ssot/00_foundation/SSOT_GUEST_PAGE_REGISTRY.md');

    process.exit(1);
  } else {
    console.log('✅ すべてのURL参照が有効です');
    process.exit(0);
  }
}

// 実行
main();
