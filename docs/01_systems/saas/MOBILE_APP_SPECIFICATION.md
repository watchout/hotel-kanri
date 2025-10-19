# Hotel SaaS - 客室UI モバイルアプリ化仕様書

## 概要

Hotel SaaSの客室オーダーシステムをタブレット・Google TV向けのAndroidアプリとして提供し、Google Playストアから配信する仕様書です。

## 1. プロジェクト概要

### 1.1 目的
- 客室内でのオーダーシステムをより使いやすく提供
- タブレット・Google TV環境での最適化されたUI/UX
- **WebView形式による既存Webアプリの活用**
- **Google TVリモコン操作への完全対応**
- Google Playストアでの配信による簡単なインストール

### 1.2 対象デバイス
- **タブレット**: 10インチ以上のAndroidタブレット
- **Google TV**: Android TV OS搭載のスマートTV・セットトップボックス

### 1.3 技術スタック
- **フレームワーク**: Capacitor + Nuxt 3（WebView形式）
- **プラットフォーム**: Android / Android TV
- **配信**: Google Play Store
- **UI**: 既存WebアプリをTV向けに最適化

### 1.4 アプリ構成方針 🆕
- **WebView中心**: 既存のWebアプリをWebViewで表示
- **ネイティブ機能最小限**: 必要最小限のネイティブ機能のみ実装
- **リモコン最適化**: Google TVリモコンでの直感的操作を最優先

## 2. 機能要件

### 2.1 コア機能
- ✅ 商品カタログ表示（WebView）
- ✅ カート機能（WebView）
- ✅ 注文送信（WebView）
- ✅ 注文履歴表示（WebView）
- ✅ 客室認証（デバイス認証）

### 2.2 アプリ固有機能
- 🆕 **WebView表示**: 既存Webアプリの完全表示
- 🆕 **自動起動**: アプリ起動時に自動でWebアプリ画面表示
- 🆕 **リモコン操作**: 十字キー・決定ボタンでの簡単操作
- 🆕 **横画面最適化**: Google TV向け横画面レイアウト
- 🆕 **SSL/TLS対応**: セキュア通信の確保

### 2.3 TV特化機能 🆕
- 🆕 **十字キーナビゲーション**: D-pad操作での要素間移動
- 🆕 **フォーカス表示**: 現在選択中の要素を明確に表示
- 🆕 **大画面レイアウト**: 10フィート視聴距離対応
- 🆕 **シンプル操作**: 最小限のボタンで全機能にアクセス

## 3. 技術仕様

### 3.1 アプリケーション構成 🆕

```
hotel-saas-tv-app/
├── android/                    # Android固有設定
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # TV対応設定
│   │   │   └── java/            # WebView制御
│   │   └── build.gradle         # TV依存関係
├── src/
│   ├── main.ts                 # アプリエントリーポイント
│   ├── webview/                # WebView制御
│   ├── tv-navigation/          # TV操作制御
│   └── utils/                  # ユーティリティ
├── capacitor.config.ts         # Capacitor設定
└── package.json
```

### 3.2 Capacitor設定 🆕

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hotelsaas.roomorder.tv',
  appName: 'Hotel Room Order TV',
  webDir: 'dist',
  server: {
    url: 'https://your-hotel-saas-domain.com',  // 既存WebアプリURL
    cleartext: false,  // HTTPS必須
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
```

### 3.3 Android Manifest設定 🆕

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- TV対応 -->
    <uses-feature
        android:name="android.software.leanback"
        android:required="true" />
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />
    
    <!-- 権限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:banner="@drawable/tv_banner"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme.Leanback"
        android:hardwareAccelerated="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:screenOrientation="landscape"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            
            <!-- TV用ランチャー（メイン） -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
            
            <!-- 通常のランチャー（サブ） -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### 3.4 WebView制御実装 🆕

```typescript
// src/webview/WebViewManager.ts
export class WebViewManager {
  private webView: HTMLElement | null = null;
  
  async initializeWebView() {
    // WebViewの初期化
    this.webView = document.getElementById('main-webview');
    
    if (this.webView) {
      // 自動でWebアプリ画面を表示
      await this.loadWebApp();
      
      // TV操作イベントの設定
      this.setupTVNavigation();
    }
  }
  
  private async loadWebApp() {
    const webAppUrl = 'https://your-hotel-saas-domain.com/room';
    
    // WebViewでWebアプリを読み込み
    if (this.webView) {
      (this.webView as any).src = webAppUrl;
    }
  }
  
  private setupTVNavigation() {
    // リモコン操作の設定
    document.addEventListener('keydown', this.handleTVKeyDown.bind(this));
  }
  
  private handleTVKeyDown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case 19: // KEYCODE_DPAD_UP
        this.navigateUp();
        break;
      case 20: // KEYCODE_DPAD_DOWN
        this.navigateDown();
        break;
      case 21: // KEYCODE_DPAD_LEFT
        this.navigateLeft();
        break;
      case 22: // KEYCODE_DPAD_RIGHT
        this.navigateRight();
        break;
      case 23: // KEYCODE_DPAD_CENTER
        this.selectCurrent();
        break;
    }
  }
}
```

## 4. UI/UX仕様

### 4.1 Google TV向けUI 🆕

#### レイアウト仕様
- **画面サイズ**: 32インチ以上のTV
- **解像度**: 1920x1080 (Full HD) / 3840x2160 (4K)
- **向き**: 横向き（ランドスケープ）固定
- **視聴距離**: 10フィート（約3メートル）
- **操作**: リモコン（十字キー + 決定ボタン）

#### デザイン要件 🆕
```css
/* TV専用スタイル（WebView内で適用） */
@media (min-width: 1920px) and (orientation: landscape) {
  /* 全体レイアウト */
  .tv-optimized {
    padding: 4rem;
    font-size: 1.8rem;
    line-height: 1.6;
  }
  
  /* フォーカス可能な要素 */
  .focusable {
    border: 4px solid transparent;
    border-radius: 8px;
    transition: all 0.3s ease;
  }
  
  .focusable:focus,
  .focusable.tv-focused {
    border-color: #3B82F6;
    background-color: rgba(59, 130, 246, 0.1);
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
  }
  
  /* 商品グリッド */
  .tv-product-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
    padding: 2rem;
  }
  
  /* 商品カード */
  .tv-product-card {
    min-height: 400px;
    font-size: 1.6rem;
    padding: 2rem;
    text-align: center;
  }
  
  /* ボタン */
  .tv-button {
    min-height: 80px;
    font-size: 1.8rem;
    padding: 1.5rem 3rem;
    border-radius: 12px;
    font-weight: bold;
  }
  
  /* カート */
  .tv-cart {
    position: fixed;
    right: 2rem;
    top: 2rem;
    width: 400px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  }
}
```

### 4.2 リモコン操作フロー 🆕

#### 基本操作
1. **十字キー上下**: 商品カード間の縦移動
2. **十字キー左右**: 商品カード間の横移動
3. **決定ボタン**: 商品選択・カート追加
4. **戻るボタン**: 前の画面に戻る

#### 操作シーケンス例
```
起動 → 商品一覧表示 → 十字キーで商品選択 → 決定ボタンでカート追加 
→ 十字キーでカート移動 → 決定ボタンで注文確定
```

### 4.3 フォーカス管理システム 🆕

```typescript
// src/tv-navigation/FocusManager.ts
export class TVFocusManager {
  private focusableElements: HTMLElement[] = [];
  private currentFocusIndex: number = 0;
  
  initializeFocus() {
    // フォーカス可能な要素を取得
    this.updateFocusableElements();
    
    // 初期フォーカスを設定
    this.setFocus(0);
  }
  
  updateFocusableElements() {
    this.focusableElements = Array.from(
      document.querySelectorAll('.focusable:not([disabled])')
    ) as HTMLElement[];
  }
  
  navigateUp() {
    const currentElement = this.focusableElements[this.currentFocusIndex];
    const currentRect = currentElement.getBoundingClientRect();
    
    // 上方向で最も近い要素を検索
    let bestMatch = -1;
    let bestDistance = Infinity;
    
    this.focusableElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      
      if (rect.bottom <= currentRect.top) {
        const distance = Math.abs(rect.left - currentRect.left) + 
                        (currentRect.top - rect.bottom);
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = index;
        }
      }
    });
    
    if (bestMatch !== -1) {
      this.setFocus(bestMatch);
    }
  }
  
  navigateDown() {
    // 下方向ナビゲーション（上記と同様のロジック）
  }
  
  navigateLeft() {
    // 左方向ナビゲーション
    const currentRow = this.getCurrentRow();
    const newIndex = Math.max(0, this.currentFocusIndex - 1);
    
    if (this.getRowOfIndex(newIndex) === currentRow) {
      this.setFocus(newIndex);
    }
  }
  
  navigateRight() {
    // 右方向ナビゲーション
    const currentRow = this.getCurrentRow();
    const newIndex = Math.min(
      this.focusableElements.length - 1, 
      this.currentFocusIndex + 1
    );
    
    if (this.getRowOfIndex(newIndex) === currentRow) {
      this.setFocus(newIndex);
    }
  }
  
  setFocus(index: number) {
    // 現在のフォーカスを削除
    this.focusableElements[this.currentFocusIndex]?.classList.remove('tv-focused');
    
    // 新しいフォーカスを設定
    this.currentFocusIndex = index;
    const element = this.focusableElements[index];
    
    if (element) {
      element.classList.add('tv-focused');
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }
  
  selectCurrent() {
    const element = this.focusableElements[this.currentFocusIndex];
    if (element) {
      element.click();
    }
  }
}
```

## 5. WebView統合仕様 🆕

### 5.1 WebApp連携

```typescript
// src/webview/WebAppBridge.ts
export class WebAppBridge {
  private webView: any;
  
  constructor(webView: any) {
    this.webView = webView;
    this.setupBridge();
  }
  
  setupBridge() {
    // Webアプリとネイティブアプリ間の通信設定
    this.webView.addJavascriptInterface({
      // TV操作イベントをWebアプリに送信
      sendTVKeyEvent: (keyCode: number) => {
        this.webView.evaluateJavascript(`
          window.dispatchEvent(new CustomEvent('tvKeyDown', {
            detail: { keyCode: ${keyCode} }
          }));
        `);
      },
      
      // デバイス情報をWebアプリに送信
      getDeviceInfo: () => {
        return JSON.stringify({
          platform: 'android-tv',
          isTV: true,
          screenSize: 'large'
        });
      }
    }, 'AndroidTV');
  }
}
```

### 5.2 WebApp側対応 🆕

```typescript
// 既存WebアプリのTV対応コード
// composables/useTVDetection.ts
export const useTVDetection = () => {
  const isTV = ref(false);
  
  onMounted(() => {
    // Android TVアプリからの実行を検出
    isTV.value = !!(window as any).AndroidTV || 
                  navigator.userAgent.includes('TV') ||
                  window.innerWidth >= 1920;
    
    if (isTV.value) {
      // TV用スタイルを適用
      document.body.classList.add('tv-mode');
      
      // TV操作イベントリスナーを設定
      window.addEventListener('tvKeyDown', handleTVKeyDown);
    }
  });
  
  const handleTVKeyDown = (event: CustomEvent) => {
    const { keyCode } = event.detail;
    
    // TV操作をWebアプリ内で処理
    switch (keyCode) {
      case 19: // UP
        focusManager.navigateUp();
        break;
      case 20: // DOWN
        focusManager.navigateDown();
        break;
      // ... 他のキー処理
    }
  };
  
  return { isTV };
};
```

## 6. 開発・ビルド手順 🆕

### 6.1 開発環境セットアップ

```bash
# 1. Capacitorプロジェクト初期化
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npx cap init "Hotel Room Order TV" "com.hotelsaas.roomorder.tv"

# 2. Android TV開発環境
# Android Studio インストール
# Android TV SDK セットアップ

# 3. プラットフォーム追加
npx cap add android

# 4. TV向け設定
# AndroidManifest.xmlにTV設定追加
# build.gradleにTV依存関係追加
```

### 6.2 ビルド手順

```bash
# 1. WebView用の最小限ビルド
npm run build:tv

# 2. Capacitorプロジェクト同期
npx cap sync android

# 3. Android Studioで開く
npx cap open android

# 4. TV用APK/AABビルド
# Build > Generate Signed Bundle/APK
# TV向けの設定でビルド
```

### 6.3 Google Play配信準備 🆕

```bash
# 1. TV向けAABファイル生成
./gradlew bundleRelease

# 2. Play Console TV設定
# - Android TV対応を有効化
# - TVバナー画像設定
# - TV向けスクリーンショット追加
```

## 7. Google Play Store 掲載仕様 🆕

### 7.1 アプリ情報

- **アプリ名**: Hotel Room Order TV
- **パッケージ名**: com.hotelsaas.roomorder.tv
- **カテゴリ**: ライフスタイル
- **対象年齢**: 全年齢
- **価格**: 無料
- **TV対応**: Android TV専用アプリ

### 7.2 ストア掲載素材 🆕

#### TV専用素材
- **TVバナー**: 1280x720 PNG（必須）
- **TVスクリーンショット**: 1920x1080 (横) × 8枚
- **アプリアイコン**: 512x512 PNG
- **フィーチャーグラフィック**: 1024x500 PNG

#### 説明文 🆕
```
【日本語】
ホテル客室専用オーダーシステム（Google TV版）

Google TVから簡単にルームサービスをご注文いただけるアプリです。

■主な機能
・リモコンで簡単操作
・大画面での見やすい表示
・豊富なメニューから選択
・簡単注文・決済

■操作方法
・十字キー：商品選択
・決定ボタン：注文追加
・戻るボタン：前画面に戻る

※本アプリは対応ホテルでのみご利用いただけます。
※Google TV / Android TV専用です。

【English】
Hotel Room Service Ordering System (Google TV Edition)

Easy room service ordering from your Google TV.

■Features
・Simple remote control operation
・Large screen optimized display
・Extensive menu selection
・Easy ordering & payment

■How to Use
・D-pad: Select items
・OK button: Add to cart
・Back button: Return to previous screen

*This app is only available at participating hotels.
*Designed exclusively for Google TV / Android TV.
```

## 8. テスト仕様 🆕

### 8.1 TV操作テスト

#### 必須テストケース
- [ ] **リモコン基本操作**
  - [ ] 十字キー上下左右での要素移動
  - [ ] 決定ボタンでの選択・実行
  - [ ] 戻るボタンでの画面遷移

- [ ] **WebView表示テスト**
  - [ ] 既存WebアプリのTV画面での正常表示
  - [ ] SSL/HTTPS通信の確認
  - [ ] 画面回転・解像度対応

- [ ] **フォーカス管理テスト**
  - [ ] フォーカス表示の視認性
  - [ ] フォーカス移動の直感性
  - [ ] 画面外要素への適切なスクロール

### 8.2 実機テスト環境
- **Google TV**: Chromecast with Google TV
- **Android TV**: Sony BRAVIA, TCL Android TV
- **エミュレータ**: Android Studio TV AVD

## 9. 開発スケジュール 🆕

### フェーズ1: WebView基盤構築（1週間）
- [ ] Capacitorプロジェクト初期化
- [ ] WebView実装・既存Webアプリ表示確認
- [ ] 基本TV操作実装

### フェーズ2: TV操作最適化（2週間）
- [ ] リモコン操作システム実装
- [ ] フォーカス管理システム構築
- [ ] TV向けUI調整

### フェーズ3: テスト・最適化（1週間）
- [ ] 実機テスト
- [ ] 操作性改善
- [ ] パフォーマンス最適化

### フェーズ4: ストア申請（1週間）
- [ ] TV向けストア素材作成
- [ ] Google Play Console設定
- [ ] 審査申請

**総開発期間**: 約5週間（従来の8週間から短縮）

## 10. 成果物 🆕

### 10.1 ソースコード
- Capacitorプロジェクト一式
- TV操作制御コード
- WebView統合コード
- ビルド設定ファイル

### 10.2 ビルド済みファイル
- APKファイル（デバッグ用）
- AABファイル（リリース用）
- Google Play Console用素材

### 10.3 ドキュメント
- 導入手順書
- Google Play登録手順
- TV操作マニュアル
- トラブルシューティングガイド

---

**作成日**: 2024年12月
**バージョン**: 2.0（Google TV最適化版）
**作成者**: Hotel SaaS開発チーム 