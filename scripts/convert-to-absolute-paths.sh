#!/bin/bash

# 相対パス→絶対パス一括変換スクリプト
# 対象: hotel-kanri/docs/ 内の全.mdファイル

echo "🔄 相対パス→絶対パス変換開始..."

# 変換対象ファイル一覧を取得
FILES=$(find docs/ -name "*.md" -type f)

# 変換カウンター
TOTAL=0
CONVERTED=0

for file in $FILES; do
    TOTAL=$((TOTAL + 1))
    
    # バックアップ作成
    cp "$file" "$file.backup"
    
    # 変換実行
    CHANGES=0
    
    # ../hotel-saas → /Users/kaneko/hotel-saas
    if sed -i '' 's|\.\.\/hotel-saas|/Users/kaneko/hotel-saas|g' "$file"; then
        CHANGES=$((CHANGES + 1))
    fi
    
    # ../hotel-common → /Users/kaneko/hotel-common
    if sed -i '' 's|\.\.\/hotel-common|/Users/kaneko/hotel-common|g' "$file"; then
        CHANGES=$((CHANGES + 1))
    fi
    
    # ../hotel-pms → /Users/kaneko/hotel-pms
    if sed -i '' 's|\.\.\/hotel-pms|/Users/kaneko/hotel-pms|g' "$file"; then
        CHANGES=$((CHANGES + 1))
    fi
    
    # ../hotel-member → /Users/kaneko/hotel-member
    if sed -i '' 's|\.\.\/hotel-member|/Users/kaneko/hotel-member|g' "$file"; then
        CHANGES=$((CHANGES + 1))
    fi
    
    # ../hotel-kanri → /Users/kaneko/hotel-kanri
    if sed -i '' 's|\.\.\/hotel-kanri|/Users/kaneko/hotel-kanri|g' "$file"; then
        CHANGES=$((CHANGES + 1))
    fi
    
    # 変更があった場合
    if ! diff -q "$file" "$file.backup" > /dev/null 2>&1; then
        CONVERTED=$((CONVERTED + 1))
        echo "✅ $file"
    fi
    
    # バックアップ削除
    rm "$file.backup"
done

echo ""
echo "📊 変換結果:"
echo "   対象ファイル: $TOTAL"
echo "   変換済み: $CONVERTED"
echo "🎉 変換完了！"
