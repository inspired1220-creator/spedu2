/**
 * 모두의 수업 변환기 (Universal Lesson Converter) - IndexedDB 영구 데이터베이스 모듈
 * - 교사 수업 정보, 학생 맞춤 프로필, AI 변환 활동 데이터, 학생 학습 결과 영구 저장
 * - 2022 개정 교육과정 및 교과서 단원 데이터 관리 (공식 자료 + 사용자 등록 자료)
 * - IndexedDB 지원 + 브라우저 LocalStorage 자동 폴백 지원
 */

class LessonDB {
  constructor() {
    this.dbName = 'UniversalLessonConverterDB';
    this.dbVersion = 2; // 교육과정 저장소 추가에 따른 버전 업
    this.db = null;
    this.isReady = false;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB를 지원하지 않아 LocalStorage 모드로 동작합니다.');
        this.isReady = true;
        resolve(this);
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. 수업 저장소 (lessons)
        if (!db.objectStoreNames.contains('lessons')) {
          const lessonStore = db.createObjectStore('lessons', { keyPath: 'id' });
          lessonStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. 학생 맞춤 프로필 (student_profiles)
        if (!db.objectStoreNames.contains('student_profiles')) {
          const profileStore = db.createObjectStore('student_profiles', { keyPath: 'id' });
          profileStore.createIndex('codeName', 'codeName', { unique: false });
        }

        // 3. 활동 데이터 저장소 (activities) - 수업 및 맞춤 설정 연계
        if (!db.objectStoreNames.contains('activities')) {
          const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
          activityStore.createIndex('lessonId', 'lessonId', { unique: false });
        }

        // 4. 학습 결과 저장소 (results)
        if (!db.objectStoreNames.contains('results')) {
          const resultStore = db.createObjectStore('results', { keyPath: 'id' });
          resultStore.createIndex('lessonId', 'lessonId', { unique: false });
          resultStore.createIndex('studentCode', 'studentCode', { unique: false });
          resultStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 5. 시스템 설정 (settings)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 6. 사용자 등록 교과서 단원 저장소 (custom_units)
        if (!db.objectStoreNames.contains('custom_units')) {
          const unitStore = db.createObjectStore('custom_units', { keyPath: 'id' });
          unitStore.createIndex('curriculum', 'curriculum', { unique: false });
          unitStore.createIndex('subject', 'subject', { unique: false });
        }

        // 7. 사용자 등록 성취기준 저장소 (custom_standards)
        if (!db.objectStoreNames.contains('custom_standards')) {
          const stdStore = db.createObjectStore('custom_standards', { keyPath: 'code' });
          stdStore.createIndex('curriculum', 'curriculum', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        resolve(this);
      };

      request.onerror = (event) => {
        console.error('IndexedDB 열기 실패, LocalStorage로 대체합니다:', event.target.error);
        this.isReady = true;
        resolve(this);
      };
    });
  }

  // --- 헬퍼: 트랜잭션 래퍼 ---
  async getStore(storeName, mode = 'readonly') {
    await this.initPromise;
    if (this.db) {
      const tx = this.db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    }
    return null;
  }

  // ===================== [ 1. 수업 (Lessons) CRUD ] =====================
  async saveLesson(lesson) {
    await this.initPromise;
    if (!lesson.id) lesson.id = 'lesson_' + Date.now();
    lesson.updatedAt = new Date().toISOString();
    if (!lesson.createdAt) lesson.createdAt = lesson.updatedAt;

    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('lessons', 'readwrite');
        const store = tx.objectStore('lessons');
        const req = store.put(lesson);
        req.onsuccess = () => resolve(lesson);
        req.onerror = () => reject(req.error);
      });
    } else {
      const lessons = this._lsGet('lessons', []);
      const idx = lessons.findIndex(l => l.id === lesson.id);
      if (idx >= 0) lessons[idx] = lesson;
      else lessons.push(lesson);
      this._lsSet('lessons', lessons);
      return lesson;
    }
  }

  async getLesson(id) {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('lessons', 'readonly');
        const store = tx.objectStore('lessons');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } else {
      const lessons = this._lsGet('lessons', []);
      return lessons.find(l => l.id === id) || null;
    }
  }

  async getAllLessons() {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('lessons', 'readonly');
        const store = tx.objectStore('lessons');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } else {
      const lessons = this._lsGet('lessons', []);
      lessons.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return lessons;
    }
  }

  async deleteLesson(id) {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['lessons', 'activities', 'results'], 'readwrite');
        tx.objectStore('lessons').delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } else {
      let lessons = this._lsGet('lessons', []);
      lessons = lessons.filter(l => l.id !== id);
      this._lsSet('lessons', lessons);
      return true;
    }
  }

  // ===================== [ 2. 학생 프로필 (Student Profiles) CRUD ] =====================
  async saveStudentProfile(profile) {
    await this.initPromise;
    if (!profile.id) profile.id = 'student_' + Date.now();
    profile.updatedAt = new Date().toISOString();

    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('student_profiles', 'readwrite');
        const store = tx.objectStore('student_profiles');
        const req = store.put(profile);
        req.onsuccess = () => resolve(profile);
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = this._lsGet('student_profiles', []);
      const idx = list.findIndex(p => p.id === profile.id);
      if (idx >= 0) list[idx] = profile;
      else list.push(profile);
      this._lsSet('student_profiles', list);
      return profile;
    }
  }

  async getAllStudentProfiles() {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('student_profiles', 'readonly');
        const store = tx.objectStore('student_profiles');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } else {
      return this._lsGet('student_profiles', []);
    }
  }

  // ===================== [ 3. 활동 데이터 (Activities) CRUD ] =====================
  async saveActivities(activitySet) {
    await this.initPromise;
    if (!activitySet.id) activitySet.id = 'act_' + Date.now();
    activitySet.updatedAt = new Date().toISOString();

    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('activities', 'readwrite');
        const store = tx.objectStore('activities');
        const req = store.put(activitySet);
        req.onsuccess = () => resolve(activitySet);
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = this._lsGet('activities', []);
      const idx = list.findIndex(a => a.id === activitySet.id);
      if (idx >= 0) list[idx] = activitySet;
      else list.push(activitySet);
      this._lsSet('activities', list);
      return activitySet;
    }
  }

  async getActivitiesByLesson(lessonId) {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('activities', 'readonly');
        const store = tx.objectStore('activities');
        const index = store.index('lessonId');
        const req = index.getAll(lessonId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = this._lsGet('activities', []);
      return list.filter(a => a.lessonId === lessonId);
    }
  }

  // ===================== [ 4. 학습 결과 (Results) CRUD ] =====================
  async saveResult(result) {
    await this.initPromise;
    if (!result.id) result.id = 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    result.timestamp = result.timestamp || new Date().toISOString();

    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('results', 'readwrite');
        const store = tx.objectStore('results');
        const req = store.put(result);
        req.onsuccess = () => resolve(result);
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = this._lsGet('results', []);
      list.push(result);
      this._lsSet('results', list);
      return result;
    }
  }

  async getAllResults() {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('results', 'readonly');
        const store = tx.objectStore('results');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = this._lsGet('results', []);
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return list;
    }
  }

  // ===================== [ 5. 2022 개정 교육과정 및 교과서 단원 관리 ] =====================
  // 공식 단원 + 사용자 등록 단원 병합 조회
  async getAllUnits() {
    await this.initPromise;
    let customUnits = [];
    if (this.db && this.db.objectStoreNames.contains('custom_units')) {
      customUnits = await new Promise((resolve) => {
        const tx = this.db.transaction('custom_units', 'readonly');
        const req = tx.objectStore('custom_units').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      customUnits = this._lsGet('custom_units', []);
    }

    const official = (window.OFFICIAL_TEXTBOOK_UNITS || []).map(u => ({ ...u, isUserAdded: false }));
    return [...official, ...customUnits];
  }

  async saveCustomUnit(unit) {
    await this.initPromise;
    if (!unit.id) unit.id = 'c_unit_' + Date.now();
    unit.isUserAdded = true;
    unit.updatedAt = new Date().toISOString();

    if (this.db && this.db.objectStoreNames.contains('custom_units')) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('custom_units', 'readwrite');
        const req = tx.objectStore('custom_units').put(unit);
        req.onsuccess = () => resolve(unit);
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = this._lsGet('custom_units', []);
      const idx = list.findIndex(u => u.id === unit.id);
      if (idx >= 0) list[idx] = unit;
      else list.push(unit);
      this._lsSet('custom_units', list);
      return unit;
    }
  }

  async deleteCustomUnit(unitId) {
    await this.initPromise;
    if (this.db && this.db.objectStoreNames.contains('custom_units')) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('custom_units', 'readwrite');
        const req = tx.objectStore('custom_units').delete(unitId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } else {
      let list = this._lsGet('custom_units', []);
      list = list.filter(u => u.id !== unitId);
      this._lsSet('custom_units', list);
      return true;
    }
  }

  // 공식 성취기준 + 사용자 등록 성취기준 병합 조회
  async getAllStandards() {
    await this.initPromise;
    let customStds = [];
    if (this.db && this.db.objectStoreNames.contains('custom_standards')) {
      customStds = await new Promise((resolve) => {
        const tx = this.db.transaction('custom_standards', 'readonly');
        const req = tx.objectStore('custom_standards').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      customStds = this._lsGet('custom_standards', []);
    }

    const official = (window.OFFICIAL_STANDARDS || []).map(s => ({ ...s, isUserAdded: false }));
    return [...official, ...customStds];
  }

  async saveCustomStandard(std) {
    await this.initPromise;
    std.isUserAdded = true;
    std.source = std.source || '사용자 등록 자료 (교사 직접 추가)';

    if (this.db && this.db.objectStoreNames.contains('custom_standards')) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('custom_standards', 'readwrite');
        const req = tx.objectStore('custom_standards').put(std);
        req.onsuccess = () => resolve(std);
        req.onerror = () => reject(req.error);
      });
    } else {
      const list = this._lsGet('custom_standards', []);
      const idx = list.findIndex(s => s.code === std.code);
      if (idx >= 0) list[idx] = std;
      else list.push(std);
      this._lsSet('custom_standards', list);
      return std;
    }
  }

  // CSV 파일 가져오기 (단원 및 성취기준 일괄 등록)
  async importCurriculumCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('유효한 CSV 데이터가 아닙니다.');

    // 헤더 파싱
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    let importedUnits = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      // CSV 라인 분리 (쉼표 및 따옴표 처리)
      const values = this._parseCSVLine(lines[i]);
      const row = {};
      header.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      // 단원 데이터 생성
      if (row['단원명'] || row['unitTitle']) {
        const unit = {
          id: 'c_unit_' + Date.now() + '_' + i,
          curriculum: row['교육과정'] || row['curriculum'] || '2022 개정 공통 교육과정',
          schoolLevel: '초등학교',
          gradeGroup: row['학년군'] || row['gradeGroup'] || '3~4학년군',
          grade: row['학년'] || row['grade'] || '초등 3학년',
          subject: row['교과'] || row['subject'] || '국어',
          publisher: row['출판사'] || row['publisher'] || '교사 등록 교재',
          semester: row['학기'] || row['semester'] || '1학기',
          unitNumber: row['단원번호'] || row['unitNumber'] || `${i}단원`,
          unitTitle: row['단원명'] || row['unitTitle'],
          topic: row['주제'] || row['topic'] || '',
          defaultGoal: row['학습목표'] || row['defaultGoal'] || '',
          summaryContent: row['학습내용'] || row['summaryContent'] || '',
          keywords: (row['핵심어휘'] || row['keywords'] || '').split(/[,;]/).map(k => k.trim()).filter(Boolean),
          linkedStandardCodes: (row['성취기준코드'] || row['linkedStandardCodes'] || '').split(/[,;]/).map(c => c.trim()).filter(Boolean),
          source: '사용자 등록 자료 (CSV 가져오기)',
          isUserAdded: true
        };
        await this.saveCustomUnit(unit);
        importedUnits++;
      }
    }
    return importedUnits;
  }

  // 간단한 CSV 라인 파서
  _parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  // 전체 단원 데이터 CSV 내보내기 (utf-8-sig 인코딩 대응용 텍스트 반환)
  async exportCurriculumCSV() {
    const units = await this.getAllUnits();
    const headers = [
      '구분', '교육과정', '학년군', '학년', '교과', '출판사', '학기',
      '단원번호', '단원명', '주제', '학습목표', '학습내용', '핵심어휘', '성취기준코드', '출처'
    ];

    const rows = units.map(u => [
      u.isUserAdded ? '사용자 등록 자료' : '공식 검증 자료',
      `"${u.curriculum}"`,
      `"${u.gradeGroup || ''}"`,
      `"${u.grade}"`,
      `"${u.subject}"`,
      `"${u.publisher || ''}"`,
      `"${u.semester || ''}"`,
      `"${u.unitNumber || ''}"`,
      `"${u.unitTitle || ''}"`,
      `"${(u.topic || '').replace(/"/g, '""')}"`,
      `"${(u.defaultGoal || '').replace(/"/g, '""')}"`,
      `"${(u.summaryContent || '').replace(/"/g, '""')}"`,
      `"${(u.keywords || []).join(';')}"`,
      `"${(u.linkedStandardCodes || []).join(';')}"`,
      `"${u.source || ''}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ===================== [ 6. 설정 및 백업 ] =====================
  async getSetting(key, defaultValue = null) {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
        req.onerror = () => resolve(defaultValue);
      });
    } else {
      const val = localStorage.getItem('cfg_' + key);
      return val ? JSON.parse(val) : defaultValue;
    }
  }

  async setSetting(key, value) {
    await this.initPromise;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        const req = store.put({ key, value });
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } else {
      localStorage.setItem('cfg_' + key, JSON.stringify(value));
      return true;
    }
  }

  // 전체 데이터 JSON 내보내기
  async exportAllData() {
    const lessons = await this.getAllLessons();
    const profiles = await this.getAllStudentProfiles();
    const results = await this.getAllResults();
    let activities = [];
    if (this.db) {
      activities = await new Promise((resolve) => {
        const tx = this.db.transaction('activities', 'readonly');
        const req = tx.objectStore('activities').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      activities = this._lsGet('activities', []);
    }

    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      appName: '모두의 수업 변환기',
      data: { lessons, profiles, activities, results }
    };
  }

  // 전체 데이터 가져오기 (복원)
  async importData(imported) {
    if (!imported || !imported.data) throw new Error('올바른 백업 파일 형식이 아닙니다.');
    const { lessons, profiles, activities, results } = imported.data;

    for (const l of lessons || []) await this.saveLesson(l);
    for (const p of profiles || []) await this.saveStudentProfile(p);
    for (const a of activities || []) await this.saveActivities(a);
    for (const r of results || []) await this.saveResult(r);
    return true;
  }

  // --- 로컬스토리지 폴백 헬퍼 ---
  _lsGet(key, defaultVal) {
    try {
      const data = localStorage.getItem('ulc_' + key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  _lsSet(key, val) {
    try {
      localStorage.setItem('ulc_' + key, JSON.stringify(val));
    } catch (e) {
      console.error('LocalStorage 쓰기 오류:', e);
    }
  }
}

// 글로벌 인스턴스
window.lessonDB = new LessonDB();
