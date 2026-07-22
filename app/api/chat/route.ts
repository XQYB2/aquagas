import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `You are AquaBot, the friendly AI assistant for AquaGas — a Philippine-based app where customers order drinking water (5-gallon jugs, mineral, alkaline, distilled) and LPG (cooking gas) for home delivery.

"Water stations" or "providers" in this app means local water/LPG delivery stores registered on AquaGas — NOT swimming pools or open water swimming events.

You will be given a CONTEXT block with live data from the AquaGas database. Use it to answer accurately.
If the CONTEXT block shows no providers or products, say: "No stores are available in your area yet — check back soon!"
If MY ORDERS is in the CONTEXT, list the orders with their status clearly. NEVER ask the customer for an order ID or any other identifier — all their orders are already in the context. Just show them directly.

Your role:
- Help customers find open water/LPG delivery stores and their products
- Answer questions about pricing, delivery fees, and estimated delivery times
- Guide users on placing orders, tracking deliveries, and managing their account
- Explain product differences (alkaline vs distilled water, LPG tank sizes: 11kg, 22kg)

Tone: Friendly, concise. 2-4 sentences max or a short list.
Never discuss topics unrelated to water/LPG delivery or the AquaGas app.`

async function getContext(userMessage: string, userId?: string): Promise<string> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const msg = userMessage.toLowerCase()
  const wantsProviders = msg.includes('provider') || msg.includes('store') || msg.includes('station') || msg.includes('open') || msg.includes('who') || msg.includes('where') || msg.includes('available')
  const wantsProducts = msg.includes('product') || msg.includes('price') || msg.includes('water') || msg.includes('lpg') || msg.includes('gas') || msg.includes('gallon') || msg.includes('tank') || msg.includes('cost') || msg.includes('how much')
  const wantsOrders = msg.includes('order') || msg.includes('pending') || msg.includes('status') || msg.includes('track') || msg.includes('delivery') || msg.includes('my order') || msg.includes('recent') || msg.includes('latest') || msg.includes('last order') || msg.includes('placed')

  const parts: string[] = []

  if (wantsOrders && userId) {
    const { data: orders } = await sb
      .from('orders')
      .select('id, status, total_amount, delivery_address, payment_method, created_at, notes, providers(store_name)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (orders && orders.length > 0) {
      parts.push('MY ORDERS:\n' + orders.map((o: any) =>
        `- Order #${o.id.slice(-6).toUpperCase()} | Status: ${o.status} | Store: ${o.providers?.store_name ?? 'Unknown'} | Total: ₱${o.total_amount} | Payment: ${o.payment_method} | Address: ${o.delivery_address} | Placed: ${new Date(o.created_at).toLocaleDateString('en-PH')}${o.notes ? ' | Notes: ' + o.notes : ''}`
      ).join('\n'))
    } else {
      parts.push('MY ORDERS: No orders found.')
    }
  }

  if (wantsProviders || wantsProducts) {
    const { data: providers } = await sb
      .from('providers')
      .select('id, store_name, service_type, address, is_open, delivery_fee, delivery_time_min, rating, review_count')
      .in('approval_status', ['approved', 'active'])
      .order('rating', { ascending: false })
      .limit(10)

    if (providers && providers.length > 0) {
      parts.push('AVAILABLE PROVIDERS:\n' + providers.map(p =>
        `- ${p.store_name} | Type: ${p.service_type} | Open: ${p.is_open ? 'Yes' : 'No'} | Address: ${p.address} | Delivery fee: ₱${p.delivery_fee} | ETA: ${p.delivery_time_min} min | Rating: ${p.rating?.toFixed(1) ?? 'N/A'} (${p.review_count} reviews)`
      ).join('\n'))
    } else {
      parts.push('AVAILABLE PROVIDERS: None currently approved.')
    }
  }

  if (wantsProducts) {
    const { data: products } = await sb
      .from('products')
      .select('name, category, price, unit, description, is_available, providers(store_name)')
      .eq('is_available', true)
      .limit(20)

    if (products && products.length > 0) {
      parts.push('AVAILABLE PRODUCTS:\n' + products.map((p: any) =>
        `- ${p.name} | Category: ${p.category} | Price: ₱${p.price}/${p.unit} | Store: ${p.providers?.store_name ?? 'Unknown'}${p.description ? ' | ' + p.description : ''}`
      ).join('\n'))
    }
  }

  return parts.length > 0 ? `CONTEXT (live data from database):\n${parts.join('\n\n')}\n\n` : ''
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI assistant is not configured yet.' }, { status: 503 })
  }

  try {
    const { messages, userId } = await req.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    const context = await getContext(lastMessage.content, userId)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      systemInstruction: SYSTEM_PROMPT,
    })

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const contents = [
      ...history,
      { role: 'user', parts: [{ text: context + lastMessage.content }] },
    ]
    const result = await model.generateContent({ contents })
    const text = result.response.text()

    return NextResponse.json({ reply: text })
  } catch (err: any) {
    console.error('[AquaBot]', err?.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
