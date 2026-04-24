import { createQrModules } from '@/utils/qrLegacy'
import { useEffect, useMemo, useRef } from 'react'

export interface QrCodeProps {
  value: string
  size?: number
  bgColor?: string
  fgColor?: string
  includeMargin?: boolean
  renderAs?: 'svg' | 'canvas'
}

function modulesToPath(modules: boolean[][], margin: number) {
  let path = ''
  for (let r = 0; r < modules.length; r++) {
    for (let c = 0; c < modules.length; c++) {
      if (!modules[r][c]) continue
      const x = c + margin
      const y = r + margin
      path += `M${x} ${y}h1v1H${x}z `
    }
  }
  return path.trim()
}

export default function QrCode({
  value,
  size = 250,
  bgColor = '#FFFFFF',
  fgColor = '#000',
  includeMargin = true,
  renderAs = 'svg',
}: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const modules = useMemo(() => createQrModules(value), [value])
  const margin = includeMargin ? 4 : 0
  const viewSize = modules.length + margin * 2
  const path = useMemo(() => modulesToPath(modules, margin), [modules, margin])

  useEffect(() => {
    if (renderAs !== 'canvas') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size
    canvas.height = size

    const scale = size / viewSize
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.imageSmoothingEnabled = false

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, viewSize, viewSize)

    ctx.fillStyle = fgColor
    for (let r = 0; r < modules.length; r++) {
      for (let c = 0; c < modules.length; c++) {
        if (!modules[r][c]) continue
        ctx.fillRect(c + margin, r + margin, 1, 1)
      }
    }
  }, [bgColor, fgColor, margin, modules, renderAs, size, viewSize])

  if (renderAs === 'canvas') {
    return <canvas ref={canvasRef} width={size} height={size} role="img" aria-label="QR Code" />
  }

  return (
    <svg
      shapeRendering="crispEdges"
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      role="img"
      aria-label="QR Code"
    >
      <path fill={bgColor} d={`M0,0 h${viewSize}v${viewSize}H0z`} />
      <path fill={fgColor} d={path} />
    </svg>
  )
}
