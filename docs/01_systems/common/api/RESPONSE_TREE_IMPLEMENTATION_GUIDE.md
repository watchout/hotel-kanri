# レスポンスツリーAPI実装ガイド

*作成日: 2025-08-05*
*バージョン: 1.0.0*

## 概要

このドキュメントは、AIコンシェルジュ機能のTV向け質問選択型インターフェース実装のためのAPI実装ガイドです。API仕様書に基づいて、hotel-common側でのAPI実装方法について説明します。

## 実装方針

### 1. コントローラー構成

レスポンスツリーAPIを以下のコントローラーに分けて実装することを推奨します：

1. **ResponseTreeController**: レスポンスツリー管理API
2. **ResponseNodeController**: レスポンスノード管理API
3. **ResponseSessionController**: セッション管理API
4. **ResponseMobileLinkController**: モバイル連携API
5. **AdminResponseTreeController**: 管理者向けAPI

### 2. ディレクトリ構造

```
src/
  ├── controllers/
  │   ├── response-tree/
  │   │   ├── response-tree.controller.ts
  │   │   ├── response-node.controller.ts
  │   │   ├── response-session.controller.ts
  │   │   ├── response-mobile-link.controller.ts
  │   │   └── admin-response-tree.controller.ts
  ├── services/
  │   ├── response-tree/
  │   │   ├── response-tree.service.ts
  │   │   ├── response-node.service.ts
  │   │   ├── response-session.service.ts
  │   │   └── response-mobile-link.service.ts
  ├── repositories/
  │   ├── response-tree/
  │   │   ├── response-tree.repository.ts
  │   │   ├── response-node.repository.ts
  │   │   ├── response-session.repository.ts
  │   │   └── response-mobile-link.repository.ts
  ├── dtos/
  │   ├── response-tree/
  │   │   ├── response-tree.dto.ts
  │   │   ├── response-node.dto.ts
  │   │   ├── response-session.dto.ts
  │   │   └── response-mobile-link.dto.ts
  └── middlewares/
      └── response-tree/
          └── session-auth.middleware.ts
```

### 3. 主要クラスの実装

#### 3.1 ResponseTreeController

```typescript
import { Request, Response } from 'express';
import { ResponseTreeService } from '../../services/response-tree/response-tree.service';

export class ResponseTreeController {
  private responseTreeService: ResponseTreeService;

  constructor() {
    this.responseTreeService = new ResponseTreeService();
  }

  /**
   * アクティブなレスポンスツリー一覧を取得
   */
  async getActiveTrees(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.query.tenantId as string || req.user.tenantId;
      const language = req.query.language as string || 'ja';
      
      const trees = await this.responseTreeService.getActiveTrees(tenantId, language);
      
      res.json({
        success: true,
        data: trees
      });
    } catch (error) {
      console.error('Error getting active trees:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get active trees'
        }
      });
    }
  }

  /**
   * レスポンスツリー詳細を取得
   */
  async getTreeById(req: Request, res: Response): Promise<void> {
    try {
      const treeId = req.params.treeId;
      const language = req.query.language as string || 'ja';
      const includeNodes = req.query.includeNodes === 'true';
      
      const tree = await this.responseTreeService.getTreeById(treeId, language, includeNodes);
      
      if (!tree) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TREE_NOT_FOUND',
            message: 'Response tree not found'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      console.error('Error getting tree by id:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get tree details'
        }
      });
    }
  }
}
```

#### 3.2 ResponseNodeController

```typescript
import { Request, Response } from 'express';
import { ResponseNodeService } from '../../services/response-tree/response-node.service';

export class ResponseNodeController {
  private responseNodeService: ResponseNodeService;

  constructor() {
    this.responseNodeService = new ResponseNodeService();
  }

  /**
   * ノード詳細を取得
   */
  async getNodeById(req: Request, res: Response): Promise<void> {
    try {
      const nodeId = req.params.nodeId;
      const language = req.query.language as string || 'ja';
      const includeChildren = req.query.includeChildren !== 'false';
      
      const node = await this.responseNodeService.getNodeById(nodeId, language, includeChildren);
      
      if (!node) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: 'Response node not found'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: node
      });
    } catch (error) {
      console.error('Error getting node by id:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get node details'
        }
      });
    }
  }

  /**
   * 子ノード一覧を取得
   */
  async getChildNodes(req: Request, res: Response): Promise<void> {
    try {
      const nodeId = req.params.nodeId;
      const language = req.query.language as string || 'ja';
      
      const children = await this.responseNodeService.getChildNodes(nodeId, language);
      
      res.json({
        success: true,
        data: children
      });
    } catch (error) {
      console.error('Error getting child nodes:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get child nodes'
        }
      });
    }
  }

  /**
   * ノード検索
   */
  async searchNodes(req: Request, res: Response): Promise<void> {
    try {
      const treeId = req.query.treeId as string;
      const query = req.query.query as string;
      const language = req.query.language as string || 'ja';
      const limit = parseInt(req.query.limit as string || '10', 10);
      
      if (!query) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameter is required'
          }
        });
        return;
      }
      
      const results = await this.responseNodeService.searchNodes(query, treeId, language, limit);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error searching nodes:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search nodes'
        }
      });
    }
  }
}
```

#### 3.3 ResponseSessionController

```typescript
import { Request, Response } from 'express';
import { ResponseSessionService } from '../../services/response-tree/response-session.service';

export class ResponseSessionController {
  private responseSessionService: ResponseSessionService;

  constructor() {
    this.responseSessionService = new ResponseSessionService();
  }

  /**
   * セッション開始
   */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, roomId, language, interfaceType } = req.body;
      
      if (!deviceId && !roomId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either deviceId or roomId is required'
          }
        });
        return;
      }
      
      const session = await this.responseSessionService.startSession({
        deviceId,
        roomId,
        language: language || 'ja',
        interfaceType: interfaceType || 'tv'
      });
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error starting session:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to start session'
        }
      });
    }
  }

  /**
   * セッション状態取得
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.sessionId;
      
      const session = await this.responseSessionService.getSession(sessionId);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get session'
        }
      });
    }
  }

  /**
   * セッション更新
   */
  async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.sessionId;
      const { currentNodeId, action } = req.body;
      
      if (!currentNodeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'currentNodeId is required'
          }
        });
        return;
      }
      
      const session = await this.responseSessionService.updateSession(sessionId, currentNodeId, action);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update session'
        }
      });
    }
  }

  /**
   * セッション終了
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.sessionId;
      
      const session = await this.responseSessionService.endSession(sessionId);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error ending session:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to end session'
        }
      });
    }
  }
}
```

### 4. サービス層の実装例

#### 4.1 ResponseTreeService

```typescript
import { PrismaClient } from '@prisma/client';
import { ResponseTreeRepository } from '../../repositories/response-tree/response-tree.repository';

export class ResponseTreeService {
  private responseTreeRepository: ResponseTreeRepository;
  
  constructor() {
    this.responseTreeRepository = new ResponseTreeRepository();
  }
  
  /**
   * アクティブなレスポンスツリー一覧を取得
   */
  async getActiveTrees(tenantId: string, language: string): Promise<any[]> {
    return this.responseTreeRepository.findActiveTrees(tenantId);
  }
  
  /**
   * レスポンスツリー詳細を取得
   */
  async getTreeById(treeId: string, language: string, includeNodes: boolean): Promise<any> {
    const tree = await this.responseTreeRepository.findTreeById(treeId);
    
    if (!tree) {
      return null;
    }
    
    if (includeNodes) {
      const rootNodes = await this.responseTreeRepository.findRootNodes(treeId, language);
      return { ...tree, rootNodes };
    }
    
    return tree;
  }
}
```

#### 4.2 ResponseNodeService

```typescript
import { PrismaClient } from '@prisma/client';
import { ResponseNodeRepository } from '../../repositories/response-tree/response-node.repository';

export class ResponseNodeService {
  private responseNodeRepository: ResponseNodeRepository;
  
  constructor() {
    this.responseNodeRepository = new ResponseNodeRepository();
  }
  
  /**
   * ノード詳細を取得
   */
  async getNodeById(nodeId: string, language: string, includeChildren: boolean): Promise<any> {
    const node = await this.responseNodeRepository.findNodeById(nodeId, language);
    
    if (!node) {
      return null;
    }
    
    if (includeChildren) {
      const children = await this.responseNodeRepository.findChildNodes(nodeId, language);
      return { ...node, children };
    }
    
    return node;
  }
  
  /**
   * 子ノード一覧を取得
   */
  async getChildNodes(nodeId: string, language: string): Promise<any[]> {
    return this.responseNodeRepository.findChildNodes(nodeId, language);
  }
  
  /**
   * ノード検索
   */
  async searchNodes(query: string, treeId: string | undefined, language: string, limit: number): Promise<any[]> {
    return this.responseNodeRepository.searchNodes(query, treeId, language, limit);
  }
}
```

### 5. リポジトリ層の実装例

#### 5.1 ResponseTreeRepository

```typescript
import { PrismaClient } from '@prisma/client';

export class ResponseTreeRepository {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  /**
   * アクティブなレスポンスツリー一覧を取得
   */
  async findActiveTrees(tenantId: string): Promise<any[]> {
    return this.prisma.responseTree.findMany({
      where: {
        tenantId,
        isActive: true,
        publishedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        publishedAt: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });
  }
  
  /**
   * レスポンスツリー詳細を取得
   */
  async findTreeById(treeId: string): Promise<any> {
    return this.prisma.responseTree.findUnique({
      where: { id: treeId },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        publishedAt: true
      }
    });
  }
  
  /**
   * ルートノードを取得
   */
  async findRootNodes(treeId: string, language: string): Promise<any[]> {
    const nodes = await this.prisma.responseNode.findMany({
      where: {
        treeId,
        isRoot: true
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        icon: true,
        order: true,
        isRoot: true,
        translations: {
          where: { language },
          select: {
            title: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // 翻訳がある場合はタイトルを置き換え
    return nodes.map(node => {
      if (node.translations.length > 0) {
        return {
          ...node,
          title: node.translations[0].title,
          translations: undefined
        };
      }
      return {
        ...node,
        translations: undefined
      };
    });
  }
}
```

### 6. ルーティング設定

```typescript
import express from 'express';
import { ResponseTreeController } from '../controllers/response-tree/response-tree.controller';
import { ResponseNodeController } from '../controllers/response-tree/response-node.controller';
import { ResponseSessionController } from '../controllers/response-tree/response-session.controller';
import { ResponseMobileLinkController } from '../controllers/response-tree/response-mobile-link.controller';
import { AdminResponseTreeController } from '../controllers/response-tree/admin-response-tree.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminAuthMiddleware } from '../middlewares/admin-auth.middleware';

const router = express.Router();
const responseTreeController = new ResponseTreeController();
const responseNodeController = new ResponseNodeController();
const responseSessionController = new ResponseSessionController();
const responseMobileLinkController = new ResponseMobileLinkController();
const adminResponseTreeController = new AdminResponseTreeController();

// レスポンスツリー管理API
router.get('/api/v1/ai/response-tree', authMiddleware, responseTreeController.getActiveTrees.bind(responseTreeController));
router.get('/api/v1/ai/response-tree/:treeId', authMiddleware, responseTreeController.getTreeById.bind(responseTreeController));

// レスポンスノード管理API
router.get('/api/v1/ai/response-tree/nodes/:nodeId', authMiddleware, responseNodeController.getNodeById.bind(responseNodeController));
router.get('/api/v1/ai/response-tree/nodes/:nodeId/children', authMiddleware, responseNodeController.getChildNodes.bind(responseNodeController));
router.get('/api/v1/ai/response-tree/search', authMiddleware, responseNodeController.searchNodes.bind(responseNodeController));

// セッション管理API
router.post('/api/v1/ai/response-tree/sessions', authMiddleware, responseSessionController.startSession.bind(responseSessionController));
router.get('/api/v1/ai/response-tree/sessions/:sessionId', authMiddleware, responseSessionController.getSession.bind(responseSessionController));
router.put('/api/v1/ai/response-tree/sessions/:sessionId', authMiddleware, responseSessionController.updateSession.bind(responseSessionController));
router.delete('/api/v1/ai/response-tree/sessions/:sessionId', authMiddleware, responseSessionController.endSession.bind(responseSessionController));

// モバイル連携API
router.post('/api/v1/ai/response-tree/mobile-link', authMiddleware, responseMobileLinkController.createMobileLink.bind(responseMobileLinkController));
router.get('/api/v1/ai/response-tree/mobile-link/:linkCode', authMiddleware, responseMobileLinkController.getMobileLink.bind(responseMobileLinkController));
router.post('/api/v1/ai/response-tree/mobile-link/:linkCode/connect', authMiddleware, responseMobileLinkController.connectMobileLink.bind(responseMobileLinkController));

// 管理者向けAPI
router.post('/api/v1/admin/response-tree', adminAuthMiddleware, adminResponseTreeController.createTree.bind(adminResponseTreeController));
router.put('/api/v1/admin/response-tree/:treeId', adminAuthMiddleware, adminResponseTreeController.updateTree.bind(adminResponseTreeController));
router.post('/api/v1/admin/response-tree/:treeId/publish', adminAuthMiddleware, adminResponseTreeController.publishTree.bind(adminResponseTreeController));
router.post('/api/v1/admin/response-tree/:treeId/nodes', adminAuthMiddleware, adminResponseTreeController.createNode.bind(adminResponseTreeController));

export default router;
```

## 実装上の注意点

### 1. パフォーマンス最適化

- **キャッシュ**: 頻繁にアクセスされるツリーやノードはRedisなどでキャッシュすることを検討してください。
- **N+1クエリ問題**: 子ノードの取得など、N+1クエリ問題が発生しやすい箇所に注意してください。
- **ページネーション**: 大量のノードを扱う場合は、適切なページネーションを実装してください。

```typescript
// キャッシュの例（Redis使用）
import { createClient } from 'redis';

const redisClient = createClient();

async function getCachedTree(treeId: string): Promise<any> {
  const cacheKey = `response_tree:${treeId}`;
  const cachedData = await redisClient.get(cacheKey);
  
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  const tree = await prisma.responseTree.findUnique({ where: { id: treeId } });
  
  if (tree) {
    await redisClient.set(cacheKey, JSON.stringify(tree), { EX: 3600 }); // 1時間キャッシュ
  }
  
  return tree;
}
```

### 2. エラーハンドリング

- **統一されたエラーレスポンス**: すべてのAPIで統一されたエラーレスポンス形式を使用してください。
- **詳細なエラーログ**: 本番環境では詳細なエラー情報をクライアントに返さないようにしつつ、ログには詳細を記録してください。
- **バリデーション**: リクエストデータのバリデーションを徹底してください。

```typescript
// エラーハンドリングミドルウェアの例
function errorHandlerMiddleware(err, req, res, next) {
  console.error('API Error:', err);
  
  // 既知のエラータイプの処理
  if (err.type === 'VALIDATION_ERROR') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message
      }
    });
  }
  
  // 不明なエラーの場合は詳細を隠す
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : err.message
    }
  });
}
```

### 3. セキュリティ

- **認証・認可**: すべてのAPIエンドポイントで適切な認証・認可チェックを行ってください。
- **テナント分離**: マルチテナント環境では、テナント間のデータ分離を徹底してください。
- **入力サニタイズ**: すべてのユーザー入力に対して適切なサニタイズを行ってください。

```typescript
// テナント分離のミドルウェア例
function tenantScopeMiddleware(req, res, next) {
  const tenantId = req.user.tenantId;
  
  // リクエストにテナントスコープを追加
  req.tenantScope = {
    tenantId
  };
  
  next();
}
```

### 4. テスト

- **単体テスト**: 各サービスメソッドの単体テストを実装してください。
- **統合テスト**: APIエンドポイントの統合テストを実装してください。
- **負荷テスト**: 本番環境に近い負荷でのパフォーマンステストを行ってください。

```typescript
// テストの例（Jest使用）
describe('ResponseTreeService', () => {
  let service: ResponseTreeService;
  let mockRepository: jest.Mocked<ResponseTreeRepository>;
  
  beforeEach(() => {
    mockRepository = {
      findActiveTrees: jest.fn(),
      findTreeById: jest.fn(),
      findRootNodes: jest.fn()
    } as any;
    
    service = new ResponseTreeService();
    (service as any).responseTreeRepository = mockRepository;
  });
  
  describe('getActiveTrees', () => {
    it('should return active trees from repository', async () => {
      const mockTrees = [{ id: '1', name: 'Test Tree' }];
      mockRepository.findActiveTrees.mockResolvedValue(mockTrees);
      
      const result = await service.getActiveTrees('tenant-1', 'ja');
      
      expect(result).toEqual(mockTrees);
      expect(mockRepository.findActiveTrees).toHaveBeenCalledWith('tenant-1');
    });
  });
});
```

## 実装スケジュール

1. **データベーススキーマ設計と実装**: 1-2日
2. **リポジトリ層の実装**: 2-3日
3. **サービス層の実装**: 2-3日
4. **コントローラー層の実装**: 2-3日
5. **テスト実装**: 2-3日
6. **ドキュメント作成**: 1-2日
7. **レビューと修正**: 2-3日

合計: 約2週間

## 結論

このガイドに従って実装することで、AIコンシェルジュ機能のTV向け質問選択型インターフェースを実現するためのAPIを効率的に実装できます。実装にあたっては、パフォーマンス、セキュリティ、テスト可能性を常に意識してください。

また、将来の拡張性を考慮して、モジュール化された設計を心がけることが重要です。特に、レスポンスツリーの構造や機能が将来的に変更される可能性を考慮し、柔軟な設計を目指してください。