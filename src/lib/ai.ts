const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const MAX_HISTORY = 10

const SCENARIO_PROMPTS: Record<string, string> = {
  'Job Interview': `
You are a professional English-speaking interviewer.
Help the user practice English speaking skills.

Rules:
- Keep responses short and natural.
- Ask one question at a time.
- Correct grammar mistakes briefly.
- Always add corrections in this format:
[CORRECTIONS: correction1 | correction2]
- If no mistakes:
[CORRECTIONS: No corrections needed]
`,
  'Coffee Shop': `
You are a friendly coffee shop barista helping the user practice English.

Rules:
- Be casual and friendly.
- Keep responses short.
- Add corrections in this format:
[CORRECTIONS: correction1 | correction2]
`,
  'Medical Appointment': `
You are a medical receptionist helping the user practice English.

Rules:
- Be professional and patient.
- Keep responses simple.
- Add corrections in this format:
[CORRECTIONS: correction1 | correction2]
`,
  'Airport & Travel': `
You are an airport employee helping a traveler practice English.

Rules:
- Be clear and helpful.
- Keep responses short.
- Add corrections in this format:
[CORRECTIONS: correction1 | correction2]
`,
  'Business Meeting': `
You are a business colleague helping the user practice professional English.

Rules:
- Be formal but friendly.
- Keep responses concise.
- Add corrections in this format:
[CORRECTIONS: correction1 | correction2]
`,
}

const STATIC_GREETINGS: Record<string, string> = {
  'Job Interview':
    "Hello! Welcome to your mock interview. I'm glad you're here to practice your English.\n\nLet's start with a simple question — can you tell me a little about yourself and your experience?\n\n[CORRECTIONS: No corrections needed]",
  'Coffee Shop':
    "Hey, welcome in! Great to see you. ☕\n\nWhat can I get started for you today?\n\n[CORRECTIONS: No corrections needed]",
  'Medical Appointment':
    "Good morning! Welcome to the clinic.\n\nDo you have an appointment today, or would you like to schedule one?\n\n[CORRECTIONS: No corrections needed]",
  'Airport & Travel':
    "Good day! Welcome to the airport. I'm here to help.\n\nMay I see your boarding pass and passport, please?\n\n[CORRECTIONS: No corrections needed]",
  'Business Meeting':
    "Good morning, and welcome! Glad you could join us today.\n\nShall we go ahead and get started with the agenda?\n\n[CORRECTIONS: No corrections needed]",
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok) {
        return response
      }

      if (response.status === 429) {
        if (attempt < retries - 1) {
          const delay = 2000 * Math.pow(2, attempt)
          console.warn(`Rate limited. Retrying in ${delay / 1000}s...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        throw new Error('Too many requests. Please wait a moment.')
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Gemini Error ${response.status}: ${JSON.stringify(errorData)}`
      )
    } catch (error) {
      if (attempt < retries - 1) {
        const delay = 1000 * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }

  throw new Error('Request failed.')
}

export async function sendMessageToAI(
  messages: {
    role: 'user' | 'assistant'
    content: string
  }[],
  scenario: string
): Promise<string> {
  try {
    if (!GEMINI_API_KEY) {
      return `API key is missing.\n\nPlease add:\nVITE_GEMINI_API_KEY=your_key\n\n[CORRECTIONS: No corrections needed]`
    }

    const systemPrompt =
      SCENARIO_PROMPTS[scenario] || SCENARIO_PROMPTS['Job Interview']

    const recentMessages = messages.slice(-MAX_HISTORY)

    const contents = recentMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const response = await fetchWithRetry(
      `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
            topP: 0.9,
            topK: 40,
          },
        }),
      }
    )

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return `Sorry, I could not generate a response.\n\n[CORRECTIONS: No corrections needed]`
    }

    return text
  } catch (error) {
    console.error('Gemini Error:', error)
    return `Sorry, something went wrong. Please try again.\n\n[CORRECTIONS: No corrections needed]`
  }
}

export async function getInitialGreeting(scenario: string): Promise<string> {
  return (
    STATIC_GREETINGS[scenario] || STATIC_GREETINGS['Job Interview']
  )
}

export function parseCorrections(text: string): {
  clean: string
  corrections: string[]
} {
  const regex = /\[CORRECTIONS:\s*(.*?)\]/s
  const match = text.match(regex)

  if (!match) {
    return { clean: text.trim(), corrections: [] }
  }

  const clean = text.replace(regex, '').trim()
  const corrections = match[1]
    .split('|')
    .map(c => c.trim())
    .filter(Boolean)

  return { clean, corrections }
}