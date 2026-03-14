次を実行:
1) ripgrep MCPで .cursor/taskcards/*.yaml を更新順に最大10件列挙し、
   id / alias / title を番号付きで表示。
2) ユーザーの番号 or alias を受けたらそのカードを「現在のTask」に確定。
3) 「現在のTask: <id> (<alias>) - <title>」のみを返す。
