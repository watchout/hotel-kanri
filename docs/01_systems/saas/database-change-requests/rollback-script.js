/**
 * hotel-common統合用データベース変更ロールバックスクリプト
 *
 * 実行方法:
 * 1. hotel-commonのディレクトリに移動
 * 2. node rollback-script.js を実行
 *
 * 注意: このスクリプトは緊急時のみ使用してください。
 * データ損失の可能性があります。
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * ロールバックを実行する
 */
async function runRollback() {
  try {
    console.log('ロールバック開始...');

    // トランザクション開始
    await prisma.$transaction(async (tx) => {
      // 1. PriceRuleからMenuItemへのデータ復元
      await rollbackPriceRuleToMenuItem(tx);

      // 2. ガチャメニュー関連のデータ削除
      await cleanupGachaMenuData(tx);

      // 3. プレミアム機能フラグのリセット
      await resetPremiumFeatureFlags(tx);

      console.log('トランザクション内のすべての操作が完了しました');
    }, {
      maxWait: 10000, // 最大待機時間: 10秒
      timeout: 60000, // タイムアウト: 60秒
    });

    console.log('ロールバックが正常に完了しました');
    console.log('注意: テーブル構造の変更は手動で行う必要があります');
  } catch (error) {
    console.error('ロールバック中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PriceRule から MenuItem へのデータ復元
 * 注意: MenuItem.price, MenuItem.taxRate, MenuItem.costPriceフィールドが
 * 存在することを前提としています。スキーマ変更が必要です。
 */
async function rollbackPriceRuleToMenuItem(tx) {
  console.log('PriceRule から MenuItem へのデータ復元を開始...');

  // デフォルト価格ルールを取得
  const defaultPriceRules = await tx.priceRule.findMany({
    where: { isDefault: true }
  });

  console.log(`${defaultPriceRules.length}件のデフォルト価格ルールを処理します`);

  // 各デフォルト価格ルールをMenuItemに反映
  let updatedCount = 0;
  for (const rule of defaultPriceRules) {
    try {
      await tx.menuItem.update({
        where: { id: rule.menuItemId },
        data: {
          price: rule.price,
          taxRate: rule.taxRate
          // costPriceは復元不可能なため省略
        }
      });
      updatedCount++;
    } catch (error) {
      console.error(`MenuItemID ${rule.menuItemId} の更新に失敗:`, error);
    }
  }

  console.log(`${updatedCount}件のMenuItemを更新しました`);
}

/**
 * ガチャメニュー関連のデータ削除
 */
async function cleanupGachaMenuData(tx) {
  console.log('ガチャメニュー関連のデータ削除を開始...');

  // OrderItemのガチャ関連フィールドをリセット
  const orderItemResult = await tx.orderItem.updateMany({
    where: {
      OR: [
        { isGachaResult: true },
        { gachaMenuId: { not: null } }
      ]
    },
    data: {
      isGachaResult: false,
      gachaMenuId: null,
      originalPrice: null
    }
  });

  console.log(`${orderItemResult.count}件のOrderItemをリセットしました`);

  // Orderのガチャ関連フィールドをリセット
  const orderResult = await tx.order.updateMany({
    where: { isGachaOrder: true },
    data: { isGachaOrder: false }
  });

  console.log(`${orderResult.count}件のOrderをリセットしました`);

  // GachaMenuItemの削除は、GachaMenuの削除時にカスケード削除される
  // GachaMenuの削除はスキーマ変更後に自動的に行われる
}

/**
 * プレミアム機能フラグのリセット
 */
async function resetPremiumFeatureFlags(tx) {
  console.log('プレミアム機能フラグのリセットを開始...');

  const result = await tx.tenantSubscription.updateMany({
    data: {
      enableSecretMenu: false,
      enableGachaMenu: false
    }
  });

  console.log(`${result.count}件のサブスクリプションをリセットしました`);
}

/**
 * スクリプト実行
 */
runRollback()
  .then(() => {
    console.log('スクリプトが正常に終了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプトの実行中にエラーが発生しました:', error);
    process.exit(1);
  });
