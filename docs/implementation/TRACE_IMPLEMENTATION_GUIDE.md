# 🎬 トレースログ実装ガイド

**作成日**: 2025年10月2日  
**対象**: hotel-saas + hotel-common  
**目的**: 実行トレース駆動型SSOT作成のためのログ実装

---

## 📋 概要

このガイドは、ログイン機能の完全なトレースを記録するために必要なログ実装を説明します。

### 実装の原則

1. **開発環境のみ**: `NODE_ENV=development` かつ `ENABLE_TRACE=true` の時のみ有効
2. **パフォーマンス影響なし**: 本番環境では完全に無効化
3. **機密情報保護**: パスワード等は自動的にマスク
4. **時系列記録**: `T+XXXms`形式で経過時間を記録

---

## 🔧 hotel-saas側の実装

### 1. 環境変数設定

`.env`ファイルに追加：

```bash
# トレース機能有効化
ENABLE_TRACE=true
```

### 2. ログインAPI（server/api/v1/auth/login.post.ts）

```typescript
import { useTraceLogger } from '~/composables/useTraceLogger';

export default defineEventHandler(async (event) => {
  const { traceLog, traceApiRequest, traceApiResponse, startTrace } = useTraceLogger();
  
  // トレース開始
  startTrace();
  
  const body = await readBody(event);
  
  traceLog('hotel-saas', 'login.post.ts:10', 'ログインAPI開始', { email: body.email });
  
  try {
    const baseUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400';
    
    // hotel-common呼び出し前
    traceApiRequest('hotel-saas', 'POST', `${baseUrl}/api/v1/auth/login`, {
      body: { email: body.email, password: '****', tenantId: 'default' }
    });
    
    const authResponse = await $fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      body: {
        email: body.email,
        password: body.password,
        tenantId: 'default'
      }
    });
    
    // hotel-commonレスポンス受信後
    traceApiResponse('hotel-saas', 200, authResponse);
    
    traceLog('hotel-saas', 'login.post.ts:35', 'hotel-saasセッション作成開始');
    
    // hotel-saas独自セッション作成
    const sessionId = crypto.randomUUID();
    
    traceLog('hotel-saas', 'login.post.ts:40', 'Redis SET実行', {
      key: `hotel:session:${sessionId}`,
      userId: authResponse.data.user.id
    });
    
    // Redis保存処理...
    
    traceLog('hotel-saas', 'login.post.ts:50', 'Cookie設定');
    
    // Cookie設定
    setCookie(event, 'hotel-session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 3600
    });
    
    traceLog('hotel-saas', 'login.post.ts:60', 'レスポンス送信', {
      success: true,
      userId: authResponse.data.user.id
    });
    
    return {
      success: true,
      data: {
        sessionId,
        user: authResponse.data.user
      }
    };
    
  } catch (error) {
    traceLog('hotel-saas', 'login.post.ts:ERROR', 'エラー発生', { error: error.message });
    throw error;
  }
});
```

### 3. Composable（composables/useSessionAuth.ts）

```typescript
import { useTraceLogger } from '~/composables/useTraceLogger';

export const useSessionAuth = () => {
  const { traceLog, traceVariableChange, traceNavigation } = useTraceLogger();
  
  const globalUser = ref<User | null>(null);
  
  const login = async (email: string, password: string) => {
    traceLog('browser', 'useSessionAuth.ts:login()', 'ログイン開始', { email });
    
    // 変数の初期状態を記録
    const oldUser = globalUser.value;
    traceVariableChange('browser', 'useSessionAuth.ts:login()', 'globalUser.value', oldUser, null);
    
    try {
      traceLog('browser', 'useSessionAuth.ts:login()', 'API呼び出し開始');
      
      const response = await $fetch('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      
      traceLog('browser', 'useSessionAuth.ts:login()', 'APIレスポンス受信', {
        success: response.success,
        userId: response.data.user.id
      });
      
      // globalUser設定前後を記録
      traceVariableChange('browser', 'useSessionAuth.ts:login()', 'globalUser.value', 
        globalUser.value, 
        response.data.user
      );
      
      globalUser.value = response.data.user;
      
      traceLog('browser', 'useSessionAuth.ts:login()', 'isAuthenticated.value更新', {
        value: isAuthenticated.value
      });
      
      traceNavigation(null, '/admin');
      
      await navigateTo('/admin');
      
    } catch (error) {
      traceLog('browser', 'useSessionAuth.ts:login()', 'ログインエラー', { error });
      throw error;
    }
  };
  
  const initialize = async () => {
    traceLog('browser', 'useSessionAuth.ts:initialize()', '初期化開始');
    
    try {
      const response = await $fetch('/api/v1/auth/me');
      
      traceVariableChange('browser', 'useSessionAuth.ts:initialize()', 'globalUser.value',
        globalUser.value,
        response.data.user
      );
      
      globalUser.value = response.data.user;
      
      traceLog('browser', 'useSessionAuth.ts:initialize()', '初期化完了');
      
    } catch (error) {
      traceLog('browser', 'useSessionAuth.ts:initialize()', '初期化エラー', { error });
      globalUser.value = null;
    }
  };
  
  const isAuthenticated = computed(() => !!globalUser.value);
  
  return {
    user: globalUser,
    isAuthenticated,
    login,
    initialize
  };
};
```

### 4. Middleware（middleware/admin-auth.ts）

```typescript
import { useTraceLogger } from '~/composables/useTraceLogger';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { traceLog, traceNavigation } = useTraceLogger();
  
  traceLog('browser', 'admin-auth.ts', 'ミドルウェア実行開始', {
    to: to.path,
    from: from?.path
  });
  
  const { user, isAuthenticated, initialize } = useSessionAuth();
  
  // ログインページは認証不要
  if (to.path === '/admin/login') {
    traceLog('browser', 'admin-auth.ts', 'ログインページ → スキップ');
    return;
  }
  
  traceLog('browser', 'admin-auth.ts', '認証状態チェック', {
    'user.value': user.value ? 'exists' : 'null',
    'isAuthenticated.value': isAuthenticated.value
  });
  
  // ログイン直後: user.valueが存在する場合はinitialize()をスキップ
  if (user.value) {
    traceLog('browser', 'admin-auth.ts', 'user.value存在 → initialize()スキップ（ログイン直後）');
    return;
  }
  
  // 初回アクセス: 認証されていない場合はinitialize()を実行
  if (!isAuthenticated.value) {
    traceLog('browser', 'admin-auth.ts', '未認証 → initialize()実行');
    
    await initialize();
    
    traceLog('browser', 'admin-auth.ts', 'initialize()完了後の状態', {
      'user.value': user.value ? 'exists' : 'null',
      'isAuthenticated.value': isAuthenticated.value
    });
    
    if (!isAuthenticated.value) {
      traceLog('browser', 'admin-auth.ts', '認証失敗 → ログインページへリダイレクト');
      traceNavigation(to.path, '/admin/login');
      return navigateTo('/admin/login');
    }
  }
  
  traceLog('browser', 'admin-auth.ts', 'ミドルウェア実行完了 → ページ表示');
});
```

---

## 🔧 hotel-common側の実装

### 1. 環境変数設定

`.env`ファイルに追加：

```bash
# トレース機能有効化
ENABLE_TRACE=true
```

### 2. トレースロガーのインポート

```typescript
// src/utils/traceLogger.ts として保存
const traceLogger = require('/Users/kaneko/hotel-kanri/scripts/monitoring/trace-logger.js');

module.exports = traceLogger;
```

### 3. 認証API（src/routes/systems/common/auth.routes.ts）

```typescript
import { traceLog, traceApiRequest, traceDbQuery, traceDbResult } from '../../utils/traceLogger';

router.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  traceLog('hotel-common', 'auth.routes.ts:377', 'ログインAPI受信', {
    email: req.body.email,
    tenantId: req.body.tenantId
  });
  
  try {
    const { email, password, tenantId } = req.body;
    
    traceLog('hotel-common', 'auth.routes.ts:385', 'SessionAuthService.authenticateUser()呼び出し');
    
    const user = await SessionAuthService.authenticateUser(email, password, tenantId);
    
    traceLog('hotel-common', 'auth.routes.ts:390', '認証成功', {
      userId: user.id,
      tenantId: user.tenant_id
    });
    
    traceLog('hotel-common', 'auth.routes.ts:395', 'SessionAuthService.createSession()呼び出し');
    
    const sessionId = await SessionAuthService.createSession(user);
    
    traceLog('hotel-common', 'auth.routes.ts:400', 'セッション作成完了', { sessionId });
    
    traceLog('hotel-common', 'auth.routes.ts:405', 'Cookie設定');
    
    res.cookie('hotel_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 3600000
    });
    
    traceLog('hotel-common', 'auth.routes.ts:415', 'レスポンス送信');
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          tenant_id: user.tenant_id,
          role: user.role
        }
      }
    });
    
  } catch (error) {
    traceLog('hotel-common', 'auth.routes.ts:ERROR', 'エラー発生', { error: error.message });
    res.status(401).json({
      success: false,
      error: { code: 'AUTHENTICATION_FAILED', message: error.message }
    });
  }
});
```

### 4. 認証サービス（src/auth/SessionAuthService.ts）

```typescript
import { traceLog, traceDbQuery, traceDbResult } from '../utils/traceLogger';

class SessionAuthService {
  async authenticateUser(email: string, password: string, tenantId: string) {
    traceLog('hotel-common', 'SessionAuthService.ts:authenticateUser()', '認証処理開始', {
      email,
      tenantId
    });
    
    // データベースクエリ
    traceDbQuery('postgresql', 'SELECT', 'Staff', {
      email,
      tenant_id: tenantId,
      is_deleted: false
    });
    
    const user = await this.db.staff.findFirst({
      where: {
        email,
        tenant_id: tenantId,
        is_deleted: false
      }
    });
    
    traceDbResult('postgresql', user);
    
    if (!user) {
      traceLog('hotel-common', 'SessionAuthService.ts:authenticateUser()', 'ユーザーが見つかりません');
      throw new Error('Invalid credentials');
    }
    
    traceLog('hotel-common', 'SessionAuthService.ts:authenticateUser()', 'パスワード検証開始');
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    traceLog('hotel-common', 'SessionAuthService.ts:authenticateUser()', 'パスワード検証結果', {
      isValid
    });
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    
    traceLog('hotel-common', 'SessionAuthService.ts:authenticateUser()', '認証成功');
    
    return user;
  }
  
  async createSession(user: any) {
    traceLog('hotel-common', 'SessionAuthService.ts:createSession()', 'セッション作成開始', {
      userId: user.id
    });
    
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    traceLog('hotel-common', 'SessionAuthService.ts:createSession()', 'セッションID生成', {
      sessionId
    });
    
    const sessionData = {
      userId: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      role: user.role,
      createdAt: Date.now()
    };
    
    traceDbQuery('redis', 'SET', `hotel:session:${sessionId}`, sessionData);
    
    await this.redis.set(
      `hotel:session:${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      3600
    );
    
    traceDbResult('redis', 'OK');
    
    traceLog('hotel-common', 'SessionAuthService.ts:createSession()', 'セッション作成完了', {
      sessionId
    });
    
    return sessionId;
  }
}
```

---

## 🚀 トレース実行手順

### 1. 準備

```bash
# hotel-kanriディレクトリで実行
cd /Users/kaneko/hotel-kanri

# トレース実行スクリプトを実行（手順が表示される）
./scripts/monitoring/run-trace.sh
```

### 2. ターミナル1: hotel-common起動

```bash
cd /Users/kaneko/hotel-common
export NODE_ENV=development
export ENABLE_TRACE=true
npm run dev 2>&1 | tee /Users/kaneko/hotel-kanri/logs/trace/$(date +%Y%m%d_%H%M%S)/hotel-common.log
```

### 3. ターミナル2: hotel-saas起動

```bash
cd /Users/kaneko/hotel-saas
export NODE_ENV=development
export ENABLE_TRACE=true
npm run dev 2>&1 | tee /Users/kaneko/hotel-kanri/logs/trace/$(date +%Y%m%d_%H%M%S)/hotel-saas.log
```

### 4. ターミナル3: Redis MONITOR

```bash
redis-cli MONITOR 2>&1 | tee /Users/kaneko/hotel-kanri/logs/trace/$(date +%Y%m%d_%H%M%S)/redis.log
```

### 5. ブラウザでトレース実行

1. ブラウザの開発者ツールを開く（F12）
2. コンソールタブを開く
3. 'Preserve log'（ログを保持）をONにする
4. http://localhost:3000/admin/login にアクセス
5. ログイン実行
6. コンソールログを全てコピーして `browser.log` に保存

### 6. ログ統合

```bash
cd /Users/kaneko/hotel-kanri
./scripts/monitoring/merge-trace-logs.sh ./logs/trace/<タイムスタンプ>
```

---

## 📊 トレース結果の確認

### 統合ログ

```bash
cat ./logs/trace/<タイムスタンプ>/merged.log
```

### 分析レポート

```bash
cat ./logs/trace/<タイムスタンプ>/analysis.md
```

---

## 🎯 次のステップ

1. ✅ トレースログ実装
2. ✅ トレース実行
3. ✅ ログ統合
4. ⏳ トレース結果をSSOTに反映
5. ⏳ 問題点・落とし穴の明確化

---

## 📚 参考ドキュメント

- [実行トレース駆動型SSOT作成手法](/Users/kaneko/hotel-kanri/docs/03_ssot/EXECUTION_TRACE_DRIVEN_SSOT.md)
- [SSOT作成ルール](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md)
- [SSOT深度分析](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_DEPTH_ANALYSIS.md)

---

**最終更新**: 2025年10月2日  
**作成者**: AI Assistant (Luna)  
**ステータス**: 実装準備完了

