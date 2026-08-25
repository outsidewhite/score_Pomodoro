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
nvm use
npm ci
npm run dev
```

Node.jsのバージョンは `.nvmrc` と `package.json` で `22.12.0` に固定しています。

## バージョン違いを揃える方法

開発者ごとの環境差による不具合を防ぐため、Node.jsと依存パッケージのバージョンを次の手順で揃えてください。

### Node.jsのバージョンを揃える

リポジトリ直下で次を実行すると、`.nvmrc` に記載されたNode.jsをインストールして切り替えられます。

```bash
nvm install
nvm use
node -v
```

`node -v` に `v22.12.0` と表示されることを確認してください。nvm-windowsで `nvm install` または `nvm use` にバージョン指定が必要な場合は、次を実行します。

```bash
nvm install 22.12.0
nvm use 22.12.0
```

### 依存パッケージのバージョンを揃える

共同開発では、`package-lock.json` に記録されたバージョンをそのまま再現するため、通常は `npm install` ではなく次を実行してください。

```bash
npm ci
```

`npm ci` は既存の `node_modules` を入れ直し、全開発環境の依存パッケージを `package-lock.json` の内容に揃えます。実行後は次のコマンドで動作を確認します。

```bash
npm run lint
npm run build
```

依存パッケージを追加・更新する場合に限り `npm install <package-name>` を使用し、変更された `package.json` と `package-lock.json` を必ず一緒にコミットしてください。

## 開発状況

- [x] React + TypeScript + Vite の雛形作成
- [x] 初期ディレクトリ構成の作成
- [ ] MediaPipe のモデル配置
- [ ] カメラ・タイマー・集中スコア機能の実装

企画の詳細は [worktimer_v0.1.md](./worktimer_v0.1.md) にまとめています。
