import { cn } from '@/lib/utils'

// Standard Code128 module-width table: each entry is the bar/space widths (bar,space,bar,space,bar,space)
// for symbol values 0-105, plus the 7-width STOP pattern (value 106) — public Code128 specification data.
const CODE128_WIDTHS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

function widthsToBits(widths: string): string {
  let bits = ''
  for (let i = 0; i < widths.length; i++) {
    bits += (i % 2 === 0 ? '1' : '0').repeat(Number(widths[i]))
  }
  return bits
}

const CODE128_PATTERNS: string[] = CODE128_WIDTHS.map(widthsToBits)

const START_B = 104
const STOP = 106

function encodeCode128B(text: string): string {
  const values: number[] = []
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 126) continue
    values.push(code - 32)
  }

  let checksum = START_B
  values.forEach((value, i) => {
    checksum += value * (i + 1)
  })
  checksum %= 103

  const symbolValues = [START_B, ...values, checksum, STOP]
  return symbolValues.map((value) => CODE128_PATTERNS[value]).join('')
}

interface BarRun {
  start: number
  length: number
}

function runsFromBits(bits: string): BarRun[] {
  const runs: BarRun[] = []
  let i = 0
  while (i < bits.length) {
    if (bits[i] === '1') {
      let j = i
      while (j < bits.length && bits[j] === '1') j++
      runs.push({ start: i, length: j - i })
      i = j
    } else {
      i++
    }
  }
  return runs
}

export function Barcode({ callsign, id, className }: { callsign: string; id: number; className?: string }) {
  const text = `${callsign} - ${String(id).padStart(6, '0')}`
  const bits = encodeCode128B(text)
  const runs = runsFromBits(bits)
  const totalModules = bits.length

  return (
    <div className={cn('h-[30px] rounded-[2px] overflow-hidden bg-white', className)}>
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${totalModules} 1`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {runs.map((run) => (
          <rect key={run.start} x={run.start} y={0} width={run.length} height="100%" fill="black" />
        ))}
      </svg>
    </div>
  )
}
