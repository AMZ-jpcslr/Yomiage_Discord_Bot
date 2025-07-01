# P2P緊急地震速報の地図表示改善

## 変更内容

### 問題
P2P緊急地震速報（code: 551）で受信した地震情報の地図画像が震源地のみを表示し、周囲の震度分布が表示されていませんでした。また、地図上に各地の震度数字も表示されていませんでした。

### 解決方法
P2P地震情報をJMA互換形式に変換する際に、P2Pの`areas`配列から地域ごとの震度情報を抽出し、JMAの震度観測データ構造（`Body.Intensity.Observation.Pref`）に変換するよう`convertP2PtoJMAFormat`関数を改善しました。さらに、座標推定機能を追加して各地域の震度数字が地図上に表示されるようにしました。

### 主な変更点

1. **P2P areasデータの処理追加**
   - P2Pの`areas`配列から地域名と震度情報（`scaleFrom`、`scaleTo`）を抽出
   - 各地域の最大震度を計算し、JMA形式の震度文字列に変換

2. **座標推定機能の追加**
   - `estimateP2PAreaCoordinates`関数を追加
   - P2P地域名から緯度経度を推定（都道府県、地方、海域など約80箇所に対応）
   - 座標情報がない場合でも地図上に震度分布を表示可能

3. **JMA互換データ構造の生成**
   - P2Pの地域震度データをJMAの`Pref` → `Area` → `City` → `IntensityStation`構造に変換
   - 座標情報を`latlon`フィールドに格納

### 技術的詳細

#### 変更ファイル
- `src/utils/earthquake.ts`
  - `convertP2PtoJMAFormat`関数: P2P areas配列の処理ロジック追加
  - `estimateP2PAreaCoordinates`関数: 新規追加（地域名から座標推定）

#### データフロー
1. P2P WebSocketから緊急地震速報データ受信
2. `processP2PEarthquakeAlert`関数でP2Pデータを処理
3. `convertP2PtoJMAFormat`でJMA互換形式に変換（新しいareas処理ロジック）
4. `extractEarthquakeMapData`で地図データ抽出（既存の/get_eqと同じロジック）
5. `generateEarthquakeMap`で地図画像生成（震源+周囲震度）

### 結果
- P2P緊急地震速報でも/get_eqコマンドと同様に震源地周囲の震度分布が地図上に表示される
- 地域名から座標を推定することで、座標情報がないP2Pデータでも適切な位置に震度マーカーを配置
- 既存の地図生成ロジックをそのまま活用し、一貫した地図表示を実現

### テスト
`test_p2p_areas.ts`でP2P areas配列の変換テストを作成。実際のP2P緊急地震速報データ形式に基づいたモックデータで動作を検証。

### 対応地域
都道府県、地方名、主要海域（トカラ列島、奄美大島、三陸沖など）約80箇所の座標データベースを構築し、P2P地震情報でよく見られる地域名に対応。
