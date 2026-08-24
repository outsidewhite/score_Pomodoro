# 初期セットアップガイド

このドキュメントでは、本プロジェクトの雛形をローカル環境で起動するまでの手順を説明します。

## 必要な環境

- Git
- Node.js 22.12 以上
- npm
- Google Chrome または Microsoft Edge

バージョンを確認します。

```bash
node -v
npm -v
git --version
```

## リポジトリの取得

```bash
git clone <repository-url>
cd score_Pomodoro
```

## 依存パッケージのインストール

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

ターミナルに表示されたURL（通常は `http://localhost:5173/`）をブラウザで開きます。

React + TypeScript + Vite の初期画面が表示されれば、雛形のセットアップは完了です。

## 確認コマンド

```bash
npm run lint
npm run build
```

## 今後配置するモデル

MediaPipeを実装する段階で、次のモデルファイルを配置する予定です。現時点では未配置です。

```text
public/
└─ models/
   ├─ face_landmarker.task
   └─ pose_landmarker.task
```

カメラ機能の実装後は、初回アクセス時にブラウザのカメラ利用を許可してください。本番公開時はHTTPSが必要です。
