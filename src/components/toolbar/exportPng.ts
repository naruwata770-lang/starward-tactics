/**
 * PNG 出力のロジック。ExportButton.tsx から呼ばれる。
 *
 * Canvas 非依存部分 (prepareExportSvg / buildExportFilename) は
 * テスト可能な純粋関数として export する。
 * Canvas/Blob 依存の exportBoardAsPng はブラウザ手動検証で担保する。
 *
 * Issue #60: PNG に TeamCostBar を含めるため canvas 合成方式を採用。
 * 盤面 SVG とバー SVG を別々に Image() 化してから、縦積みの 1 枚 canvas に
 * drawImage する。viewBox 拡張案 (盤面 SVG 側を高くする) は、既存の座標
 * クランプ範囲や Layout のサイズ制約を同時に崩すため採用しなかった
 * (セカンドオピニオン[共通中] 反映)。
 */

import {
  BOARD_SVG_ID,
  EXPORT_SCALE,
  TEAM_COST_BAR_SVG_ID,
  TEAM_COST_BAR_VIEW_BOX_HEIGHT,
  TEAM_COST_BAR_VIEW_BOX_WIDTH,
  VIEW_BOX_SIZE,
} from '../../constants/board'

/**
 * export 用 SVG クローンを生成する。Canvas 非依存なのでテスト可能。
 *
 * 1. cloneNode(true) でオリジナルを壊さずコピー
 * 2. data-no-export="true" 要素を除去 (DirectionPicker 等の UI 専用要素)
 * 3. xmlns を明示 (XMLSerializer が省略することがある)
 * 4. width/height を指定サイズに固定
 *    (ブラウザは Image 読み込み時に SVG の width/height でラスタライズするため、
 *     Canvas サイズと揃えないと引き伸ばしでぼやける)
 * 5. overflow を除去 (DirectionPicker 用の visible は export では不要)
 *
 * Issue #60: 第 2 / 第 3 引数で出力サイズを指定できるよう拡張。
 * 既定は正方形 (VIEW_BOX_SIZE * EXPORT_SCALE) で既存 Board 互換。
 */
export function prepareExportSvg(
  svg: SVGSVGElement,
  width: number = VIEW_BOX_SIZE * EXPORT_SCALE,
  height: number = VIEW_BOX_SIZE * EXPORT_SCALE,
): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-no-export="true"]').forEach((el) => el.remove())
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('overflow')
  return clone
}

/**
 * ダウンロード用ファイル名を生成する。テストでは now を注入して日時を固定できる。
 */
export function buildExportFilename(now: Date = new Date()): string {
  const y = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  return `starward-tactics_${y}-${mo}-${d}_${h}${mi}.png`
}

/**
 * SVG 要素を PNG 用 Image に変換する内部ヘルパ。
 * 変換後の Blob URL は呼び出し側で revoke 責任を負うよう Promise に含めて返す。
 */
function svgToImage(
  svg: SVGSVGElement,
  width: number,
  height: number,
): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  const clone = prepareExportSvg(svg, width, height)
  const svgString = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const blobUrl = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ image: img, revoke: () => URL.revokeObjectURL(blobUrl) })
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('SVG image load failed'))
    }
    img.src = blobUrl
  })
}

/**
 * 盤面 SVG と TeamCostBar SVG を縦積みで PNG に合成してダウンロードする。
 * ブラウザ API (Canvas/Blob/Image) に依存するため、自動テストは手動検証で代替する。
 */
export async function exportBoardAsPng(): Promise<void> {
  const boardSvg = document.querySelector<SVGSVGElement>(`#${BOARD_SVG_ID}`)
  if (!boardSvg) return
  const barSvg = document.querySelector<SVGSVGElement>(`#${TEAM_COST_BAR_SVG_ID}`)

  const boardSize = VIEW_BOX_SIZE * EXPORT_SCALE
  const barWidth = TEAM_COST_BAR_VIEW_BOX_WIDTH * EXPORT_SCALE
  const barHeight = TEAM_COST_BAR_VIEW_BOX_HEIGHT * EXPORT_SCALE

  // バー SVG が DOM にあるときだけ合成する (欠落しても盤面だけは PNG 化できる)
  const barLoader = barSvg
    ? svgToImage(barSvg, barWidth, barHeight)
    : Promise.resolve(null)
  const [board, bar] = await Promise.all([
    svgToImage(boardSvg, boardSize, boardSize),
    barLoader,
  ])

  try {
    const canvasWidth = boardSize
    const canvasHeight = boardSize + (bar ? barHeight : 0)
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2d context unavailable')

    let cursorY = 0
    if (bar) {
      ctx.drawImage(bar.image, 0, cursorY, canvasWidth, barHeight)
      cursorY += barHeight
    }
    ctx.drawImage(board.image, 0, cursorY, canvasWidth, boardSize)

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    if (!pngBlob) throw new Error('toBlob returned null')
    const pngUrl = URL.createObjectURL(pngBlob)
    try {
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = buildExportFilename()
      a.click()
    } finally {
      setTimeout(() => URL.revokeObjectURL(pngUrl), 100)
    }
  } finally {
    board.revoke()
    bar?.revoke()
  }
}
