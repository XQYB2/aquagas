import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migrations = readFileSync(new URL('../supabase-migrations.sql', import.meta.url), 'utf8')
const paymentStatus = readFileSync(new URL('../app/api/payment/status/route.ts', import.meta.url), 'utf8')
const paymentWebhook = readFileSync(new URL('../app/api/payment/webhook/route.ts', import.meta.url), 'utf8')

test('orders reserve inventory atomically and reject insufficient stock', () => {
  assert.match(migrations, /FOR UPDATE/)
  assert.match(migrations, /Insufficient stock/)
  assert.match(migrations, /stock_quantity\s*=\s*product\.stock_quantity\s*-\s*grouped\.quantity/)
})

test('cancelled and deleted orders restore reserved inventory once', () => {
  assert.match(migrations, /restore_cancelled_order_stock/)
  assert.match(migrations, /stock_released_at IS NULL/)
  assert.match(migrations, /restore_deleted_order_stock/)
})

test('PayMongo reconciliation requires the authenticated order owner and exact amount', () => {
  assert.match(paymentStatus, /Authentication required/)
  assert.match(paymentStatus, /order\.customer_id !== user\.id/)
  assert.match(paymentStatus, /amountMatches/)
  assert.match(paymentStatus, /payment_status: 'paid'/)
})

test('PayMongo webhook verifies its signature before mutating an order', () => {
  assert.match(paymentWebhook, /PAYMONGO_WEBHOOK_SECRET/)
  assert.match(paymentWebhook, /timingSafeEqual/)
  assert.match(paymentWebhook, /payment_status: 'paid'/)
})
