# Score Pomodoro

Webカメラと画像認識を利用し、作業中の集中状態をスコア化する作業タイマーのプロジェクトです。

現在は共同開発を始めるための雛形のみを用意しており、アプリの機能は未実装です。

## 技術構成

- React
- TypeScript
- Vite
- MediaPipe Tasks Vision
- Web Worker（実装予定）
- IndexedDB（実装予定）

初期バージョンではバックエンドを設けず、カメラ映像と画像認識をブラウザ内で処理する方針です。

## セットアップ

詳しい手順は [INITIAL_SETUP.md](./INITIAL_SETUP.md) を参照してください。

```bash
npm install
npm run dev
```

## 開発状況

- [x] React + TypeScript + Vite の雛形作成
- [x] 初期ディレクトリ構成の作成
- [ ] MediaPipe のモデル配置
- [ ] カメラ・タイマー・集中スコア機能の実装

企画の詳細は [worktimer_v0.1.md](./worktimer_v0.1.md) にまとめています。
