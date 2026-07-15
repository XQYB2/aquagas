import { cn } from '@/lib/utils'

// ── Status Badges ───────────────────────────────────────────────────

type ProviderStatus = 'pending' | 'active' | 'suspended'
type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
type CustomerStatus = 'active' | 'suspended'

const PROVIDER_STATUS: Record<ProviderStatus, string> = {
  pending:   'bg-amber-50 text-amber-700 border border-amber-200',
  active:    'bg-green-50 text-green-700 border border-green-200',
  suspended: 'bg-red-50 text-red-600 border border-red-200',
}
const PROVIDER_LABEL: Record<ProviderStatus, string> = {
  pending: 'Pending', active: 'Active', suspended: 'Suspended',
}

export function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', PROVIDER_STATUS[status])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'active' ? 'bg-green-500' : status === 'pending' ? 'bg-amber-500' : 'bg-red-400')} />
      {PROVIDER_LABEL[status]}
    </span>
  )
}

const ORDER_STATUS: Record<OrderStatus, string> = {
  placed:           'bg-blue-50 text-blue-700',
  confirmed:        'bg-indigo-50 text-indigo-700',
  preparing:        'bg-yellow-50 text-yellow-700',
  out_for_delivery: 'bg-orange-50 text-orange-700',
  delivered:        'bg-green-50 text-green-700',
  cancelled:        'bg-red-50 text-red-600',
}
const ORDER_LABEL: Record<OrderStatus, string> = {
  placed: 'New', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'On the Way', delivered: 'Delivered', cancelled: 'Cancelled',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', ORDER_STATUS[status])}>
      {ORDER_LABEL[status]}
    </span>
  )
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
      {status === 'active' ? 'Active' : 'Suspended'}
    </span>
  )
}

// ── Stat Card ───────────────────────────────────────────────────────

export function StatCard({
  label, value, icon, sub, subColor = 'text-gray-400', accent = 'bg-indigo-50',
}: {
  label: string; value: string | number; icon: React.ReactNode
  sub?: string; subColor?: string; accent?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', accent)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      {sub && <p className={cn('text-xs font-semibold mt-1', subColor)}>{sub}</p>}
    </div>
  )
}

// ── Section Header ──────────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {action}
    </div>
  )
}

// ── Simple Bar Chart (pure CSS/SVG) ────────────────────────────────

export function BarChart({
  data, valueKey, labelKey, color = '#6366f1', height = 120,
}: {
  data: Record<string, number | string>[]
  valueKey: string; labelKey: string; color?: string; height?: number
}) {
  const values = data.map(d => Number(d[valueKey]))
  const max = Math.max(...values, 1)

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey])
        const barH = Math.max((val / max) * (height - 20), val > 0 ? 4 : 1)
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
            <div className="relative w-full flex justify-center">
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
              >
                {typeof d[valueKey] === 'number' && (d[valueKey] as number) > 1000
                  ? `₱${(d[valueKey] as number).toLocaleString()}`
                  : d[valueKey]}
              </div>
            </div>
            <div
              className="w-full rounded-t-md transition-all duration-300 hover:opacity-80 cursor-default"
              style={{ height: barH, backgroundColor: color }}
            />
            <span className="text-[9px] text-gray-400 text-center leading-tight truncate w-full px-0.5">
              {String(d[labelKey]).split(' ')[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut Chart (SVG) ────────────────────────────────────────────────

export function DonutChart({
  segments, size = 100,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <div style={{ width: size, height: size }} className="flex items-center justify-center text-gray-300 text-xs">No data</div>

  const r = 38; const cx = 50; const cy = 50
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dash = pct * circumference
          const gap = circumference - dash
          const strokeDashoffset = circumference - offset * circumference
          offset += pct
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={strokeDashoffset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          )
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-gray-900" fontSize="14" fontWeight="bold">
          {total}
        </text>
        <text x="50" y="63" textAnchor="middle" fontSize="7" fill="#9ca3af">total</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-semibold text-gray-900 ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Export CSV helper ────────────────────────────────────────────────

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
