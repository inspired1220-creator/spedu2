/**
 * 모두의 수업 변환기 - 기본 데모 데이터 (초등 3학년 국어)
 * - 2022 개정 특수교육 기본 교육과정 및 공통 교육과정 연계
 * - 성취기준: [3국01-03] 자신의 생각과 그 까닭을 표현할 수 있다.
 * - 단원: 3학년 1학기 3. 생각을 나누어요
 * - 주제: 내가 좋아하는 계절과 그 까닭
 */

const DEMO_LESSON = {
  id: 'lesson_demo_korean_grade3',
  title: '내가 좋아하는 계절과 그 까닭',
  curriculum: '공통 및 특수교육 기본 연계',
  grade: '초등 3학년',
  subject: '국어',
  unit: '3. 생각을 나누어요 (자신의 생각과 까닭 표현하기)',
  goal: '자신의 생각과 그 까닭을 표현할 수 있다.',
  topic: '내가 가장 좋아하는 계절을 고르고, 왜 좋아하는지 이유를 설명하기',
  content: `봄, 여름, 가을, 겨울 네 가지 계절이 있습니다.
봄에는 따뜻한 바람이 불고 예쁜 꽃이 핍니다.
여름에는 햇볕이 쨍쨍 내리쬐고 시원한 수박을 먹거나 물놀이를 할 수 있습니다.
가을에는 알록달록 단풍이 들고 맛있는 과일이 많이 열립니다.
겨울에는 하얀 눈이 내리고 눈사람을 만들거나 썰매를 탈 수 있습니다.
사람마다 좋아하는 계절과 그 까닭이 다릅니다.
여러분이 가장 좋아하는 계절은 무엇인가요? 왜 그 계절을 좋아하나요?`,
  keywords: ['계절', '봄', '여름', '가을', '겨울', '생각', '까닭', '좋아하다', '꽃', '물놀이', '단풍', '눈사람'],
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z'
};

// 기본 학생 맞춤 프로필 샘플 3종 (UDL 지원 수준별)
const DEMO_STUDENT_PROFILES = [
  {
    id: 'profile_student_a',
    codeName: '꿈나무-01 (해솔)',
    readingLevel: '그림 중심',
    commMode: '그림 선택',
    supportLevel: '많은 지원',
    hintEnabled: true,
    ttsAuto: true,
    choiceCount: 2,
    fontSize: 'large',
    highContrast: false,
    notes: '시각적 단서(이모지/상징) 필요, 2지선다 직관적 터치 선호'
  },
  {
    id: 'profile_student_b',
    codeName: '사랑-02 (도윤)',
    readingLevel: '낱말 수준',
    commMode: '낱말 선택',
    supportLevel: '부분적 지원',
    hintEnabled: true,
    ttsAuto: true,
    choiceCount: 3,
    fontSize: 'medium',
    highContrast: false,
    notes: '낱말 카드 읽기 가능, 빈칸 채우기 및 낱말 매칭 활동 적합'
  },
  {
    id: 'profile_student_c',
    codeName: '나래-03 (서연)',
    readingLevel: '짧은 문장',
    commMode: '문장 완성',
    supportLevel: '최소한의 지원',
    hintEnabled: true,
    ttsAuto: false,
    choiceCount: 4,
    fontSize: 'medium',
    highContrast: false,
    notes: '문장 틀(나는 ~가 좋다. 왜냐하면 ~ 때문이다)을 이용한 문장 구성 가능'
  }
];

// 초등 3학년 국어 '내가 좋아하는 계절과 그 까닭'에 맞춤화된 4가지 유형 활동 데이터
const DEMO_ACTIVITIES = {
  id: 'act_demo_korean_grade3',
  lessonId: 'lesson_demo_korean_grade3',
  title: '내가 좋아하는 계절과 그 까닭 (4가지 맞춤 활동)',

  // [A형: 그림 선택형] - 상징과 직관적 이미지 중심 (많은 지원 / 그림 중심)
  typeA: {
    type: 'A',
    name: 'A형 – 그림 선택형',
    description: '그림과 상징을 보고 내가 좋아하는 것과 알맞은 까닭을 선택해요.',
    targetReading: '그림 중심',
    items: [
      {
        id: 'A1',
        instruction: '다음 그림 중 내가 가장 좋아하는 계절을 골라보세요.',
        audioPrompt: '내가 가장 좋아하는 계절 그림을 골라보세요.',
        hint: '따뜻한 봄, 시원한 여름, 알록달록 가을, 하얀 겨울 중에 골라요.',
        options: [
          { id: 'opt_1', text: '봄 (예쁜 꽃)', icon: '🌸', visual: '봄꽃' },
          { id: 'opt_2', text: '여름 (시원한 물놀이)', icon: '🍉', visual: '수박과 바다' },
          { id: 'opt_3', text: '가을 (알록달록 단풍)', icon: '🍁', visual: '단풍잎' },
          { id: 'opt_4', text: '겨울 (하얀 눈사람)', icon: '⛄', visual: '눈사람' }
        ],
        isOpinion: true, // 의견 문항(정답이 하나로 정해지지 않고 이유와 연결)
        correctAnswer: null, // 자기 표현형 선택
        teacherGuide: '학생이 선택한 계절을 확인하고 칭찬해 주세요.'
      },
      {
        id: 'A2',
        instruction: '여름을 좋아하는 친구는 왜 여름을 좋아할까요? 그림을 보고 알맞은 까닭을 골라보세요.',
        audioPrompt: '여름을 좋아하는 까닭 그림을 골라보세요.',
        hint: '여름에는 덥기 때문에 시원한 수박을 먹거나 물놀이를 해요.',
        options: [
          { id: 'opt_1', text: '시원한 물놀이를 할 수 있어서', icon: '🏊‍♂️', visual: '수영' },
          { id: 'opt_2', text: '하얀 눈사람을 만들 수 있어서', icon: '⛄', visual: '눈사람' }
        ],
        isOpinion: false,
        correctAnswer: 'opt_1',
        explanation: '맞아요! 여름에는 덥기 때문에 시원한 바다나 수영장에서 물놀이를 할 수 있어요.'
      },
      {
        id: 'A3',
        instruction: '겨울을 좋아하는 친구의 까닭 그림을 골라보세요.',
        audioPrompt: '겨울을 좋아하는 까닭 그림을 골라보세요.',
        hint: '겨울에는 하늘에서 하얀 눈이 내려요.',
        options: [
          { id: 'opt_1', text: '예쁜 꽃이 많이 피어서', icon: '🌷', visual: '꽃' },
          { id: 'opt_2', text: '하얀 눈으로 눈사람을 만들 수 있어서', icon: '⛄', visual: '눈사람' }
        ],
        isOpinion: false,
        correctAnswer: 'opt_2',
        explanation: '참 잘했어요! 겨울에는 눈이 내려서 눈사람을 만들고 썰매를 탈 수 있어요.'
      }
    ]
  },

  // [B형: 낱말 선택형] - 낱말 고르기, 낱말 연결, 빈칸 채우기 (낱말 수준)
  typeB: {
    type: 'B',
    name: 'B형 – 낱말 선택형',
    description: '알맞은 낱말 카드를 골라 생각과 까닭을 짝지어요.',
    targetReading: '낱말 수준',
    items: [
      {
        id: 'B1',
        instruction: '빈칸에 들어갈 알맞은 계절 낱말을 골라보세요.',
        audioPrompt: '빈칸에 들어갈 계절 낱말을 골라보세요.',
        sentencePrefix: '따뜻한 바람이 불고 예쁜 꽃이 피는 계절은 ',
        sentenceBlank: '[ 빈칸 ]',
        sentenceSuffix: ' 입니다.',
        hint: '꽃이 피고 새싹이 돋아나는 계절이에요.',
        options: [
          { id: 'b_opt_1', text: '봄', icon: '🌸' },
          { id: 'b_opt_2', text: '겨울', icon: '❄️' },
          { id: 'b_opt_3', text: '여름', icon: '☀️' }
        ],
        correctAnswer: 'b_opt_1',
        explanation: '정답입니다! 따뜻한 바람과 꽃은 "봄"의 특징이에요.'
      },
      {
        id: 'B2',
        instruction: '생각과 까닭을 나타내는 낱말을 바르게 연결해 보세요.',
        audioPrompt: '생각과 어울리는 까닭 낱말을 골라보세요.',
        questionText: '내 생각: "나는 가을이 가장 좋아!"\n그 까닭으로 알맞은 낱말은 무엇일까요?',
        hint: '가을에는 나무에 단풍이 들고 맛있는 열매가 열려요.',
        options: [
          { id: 'b_opt_1', text: '단풍놀이', icon: '🍁' },
          { id: 'b_opt_2', text: '눈싸움', icon: '❄️' },
          { id: 'b_opt_3', text: '모기 물리기', icon: '🦟' }
        ],
        correctAnswer: 'b_opt_1',
        explanation: '훌륭해요! 가을에는 알록달록 예쁜 단풍놀이를 갈 수 있어서 좋아요.'
      },
      {
        id: 'B3',
        instruction: '어떤 일을 좋아하는 이유를 말할 때 쓰는 낱말을 골라보세요.',
        audioPrompt: '이유를 말할 때 쓰는 낱말을 골라보세요.',
        questionText: '"나는 여름이 좋다. (       ) 시원한 수박을 먹을 수 있기 때문이다."',
        hint: '까닭이나 이유를 설명할 때 쓰는 말이에요.',
        options: [
          { id: 'b_opt_1', text: '왜냐하면', icon: '💡' },
          { id: 'b_opt_2', text: '하지만', icon: '❓' },
          { id: 'b_opt_3', text: '그런데', icon: '➡️' }
        ],
        correctAnswer: 'b_opt_1',
        explanation: '정답입니다! 생각 뒤에 그 까닭을 말할 때는 "왜냐하면 ~ 때문이다"를 사용해요.'
      }
    ]
  },

  // [C형: 문장 완성형] - 문장 틀(틀거리)과 단어 블록을 활용한 표현 (짧은 문장 수준)
  typeC: {
    type: 'C',
    name: 'C형 – 문장 완성형',
    description: '문장 틀에 알맞은 생각을 채워 넣어 멋진 문장을 완성해요.',
    targetReading: '짧은 문장',
    items: [
      {
        id: 'C1',
        instruction: '문장 틀의 빈칸을 채워 내가 좋아하는 계절과 까닭을 완성해 보세요.',
        audioPrompt: '빈칸에 알맞은 카드를 골라 문장을 완성해 보세요.',
        frameTemplate: '나는 {blank1}이(가) 좋다. 왜냐하면 {blank2} 때문이다.',
        blank1Label: '좋아하는 계절',
        blank1Options: ['봄', '여름', '가을', '겨울'],
        blank2Label: '그 까닭(이유)',
        blank2Options: [
          '예쁜 꽃이 피기',
          '시원한 물놀이를 할 수 있기',
          '단풍이 아름답기',
          '하얀 눈사람을 만들 수 있기'
        ],
        hint: '내가 고른 계절과 어울리는 까닭을 짝지어 보세요.',
        isOpinion: true,
        teacherGuide: '자신의 생각을 문장으로 조리 있게 완성하는 연습입니다.'
      },
      {
        id: 'C2',
        instruction: '친구의 의견을 듣고 알맞은 까닭 문장을 완성해 보세요.',
        audioPrompt: '친구의 생각에 어울리는 까닭을 골라 문장을 완성해 보세요.',
        frameTemplate: '민수는 겨울을 좋아한다. 왜냐하면 {blank1} 때문이다.',
        blank1Label: '겨울을 좋아하는 까닭',
        blank1Options: [
          '신나는 썰매를 탈 수 있기',
          '매우 덥고 땀이 나기',
          '수박을 먹기'
        ],
        correctAnswer: '신나는 썰매를 탈 수 있기',
        hint: '겨울에 눈이나 얼음 위에서 즐길 수 있는 놀이를 떠올려보세요.',
        isOpinion: false,
        explanation: '참 잘했어요! 겨울에는 눈썰매를 타며 신나게 놀 수 있어요.'
      }
    ]
  },

  // [D형: 자유 표현형] - 글, 음성(STT), 그림 캔버스로 자유 표현 (문단 / 다양한 의사소통)
  typeD: {
    type: 'D',
    name: 'D형 – 자유 표현형',
    description: '내가 좋아하는 계절과 그 까닭을 글, 말(음성), 또는 그림으로 자유롭게 표현해요.',
    targetReading: '문단 수준 또는 다양한 표현',
    items: [
      {
        id: 'D1',
        instruction: '내가 가장 좋아하는 계절은 무엇이며, 왜 좋아하는지 이야기해 보세요.',
        audioPrompt: '내가 가장 좋아하는 계절과 그 까닭을 자유롭게 표현해 보세요. 글을 써도 좋고, 마이크를 눌러 말하거나 그림을 그려도 좋아요.',
        helperQuestions: [
          '1. 내가 가장 좋아하는 계절은 언제인가요?',
          '2. 그 계절에는 어떤 날씨나 풍경이 나타나나요?',
          '3. 그 계절에 내가 가장 하고 싶은 활동이나 먹고 싶은 음식은 무엇인가요?'
        ],
        sentenceStarters: [
          '내가 가장 좋아하는 계절은 ... 입니다.',
          '왜냐하면 ... 할 수 있기 때문입니다.',
          '그 계절이 되면 나는 ... 하고 싶습니다.'
        ],
        wordBank: ['따뜻한', '시원한', '눈사람', '수영장', '단풍', '나들이', '친구', '행복하다'],
        supports: {
          enableVoice: true,   // 마이크 음성 입력(STT)
          enableDrawing: true, // 그림 그리기 캔버스
          enableText: true     // 텍스트 타이핑
        },
        sampleResponse: '내가 가장 좋아하는 계절은 여름입니다. 왜냐하면 가족들과 함께 바다에 가서 시원한 물놀이를 할 수 있기 때문입니다. 또 달콤한 수박을 먹을 수 있어서 여름이 제일 좋습니다.'
      }
    ]
  }
};

window.DEMO_LESSON = DEMO_LESSON;
window.DEMO_STUDENT_PROFILES = DEMO_STUDENT_PROFILES;
window.DEMO_ACTIVITIES = DEMO_ACTIVITIES;
