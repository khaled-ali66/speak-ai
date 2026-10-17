// STEP-style question bank. ADD YOUR OWN QUESTIONS HERE (or replace the seed ones).
//  - grammar:   no passage needed
//  - reading:   set passageId -> a passage in PASSAGES (section 'reading')
//  - listening: set passageId -> a script in PASSAGES (section 'listening'); played with browser text-to-speech
//    (or set `audioUrl` on the passage to use a real mp3 placed in /public/step-audio/)
// correctIndex is 0-based (0 = A, 1 = B, ...).

export type StepSection = 'grammar' | 'reading' | 'listening'

export interface StepPassage {
  id: string
  section: 'reading' | 'listening'
  title: string
  text: string          // reading: shown to the student. listening: the script (hidden, only spoken)
  audioUrl?: string
}

export interface StepQuestion {
  id: string
  section: StepSection
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  passageId?: string
}

export const PASSAGES: StepPassage[] = [
  {
    id: 'r1', section: 'reading', title: 'The Rise of Remote Work',
    text: `Over the past decade, remote work has changed from a rare privilege into a common way of working. Before 2020, only a small number of companies allowed employees to work from home regularly. When offices closed during the pandemic, many organisations discovered that a large part of their work could be done just as well from a kitchen table as from a desk in the city centre.

Supporters of remote work point to several benefits. Employees save the time and money they would have spent commuting, and many report that they can concentrate better without the constant interruptions of an open-plan office. Companies, in turn, can hire talented people from anywhere in the world and sometimes spend less on office space.

However, remote work is not free of problems. Some workers feel isolated and miss the casual conversations that happen in a shared workplace. Managers often find it harder to build team spirit, and younger employees may learn more slowly because they have fewer chances to watch experienced colleagues at work. As a result, many companies now prefer a hybrid model, in which staff spend part of the week at the office and the rest at home.`,
  },
  {
    id: 'r2', section: 'reading', title: 'Honey Bees and Pollination',
    text: `Honey bees are best known for producing honey, but their greatest value to people lies elsewhere. As bees move from flower to flower collecting nectar, they carry pollen on their bodies. This process, called pollination, allows many plants to produce fruits and seeds. It is estimated that about one third of the food humans eat depends, directly or indirectly, on pollination by insects, and honey bees are among the most important of these insects.

In recent years, beekeepers in many countries have reported that large numbers of their colonies are disappearing. Scientists believe there is no single cause. Pesticides, loss of wild flowers, diseases carried by tiny mites, and changing weather patterns may all play a part. Because the causes are connected, solving the problem is difficult.

Some farmers have started to plant strips of wild flowers beside their fields to give bees more food, and several governments have limited the use of the chemicals that are most harmful to insects. Experts agree that these steps help, but they warn that protecting bees will require long-term cooperation between farmers, scientists, and ordinary citizens.`,
  },
  {
    id: 'l1', section: 'listening', title: 'Library Announcement',
    text: `Attention, please. This is an announcement for all library visitors. The main reading room will close early today at five o'clock instead of eight, because the heating system is being repaired. Visitors who wish to continue studying may use the second floor, which will stay open until eight as usual. Please remember that books borrowed this week can be returned tomorrow without any late fee. We apologise for the inconvenience and thank you for your understanding.`,
  },
  {
    id: 'l2', section: 'listening', title: 'Conversation about a Trip',
    text: `Man: Hi Sara, did you book your flight to Dubai yet?
Woman: Not yet, Ahmed. The direct flights are really expensive this month, almost six hundred dollars.
Man: Why don't you take the one with a stopover in Doha? My cousin did that last year and paid less than four hundred.
Woman: That's a good idea, but it takes nearly three extra hours.
Man: True, but you'll save a lot of money, and the airline gives you a free meal during the stop.
Woman: Okay, I'll check that option tonight and book it tomorrow morning if the price is right.`,
  },
  {
    id: 'l3', section: 'listening', title: 'Lecture Introduction',
    text: `Good morning, everyone. Today we are going to begin a new topic: renewable energy. We will start by looking at solar power, which is now the fastest growing source of electricity in the world. Next week, we will move on to wind energy, and in the final session of this unit, we will discuss why storing energy is still the biggest challenge. Please read chapter four before our next class, and don't forget that your short written assignment is due on Thursday.`,
  },
]

export const STEP_BANK: StepQuestion[] = [
  // ───────── GRAMMAR ─────────
  { id: 'g1', section: 'grammar', question: 'She ______ to the gym every morning before work.', options: ['go', 'goes', 'going', 'is go'], correctIndex: 1, explanation: 'Habit in the present simple: third person singular (she) takes -es → goes.' },
  { id: 'g2', section: 'grammar', question: 'If I ______ more time, I would learn another language.', options: ['have', 'had', 'will have', 'would have'], correctIndex: 1, explanation: 'Second conditional (unreal present): if + past simple, would + base verb.' },
  { id: 'g3', section: 'grammar', question: 'By the time we arrived, the film ______.', options: ['already started', 'has already started', 'had already started', 'was already start'], correctIndex: 2, explanation: 'An action completed before another past action uses the past perfect: had already started.' },
  { id: 'g4', section: 'grammar', question: 'He is the man ______ car was stolen last week.', options: ['who', 'whom', 'whose', 'which'], correctIndex: 2, explanation: 'Whose shows possession (the man\'s car).' },
  { id: 'g5', section: 'grammar', question: 'I look forward to ______ you next month.', options: ['see', 'seeing', 'saw', 'be seeing'], correctIndex: 1, explanation: 'In "look forward to", "to" is a preposition, so it is followed by the -ing form.' },
  { id: 'g6', section: 'grammar', question: 'The report ______ by the manager yesterday.', options: ['was written', 'wrote', 'is written', 'has wrote'], correctIndex: 0, explanation: 'Passive voice in the past simple: was/were + past participle.' },
  { id: 'g7', section: 'grammar', question: 'Neither of the students ______ the answer.', options: ['know', 'knows', 'are knowing', 'have known'], correctIndex: 1, explanation: '"Neither of" is treated as singular in formal English, so the verb is knows.' },
  { id: 'g8', section: 'grammar', question: 'She suggested ______ the meeting until next week.', options: ['to postpone', 'postponing', 'postpone', 'to be postponed'], correctIndex: 1, explanation: 'The verb suggest is followed by a gerund (-ing form).' },
  { id: 'g9', section: 'grammar', question: 'This is ______ interesting book I have ever read.', options: ['the more', 'the most', 'most', 'more'], correctIndex: 1, explanation: 'Superlative of long adjectives: the most + adjective.' },
  { id: 'g10', section: 'grammar', question: 'We have lived in this city ______ 2015.', options: ['for', 'since', 'during', 'from'], correctIndex: 1, explanation: '"Since" is used with a point in time; "for" is used with a period (for ten years).' },
  { id: 'g11', section: 'grammar', question: 'You ______ smoke in the hospital. It is strictly forbidden.', options: ['mustn\'t', 'don\'t have to', 'needn\'t', 'shouldn\'t have'], correctIndex: 0, explanation: '"Mustn\'t" expresses prohibition; "don\'t have to" means it is not necessary.' },
  { id: 'g12', section: 'grammar', question: 'The teacher asked the students ______ quiet.', options: ['be', 'to be', 'being', 'they be'], correctIndex: 1, explanation: 'ask + object + to-infinitive.' },
  { id: 'g13', section: 'grammar', question: 'Not only ______ late, but he also forgot the documents.', options: ['he arrived', 'did he arrive', 'he did arrive', 'arrived he'], correctIndex: 1, explanation: 'After "Not only" at the start of a sentence, the auxiliary comes before the subject (inversion).' },
  { id: 'g14', section: 'grammar', question: 'I wish I ______ taller.', options: ['am', 'was being', 'were', 'will be'], correctIndex: 2, explanation: '"Wish" + past simple expresses an unreal present situation; "were" is used for all subjects.' },
  { id: 'g15', section: 'grammar', question: 'There isn\'t ______ milk left in the fridge.', options: ['some', 'any', 'many', 'a few'], correctIndex: 1, explanation: 'Use "any" in negative sentences with uncountable nouns.' },
  { id: 'g16', section: 'grammar', question: 'He speaks English very ______.', options: ['good', 'well', 'best', 'nice'], correctIndex: 1, explanation: 'Well is the adverb of good; it modifies the verb "speaks".' },
  { id: 'g17', section: 'grammar', question: 'Choose the sentence with an error: ', options: ['She has finished her homework.', 'He don\'t like spicy food.', 'They are watching TV now.', 'We went to the park.'], correctIndex: 1, explanation: 'Third person singular needs "doesn\'t": He doesn\'t like spicy food.' },
  { id: 'g18', section: 'grammar', question: 'The meeting was cancelled ______ the heavy rain.', options: ['because', 'because of', 'although', 'so'], correctIndex: 1, explanation: '"Because of" is followed by a noun phrase; "because" is followed by a clause.' },
  { id: 'g19', section: 'grammar', question: 'By next year, she ______ her degree.', options: ['will finish', 'will have finished', 'has finished', 'finishes'], correctIndex: 1, explanation: 'Future perfect (will have + past participle) for an action completed before a future time.' },
  { id: 'g20', section: 'grammar', question: 'Choose the sentence with an error: ', options: ['The information are very useful.', 'The news is surprising.', 'Her advice was helpful.', 'The furniture looks new.'], correctIndex: 0, explanation: '"Information" is uncountable and takes a singular verb: The information is very useful.' },
  { id: 'g21', section: 'grammar', question: 'He ______ his keys, so he couldn\'t open the door.', options: ['lost', 'had lost', 'has lost', 'was losing'], correctIndex: 1, explanation: 'The loss happened before the past moment of "couldn\'t open", so the past perfect fits best.' },
  { id: 'g22', section: 'grammar', question: 'The more you practise, ______ you become.', options: ['the better', 'better', 'the best', 'more good'], correctIndex: 0, explanation: 'Double comparative structure: the + comparative, the + comparative.' },
  { id: 'g23', section: 'grammar', question: 'I\'m not used to ______ up early.', options: ['get', 'getting', 'got', 'be getting'], correctIndex: 1, explanation: '"Be used to" + -ing means being accustomed to something.' },
  { id: 'g24', section: 'grammar', question: 'She said that she ______ the report the day before.', options: ['finishes', 'finished', 'had finished', 'will finish'], correctIndex: 2, explanation: 'In reported speech, past simple usually moves back to the past perfect.' },

  // ───────── READING ─────────
  { id: 'rq1', section: 'reading', passageId: 'r1', question: 'What is the main idea of the passage?', options: ['Offices will disappear completely.', 'Remote work has become common and has both advantages and disadvantages.', 'Young employees prefer working at home.', 'Companies spend more money on remote workers.'], correctIndex: 1, explanation: 'The passage describes the growth of remote work and then discusses benefits and problems.' },
  { id: 'rq2', section: 'reading', passageId: 'r1', question: 'According to the passage, one benefit of remote work for employees is that they ______.', options: ['earn higher salaries', 'avoid commuting costs', 'attend more meetings', 'learn faster from colleagues'], correctIndex: 1, explanation: 'The second paragraph says employees save the time and money spent commuting.' },
  { id: 'rq3', section: 'reading', passageId: 'r1', question: 'Why might younger employees learn more slowly when working remotely?', options: ['They are not interested in the work.', 'They cannot use technology well.', 'They have fewer chances to observe experienced colleagues.', 'They have too many interruptions.'], correctIndex: 2, explanation: 'Stated in the third paragraph.' },
  { id: 'rq4', section: 'reading', passageId: 'r1', question: 'The word "hybrid" in the last sentence most likely means ______.', options: ['a mixture of two things', 'completely new', 'very expensive', 'temporary'], correctIndex: 0, explanation: 'The sentence explains it: part of the week at the office and the rest at home.' },
  { id: 'rq5', section: 'reading', passageId: 'r2', question: 'What is the main value of honey bees according to the passage?', options: ['Producing honey', 'Pollinating plants that produce food', 'Protecting wild flowers', 'Controlling harmful insects'], correctIndex: 1, explanation: 'The passage says their greatest value lies elsewhere — pollination.' },
  { id: 'rq6', section: 'reading', passageId: 'r2', question: 'What do scientists believe about the disappearance of bee colonies?', options: ['It has one clear cause.', 'It is caused only by pesticides.', 'It has several connected causes.', 'It is not a real problem.'], correctIndex: 2, explanation: 'The passage says there is no single cause and that the causes are connected.' },
  { id: 'rq7', section: 'reading', passageId: 'r2', question: 'What have some farmers done to help bees?', options: ['Moved their fields', 'Planted wild flowers near their fields', 'Bought more bee colonies', 'Stopped growing fruit'], correctIndex: 1, explanation: 'Strips of wild flowers are planted beside fields.' },
  { id: 'rq8', section: 'reading', passageId: 'r2', question: 'Which statement would the writer most likely agree with?', options: ['The bee problem will be solved quickly.', 'Only governments can protect bees.', 'Protecting bees needs long-term cooperation.', 'Bees are not important for food.'], correctIndex: 2, explanation: 'The last sentence stresses long-term cooperation between farmers, scientists and citizens.' },

  // ───────── LISTENING ─────────
  { id: 'lq1', section: 'listening', passageId: 'l1', question: 'Why will the main reading room close early?', options: ['There is a special event.', 'The heating system is being repaired.', 'The staff is on a break.', 'It is a public holiday.'], correctIndex: 1, explanation: 'The announcement says the heating system is being repaired.' },
  { id: 'lq2', section: 'listening', passageId: 'l1', question: 'Where can visitors continue studying?', options: ['In the main reading room', 'On the second floor', 'In the cafeteria', 'They cannot study today'], correctIndex: 1, explanation: 'The second floor stays open until eight.' },
  { id: 'lq3', section: 'listening', passageId: 'l1', question: 'What is said about books borrowed this week?', options: ['They must be returned today.', 'They can be returned tomorrow without a late fee.', 'They cannot be returned.', 'They must be renewed online.'], correctIndex: 1, explanation: 'Returned tomorrow without any late fee.' },
  { id: 'lq4', section: 'listening', passageId: 'l2', question: 'Why hasn\'t Sara booked her flight yet?', options: ['She forgot.', 'The direct flights are too expensive.', 'She is not sure about the date.', 'The airline is closed.'], correctIndex: 1, explanation: 'Direct flights cost almost six hundred dollars.' },
  { id: 'lq5', section: 'listening', passageId: 'l2', question: 'What is a disadvantage of the flight through Doha?', options: ['It costs more.', 'It takes about three extra hours.', 'It has no meals.', 'It leaves very early.'], correctIndex: 1, explanation: 'Sara says it takes nearly three extra hours.' },
  { id: 'lq6', section: 'listening', passageId: 'l2', question: 'When will Sara probably book the flight?', options: ['Tonight', 'Tomorrow morning', 'Next week', 'She will not book it'], correctIndex: 1, explanation: 'She will check tonight and book tomorrow morning if the price is right.' },
  { id: 'lq7', section: 'listening', passageId: 'l3', question: 'What is the topic of the new unit?', options: ['Renewable energy', 'Ancient history', 'Space travel', 'Economics'], correctIndex: 0, explanation: 'The speaker says the new topic is renewable energy.' },
  { id: 'lq8', section: 'listening', passageId: 'l3', question: 'What will the class discuss next week?', options: ['Solar power', 'Energy storage', 'Wind energy', 'Chapter four'], correctIndex: 2, explanation: 'Next week they move on to wind energy.' },
  { id: 'lq9', section: 'listening', passageId: 'l3', question: 'When is the written assignment due?', options: ['Today', 'Next week', 'Thursday', 'After the unit ends'], correctIndex: 2, explanation: 'The assignment is due on Thursday.' },
]

