# PuzCom Solve Time Stats

パズコミュ（puzzle.nikoli.com）の解答時間統計を可視化するブラウザ拡張機能です。

TamperMonkeyスクリプト版とChrome Extension版の両方を提供しています。

## 機能

### 📊 統計情報の表示
- 解答件数
- 平均解答時間
- 中央値
- 最速記録
- あなたの順位とタイム（自動検出）

### 📈 ヒストグラム表示
- 解答時間の分布を視覚化
- 高DPI（Retina）ディスプレイ対応
- 外れ値の自動処理
- 自分のタイムをハイライト表示

### 🔽 ソート機能
- 解答記録を昇順・降順でソート
- ワンクリックで並び替え

### 🔄 SPA対応
- ページ遷移時も自動更新
- リアルタイムで統計を再計算

## インストール方法

お使いの環境に合わせて選択してください。

### TamperMonkeyスクリプト版

Chrome、Firefox、Edge、Safariなど、複数のブラウザで使用できます。

#### 1. TamperMonkeyのインストール
お使いのブラウザに[TamperMonkey](https://www.tampermonkey.net/)をインストールしてください。

- [Chrome版](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox版](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- [Edge版](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

#### 2. スクリプトのインストール
以下のリンクをクリックして、スクリプトをインストールしてください：

**[PuzComExtension.user.js をインストール](https://github.com/seiji-irie/PuzComExtension/raw/main/PuzComExtension.user.js)**

TamperMonkeyのインストール画面が表示されるので、「インストール」ボタンをクリックしてください。

---

### Chrome Extension版

Chrome/Edge専用の拡張機能です。

Chrome Web Storeからインストール：

**🚧 準備中** - 現在審査申請中です。公開され次第リンクを掲載します。

## 使い方

1. [パズコミュ](https://puzzle.nikoli.com/)にログイン
2. 任意のパズル投稿ページを開く（例: `https://puzzle.nikoli.com/official/post/123`）
3. 「解答記録者」ボタンをクリックして解答記録を表示
4. 自動的に統計パネルとソートボタンが表示されます

### スクリーンショット

<!-- 後で追加: screenshots/demo.png -->
*スクリーンショットは後日追加予定*

## 動作要件

### 共通
- パズコミュの有料会員アカウント

### TamperMonkeyスクリプト版
- TamperMonkey（またはGreasemonkey等の互換スクリプトマネージャー）
- Chrome、Firefox、Edge、Safari等のモダンブラウザ

### Chrome Extension版
- Google Chrome または Microsoft Edge

## 技術詳細

- **高DPI対応**: Retinaディスプレイなど高解像度画面に最適化
- **ビン数の自動選択**: Freedman-Diaconis法による統計的なヒストグラム最適化
- **SPA対応**: URL変更を監視して自動的にパネルを再構築
- **MutationObserver**: DOMの動的変化を検知してUI要素を追加

## 免責事項

このスクリプトは個人の責任でご使用ください。
- パズコミュの利用規約を遵守してご利用ください
- 問題が発生した場合は使用を中止してください
- 既に表示されているデータの可視化のみを行い、サーバーへの追加負荷は発生しません

## ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルをご覧ください

## 作者

[seiji-irie](https://github.com/seiji-irie)

## バグ報告・機能要望

[Issues](https://github.com/seiji-irie/PuzComExtension/issues)からお気軽にお知らせください。
