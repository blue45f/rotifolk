// 라운드 대화 도우미 — 대화가 끊기지 않게 질문·밸런스게임·운세·이상형·미니게임 덱.

export type PromptKind = 'icebreaker' | 'deep' | 'balance' | 'ideal' | 'game'

export interface BalanceQuestion {
  a: string
  b: string
}

export interface MiniGame {
  emoji: string
  title: string
  rule: string
}

export interface Fortune {
  emoji: string
  title: string
  body: string
  luckyKeyword: string
  loveScore: number // 0~100
}

export const ICEBREAKERS: string[] = [
  '지금 이 잔, 한 단어로 표현하면?',
  '오늘 여기 오기 전 마지막으로 한 일은?',
  '주말의 나를 한 문장으로 소개한다면?',
  '최근에 새로 빠진 것이 있다면?',
  '인생 음료/안주 조합을 추천한다면?',
  '여행 가면 첫날 무조건 하는 것은?',
  '요즘 가장 자주 듣는 노래는?',
  '나를 설레게 하는 사소한 순간은?',
  '최근 가장 크게 웃었던 일은?',
  '한 달 휴가가 생긴다면 어디로?',
  '내 방에서 가장 아끼는 물건은?',
  '오늘 첫인상, 서로 한 단어로 말해주기.',
]

export const DEEP_QUESTIONS: string[] = [
  '오래 두고 싶은 관계의 조건은?',
  '최근 가장 고마웠던 사람은 누구인가요?',
  '5년 뒤 나는 어떤 하루를 보내고 있을까요?',
  '나를 가장 잘 설명하는 실패담이 있다면?',
  '돈과 시간 중 지금 더 갖고 싶은 것은?',
  '연애에서 절대 양보 못 하는 한 가지는?',
  '나를 성장시킨 한 문장이 있다면?',
  '혼자만의 회복 루틴은?',
  '가장 닮고 싶은 사람은 누구인가요?',
  '지금의 나에게 해주고 싶은 말은?',
]

export const BALANCE_GAMES: BalanceQuestion[] = [
  { a: '바다 여행', b: '산 여행' },
  { a: '아침형 인간', b: '저녁형 인간' },
  { a: '계획파', b: '즉흥파' },
  { a: '집순이·집돌이', b: '밖순이·밖돌이' },
  { a: '맵부심', b: '단짠파' },
  { a: '연락 자주', b: '만남 위주' },
  { a: '먼저 고백', b: '천천히 썸' },
  { a: '데이트는 맛집', b: '데이트는 액티비티' },
  { a: '강아지상', b: '고양이상' },
  { a: '여행은 빡빡하게', b: '여행은 느슨하게' },
]

export const IDEAL_TYPE_PROMPTS: string[] = [
  '내 이상형을 세 단어로 말한다면?',
  '첫눈에 반하는 순간은 보통 언제?',
  '함께 있으면 편한 사람 vs 설레는 사람?',
  '이상형의 말투나 목소리가 중요한가요?',
  '같이 하고 싶은 데이트 한 가지는?',
  '상대의 어떤 취미에 끌리나요?',
  '이상형의 가장 중요한 가치관 하나는?',
  '연인과 닮고 싶은 점이 있다면?',
]

export const MINI_GAMES: MiniGame[] = [
  { emoji: '🎲', title: '공통점 5개 찾기', rule: '제한 시간 안에 둘의 공통점 5개를 찾아보세요.' },
  { emoji: '🤝', title: '3·2·1 자기소개', rule: '장점 3개, 취미 2개, 비밀 1개를 번갈아 공개.' },
  { emoji: '🔮', title: '첫인상 맞히기', rule: '서로의 첫인상을 한 단어로 적고 동시에 공개.' },
  { emoji: '🎯', title: '이구동성', rule: '같은 질문에 동시에 답해 같으면 성공!' },
  { emoji: '📸', title: '표정 따라하기', rule: '상대가 보여주는 표정을 5초 안에 따라하기.' },
  { emoji: '🎁', title: '칭찬 릴레이', rule: '상대의 좋은 점을 번갈아 하나씩, 멈추면 패배.' },
]

export const FORTUNES: Fortune[] = [
  {
    emoji: '🍷',
    title: '오늘의 인연운: 깊은 레드',
    body: '서두르지 않을수록 진한 향이 올라와요. 천천히 한 모금씩.',
    luckyKeyword: '여유',
    loveScore: 88,
  },
  {
    emoji: '✨',
    title: '오늘의 인연운: 스파클링',
    body: '먼저 건넨 한마디가 오늘의 하이라이트가 됩니다.',
    luckyKeyword: '용기',
    loveScore: 92,
  },
  {
    emoji: '🌙',
    title: '오늘의 인연운: 늦은 밤 라운지',
    body: '조용히 듣는 사람에게 마음이 머무는 밤.',
    luckyKeyword: '경청',
    loveScore: 79,
  },
  {
    emoji: '☕',
    title: '오늘의 인연운: 따뜻한 라떼',
    body: '편안함이 매력으로 번지는 날. 자연스러운 게 최고예요.',
    luckyKeyword: '편안',
    loveScore: 84,
  },
  {
    emoji: '🌹',
    title: '오늘의 인연운: 한 송이 로즈',
    body: '작은 칭찬 하나가 큰 호감으로 돌아옵니다.',
    luckyKeyword: '다정',
    loveScore: 90,
  },
  {
    emoji: '🔥',
    title: '오늘의 인연운: 위스키 한 잔',
    body: '솔직함이 무기가 되는 날. 꾸미지 말고 진심으로.',
    luckyKeyword: '솔직',
    loveScore: 86,
  },
  {
    emoji: '🫧',
    title: '오늘의 인연운: 청량한 진토닉',
    body: '가볍게 웃어넘기는 센스가 분위기를 살립니다.',
    luckyKeyword: '유머',
    loveScore: 81,
  },
  {
    emoji: '🍵',
    title: '오늘의 인연운: 고요한 차 한 잔',
    body: '깊은 대화가 인연을 단단하게 만드는 날.',
    luckyKeyword: '진솔',
    loveScore: 83,
  },
]

function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

export function pick<T>(arr: readonly T[], index: number): T {
  return arr[((index % arr.length) + arr.length) % arr.length]
}

/** 시드(문자열/숫자)로 결정적 운세 추출. */
export function drawFortune(seed: string | number): Fortune {
  const n = typeof seed === 'number' ? seed : hashString(seed)
  return pick(FORTUNES, n)
}

/** 사용자×날짜로 하루 고정 운세. */
export function todaysFortune(userId: string, dateISO: string): Fortune {
  return drawFortune(`${userId}:${dateISO.slice(0, 10)}`)
}

export interface ConversationCard {
  kind: PromptKind
  text: string
  hint?: string
}

/** 종류+인덱스로 결정적 카드 추출 (소켓으로 모두에게 같은 카드 공유 가능). */
export function buildConversationCard(kind: PromptKind, index: number): ConversationCard {
  switch (kind) {
    case 'icebreaker':
      return { kind, text: pick(ICEBREAKERS, index) }
    case 'deep':
      return { kind, text: pick(DEEP_QUESTIONS, index) }
    case 'ideal':
      return { kind, text: pick(IDEAL_TYPE_PROMPTS, index) }
    case 'balance': {
      const q = pick(BALANCE_GAMES, index)
      return { kind, text: `${q.a} vs ${q.b}`, hint: '둘 중 하나를 고르고 이유를 말해보세요.' }
    }
    case 'game': {
      const g = pick(MINI_GAMES, index)
      return { kind, text: `${g.emoji} ${g.title}`, hint: g.rule }
    }
  }
}
