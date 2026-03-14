/**
 * Context Loader - Agents/Skills/Rules/Memory をロードするユーティリティ
 * 
 * hotel-kanriの.claude/ディレクトリから関連コンテキストを読み込み、
 * プロンプト生成に活用する
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = path.join(__dirname, '../../../.claude');

/**
 * ディレクトリ内の全.mdファイルを読み込む
 */
function loadDirectory(dirName) {
  const dirPath = path.join(CLAUDE_DIR, dirName);
  
  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️ ディレクトリが存在しません: ${dirPath}`);
    return [];
  }
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
  
  return files.map(file => {
    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = path.basename(file, '.md');
    
    // フロントマターをパース
    const frontMatter = parseFrontMatter(content);
    
    return {
      name,
      file,
      path: filePath,
      content,
      ...frontMatter
    };
  });
}

/**
 * Markdownのフロントマターをパース
 */
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const lines = match[1].split('\n');
  const result = {};
  
  lines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      result[key.trim()] = valueParts.join(':').trim();
    }
  });
  
  return result;
}

/**
 * 全Agentsをロード
 */
function loadAgents() {
  return loadDirectory('agents');
}

/**
 * 全Skillsをロード
 */
function loadSkills() {
  return loadDirectory('skills');
}

/**
 * 全Rulesをロード
 */
function loadRules() {
  return loadDirectory('rules');
}

/**
 * 全Memoryをロード
 */
function loadMemory() {
  return loadDirectory('memory');
}

/**
 * タスクタイプに応じた関連Agentを選択
 */
function selectRelevantAgents(taskType) {
  const agents = loadAgents();
  
  const relevanceMap = {
    'ssot': ['ssot-writer'],
    'api-only': ['planner', 'code-reviewer', 'security-reviewer'],
    'ui-only': ['planner', 'code-reviewer'],
    'fullstack': ['planner', 'code-reviewer', 'security-reviewer', 'tdd-guide'],
    'db-only': ['planner', 'security-reviewer'],
    'refactor': ['code-reviewer', 'security-reviewer'],
    'bugfix': ['tdd-guide', 'code-reviewer']
  };
  
  const relevantNames = relevanceMap[taskType] || ['planner', 'code-reviewer'];
  
  return agents.filter(a => relevantNames.includes(a.name));
}

/**
 * タスクタイプに応じた関連Skillを選択
 */
function selectRelevantSkills(taskType, targetSystem) {
  const skills = loadSkills();
  
  const systemSkillMap = {
    'hotel-saas': ['hotel-saas-patterns', 'multitenant-rules'],
    'hotel-common': ['hotel-common-patterns', 'multitenant-rules'],
    'hotel-saas-rebuild': ['hotel-saas-patterns', 'multitenant-rules'],
    'hotel-common-rebuild': ['hotel-common-patterns', 'multitenant-rules']
  };
  
  const taskSkillMap = {
    'ssot': ['ssot-workflow'],
    'api-only': ['hotel-common-patterns', 'multitenant-rules'],
    'ui-only': ['hotel-saas-patterns'],
    'fullstack': ['hotel-saas-patterns', 'hotel-common-patterns', 'multitenant-rules'],
    'db-only': ['multitenant-rules']
  };
  
  const systemSkills = systemSkillMap[targetSystem] || [];
  const taskSkills = taskSkillMap[taskType] || [];
  
  const relevantNames = [...new Set([...systemSkills, ...taskSkills])];
  
  return skills.filter(s => relevantNames.includes(s.name));
}

/**
 * 全Rulesを適用（常時適用）
 */
function getAllRules() {
  return loadRules();
}

/**
 * 関連するMemoryエントリを取得
 */
function getRelevantMemory(keywords = []) {
  const memory = loadMemory();
  
  if (keywords.length === 0) {
    return memory;
  }
  
  // キーワードに関連するメモリを検索
  return memory.map(m => {
    const lowerContent = m.content.toLowerCase();
    const relevance = keywords.filter(k => lowerContent.includes(k.toLowerCase())).length;
    return { ...m, relevance };
  }).filter(m => m.relevance > 0);
}

/**
 * プロンプトに挿入するコンテキストを生成
 */
function generateContextSection(taskType, targetSystem, keywords = []) {
  const agents = selectRelevantAgents(taskType);
  const skills = selectRelevantSkills(taskType, targetSystem);
  const rules = getAllRules();
  const memory = getRelevantMemory(keywords);
  
  let context = '';
  
  // Agents セクション
  if (agents.length > 0) {
    context += `\n## 🤖 参照エージェント\n\n`;
    context += `以下のエージェント役割を意識して実装してください：\n\n`;
    agents.forEach(a => {
      context += `### ${a.name}\n`;
      context += `${a.description || ''}\n`;
      // 内容から最初の段落を抽出
      const firstPara = a.content.replace(/^---[\s\S]*?---\n*/, '').split('\n\n')[0];
      context += `${firstPara}\n\n`;
    });
  }
  
  // Skills セクション
  if (skills.length > 0) {
    context += `\n## 📚 適用スキル\n\n`;
    context += `以下のパターン・知識を適用してください：\n\n`;
    skills.forEach(s => {
      context += `### ${s.name}\n`;
      // 内容から最初のセクションを抽出
      const sections = s.content.replace(/^---[\s\S]*?---\n*/, '').split('\n## ');
      const firstSection = sections[0].substring(0, 500);
      context += `${firstSection}...\n\n`;
    });
  }
  
  // Rules セクション（常時適用）
  if (rules.length > 0) {
    context += `\n## 🛡️ 必須ルール\n\n`;
    context += `以下のルールを必ず遵守してください：\n\n`;
    rules.forEach(r => {
      context += `### ${r.name}\n`;
      // 内容から箇条書きを抽出
      const bullets = r.content.match(/^\d+\.\s+.+$/gm) || [];
      bullets.slice(0, 5).forEach(b => {
        context += `${b}\n`;
      });
      context += `\n`;
    });
  }
  
  // Memory セクション（関連がある場合のみ）
  if (memory.length > 0 && memory.some(m => m.relevance > 0)) {
    context += `\n## 💡 過去の知見\n\n`;
    context += `以下の過去の経験を参考にしてください：\n\n`;
    memory.filter(m => m.relevance > 0).forEach(m => {
      context += `### ${m.name}\n`;
      // 記録例を抽出
      const examples = m.content.match(/###\s+[A-Z]+-\d+:.+[\s\S]*?(?=###|$)/g) || [];
      if (examples.length > 0) {
        context += `${examples[0].substring(0, 300)}...\n\n`;
      }
    });
  }
  
  return context;
}

/**
 * Hooksの設定を読み込む
 */
function loadHooks() {
  const hooksPath = path.join(CLAUDE_DIR, 'hooks', 'hooks.json');
  
  if (!fs.existsSync(hooksPath)) {
    return { hooks: [] };
  }
  
  return JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
}

/**
 * プロンプトに挿入するHooksチェックリストを生成
 */
function generateHooksChecklist() {
  const hooks = loadHooks();
  
  if (!hooks.hooks || hooks.hooks.length === 0) {
    return '';
  }
  
  let checklist = `\n## 🔍 自動チェック項目\n\n`;
  checklist += `実装完了後、以下の項目を確認してください：\n\n`;
  
  hooks.hooks.forEach((hook, i) => {
    // matcherからチェック対象を抽出
    const matcher = hook.matcher || '';
    const command = hook.hooks?.[0]?.command || '';
    
    // コマンドから説明を抽出
    const description = command.match(/echo '\[Hook\]([^']+)'/)?.[1] || `チェック${i + 1}`;
    
    checklist += `- [ ] ${description.trim()}\n`;
  });
  
  return checklist;
}

module.exports = {
  loadAgents,
  loadSkills,
  loadRules,
  loadMemory,
  loadHooks,
  selectRelevantAgents,
  selectRelevantSkills,
  getAllRules,
  getRelevantMemory,
  generateContextSection,
  generateHooksChecklist
};
