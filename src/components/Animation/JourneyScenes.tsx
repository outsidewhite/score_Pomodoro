import type { RouteArea } from '../../features/trip/types.ts'
import type { JourneyMotionState } from '../../features/trip/getJourneyMotionState.ts'

type JourneySceneProps = {
  area: RouteArea
  motionState: JourneyMotionState
}

// 停止・休憩では移動中の絵を止めるだけでなく、状態に合う専用シーンへ切り替える。
export function JourneyScene({ area, motionState }: JourneySceneProps) {
  if (motionState === 'preparing') return <HomePreparationScene />

  if (motionState === 'idle') {
    if (area === 'world') return <WorldAirportScene />
    if (area === 'space') return <SpaceDriftScene />
    return <JapanConvenienceStoreScene />
  }

  if (motionState === 'break') {
    if (area === 'world') return <WorldAirportLoungeScene />
    if (area === 'space') return <SpacePodRestScene />
    return <JapanHotelRestScene />
  }

  if (area === 'world') {
    return <WorldFlightScene />
  }

  if (area === 'space') {
    return <SpaceVoyageScene />
  }

  return <JapanCarScene />
}

// 準備中：旅に出る前の独立したステージとして、自宅で支度する場面を表示する。
function HomePreparationScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="home-preparing-title home-preparing-description"
    >
      <title id="home-preparing-title">自宅で作業の準備中</title>
      <desc id="home-preparing-description">
        机と椅子のある家で、作業を始める前の静かな白黒の室内シーン
      </desc>
      <rect width="480" height="320" fill="#fff" />
      <path d="M31 286V112L240 34l209 78v174" fill="#fff" stroke="#000" strokeWidth="4" strokeLinejoin="miter" />
      <path d="M12 121 240 35l228 86M70 98V52h61v23" fill="none" stroke="#000" strokeWidth="4" />
      <rect x="64" y="139" width="112" height="90" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M120 139v90M64 184h112" fill="none" stroke="#000" strokeWidth="2" />
      <circle cx="93" cy="162" r="11" fill="none" stroke="#000" strokeWidth="2" />
      <path d="M271 286V143h116v143M271 191h116" fill="#fff" stroke="#000" strokeWidth="4" />
      <circle cx="365" cy="216" r="5" fill="#000" />
      <path d="M190 244h157M207 244v42m124-42v42" fill="none" stroke="#000" strokeWidth="4" />
      <rect x="232" y="197" width="78" height="44" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M271 241v14m-25 0h50" fill="none" stroke="#000" strokeWidth="4" />
      <path d="M177 286v-27h43v27m-35-27v-32h27v32" fill="#fff" stroke="#000" strokeWidth="4" />
      <rect x="197" y="72" width="86" height="41" fill="#000" />
      <text x="240" y="99" fill="#fff" fontSize="17" fontWeight="900" textAnchor="middle" letterSpacing="3">HOME</text>
      <path d="M0 286h480" stroke="#000" strokeWidth="4" />
    </svg>
  )
}

// 日本：街並みを背景に、車で国内を巡る移動を表現する。
function JapanCarScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="japan-scene-title japan-scene-description"
    >
      <title id="japan-scene-title">日本を走る車</title>
      <desc id="japan-scene-description">
        白い背景に黒い線で描かれた車と都市が横へ流れるアニメーション
      </desc>

      <rect width="480" height="320" fill="#fff" />

      <g className="journey-scene__scroll journey-scene__scroll--japan-far" fill="#fff" stroke="#000" strokeWidth="2" opacity="0.32">
        <path d="M0 210V154h38v56h18v-91h39v91h25v-70h52v70h24v-105h34v105h27v-62h61v62h21v-84h43v84h29v-54h69v54Zm480 0v-56h38v56h18v-91h39v91h25v-70h52v70h24v-105h34v105h27v-62h61v62h21v-84h43v84h29v-54h69v54Z" />
      </g>

      <path d="M0 251h480M0 291h480" fill="none" stroke="#000" strokeWidth="4" />
      <path d="M0 271h480" fill="none" stroke="#000" strokeDasharray="18 12" strokeWidth="2" opacity="0.45" />

      <g className="journey-scene__vehicle journey-scene__car" fill="#fff" stroke="#000" strokeWidth="4" strokeLinejoin="miter">
        <path d="M91 235v-25l30-7 34-44h116l54 44h42c13 0 22 9 22 22v10Z" />
        <path d="m171 174-22 29h69v-29Zm64 0v29h63l-36-29Z" />
        <path d="M91 220h298M116 203h20m211 0h19" />
        <circle className="journey-scene__wheel" cx="151" cy="235" r="19" />
        <circle className="journey-scene__wheel" cx="326" cy="235" r="19" />
        <path d="M138 235h26m-13-13v26m162-13h26m-13-13v26" strokeWidth="2" />
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

// 日本の停止中：コンビニの前へ車を停め、移動していないことを場面で示す。
function JapanConvenienceStoreScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="japan-stop-title japan-stop-description"
    >
      <title id="japan-stop-title">日本のコンビニで停車中</title>
      <desc id="japan-stop-description">
        コンビニの前に車を停めている白黒のシーン
      </desc>
      <rect width="480" height="320" fill="#fff" />
      <path d="M0 262h480M0 286h480" fill="none" stroke="#000" strokeWidth="4" />
      <path d="M28 254V92h265v162M28 130h265" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M44 105h233M52 145h92v69H52zm108 0h117v69H160z" fill="none" stroke="#000" strokeWidth="3" />
      <path d="M218 145v69M160 179h117" fill="none" stroke="#000" strokeWidth="2" />
      <rect x="68" y="68" width="183" height="47" fill="#000" />
      <text x="159.5" y="99" fill="#fff" fontSize="22" fontWeight="900" textAnchor="middle" letterSpacing="4">CONVENI</text>
      <rect x="308" y="112" width="82" height="51" fill="#fff" stroke="#000" strokeWidth="4" />
      <text x="349" y="134" fill="#000" fontSize="11" fontWeight="800" textAnchor="middle">OPEN</text>
      <text x="349" y="153" fill="#000" fontSize="17" fontWeight="900" textAnchor="middle">24H</text>
      <g fill="#fff" stroke="#000" strokeWidth="4" strokeLinejoin="miter">
        <path d="M250 258v-22l18-6 22-29h76l34 29h22c11 0 18 8 18 18v10Z" />
        <path d="m302 212-13 18h39v-18Zm38 0v18h38l-20-18Z" />
        <circle cx="291" cy="258" r="15" />
        <circle cx="397" cy="258" r="15" />
      </g>
      <path d="M20 286h440" stroke="#000" strokeDasharray="18 12" strokeWidth="2" opacity="0.4" />
    </svg>
  )
}

// 世界の停止中：空港のゲートで飛行機が待機する場面を表示する。
function WorldAirportScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="world-stop-title world-stop-description"
    >
      <title id="world-stop-title">世界ステージの空港で停止中</title>
      <desc id="world-stop-description">
        空港ターミナルの前で飛行機が駐機している白黒のシーン
      </desc>
      <rect width="480" height="320" fill="#fff" />
      <path d="M0 246h480v74H0Z" fill="#f0f0f0" />
      <path d="M21 238V112h279v126M21 145h279" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M38 163h45v54H38zm63 0h45v54h-45zm63 0h45v54h-45zm63 0h55v54h-55z" fill="none" stroke="#000" strokeWidth="2" />
      <path d="M321 238V91h48v147m-61-126h74l-13-38h-48Z" fill="#fff" stroke="#000" strokeWidth="4" />
      <circle cx="345" cy="103" r="6" fill="#000" />
      <rect x="42" y="78" width="125" height="46" fill="#000" />
      <text x="104.5" y="107" fill="#fff" fontSize="18" fontWeight="900" textAnchor="middle" letterSpacing="3">AIRPORT</text>
      <g fill="#fff" stroke="#000" strokeWidth="4" strokeLinejoin="miter">
        <path d="m112 247 92-13 75-46 18 5-48 50 82 11c14 2 23 10 24 18-58 3-112 1-157-7l-39 28-17-3 22-33-62-6Z" />
        <path d="m221 232-27-39 15-4 47 37Z" />
      </g>
      <path d="M0 285h480" stroke="#000" strokeDasharray="30 18" strokeWidth="3" />
    </svg>
  )
}

// 宇宙の停止中：推進を止めた宇宙船が静かに漂う場面を表示する。
function SpaceDriftScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="space-stop-title space-stop-description"
    >
      <title id="space-stop-title">宇宙空間を漂って停止中</title>
      <desc id="space-stop-description">
        エンジンを止めた宇宙船が星空をゆっくり漂う白黒のシーン
      </desc>
      <rect width="480" height="320" fill="#fff" />
      <g fill="#000" opacity="0.5">
        <circle cx="39" cy="52" r="2" /><circle cx="94" cy="133" r="1.5" />
        <circle cx="151" cy="61" r="1.5" /><circle cx="212" cy="271" r="2" />
        <circle cx="298" cy="42" r="2" /><circle cx="361" cy="253" r="1.5" />
        <circle cx="432" cy="103" r="2" /><circle cx="53" cy="252" r="1.5" />
      </g>
      <path d="m113 112 4 11 11 4-11 4-4 11-4-11-11-4 11-4Zm267 57 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="none" stroke="#000" strokeWidth="2" />
      <g className="journey-scene__drifting-vessel" fill="#fff" stroke="#000" strokeWidth="4" strokeLinejoin="miter">
        <path d="M137 143h101c48 0 86 21 110 39-24 18-62 39-110 39H137l31-39Z" />
        <path d="m194 143 30-42h41l-16 43m-55 77 30 42h41l-16-43" />
        <ellipse cx="282" cy="182" rx="24" ry="16" fill="#000" />
        <path d="M153 149v66" />
      </g>
      <path d="M83 181h35" stroke="#000" strokeDasharray="4 9" strokeWidth="2" opacity="0.35" />
    </svg>
  )
}

// 日本の休憩中：ホテルの客室で横になり、作業から離れている様子を描く。
function JapanHotelRestScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="japan-break-title japan-break-description"
    >
      <title id="japan-break-title">日本のホテルでひと休み</title>
      <desc id="japan-break-description">
        ホテルのベッドで横になって休憩している白黒の室内シーン
      </desc>
      <rect width="480" height="320" fill="#fff" />
      <path d="M0 278h480M36 278V72h408v206" fill="none" stroke="#000" strokeWidth="4" />
      <rect x="62" y="94" width="118" height="93" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M121 94v93M62 141h118" fill="none" stroke="#000" strokeWidth="2" />
      <circle cx="92" cy="117" r="10" fill="none" stroke="#000" strokeWidth="2" />
      <path d="M212 232v-55h202v55M212 211h202M229 177v-28h70v28" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M219 229h202v49H219Z" fill="#fff" stroke="#000" strokeWidth="4" />
      <circle cx="319" cy="171" r="15" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M334 178c31 1 50 12 67 31h-99c1-17 12-28 32-31Z" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M194 117h74M201 135h51" stroke="#000" strokeWidth="3" />
      <g className="journey-scene__rest-mark" fill="#000" fontWeight="900">
        <text x="284" y="129" fontSize="18">Z</text>
        <text x="303" y="111" fontSize="14">Z</text>
        <text x="319" y="96" fontSize="11">Z</text>
      </g>
      <rect x="71" y="233" width="93" height="45" fill="#000" />
      <text x="117.5" y="262" fill="#fff" fontSize="17" fontWeight="900" textAnchor="middle">HOTEL</text>
    </svg>
  )
}

// 世界の休憩中：空港ラウンジで次の移動まで休む場面を表示する。
function WorldAirportLoungeScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="world-break-title world-break-description"
    >
      <title id="world-break-title">世界の空港ラウンジで休憩中</title>
      <desc id="world-break-description">
        大きな窓から飛行機を眺めながら椅子で休憩している白黒のシーン
      </desc>
      <rect width="480" height="320" fill="#fff" />
      <rect x="31" y="54" width="418" height="159" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M170 54v159M310 54v159M31 174h418" fill="none" stroke="#000" strokeWidth="2" />
      <path d="m219 139 48-7 41-25 11 3-26 28 44 6c8 1 13 6 13 10-32 2-62 1-87-4l-22 16-10-2 13-19-35-4Z" fill="#fff" stroke="#000" strokeWidth="3" />
      <path d="M0 270h480" stroke="#000" strokeWidth="4" />
      <path d="M92 270v-55h91l18 55m-95-55v-29h60v29m139 55v-55h91l18 55m-95-55v-29h60v29" fill="#fff" stroke="#000" strokeWidth="4" />
      <rect x="220" y="229" width="42" height="41" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M241 229v-15h22v56" fill="none" stroke="#000" strokeWidth="3" />
      <rect x="46" y="69" width="102" height="35" fill="#000" />
      <text x="97" y="92" fill="#fff" fontSize="14" fontWeight="900" textAnchor="middle">LOUNGE</text>
    </svg>
  )
}

// 宇宙の休憩中：宇宙ポッドの室内で身体を休める場面を表示する。
function SpacePodRestScene() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="space-break-title space-break-description"
    >
      <title id="space-break-title">宇宙ポッド室内で休憩中</title>
      <desc id="space-break-description">
        宇宙ポッドのシートで身体を休めている白黒の室内シーン
      </desc>
      <rect width="480" height="320" fill="#fff" />
      <path d="M35 286V78l48-44h314l48 44v208" fill="#fff" stroke="#000" strokeWidth="4" />
      <circle cx="120" cy="111" r="53" fill="#000" />
      <circle cx="120" cy="111" r="42" fill="#fff" stroke="#fff" strokeWidth="3" />
      <circle cx="101" cy="92" r="2" fill="#000" /><circle cx="135" cy="126" r="2" fill="#000" />
      <path d="m146 83 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="none" stroke="#000" strokeWidth="2" />
      <path d="M222 252v-93h123l42 93Z" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M238 236v-52h91l26 52Z" fill="#f0f0f0" stroke="#000" strokeWidth="3" />
      <circle cx="281" cy="174" r="15" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M295 183c29 4 40 19 45 45h-85c2-25 13-40 40-45Z" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M205 286h198M79 205h94v81H79z" fill="none" stroke="#000" strokeWidth="4" />
      <path d="M94 222h20v16H94zm31 0h34v16h-34zm-31 29h65" fill="none" stroke="#000" strokeWidth="3" />
      <g className="journey-scene__rest-mark" fill="#000" fontWeight="900">
        <text x="318" y="145" fontSize="17">Z</text>
        <text x="337" y="128" fontSize="13">Z</text>
      </g>
      <rect x="184" y="54" width="171" height="37" fill="#000" />
      <text x="269.5" y="78" fill="#fff" fontSize="14" fontWeight="900" textAnchor="middle" letterSpacing="3">REST POD</text>
    </svg>
  )
}
