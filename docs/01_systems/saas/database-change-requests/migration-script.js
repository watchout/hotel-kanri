/**
 * hotel-common統合用データベース変更マイグレーションスクリプト
 *
 * 実行方法:
 * 1. hotel-commonのディレクトリに移動
 * 2. node migration-script.js を実行
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * マイグレーションを実行する
 */
async function runMigration() {
  try {
    console.log('マイグレーション開始...');

    // トランザクション開始
    await prisma.$transaction(async (tx) => {
      // 1. 商品マスタと販売データの分離
      await migrateMenuItemToPriceRule(tx);

      // 2. ガチャメニュー機能の追加
      // 新規テーブル作成のみのため、スキーマ変更後に自動作成される

      // 3. プレミアム機能制限の実装
      await enablePremiumFeaturesForProfessionalPlans(tx);

      console.log('トランザクション内のすべての操作が完了しました');
    }, {
      maxWait: 10000, // 最大待機時間: 10秒
      timeout: 60000, // タイムアウト: 60秒
    });

    console.log('マイグレーションが正常に完了しました');
  } catch (error) {
    console.error('マイグレーション中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * MenuItem から PriceRule へのデータ移行
 */
async function migrateMenuItemToPriceRule(tx) {
  console.log('MenuItem から PriceRule へのデータ移行を開始...');

  // 全MenuItemを取得
  const menuItems = await tx.menuItem.findMany();
  console.log(`${menuItems.length}件のMenuItemを処理します`);

  // 各MenuItemに対してPriceRuleを作成
  let createdCount = 0;
  for (const item of menuItems) {
    // price, taxRateが存在する場合のみ処理
    if (item.price !== undefined && item.price !== null) {
      await tx.priceRule.create({
        data: {
          tenantId: item.tenantId,
          menuItemId: item.id,
          name: '通常価格',
          price: item.price,
          taxRate: item.taxRate || 10, // taxRateがない場合は10%をデフォルト値とする
          isDefault: true,
          priority: 0
        }
      });
      createdCount++;
    }
  }

  console.log(`${createdCount}件のPriceRuleを作成しました`);
}

/**
 * Professional以上のプランに対してプレミアム機能を有効化
 */
async function enablePremiumFeaturesForProfessionalPlans(tx) {
  console.log('プレミアム機能の有効化を開始...');

  // Professional以上のプランを検索
  const result = await tx.tenantSubscription.updateMany({
    where: {
      OR: [
        { planType: { contains: 'Professional' } },
        { planType: { contains: 'Enterprise' } },
        { planType: { contains: 'Ultimate' } }
      ]
    },
    data: {
      enableSecretMenu: true,
      enableGachaMenu: true
    }
  });

  console.log(`${result.count}件のサブスクリプションを更新しました`);
}

/**
 * スクリプト実行
 */
runMigration()
  .then(() => {
    console.log('スクリプトが正常に終了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプトの実行中にエラーが発生しました:', error);
    process.exit(1);
  });
