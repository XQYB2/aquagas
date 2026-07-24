import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const SYSTEM_PROMPT = `You are a smart store assistant for AquaGas providers — local water and LPG delivery store owners in the Philippines.

You have access to LIVE STORE DATA provided in each message. Use it to answer accurately with real numbers.

You help providers with:
- Order summaries (how many orders, which are pending, revenue today, etc.)
- Status breakdowns (how many placed, confirmed, out for delivery, delivered, cancelled)
- Product info (what products they have, pricing, availability)
- Business insights (busiest times, top products, cancellation rate)
- Action reminders (e.g., "You have 3 orders waiting to be confirmed")

Tone: Professional but friendly. Be concise — use bullet points or short lists when listing data.
Always refer to actual numbers from the store context. Never make up data.
If asked about something not in the context, say you don't have that information.`

const MODEL_FALLBACKS = [
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
]

function isRateLimitError(err: any): boolean {
  const msg = err?.message || ''
  return (
    err?.status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('RESOURCE_EXHAUSTED')
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI assistant is not configured yet.' }, { status: 503, headers: CORS_HEADERS })
  }

  try {
    const { messages, storeContext } = await req.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: CORS_HEADERS })
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
        if (isRateLimitError(err)) {
          console.warn(`[ProviderBot] ${modelName} rate limited, trying next`)
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
