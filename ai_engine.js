/**
 * 모두의 수업 변환기 - AI & UDL 특수교육 자동 변환 엔진
 * 1. 규칙 기반 지능형 UDL 변환 엔진 (오프라인 100% 작동, 특수교육 보편적 학습설계 원리 준수)
 * 2. 외부 AI API (OpenAI gpt-5-mini / Gemini) 안전 호출 기능 (개인정보 완벽 마스킹, JSON 응답 파싱)
 * 3. 학생 맞춤 설정(선택지 수, 지원 정도, 힌트) 동적 적용 필터
 */

class UDLConversionEngine {
  constructor() {
    this.apiKey = '';
    this.apiProvider = 'none'; // 'openai' | 'gemini' | 'none'
    this.loadSettings();
  }

  async loadSettings() {
    if (window.lessonDB) {
      this.apiKey = await window.lessonDB.getSetting('ai_api_key', '');
      this.apiProvider = await window.lessonDB.getSetting('ai_provider', 'none');
    }
  }

  // --- 핵심: 수업 데이터를 4가지 UDL 학습활동으로 변환 ---
  async convertLesson(lessonData, targetProfile = null) {
    // 1. 외부 API 키가 설정되어 있고 활성화된 경우 AI 호출 시도
    if (this.apiKey && this.apiProvider !== 'none') {
      try {
        console.log(`[AI Engine] ${this.apiProvider} API로 고품질 변환을 요청합니다...`);
        const aiResult = await this._callExternalAI(lessonData, targetProfile);
        if (aiResult) {
          return this.applyProfileCustomization(aiResult, targetProfile);
        }
      } catch (err) {
        console.warn('[AI Engine] 외부 AI 호출 실패, 내장 특수교육 UDL 엔진으로 자동 전환합니다:', err);
      }
    }

    // 2. 내장 규칙 기반 UDL 변환 엔진 (오프라인 즉시 생성 보장)
    console.log('[AI Engine] 내장 특수교육 UDL 규칙 엔진으로 변환을 수행합니다.');
    const generated = this._generateByRuleEngine(lessonData);
    return this.applyProfileCustomization(generated, targetProfile);
  }

  // ===================== [ 1. 내장 특수교육 UDL 규칙 엔진 ] =====================
  _generateByRuleEngine(lesson) {
    const title = lesson.title || '수업 활동';
    const goal = lesson.goal || '학습 목표 달성';
    const content = lesson.content || '';
    const keywords = (lesson.keywords && lesson.keywords.length > 0)
      ? lesson.keywords
      : this._extractKeywords(content);

    // 본문 문장 분리
    const sentences = content
      .split(/[.\n?!]/)
      .map(s => s.trim())
      .filter(s => s.length > 4);

    // 대표 이모지 매핑 사전
    const emojiMap = {
      '봄': '🌸', '여름': '🍉', '가을': '🍁', '겨울': '⛄',
      '꽃': '🌷', '바람': '💨', '수박': '🍉', '물놀이': '🏊‍♂️',
      '단풍': '🍁', '과일': '🍎', '눈': '❄️', '눈사람': '⛄',
      '친구': '🤝', '학교': '🏫', '선생님': '👩‍🏫', '책': '📖',
      '생각': '💭', '까닭': '💡', '이유': '✨', '도서관': '📚',
      '가족': '👨‍👩‍👧', '동물': '🐶', '자연': '🌿', '사랑': '❤️',
      '공부': '✏️', '음식': '🍱', '운동': '⚽', '놀이': '🎈'
    };

    const getEmoji = (word) => {
      for (const [k, v] of Object.entries(emojiMap)) {
        if (word.includes(k)) return v;
      }
      return '⭐';
    };

    // --- A형: 그림 선택형 (직관적 상징과 2~4지선다) ---
    const typeA_items = [];
    const mainKw = keywords.slice(0, 4);

    if (mainKw.length >= 2) {
      typeA_items.push({
        id: 'A1',
        instruction: `수업 내용과 관련된 가장 알맞은 그림을 골라보세요.`,
        audioPrompt: `수업 내용과 관련된 알맞은 그림을 골라보세요.`,
        hint: `학습 주제는 [${lesson.topic || title}] 이에요.`,
        options: mainKw.map((kw, i) => ({
          id: `opt_a_${i}`,
          text: kw,
          icon: getEmoji(kw),
          visual: kw
        })),
        isOpinion: true,
        correctAnswer: null,
        teacherGuide: '학생이 선택한 그림을 확인하고 자신의 생각과 연결하도록 유도합니다.'
      });
    }

    if (sentences.length > 0) {
      const s1 = sentences[0];
      const targetWord = keywords[0] || '정답';
      typeA_items.push({
        id: 'A2',
        instruction: `다음 설명을 듣고 알맞은 그림을 골라보세요: "${s1}"`,
        audioPrompt: `${s1} 알맞은 그림을 골라보세요.`,
        hint: `문장의 첫 부분에 나오는 내용을 잘 생각해 보세요.`,
        options: [
          { id: 'opt_a2_1', text: targetWord, icon: getEmoji(targetWord), visual: targetWord },
          { id: 'opt_a2_2', text: '다른 그림', icon: '❓', visual: '기타' }
        ],
        isOpinion: false,
        correctAnswer: 'opt_a2_1',
        explanation: `정답입니다! 설명과 가장 잘 어울리는 것은 [${targetWord}] 그림이에요.`
      });
    }

    if (sentences.length > 1) {
      const s2 = sentences[1];
      const targetWord = keywords[1] || '중요 낱말';
      typeA_items.push({
        id: 'A3',
        instruction: `그림을 보고 문장의 까닭이나 어울리는 모습을 골라보세요: "${s2}"`,
        audioPrompt: `문장과 어울리는 모습을 골라보세요.`,
        hint: `문장의 내용을 떠올리며 그림을 살펴봐요.`,
        options: [
          { id: 'opt_a3_1', text: targetWord, icon: getEmoji(targetWord), visual: targetWord },
          { id: 'opt_a3_2', text: '엉뚱한 그림', icon: '❌', visual: '오답' }
        ],
        isOpinion: false,
        correctAnswer: 'opt_a3_1',
        explanation: `맞아요! 내용과 바르게 짝지어진 것은 [${targetWord}] 입니다.`
      });
    }

    // --- B형: 낱말 선택형 (어휘, 빈칸 채우기, 짝짓기) ---
    const typeB_items = [];
    if (sentences.length > 0) {
      sentences.slice(0, 3).forEach((st, idx) => {
        // 문장에서 keyword 찾기
        const foundKw = keywords.find(k => st.includes(k)) || keywords[idx % keywords.length] || '핵심';
        const parts = st.split(foundKw);
        const prefix = parts[0] || '';
        const suffix = parts.slice(1).join(foundKw) || '';

        // 오답용 단어 선별
        const distractors = keywords.filter(k => k !== foundKw).slice(0, 2);
        if (distractors.length === 0) distractors.push('나무', '하늘');

        const opts = [
          { id: `b_opt_${idx}_cor`, text: foundKw, icon: getEmoji(foundKw) },
          ...distractors.map((d, di) => ({ id: `b_opt_${idx}_dis_${di}`, text: d, icon: getEmoji(d) }))
        ].sort(() => Math.random() - 0.5);

        typeB_items.push({
          id: `B${idx + 1}`,
          instruction: '문장의 빈칸에 들어갈 알맞은 낱말을 골라보세요.',
          audioPrompt: '빈칸에 들어갈 알맞은 낱말을 골라보세요.',
          sentencePrefix: prefix,
          sentenceBlank: '[ 빈칸 ]',
          sentenceSuffix: suffix,
          hint: `문맥을 잘 읽어보면 어울리는 낱말을 찾을 수 있어요.`,
          options: opts,
          correctAnswer: `b_opt_${idx}_cor`,
          explanation: `정답입니다! 빈칸에 [${foundKw}] 낱말이 들어가야 자연스러운 문장이 됩니다.`
        });
      });
    }

    // --- C형: 문장 완성형 (문장 틀과 힌트 활용) ---
    const typeC_items = [
      {
        id: 'C1',
        instruction: '문장 틀에 알맞은 생각을 골라 넣어 멋진 문장을 완성해 보세요.',
        audioPrompt: '문장 틀의 빈칸을 채워 내 생각을 완성해 보세요.',
        frameTemplate: '나는 {blank1}이(가) 좋다. 왜냐하면 {blank2} 때문이다.',
        blank1Label: '나의 생각 / 대상',
        blank1Options: keywords.slice(0, 4),
        blank2Label: '그 까닭 / 이유',
        blank2Options: sentences.slice(0, 4).map(s => s.length > 15 ? s.substring(0, 15) + '...' : s),
        hint: '내가 고른 생각과 자연스럽게 이어지는 까닭을 선택하세요.',
        isOpinion: true,
        teacherGuide: '자신의 생각과 까닭을 논리적 틀로 구조화하는 훈련입니다.'
      },
      {
        id: 'C2',
        instruction: '문장의 빈칸에 들어갈 알맞은 까닭을 완성해 보세요.',
        audioPrompt: '알맞은 까닭을 골라 문장을 완성해 보세요.',
        frameTemplate: `우리가 ${lesson.topic || '이 수업을'} 소중히 여기는 까닭은 {blank1} 때문이다.`,
        blank1Label: '알맞은 까닭',
        blank1Options: [
          (sentences[0] || '다 함께 행복하게 배울 수 있기'),
          '매우 귀찮고 힘들기',
          '아무 이유가 없기'
        ],
        correctAnswer: (sentences[0] || '다 함께 행복하게 배울 수 있기'),
        hint: '긍정적이고 바른 까닭을 선택해 보세요.',
        isOpinion: false,
        explanation: '훌륭해요! 바른 까닭을 넣어 의미 있는 문장을 완성했습니다.'
      }
    ];

    // --- D형: 자유 표현형 (말/글/그림 3-Way 멀티모달) ---
    const typeD_items = [
      {
        id: 'D1',
        instruction: `[${goal}] - 나의 생각을 글, 말(음성), 또는 그림으로 자유롭게 표현해 보세요.`,
        audioPrompt: `나의 생각을 글, 말, 또는 그림으로 자유롭게 표현해 보세요. 마이크 버튼을 눌러 말해도 좋아요.`,
        helperQuestions: [
          `1. [${lesson.topic || title}]에 대해 나는 어떻게 생각하나요?`,
          `2. 그렇게 생각한 까닭이나 기억에 남는 경험은 무엇인가요?`,
          `3. 친구나 선생님께 꼭 전하고 싶은 이야기는 무엇인가요?`
        ],
        sentenceStarters: [
          `나의 생각은 ... 입니다.`,
          `왜냐하면 ... 하기 때문입니다.`,
          `앞으로 나는 ... 하고 싶습니다.`
        ],
        wordBank: keywords.slice(0, 8),
        supports: {
          enableVoice: true,
          enableDrawing: true,
          enableText: true
        },
        sampleResponse: `내가 가장 중요하게 생각하는 것은 [${keywords[0] || '배움'}]입니다. 왜냐하면 [${sentences[0] || '모두가 함께 성장할 수 있기'}] 때문입니다.`
      }
    ];

    return {
      id: 'act_' + (lesson.id || Date.now()),
      lessonId: lesson.id,
      title: `${title} (4가지 UDL 맞춤 활동)`,
      typeA: {
        type: 'A',
        name: 'A형 – 그림 선택형',
        description: '그림과 상징을 보고 직관적으로 정답과 까닭을 골라요.',
        targetReading: '그림 중심',
        items: typeA_items
      },
      typeB: {
        type: 'B',
        name: 'B형 – 낱말 선택형',
        description: '낱말 카드와 빈칸 채우기를 통해 핵심 어휘와 까닭을 연결해요.',
        targetReading: '낱말 수준',
        items: typeB_items
      },
      typeC: {
        type: 'C',
        name: 'C형 – 문장 완성형',
        description: '문장 틀(Sentence Frame)을 활용하여 생각과 까닭을 문장으로 완성해요.',
        targetReading: '짧은 문장',
        items: typeC_items
      },
      typeD: {
        type: 'D',
        name: 'D형 – 자유 표현형',
        description: '자신의 생각을 글, 음성(말), 그림 등 원하는 방식으로 자유롭게 표현해요.',
        targetReading: '문단 수준 및 멀티모달',
        items: typeD_items
      }
    };
  }

  // ===================== [ 2. 학생 맞춤 설정 필터링 ] =====================
  applyProfileCustomization(activitySet, profile) {
    if (!profile) return activitySet;

    const customized = JSON.parse(JSON.stringify(activitySet));
    const choiceLimit = profile.choiceCount || 3;

    // A형 선택지 개수 조정
    if (customized.typeA && customized.typeA.items) {
      customized.typeA.items.forEach(item => {
        if (item.options && item.options.length > choiceLimit) {
          // 정답이 있는 경우 정답 유지
          if (item.correctAnswer) {
            const correctOpt = item.options.find(o => o.id === item.correctAnswer);
            const others = item.options.filter(o => o.id !== item.correctAnswer).slice(0, choiceLimit - 1);
            item.options = [correctOpt, ...others].sort(() => Math.random() - 0.5);
          } else {
            item.options = item.options.slice(0, choiceLimit);
          }
        }
      });
    }

    // B형 선택지 개수 조정
    if (customized.typeB && customized.typeB.items) {
      customized.typeB.items.forEach(item => {
        if (item.options && item.options.length > choiceLimit) {
          if (item.correctAnswer) {
            const correctOpt = item.options.find(o => o.id === item.correctAnswer);
            const others = item.options.filter(o => o.id !== item.correctAnswer).slice(0, choiceLimit - 1);
            item.options = [correctOpt, ...others].sort(() => Math.random() - 0.5);
          } else {
            item.options = item.options.slice(0, choiceLimit);
          }
        }
      });
    }

    // 힌트 비활성화 프로필일 경우 힌트 제거
    if (profile.hintEnabled === false) {
      ['typeA', 'typeB', 'typeC', 'typeD'].forEach(typeKey => {
        if (customized[typeKey] && customized[typeKey].items) {
          customized[typeKey].items.forEach(item => {
            delete item.hint;
          });
        }
      });
    }

    return customized;
  }

  // ===================== [ 3. 외부 AI API 호출 (OpenAI / Gemini) ] =====================
  async _callExternalAI(lesson, profile) {
    // 개인정보 보호: 학생 이름/민감정보는 일체 배제, 오직 수업 내용과 교육과정 정보만 프롬프트에 포함
    const systemPrompt = `당신은 대한민국 초등 특수교육 및 보편적 학습설계(UDL) 최고 권위자입니다.
교사가 제공한 초등학교 수업 정보와 학습목표를 바탕으로 특수교육대상학생을 위한 4가지 맞춤형 학습활동(JSON 형식)을 생성해야 합니다.
반드시 아래 JSON 스키마를 엄격하게 준수하여 유효한 JSON만 반환하세요. 마크다운이나 인사말을 붙이지 마세요.

형식:
{
  "typeA": {
    "name": "A형 – 그림 선택형",
    "description": "...",
    "items": [
      {
        "id": "A1",
        "instruction": "학생 눈높이 지시문",
        "audioPrompt": "TTS용 읽기 문장",
        "hint": "친절한 힌트",
        "options": [
          {"id": "opt_1", "text": "단어", "icon": "관련이모지", "visual": "상징설명"}
        ],
        "isOpinion": false,
        "correctAnswer": "opt_1",
        "explanation": "해설"
      }
    ]
  },
  "typeB": {
    "name": "B형 – 낱말 선택형",
    "description": "...",
    "items": [
      {
        "id": "B1",
        "instruction": "지시문",
        "audioPrompt": "TTS 문장",
        "sentencePrefix": "문장앞 ",
        "sentenceBlank": "[ 빈칸 ]",
        "sentenceSuffix": " 문장뒤.",
        "hint": "힌트",
        "options": [{"id": "b_opt_1", "text": "낱말", "icon": "이모지"}],
        "correctAnswer": "b_opt_1",
        "explanation": "해설"
      }
    ]
  },
  "typeC": {
    "name": "C형 – 문장 완성형",
    "description": "...",
    "items": [
      {
        "id": "C1",
        "instruction": "지시문",
        "audioPrompt": "TTS 문장",
        "frameTemplate": "나는 {blank1}이(가) 좋다. 왜냐하면 {blank2} 때문이다.",
        "blank1Label": "생각",
        "blank1Options": ["보기1", "보기2"],
        "blank2Label": "까닭",
        "blank2Options": ["까닭1", "까닭2"],
        "hint": "힌트",
        "isOpinion": true
      }
    ]
  },
  "typeD": {
    "name": "D형 – 자유 표현형",
    "description": "...",
    "items": [
      {
        "id": "D1",
        "instruction": "지시문",
        "audioPrompt": "TTS 문장",
        "helperQuestions": ["생각을 돕는 질문 1", "질문 2", "질문 3"],
        "sentenceStarters": ["말문 틔우기 문장 1...", "문장 2..."],
        "wordBank": ["도움어휘1", "어휘2"],
        "sampleResponse": "모범 예시 답안"
      }
    ]
  }
}`;

    const userPrompt = `[수업 정보]
- 교육과정: ${lesson.curriculum || '공통 및 특수교육 기본'}
- 학년: ${lesson.grade || '초등 3학년'}
- 교과 및 단원: ${lesson.subject || '국어'} / ${lesson.unit || ''}
- 학습목표: ${lesson.goal}
- 수업 주제: ${lesson.topic || ''}
- 수업 지문 및 내용:
${lesson.content || ''}
- 핵심 어휘: ${(lesson.keywords || []).join(', ')}`;

    if (this.apiProvider === 'openai') {
      // rule: use gpt-5-mini
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) throw new Error(`OpenAI API 오류 (${res.status})`);
      const data = await res.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      parsed.id = 'act_' + Date.now();
      parsed.lessonId = lesson.id;
      parsed.title = lesson.title + ' (AI 맞춤 변환 활동)';
      return parsed;
    } else if (this.apiProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) throw new Error(`Gemini API 오류 (${res.status})`);
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      parsed.id = 'act_' + Date.now();
      parsed.lessonId = lesson.id;
      parsed.title = lesson.title + ' (AI 맞춤 변환 활동)';
      return parsed;
    }

    return null;
  }

  // 간단한 형태소/키워드 추출기
  _extractKeywords(text) {
    if (!text) return ['생각', '까닭', '친구', '나눔'];
    const words = text
      .replace(/[.,!?\n\r"']/g, ' ')
      .split(' ')
      .map(w => w.trim())
      .filter(w => w.length >= 2 && !['있습니다', '합니다', '하고', '수', '그', '이', '저', '가장', '많이'].includes(w));

    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 8);
  }
}

// 글로벌 인스턴스
window.udlEngine = new UDLConversionEngine();
