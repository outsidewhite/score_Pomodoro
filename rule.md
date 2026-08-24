# GitHubを用いた共同開発ルール

メンバーが並行して安全に作業できるように、Issueごとにブランチを作成し、Pull Requestを通して`main`へマージします。

## 基本ルール

- `main`ブランチへ直接コミット・pushしない
- 作業を始める前にIssueを作成する
- 原則として1つのIssueにつき1つのブランチを作成する
- Pull Requestはレビューと動作確認が完了してからマージする
- ブランチ名は`feature/#Issue番号`を基本とする

例：Issue #12に対応する場合

```text
feature/#12
```

バグ修正やドキュメント変更では、変更内容に応じて次の接頭辞を使用しても構いません。

```text
fix/#12
docs/#12
refactor/#12
```

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
