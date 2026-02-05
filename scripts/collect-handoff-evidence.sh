#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# DEV-0174: ハンドオフ Evidence収集スクリプト
# ============================================================

# === 設定 ===
EVIDENCE_DIR="/Users/kaneko/hotel-kanri/evidence/DEV-0174"
SAAS=http://localhost:3101
COOKIE=/tmp/saas_session.txt

# === ヘルパー関数 ===
step(){ echo -e "\n=== $* ==="; }
success(){ echo -e "\n✅ $*"; }
error(){ echo -e "\n❌ ERROR: $*" >&2; }

# === Evidenceディレクトリ作成 ===
step "Evidenceディレクトリ作成"
mkdir -p "$EVIDENCE_DIR"
success "ディレクトリ作成完了: $EVIDENCE_DIR"

# === Cookie確認 ===
if [ ! -f "$COOKIE" ]; then
  error "Session Cookieが見つかりません: $COOKIE"
  echo "先に test-handoff-admin.sh を実行してください"
  exit 1
fi
success "Session Cookie確認完了"

# === APIテスト実行 ===
step "APIテスト実行"
cd /Users/kaneko/hotel-kanri/scripts
./test-handoff-admin.sh > "$EVIDENCE_DIR/test-handoff-admin.log" 2>&1 || {
  error "APIテスト実行に失敗しました"
  echo "ログを確認してください: $EVIDENCE_DIR/test-handoff-admin.log"
}
success "APIテスト実行ログ保存完了"

# === API レスポンス例保存 ===
step "API レスポンス例保存"

# リクエスト一覧
echo "リクエスト一覧レスポンスを取得中..."
curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests" | jq . > "$EVIDENCE_DIR/api-list-response.json" 2>/dev/null || {
  error "リクエスト一覧レスポンス取得に失敗しました"
}
success "リクエスト一覧レスポンス保存完了"

# リクエスト詳細（最初のリクエストID取得）
echo "リクエスト詳細レスポンスを取得中..."
REQUEST_ID=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests" | jq -r '.data.requests[0].id' 2>/dev/null)
if [ "$REQUEST_ID" != "null" ] && [ -n "$REQUEST_ID" ]; then
  curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID" | jq . > "$EVIDENCE_DIR/api-detail-response.json" 2>/dev/null || {
    error "リクエスト詳細レスポンス取得に失敗しました"
  }
  success "リクエスト詳細レスポンス保存完了（ID: $REQUEST_ID）"
else
  error "テストリクエストが見つかりません"
fi

# ステータス更新レスポンス（新しいPENDINGリクエストを使用）
echo "ステータス更新レスポンスを取得中..."
PENDING_ID=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests?status=PENDING" | jq -r '.data.requests[0].id' 2>/dev/null)
if [ "$PENDING_ID" != "null" ] && [ -n "$PENDING_ID" ]; then
  curl -sS -b "$COOKIE" -X PATCH "$SAAS/api/v1/admin/handoff/requests/$PENDING_ID/status" \
    -H 'Content-Type: application/json' \
    -d '{"status":"ACCEPTED","notes":"Evidence収集テスト"}' | jq . > "$EVIDENCE_DIR/api-update-response.json" 2>/dev/null || {
    error "ステータス更新レスポンス取得に失敗しました"
  }
  success "ステータス更新レスポンス保存完了（ID: $PENDING_ID）"
else
  echo "⚠️  PENDING状態のリクエストが見つかりませんでした（ステータス更新レスポンスはスキップ）"
fi

# エラーレスポンス（他テナントアクセス）
echo "エラーレスポンスを取得中..."
curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests/handoff_other_tenant_999" | jq . > "$EVIDENCE_DIR/api-error-response.json" 2>/dev/null || {
  error "エラーレスポンス取得に失敗しました"
}
success "エラーレスポンス保存完了"

# === スクリーンショット案内 ===
step "スクリーンショット取得案内"
cat <<EOF

以下の画面のスクリーンショットを手動で取得してください：

1. ハンドオフ管理画面
   URL: http://localhost:3101/admin/handoff
   ファイル名: ui-handoff-list.png

2. ハンドオフ詳細モーダル
   操作: リクエストカードをクリック
   ファイル名: ui-handoff-detail-modal.png

3. ステータス更新後の画面
   操作: 「対応開始」ボタンをクリック
   ファイル名: ui-handoff-status-update.png

4. フィルタ操作後の画面
   操作: ステータスフィルタで「PENDING」を選択
   ファイル名: ui-handoff-filter.png

保存先: $EVIDENCE_DIR/

EOF

# === サマリーテンプレート作成 ===
step "サマリーテンプレート作成"
cat > "$EVIDENCE_DIR/summary.md" <<'SUMMARY_EOF'
# DEV-0174: 有人ハンドオフ テスト＆Evidence整備 - サマリー

**テスト実施日**: [YYYY-MM-DD]
**実施者**: [実施者名]
**所要時間**: [X分]

---

## ✅ テスト結果サマリー

| カテゴリ | 合格 | 不合格 | スキップ | 合計 |
|:---------|:-----|:-------|:---------|:-----|
| API統合テスト | 0 | 0 | 0 | 9 |
| UI動作確認テスト | 0 | 0 | 0 | 11 |
| E2Eシナリオテスト | 0 | 0 | 0 | 3 |
| セキュリティテスト | 0 | 0 | 0 | 10 |
| パフォーマンステスト | 0 | 0 | 0 | 4 |
| **合計** | **0** | **0** | **0** | **37** |

---

## 📊 API統合テスト結果

### HDF-ADM-001: リクエスト一覧取得

- [ ] GET /api/v1/admin/handoff/requests - 正常動作
- [ ] ステータスフィルタ - 正常動作
- [ ] 部屋番号フィルタ - 正常動作
- [ ] ページネーション - 正常動作
- [ ] テナント分離 - 正常動作
- [ ] PENDING優先のソート順 - 正常動作

**実行ログ**: `test-handoff-admin.log:65-74`
**レスポンス例**: `api-list-response.json`

### HDF-ADM-002: リクエスト詳細取得

- [ ] GET /api/v1/admin/handoff/requests/:id - 正常動作
- [ ] テナント分離（404） - 正常動作

**実行ログ**: `test-handoff-admin.log:89-103`
**レスポンス例**: `api-detail-response.json`

### HDF-ADM-003: ステータス更新

- [ ] PENDING → ACCEPTED - 正常動作
- [ ] ACCEPTED → COMPLETED - 正常動作
- [ ] 無効な遷移（エラー） - 正常動作

**実行ログ**: `test-handoff-admin.log:106-161`
**レスポンス例**: `api-update-response.json`

---

## 🎨 UI動作確認テスト結果

### ハンドオフ管理画面

- [ ] リクエスト一覧表示
- [ ] ステータスバッジ表示（色分け）
- [ ] 未対応リクエストが上位表示
- [ ] ゲスト情報表示
- [ ] 経過時間表示
- [ ] フィルタ操作
- [ ] 部屋番号検索
- [ ] リクエストカードクリック → 詳細モーダル
- [ ] ポーリング動作（5秒間隔）
- [ ] 新規リクエストの自動追加

**スクリーンショット**: `ui-handoff-list.png`, `ui-handoff-filter.png`

### ハンドオフ詳細モーダル

- [ ] ゲスト情報表示
- [ ] 会話履歴表示
- [ ] 現在のステータス表示
- [ ] スタッフメモ表示（既存メモがある場合）
- [ ] スタッフメモ入力
- [ ] 「対応開始」ボタン → ACCEPTED
- [ ] 「完了」ボタン → COMPLETED
- [ ] 「キャンセル」ボタン → CANCELLED
- [ ] モーダルを閉じる → 一覧に戻る
- [ ] 更新後のリスト自動リフレッシュ
- [ ] バリデーション（メモ1000文字以内）

**スクリーンショット**: `ui-handoff-detail-modal.png`, `ui-handoff-status-update.png`

---

## 🔗 E2Eシナリオテスト結果

### シナリオ1: 正常フロー

1. [ ] ゲストがハンドオフリクエストを作成
2. [ ] スタッフ管理画面に新規リクエストが表示される
3. [ ] スタッフがリクエスト詳細を開く
4. [ ] 「対応開始」ボタンをクリック（PENDING → ACCEPTED）
5. [ ] ステータスが「対応中」に変わる
6. [ ] メモを入力して「完了」ボタンをクリック（ACCEPTED → COMPLETED）
7. [ ] ステータスが「完了」に変わる
8. [ ] 完了済みリクエストは操作ボタンが無効化される

### シナリオ2: タイムアウト処理

1. [ ] ゲストがハンドオフリクエストを作成
2. [ ] 60秒待機（タイムアウト処理が実行される）
3. [ ] ステータスが自動的に TIMEOUT に変わる
4. [ ] ゲスト画面に電話CTA（内線番号）が表示される

### シナリオ3: キャンセル処理

1. [ ] ゲストがハンドオフリクエストを作成
2. [ ] スタッフが「キャンセル」ボタンをクリック
3. [ ] ステータスが CANCELLED に変わる
4. [ ] キャンセル済みリクエストは操作ボタンが無効化される

---

## 🔒 セキュリティテスト結果

### テナント分離

- [ ] 他テナントのリクエスト一覧取得 - 拒否
- [ ] 他テナントのリクエスト詳細取得 - 拒否（404）
- [ ] 他テナントのステータス更新 - 拒否（404）
- [ ] 列挙攻撃耐性（403ではなく404を返す）

**実行ログ**: `test-handoff-admin.log:134-145`
**エラーレスポンス**: `api-error-response.json`

### 認証・認可

- [ ] 未認証でのアクセス - 拒否（401）
- [ ] Session認証必須 - 正常動作
- [ ] スタッフロールのみアクセス可能

### 入力バリデーション

- [ ] 無効なステータス値 - エラー
- [ ] メモの最大長（1000文字）超過 - エラー
- [ ] 無効なID - エラー

---

## ⚡ パフォーマンステスト結果

| API | 平均応答時間 | 95パーセンタイル | 合否 |
|:----|:------------|:----------------|:-----|
| GET /requests | [X]ms | [X]ms | [ ] |
| GET /requests/:id | [X]ms | [X]ms | [ ] |
| PATCH /requests/:id/status | [X]ms | [X]ms | [ ] |

**実行ログ**: `performance-test.log`

**目標値**: 2秒以内（95パーセンタイル）

---

## 🐛 発見された問題

### 問題1: [問題タイトル]

- **重要度**: 高/中/低
- **説明**: [問題の詳細]
- **再現手順**: [手順]
- **期待される動作**: [期待]
- **実際の動作**: [実際]
- **対応方針**: [対応]

---

## 📝 所感・改善提案

[テスト実施後の所感、改善提案など]

例:
- UIの応答性が良好で、ユーザビリティに問題はなかった
- ポーリング間隔（5秒）は適切で、負荷も許容範囲内
- エラーメッセージが分かりやすく、デバッグが容易
- 今後の改善案: WebSocket実装によるリアルタイム通知（Phase 2）

---

## ✅ 総合判定

- [ ] **合格** - 全ての要件を満たし、本番デプロイ可能
- [ ] **条件付き合格** - 軽微な問題があるが、本番デプロイ可能（要監視）
- [ ] **不合格** - 重大な問題があり、修正が必要

**判定理由**: [判定理由を記載]

例:
- 全てのAPI統合テストが合格
- UI動作確認テストが合格
- セキュリティテスト（テナント分離、認証・認可）が合格
- パフォーマンステストが目標値（2秒以内）を達成
- E2Eシナリオテストが全て成功
- 重大な問題は発見されず、本番デプロイ可能と判断

---

**作成日**: [YYYY-MM-DD]
**作成者**: [作成者名]
SUMMARY_EOF

success "サマリーテンプレート作成完了"

# === 完了 ===
step "Evidence収集完了"
cat <<EOF

✅ Evidence収集が完了しました

Evidence保存先: $EVIDENCE_DIR

収集されたファイル:
  - test-handoff-admin.log          # APIテスト実行ログ
  - api-list-response.json          # リクエスト一覧レスポンス
  - api-detail-response.json        # リクエスト詳細レスポンス
  - api-update-response.json        # ステータス更新レスポンス（存在する場合）
  - api-error-response.json         # エラーレスポンス
  - summary.md                      # テストサマリーテンプレート

次のステップ:
  1. スクリーンショットを手動で取得（上記の案内を参照）
  2. summary.md を編集してテスト結果を記入
  3. パフォーマンステストを実施（オプション）
  4. 総合判定を記入
  5. SSOT（SSOT_DEV-0174_HANDOFF_TEST_EVIDENCE.md）に結果を反映

EOF
