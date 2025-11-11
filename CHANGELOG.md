# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0] - 2025-01-10

### Added
- 統計パネル（平均、中央値、最速記録、自分の順位）
- ヒストグラム表示機能
- ソート機能（昇順・降順）
- SPA対応（ページ遷移時の自動更新）
- 高DPI（Retina）ディスプレイ対応
- 自分のタイムのハイライト表示
- TamperMonkeyスクリプト版とChrome Extension版の両対応

### Technical
- Freedman-Diaconis法によるビン数の自動選択
- MutationObserver + popstateによるURL変更検知（イベントドリブン）
- 外れ値の自動処理（IQRベース）
- 単一ソースコードで両環境対応
