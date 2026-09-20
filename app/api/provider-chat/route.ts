import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SYSTEM_PROMPT = `You are a smart store assistant for AquaGas providers — local water and LPG delivery store owners in the Philippines.

You have access to LIVE STORE DATA provided in each message. Use it to answer accurately with real numbers.

You help providers with:
- Order summaries (how many orders, which are pending, revenue today, etc.)
- Status breakdowns (how many placed, confirmed, out for delivery, delivered, cancelled)
- Product info (what products they have, pricing, availability)
- Business insights (busiest times, top products, cancellation rate)
- Action reminders (e.g., "You have 3 orders waiting to be confirmed")

Always refer to actual numbers from the store context. Never make up data.
If asked about something not in the context, say you don't have that information.

FORMATTING RULES (strictly follow):
- Never use markdown: no **, no *, no #, no __, no backticks, no bullet dashes
- For lists, use plain numbered lines like: "1. Item one" or just new lines
- Keep responses short and conversational — like a chat message, not a document
- Order info format: "Order #XXXXXX — Status" on its own line`

// Only models confirmed to have quota on this API key
const MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
]

function isRetryableError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase()
  return (
    err?.status === 429 ||
    err?.status === 404 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('not found') ||
    msg.includes('does not exist') ||
    msg.includes('invalid model')
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY_PROVIDER || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI assistant is not configured yet.' }, { status: 503, headers: CORS_HEADERS })
  }

  try {
    const authorization = req.headers.get('authorization')
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
    if (!accessToken) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: CORS_HEADERS })

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: { user } } = await authClient.auth.getUser(accessToken)
    if (!user) return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401, headers: CORS_HEADERS })

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'provider') return NextResponse.json({ error: 'Provider access required.' }, { status: 403, headers: CORS_HEADERS })

    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: CORS_HEADERS })
    }

    const { data: store } = await admin.from('providers').select('*').eq('user_id', user.id).maybeSingle()
    if (!store) return NextResponse.json({ error: 'Provider store not found.' }, { status: 404, headers: CORS_HEADERS })

    const [productsResult, ordersResult] = await Promise.all([
      admin.from('products').select('name,price,unit,category,is_available,stock_quantity').eq('provider_id', store.id),
      admin.from('orders')
        .select('id,status,total_amount,created_at,delivery_address,payment_method,payment_status,delivery_type,profiles!orders_customer_id_fkey(full_name,email)')
        .eq('provider_id', store.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    const orders = ordersResult.data || []
    const today = new Date().toDateString()
    const todayOrders = orders.filter(order => new Date(order.created_at).toDateString() === today)
    const ordersByStatus: Record<string, number> = {}
    for (const order of orders) ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1
    const storeContext = {
      storeName: store.store_name,
      storeOpen: store.is_open,
      serviceType: store.service_type,
      deliveryFee: store.delivery_fee,
      estimatedDeliveryMinutes: store.delivery_time_min,
      totalOrdersToday: todayOrders.length,
      revenueToday: todayOrders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      totalOrders: orders.length,
      ordersByStatus,
      products: productsResult.data || [],
      recentOrders: orders.slice(0, 10).map((order: any) => ({
        id: order.id.slice(-6).toUpperCase(), status: order.status, amount: order.total_amount,
        customer: order.profiles?.full_name || order.profiles?.email || 'Customer',
        address: order.delivery_address, paymentMethod: order.payment_method,
        paymentStatus: order.payment_status, deliveryType: order.delivery_type,
      })),
    }

    const contextBlock = storeContext
      ? `\n\n--- LIVE STORE DATA ---\n${JSON.stringify(storeContext, null, 2)}\n--- END STORE DATA ---\n\n`
      : ''

    const lastMessage = messages[messages.length - 1]
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const contents = [
      ...history,
      { role: 'user', parts: [{ text: contextBlock + lastMessage.content }] },
    ]

    const genAI = new GoogleGenerativeAI(apiKey)
    let lastErr: any

    for (const modelName of MODEL_FALLBACKS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT })
        const result = await model.generateContent({ contents })
        const text = result.response.text()
        console.log(`[ProviderBot] responded with ${modelName}`)
        return NextResponse.json({ reply: text }, { headers: CORS_HEADERS })
      } catch (err: any) {
        if (isRetryableError(err)) {
          console.warn(`[ProviderBot] ${modelName} skipped: ${err?.message?.slice(0, 80)}`)
          lastErr = err
          continue
        }
        throw err
      }
    }

    console.error('[ProviderBot] all models rate limited:', lastErr?.message)
    return NextResponse.json(
      { error: 'Assistant is busy right now. Please try again in a moment.' },
      { status: 429, headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('[ProviderBot]', err?.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: CORS_HEADERS })
  }
}
