import { useMemo } from 'react'
import { encode } from 'uqr'

/** The otpauth URI as a QR code, one SVG path; the quiet zone comes from the padding around it. */
export function QrCode({ value, size }: { value: string; size: number }) {
  const { path, n } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 0 })
    let d = ''
    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) d += `M${x} ${y}h1v1h-1z`
      }),
    )
    return { path: d, n: qr.size }
  }, [value])
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="Mã QR">
      <path d={path} fill="#181c1c" />
    </svg>
  )
}
