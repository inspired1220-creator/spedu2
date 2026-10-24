/**
 * 모두의 수업 변환기 - 음성(TTS/STT) 및 접근성 오디오 효과음 모듈
 * - Web Speech API 기반 고품질 한국어 TTS (문장/낱말 읽어주기)
 * - Web Speech API 기반 한국어 음성인식 STT (D형 자유표현 지원)
 * - Web Audio API 기반 순수 자바스크립트 화음 합성기 (외부 파일 없이 즉시 정답/오답/완료 효과음 재생)
 * - 음소거(Mute) 및 속도/음높이 조절 기능
 */

class AudioController {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.koreanVoice = null;
    this.isMuted = false;
    this.speechRate = 0.85; // 특수교육 맞춤형 차분하고 명료한 발음 속도
    this.speechPitch = 1.05; // 친근하고 밝은 음높이
    this.audioCtx = null;
    this.recognition = null;
    this.isListening = false;

    this.initAudioContext();
    this.initVoices();
    this.initSTT();

    // 음소거 상태 복원
    const savedMute = localStorage.getItem('ulc_mute');
    if (savedMute !== null) this.isMuted = savedMute === 'true';
  }

  // --- 1. Web Audio API 초기화 (안전한 지연 생성) ---
  initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('Web Audio API 사용 불가:', e);
    }
  }

  ensureAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // --- 2. TTS 음성 초기화 ---
  initVoices() {
    if (!this.synth) return;
    const updateVoices = () => {
      const voices = this.synth.getVoices();
      // 한국어 음성 우선 탐색 (Google 한국어, Yuna, Microsoft Heami, ko-KR 등)
      this.koreanVoice = voices.find(v => v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.startsWith('ko')) || null;
    };

    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  // 문장 또는 단어 읽어주기
  speak(text, onEndCallback = null) {
    if (!this.synth || this.isMuted || !text) return;

    this.stopSpeaking();

    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ko-KR';
    if (this.koreanVoice) utterance.voice = this.koreanVoice;
    utterance.rate = this.speechRate;
    utterance.pitch = this.speechPitch;

    if (onEndCallback) {
      utterance.onend = onEndCallback;
      utterance.onerror = onEndCallback;
    }

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('ulc_mute', this.isMuted ? 'true' : 'false');
    if (this.isMuted) this.stopSpeaking();
    return this.isMuted;
  }

  setSpeechRate(rate) {
    this.speechRate = Math.max(0.5, Math.min(1.5, rate));
  }

  // --- 3. Web Audio API 기반 청각 피드백 효과음 (외부 의존성 없음) ---
  // 정답 딩동댕 (C5 -> E5 -> G5 맑은 차임벨)
  playCorrectSound() {
    if (this.isMuted || !this.audioCtx) return;
    this.ensureAudioContext();

    const now = this.audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // 도, 미, 솔, 높은 도

    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle'; // 부드러운 차임 소리
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.35);
    });
  }

  // 다시 시도 (따뜻하고 부드러운 격려 톤)
  playIncorrectSound() {
    if (this.isMuted || !this.audioCtx) return;
    this.ensureAudioContext();

    const now = this.audioCtx.currentTime;
    const notes = [392.00, 329.63]; // 솔 -> 미 (차분한 격려 톤)

    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.35);
    });
  }

  // 축하 팡파르 (완료 시 신나는 아르페지오)
  playFanfareSound() {
    if (this.isMuted || !this.audioCtx) return;
    this.ensureAudioContext();

    const now = this.audioCtx.currentTime;
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 0.12 },
      { f: 783.99, d: 0.12, t: 0.24 },
      { f: 1046.50, d: 0.35, t: 0.36 },
      { f: 880.00, d: 0.12, t: 0.72 },
      { f: 1046.50, d: 0.6, t: 0.84 }
    ];

    notes.forEach(n => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(0.3, now + n.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }

  // 버튼 클릭 시 경쾌한 팝 소리
  playPopSound() {
    if (this.isMuted || !this.audioCtx) return;
    this.ensureAudioContext();

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // --- 4. STT (음성 인식) 초기화 및 제어 ---
  initSTT() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.lang = 'ko-KR';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
    }
  }

  isSTTAvailable() {
    return !!this.recognition;
  }

  startListening(onResult, onError, onEnd) {
    if (!this.recognition) {
      if (onError) onError('이 브라우저는 음성 인식을 지원하지 않습니다. 키보드로 입력해 주세요.');
      return;
    }

    try {
      this.isListening = true;
      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (onResult) onResult(transcript, event.results[0].isFinal);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        console.warn('STT 오류:', event.error);
        if (onError) onError('음성을 인식하지 못했습니다. 다시 시도하거나 키보드로 입력해 주세요.');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd();
      };

      this.recognition.start();
    } catch (e) {
      this.isListening = false;
      if (onError) onError('마이크 접근 중 오류가 발생했습니다.');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

// 글로벌 인스턴스
window.audioController = new AudioController();
