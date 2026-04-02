#!/bin/bash
# Branch Protection自動設定スクリプト
# 使い方: GITHUB_TOKEN=$(gh auth token) ./scripts/setup-branch-protection.sh

set -e

REPO_OWNER="watchout"
REPO_NAME="hotel-kanri"
BRANCH="main"

echo "🔧 Branch Protection設定中..."
echo "📦 Repository: ${REPO_OWNER}/${REPO_NAME}"
echo "🌿 Branch: ${BRANCH}"
echo ""

# GitHub Personal Access Tokenが必要
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ エラー: GITHUB_TOKEN環境変数が設定されていません"
  echo "💡 設定方法:"
  echo "   export GITHUB_TOKEN=<your-github-token>"
  echo "   または"
  echo "   GITHUB_TOKEN=<your-token> ./scripts/setup-branch-protection.sh"
  exit 1
fi

# Branch Protection設定
curl -X PUT \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "Critical Gates Summary"
      ]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": null,
    "restrictions": null,
    "required_linear_history": false,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": false
  }'

echo ""
echo "✅ Branch Protection設定完了！"
echo ""
echo "📋 設定内容:"
echo "  - Require status checks: ON"
echo "  - Required checks: Critical Gates Summary"
echo "  - Require PR reviews: OFF (個人開発)"
echo "  - Enforce admins: OFF"
echo ""
echo "🔗 確認: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/branches"
