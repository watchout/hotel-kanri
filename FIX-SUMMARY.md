# CI Path Resolution 根本修正

## 問題の本質

全てのPRでCIが失敗する原因:
1. **ハードコードされたパス**: `/Users/kaneko/hotel-kanri`
2. CI環境では `/home/runner/work/hotel-kanri/hotel-kanri`
3. 他の開発者のマシンでも動作しない

## 影響範囲

- 全てのPRでCI失敗
- ローカルでのcommitもpre-commit hookでブロック
- 開発が完全に停止

## 根本解決策

### 修正方針

1. **全てのハードコードされたパスを削除**
2. **`__dirname` または `process.cwd()` を使用**
3. **存在しないファイルはスキップ（エラーにしない）**

### 修正対象ファイル

現在調査中...

### 修正内容

```javascript
// ❌ Before
const HOTEL_KANRI = '/Users/kaneko/hotel-kanri';

// ✅ After
const HOTEL_KANRI = path.resolve(__dirname, '../..');
```

## 実施手順

1. mainブランチから新ブランチ作成: `fix/ci-path-resolution`
2. 全てのハードコードパスを修正
3. ローカルでテスト実行
4. PR作成
5. CIが通ることを確認
6. 緊急マージ
7. 他の全ブランチをrebase

## 検証

- [ ] ローカルで動作確認
- [ ] CI環境で動作確認
- [ ] 他の開発者のマシンでも動作することを確認

---

**このPRは最優先でマージする必要がある。**
