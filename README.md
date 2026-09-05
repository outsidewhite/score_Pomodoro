# Score Pomodoro

Webカメラと画像認識を利用し、作業中の集中状態をスコア化する作業タイマーのプロジェクトです。

現在はMediaPipeによる姿勢ランドマークのリアルタイム解析デモと、解析値をスコアへ変換するTypeScript処理の土台を実装しています。スタート・計測・結果画面は担当者が並行して開発できるよう、画面別の雛形を用意しています。

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
npm run test
npm run lint
npm run build
```

依存パッケージを追加・更新する場合に限り `npm install <package-name>` を使用し、変更された `package.json` と `package-lock.json` を必ず一緒にコミットしてください。

## ディレクトリ構成

UIと内部処理を分離し、担当者が同じファイルを同時に編集しない構成にしています。

```text
src/
├─ app/                         アプリの統合入口
├─ pages/
│  ├─ start/                   スタート画面
│  ├─ measurement/             計測画面
│  └─ result/                  終了・結果画面
├─ components/ui/              共通UI
├─ features/
│  ├─ camera/                  カメラ・モデル状態の型
│  ├─ pose/                    ランドマークから姿勢指標を計算
│  └─ scoring/                 姿勢指標からスコアを計算
├─ shared/types/               UIと内部処理で共有する型
├─ styles/                     デザイントークンと共通スタイル
└─ assets/                     画像などの静的素材
```

詳しい担当範囲とブランチ運用は [rule.md](./rule.md) を参照してください。

## スコア計算の流れ

```text
MediaPipeのランドマーク
    ↓
肩・腰の傾き、フレーム間移動、可視性を計算
    ↓
姿勢・安定性・検出状態を0〜100点へ変換
    ↓
重み付きの総合スコアを計算
```

計算式と初期設定は `src/features/scoring/`、姿勢指標の計算は `src/features/pose/` に配置しています。

## 開発状況

- [x] React + TypeScript + Vite の雛形作成
- [x] 初期ディレクトリ構成の作成
- [x] MediaPipe Pose Landmarker の読み込み
- [x] カメラ映像のリアルタイム解析とランドマーク表示
- [x] スタート・計測・結果画面の雛形作成
- [x] 姿勢指標と集中スコアの計算処理・単体テスト
- [x] スコア計算とリアルタイム解析の接続
- [ ] 画面遷移とタイマー機能の実装
- [ ] Web Worker・IndexedDBへの処理分離

企画の詳細は [worktimer_v0.1.md](./worktimer_v0.1.md) にまとめています。
