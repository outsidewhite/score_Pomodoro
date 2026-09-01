# GitHubを用いた共同開発ルール

メンバーが並行して安全に作業できるように、Issueごとにブランチを作成し、Pull Requestを通して`main`へマージします。

## 基本ルール

- `main`ブランチへ直接コミット・pushしない
- 作業を始める前にIssueを作成する
- 原則として1つのIssueにつき1つのブランチを作成する
- Pull Requestはレビューと動作確認が完了してからマージする
- ブランチ名は`feature/#Issue番号-name`を基本とする

例：Issue #12に対応する場合

```text
feature/#12-username
```

バグ修正やドキュメント変更では、変更内容に応じて次の接頭辞を使用しても構いません。

```text
fix/#12
docs/#12
refactor/#12
```

## 担当領域とコンフリクト防止

本プロジェクトでは、画面のデザイン・UI実装と、MediaPipeの解析値をスコアへ変換する内部処理を分けて開発します。同じファイルを複数人が同時に変更しないよう、担当ごとの主な編集領域を次のように定めます。

| 担当 | 主に触る領域 | 原則として触らない領域 |
| --- | --- | --- |
| デザイン担当 | `pages/`、`components/ui/`、`styles/`、`assets/` | `features/scoring/` |
| 内部処理担当 | `features/scoring/`、`features/pose/`、関連テスト | ページのJSX・CSS |
| 結合担当 | `App.tsx`、画面遷移、計測画面との接続部分 | スコア計算式、デザインの詳細 |

デザイン担当がFigma上の作業だけを行う場合、原則としてリポジトリは変更せず、実装対象のFrame URLと画面仕様をUI実装担当へ共有します。

### デザイン担当

デザイン担当は、主に次の画面と共通UIを担当します。

- スタート画面
- 計測画面
- 終了・結果画面
- Header、Button、Cardなどの共通UI
- 色、余白、文字サイズなどのデザイントークン
- PC、タブレット、モバイルのレスポンシブ表示
- loading、error、disabledなどの画面状態

実装も担当する場合は、主に次の領域を変更します。

```text
src/pages/start/
src/pages/measurement/
src/pages/result/
src/components/ui/
src/styles/
src/assets/
```

計測画面では内部処理が返した値を表示するだけにし、スコアの計算式をページコンポーネント内へ記述しません。

### 内部処理担当

内部処理担当は、MediaPipeから受け取ったランドマークをTypeScriptで解析し、スコアへ変換する処理を担当します。

```text
src/features/pose/
src/features/scoring/
```

処理は次の順番で分割します。

```text
MediaPipeの解析値
    ↓
poseMetrics.ts
角度、移動量、姿勢の安定性を計算
    ↓
calculateScore.ts
各評価値を0〜100点へ変換
    ↓
ScoreResult
    ↓
計測画面・終了画面へ渡す
```

可能な限り、DOMやReactの状態へ依存しない純粋な計算関数として実装し、入力値と期待するスコアをテストで確認します。

### 推奨ディレクトリ構成

```text
src/
├─ app/
│  └─ App.tsx
├─ pages/
│  ├─ start/
│  │  ├─ StartPage.tsx
│  │  └─ StartPage.css
│  ├─ measurement/
│  │  ├─ MeasurementPage.tsx
│  │  └─ MeasurementPage.css
│  └─ result/
│     ├─ ResultPage.tsx
│     └─ ResultPage.css
├─ components/
│  └─ ui/
│     ├─ Button.tsx
│     └─ Button.css
├─ features/
│  ├─ camera/
│  │  └─ cameraTypes.ts
│  ├─ pose/
│  │  ├─ poseMetrics.ts
│  │  └─ poseTypes.ts
│  └─ scoring/
│     ├─ calculateScore.ts
│     ├─ scoreConfig.ts
│     ├─ scoreTypes.ts
│     └─ calculateScore.test.ts
├─ shared/
│  └─ types/
│     └─ measurement.ts
├─ styles/
│  ├─ tokens.css
│  └─ globals.css
└─ assets/
```

### UIと内部処理の境界

UIと内部処理は、共有する型を通してデータを受け渡します。例えば、内部処理は次のような結果を返し、UIはその値を表示します。

```ts
// UIへ渡すスコア計算結果。
export type ScoreResult = {
  totalScore: number
  postureScore: number
  stabilityScore: number
  presenceScore: number
  measuredDurationMs: number
}

// MediaPipeの解析値から最終スコアを計算する。
export function calculateScore(): ScoreResult {
  // 実際の計算処理をここに実装する。
  return {
    totalScore: 0,
    postureScore: 0,
    stabilityScore: 0,
    presenceScore: 0,
    measuredDurationMs: 0,
  }
}
```

次の項目は両担当に影響するため、型を変更するPull Requestでは双方のレビューを必要とします。

- 計測開始時の入力
- 計測中の状態
- スコア計算結果
- エラー状態
- 画面遷移条件

### ブランチの分け方

UIと内部処理は、同じ最新の`main`から別々のブランチを作成します。

```text
feature/#UIのIssue番号
feature/#スコア処理のIssue番号
```

- UI担当はページ、共通UI、CSSを中心に変更する
- 内部処理担当は`features/pose/`と`features/scoring/`を中心に変更する
- `App.tsx`は結合担当だけが変更する
- 両担当が同時に`App.tsx`を編集しない
- ディレクトリと共有型を用意する土台PRを先にマージしてから、各担当のブランチへ分かれる

## 開発の流れ

### 1. Issueを作成する

GitHubでIssueを作成し、次の内容を記載します。

- 対応する目的や問題
- 完了条件
- 必要な作業
- 担当者

作成後、Issue番号を確認します。以降の例では`#12`を使用します。

### 2. `main`を最新にする

古い状態からブランチを作らないように、作業開始前に`main`を更新します。

```bash
git switch main
git pull origin main
```

### 3. Issue対応ブランチを作成する

Issue番号を含めたブランチを作成します。

```bash
git switch -c "feature/#12"
```

ブランチ名の`feature`は、作業内容に応じて`fix`、`docs`、`refactor`などへ変更できます。

### 4. 実装してコミットする

変更内容を確認し、必要なファイルだけをコミットします。

```bash
git status
git add -- src/App.tsx src/App.css
git commit -m "feat: #12 タイマー画面を追加"
```

コミットメッセージには次の接頭辞を使用します。

| 接頭辞 | 用途 |
| --- | --- |
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | 動作を変えないコード整理 |
| `docs` | ドキュメント |
| `test` | テスト |
| `chore` | 設定や依存関係など |

コミットメッセージには、可能な限り対応するIssue番号を含めます。

### 5. ブランチをGitHubへpushする

```bash
git push -u origin "feature/#12"
```

2回目以降は、同じブランチ上で`git push`を実行します。

### 6. Pull Requestを作成する

GitHubでPull Requestを作成し、次のように設定します。

- マージ先：`main`
- 比較元：`feature/#12`
- タイトル例：`feat: #12 タイマー画面を追加`
- 本文に関連Issueを記載：`Closes #12`

Pull Requestの本文には次の内容を記載します。

```markdown
## 概要

変更の目的を記載します。

## 関連Issue

Closes #12

## 変更内容

- 主な変更点を記載します。

## 確認方法

- 実行した確認手順を記載します。

## スクリーンショット

画面変更がある場合に添付します。
```

`Closes #12`と記載しておくと、Pull Requestのマージ時にIssueが自動的に閉じられます。

### 7. レビューへ対応する

レビューで修正が必要になった場合は、同じブランチで修正して再度pushします。

```bash
git add -- src/App.tsx src/App.css
git commit -m "fix: #12 レビュー内容を反映"
git push
```

追加したコミットは、作成済みのPull Requestへ自動的に反映されます。

### 8. Pull Requestをマージする

次の条件を満たしていることを確認します。

- レビューが承認されている
- 必要な修正が完了している
- Lintやビルドなどのチェックが成功している
- コンフリクトが発生していない

確認後、GitHub上で`Squash and merge`を使用して`main`へマージします。マージ後はGitHub上の作業ブランチを削除します。

### 9. ローカル環境を更新する

マージ後はローカルの`main`を更新し、不要になった作業ブランチを削除します。

```bash
git switch main
git pull origin main
git branch -d "feature/#12"
git fetch --prune
```

これでIssue対応の一連の作業は完了です。

## コンフリクトが発生した場合

Pull Requestでコンフリクトが表示された場合は、作業ブランチへ最新の`main`を取り込みます。

```bash
git switch "feature/#12"
git fetch origin
git merge origin/main
```

コンフリクトを修正した後、変更をコミットしてpushします。

```bash
git add -- <修正したファイル>
git commit -m "chore: #12 mainとのコンフリクトを解消"
git push
```
