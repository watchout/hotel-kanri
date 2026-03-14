# SSOT作成ワークフロー

SSOTはSingle Source of Truth（唯一の真実の情報源）です。

## 作成フロー

### Phase 1: 事前調査（15分）

1. **既存実装の調査**
   ```bash
   # hotel-commonの関連コード
   ls -la /Users/kaneko/hotel-common-rebuild/src/routes/
   
   # hotel-saasの関連コード
   ls -la /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/
   ```

2. **関連SSOTの確認**
   ```bash
   ls /Users/kaneko/hotel-kanri/docs/03_ssot/
   ```

3. **Prismaスキーマの確認**
   ```bash
   cat /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma
   ```

### Phase 2: 要件定義

1. **要件IDの体系**
   - 機能コード: 3-4文字の英字（例: ORD, USR, TEN）
   - 番号: 001から連番
   - 例: ORD-001, ORD-002...

2. **各要件の構成**
   ```markdown
   ### XXX-001: [要件名]
   
   - **説明**: [何をするか]
   - **理由**: [なぜ必要か]
   - **Accept**: [完了条件]
   ```

### Phase 3: API仕様定義

```markdown
## API仕様

### GET /api/v1/admin/xxx
- **認証**: Session認証必須
- **リクエスト**: なし
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": [...]
  }
  ```
- **エラー**: 401, 404
```

### Phase 4: データベース仕様

```markdown
## データベース

### テーブル: items
| カラム | 型 | 必須 | 説明 |
|:-------|:---|:-----|:-----|
| id | UUID | ✅ | 主キー |
| tenant_id | UUID | ✅ | テナントID |
| name | VARCHAR | ✅ | 名前 |
```

### Phase 5: 品質チェック

1. **SSOT品質チェックリスト**
   ```bash
   cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md
   ```

2. **スコア基準**
   - 90点以上: 合格
   - 80-89点: 要改善
   - 80点未満: 不合格

## 出力先

```
/Users/kaneko/hotel-kanri/docs/03_ssot/
├── 00_foundation/     # 基盤系
├── 01_admin_features/ # 管理画面機能
├── 02_guest_features/ # ゲスト機能
└── 03_pms_features/   # PMS機能
```

## 禁止事項

- ❌ 曖昧な表現（「適切に」「必要に応じて」）
- ❌ Accept条件のない要件
- ❌ 既存SSOTとの矛盾
- ❌ MVPとPhase 2以降の混同
