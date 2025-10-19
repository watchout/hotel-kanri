/**
 * Nuxt3用トレースログComposable
 * 
 * 目的: フロントエンド（hotel-saas）でトレースログを使用するためのComposable
 * 
 * 使用方法:
 * const { traceLog, traceApiRequest, ... } = useTraceLogger();
 * traceLog('hotel-saas', 'login.vue:50', 'ログインボタンクリック');
 * 
 * 作成日: 2025年10月2日
 */

export const useTraceLogger = () => {
  // トレース機能の有効化判定
  const isTraceEnabled = () => {
    if (process.server) {
      return process.env.NODE_ENV === 'development' && process.env.ENABLE_TRACE === 'true';
    } else {
      // クライアント側では window.ENABLE_TRACE を使用
      return typeof window !== 'undefined' && (window as any).ENABLE_TRACE === true;
    }
  };

  // トレース開始時刻（ミリ秒）
  let traceStartTime: number | null = null;

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
    if (!traceStartTime) return;
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
  const getElapsedTime = (): number => {
    if (!traceStartTime) return 0;
    return Date.now() - traceStartTime;
  };

  /**
   * トレースログを出力
   */
  const traceLog = (system: string, location: string, action: string, data: any = null) => {
    if (!isTraceEnabled()) return;

    const elapsed = getElapsedTime();
    const timestamp = `T+${elapsed}ms`;
    
    console.log(`[TRACE] [${timestamp}] [${system}] ${location}`);
    console.log(`[TRACE] [${timestamp}]   └─ ${action}`);
    
    if (data !== null && data !== undefined) {
      const sanitizedData = sanitizeData(data);
      console.log(`[TRACE] [${timestamp}]      データ:`, sanitizedData);
    }
  };

  /**
   * APIリクエストのトレースログ
   */
  const traceApiRequest = (system: string, method: string, url: string, options: any = {}) => {
    if (!isTraceEnabled()) return;

    const elapsed = getElapsedTime();
    const timestamp = `T+${elapsed}ms`;
    
    console.log(`[TRACE] [${timestamp}] [${system}] API リクエスト`);
    console.log(`[TRACE] [${timestamp}]   └─ ${method} ${url}`);
    
    if (options.headers) {
      console.log(`[TRACE] [${timestamp}]      Headers:`, sanitizeData(options.headers));
    }
    
    if (options.body) {
      console.log(`[TRACE] [${timestamp}]      Body:`, sanitizeData(options.body));
    }
    
    if (options.query) {
      console.log(`[TRACE] [${timestamp}]      Query:`, options.query);
    }
  };

  /**
   * APIレスポンスのトレースログ
   */
  const traceApiResponse = (system: string, status: number, data: any = null) => {
    if (!isTraceEnabled()) return;

    const elapsed = getElapsedTime();
    const timestamp = `T+${elapsed}ms`;
    
    console.log(`[TRACE] [${timestamp}] [${system}] API レスポンス`);
    console.log(`[TRACE] [${timestamp}]   └─ Status: ${status}`);
    
    if (data !== null) {
      console.log(`[TRACE] [${timestamp}]      データ:`, sanitizeData(data));
    }
  };

  /**
   * 変数変化のトレースログ
   */
  const traceVariableChange = (system: string, location: string, variableName: string, oldValue: any, newValue: any) => {
    if (!isTraceEnabled()) return;

    const elapsed = getElapsedTime();
    const timestamp = `T+${elapsed}ms`;
    
    console.log(`[TRACE] [${timestamp}] [${system}] ${location}`);
    console.log(`[TRACE] [${timestamp}]   └─ 変数変化: ${variableName}`);
    console.log(`[TRACE] [${timestamp}]      変更前:`, sanitizeData(oldValue));
    console.log(`[TRACE] [${timestamp}]      変更後:`, sanitizeData(newValue));
  };

  /**
   * Cookie変化のトレースログ
   */
  const traceCookie = (system: string, action: string, cookies: any) => {
    if (!isTraceEnabled()) return;

    const elapsed = getElapsedTime();
    const timestamp = `T+${elapsed}ms`;
    
    console.log(`[TRACE] [${timestamp}] [${system}] Cookie ${action}`);
    
    if (cookies) {
      const sanitizedCookies: any = {};
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
   */
  const traceNavigation = (from: string | null, to: string) => {
    if (!isTraceEnabled()) return;

    const elapsed = getElapsedTime();
    const timestamp = `T+${elapsed}ms`;
    
    console.log(`[TRACE] [${timestamp}] [browser] ページ遷移`);
    console.log(`[TRACE] [${timestamp}]   └─ ${from || '(初回)'} → ${to}`);
  };

  /**
   * 機密情報をマスクする
   */
  const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) return data;
    
    if (typeof data !== 'object') return data;
    
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item));
    }
    
    const sanitized: any = {};
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
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '****';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  };

  return {
    isTraceEnabled,
    startTrace,
    endTrace,
    traceLog,
    traceApiRequest,
    traceApiResponse,
    traceVariableChange,
    traceCookie,
    traceNavigation
  };
};

