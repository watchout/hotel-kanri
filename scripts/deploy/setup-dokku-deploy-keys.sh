#!/bin/bash

# GitHub Actionsデプロイ用のSSHキーを生成するスクリプト

# キーの生成
ssh-keygen -t ed25519 -f dokku_deploy_key -N ""

# 公開鍵と秘密鍵の表示
echo "=== 公開鍵 ==="
cat dokku_deploy_key.pub
echo ""
echo "=== 秘密鍵 ==="
cat dokku_deploy_key
echo ""

echo "上記の秘密鍵をGitHub Secretsの DOKKU_DEV_DEPLOY_KEY に設定してください。"
echo "公開鍵はDokkuサーバーに登録する必要があります。"
echo ""
echo "Dokkuサーバーに公開鍵を登録するコマンド:"
echo "cat dokku_deploy_key.pub | ssh admin@<サーバーIP> \"sudo dokku ssh-keys:add github_actions\""
