/**
 * 모두의 수업 변환기 (Universal Lesson Converter) - IndexedDB 영구 데이터베이스 모듈
 * - 교사 수업 정보, 학생 맞춤 프로필, AI 변환 활동 데이터, 학생 학습 결과 영구 저장
 * - IndexedDB 지원 + 브라우저 LocalStorage 자동 폴백 지원
 */

class LessonDB {
  constructor() {
    this.dbName = 'UniversalLessonConverterDB';
    this.dbVersion = 1;
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
        // 연관된 활동 및 결과도 함께 정리 가능
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

  // ===================== [ 5. 설정 및 백업 ] =====================
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
      version: '1.0',
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
