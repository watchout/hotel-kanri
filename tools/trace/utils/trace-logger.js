/**
 * 実行トレース駆動型SSOT作成用ログユーティリティ
 * 
 * 目的: プログラムの実行を完全にトレースし、SSOT作成の精度を向上させる
 * 
 * 使用方法:
 * 1. 開発環境でのみ有効化（NODE_ENV=development かつ ENABLE_TRACE=true）
 * 2. 各処理ポイントでtraceLog()を呼び出す
 * 3. ログは標準出力に[TRACE]プレフィックス付きで出力される
 * 
 * 作成日: 2025年10月2日
 */

// トレース機能の有効化判定
const isTraceEnabled = () => {
  return process.env.NODE_ENV === 'development' && process.env.ENABLE_TRACE === 'true';
};

// トレース開始時刻（ミリ秒）
let traceStartTime = null;

/**
 * トレース計測を開始
 */
const startTrace = () => {
  if (!isTraceEnabled()) return;
  traceStartTime = Date.now();
  console.log('='.repeat(80));
  console.log('[TRACE] 実行トレース開始');
  console.log('[TRACE] 開始時刻:', new Date().toISOString());
  console.log('='.repeat(80));
};

/**
 * トレース計測を終了
 */
const endTrace = () => {
  if (!isTraceEnabled()) return;
  const duration = Date.now() - traceStartTime;
  console.log('='.repeat(80));
  console.log(`[TRACE] 実行トレース終了 (所要時間: ${duration}ms)`);
  console.log('[TRACE] 終了時刻:', new Date().toISOString());
  console.log('='.repeat(80));
  traceStartTime = null;
};

/**
 * 経過時間を取得（ミリ秒）
 */
const getElapsedTime = () => {
  if (!traceStartTime) return 0;
  return Date.now() - traceStartTime;
};

/**
 * トレースログを出力
 * 
 * @param {string} system - システム名（例: 'browser', 'hotel-saas', 'hotel-common', 'redis', 'postgresql'）
 * @param {string} location - 処理場所（例: 'login.post.ts:10', 'useSessionAuth.ts:login()'）
 * @param {string} action - アクション内容（例: 'API呼び出し開始', 'globalUser.value設定'）
 * @param {object} data - 追加データ（オプション）
 */
const traceLog = (system, location, action, data = null) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  // 基本ログ出力
  console.log(`[TRACE] [${timestamp}] [${system}] ${location}`);
  console.log(`[TRACE] [${timestamp}]   └─ ${action}`);
  
  // データがある場合は整形して出力
  if (data !== null && data !== undefined) {
    // パスワードなどの機密情報をマスク
    const sanitizedData = sanitizeData(data);
    console.log(`[TRACE] [${timestamp}]      データ:`, JSON.stringify(sanitizedData, null, 2));
  }
};

/**
 * APIリクエストのトレースログ
 * 
 * @param {string} system - システム名
 * @param {string} method - HTTPメソッド
 * @param {string} url - URL
 * @param {object} options - リクエストオプション（headers, body等）
 */
const traceApiRequest = (system, method, url, options = {}) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  console.log(`[TRACE] [${timestamp}] [${system}] API リクエスト`);
  console.log(`[TRACE] [${timestamp}]   └─ ${method} ${url}`);
  
  if (options.headers) {
    const sanitizedHeaders = sanitizeData(options.headers);
    console.log(`[TRACE] [${timestamp}]      Headers:`, sanitizedHeaders);
  }
  
  if (options.body) {
    const sanitizedBody = sanitizeData(options.body);
    console.log(`[TRACE] [${timestamp}]      Body:`, JSON.stringify(sanitizedBody, null, 2));
  }
  
  if (options.query) {
    console.log(`[TRACE] [${timestamp}]      Query:`, options.query);
  }
};

/**
 * APIレスポンスのトレースログ
 * 
 * @param {string} system - システム名
 * @param {number} status - HTTPステータスコード
 * @param {object} data - レスポンスデータ
 */
const traceApiResponse = (system, status, data = null) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  console.log(`[TRACE] [${timestamp}] [${system}] API レスポンス`);
  console.log(`[TRACE] [${timestamp}]   └─ Status: ${status}`);
  
  if (data !== null) {
    const sanitizedData = sanitizeData(data);
    console.log(`[TRACE] [${timestamp}]      データ:`, JSON.stringify(sanitizedData, null, 2));
  }
};

/**
 * 変数変化のトレースログ
 * 
 * @param {string} system - システム名
 * @param {string} location - 処理場所
 * @param {string} variableName - 変数名
 * @param {any} oldValue - 変更前の値
 * @param {any} newValue - 変更後の値
 */
const traceVariableChange = (system, location, variableName, oldValue, newValue) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  console.log(`[TRACE] [${timestamp}] [${system}] ${location}`);
  console.log(`[TRACE] [${timestamp}]   └─ 変数変化: ${variableName}`);
  console.log(`[TRACE] [${timestamp}]      変更前:`, sanitizeData(oldValue));
  console.log(`[TRACE] [${timestamp}]      変更後:`, sanitizeData(newValue));
};

/**
 * データベースクエリのトレースログ
 * 
 * @param {string} database - データベース名（'postgresql', 'redis'）
 * @param {string} operation - 操作（'SELECT', 'INSERT', 'SET', 'GET'等）
 * @param {string} target - 対象（テーブル名、キー等）
 * @param {object} params - パラメータ（オプション）
 */
const traceDbQuery = (database, operation, target, params = null) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  console.log(`[TRACE] [${timestamp}] [${database.toUpperCase()}] クエリ実行`);
  console.log(`[TRACE] [${timestamp}]   └─ ${operation} ${target}`);
  
  if (params !== null) {
    const sanitizedParams = sanitizeData(params);
    console.log(`[TRACE] [${timestamp}]      パラメータ:`, sanitizedParams);
  }
};

/**
 * データベースクエリ結果のトレースログ
 * 
 * @param {string} database - データベース名
 * @param {any} result - クエリ結果
 */
const traceDbResult = (database, result) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  console.log(`[TRACE] [${timestamp}] [${database.toUpperCase()}] クエリ結果`);
  
  if (Array.isArray(result)) {
    console.log(`[TRACE] [${timestamp}]   └─ 件数: ${result.length}`);
    if (result.length > 0) {
      const sanitizedResult = sanitizeData(result[0]);
      console.log(`[TRACE] [${timestamp}]      サンプル:`, sanitizedResult);
    }
  } else {
    const sanitizedResult = sanitizeData(result);
    console.log(`[TRACE] [${timestamp}]   └─ 結果:`, sanitizedResult);
  }
};

/**
 * 機密情報をマスクする
 * 
 * @param {any} data - データ
 * @returns {any} マスク済みデータ
 */
const sanitizeData = (data) => {
  if (data === null || data === undefined) return data;
  
  // プリミティブ型はそのまま返す
  if (typeof data !== 'object') return data;
  
  // 配列の場合
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  // オブジェクトの場合
  const sanitized = {};
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'api_key'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // 機密情報はマスク
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '****';
    } else if (typeof value === 'object' && value !== null) {
      // ネストされたオブジェクトも再帰的にマスク
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Cookie変化のトレースログ
 * 
 * @param {string} system - システム名
 * @param {string} action - アクション（'設定', '削除', '送信'）
 * @param {object} cookies - Cookie情報
 */
const traceCookie = (system, action, cookies) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  console.log(`[TRACE] [${timestamp}] [${system}] Cookie ${action}`);
  
  if (cookies) {
    // Cookieの値は一部のみ表示（長すぎるため）
    const sanitizedCookies = {};
    for (const [key, value] of Object.entries(cookies)) {
      if (typeof value === 'string' && value.length > 20) {
        sanitizedCookies[key] = value.substring(0, 20) + '...';
      } else {
        sanitizedCookies[key] = value;
      }
    }
    console.log(`[TRACE] [${timestamp}]   └─ Cookies:`, sanitizedCookies);
  }
};

/**
 * ページ遷移のトレースログ
 * 
 * @param {string} from - 遷移元パス
 * @param {string} to - 遷移先パス
 */
const traceNavigation = (from, to) => {
  if (!isTraceEnabled()) return;

  const elapsed = getElapsedTime();
  const timestamp = `T+${elapsed}ms`;
  
  console.log(`[TRACE] [${timestamp}] [browser] ページ遷移`);
  console.log(`[TRACE] [${timestamp}]   └─ ${from || '(初回)'} → ${to}`);
};

// Node.js環境用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isTraceEnabled,
    startTrace,
    endTrace,
    traceLog,
    traceApiRequest,
    traceApiResponse,
    traceVariableChange,
    traceDbQuery,
    traceDbResult,
    traceCookie,
    traceNavigation,
    sanitizeData
  };
}

// ブラウザ環境用のグローバル公開
if (typeof window !== 'undefined') {
  window.TraceLogger = {
    isTraceEnabled,
    startTrace,
    endTrace,
    traceLog,
    traceApiRequest,
    traceApiResponse,
    traceVariableChange,
    traceDbQuery,
    traceDbResult,
    traceCookie,
    traceNavigation
  };
}

