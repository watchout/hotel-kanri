// Prismaの初期化とエクスポート
import { PrismaClient } from '@prisma/client'
import path from 'path'

// 絶対パスでデータベースURLを構築
const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
console.log(`🔗 データベース接続パス: ${dbPath}`)

// Prismaクライアントのインスタンス
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
})

// findManyメソッドが実装されていない場合のエラーを解決するための拡張
if (!prisma.deviceRoom.findMany) {
  console.warn('デバイス一覧取得機能のモック実装を追加します')
  
  // モックデータ
  const mockDevices = [
    {
      id: 1,
      roomId: '101',
      ipAddress: '127.0.0.1',
      macAddress: '11:22:33:44:55:66',
      deviceName: 'Room 101 Tablet',
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deviceType: 'tablet'
    },
    {
      id: 2,
      roomId: '102',
      ipAddress: '192.168.1.2',
      macAddress: 'aa:bb:cc:dd:ee:ff',
      deviceName: 'Room 102 Tablet',
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deviceType: 'tablet'
    },
    {
      id: 3,
      roomId: '103',
      ipAddress: '192.168.1.3',
      macAddress: '50:a6:d8:e1:14:44',
      deviceName: 'Room 103 Tablet',
      isActive: false,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deviceType: 'tablet'
    }
  ]
  
  // Prismaのデバイス一覧機能を拡張
  Object.assign(prisma.deviceRoom, {
    findUnique: async (params: any) => {
      console.log('モックfindUnique呼び出し:', params)
      
      if (params?.where?.id) {
        const device = mockDevices.find(device => device.id === params.where.id)
        return device || null
      }
      
      if (params?.where?.macAddress) {
        const device = mockDevices.find(device => device.macAddress === params.where.macAddress)
        return device || null
      }
      
      return null
    },
    
    findFirst: async (params: any) => {
      console.log('モックfindFirst呼び出し:', params)
      
      let result = null
      
      // where条件のフィルタリング
      if (params?.where) {
        // アクティブステータスでフィルタリング
        let filtered = [...mockDevices]
        
        if (typeof params.where.isActive === 'boolean') {
          filtered = filtered.filter(device => device.isActive === params.where.isActive)
        }
        
        // OR条件でのフィルタリング
        if (params.where.OR) {
          result = filtered.find(device => {
            return params.where.OR.some((condition: any) => {
              if (condition.ipAddress && device.ipAddress === condition.ipAddress) {
                return true
              }
              if (condition.macAddress && device.macAddress === condition.macAddress) {
                return true
              }
              return false
            })
          }) || null
        }
      }
      
      return result
    },
    
    findMany: async (params: any) => {
      console.log('モックfindMany呼び出し:', params)
      
      let result = [...mockDevices]
      
      // where条件のフィルタリング
      if (params?.where) {
        // アクティブステータスでフィルタリング
        if (typeof params.where.isActive === 'boolean') {
          result = result.filter(device => device.isActive === params.where.isActive)
        }
        
        // OR条件でのフィルタリング
        if (params.where.OR) {
          result = result.filter(device => {
            return params.where.OR.some((condition: any) => {
              if (condition.deviceName?.contains) {
                return device.deviceName.includes(condition.deviceName.contains)
              }
              if (condition.roomId?.contains) {
                return device.roomId.includes(condition.roomId.contains)
              }
              return false
            })
          })
        }
      }
      
      // ソート
      if (params?.orderBy?.createdAt === 'desc') {
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }
      
      // ページネーション
      if (params?.skip) {
        result = result.slice(params.skip)
      }
      
      if (params?.take) {
        result = result.slice(0, params.take)
      }
      
      return result
    },
    
    count: async (params: any) => {
      console.log('モックcount呼び出し:', params)
      
      let count = mockDevices.length
      
      // where条件でのカウント
      if (params?.where) {
        let filtered = [...mockDevices]
        
        // アクティブステータスでフィルタリング
        if (typeof params.where.isActive === 'boolean') {
          filtered = filtered.filter(device => device.isActive === params.where.isActive)
        }
        
        // OR条件でのフィルタリング
        if (params.where.OR) {
          filtered = filtered.filter(device => {
            return params.where.OR.some((condition: any) => {
              if (condition.deviceName?.contains) {
                return device.deviceName.includes(condition.deviceName.contains)
              }
              if (condition.roomId?.contains) {
                return device.roomId.includes(condition.roomId.contains)
              }
              return false
            })
          })
        }
        
        count = filtered.length
      }
      
      return count
    },
    
    update: async (params: any) => {
      console.log('モックupdate呼び出し:', params)
      
      const { where, data } = params
      const deviceIndex = mockDevices.findIndex(d => d.id === where.id)
      
      if (deviceIndex === -1) return null
      
      // デバイス情報を更新
      const updatedDevice = { ...mockDevices[deviceIndex], ...data, updatedAt: new Date() }
      mockDevices[deviceIndex] = updatedDevice
      
      return updatedDevice
    }
  })
  
  // デバイスアクセスログのモック
  if (!prisma.deviceAccessLog.create) {
    Object.assign(prisma.deviceAccessLog, {
      create: async (params: any) => {
        console.log('モックアクセスログ作成:', params.data)
        return { 
          id: Math.floor(Math.random() * 1000), 
          accessTime: new Date(),
          ...params.data 
        }
      }
    })
  }
}

export { prisma }