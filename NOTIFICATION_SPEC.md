# 通知・効果音仕様

## 1. 目的

アプリで使用するトースト通知の文面、発火条件、表示時間、効果音、操作を一覧で管理します。

実装上の集約元は`src/components/Notification/AppToaster.tsx`です。通知を追加・変更する場合は、呼び出し元へ`sonner`の処理や固定文面を直接記述せず、`AppToaster.tsx`へ通知定義と用途別関数を追加します。

## 2. 共通設定

| 項目 | 現在の設定 | 実装箇所 |
|---|---:|---|
| 通常通知の表示時間 | 6,000ms | `NOTIFICATION_DURATION_MS` |
| 永続表示 | `Infinity` | モデル読み込み中、モデル読み込み失敗、集中力低下 |
| 表示位置 | 右下 | `AppToaster`の`position` |
| 閉じるボタン | 表示する | `AppToaster`の`closeButton` |
| 通知音切替ボタン | 左下 | `.app-toaster__sound-toggle` |
| 通知音の初期状態 | ON | `isNotificationSoundEnabled` |
| 通知音の音量 | 0.35 | `playNotificationSound` |
| 同一通知の音声再生間隔 | 1,000ms以上 | `SAME_NOTIFICATION_SOUND_INTERVAL_MS` |
| 通知音設定の保存先 | Local Storage | `score-pomodoro:notification-sound-enabled` |

通常通知はすべて6秒で閉じます。モデル読み込み中、再読み込み操作が必要なモデル読み込み失敗、休憩操作を促す集中力低下は自動で閉じません。モデル読み込み成功時は同じ通知IDの内容を成功通知へ更新し、その時点から6秒後に閉じます。

## 3. 効果音ファイル

効果音ファイルは`src/components/Notification/`に配置します。

| 効果音キー | ファイル | サイズ | 用途 |
|---|---|---:|---|
| `alarm` | `alarm.mp3` | 28,544 bytes | ユーザーの注意を促すアラーム通知 |
| `success` | `success.mp3` | 12,537 bytes | 成功・完了を知らせる通知 |
| `info` | `info.mp3` | 28,544 bytes | 提案・情報を知らせる通知 |
| `warning` | `warning.mp3` | 35,734 bytes | 警告・エラーを知らせる通知 |

`modelLoading`には効果音を設定していません。読み込み開始時に自動再生制限へ触れることと、処理中の音を不要に繰り返さないためです。

## 4. 通知一覧

### 4.1 モデル読み込み中

| 項目 | 内容 |
|---|---|
| 定義名 | `modelLoading` |
| 公開関数 | `showModelLoadingNotification()` |
| 通知ID | `pose-model-load` |
| 種別 | loading |
| タイトル | モデル読み込み中です |
| 説明 | なし |
| 表示時間 | 永続表示 |
| 効果音 | なし |
| 発火条件 | 姿勢推定モデルの読み込み開始 |
| 更新・終了 | 成功通知または失敗通知で同じIDを更新。計測画面を離れる場合は終了 |

### 4.2 モデル読み込み成功

| 項目 | 内容 |
|---|---|
| 定義名 | `modelReady` |
| 公開関数 | `showModelReadyNotification()` |
| 通知ID | `pose-model-load` |
| 種別 | success |
| タイトル | 読み込みに成功しました！ |
| 説明 | なし |
| 表示時間 | 6,000ms |
| 効果音 | `success` |
| 発火条件 | 姿勢推定モデルの読み込み完了 |
| 更新・終了 | 読み込み中または読み込み失敗の通知を同じIDで更新し、自動終了 |

### 4.3 モデル読み込み失敗

| 項目 | 内容 |
|---|---|
| 定義名 | `modelLoadError` |
| 公開関数 | `showModelLoadErrorNotification(message, onReload)` |
| 通知ID | `pose-model-load` |
| 種別 | error |
| タイトル | モデルの読み込みに失敗しました |
| 説明 | 呼び出し元から渡されたエラー詳細 |
| 表示時間 | 永続表示 |
| 効果音 | `warning` |
| 操作 | 「再読み込み」。選択時に`onReload`を実行 |
| 発火条件 | 姿勢推定モデルを読み込めない |
| 更新・終了 | 再読み込み開始、読み込み成功、または計測画面の終了で更新・終了 |

### 4.4 姿勢解析エラー

| 項目 | 内容 |
|---|---|
| 定義名 | `analysisError` |
| 公開関数 | `showAnalysisErrorNotification(message)` |
| 通知ID | `pose-analysis-error` |
| 種別 | error |
| タイトル | 姿勢解析でエラーが発生しました |
| 説明 | 呼び出し元から渡されたエラー詳細 |
| 表示時間 | 6,000ms |
| 効果音 | `warning` |
| 発火条件 | 計測中の姿勢解析でエラーが発生 |
| 更新・終了 | 同じIDで最新のエラーへ更新。モデル準備完了、タイマーモード変更、または計測画面の終了で終了 |

### 4.5 離席検出

| 項目 | 内容 |
|---|---|
| 定義名 | `awayDetected` |
| 公開関数 | `showAwayDetectedNotification()` |
| 通知ID | `auto-away` |
| 種別 | warning |
| タイトル | 離席を検出したためタイマーを停止しました |
| 説明 | なし |
| 表示時間 | 6,000ms |
| 効果音 | `warning` |
| 発火条件 | 姿勢解析が離席を検出し、タイマーを自動停止 |
| 更新・終了 | 自動終了。同じIDの再通知は既存通知を更新 |

### 4.6 基準姿勢の取得失敗

| 項目 | 内容 |
|---|---|
| 定義名 | `calibrationRetry` |
| 公開関数 | `showCalibrationRetryNotification()` |
| 通知ID | `posture-calibration` |
| 種別 | warning |
| タイトル | 基準姿勢を取得できなかったため、次の1分で再試行します |
| 説明 | なし |
| 表示時間 | 6,000ms |
| 効果音 | なし |
| 発火条件 | 基準姿勢を取得する採点区間が失敗 |
| 更新・終了 | 次の取得結果で同じIDを更新、または自動終了 |

### 4.7 基準姿勢の保存成功

| 項目 | 内容 |
|---|---|
| 定義名 | `calibrationSuccess` |
| 公開関数 | `showCalibrationSuccessNotification()` |
| 通知ID | `posture-calibration` |
| 種別 | success |
| タイトル | 基準姿勢を保存しました |
| 説明 | なし |
| 表示時間 | 6,000ms |
| 効果音 | なし |
| 発火条件 | 基準姿勢の取得・保存に成功 |
| 更新・終了 | 取得失敗通知があれば同じIDで更新し、自動終了 |

### 4.8 集中力低下

| 項目 | 内容 |
|---|---|
| 定義名 | `focusDrop` |
| 公開関数 | `showFocusDropNotification(onBreakRequest)` |
| 通知ID | `focus-drop` |
| 種別 | info |
| タイトル | 集中力が落ちてきているようです。休憩を検討しましょう |
| 説明 | なし |
| 表示時間 | 永続表示 |
| 効果音 | `alarm` |
| 操作 | 「休憩する」。選択時に`onBreakRequest`を実行 |
| 発火条件 | 集中力低下の判定条件を満たす |
| 更新・終了 | 「休憩する」の選択、休憩・離席などで集中状態を抜けた場合に終了 |

### 4.9 カメラ切断・映像停止

| 項目 | 内容 |
|---|---|
| 定義名 | `cameraDisconnected` |
| 公開関数 | `showCameraDisconnectedNotification()` |
| 通知ID | `camera-disconnected` |
| 種別 | error |
| タイトル | カメラが切断されました |
| 説明 | カメラが切断されました。接続を確認して、カメラを再取得してください。 |
| 表示時間 | 6,000ms |
| 効果音 | `warning` |
| 発火条件 | カメラトラックの終了、または映像フリーズを検出 |
| 更新・終了 | 新しいカメラストリームの監視開始時に終了。それ以外は自動終了 |

### 4.10 目標時間の達成

| 項目 | 内容 |
|---|---|
| 定義名 | `targetReached` |
| 公開関数 | `showTargetReachedNotification()` |
| 通知ID | `target-time-reached` |
| 種別 | success |
| タイトル | 目標時間を達成しました！ |
| 説明 | なし |
| 表示時間 | 6,000ms |
| 効果音 | `success` |
| 発火条件 | 集中時間と休憩時間の合計が設定した目標時間へ初めて到達 |
| 更新・終了 | 同一セッションで1回だけ表示し、自動終了。達成後の再読み込みでは再通知しない |

### 4.11 休憩終了1分前

| 項目 | 内容 |
|---|---|
| 定義名 | `breakEndingSoon` |
| 公開関数 | `showBreakEndingSoonNotification()` |
| 通知ID | `break-ending-soon` |
| 種別 | info |
| タイトル | 休憩終了まであと1分です |
| 説明 | なし |
| 表示時間 | 6,000ms |
| 効果音 | `alarm` |
| 発火条件 | 10分休憩の実測時間が9分へ到達 |
| 更新・終了 | 同じ休憩中は停止・再開を挟んでも1回だけ表示し、自動終了。新しい休憩では再び通知する |

## 5. 効果音割り当て一覧

効果音を調整する場合は、まず次の表で全通知のバランスを確認します。

| 通知 | 現在の効果音 | 現在の音源 |
|---|---|---|
| モデル読み込み中 | なし | なし |
| モデル読み込み成功 | `success` | `success.mp3` |
| モデル読み込み失敗 | `warning` | `warning.mp3` |
| 姿勢解析エラー | `warning` | `warning.mp3` |
| 離席検出 | `warning` | `warning.mp3` |
| 基準姿勢の取得失敗 | なし | なし |
| 基準姿勢の保存成功 | なし | なし |
| 集中力低下 | `alarm` | `alarm.mp3` |
| カメラ切断・映像停止 | `warning` | `warning.mp3` |
| 目標時間の達成 | `success` | `success.mp3` |
| 休憩終了1分前 | `alarm` | `alarm.mp3` |
| 通知音をONにした際の試聴 | `info` | `info.mp3` |

## 6. 効果音を変更する手順

1. 使用する音声ファイルを`src/components/Notification/`へ配置する。
2. `AppToaster.tsx`で音声ファイルをimportする。
3. `NOTIFICATION_SOUND_URLS`の`alarm`、`success`、`info`、`warning`へ使用するファイルを割り当てる。
4. 通知単位で種類を変える場合は、`NOTIFICATIONS`内の対象通知の`sound`を変更する。
5. 音量を変える場合は`playNotificationSound`内の`audio.volume`を0から1の範囲で変更する。
6. 同じ通知が連続した際の間隔を変える場合は`SAME_NOTIFICATION_SOUND_INTERVAL_MS`を変更する。
7. 通知音のON/OFF、同一IDの多重再生防止、音声再生失敗時のテストを実行する。

音源ファイルを差し替えても、通知の文面・ID・発火条件は変更しません。通知ごとに別の音を割り当てる必要がある場合は、`NotificationSound`へ新しいキーを追加し、`NOTIFICATION_SOUND_URLS`と対象通知の`sound`を同時に更新します。

## 7. 呼び出し元

| 呼び出し元 | 使用する通知 |
|---|---|
| `src/pages/measurement/MeasurementPage.tsx` | モデル読み込み中・成功・失敗、姿勢解析エラー、離席検出、基準姿勢の取得失敗・保存成功、映像停止、目標時間の達成、休憩終了1分前 |
| `src/features/camera/useCameraDisconnect.ts` | カメラ切断、カメラ切断通知の終了 |
| `src/features/scoring/useFocusDropNotification.ts` | 集中力低下、集中力低下通知の終了 |

呼び出し元では`sonner`を直接importしません。通知文面、通知ID、表示時間、効果音は`AppToaster.tsx`だけで管理します。

## 8. 動作上の注意

- ブラウザの自動再生制限により、ユーザー操作前の通知音が再生されない場合があります。
- 音声再生に失敗しても、トースト表示、タイマー、採点処理は継続します。
- 同じ通知IDが1秒以内に更新された場合、表示内容は更新しますが効果音は重ねて再生しません。
- 通知音をONへ切り替えた際は、設定確認のため`info`の音を1回再生します。
- 音をOFFにしても、通知は画面表示と`aria-live`による読み上げで伝えます。

## 9. 変更時の確認項目

- [ ] 全通知の文面と効果音割り当てがこの仕様書と一致している
- [ ] 通常通知が6秒で終了する
- [ ] 永続表示する通知が必要な条件でのみ使用されている
- [ ] 同一通知の更新で効果音が多重再生されない
- [ ] 通知音OFF時に音声を再生しない
- [ ] 通知音設定が再読み込み後も維持される
- [ ] 音声再生失敗がアプリ処理へ影響しない
- [ ] 呼び出し元に`sonner`、固定文面、通知IDが分散していない
- [ ] `npm test`、`npm run lint`、`npm run build`が成功する
