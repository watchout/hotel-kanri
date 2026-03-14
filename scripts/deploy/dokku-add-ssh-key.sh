#!/bin/bash

# SSHキーを追加するスクリプト
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAID2i5/en2gkBaLfnC/JA8+1iBkNASdW4RjyH0EzLdS88 kaneko@arrowsworks.com" | sudo dokku ssh-keys:add admin

# ホスト名の設定を確認
echo "現在のホスト名設定:"
dokku domains:report --global

# アプリケーションの一覧を表示
echo "アプリケーション一覧:"
dokku apps:list

# Dokkuのバージョンを表示
echo "Dokkuバージョン:"
dokku version
