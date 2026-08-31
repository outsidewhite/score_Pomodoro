# 初期セットアップガイド

このドキュメントでは、本プロジェクトの雛形をローカル環境で起動するまでの手順を説明します。

## 必要な環境

- Git
- Node.js 22.12.0
- npm
- Google Chrome または Microsoft Edge

バージョンを確認します。

```bash
node -v
npm -v
git --version
```

本プロジェクトではNode.jsを `22.12.0` に固定しています。nvmを利用している場合は、リポジトリ直下で次を実行してください。

```bash
nvm install
nvm use
```

## リポジトリの取得

```bash
git clone <repository-url>
cd score_Pomodoro
```

## 依存パッケージのインストール

```bash
npm ci
```

共同開発では、`package-lock.json`に記録された依存パッケージを同じバージョンで再現するため、通常は`npm ci`を使用します。

## 開発サーバーの起動

```bash
npm run dev
```

ターミナルに表示されたURL（通常は `http://localhost:5173/`）をブラウザで開きます。

カメラ映像と姿勢ランドマークの解析デモ画面が表示されれば、セットアップは完了です。カメラを起動する場合は、ブラウザの確認画面で利用を許可してください。

## 確認コマンド

```bash
npm run test
npm run lint
npm run build
```

`npm run test`では、姿勢指標からスコアを計算するTypeScript処理を確認します。

## MediaPipeモデル

現在のデモは、MediaPipe Tasks VisionのWasmとPose LandmarkerモデルをCDNから読み込みます。そのため、初回表示時と解析開始時にはネットワーク接続が必要です。

将来モデルをローカル配信へ変更する場合は、モデルファイルを`public/models/`へ配置し、`src/App.tsx`のモデルパスを更新します。本番公開時にカメラを利用するにはHTTPSが必要です。
