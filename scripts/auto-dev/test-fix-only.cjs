#!/usr/bin/env node
/**
 * 修正ターンのみテスト
 */

const fs = require('fs');
const path = require('path');

// 環境変数読み込み
const envPath = path.join(__dirname, '../../.env.mcp');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const OpenAI = require('openai');
const openai = new OpenAI();

const ssotPath = '/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_DEV-0171.md';

async function main() {
  // 既存SSOTを読み込み
  const content = fs.readFileSync(ssotPath, 'utf8');
  console.log(`📄 SSOT読み込み: ${content.length}文字`);
  
  // 監査（GPT-4o + Gemini）
  console.log('\n🔍 マルチLLM監査中...');
  
  const auditPrompt = `SSOTを評価してください。

評価観点（各20点、合計100点）:
1. 構造の明確さ
2. 技術仕様の具体性
3. エラー処理の網羅性
4. テストケースの充実
5. Accept条件の明確さ

JSON形式で回答:
{
  "score": 85,
  "issues": ["問題1", "問題2"],
  "fixes": ["修正方法1", "修正方法2"]
}

SSOT内容（先頭8000文字）:
${content.substring(0, 8000)}`;

  // GPT-4o監査
  const gptResult = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: auditPrompt }],
    max_tokens: 2000,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  
  const audit = JSON.parse(gptResult.choices[0].message.content);
  console.log(`📊 GPT-4o監査結果: ${audit.score}点`);
  console.log(`   問題点: ${audit.issues.slice(0, 3).join(', ')}`);
  
  if (audit.score >= 95) {
    console.log('✅ 合格！');
    return;
  }
  
  // GPT-4oで修正
  console.log('\n🔧 GPT-4oで修正中...');
  
  const fixResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `以下の問題を修正してください。

## 問題点
${audit.issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

## 修正方法
${audit.fixes.map((f, idx) => `${idx + 1}. ${f}`).join('\n')}

## 現在のSSOT
${content}

【重要】修正後の完全なSSOT内容をMarkdown形式で出力してください。説明は不要です。`
    }],
    max_tokens: 16000,
    temperature: 0.2
  });
  
  const fixedContent = fixResponse.choices[0].message.content;
  console.log(`📝 修正完了: ${fixedContent.length}文字`);
  
  // 修正後のSSOTを保存
  const fixedPath = ssotPath.replace('.md', '_fixed.md');
  fs.writeFileSync(fixedPath, fixedContent);
  console.log(`💾 保存: ${fixedPath}`);
  
  // 再監査
  console.log('\n🔍 再監査中...');
  
  const reauditResult = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: auditPrompt.replace(content.substring(0, 8000), fixedContent.substring(0, 8000)) }],
    max_tokens: 2000,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  
  const reaudit = JSON.parse(reauditResult.choices[0].message.content);
  console.log(`📊 再監査結果: ${reaudit.score}点`);
  
  if (reaudit.score >= 95) {
    console.log('✅ 合格！');
  } else {
    console.log(`⚠️ 不合格 (${audit.score} → ${reaudit.score})`);
  }
}

main().catch(console.error);
