const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const MAX_HISTORY = 10

const SCENARIO_PROMPTS: Record<string, string> = {
  'Job Interview': `
You are a professional English-speaking interviewer.
Help the user practice English speaking skills.

Rules:
- Keep responses short and natural (2-3 sentences max).
- Ask one question at a time.
- Always add corrections AND a score in this exact format at the end:
[CORRECTIONS: correction1 | correction2]
[SCORE: X/10 | feedback]
- If no mistakes: [CORRECTIONS: No corrections needed]
- Score from 1-10 based on grammar, vocabulary, fluency.
`,
  'Coffee Shop': `
You are a friendly coffee shop barista helping the user practice English.

Rules:
- Be casual and friendly.
- Keep responses short (1-2 sentences).
- Always add corrections AND a score:
[CORRECTIONS: correction1 | correction2]
[SCORE: X/10 | feedback]
`,
  'Medical Appointment': `
You are a medical receptionist helping the user practice English.

Rules:
- Be professional and patient.
- Keep responses simple.
- Always add corrections AND a score:
[CORRECTIONS: correction1 | correction2]
[SCORE: X/10 | feedback]
`,
  'Airport & Travel': `
You are an airport employee helping a traveler practice English.

Rules:
- Be clear and helpful.
- Keep responses short.
- Always add corrections AND a score:
[CORRECTIONS: correction1 | correction2]
[SCORE: X/10 | feedback]
`,
  'Business Meeting': `
You are a business colleague helping the user practice professional English.

Rules:
- Be formal but friendly.
- Keep responses concise.
- Always add corrections AND a score:
[CORRECTIONS: correction1 | correction2]
[SCORE: X/10 | feedback]
`,
}

const STATIC_GREETINGS: Record<string, string> = {
  'Job Interview':
    "Hello! Welcome to your mock interview. I'm glad you're here to practice your English.\n\nLet's start — can you tell me a little about yourself?\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 10/10 | Great start!]",
  'Coffee Shop':
    "Hey, welcome in! Great to see you. ☕\n\nWhat can I get started for you today?\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 10/10 | Great start!]",
  'Medical Appointment':
    "Good morning! Welcome to the clinic.\n\nDo you have an appointment today, or would you like to schedule one?\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 10/10 | Great start!]",
  'Airport & Travel':
    "Good day! Welcome to the airport. I'm here to help.\n\nMay I see your boarding pass and passport, please?\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 10/10 | Great start!]",
  'Business Meeting':
    "Good morning, and welcome! Glad you could join us today.\n\nShall we go ahead and get started with the agenda?\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 10/10 | Great start!]",
}

// Prompt for end-of-call full analysis
const CALL_SUMMARY_PROMPT = `
You are a strict but encouraging English language coach analyzing a student's spoken English practice session.

Your job is to carefully read every message the student wrote and identify REAL grammar, vocabulary, and fluency mistakes.

Return ONLY a raw JSON object. No markdown. No backticks. No explanation outside the JSON.

JSON format:
{
  "overallScore": <integer 1-10>,
  "totalXp": <integer>,
  "strengths": [<1-3 specific strengths based on THEIR actual messages>],
  "mistakes": [
    {
      "wrong": "<copy the EXACT wrong phrase from their message>",
      "correct": "<corrected version>",
      "explanation": "<brief grammar rule explanation>"
    }
  ],
  "encouragement": "<one specific motivating sentence based on their actual performance>"
}

Scoring rules:
- 9-10: near-perfect English, very few or no errors
- 7-8: mostly correct with minor mistakes
- 5-6: some clear errors but understandable
- 3-4: frequent errors that affect clarity
- 1-2: very difficult to understand
- totalXp: overallScore * 15 + (number of user messages * 5)

CRITICAL mistake detection rules:
- Only include mistakes from the ACTUAL student messages provided to you
- Do NOT invent mistakes. Do NOT copy examples from this prompt
- Check for: wrong tense, subject-verb disagreement, missing articles (a/the), wrong prepositions, wrong word choice, plural/singular errors
- Quote the EXACT wrong text from their message in the "wrong" field
- If the student wrote perfect English, return mistakes as empty array []

Strengths rules:
- Be specific based on what you see: instead of "good vocabulary" say "used words like X and Y correctly"
- If messages are very short or limited, note "kept responses clear and direct"
`

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response

      if (response.status === 429) {
        if (attempt < retries - 1) {
          const delay = 2000 * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        throw new Error('Too many requests. Please wait a moment.')
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini Error ${response.status}: ${JSON.stringify(errorData)}`)
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

async function callGemini(systemPrompt: string, userMessage: string, temperature = 0.7): Promise<string> {
  if (!GEMINI_API_KEY) return ''
  const response = await fetchWithRetry(
    `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature, maxOutputTokens: 1000, topP: 0.9 },
      }),
    }
  )
  const data = await response.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function sendMessageToAI(
  messages: { role: 'user' | 'assistant'; content: string }[],
  scenario: string
): Promise<string> {
  try {
    if (!GEMINI_API_KEY) {
      return `API key is missing.\n\nPlease add VITE_GEMINI_API_KEY to your .env file\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 0/10 | No API key]`
    }

    const systemPrompt = SCENARIO_PROMPTS[scenario] || SCENARIO_PROMPTS['Job Interview']
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
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 300, topP: 0.9, topK: 40 },
        }),
      }
    )

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) return `Sorry, I could not generate a response.\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 0/10 | Error]`
    return text
  } catch (error) {
    console.error('Gemini Error:', error)
    return `Sorry, something went wrong.\n\n[CORRECTIONS: No corrections needed]\n[SCORE: 0/10 | Error]`
  }
}

export async function getInitialGreeting(scenario: string): Promise<string> {
  return STATIC_GREETINGS[scenario] || STATIC_GREETINGS['Job Interview']
}

export function parseCorrections(text: string): {
  clean: string
  corrections: string[]
  score: number | null
  scoreFeedback: string | null
} {
  const correctionRegex = /\[CORRECTIONS:\s*(.*?)\]/s
  const scoreRegex = /\[SCORE:\s*(\d+)\/10\s*\|\s*(.*?)\]/s

  const corrMatch = text.match(correctionRegex)
  const scoreMatch = text.match(scoreRegex)

  let clean = text
    .replace(correctionRegex, '')
    .replace(scoreRegex, '')
    .trim()

  const corrections = corrMatch
    ? corrMatch[1].split('|').map(c => c.trim()).filter(Boolean)
    : []

  const score = scoreMatch ? parseInt(scoreMatch[1]) : null
  const scoreFeedback = scoreMatch ? scoreMatch[2].trim() : null

  return { clean, corrections, score, scoreFeedback }
}

export interface CallSummary {
  overallScore: number
  totalXp: number
  strengths: string[]
  mistakes: { wrong: string; correct: string; explanation: string }[]
  encouragement: string
}

export async function generateCallSummary(
  userMessages: string[],
  scenario: string
): Promise<CallSummary> {
  try {
    const numbered = userMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')
    const prompt = `Scenario practiced: ${scenario}
Total student messages: ${userMessages.length}

Student messages (analyze each one for errors):
${numbered}

Now analyze the messages above and return the JSON summary.`

    const raw = await callGemini(CALL_SUMMARY_PROMPT, prompt, 0.1)

    // Strip markdown fences if present
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])

    // Validate and clamp values
    return {
      overallScore: Math.min(10, Math.max(1, Math.round(parsed.overallScore || 5))),
      totalXp: parsed.totalXp || (userMessages.length * 15),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : ['Completed the session'],
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.slice(0, 8) : [],
      encouragement: parsed.encouragement || 'Keep practicing!',
    } as CallSummary
  } catch (e) {
    console.error('Summary error:', e)
    return {
      overallScore: 6,
      totalXp: userMessages.length * 15,
      strengths: ['Completed the full session', 'Kept the conversation going'],
      mistakes: [],
      encouragement: 'Great effort! Keep practicing daily to improve faster.',
    }
  }
}