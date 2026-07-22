type OrderStatus = 'placed' | 'confirmed' | 'awaiting_pickup' | 'picked_up' | 'being_prepared' | 'out_for_delivery' | 'delivered' | 'cancelled'
type ServiceType = 'water' | 'lpg' | 'both'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_payment:  { label: 'Awaiting Payment',   color: 'bg-yellow-50 text-yellow-700' },
  placed:           { label: 'Order Placed',        color: 'bg-blue-50 text-blue-700' },
  confirmed:        { label: 'Confirmed',           color: 'bg-indigo-50 text-indigo-700' },
  awaiting_pickup:  { label: 'Put Gallons Outside', color: 'bg-purple-50 text-purple-700' },
  picked_up:        { label: 'Gallons Picked Up',   color: 'bg-cyan-50 text-cyan-700' },
  being_prepared:   { label: 'Being Prepared',      color: 'bg-yellow-50 text-yellow-700' },
  out_for_delivery: { label: 'Out for Delivery',    color: 'bg-orange-50 text-orange-700' },
  delivered:        { label: 'Delivered',           color: 'bg-green-50 text-green-700' },
  cancelled:        { label: 'Cancelled',           color: 'bg-red-50 text-red-600' },
  preparing:        { label: 'Being Prepared',      color: 'bg-yellow-50 text-yellow-700' },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, color } = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-50 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

export function StatusStepper({
  status,
  estimatedDelivery,
  serviceType,
}: {
  status: OrderStatus
  estimatedDelivery?: string | null
  serviceType?: ServiceType | null
}) {
  const isLpg = serviceType === 'lpg'

  const steps: { key: OrderStatus; label: string; hint?: string }[] = [
    { key: 'placed',           label: 'Order Placed' },
    { key: 'confirmed',        label: 'Confirmed' },
    {
      key: 'awaiting_pickup',
      label: isLpg ? 'Place Empty Cylinder Outside' : 'Put Gallons Outside',
      hint: isLpg
        ? 'Please place your empty LPG cylinder outside your home so our rider can pick it up.'
        : 'Please place your empty gallons outside your home for pickup.',
    },
    {
      key: 'picked_up',
      label: isLpg ? 'Cylinder Picked Up' : 'Gallons Picked Up',
    },
    { key: 'being_prepared',   label: isLpg ? 'Refilling Your LPG' : 'Being Prepared' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered',        label: 'Delivered' },
  ]

  const stepOrder = steps.map(s => s.key)

  // normalize legacy 'preparing' → 'being_prepared'
  const resolved = ((status as string) === 'preparing' ? 'being_prepared' : status) as OrderStatus
  const currentIdx = stepOrder.indexOf(resolved)
  const isCancelled = status === 'cancelled'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-4">
        <span className="text-red-500 font-semibold text-sm">This order was cancelled.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {estimatedDelivery && (
        <div className="mb-4 bg-water-50 border border-water-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-lg">🕐</span>
          <div>
            <p className="text-xs text-water-600 font-semibold uppercase tracking-wide">Estimated Delivery</p>
            <p className="text-sm text-water-800 font-medium">{estimatedDelivery}</p>
          </div>
        </div>
      )}
      {steps.map((step, idx) => {
        const isLastStep = idx === steps.length - 1
        const done = isLastStep ? idx === currentIdx : idx < currentIdx
        const active = idx === currentIdx

        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                done   ? 'bg-water-500 border-water-500 text-white' :
                active ? 'bg-white border-water-500 text-water-600' :
                         'bg-white border-gray-200 text-gray-300'
              }`}>
                {done ? '✓' : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-0.5 h-8 ${done ? 'bg-water-400' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="pt-1 pb-8">
              <p className={`text-sm font-semibold ${active ? 'text-water-600' : done ? 'text-gray-600' : 'text-gray-300'}`}>
                {step.label}
              </p>
              {active && step.hint && (
                <p className="text-xs text-purple-600 font-medium mt-1 bg-purple-50 rounded-lg px-2 py-1">{step.hint}</p>
              )}
              {active && !step.hint && (
                <p className="text-xs text-gray-400 mt-0.5">In progress…</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
