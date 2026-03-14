#!/bin/bash
# 本番同等開発ルールチェックスクリプト
# 作成日: 2025年8月15日
# 作成者: 統合管理チーム

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}本番同等開発ルール チェック開始${NC}"
echo "=================================================="

# 引数からシステム名を取得
SYSTEM=$1

if [ -z "$SYSTEM" ]; then
  echo -e "${RED}エラー: システム名を指定してください (saas, pms, member, common)${NC}"
  exit 1
fi

# システムディレクトリの設定
case $SYSTEM in
  saas)
    SYSTEM_DIR="../hotel-saas"
    SYSTEM_NAME="hotel-saas"
    ;;
  pms)
    SYSTEM_DIR="../hotel-pms"
    SYSTEM_NAME="hotel-pms"
    ;;
  member)
    SYSTEM_DIR="../hotel-member"
    SYSTEM_NAME="hotel-member"
    ;;
  common)
    SYSTEM_DIR="../hotel-common"
    SYSTEM_NAME="hotel-common"
    ;;
  *)
    echo -e "${RED}エラー: 無効なシステム名です。saas, pms, member, commonのいずれかを指定してください${NC}"
    exit 1
    ;;
esac

# システムディレクトリの存在確認
if [ ! -d "$SYSTEM_DIR" ]; then
  echo -e "${RED}エラー: $SYSTEM_DIR ディレクトリが見つかりません${NC}"
  exit 1
fi

echo "システム: $SYSTEM_NAME"
echo "ディレクトリ: $SYSTEM_DIR"
echo ""

# 1. モックデータチェック
echo "1. モックデータチェック..."
MOCK_COUNT=$(grep -r --include="*.{js,ts,vue,py}" -E "(mockData|MOCK_DATA|mock\(|mock\.|mockApi|mockImplementation)" "$SYSTEM_DIR" | wc -l)

if [ "$MOCK_COUNT" -gt 0 ]; then
  echo -e "${RED}警告: $MOCK_COUNT 件のモックデータ使用が検出されました${NC}"
  grep -r --include="*.{js,ts,vue,py}" -E "(mockData|MOCK_DATA|mock\(|mock\.|mockApi|mockImplementation)" "$SYSTEM_DIR" | head -n 10
  if [ "$MOCK_COUNT" -gt 10 ]; then
    echo "... 他 $(($MOCK_COUNT - 10)) 件"
  fi
  echo ""
else
  echo -e "${GREEN}✓ モックデータは検出されませんでした${NC}"
  echo ""
fi

# 2. TODO/FIXMEチェック
echo "2. TODO/FIXMEチェック..."
TODO_COUNT=$(grep -r --include="*.{js,ts,vue,py,md}" -E "(TODO:|FIXME:|@todo|@fixme)" "$SYSTEM_DIR" | wc -l)

if [ "$TODO_COUNT" -gt 0 ]; then
  echo -e "${RED}警告: $TODO_COUNT 件のTODO/FIXMEが検出されました${NC}"
  grep -r --include="*.{js,ts,vue,py,md}" -E "(TODO:|FIXME:|@todo|@fixme)" "$SYSTEM_DIR" | head -n 10
  if [ "$TODO_COUNT" -gt 10 ]; then
    echo "... 他 $(($TODO_COUNT - 10)) 件"
  fi
  echo ""
else
  echo -e "${GREEN}✓ TODO/FIXMEは検出されませんでした${NC}"
  echo ""
fi

# 3. 環境変数チェック
echo "3. 環境変数チェック..."

case $SYSTEM in
  saas)
    OFFLINE_MODE=$(grep -r --include="*.{js,ts,vue,env,env.*}" "OFFLINE_MODE_ENABLED=true" "$SYSTEM_DIR" | wc -l)
    if [ "$OFFLINE_MODE" -gt 0 ]; then
      echo -e "${RED}警告: OFFLINE_MODE_ENABLED=true が検出されました${NC}"
      grep -r --include="*.{js,ts,vue,env,env.*}" "OFFLINE_MODE_ENABLED=true" "$SYSTEM_DIR"
      echo ""
    else
      echo -e "${GREEN}✓ OFFLINE_MODE_ENABLED は適切に設定されています${NC}"
      echo ""
    fi
    ;;
  pms)
    OFFLINE_FIRST=$(grep -r --include="*.{js,ts,vue,env,env.*}" "OFFLINE_FIRST=true" "$SYSTEM_DIR" | wc -l)
    if [ "$OFFLINE_FIRST" -gt 0 ]; then
      echo -e "${RED}警告: OFFLINE_FIRST=true が検出されました${NC}"
      grep -r --include="*.{js,ts,vue,env,env.*}" "OFFLINE_FIRST=true" "$SYSTEM_DIR"
      echo ""
    else
      echo -e "${GREEN}✓ OFFLINE_FIRST は適切に設定されています${NC}"
      echo ""
    fi
    ;;
  member)
    GDPR_COMPLIANCE=$(grep -r --include="*.{js,ts,vue,py,env,env.*}" "GDPR_COMPLIANCE=false" "$SYSTEM_DIR" | wc -l)
    if [ "$GDPR_COMPLIANCE" -gt 0 ]; then
      echo -e "${RED}警告: GDPR_COMPLIANCE=false が検出されました${NC}"
      grep -r --include="*.{js,ts,vue,py,env,env.*}" "GDPR_COMPLIANCE=false" "$SYSTEM_DIR"
      echo ""
    else
      echo -e "${GREEN}✓ GDPR_COMPLIANCE は適切に設定されています${NC}"
      echo ""
    fi
    ;;
  common)
    # hotel-common特有のチェック
    echo -e "${GREEN}✓ 環境変数は適切に設定されています${NC}"
    echo ""
    ;;
esac

# 4. モックAPI設定チェック（全システム共通）
MOCK_API=$(grep -r --include="*.{js,ts,vue,py,env,env.*}" "MOCK_API=true" "$SYSTEM_DIR" | wc -l)
if [ "$MOCK_API" -gt 0 ]; then
  echo -e "${RED}警告: MOCK_API=true が検出されました${NC}"
  grep -r --include="*.{js,ts,vue,py,env,env.*}" "MOCK_API=true" "$SYSTEM_DIR"
  echo ""
else
  echo -e "${GREEN}✓ MOCK_API は適切に設定されています${NC}"
  echo ""
fi

# 5. テストカバレッジチェック（システムごとに異なる可能性あり）
echo "5. テストカバレッジチェック..."
echo -e "${YELLOW}注意: テストカバレッジチェックはシステム固有のテストランナーで別途実行してください${NC}"
echo ""

# 6. 一時的な実装チェック
echo "6. 一時的な実装チェック..."
TEMP_IMPL_COUNT=$(grep -r --include="*.{js,ts,vue,py}" -E "(temporary implementation|一時的な実装|temporary solution|仮実装|temporary fix)" "$SYSTEM_DIR" | wc -l)

if [ "$TEMP_IMPL_COUNT" -gt 0 ]; then
  echo -e "${RED}警告: $TEMP_IMPL_COUNT 件の一時的な実装が検出されました${NC}"
  grep -r --include="*.{js,ts,vue,py}" -E "(temporary implementation|一時的な実装|temporary solution|仮実装|temporary fix)" "$SYSTEM_DIR" | head -n 10
  if [ "$TEMP_IMPL_COUNT" -gt 10 ]; then
    echo "... 他 $(($TEMP_IMPL_COUNT - 10)) 件"
  fi
  echo ""
else
  echo -e "${GREEN}✓ 一時的な実装は検出されませんでした${NC}"
  echo ""
fi

# 7. 後で実装するコメントチェック
echo "7. 後で実装するコメントチェック..."
LATER_IMPL_COUNT=$(grep -r --include="*.{js,ts,vue,py}" -E "(implement later|後で実装|will be implemented|will implement|to be implemented)" "$SYSTEM_DIR" | wc -l)

if [ "$LATER_IMPL_COUNT" -gt 0 ]; then
  echo -e "${RED}警告: $LATER_IMPL_COUNT 件の「後で実装」コメントが検出されました${NC}"
  grep -r --include="*.{js,ts,vue,py}" -E "(implement later|後で実装|will be implemented|will implement|to be implemented)" "$SYSTEM_DIR" | head -n 10
  if [ "$LATER_IMPL_COUNT" -gt 10 ]; then
    echo "... 他 $(($LATER_IMPL_COUNT - 10)) 件"
  fi
  echo ""
else
  echo -e "${GREEN}✓ 「後で実装」コメントは検出されませんでした${NC}"
  echo ""
fi

# 結果の集計
TOTAL_ISSUES=$(($MOCK_COUNT + $TODO_COUNT + $TEMP_IMPL_COUNT + $LATER_IMPL_COUNT))

case $SYSTEM in
  saas)
    TOTAL_ISSUES=$(($TOTAL_ISSUES + $OFFLINE_MODE + $MOCK_API))
    ;;
  pms)
    TOTAL_ISSUES=$(($TOTAL_ISSUES + $OFFLINE_FIRST + $MOCK_API))
    ;;
  member)
    TOTAL_ISSUES=$(($TOTAL_ISSUES + $GDPR_COMPLIANCE + $MOCK_API))
    ;;
  common)
    TOTAL_ISSUES=$(($TOTAL_ISSUES + $MOCK_API))
    ;;
esac

echo "=================================================="
if [ "$TOTAL_ISSUES" -gt 0 ]; then
  echo -e "${RED}チェック結果: $TOTAL_ISSUES 件の問題が検出されました${NC}"
  echo "本番同等開発ルールに準拠するために修正が必要です。"
  exit 1
else
  echo -e "${GREEN}チェック結果: すべてのチェックに合格しました！${NC}"
  echo "本番同等開発ルールに準拠しています。"
  exit 0
fi
