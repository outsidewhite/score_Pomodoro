import type { RouteArea } from '../../features/trip/types.ts'

type JourneySceneProps = {
  area: RouteArea
}

// ステージごとのSVGを切り替え、白黒の共通トーンで旅を表示する。
export function JourneyScene({ area }: JourneySceneProps) {
  if (area === 'world') {
    return <WorldFlightScene />
  }

  if (area === 'space') {
    return <SpaceVoyageScene />
  }

  return <JapanTrainScene />
}

// 日本：構造物を直線的に描き、工業製品のような電車の移動を表現する。
function JapanTrainScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="japan-scene-title japan-scene-description"
    >
      <title id="japan-scene-title">日本を走る電車</title>
      <desc id="japan-scene-description">
        白い背景に黒い線で描かれた電車と都市が横へ流れるアニメーション
      </desc>

      <rect width="480" height="320" fill="#fff" />

      <g className="journey-scene__scroll journey-scene__scroll--japan-far" fill="#fff" stroke="#000" strokeWidth="2" opacity="0.32">
        <path d="M0 210V154h38v56h18v-91h39v91h25v-70h52v70h24v-105h34v105h27v-62h61v62h21v-84h43v84h29v-54h69v54Zm480 0v-56h38v56h18v-91h39v91h25v-70h52v70h24v-105h34v105h27v-62h61v62h21v-84h43v84h29v-54h69v54Z" />
      </g>

      <path d="M0 245h480M0 285h480" fill="none" stroke="#000" strokeWidth="4" />
      <path d="M0 265h480" fill="none" stroke="#000" strokeDasharray="18 12" strokeWidth="2" opacity="0.45" />

      <g className="journey-scene__vehicle journey-scene__train" fill="#fff" stroke="#000" strokeWidth="4" strokeLinejoin="miter">
        <path d="M116 234V161h236c15 0 26 9 32 23l12 28v22Z" />
        <path d="M139 178h47v31h-47zm62 0h47v31h-47zm62 0h47v31h-47zm62 0h35l13 31h-48Z" />
        <path d="M116 217h280" />
        <circle className="journey-scene__wheel" cx="165" cy="239" r="15" />
        <circle className="journey-scene__wheel" cx="342" cy="239" r="15" />
        <path d="M150 239h30m-15-15v30m162-15h30m-15-15v30" strokeWidth="2" />
      </g>

    </svg>
  )
}

// 世界：計器のようなガイド線と輪郭だけの都市で、飛行経路を表現する。
function WorldFlightScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="world-scene-title world-scene-description"
    >
      <title id="world-scene-title">世界を巡る飛行機</title>
      <desc id="world-scene-description">
        白い背景に黒い線で描かれた飛行機と都市が横へ流れるアニメーション
      </desc>

      <rect width="480" height="320" fill="#fff" />

      <g className="journey-scene__scroll journey-scene__scroll--world-far" fill="none" stroke="#000" strokeWidth="2" opacity="0.32">
        <path d="M4 101h77c0-15-17-26-33-18-8-26-47-25-54 2-13-2-25 5-25 16Zm194 57h96c0-19-21-32-42-22-10-32-58-31-67 2-16-2-30 7-30 20Zm286-57h77c0-15-17-26-33-18-8-26-47-25-54 2-13-2-25 5-25 16Zm194 57h96c0-19-21-32-42-22-10-32-58-31-67 2-16-2-30 7-30 20Z" />
      </g>

      <g className="journey-scene__scroll journey-scene__scroll--world-city" fill="#fff" stroke="#000" strokeWidth="2">
        <path d="M0 286v-49h26v-34h31v83h20v-61h43v61h21v-94h23v94h26v-46h49v46h19v-70h38v70h24v-53h44v53h29v-82h27v82h30v-39h50v59Zm480 0v-49h26v-34h31v83h20v-61h43v61h21v-94h23v94h26v-46h49v46h19v-70h38v70h24v-53h44v53h29v-82h27v82h30v-39h50v59Z" />
      </g>

      <path className="journey-scene__contrail" d="M18 171h180" fill="none" stroke="#000" strokeDasharray="18 12" strokeWidth="3" opacity="0.28" />

      <g className="journey-scene__vehicle journey-scene__plane" fill="#fff" stroke="#000" strokeWidth="4" strokeLinejoin="miter">
        <path d="m166 166 79-11 65-44 19 5-43 48 68 13c12 2 20 10 20 18-51 1-94-2-130-8l-37 34-18-3 20-39-53-9Z" />
        <path d="m262 153-25-47 15-4 42 44Zm-53 26-28-31 14-4 51 26Z" />
        <circle cx="335" cy="185" r="4" fill="#000" stroke="none" />
      </g>

    </svg>
  )
}

// 宇宙：黒い軌道線と幾何学形状だけで、無機質な巡航画面を表現する。
function SpaceVoyageScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="space-scene-title space-scene-description"
    >
      <title id="space-scene-title">宇宙を進む宇宙船</title>
      <desc id="space-scene-description">
        白い背景に黒い線で描かれた宇宙船と天体が横へ流れるアニメーション
      </desc>

      <rect width="480" height="320" fill="#fff" />

      <g className="journey-scene__scroll journey-scene__scroll--space-far" fill="#000" opacity="0.42">
        <circle cx="32" cy="73" r="2" /><circle cx="91" cy="247" r="2" /><circle cx="148" cy="40" r="1.5" />
        <circle cx="209" cy="274" r="1.5" /><circle cx="275" cy="83" r="2" /><circle cx="356" cy="232" r="1.5" />
        <circle cx="427" cy="49" r="2" /><circle cx="512" cy="73" r="2" /><circle cx="571" cy="247" r="2" />
        <circle cx="628" cy="40" r="1.5" /><circle cx="689" cy="274" r="1.5" /><circle cx="755" cy="83" r="2" />
        <circle cx="836" cy="232" r="1.5" /><circle cx="907" cy="49" r="2" />
      </g>

      <g className="journey-scene__scroll journey-scene__scroll--space-mid" fill="none" stroke="#000" strokeWidth="2">
        <path d="m61 116 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm142 104 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm181-151 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm157 47 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm142 104 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm181-151 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
      </g>

      <g className="journey-scene__scroll journey-scene__scroll--space-planet" fill="#fff" stroke="#000">
        <circle cx="441" cy="209" r="63" strokeWidth="4" />
        <ellipse cx="441" cy="209" rx="91" ry="20" fill="none" strokeWidth="4" transform="rotate(-13 441 209)" />
        <circle cx="921" cy="209" r="63" strokeWidth="4" />
        <ellipse cx="921" cy="209" rx="91" ry="20" fill="none" strokeWidth="4" transform="rotate(-13 921 209)" />
      </g>

      <g className="journey-scene__vehicle journey-scene__spaceship" stroke="#000" strokeWidth="4" strokeLinejoin="miter">
        <path className="journey-scene__flame journey-scene__flame--outer" d="M159 171 104 151v40Z" fill="#fff" />
        <path className="journey-scene__flame journey-scene__flame--inner" d="m159 171-34-10v20Z" fill="#000" />
        <path d="M151 137h91c43 0 80 19 105 34-25 15-62 35-105 35h-91l27-35Z" fill="#fff" />
        <path d="m204 137 28-36h39l-15 37m-52 68 28 36h39l-15-37" fill="#fff" />
        <ellipse cx="285" cy="171" rx="24" ry="16" fill="#000" />
        <path d="M168 141v60" />
      </g>

    </svg>
  )
}
