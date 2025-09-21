# 頂（Itadaki）- 富士山登頂準備・チーム管理

チームで富士山登頂準備を行うための完全クライアントサイドWebアプリです。メンバー管理、体調記録、装備チェック、登山記録、登頂計画（日時・山小屋・時刻スケジュール）を1つの画面で扱えます。データは端末のブラウザに自動保存され、再読み込み後も入力途中の値を復元します。

## 主な機能
- メンバー管理（追加・削除、年齢・経験）
- 安全管理（体調/睡眠/疲労の記録、直近データに基づくリスク表示）
- 装備チェック（必須/推奨/季節、重量合計、メンバー横断サマリ、TXT出力）
- 準備度（ダッシュボードに表示）
  - 標準条件の重み付け: 安全40% / 装備35% / 経験25%
  - 安全<50でoverall≤70、クリティカル装備欠如でoverall≤60、直近48hログ無しでoverall≤80のキャップ
- 登山記録（山リストとの連携、記録一覧/削除、TXTモーダル表示）
- 登頂計画（予定日、山小屋、時刻単位スケジュール追加/削除、TXT出力）
- オートセーブ/ドラフト復元（入力・変更の度にlocalStorageへ反映、10秒毎に保存）

## 画面構成
- 📊 ダッシュボード: 登録メンバー数、準備度詳細カード一覧
- 👥 メンバー: 登録フォーム/一覧
- 🏥 安全管理: 体調入力、直近のリスク評価
- 🎒 装備度チェック: カテゴリ別チェック、サマリ/出力
- ⛰️ 登山記録: 山名登録、登山記録の保存/一覧/削除
- 🗓️ 登頂計画: 日付・山小屋・時刻スケジュール

## 技術構成
- HTML/CSS/JavaScript（完全フロントエンド）
- ES Modules: `app.js`（イベント・委譲） + `fujisanTeamManager.js`（ロジック）
- localStorageによる端末内保存（ユーザー毎/ブラウザ毎）

## ローカルでの実行
1) 本ディレクトリで開発サーバを起動
```bash
python3 -m http.server 8000
```
2) ブラウザで以下を開く
```
http://localhost:8000/fujisan_team_manager.html
```

## デプロイ（共有方法）
### GitHub Pages（簡単・公開）
1) このリポジトリをGitHubにpush済みであることを確認
2) エントリを `index.html` にしたい場合は以下いずれか
   - `fujisan_team_manager.html` を `index.html` にリネーム
   - もしくは `index.html` を作成し、`fujisan_team_manager.html` へリダイレクト
3) リポジトリ Settings → Pages → Branch: `main` / root を選択
4) 発行URLをメンバーに共有

注意: GitHub Pagesは完全公開（簡易認証なし）。localStorageは各ユーザー端末に保存され、チーム間で状態は同期されません。

### Vercel / Netlify / Cloudflare Pages（簡易認証も可能）
- GitHub連携でデプロイ（Buildなし、出力はリポジトリルート）
- 認証が必要なら：
  - Cloudflare Pages + Cloudflare Access（SSO）
  - Vercel MiddlewareでBasic認証（簡易PW保護）

## データとプライバシー
- すべてのデータはlocalStorageに保存され、外部サーバへ送信しません。
- 共同編集/デバイス間同期が必要な場合は、Supabase/Firebaseなどのバックエンド追加が必要です。

## コード構成
```
fujisan_team_manager.html   # 画面レイアウト（scriptはESMで分離）
styles.css                  # スタイル
app.js                      # イベント/委譲・初期化
fujisanTeamManager.js       # アプリロジック（データ、表示更新、計算）
```

### 主要ロジック
- 準備度計算（標準条件B）
  - `computeSafetyScore(memberId)`
  - `computeGearScore(memberId)`（必須/推奨/季節=70/20/10、クリティカル欠如で40点上限）
  - `calculateOverallPreparationStandard(member, safety, gear, exp)`（40/35/25 + キャップ）
- オートセーブ/ドラフト
  - `setDrafts` / `applyDraftsToUI`（入力復元）

## ライセンス
Apache License 2.0（`LICENSE`参照）

## コントリビューション
Issue/PR歓迎です。改善したい配分・キャップ・入力項目などのご提案もお待ちしています。