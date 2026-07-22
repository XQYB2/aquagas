import type { OrderStatus } from '@/lib/provider-context'

const CONFIG: Record<OrderStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending_payment:  { label: 'Awaiting Payment',  dot: 'bg-yellow-400',  bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  placed:           { label: 'New Order',         dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  confirmed:        { label: 'Confirmed',          dot: 'bg-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  awaiting_pickup:  { label: 'Awaiting Pickup',   dot: 'bg-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-700' },
  picked_up:        { label: 'Picked Up',          dot: 'bg-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  being_prepared:   { label: 'Being Prepared',     dot: 'bg-yellow-500',  bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  out_for_delivery: { label: 'Out for Delivery',   dot: 'bg-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700' },
  delivered:        { label: 'Delivered',          dot: 'bg-green-500',   bg: 'bg-green-50',   text: 'text-green-700' },
  cancelled:        { label: 'Cancelled',          dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-600' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = CONFIG[status] ?? { label: status, dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600' }
  const { label, dot, bg, text } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  const flow: Partial<Record<OrderStatus, OrderStatus[]>> = {
    placed:           ['confirmed', 'cancelled'],
    confirmed:        ['awaiting_pickup', 'cancelled'],
    awaiting_pickup:  ['picked_up'],
    picked_up:        ['being_prepared'],
    being_prepared:   ['out_for_delivery'],
    out_for_delivery: ['delivered'],
  }
  return flow[current] || []
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment:  'Awaiting Payment',
  placed:           'New Order',
  confirmed:        'Confirm Order',
  awaiting_pickup:  'Instruct Pickup',
  picked_up:        'Mark Picked Up',
  being_prepared:   'Mark Being Prepared',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Mark Delivered',
  cancelled:        'Cancel Order',
}

export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending_payment:  'Waiting for customer to complete GCash payment.',
  placed:           'New order waiting for your confirmation.',
  confirmed:        'Send pickup instructions to the customer.',
  awaiting_pickup:  'Waiting for rider to pick up empty gallons from customer.',
  picked_up:        'Empty gallons picked up — start refilling.',
  being_prepared:   'Gallons refilled and ready — send out for delivery.',
  out_for_delivery: 'Rider is on the way to the customer.',
  delivered:        'Order completed.',
  cancelled:        'Order cancelled.',
}
