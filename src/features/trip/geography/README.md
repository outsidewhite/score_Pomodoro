地形データは Natural Earth v5.1.2（パブリックドメイン）を使用。

- 日本: https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_50m_admin_0_countries.geojson の ADM0_A3=JPN
- 世界: https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_land.geojson
- 利用条件: https://www.naturalearthdata.com/about/terms-of-use/

Polygon / MultiPolygon のリングを抽出し、経度・緯度を小数点以下4桁に丸めて保存。描画時に目的地と同じ投影を適用する。境界や道路の案内を目的としない。
地点座標は都市中心部の代表位置。北海道は札幌、フロリダは宇宙への出発地であるケープ・カナベラルで表示する。位置が定義されていない「スタート」は地図に仮の座標を置かない。
