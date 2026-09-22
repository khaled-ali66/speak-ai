const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export interface QuizTopic {
  id: string
  title: string
  description: string
  icon: string
  color: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

// 10 topics, same idea as Wayground: pick a subject, then answer a big bank of questions
export const QUIZ_TOPICS: QuizTopic[] = [
  { id: 'grammar', title: 'Grammar Basics', description: 'Tenses, articles, prepositions & more', icon: '📘', color: '#7c3aed' },
  { id: 'vocabulary', title: 'Vocabulary Builder', description: 'Everyday words & meanings', icon: '🧠', color: '#22c55e' },
  { id: 'idioms', title: 'Idioms & Expressions', description: 'Common English idioms', icon: '💬', color: '#f97316' },
  { id: 'business', title: 'Business English', description: 'Emails, meetings & professional talk', icon: '💼', color: '#eab308' },
  { id: 'travel', title: 'Travel English', description: 'Airports, hotels & directions', icon: '✈️', color: '#06b6d4' },
  { id: 'phrasal_verbs', title: 'Phrasal Verbs', description: 'Two & three-word verb phrases', icon: '🔗', color: '#ec4899' },
  { id: 'tenses', title: 'Verb Tenses', description: 'Past, present, future & perfect forms', icon: '⏱️', color: '#8b5cf6' },
  { id: 'pronunciation', title: 'Pronunciation & Spelling', description: 'Tricky sounds and spelling rules', icon: '🔊', color: '#3b82f6' },
  { id: 'interview', title: 'Job Interview English', description: 'Common interview language', icon: '🧑‍💼', color: '#10b981' },
  { id: 'conversation', title: 'Everyday Conversation', description: 'Small talk & daily situations', icon: '🗣️', color: '#f43f5e' },
]

export const QUESTIONS_PER_TOPIC = 100

// Small local fallback bank per topic, used if the AI is unavailable and to
// instantly fill a quiz while more questions are generated in the background.
const FALLBACK_BANK: Record<string, QuizQuestion[]> = {
  grammar: [
    { question: 'Choose the correct sentence.', options: ['She don\'t like coffee.', 'She doesn\'t likes coffee.', 'She doesn\'t like coffee.', 'She not like coffee.'], correctIndex: 2 },
    { question: 'Which article fits: "___ apple a day keeps the doctor away."', options: ['A', 'An', 'The', 'No article'], correctIndex: 1 },
    { question: 'Pick the correct preposition: "I\'m interested ___ music."', options: ['on', 'at', 'in', 'for'], correctIndex: 2 },
    { question: 'Choose the correct plural form of "child".', options: ['childs', 'childes', 'children', 'childrens'], correctIndex: 2 },
    { question: 'Which is a correct comparative? "This book is ___ than that one."', options: ['more good', 'better', 'gooder', 'more well'], correctIndex: 1 },
  ],
  vocabulary: [
    { question: 'What does "enormous" mean?', options: ['Very small', 'Very large', 'Very fast', 'Very quiet'], correctIndex: 1 },
    { question: 'A synonym for "happy" is:', options: ['Furious', 'Joyful', 'Tired', 'Bored'], correctIndex: 1 },
    { question: 'What is the opposite of "expensive"?', options: ['Cheap', 'Costly', 'Rich', 'Heavy'], correctIndex: 0 },
    { question: '"Reluctant" means:', options: ['Eager', 'Unwilling', 'Confident', 'Careless'], correctIndex: 1 },
  ],
  idioms: [
    { question: '"Break the ice" means:', options: ['To start a fight', 'To ease tension in a social situation', 'To cancel plans', 'To feel cold'], correctIndex: 1 },
    { question: '"Piece of cake" means:', options: ['A dessert', 'Something very easy', 'A small amount', 'A celebration'], correctIndex: 1 },
    { question: '"Hit the books" means:', options: ['To damage a book', 'To study hard', 'To buy books', 'To read for fun'], correctIndex: 1 },
  ],
  business: [
    { question: 'Which is the most professional email closing?', options: ['See ya', 'Best regards', 'Byeee', 'Later'], correctIndex: 1 },
    { question: '"Let\'s touch base next week" means:', options: ['Let\'s play sports', 'Let\'s meet/talk briefly again', 'Let\'s end the project', 'Let\'s sign a contract'], correctIndex: 1 },
    { question: 'A good way to start a formal meeting is:', options: ['Yo, what\'s up team', 'Good morning everyone, thanks for joining', 'Let\'s just skip intros', 'Hey guys'], correctIndex: 1 },
  ],
  travel: [
    { question: 'At the airport, "boarding pass" refers to:', options: ['A type of luggage', 'Your ticket to board the plane', 'A passport stamp', 'A hotel receipt'], correctIndex: 1 },
    { question: 'If a flight is "delayed", it means it is:', options: ['Cancelled', 'Leaving later than planned', 'Leaving early', 'Overbooked'], correctIndex: 1 },
    { question: 'Which phrase asks for directions politely?', options: ['Where is that place?', 'Excuse me, could you tell me how to get to...?', 'Take me there now.', 'I want directions.'], correctIndex: 1 },
  ],
  phrasal_verbs: [
    { question: '"Give up" means:', options: ['To offer something', 'To stop trying', 'To celebrate', 'To lift something'], correctIndex: 1 },
    { question: '"Look after" means:', options: ['To search for', 'To take care of', 'To follow someone', 'To admire'], correctIndex: 1 },
    { question: '"Run into" someone means:', options: ['To avoid someone', 'To meet by chance', 'To argue with someone', 'To chase someone'], correctIndex: 1 },
  ],
  tenses: [
    { question: 'Choose the past simple of "go".', options: ['goed', 'went', 'gone', 'going'], correctIndex: 1 },
    { question: 'Which sentence uses present perfect correctly?', options: ['I have seen that movie.', 'I have saw that movie.', 'I has seen that movie.', 'I have seeing that movie.'], correctIndex: 0 },
    { question: 'Which is future continuous?', options: ['I will study.', 'I will be studying at 8pm.', 'I studied.', 'I have studied.'], correctIndex: 1 },
  ],
  pronunciation: [
    { question: 'Which word rhymes with "though"?', options: ['Through', 'Go', 'Tough', 'Now'], correctIndex: 1 },
    { question: 'How many syllables does "comfortable" typically have in natural speech?', options: ['2', '3', '4', '5'], correctIndex: 1 },
    { question: 'Which is spelled correctly?', options: ['Recieve', 'Receive', 'Receeve', 'Reciev'], correctIndex: 1 },
  ],
  interview: [
    { question: 'A good answer to "Tell me about yourself" should be:', options: ['Very long and personal', 'Brief, relevant to the job, and confident', 'Just your name', 'A joke'], correctIndex: 1 },
    { question: '"What is your biggest weakness?" is best answered by:', options: ['Saying you have none', 'Naming a real area for growth with steps you are taking', 'Avoiding the question', 'Criticizing a coworker'], correctIndex: 1 },
    { question: 'At the end of an interview, it is good to:', options: ['Leave immediately', 'Ask a thoughtful question about the role', 'Talk about salary only', 'Say nothing'], correctIndex: 1 },
  ],
  conversation: [
    { question: 'A natural way to greet someone in the afternoon is:', options: ['Good night', 'Good afternoon', 'Good dawn', 'Good week'], correctIndex: 1 },
    { question: 'How do you politely interrupt someone?', options: ['Just start talking loudly', 'Sorry to interrupt, but...', 'Stop talking now', 'Be quiet'], correctIndex: 1 },
    { question: 'A common small-talk topic is:', options: ['Someone\'s salary', 'The weather', 'Private medical history', 'Political arguments'], correctIndex: 1 },
  ],
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function cycleFallback(topicId: string, count: number): QuizQuestion[] {
  const base = FALLBACK_BANK[topicId] || FALLBACK_BANK['grammar']
  const out: QuizQuestion[] = []
  let i = 0
  while (out.length < count) {
    out.push(base[i % base.length])
    i++
  }
  return shuffle(out).slice(0, count)
}

/**
 * Generates `count` multiple-choice questions for a topic using Gemini.
 * Falls back to a small local question bank (cycled/shuffled) if no API key
 * is configured or the request fails, so the quiz always has content.
 */
export async function generateQuizQuestions(
  topicId: string,
  count = QUESTIONS_PER_TOPIC
): Promise<QuizQuestion[]> {
  const topic = QUIZ_TOPICS.find(t => t.id === topicId)
  const topicTitle = topic?.title || topicId

  if (!GEMINI_API_KEY) {
    return cycleFallback(topicId, count)
  }

  try {
    const prompt = `Generate exactly ${count} unique multiple-choice English-learning quiz questions about the topic "${topicTitle}".
Each question must have exactly 4 answer options with only one correct answer.
Vary difficulty from easy to hard. Do not repeat questions.
Respond with ONLY valid JSON (no markdown fences, no extra text) in this exact shape:
[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"short reason"}]`

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) throw new Error(`Gemini error ${response.status}`)

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty AI response')

    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as QuizQuestion[]

    const valid = parsed.filter(
      q =>
        q &&
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctIndex === 'number'
    )

    if (valid.length === 0) throw new Error('No valid questions parsed')

    // Top up with fallback questions if the AI returned fewer than requested
    if (valid.length < count) {
      const extra = cycleFallback(topicId, count - valid.length)
      return [...valid, ...extra]
    }

    return valid.slice(0, count)
  } catch (err) {
    console.error('generateQuizQuestions error:', err)
    return cycleFallback(topicId, count)
  }
}
