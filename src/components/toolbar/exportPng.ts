/**
 * PNG 出力のロジック。ExportButton.tsx から呼ばれる。
 *
 * Canvas 非依存部分 (prepareExportSvg / buildExportFilename) は
 * テスト可能な純粋関数として export する。
 * Canvas/Blob 依存の exportBoardAsPng はブラウザ手動検証で担保する。
 */

import {
  BOARD_SVG_ID,
  EXPORT_SCALE,
  VIEW_BOX_SIZE,
} from '../../constants/board'

/**
 * export 用 SVG クローンを生成する。Canvas 非依存なのでテスト可能。
 *
 * 1. cloneNode(true) でオリジナルを壊さずコピー
 * 2. data-no-export="true" 要素を除去 (DirectionPicker 等の UI 専用要素)
 * 3. xmlns を明示 (XMLSerializer が省略することがある)
 * 4. width/height を export サイズに固定
 *    (ブラウザは Image 読み込み時に SVG の width/height でラスタライズするため、
 *     Canvas サイズと揃えないと引き伸ばしでぼやける)
 * 5. overflow を除去 (DirectionPicker 用の visible は export では不要)
 */
export function prepareExportSvg(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-no-export="true"]').forEach((el) => el.remove())
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const exportSize = VIEW_BOX_SIZE * EXPORT_SCALE
  clone.setAttribute('width', String(exportSize))
  clone.setAttribute('height', String(exportSize))
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
 * 盤面 SVG を PNG に変換してダウンロードする。
 * ブラウザ API (Canvas/Blob/Image) に依存するため、自動テストは手動検証で代替する。
 */
export async function exportBoardAsPng(): Promise<void> {
  const svg = document.querySelector<SVGSVGElement>(`#${BOARD_SVG_ID}`)
  if (!svg) return

  const clone = prepareExportSvg(svg)
  const svgString = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const blobUrl = URL.createObjectURL(blob)

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvasSize = VIEW_BOX_SIZE * EXPORT_SCALE
        const canvas = document.createElement('canvas')
        canvas.width = canvasSize
        canvas.height = canvasSize
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2d context unavailable'))
          return
        }
        ctx.drawImage(img, 0, 0, canvasSize, canvasSize)
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error('toBlob returned null'))
            return
          }
          const pngUrl = URL.createObjectURL(pngBlob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = buildExportFilename()
          a.click()
          setTimeout(() => URL.revokeObjectURL(pngUrl), 100)
          resolve()
        }, 'image/png')
      }
      img.onerror = () => reject(new Error('SVG image load failed'))
      img.src = blobUrl
    })
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
