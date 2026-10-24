/**
 * 모두의 수업 변환기 (Universal Lesson Converter) - 메인 애플리케이션 컨트롤러
 * - 초등 특수교육 & UDL 기반 수업 변환, 편집, 학생 학습, 결과 분석, 인쇄 관리
 */

// ==========================================================================
// 1. 애플리케이션 상태 (State)
// ==========================================================================
const AppState = {
  currentTab: 'home', // 'home' | 'create' | 'profiles' | 'ai' | 'editor' | 'results' | 'print'
  currentLesson: null,
  currentActivities: null,
  selectedProfileId: null,
  currentEditingType: 'A', // 'A' | 'B' | 'C' | 'D'
  isTeacherAuth: true,
  settings: {
    teacherPin: '1234',
    fontSize: 'medium', // 'normal' | 'medium' | 'large'
    highContrast: false,
    speechRate: 0.85
  },
  // 학생 플레이어 상태
  player: {
    active: false,
    activityType: 'A',
    items: [],
    currentIndex: 0,
    answers: {},
    score: 0,
    startTime: null,
    studentCode: '꿈나무-01',
    supportGiven: '부분적 지원',
    teacherNote: ''
  }
};

// ==========================================================================
// 2. 초기화 (Init)
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌈 모두의 수업 변환기 초기화 시작...');

  // 1. 데이터베이스 초기화 및 데모 데이터 주입
  await initDatabaseWithDemo();

  // 2. 접근성 설정 복원
  initAccessibility();

  // 3. UI 이벤트 리스너 등록
  bindGlobalEvents();

  // 4. 초기 화면(홈) 렌더링
  await renderHomeScreen();
  await ProfileModule.loadProfilesDropdown();

  console.log('✨ 모두의 수업 변환기 준비 완료!');
});

// 데모 데이터가 DB에 없으면 자동 주입
async function initDatabaseWithDemo() {
  if (!window.lessonDB) return;
  const lessons = await window.lessonDB.getAllLessons();
  if (lessons.length === 0) {
    console.log('초기 데모 데이터를 로드합니다 (초등 3학년 국어)...');
    await window.lessonDB.saveLesson(window.DEMO_LESSON);
    for (const prof of window.DEMO_STUDENT_PROFILES) {
      await window.lessonDB.saveStudentProfile(prof);
    }
    await window.lessonDB.saveActivities(window.DEMO_ACTIVITIES);
  }
  // 현재 작업 수업을 데모 수업으로 기본 설정
  AppState.currentLesson = await window.lessonDB.getLesson('lesson_demo_korean_grade3') || (await window.lessonDB.getAllLessons())[0];
  if (AppState.currentLesson) {
    const acts = await window.lessonDB.getActivitiesByLesson(AppState.currentLesson.id);
    AppState.currentActivities = acts[0] || window.DEMO_ACTIVITIES;
  }
}

// ==========================================================================
// 3. 네비게이션 및 탭 전환 (Router)
// ==========================================================================
function switchTab(tabId) {
  AppState.currentTab = tabId;

  // 탭 버튼 활성화 처리
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // 탭 뷰 활성화 처리
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabId}`);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 탭별 데이터 리프레시
  if (tabId === 'home') renderHomeScreen();
  if (tabId === 'create') renderCreateScreen();
  if (tabId === 'profiles') ProfileModule.renderProfileList();
  if (tabId === 'ai') renderAIPreviewScreen();
  if (tabId === 'editor') EditorModule.renderEditor();
  if (tabId === 'results') ResultModule.renderResults();
  if (tabId === 'print') PrintModule.preparePrintPreview();
}

// ==========================================================================
// 4. 접근성 및 UI 컨트롤 (AccessModule)
// ==========================================================================
function initAccessibility() {
  const savedSize = localStorage.getItem('ulc_font_size') || 'medium';
  const savedContrast = localStorage.getItem('ulc_high_contrast') === 'true';

  setFontSize(savedSize);
  setHighContrast(savedContrast);
  updateMuteIcon();
}

function setFontSize(size) {
  AppState.settings.fontSize = size;
  document.body.classList.remove('font-size-normal', 'font-size-medium', 'font-size-large');
  document.body.classList.add(`font-size-${size}`);
  localStorage.setItem('ulc_font_size', size);

  document.querySelectorAll('.btn-font-size').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
}

function setHighContrast(enable) {
  AppState.settings.highContrast = enable;
  document.body.classList.toggle('high-contrast', enable);
  localStorage.setItem('ulc_high_contrast', enable ? 'true' : 'false');
  const btn = document.getElementById('btn-toggle-contrast');
  if (btn) btn.classList.toggle('active', enable);
}

function toggleMute() {
  const isMuted = window.audioController.toggleMute();
  updateMuteIcon();
  showToast(isMuted ? '음소거되었습니다.' : '소리가 켜졌습니다.', 'info');
}

function updateMuteIcon() {
  const btn = document.getElementById('btn-toggle-mute');
  if (btn) {
    const isMuted = window.audioController.isMuted;
    btn.innerHTML = isMuted ? '🔇 <span class="sr-only">음소거 해제</span>' : '🔊 <span class="sr-only">음소거</span>';
    btn.title = isMuted ? '소리 켜기' : '음소거';
  }
}

// ==========================================================================
// 5. 홈 대시보드 (HomeScreen)
// ==========================================================================
async function renderHomeScreen() {
  const lessons = await window.lessonDB.getAllLessons();
  const profiles = await window.lessonDB.getAllStudentProfiles();
  const results = await window.lessonDB.getAllResults();

  // 통계 업데이트
  const statLessonCount = document.getElementById('stat-lesson-count');
  const statProfileCount = document.getElementById('stat-profile-count');
  const statResultCount = document.getElementById('stat-result-count');

  if (statLessonCount) statLessonCount.textContent = `${lessons.length}개`;
  if (statProfileCount) statProfileCount.textContent = `${profiles.length}명`;
  if (statResultCount) statResultCount.textContent = `${results.length}회`;

  // 저장된 수업 목록 렌더링
  const listContainer = document.getElementById('home-lesson-list');
  if (!listContainer) return;

  if (lessons.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <p class="text-4xl mb-3">📚</p>
        <p class="text-lg font-bold text-slate-700">등록된 수업이 없습니다.</p>
        <p class="text-sm text-slate-500 mb-4">[새 수업 만들기] 버튼을 눌러 첫 번째 특수교육 맞춤 수업을 만들어보세요.</p>
        <button class="btn btn-primary" onclick="switchTab('create')">➕ 새 수업 만들기</button>
      </div>`;
    return;
  }

  listContainer.innerHTML = lessons.map(l => {
    const isCurrent = AppState.currentLesson && AppState.currentLesson.id === l.id;
    return `
      <div class="lesson-item-card card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-2 ${isCurrent ? 'border-blue-400 bg-blue-50/30' : 'border-slate-100'} hover:border-blue-300 transition-all">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="badge bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold">${escapeHtml(l.curriculum || '공통/기본')}</span>
            <span class="badge bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-bold">${escapeHtml(l.grade || '초등')}</span>
            <span class="badge bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold">${escapeHtml(l.subject || '국어')}</span>
            ${isCurrent ? '<span class="badge bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-extrabold">현재 선택됨</span>' : ''}
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1 cursor-pointer hover:text-blue-600" onclick="selectCurrentLesson('${l.id}')">
            ${escapeHtml(l.title)}
          </h3>
          <p class="text-sm text-slate-600 line-clamp-1 mb-1">
            <strong>학습목표:</strong> ${escapeHtml(l.goal || '목표 미지정')}
          </p>
          <div class="text-xs text-slate-400">
            수정일: ${new Date(l.updatedAt).toLocaleDateString('ko-KR')} | 키워드: ${(l.keywords || []).slice(0, 4).join(', ')}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button class="btn btn-sm btn-primary" onclick="selectAndConvertLesson('${l.id}')" title="AI 활동 변환 및 학생용 실행">
            🪄 활동 변환/실행
          </button>
          <button class="btn btn-sm btn-secondary" onclick="editLessonInfo('${l.id}')" title="수업 내용 수정">
            ✏️ 수정
          </button>
          <button class="btn btn-sm btn-outline" onclick="duplicateLesson('${l.id}')" title="수업 복제">
            📑 복제
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteLessonConfirm('${l.id}')" title="수업 삭제">
            🗑️ 삭제
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 수업 선택
async function selectCurrentLesson(lessonId) {
  const lesson = await window.lessonDB.getLesson(lessonId);
  if (lesson) {
    AppState.currentLesson = lesson;
    const acts = await window.lessonDB.getActivitiesByLesson(lesson.id);
    AppState.currentActivities = acts[0] || null;
    showToast(`'${lesson.title}' 수업이 선택되었습니다.`, 'success');
    renderHomeScreen();
  }
}

// 수업 선택 후 변환 탭으로 바로 이동
async function selectAndConvertLesson(lessonId) {
  await selectCurrentLesson(lessonId);
  switchTab('ai');
}

// ==========================================================================
// 6. 수업 생성 및 수정 화면 (CreateScreen)
// ==========================================================================
function renderCreateScreen(lesson = null) {
  const target = lesson || {
    id: '',
    title: '',
    curriculum: '공통 및 특수교육 기본 연계',
    grade: '초등 3학년',
    subject: '국어',
    unit: '',
    goal: '',
    topic: '',
    content: '',
    keywords: []
  };

  const form = document.getElementById('lesson-form');
  if (!form) return;

  document.getElementById('input-lesson-id').value = target.id;
  document.getElementById('input-lesson-title').value = target.title;
  document.getElementById('input-lesson-curriculum').value = target.curriculum;
  document.getElementById('input-lesson-grade').value = target.grade;
  document.getElementById('input-lesson-subject').value = target.subject;
  document.getElementById('input-lesson-unit').value = target.unit;
  document.getElementById('input-lesson-goal').value = target.goal;
  document.getElementById('input-lesson-topic').value = target.topic;
  document.getElementById('input-lesson-content').value = target.content;
  document.getElementById('input-lesson-keywords').value = (target.keywords || []).join(', ');

  const titleEl = document.getElementById('create-screen-title');
  if (titleEl) {
    titleEl.textContent = target.id ? '✏️ 수업 정보 수정' : '➕ 새 수업 만들기';
  }
}

async function editLessonInfo(lessonId) {
  const lesson = await window.lessonDB.getLesson(lessonId);
  if (lesson) {
    renderCreateScreen(lesson);
    switchTab('create');
  }
}

async function handleLessonFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('input-lesson-id').value.trim();
  const title = document.getElementById('input-lesson-title').value.trim();
  const curriculum = document.getElementById('input-lesson-curriculum').value;
  const grade = document.getElementById('input-lesson-grade').value;
  const subject = document.getElementById('input-lesson-subject').value;
  const unit = document.getElementById('input-lesson-unit').value.trim();
  const goal = document.getElementById('input-lesson-goal').value.trim();
  const topic = document.getElementById('input-lesson-topic').value.trim();
  const content = document.getElementById('input-lesson-content').value.trim();
  const rawKw = document.getElementById('input-lesson-keywords').value.trim();

  if (!title || !goal) {
    showToast('수업 제목과 학습목표는 필수 입력 사항입니다.', 'warning');
    return;
  }

  const keywords = rawKw
    ? rawKw.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  const lessonData = {
    id: id || ('lesson_' + Date.now()),
    title,
    curriculum,
    grade,
    subject,
    unit,
    goal,
    topic,
    content,
    keywords
  };

  await window.lessonDB.saveLesson(lessonData);
  AppState.currentLesson = lessonData;

  showToast(`수업 [${title}]이(가) 저장되었습니다! AI 변환을 시작합니다.`, 'success');
  switchTab('ai');
  triggerAIConversion();
}

async function duplicateLesson(lessonId) {
  const original = await window.lessonDB.getLesson(lessonId);
  if (!original) return;

  const duplicated = JSON.parse(JSON.stringify(original));
  duplicated.id = 'lesson_' + Date.now();
  duplicated.title = `${original.title} (사본)`;
  duplicated.createdAt = new Date().toISOString();
  duplicated.updatedAt = duplicated.createdAt;

  await window.lessonDB.saveLesson(duplicated);
  showToast(`수업 '${original.title}'이(가) 복제되었습니다.`, 'success');
  renderHomeScreen();
}

async function deleteLessonConfirm(lessonId) {
  const lesson = await window.lessonDB.getLesson(lessonId);
  if (!lesson) return;

  if (confirm(`정말로 [${lesson.title}] 수업을 삭제하시겠습니까?\n연계된 활동 자료도 함께 삭제됩니다.`)) {
    await window.lessonDB.deleteLesson(lessonId);
    if (AppState.currentLesson && AppState.currentLesson.id === lessonId) {
      const all = await window.lessonDB.getAllLessons();
      AppState.currentLesson = all[0] || null;
    }
    showToast('수업이 안전하게 삭제되었습니다.', 'info');
    renderHomeScreen();
  }
}

// ==========================================================================
// 7. AI 학습활동 자동 변환 (AIConversionModule)
// ==========================================================================
async function triggerAIConversion() {
  if (!AppState.currentLesson) {
    showToast('변환할 수업을 먼저 선택하거나 생성해 주세요.', 'warning');
    switchTab('create');
    return;
  }

  const statusWrap = document.getElementById('ai-conversion-status');
  if (statusWrap) {
    statusWrap.style.display = 'block';
    statusWrap.scrollIntoView({ behavior: 'smooth' });
  }

  try {
    // 선택된 학생 프로필 가져오기
    let targetProfile = null;
    if (AppState.selectedProfileId) {
      const profiles = await window.lessonDB.getAllStudentProfiles();
      targetProfile = profiles.find(p => p.id === AppState.selectedProfileId) || null;
    }

    // UDL 변환 실행
    const result = await window.udlEngine.convertLesson(AppState.currentLesson, targetProfile);
    result.lessonId = AppState.currentLesson.id;
    await window.lessonDB.saveActivities(result);
    AppState.currentActivities = result;

    if (statusWrap) statusWrap.style.display = 'none';

    window.audioController.playPopSound();
    showToast('4가지 특수교육 맞춤 학습활동이 성공적으로 변환되었습니다! 🎉', 'success');
    renderAIPreviewScreen();
  } catch (err) {
    console.error('AI 변환 오류:', err);
    if (statusWrap) statusWrap.style.display = 'none';
    showToast('변환 중 오류가 발생했습니다. 수동 편집 모드로 전환합니다.', 'warning');
    EditorModule.renderEditor();
    switchTab('editor');
  }
}

function renderAIPreviewScreen() {
  const lesson = AppState.currentLesson;
  const acts = AppState.currentActivities;

  const headerTitle = document.getElementById('ai-view-lesson-title');
  const headerGoal = document.getElementById('ai-view-lesson-goal');
  if (headerTitle && lesson) headerTitle.textContent = lesson.title;
  if (headerGoal && lesson) headerGoal.textContent = `학습목표: ${lesson.goal}`;

  const container = document.getElementById('ai-activities-container');
  if (!container) return;

  if (!acts) {
    container.innerHTML = `
      <div class="text-center p-8 bg-white rounded-2xl border-2 border-dashed border-blue-200">
        <p class="text-4xl mb-3">🪄</p>
        <p class="text-lg font-bold text-slate-700">생성된 활동 자료가 없습니다.</p>
        <p class="text-sm text-slate-500 mb-4">[활동 자동 변환 시작] 버튼을 누르면 UDL 원리에 맞춰 4가지 활동이 즉시 생성됩니다.</p>
        <button class="btn btn-primary" onclick="triggerAIConversion()">⚡ 지금 바로 변환하기</button>
      </div>`;
    return;
  }

  const types = [
    { key: 'typeA', data: acts.typeA, color: 'type-badge-a', cardClass: 'type-a-card', icon: '🖼️', target: '그림 중심 / 많은 지원' },
    { key: 'typeB', data: acts.typeB, color: 'type-badge-b', cardClass: 'type-b-card', icon: '🔤', target: '낱말 수준 / 부분적 지원' },
    { key: 'typeC', data: acts.typeC, color: 'type-badge-c', cardClass: 'type-c-card', icon: '📝', target: '짧은 문장 / 최소 지원' },
    { key: 'typeD', data: acts.typeD, color: 'type-badge-d', cardClass: 'type-d-card', icon: '🎨', target: '문단 수준 / 자율 표현' }
  ];

  container.innerHTML = `
    <div class="activities-grid">
      ${types.map(t => {
        const d = t.data || { name: t.key, items: [] };
        const itemCount = (d.items || []).length;
        return `
          <div class="activity-card ${t.cardClass}">
            <div class="activity-card-header">
              <span class="type-badge ${t.color}">${t.icon} ${escapeHtml(d.name || t.key)}</span>
              <span class="text-xs text-slate-500 font-bold">${itemCount}문항</span>
            </div>
            <div class="activity-card-body">
              <h3 class="text-base font-bold text-slate-800">${escapeHtml(d.name)}</h3>
              <p class="text-xs text-slate-500 mb-3">${escapeHtml(d.description || '학습 수준별 맞춤 활동')}</p>
              <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 mb-4">
                🎯 <strong>권장 대상:</strong> ${t.target}
              </div>
            </div>
            <div class="activity-card-footer">
              <button class="btn btn-sm btn-primary flex-1" onclick="startStudentPlayer('${t.key[4]}')">
                ▶️ 학생 실행
              </button>
              <button class="btn btn-sm btn-secondary" onclick="openEditorForType('${t.key[4]}')">
                ✏️ 수정
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ==========================================================================
// 8. 교사용 편집 모듈 (EditorModule)
// ==========================================================================
const EditorModule = {
  currentType: 'A',

  renderEditor() {
    this.currentType = AppState.currentEditingType || 'A';
    const acts = AppState.currentActivities;
    if (!acts) {
      document.getElementById('editor-content-area').innerHTML = `
        <div class="text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <p class="text-4xl mb-2">✏️</p>
          <p class="text-slate-600 font-bold mb-3">편집할 활동 데이터가 없습니다.</p>
          <button class="btn btn-primary" onclick="switchTab('ai')">AI 활동 변환 화면으로 이동</button>
        </div>`;
      return;
    }

    // 탭 활성화 스타일
    document.querySelectorAll('.editor-type-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.type === this.currentType);
    });

    const actData = acts[`type${this.currentType}`] || { items: [] };
    const items = actData.items || [];

    const container = document.getElementById('editor-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center justify-between mb-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 class="font-bold text-slate-800 text-lg">${escapeHtml(actData.name || '활동 편집')}</h3>
          <p class="text-xs text-slate-500">${escapeHtml(actData.description || '')}</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-outline" onclick="EditorModule.addItem()">➕ 새 문항 추가</button>
          <button class="btn btn-sm btn-primary" onclick="startStudentPlayer('${this.currentType}')">👁️ 학생 모드로 미리보기</button>
        </div>
      </div>

      <div class="space-y-4" id="editor-items-list">
        ${items.length === 0 ? '<p class="text-slate-400 p-4 text-center">문항이 없습니다. [새 문항 추가]를 눌러보세요.</p>' : ''}
        ${items.map((item, idx) => this.renderItemEditCard(item, idx, items.length)).join('')}
      </div>
    `;
  },

  renderItemEditCard(item, idx, total) {
    const isA = this.currentType === 'A';
    const isB = this.currentType === 'B';
    const isC = this.currentType === 'C';
    const isD = this.currentType === 'D';

    return `
      <div class="card p-5 border-2 border-slate-200 rounded-2xl relative bg-white">
        <div class="flex items-center justify-between border-b pb-3 mb-4">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              ${idx + 1}
            </span>
            <span class="font-bold text-slate-700">문항 ${idx + 1} (${item.id || 'ID'})</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="btn btn-sm btn-secondary" onclick="EditorModule.moveItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="위로 이동">⬆️</button>
            <button class="btn btn-sm btn-secondary" onclick="EditorModule.moveItem(${idx}, 1)" ${idx === total - 1 ? 'disabled' : ''} title="아래로 이동">⬇️</button>
            <button class="btn btn-sm btn-danger" onclick="EditorModule.deleteItem(${idx})" title="문항 삭제">🗑️</button>
          </div>
        </div>

        <!-- 공통 지시문 & TTS 문장 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div class="form-group">
            <label class="form-label text-xs">지시문 (화면 표시)</label>
            <input type="text" class="form-input text-sm" value="${escapeHtml(item.instruction || '')}" onchange="EditorModule.updateField(${idx}, 'instruction', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label text-xs">음성 읽기 문장 (TTS 안내)</label>
            <input type="text" class="form-input text-sm" value="${escapeHtml(item.audioPrompt || '')}" onchange="EditorModule.updateField(${idx}, 'audioPrompt', this.value)" />
          </div>
        </div>

        <!-- 힌트 -->
        <div class="form-group mb-3">
          <label class="form-label text-xs">도움 힌트 (학생 힌트 버튼 클릭 시 표시)</label>
          <input type="text" class="form-input text-sm" value="${escapeHtml(item.hint || '')}" onchange="EditorModule.updateField(${idx}, 'hint', this.value)" />
        </div>

        ${isA ? this.renderTypeAOptions(item, idx) : ''}
        ${isB ? this.renderTypeBOptions(item, idx) : ''}
        ${isC ? this.renderTypeCOptions(item, idx) : ''}
        ${isD ? this.renderTypeDOptions(item, idx) : ''}
      </div>
    `;
  },

  renderTypeAOptions(item, idx) {
    const opts = item.options || [];
    return `
      <div class="mt-4 pt-3 border-t">
        <label class="form-label text-xs mb-2">그림/상징 선택지 목록</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          ${opts.map((opt, oi) => `
            <div class="p-3 border rounded-xl bg-slate-50 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-500">선택지 ${oi + 1}</span>
                <input type="radio" name="opt_cor_${idx}" value="${opt.id}" ${item.correctAnswer === opt.id ? 'checked' : ''} onchange="EditorModule.updateField(${idx}, 'correctAnswer', this.value)" title="정답으로 지정" />
              </div>
              <div class="flex items-center gap-2">
                <input type="text" class="form-input text-center text-lg w-14" value="${escapeHtml(opt.icon || '⭐')}" onchange="EditorModule.updateOptField(${idx}, ${oi}, 'icon', this.value)" title="이모지/상징" />
                <input type="text" class="form-input text-sm flex-1" value="${escapeHtml(opt.text || '')}" onchange="EditorModule.updateOptField(${idx}, ${oi}, 'text', this.value)" placeholder="단어" />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderTypeBOptions(item, idx) {
    const opts = item.options || [];
    return `
      <div class="mt-3 pt-3 border-t">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label text-xs">문장 앞부분</label>
            <input type="text" class="form-input text-sm" value="${escapeHtml(item.sentencePrefix || '')}" onchange="EditorModule.updateField(${idx}, 'sentencePrefix', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label text-xs">빈칸 표시</label>
            <input type="text" class="form-input text-sm" value="${escapeHtml(item.sentenceBlank || '[ 빈칸 ]')}" readonly />
          </div>
          <div class="form-group">
            <label class="form-label text-xs">문장 뒷부분</label>
            <input type="text" class="form-input text-sm" value="${escapeHtml(item.sentenceSuffix || '')}" onchange="EditorModule.updateField(${idx}, 'sentenceSuffix', this.value)" />
          </div>
        </div>
        <label class="form-label text-xs mb-2">낱말 선택지 (정답 지정)</label>
        <div class="flex flex-wrap gap-2">
          ${opts.map((opt, oi) => `
            <div class="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg">
              <input type="radio" name="opt_b_cor_${idx}" value="${opt.id}" ${item.correctAnswer === opt.id ? 'checked' : ''} onchange="EditorModule.updateField(${idx}, 'correctAnswer', this.value)" />
              <input type="text" class="form-input text-xs w-28" value="${escapeHtml(opt.text || '')}" onchange="EditorModule.updateOptField(${idx}, ${oi}, 'text', this.value)" />
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderTypeCOptions(item, idx) {
    return `
      <div class="mt-3 pt-3 border-t">
        <div class="form-group mb-3">
          <label class="form-label text-xs">문장 틀 템플릿 (빈칸은 {blank1}, {blank2} 등으로 표현)</label>
          <input type="text" class="form-input text-sm" value="${escapeHtml(item.frameTemplate || '')}" onchange="EditorModule.updateField(${idx}, 'frameTemplate', this.value)" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label text-xs">첫 번째 빈칸 선택지 (쉼표 구분)</label>
            <input type="text" class="form-input text-sm" value="${escapeHtml((item.blank1Options || []).join(', '))}" onchange="EditorModule.updateArrayField(${idx}, 'blank1Options', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label text-xs">두 번째 빈칸 선택지 (쉼표 구분)</label>
            <input type="text" class="form-input text-sm" value="${escapeHtml((item.blank2Options || []).join(', '))}" onchange="EditorModule.updateArrayField(${idx}, 'blank2Options', this.value)" />
          </div>
        </div>
      </div>
    `;
  },

  renderTypeDOptions(item, idx) {
    return `
      <div class="mt-3 pt-3 border-t">
        <div class="form-group mb-3">
          <label class="form-label text-xs">생각을 돕는 가이드 질문 (줄바꿈 구분)</label>
          <textarea class="form-textarea text-xs" onchange="EditorModule.updateArrayFieldLines(${idx}, 'helperQuestions', this.value)">${escapeHtml((item.helperQuestions || []).join('\n'))}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label text-xs">도우미 낱말 창고 (쉼표 구분)</label>
          <input type="text" class="form-input text-sm" value="${escapeHtml((item.wordBank || []).join(', '))}" onchange="EditorModule.updateArrayField(${idx}, 'wordBank', this.value)" />
        </div>
      </div>
    `;
  },

  updateField(idx, field, val) {
    const act = AppState.currentActivities[`type${this.currentType}`];
    if (act && act.items[idx]) {
      act.items[idx][field] = val;
      this.saveChanges();
    }
  },

  updateOptField(idx, oi, field, val) {
    const act = AppState.currentActivities[`type${this.currentType}`];
    if (act && act.items[idx] && act.items[idx].options[oi]) {
      act.items[idx].options[oi][field] = val;
      this.saveChanges();
    }
  },

  updateArrayField(idx, field, rawStr) {
    const arr = rawStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    this.updateField(idx, field, arr);
  },

  updateArrayFieldLines(idx, field, rawStr) {
    const arr = rawStr.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    this.updateField(idx, field, arr);
  },

  moveItem(idx, dir) {
    const items = AppState.currentActivities[`type${this.currentType}`].items;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[idx];
    items[idx] = items[targetIdx];
    items[targetIdx] = temp;
    this.saveChanges();
    this.renderEditor();
  },

  deleteItem(idx) {
    if (!confirm(`${idx + 1}번 문항을 삭제하시겠습니까?`)) return;
    const items = AppState.currentActivities[`type${this.currentType}`].items;
    items.splice(idx, 1);
    this.saveChanges();
    this.renderEditor();
    showToast('문항이 삭제되었습니다.', 'info');
  },

  addItem() {
    const items = AppState.currentActivities[`type${this.currentType}`].items;
    const newId = `${this.currentType}${items.length + 1}`;
    items.push({
      id: newId,
      instruction: '새로운 학습 문항 지시문을 입력하세요.',
      audioPrompt: '지시문을 읽어주는 문장입니다.',
      hint: '문제를 풀 때 도움이 되는 힌트입니다.',
      options: [
        { id: `opt_${Date.now()}_1`, text: '선택지 1', icon: '🌸' },
        { id: `opt_${Date.now()}_2`, text: '선택지 2', icon: '🍉' }
      ],
      correctAnswer: `opt_${Date.now()}_1`
    });
    this.saveChanges();
    this.renderEditor();
    showToast('새 문항이 추가되었습니다.', 'success');
  },

  async saveChanges() {
    await window.lessonDB.saveActivities(AppState.currentActivities);
  }
};

function openEditorForType(typeChar) {
  AppState.currentEditingType = typeChar;
  switchTab('editor');
  EditorModule.renderEditor();
}

// ==========================================================================
// 9. 학생 전용 학습 뷰어 (PlayerModule)
// ==========================================================================
function startStudentPlayer(typeChar) {
  const acts = AppState.currentActivities;
  if (!acts || !acts[`type${typeChar}`]) {
    showToast('활동 데이터를 먼저 생성해 주세요.', 'warning');
    return;
  }

  const actData = acts[`type${typeChar}`];
  const items = actData.items || [];
  if (items.length === 0) {
    showToast('이 활동에는 문항이 없습니다. 교사 편집기에서 문항을 추가해 주세요.', 'warning');
    return;
  }

  AppState.player = {
    active: true,
    activityType: typeChar,
    name: actData.name,
    items: JSON.parse(JSON.stringify(items)),
    currentIndex: 0,
    answers: {},
    score: 0,
    startTime: Date.now(),
    studentCode: document.getElementById('player-student-select')?.value || '꿈나무-01',
    supportGiven: '부분적 지원',
    teacherNote: ''
  };

  const overlay = document.getElementById('student-player-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  renderPlayerCurrentItem();
}

function closeStudentPlayer() {
  window.audioController.stopSpeaking();
  const overlay = document.getElementById('student-player-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
  AppState.player.active = false;
}

function renderPlayerCurrentItem() {
  const p = AppState.player;
  const item = p.items[p.currentIndex];
  const total = p.items.length;

  // 진행률 바 업데이트
  const progressPercent = Math.round(((p.currentIndex) / total) * 100);
  const fill = document.getElementById('player-progress-fill');
  const text = document.getElementById('player-progress-text');
  if (fill) fill.style.width = `${progressPercent}%`;
  if (text) text.textContent = `${p.currentIndex + 1} / ${total} 단계`;

  // 이전/다음 버튼 상태
  const btnPrev = document.getElementById('player-btn-prev');
  if (btnPrev) btnPrev.style.visibility = p.currentIndex === 0 ? 'hidden' : 'visible';

  // 음성 자동 읽기 (학생 프로필 설정 반영)
  if (item.audioPrompt) {
    window.audioController.speak(item.audioPrompt);
  }

  const body = document.getElementById('player-body-container');
  if (!body) return;

  const isA = p.activityType === 'A';
  const isB = p.activityType === 'B';
  const isC = p.activityType === 'C';
  const isD = p.activityType === 'D';

  let contentHtml = '';
  if (isA) contentHtml = renderPlayerTypeA(item);
  else if (isB) contentHtml = renderPlayerTypeB(item);
  else if (isC) contentHtml = renderPlayerTypeC(item);
  else if (isD) contentHtml = renderPlayerTypeD(item);

  body.innerHTML = `
    <div class="prompt-card">
      <div class="flex items-start justify-between gap-3">
        <h2 class="prompt-instruction">
          <span class="text-blue-600 font-extrabold">${p.currentIndex + 1}.</span>
          ${escapeHtml(item.instruction || '')}
        </h2>
        <button class="btn-tts-speaker" onclick="window.audioController.speak('${escapeJs(item.audioPrompt || item.instruction || '')}')" title="문제 다시 듣기">
          📢
        </button>
      </div>

      ${item.hint ? `
        <div class="hint-box mt-3" id="player-hint-box" style="display:none;">
          <span>💡 <strong>도움 힌트:</strong> ${escapeHtml(item.hint)}</span>
        </div>
      ` : ''}
    </div>

    <!-- 활동별 인터랙션 영역 -->
    ${contentHtml}

    <!-- 피드백 메시지 박스 -->
    <div id="player-feedback-area" style="display:none;"></div>
  `;

  // D형인 경우 캔버스 초기화
  if (isD) {
    initDrawingCanvas();
  }
}

// A형 플레이어 렌더러
function renderPlayerTypeA(item) {
  const p = AppState.player;
  const savedAns = p.answers[item.id];
  const opts = item.options || [];

  return `
    <div class="picture-options-grid">
      ${opts.map(opt => {
        const isSelected = savedAns && savedAns.selected === opt.id;
        return `
          <button class="picture-option-btn ${isSelected ? 'selected' : ''}" onclick="selectPlayerOptionA('${item.id}', '${opt.id}')">
            <span class="opt-icon">${opt.icon || '⭐'}</span>
            <span class="opt-text">${escapeHtml(opt.text || '')}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function selectPlayerOptionA(itemId, optId) {
  const p = AppState.player;
  const item = p.items[p.currentIndex];
  window.audioController.playPopSound();

  const isCorrect = item.correctAnswer ? (item.correctAnswer === optId) : true;
  p.answers[itemId] = {
    selected: optId,
    isCorrect: isCorrect,
    time: Date.now()
  };

  // 피드백 표시
  const fb = document.getElementById('player-feedback-area');
  if (fb) {
    fb.style.display = 'block';
    if (isCorrect) {
      window.audioController.playCorrectSound();
      fb.className = 'feedback-overlay correct';
      fb.innerHTML = `🎉 <strong>참 잘했어요!</strong> ${escapeHtml(item.explanation || '알맞은 그림을 멋지게 골랐습니다!')}`;
      window.audioController.speak('참 잘했어요! 알맞은 그림을 골랐습니다.');
    } else {
      window.audioController.playIncorrectSound();
      fb.className = 'feedback-overlay incorrect';
      fb.innerHTML = `💪 <strong>다시 한번 생각해 볼까요?</strong> 힌트 버튼을 눌러보세요.`;
      window.audioController.speak('다시 한번 생각해 볼까요?');
    }
  }

  // 버튼 스타일 즉시 반영
  document.querySelectorAll('.picture-option-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');
}

// B형 플레이어 렌더러
function renderPlayerTypeB(item) {
  const p = AppState.player;
  const savedAns = p.answers[item.id];
  const opts = item.options || [];
  const selectedText = savedAns ? savedAns.text : '[ 빈칸 ]';

  return `
    <div class="sentence-frame-card text-center">
      <div class="sentence-display">
        ${escapeHtml(item.sentencePrefix || '')}
        <span class="sentence-slot ${savedAns ? 'filled' : ''}">${escapeHtml(selectedText)}</span>
        ${escapeHtml(item.sentenceSuffix || '')}
      </div>

      <div class="word-options-grid mt-6">
        ${opts.map(opt => `
          <button class="word-option-btn ${savedAns && savedAns.selected === opt.id ? 'selected' : ''}" onclick="selectPlayerOptionB('${item.id}', '${opt.id}', '${escapeJs(opt.text)}')">
            <span>${opt.icon || '🏷️'}</span>
            <span>${escapeHtml(opt.text)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function selectPlayerOptionB(itemId, optId, text) {
  const p = AppState.player;
  const item = p.items[p.currentIndex];
  window.audioController.playPopSound();

  const isCorrect = item.correctAnswer ? (item.correctAnswer === optId) : true;
  p.answers[itemId] = {
    selected: optId,
    text: text,
    isCorrect: isCorrect
  };

  renderPlayerCurrentItem();

  const fb = document.getElementById('player-feedback-area');
  if (fb) {
    fb.style.display = 'block';
    if (isCorrect) {
      window.audioController.playCorrectSound();
      fb.className = 'feedback-overlay correct';
      fb.innerHTML = `✨ <strong>정답입니다!</strong> ${escapeHtml(item.explanation || '문장이 자연스럽게 완성되었습니다.')}`;
      window.audioController.speak(`정답입니다! ${text}`);
    } else {
      window.audioController.playIncorrectSound();
      fb.className = 'feedback-overlay incorrect';
      fb.innerHTML = `🧐 <strong>다른 낱말을 골라볼까요?</strong> 문맥을 다시 한번 읽어보세요.`;
      window.audioController.speak('다른 낱말을 골라볼까요?');
    }
  }
}

// C형 플레이어 렌더러
function renderPlayerTypeC(item) {
  const p = AppState.player;
  const savedAns = p.answers[item.id] || { blank1: '', blank2: '' };

  const template = item.frameTemplate || '나는 {blank1}이(가) 좋다. 왜냐하면 {blank2} 때문이다.';
  const renderedSentence = template
    .replace('{blank1}', `<span class="sentence-slot ${savedAns.blank1 ? 'filled' : ''}">${escapeHtml(savedAns.blank1 || '___')}</span>`)
    .replace('{blank2}', `<span class="sentence-slot ${savedAns.blank2 ? 'filled' : ''}">${escapeHtml(savedAns.blank2 || '___')}</span>`);

  return `
    <div class="sentence-frame-card">
      <div class="sentence-display text-center mb-6">
        ${renderedSentence}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
          <p class="text-xs font-bold text-indigo-700 mb-2">① ${escapeHtml(item.blank1Label || '나의 생각')} 선택:</p>
          <div class="flex flex-wrap gap-2">
            ${(item.blank1Options || []).map(opt => `
              <button class="word-option-btn text-sm py-2 px-3 ${savedAns.blank1 === opt ? 'selected' : ''}" onclick="selectPlayerOptionC('${item.id}', 1, '${escapeJs(opt)}')">
                ${escapeHtml(opt)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
          <p class="text-xs font-bold text-indigo-700 mb-2">② ${escapeHtml(item.blank2Label || '그 까닭')} 선택:</p>
          <div class="flex flex-wrap gap-2">
            ${(item.blank2Options || []).map(opt => `
              <button class="word-option-btn text-sm py-2 px-3 ${savedAns.blank2 === opt ? 'selected' : ''}" onclick="selectPlayerOptionC('${item.id}', 2, '${escapeJs(opt)}')">
                ${escapeHtml(opt)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function selectPlayerOptionC(itemId, slotNum, value) {
  const p = AppState.player;
  if (!p.answers[itemId]) p.answers[itemId] = { blank1: '', blank2: '', isCorrect: true };

  window.audioController.playPopSound();
  if (slotNum === 1) p.answers[itemId].blank1 = value;
  if (slotNum === 2) p.answers[itemId].blank2 = value;

  renderPlayerCurrentItem();

  const ans = p.answers[itemId];
  if (ans.blank1 && ans.blank2) {
    window.audioController.playCorrectSound();
    const fb = document.getElementById('player-feedback-area');
    if (fb) {
      fb.style.display = 'block';
      fb.className = 'feedback-overlay correct';
      fb.innerHTML = `🌟 <strong>멋진 문장이 완성되었습니다!</strong> 내 생각과 까닭을 훌륭하게 표현했어요.`;
    }
  }
}

// D형 플레이어 렌더러 (말 / 글 / 그림 3-Way 자유표현)
function renderPlayerTypeD(item) {
  const p = AppState.player;
  const savedAns = p.answers[item.id] || { text: '', hasDrawing: false };

  return `
    <div class="free-expression-card">
      <!-- 말문 틔우기 힌트 낱말 -->
      <div class="mb-4">
        <span class="text-xs font-bold text-slate-500 mr-2">💡 도움 낱말:</span>
        <div class="inline-flex flex-wrap gap-1.5">
          ${(item.wordBank || []).map(w => `
            <span class="cursor-pointer bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold hover:bg-emerald-200" onclick="insertWordToPlayerText('${escapeJs(w)}')">
              + ${escapeHtml(w)}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- 1. 글 & 음성 입력 창 -->
      <div class="form-group mb-4">
        <div class="flex items-center justify-between mb-1.5">
          <label class="form-label text-sm font-bold text-slate-700">✍️ 글이나 말로 생각 표현하기:</label>
          <button id="btn-player-mic" class="btn btn-sm btn-outline" onclick="togglePlayerSTT('${item.id}')">
            🎙️ 마이크로 말하기
          </button>
        </div>
        <textarea id="player-free-textarea" class="form-textarea text-base" rows="3" placeholder="자신의 생각과 그 까닭을 자유롭게 적거나 마이크 버튼을 눌러 말해보세요." oninput="updatePlayerDText('${item.id}', this.value)">${escapeHtml(savedAns.text || '')}</textarea>
      </div>

      <!-- 2. 그림 그리기 캔버스 -->
      <div class="form-group">
        <div class="flex items-center justify-between mb-1">
          <label class="form-label text-sm font-bold text-slate-700">🎨 그림으로 표현하기:</label>
          <button class="btn btn-sm btn-secondary" onclick="clearDrawingCanvas()">🧹 지우기</button>
        </div>
        <div class="canvas-container">
          <canvas id="drawing-canvas"></canvas>
          <div class="canvas-toolbar">
            <span class="text-xs font-bold text-slate-500 mr-2">색상:</span>
            <div class="color-swatch active" style="background:#000000;" onclick="setCanvasColor('#000000', this)"></div>
            <div class="color-swatch" style="background:#ef4444;" onclick="setCanvasColor('#ef4444', this)"></div>
            <div class="color-swatch" style="background:#f59e0b;" onclick="setCanvasColor('#f59e0b', this)"></div>
            <div class="color-swatch" style="background:#10b981;" onclick="setCanvasColor('#10b981', this)"></div>
            <div class="color-swatch" style="background:#3b82f6;" onclick="setCanvasColor('#3b82f6', this)"></div>
            <div class="color-swatch" style="background:#8b5cf6;" onclick="setCanvasColor('#8b5cf6', this)"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updatePlayerDText(itemId, val) {
  const p = AppState.player;
  if (!p.answers[itemId]) p.answers[itemId] = {};
  p.answers[itemId].text = val;
  p.answers[itemId].isCorrect = true;
}

function insertWordToPlayerText(word) {
  const textarea = document.getElementById('player-free-textarea');
  if (textarea) {
    textarea.value = (textarea.value + ' ' + word).trim();
    textarea.focus();
    const item = AppState.player.items[AppState.player.currentIndex];
    updatePlayerDText(item.id, textarea.value);
  }
}

function togglePlayerSTT(itemId) {
  const btn = document.getElementById('btn-player-mic');
  if (!window.audioController.isSTTAvailable()) {
    showToast('이 브라우저는 마이크 음성 인식을 지원하지 않습니다. 키보드로 입력해 주세요.', 'info');
    return;
  }

  if (window.audioController.isListening) {
    window.audioController.stopListening();
    if (btn) btn.innerHTML = '🎙️ 마이크로 말하기';
    showToast('음성 인식을 멈췄습니다.', 'info');
  } else {
    if (btn) btn.innerHTML = '🔴 듣고 있어요... (말씀해 주세요)';
    window.audioController.startListening(
      (transcript, isFinal) => {
        const textarea = document.getElementById('player-free-textarea');
        if (textarea) {
          textarea.value = (textarea.value + ' ' + transcript).trim();
          updatePlayerDText(itemId, textarea.value);
        }
        if (isFinal) {
          if (btn) btn.innerHTML = '🎙️ 마이크로 말하기';
        }
      },
      (err) => {
        showToast(err, 'warning');
        if (btn) btn.innerHTML = '🎙️ 마이크로 말하기';
      },
      () => {
        if (btn) btn.innerHTML = '🎙️ 마이크로 말하기';
      }
    );
  }
}

// 캔버스 그리기 제어
let canvasCtx = null;
let isDrawing = false;
let currentColor = '#000000';

function initDrawingCanvas() {
  const canvas = document.getElementById('drawing-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 260;
  canvasCtx = canvas.getContext('2d');
  canvasCtx.lineCap = 'round';
  canvasCtx.lineJoin = 'round';
  canvasCtx.lineWidth = 4;
  canvasCtx.strokeStyle = currentColor;

  const startDraw = (e) => {
    isDrawing = true;
    const pos = getCanvasPos(e, canvas);
    canvasCtx.beginPath();
    canvasCtx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const pos = getCanvasPos(e, canvas);
    canvasCtx.lineTo(pos.x, pos.y);
    canvasCtx.stroke();
  };

  const stopDraw = () => {
    if (isDrawing) {
      isDrawing = false;
      const item = AppState.player.items[AppState.player.currentIndex];
      if (!AppState.player.answers[item.id]) AppState.player.answers[item.id] = {};
      AppState.player.answers[item.id].hasDrawing = true;
    }
  };

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e.touches[0]); });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
  canvas.addEventListener('touchend', stopDraw);
}

function getCanvasPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  return {
    x: e.clientX - r.left,
    y: e.clientY - r.top
  };
}

function setCanvasColor(color, swatch) {
  currentColor = color;
  if (canvasCtx) canvasCtx.strokeStyle = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  if (swatch) swatch.classList.add('active');
}

function clearDrawingCanvas() {
  const canvas = document.getElementById('drawing-canvas');
  if (canvas && canvasCtx) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// 다음 / 이전 문항 탐색
function playerNextItem() {
  const p = AppState.player;
  window.audioController.playPopSound();
  if (p.currentIndex < p.items.length - 1) {
    p.currentIndex++;
    renderPlayerCurrentItem();
  } else {
    finishStudentPlayer();
  }
}

function playerPrevItem() {
  const p = AppState.player;
  window.audioController.playPopSound();
  if (p.currentIndex > 0) {
    p.currentIndex--;
    renderPlayerCurrentItem();
  }
}

function togglePlayerHint() {
  const hintBox = document.getElementById('player-hint-box');
  if (hintBox) {
    const isHidden = hintBox.style.display === 'none';
    hintBox.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      window.audioController.playPopSound();
      const item = AppState.player.items[AppState.player.currentIndex];
      if (item && item.hint) window.audioController.speak(`힌트: ${item.hint}`);
    }
  }
}

// 학습 완료 처리 및 결과 저장
async function finishStudentPlayer() {
  const p = AppState.player;
  const totalItems = p.items.length;
  let correctCount = 0;

  Object.values(p.answers).forEach(ans => {
    if (ans.isCorrect) correctCount++;
  });

  const durationSec = Math.round((Date.now() - p.startTime) / 1000);
  const scorePercent = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 100;

  // DB에 학습 결과 영구 기록
  const resultRecord = {
    lessonId: AppState.currentLesson ? AppState.currentLesson.id : 'demo',
    lessonTitle: AppState.currentLesson ? AppState.currentLesson.title : '국어 수업',
    studentCode: p.studentCode,
    activityType: p.activityType,
    activityName: p.name,
    totalCount: totalItems,
    correctCount: correctCount,
    score: scorePercent,
    durationSeconds: durationSec,
    supportGiven: p.supportGiven,
    teacherNote: p.teacherNote || '',
    answers: p.answers,
    timestamp: new Date().toISOString()
  };

  await window.lessonDB.saveResult(resultRecord);

  // 축하 팡파르 사운드 및 피드백 화면
  window.audioController.playFanfareSound();

  const body = document.getElementById('player-body-container');
  if (body) {
    body.innerHTML = `
      <div class="celebration-modal card">
        <div class="celebration-trophy mb-4">🏆</div>
        <h2 class="text-3xl font-extrabold text-slate-800 mb-2">모든 활동을 완료했어요!</h2>
        <p class="text-lg text-emerald-600 font-bold mb-6">스스로 해낸 당신이 참 자랑스러워요! 최고예요! 👍</p>

        <div class="inline-grid grid-cols-3 gap-4 max-w-md mx-auto mb-8 bg-slate-50 p-4 rounded-2xl border">
          <div>
            <div class="text-xs text-slate-500 font-bold">참여 학생</div>
            <div class="text-lg font-extrabold text-slate-800">${escapeHtml(p.studentCode)}</div>
          </div>
          <div>
            <div class="text-xs text-slate-500 font-bold">수행 문항</div>
            <div class="text-lg font-extrabold text-blue-600">${totalItems}문항</div>
          </div>
          <div>
            <div class="text-xs text-slate-500 font-bold">소요 시간</div>
            <div class="text-lg font-extrabold text-purple-600">${durationSec}초</div>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <button class="btn btn-secondary btn-lg" onclick="startStudentPlayer('${p.activityType}')">
            🔄 다시 풀기
          </button>
          <button class="btn btn-primary btn-lg" onclick="closeStudentPlayer(); switchTab('results');">
            📊 학습 결과 확인하기
          </button>
        </div>
      </div>
    `;
  }
}

// ==========================================================================
// 10. 학생 맞춤 프로필 관리 모듈 (ProfileModule)
// ==========================================================================
const ProfileModule = {
  async renderProfileList() {
    const profiles = await window.lessonDB.getAllStudentProfiles();
    const container = document.getElementById('profiles-list-container');
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${profiles.map(p => `
          <div class="card p-5 border-2 border-slate-200 rounded-2xl flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="font-extrabold text-lg text-slate-800">${escapeHtml(p.codeName)}</span>
                <span class="badge bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-bold">${escapeHtml(p.supportLevel || '부분 지원')}</span>
              </div>
              <ul class="text-xs text-slate-600 space-y-1.5 mb-4">
                <li>📖 <strong>읽기 수준:</strong> ${escapeHtml(p.readingLevel || '낱말')}</li>
                <li>🗣️ <strong>의사소통:</strong> ${escapeHtml(p.commMode || '그림 선택')}</li>
                <li>🔢 <strong>선택지 개수:</strong> ${p.choiceCount || 3}개</li>
                <li>💡 <strong>도움 힌트:</strong> ${p.hintEnabled ? '제공함' : '숨김'}</li>
                <li>📢 <strong>TTS 자동재생:</strong> ${p.ttsAuto ? '자동' : '클릭'}</li>
              </ul>
            </div>
            <div class="flex gap-2 border-t pt-3">
              <button class="btn btn-sm btn-primary flex-1" onclick="ProfileModule.applyProfileToLesson('${p.id}')">
                🎯 이 학생 맞춤 적용
              </button>
              <button class="btn btn-sm btn-danger" onclick="ProfileModule.deleteProfile('${p.id}')">
                🗑️
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async loadProfilesDropdown() {
    const profiles = await window.lessonDB.getAllStudentProfiles();
    const selects = [
      document.getElementById('ai-target-student-select'),
      document.getElementById('player-student-select')
    ];

    selects.forEach(sel => {
      if (!sel) return;
      sel.innerHTML = profiles.map(p => `
        <option value="${p.id}" ${AppState.selectedProfileId === p.id ? 'selected' : ''}>
          ${escapeHtml(p.codeName)} (${p.readingLevel} / ${p.supportLevel})
        </option>
      `).join('');
    });
  },

  async saveNewProfile(e) {
    e.preventDefault();
    const codeName = document.getElementById('prof-input-code').value.trim();
    const readingLevel = document.getElementById('prof-input-reading').value;
    const commMode = document.getElementById('prof-input-comm').value;
    const supportLevel = document.getElementById('prof-input-support').value;
    const choiceCount = parseInt(document.getElementById('prof-input-choice-count').value, 10) || 3;
    const hintEnabled = document.getElementById('prof-input-hint').checked;
    const ttsAuto = document.getElementById('prof-input-tts').checked;

    if (!codeName) {
      showToast('학생 익명 코드를 입력해 주세요.', 'warning');
      return;
    }

    const newProfile = {
      id: 'student_' + Date.now(),
      codeName,
      readingLevel,
      commMode,
      supportLevel,
      choiceCount,
      hintEnabled,
      ttsAuto
    };

    await window.lessonDB.saveStudentProfile(newProfile);
    showToast(`학생 프로필 [${codeName}]이(가) 저장되었습니다.`, 'success');
    this.renderProfileList();
    this.loadProfilesDropdown();
    document.getElementById('profile-form')?.reset();
  },

  async deleteProfile(id) {
    if (!confirm('학생 프로필을 삭제하시겠습니까?')) return;
    const profiles = await window.lessonDB.getAllStudentProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    // LocalStorage / IndexedDB 반영
    const tx = await window.lessonDB.getStore('student_profiles', 'readwrite');
    if (tx) tx.delete(id);
    else window.lessonDB._lsSet('student_profiles', filtered);

    showToast('프로필이 삭제되었습니다.', 'info');
    this.renderProfileList();
    this.loadProfilesDropdown();
  },

  async applyProfileToLesson(profileId) {
    AppState.selectedProfileId = profileId;
    await this.loadProfilesDropdown();
    showToast('선택한 학생 프로필로 맞춤 설정이 지정되었습니다. 활동 변환을 진행하세요.', 'info');
    switchTab('ai');
  }
};

// ==========================================================================
// 11. 학습 결과 및 분석 모듈 (ResultModule)
// ==========================================================================
const ResultModule = {
  async renderResults() {
    const results = await window.lessonDB.getAllResults();
    const container = document.getElementById('results-table-container');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <p class="text-4xl mb-2">📊</p>
          <p class="text-slate-600 font-bold mb-1">아직 수행된 학습 결과가 없습니다.</p>
          <p class="text-xs text-slate-400">학생 화면에서 활동을 완료하면 이곳에 자동 기록됩니다.</p>
        </div>`;
      return;
    }

    // 통계 차트 렌더링
    this.renderResultChart(results);

    // 테이블 렌더링
    container.innerHTML = `
      <div class="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th class="p-3.5">일시</th>
              <th class="p-3.5">학생 코드</th>
              <th class="p-3.5">수업명</th>
              <th class="p-3.5">활동 유형</th>
              <th class="p-3.5 text-center">정답률</th>
              <th class="p-3.5 text-center">소요 시간</th>
              <th class="p-3.5">교사 지원 정도</th>
              <th class="p-3.5 text-center">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${results.map((r, i) => `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 text-xs text-slate-500">${new Date(r.timestamp).toLocaleDateString('ko-KR')}</td>
                <td class="p-3.5 font-bold text-slate-800">${escapeHtml(r.studentCode)}</td>
                <td class="p-3.5 text-slate-700">${escapeHtml(r.lessonTitle || '수업')}</td>
                <td class="p-3.5">
                  <span class="type-badge type-badge-${r.activityType.toLowerCase()} text-xs">
                    ${r.activityType}형
                  </span>
                </td>
                <td class="p-3.5 text-center font-extrabold text-blue-600">${r.score}%</td>
                <td class="p-3.5 text-center text-xs text-slate-600">${r.durationSeconds}초</td>
                <td class="p-3.5">
                  <select class="form-select text-xs py-1 px-2" onchange="ResultModule.updateSupportLevel('${r.id}', this.value)">
                    <option value="독립 수행" ${r.supportGiven === '독립 수행' ? 'selected' : ''}>독립 수행</option>
                    <option value="최소한의 지원" ${r.supportGiven === '최소한의 지원' ? 'selected' : ''}>최소한의 지원</option>
                    <option value="부분적 지원" ${r.supportGiven === '부분적 지원' ? 'selected' : ''}>부분적 지원</option>
                    <option value="많은 지원" ${r.supportGiven === '많은 지원' ? 'selected' : ''}>많은 지원</option>
                  </select>
                </td>
                <td class="p-3.5 text-center">
                  <button class="btn btn-sm btn-outline" onclick="ResultModule.showDetailModal('${r.id}')">상세</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async updateSupportLevel(resId, val) {
    const results = await window.lessonDB.getAllResults();
    const target = results.find(r => r.id === resId);
    if (target) {
      target.supportGiven = val;
      await window.lessonDB.saveResult(target);
      showToast('교사 지원 정도가 업데이트되었습니다.', 'success');
    }
  },

  renderResultChart(results) {
    const canvas = document.getElementById('results-summary-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 180;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 유형별 평균 정답률 계산
    const types = ['A', 'B', 'C', 'D'];
    const avgs = types.map(t => {
      const filtered = results.filter(r => r.activityType === t);
      if (filtered.length === 0) return 0;
      const sum = filtered.reduce((acc, cur) => acc + cur.score, 0);
      return Math.round(sum / filtered.length);
    });

    const barWidth = 70;
    const startX = 60;
    const maxHeight = 120;
    const baseY = 140;

    // 축 그리기
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, baseY);
    ctx.lineTo(550, baseY);
    ctx.stroke();

    types.forEach((t, i) => {
      const score = avgs[i];
      const h = (score / 100) * maxHeight;
      const x = startX + i * 120;
      const y = baseY - h;

      // 막대 그리기
      const colors = ['#ef4444', '#f59e0b', '#6366f1', '#10b981'];
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, h, [6, 6, 0, 0]);
      ctx.fill();

      // 라벨 및 점수
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Pretendard';
      ctx.textAlign = 'center';
      ctx.fillText(`${t}형 (${score}%)`, x + barWidth / 2, y - 6);
      ctx.fillText(`${t}형 활동`, x + barWidth / 2, baseY + 18);
    });
  },

  async exportToCSV() {
    const results = await window.lessonDB.getAllResults();
    if (results.length === 0) {
      showToast('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    const headers = ['일시', '학생코드', '수업명', '활동유형', '정답률(%)', '소요시간(초)', '교사지원정도', '교사메모'];
    const rows = results.map(r => [
      `"${new Date(r.timestamp).toLocaleString('ko-KR')}"`,
      `"${r.studentCode}"`,
      `"${r.lessonTitle || ''}"`,
      `"${r.activityType}형"`,
      r.score,
      r.durationSeconds,
      `"${r.supportGiven || ''}"`,
      `"${r.teacherNote || ''}"`
    ]);

    // utf-8-sig BOM 추가
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학습결과기록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV 파일이 다운로드되었습니다.', 'success');
  },

  async showDetailModal(resId) {
    const results = await window.lessonDB.getAllResults();
    const r = results.find(item => item.id === resId);
    if (!r) return;

    alert(`[${r.studentCode}] 학습 상세\n- 수업: ${r.lessonTitle}\n- 활동: ${r.activityType}형 (${r.activityName})\n- 성취도: ${r.score}%\n- 소요시간: ${r.durationSeconds}초\n- 교사지원: ${r.supportGiven}`);
  }
};

// ==========================================================================
// 12. 인쇄 및 PDF 학습지 출력 모듈 (PrintModule)
// ==========================================================================
const PrintModule = {
  selectedTypes: { A: true, B: true, C: true, D: true },

  preparePrintPreview() {
    const lesson = AppState.currentLesson;
    const acts = AppState.currentActivities;
    const container = document.getElementById('print-preview-container');
    if (!container) return;

    if (!lesson || !acts) {
      container.innerHTML = '<p class="text-center p-8 text-slate-500">인쇄할 수업 및 활동 데이터가 없습니다.</p>';
      return;
    }

    let sheetsHtml = '';

    // A형 학습지
    if (this.selectedTypes.A && acts.typeA) {
      sheetsHtml += this.generateSheetA(lesson, acts.typeA);
    }
    // B형 학습지
    if (this.selectedTypes.B && acts.typeB) {
      sheetsHtml += this.generateSheetB(lesson, acts.typeB);
    }
    // C형 학습지
    if (this.selectedTypes.C && acts.typeC) {
      sheetsHtml += this.generateSheetC(lesson, acts.typeC);
    }
    // D형 학습지
    if (this.selectedTypes.D && acts.typeD) {
      sheetsHtml += this.generateSheetD(lesson, acts.typeD);
    }

    container.innerHTML = sheetsHtml;
  },

  generateSheetHeader(lesson, typeName) {
    return `
      <div class="print-worksheet-header">
        <div>
          <div class="text-xs font-bold text-slate-500 mb-1">${escapeHtml(lesson.subject)} | ${escapeHtml(lesson.grade)} | ${escapeHtml(typeName)}</div>
          <h2 class="print-title">${escapeHtml(lesson.title)}</h2>
          <p class="text-sm mt-1">🎯 <strong>학습목표:</strong> ${escapeHtml(lesson.goal)}</p>
        </div>
        <table class="print-meta-table">
          <tr>
            <td>날짜</td>
            <td>202  년   월   일</td>
          </tr>
          <tr>
            <td>이름</td>
            <td>            (인)</td>
          </tr>
        </table>
      </div>
    `;
  },

  generateSheetA(lesson, act) {
    const items = act.items || [];
    return `
      <div class="print-worksheet-wrapper bg-white p-6 border rounded-xl mb-6 shadow-sm">
        ${this.generateSheetHeader(lesson, 'A형 – 그림 선택형 학습지')}
        <div class="space-y-6">
          ${items.map((it, idx) => `
            <div class="print-item-card">
              <div class="print-item-instruction">
                <span class="print-item-num">${idx + 1}.</span> ${escapeHtml(it.instruction)}
              </div>
              <div class="print-picture-grid">
                ${(it.options || []).map(opt => `
                  <div class="print-picture-box">
                    <span class="print-picture-icon">${opt.icon || '🌸'}</span>
                    <span class="print-picture-text">${escapeHtml(opt.text)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="print-footer-eval">
          <span>평가: [ ] 스스로 함   [ ] 힌트 보고 함   [ ] 선생님 도움</span>
          <span>확인: (서명)</span>
        </div>
      </div>
    `;
  },

  generateSheetB(lesson, act) {
    const items = act.items || [];
    return `
      <div class="print-worksheet-wrapper bg-white p-6 border rounded-xl mb-6 shadow-sm">
        ${this.generateSheetHeader(lesson, 'B형 – 낱말 선택형 학습지')}
        <div class="space-y-6">
          ${items.map((it, idx) => `
            <div class="print-item-card">
              <div class="print-item-instruction">
                <span class="print-item-num">${idx + 1}.</span> ${escapeHtml(it.instruction)}
              </div>
              <div class="text-xl my-4 text-center font-bold">
                ${escapeHtml(it.sentencePrefix || '')}
                <span class="print-blank-line">           </span>
                ${escapeHtml(it.sentenceSuffix || '')}
              </div>
              <div class="print-word-options">
                ${(it.options || []).map(opt => `
                  <span class="print-word-pill">${opt.icon || ''} ${escapeHtml(opt.text)}</span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  generateSheetC(lesson, act) {
    const items = act.items || [];
    return `
      <div class="print-worksheet-wrapper bg-white p-6 border rounded-xl mb-6 shadow-sm">
        ${this.generateSheetHeader(lesson, 'C형 – 문장 완성형 학습지')}
        <div class="space-y-6">
          ${items.map((it, idx) => `
            <div class="print-item-card">
              <div class="print-item-instruction">
                <span class="print-item-num">${idx + 1}.</span> ${escapeHtml(it.instruction)}
              </div>
              <div class="print-sentence-frame">
                ${escapeHtml(it.frameTemplate || '나는 ______이 좋다. 왜냐하면 ______ 때문이다.')}
              </div>
              <div class="text-sm text-slate-600">
                [생각 보기]: ${(it.blank1Options || []).join(', ')}<br>
                [까닭 보기]: ${(it.blank2Options || []).join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  generateSheetD(lesson, act) {
    const items = act.items || [];
    return `
      <div class="print-worksheet-wrapper bg-white p-6 border rounded-xl mb-6 shadow-sm">
        ${this.generateSheetHeader(lesson, 'D형 – 자유 표현형 활동지')}
        ${items.map((it, idx) => `
          <div class="print-item-card">
            <div class="print-item-instruction">
              <span class="print-item-num">${idx + 1}.</span> ${escapeHtml(it.instruction)}
            </div>
            <p class="text-xs text-slate-500 mb-2">도움 낱말: ${(it.wordBank || []).join(', ')}</p>
            <div class="print-draw-box">
              여기에 그림을 자유롭게 그려보세요.
            </div>
            <div class="print-free-write-box p-3">
              <span class="text-xs text-slate-400">내 생각과 까닭을 적어보세요:</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  triggerPrint() {
    window.print();
  }
};

// ==========================================================================
// 13. 전역 이벤트 바인딩 & 유틸리티
// ==========================================================================
function bindGlobalEvents() {
  // 네비게이션 탭 클릭
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 접근성 폰트 조절 버튼
  document.querySelectorAll('.btn-font-size').forEach(btn => {
    btn.addEventListener('click', () => setFontSize(btn.dataset.size));
  });

  // 고대비 토글
  const btnContrast = document.getElementById('btn-toggle-contrast');
  if (btnContrast) {
    btnContrast.addEventListener('click', () => {
      setHighContrast(!AppState.settings.highContrast);
    });
  }

  // 음소거 토글
  const btnMute = document.getElementById('btn-toggle-mute');
  if (btnMute) {
    btnMute.addEventListener('click', toggleMute);
  }

  // 수업 폼 제출
  const lessonForm = document.getElementById('lesson-form');
  if (lessonForm) {
    lessonForm.addEventListener('submit', handleLessonFormSubmit);
  }

  // 학생 프로필 폼 제출
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => ProfileModule.saveNewProfile(e));
  }

  // AI 타겟 학생 셀렉트 변경
  const aiStudentSel = document.getElementById('ai-target-student-select');
  if (aiStudentSel) {
    aiStudentSel.addEventListener('change', (e) => {
      AppState.selectedProfileId = e.target.value;
    });
  }

  // 인쇄 타입 체크박스
  ['A', 'B', 'C', 'D'].forEach(t => {
    const chk = document.getElementById(`print-chk-type-${t.toLowerCase()}`);
    if (chk) {
      chk.addEventListener('change', (e) => {
        PrintModule.selectedTypes[t] = e.target.checked;
        PrintModule.preparePrintPreview();
      });
    }
  });

  // 키보드 접근성 네비게이션
  window.addEventListener('keydown', (e) => {
    if (AppState.player.active) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        playerNextItem();
      } else if (e.key === 'ArrowLeft') {
        playerPrevItem();
      } else if (e.key === 'Escape') {
        closeStudentPlayer();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const opts = document.querySelectorAll('.picture-option-btn, .word-option-btn');
        if (opts[idx]) opts[idx].click();
      }
    }
  });
}

// 토스트 메시지 알림
function showToast(message, type = 'info') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-white font-bold flex items-center gap-2 transition-all transform';
    document.body.appendChild(toast);
  }

  const bgColors = {
    info: 'bg-slate-800',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-red-600'
  };

  toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-white font-bold flex items-center gap-2 transition-all transform ${bgColors[type] || 'bg-slate-800'}`;
  toast.innerHTML = `<span>${message}</span>`;
  toast.style.display = 'flex';
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.style.display = 'none', 300);
  }, 3200);
}

// 문자열 이스케이프 유틸
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
}

// 글로벌 네임스페이스 등록
window.switchTab = switchTab;
window.selectCurrentLesson = selectCurrentLesson;
window.selectAndConvertLesson = selectAndConvertLesson;
window.editLessonInfo = editLessonInfo;
window.duplicateLesson = duplicateLesson;
window.deleteLessonConfirm = deleteLessonConfirm;
window.triggerAIConversion = triggerAIConversion;
window.openEditorForType = openEditorForType;
window.EditorModule = EditorModule;
window.startStudentPlayer = startStudentPlayer;
window.closeStudentPlayer = closeStudentPlayer;
window.playerNextItem = playerNextItem;
window.playerPrevItem = playerPrevItem;
window.togglePlayerHint = togglePlayerHint;
window.selectPlayerOptionA = selectPlayerOptionA;
window.selectPlayerOptionB = selectPlayerOptionB;
window.selectPlayerOptionC = selectPlayerOptionC;
window.updatePlayerDText = updatePlayerDText;
window.insertWordToPlayerText = insertWordToPlayerText;
window.togglePlayerSTT = togglePlayerSTT;
window.setCanvasColor = setCanvasColor;
window.clearDrawingCanvas = clearDrawingCanvas;
window.ProfileModule = ProfileModule;
window.ResultModule = ResultModule;
window.PrintModule = PrintModule;
window.toggleMute = toggleMute;
window.setFontSize = setFontSize;
window.setHighContrast = setHighContrast;
window.showToast = showToast;
