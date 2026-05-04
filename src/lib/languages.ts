// WordForge — Language Configuration
// Each language defines its card field schema, TTS settings, and UI i18n strings.

export type SupportedLang = 'en' | 'ja' | 'ko' | 'de' | 'es' | 'fr' | 'th';

export interface FieldDef {
  key: string;
  label: string;        // UI label in UI language
  csvIndex: number;     // column index in CSV (0-based)
  required: boolean;
  renderAs: 'word' | 'phonetic' | 'pos' | 'morphology' | 'definition' | 'example' | 'collocations' | 'derivatives' | 'context' | 'kana' | 'kanji' | 'romaji' | 'gender' | 'tone' | 'hanja';
}

export interface LangConfig {
  code: SupportedLang;
  name: string;           // native name
  nameEn: string;         // English name
  flag: string;           // emoji flag
  ttsLang: string;        // BCP-47 for SpeechSynthesis
  ttsLangAlt?: string;    // fallback
  csvCols: number;        // expected column count
  fields: FieldDef[];
  detectionPatterns?: RegExp[];  // regex to auto-detect from CSV content
  csvHeader: string;      // expected header string (for detection)
}

export const LANG_CONFIGS: Record<SupportedLang, LangConfig> = {

  en: {
    code: 'en',
    name: 'English',
    nameEn: 'English',
    flag: '🇺🇸',
    ttsLang: 'en-US',
    csvCols: 9,
    csvHeader: 'Word,Phonetic,Part of Speech,Inflections,Derivatives,Definition,Example,Collocations,ContextType',
    detectionPatterns: [/^\/[ˈˌæɛɪɔʊʃʒθðŋ]/m],
    fields: [
      { key: 'front',       label: 'Word',          csvIndex: 0, required: true,  renderAs: 'word' },
      { key: 'phonetic',    label: 'Phonetic',       csvIndex: 1, required: true,  renderAs: 'phonetic' },
      { key: 'partOfSpeech',label: 'POS',            csvIndex: 2, required: true,  renderAs: 'pos' },
      { key: 'morphology',  label: 'Inflections',    csvIndex: 3, required: false, renderAs: 'morphology' },
      { key: 'derivatives', label: 'Derivatives',    csvIndex: 4, required: false, renderAs: 'derivatives' },
      { key: 'definition',  label: 'Definition',     csvIndex: 5, required: true,  renderAs: 'definition' },
      { key: 'example',     label: 'Example',        csvIndex: 6, required: true,  renderAs: 'example' },
      { key: 'collocations',label: 'Collocations',   csvIndex: 7, required: false, renderAs: 'collocations' },
      { key: 'contextType', label: 'Context',        csvIndex: 8, required: false, renderAs: 'context' },
    ],
  },

  ja: {
    code: 'ja',
    name: '日本語',
    nameEn: 'Japanese',
    flag: '🇯🇵',
    ttsLang: 'ja-JP',
    csvCols: 9,
    csvHeader: 'Word,Kana,Kanji,Romaji,Part of Speech,Conjugations,Definition,Example,ContextType',
    detectionPatterns: [/[\u3040-\u309f]/, /[\u30a0-\u30ff]/],
    fields: [
      { key: 'front',       label: '単語',           csvIndex: 0, required: true,  renderAs: 'word' },
      { key: 'phonetic',    label: '仮名',           csvIndex: 1, required: true,  renderAs: 'kana' },
      { key: 'kanji',       label: '漢字',           csvIndex: 2, required: false, renderAs: 'kanji' },
      { key: 'romaji',      label: 'Romaji',         csvIndex: 3, required: false, renderAs: 'romaji' },
      { key: 'partOfSpeech',label: '品詞',           csvIndex: 4, required: true,  renderAs: 'pos' },
      { key: 'morphology',  label: '活用形',         csvIndex: 5, required: false, renderAs: 'morphology' },
      { key: 'definition',  label: '定義',           csvIndex: 6, required: true,  renderAs: 'definition' },
      { key: 'example',     label: '例文',           csvIndex: 7, required: true,  renderAs: 'example' },
      { key: 'contextType', label: 'コンテキスト',   csvIndex: 8, required: false, renderAs: 'context' },
    ],
  },

  ko: {
    code: 'ko',
    name: '한국어',
    nameEn: 'Korean',
    flag: '🇰🇷',
    ttsLang: 'ko-KR',
    csvCols: 9,
    csvHeader: 'Word,Hangul,Hanja,Romanization,Part of Speech,Conjugations,Definition,Example,ContextType',
    detectionPatterns: [/[\uAC00-\uD7AF]/, /[\u1100-\u11FF]/],
    fields: [
      { key: 'front',       label: '단어',           csvIndex: 0, required: true,  renderAs: 'word' },
      { key: 'phonetic',    label: '한글',           csvIndex: 1, required: true,  renderAs: 'kana' },
      { key: 'hanja',       label: '한자',           csvIndex: 2, required: false, renderAs: 'hanja' },
      { key: 'romaji',      label: '로마자',         csvIndex: 3, required: false, renderAs: 'romaji' },
      { key: 'partOfSpeech',label: '품사',           csvIndex: 4, required: true,  renderAs: 'pos' },
      { key: 'morphology',  label: '활용',           csvIndex: 5, required: false, renderAs: 'morphology' },
      { key: 'definition',  label: '정의',           csvIndex: 6, required: true,  renderAs: 'definition' },
      { key: 'example',     label: '예문',           csvIndex: 7, required: true,  renderAs: 'example' },
      { key: 'contextType', label: '컨텍스트',       csvIndex: 8, required: false, renderAs: 'context' },
    ],
  },

  de: {
    code: 'de',
    name: 'Deutsch',
    nameEn: 'German',
    flag: '🇩🇪',
    ttsLang: 'de-DE',
    csvCols: 9,
    csvHeader: 'Word,Phonetic,Gender,Part of Speech,Declension,Derivatives,Definition,Example,ContextType',
    detectionPatterns: [/\b(der|die|das|ein|eine)\b/i],
    fields: [
      { key: 'front',       label: 'Wort',           csvIndex: 0, required: true,  renderAs: 'word' },
      { key: 'phonetic',    label: 'Aussprache',     csvIndex: 1, required: true,  renderAs: 'phonetic' },
      { key: 'gender',      label: 'Genus',          csvIndex: 2, required: false, renderAs: 'gender' },
      { key: 'partOfSpeech',label: 'Wortart',        csvIndex: 3, required: true,  renderAs: 'pos' },
      { key: 'morphology',  label: 'Deklination',    csvIndex: 4, required: false, renderAs: 'morphology' },
      { key: 'derivatives', label: 'Ableitungen',    csvIndex: 5, required: false, renderAs: 'derivatives' },
      { key: 'definition',  label: 'Definition',     csvIndex: 6, required: true,  renderAs: 'definition' },
      { key: 'example',     label: 'Beispiel',       csvIndex: 7, required: true,  renderAs: 'example' },
      { key: 'contextType', label: 'Kontext',        csvIndex: 8, required: false, renderAs: 'context' },
    ],
  },

  es: {
    code: 'es',
    name: 'Español',
    nameEn: 'Spanish',
    flag: '🇪🇸',
    ttsLang: 'es-ES',
    ttsLangAlt: 'es-MX',
    csvCols: 9,
    csvHeader: 'Word,Phonetic,Gender,Part of Speech,Conjugations,Derivatives,Definition,Example,ContextType',
    detectionPatterns: [/[áéíóúüñ¿¡]/],
    fields: [
      { key: 'front',       label: 'Palabra',        csvIndex: 0, required: true,  renderAs: 'word' },
      { key: 'phonetic',    label: 'Fonética',       csvIndex: 1, required: true,  renderAs: 'phonetic' },
      { key: 'gender',      label: 'Género',         csvIndex: 2, required: false, renderAs: 'gender' },
      { key: 'partOfSpeech',label: 'Categoría',      csvIndex: 3, required: true,  renderAs: 'pos' },
      { key: 'morphology',  label: 'Conjugación',    csvIndex: 4, required: false, renderAs: 'morphology' },
      { key: 'derivatives', label: 'Derivados',      csvIndex: 5, required: false, renderAs: 'derivatives' },
      { key: 'definition',  label: 'Definición',     csvIndex: 6, required: true,  renderAs: 'definition' },
      { key: 'example',     label: 'Ejemplo',        csvIndex: 7, required: true,  renderAs: 'example' },
      { key: 'contextType', label: 'Contexto',       csvIndex: 8, required: false, renderAs: 'context' },
    ],
  },

  fr: {
    code: 'fr',
    name: 'Français',
    nameEn: 'French',
    flag: '🇫🇷',
    ttsLang: 'fr-FR',
    csvCols: 9,
    csvHeader: 'Word,Phonetic,Gender,Part of Speech,Conjugations,Derivatives,Definition,Example,ContextType',
    detectionPatterns: [/[àâæçèéêëîïôœùûüÿ]/],
    fields: [
      { key: 'front',       label: 'Mot',            csvIndex: 0, required: true,  renderAs: 'word' },
      { key: 'phonetic',    label: 'Phonétique',     csvIndex: 1, required: true,  renderAs: 'phonetic' },
      { key: 'gender',      label: 'Genre',          csvIndex: 2, required: false, renderAs: 'gender' },
      { key: 'partOfSpeech',label: 'Catégorie',      csvIndex: 3, required: true,  renderAs: 'pos' },
      { key: 'morphology',  label: 'Conjugaison',    csvIndex: 4, required: false, renderAs: 'morphology' },
      { key: 'derivatives', label: 'Dérivés',        csvIndex: 5, required: false, renderAs: 'derivatives' },
      { key: 'definition',  label: 'Définition',     csvIndex: 6, required: true,  renderAs: 'definition' },
      { key: 'example',     label: 'Exemple',        csvIndex: 7, required: true,  renderAs: 'example' },
      { key: 'contextType', label: 'Contexte',       csvIndex: 8, required: false, renderAs: 'context' },
    ],
  },

  th: {
    code: 'th',
    name: 'ภาษาไทย',
    nameEn: 'Thai',
    flag: '🇹🇭',
    ttsLang: 'th-TH',
    csvCols: 9,
    csvHeader: 'Word,ThaiScript,Romanization,Tone,Part of Speech,Definition,Example,Collocations,ContextType',
    detectionPatterns: [/[\u0E00-\u0E7F]/],
    fields: [
      { key: 'front',       label: 'คำ',             csvIndex: 0, required: true,  renderAs: 'word' },
      { key: 'phonetic',    label: 'ตัวอักษรไทย',    csvIndex: 1, required: true,  renderAs: 'kana' },
      { key: 'romaji',      label: 'การโรมัน',       csvIndex: 2, required: false, renderAs: 'romaji' },
      { key: 'tone',        label: 'วรรณยุกต์',      csvIndex: 3, required: false, renderAs: 'tone' },
      { key: 'partOfSpeech',label: 'ชนิดของคำ',     csvIndex: 4, required: true,  renderAs: 'pos' },
      { key: 'definition',  label: 'ความหมาย',       csvIndex: 5, required: true,  renderAs: 'definition' },
      { key: 'example',     label: 'ตัวอย่าง',       csvIndex: 6, required: true,  renderAs: 'example' },
      { key: 'collocations',label: 'คำประสม',        csvIndex: 7, required: false, renderAs: 'collocations' },
      { key: 'contextType', label: 'บริบท',          csvIndex: 8, required: false, renderAs: 'context' },
    ],
  },
};

// Detect language from CSV content
export function detectLanguageFromCSV(csvText: string): SupportedLang {
  const firstLine = csvText.split('\n')[0] || '';
  const firstLineClean = firstLine.replace(/"/g, '');

  // 1. Strict Header Detection
  if (firstLineClean.includes('Kana') || firstLineClean.includes('Kanji')) return 'ja';
  if (firstLineClean.includes('Hangul') || firstLineClean.includes('Hanja')) return 'ko';
  if (firstLineClean.includes('ThaiScript') || firstLineClean.includes('Tone')) return 'th';
  
  const hasGender = firstLineClean.includes('Gender');
  const hasDeclension = firstLineClean.includes('Declension');
  const hasConjugations = firstLineClean.includes('Conjugations');
  const hasInflections = firstLineClean.includes('Inflections') || firstLineClean.includes('Collocations') || firstLineClean.includes('Morphology');

  if (hasGender) {
    if (hasDeclension) return 'de';
    if (hasConjugations) {
      // It's either ES or FR, let content detection decide
    }
  } else if (hasInflections) {
    return 'en';
  }

  // 2. Content Pattern Detection (Frequency based to avoid loanword false positives)
  const sample = csvText.slice(0, 3000);
  const matchCount = (regex: RegExp) => (sample.match(regex) || []).length;

  if (matchCount(/[\u0E00-\u0E7F]/g) > 2) return 'th';
  if (matchCount(/[\uAC00-\uD7AF\u1100-\u11FF]/g) > 2) return 'ko';
  if (matchCount(/[\u3040-\u309F\u30A0-\u30FF]/g) > 2) return 'ja';

  // Exclude æ and œ from French as they are extremely common in English IPA (e.g., /kæt/).
  const deCount = matchCount(/[äöüßÄÖÜ]/g);
  const esCount = matchCount(/[áéíóúñ¿¡ÁÉÍÓÚÑ]/g);
  const frCount = matchCount(/[àâçèéêëîïôùûüÿÀÂÇÈÉÊËÎÏÔÙÛÜŸ]/g);

  const maxEur = Math.max(deCount, esCount, frCount);
  if (maxEur > 4) {
    if (maxEur === esCount && esCount > frCount) return 'es';
    if (maxEur === frCount) return 'fr';
    if (maxEur === deCount) return 'de';
  }

  return 'en';
}

// UI i18n strings
export type UILang = 'zh-TW' | 'en' | 'ja' | 'ko' | 'de' | 'es' | 'fr' | 'th';

export interface UIStrings {
  appName: string;
  dashboard: string;
  learningCenter: string;
  todayPracticed: string;
  cards: string;
  hard: string;
  good: string;
  easy: string;
  again: string;
  startPractice: string;
  selectDeckFirst: string;
  noTasksToday: string;
  repeatToday: string;
  importCSV: string;
  settings: string;
  noDeck: string;
  noDeckSub: string;
  selectAll: string;
  deselectAll: string;
  invertSelection: string;
  selected: string;
  editLimit: string;
  deleteDeck: string;
  confirmDelete: string;
  confirmBulkDelete: string;
  remaining: string;
  tapToFlip: string;
  practiceComplete: string;
  practiceCompleteMsg: string;
  dailyRecorded: string;
  backToCenter: string;
  globalSettings: string;
  globalLimit: string;
  cancel: string;
  save: string;
  editDeck: string;
  deckName: string;
  deckLimit: string;
  dailyNew: string;
  mastered: string;
  learning: string;
  allLanguages: string;
  language: string;
  filterLanguage: string;
  detectingLanguage: string;
  importSuccess: string;
  importFailed: string;
  skippedCards: string;
  loadFailed: string;
  uiLanguage: string;
  ttsFallbackHint: string;
}

export const UI_STRINGS: Record<UILang, UIStrings> = {
  'zh-TW': {
    appName: 'WordForge',
    dashboard: '學習中心',
    learningCenter: '學習中心',
    todayPracticed: '今日已練習',
    cards: '張卡片',
    hard: '困難',
    good: '良好',
    easy: '輕鬆',
    again: '再來',
    startPractice: '開始練習',
    selectDeckFirst: '請先選擇套牌',
    noTasksToday: '今日已無任務',
    repeatToday: '重複練習今日',
    importCSV: '匯入 CSV 套牌',
    settings: '設定',
    noDeck: '尚無單字套牌',
    noDeckSub: '點擊右上角上傳按鈕匯入 CSV 檔案',
    selectAll: '全選',
    deselectAll: '取消',
    invertSelection: '反向',
    selected: '已選',
    editLimit: '設定上限',
    deleteDeck: '刪除',
    confirmDelete: '確定要刪除這組套牌嗎？',
    confirmBulkDelete: '確定要刪除已選取的 {n} 個套牌嗎？此動作不可復原。',
    remaining: '剩餘',
    tapToFlip: '點擊或按空白鍵翻牌',
    practiceComplete: '練習完成！',
    practiceCompleteMsg: '你完成了 {n} 張卡片的挑戰',
    dailyRecorded: '今日學習已記錄',
    backToCenter: '回到學習中心',
    globalSettings: '全域設定',
    globalLimit: '每日全域新卡上限 (0-1000)',
    cancel: '取消',
    save: '儲存',
    editDeck: '編輯套牌',
    deckName: '套牌名稱',
    deckLimit: '此套牌每日新卡上限',
    dailyNew: '每日新卡',
    mastered: 'Mastered',
    learning: 'Learning',
    allLanguages: '所有語言',
    language: '語言',
    filterLanguage: '篩選語言',
    detectingLanguage: '自動偵測語言',
    importSuccess: '成功匯入 {n} 個套牌',
    importFailed: '匯入失敗',
    skippedCards: '{deck} 跳過了 {n} 張格式錯誤卡片',
    loadFailed: '載入資料失敗',
    uiLanguage: '介面語言',
    ttsFallbackHint: '提示：部分瀏覽器可能不支援特定語系（如泰語）的語音合成',
  },
  en: {
    appName: 'WordForge',
    dashboard: 'Learning Center',
    learningCenter: 'Learning Center',
    todayPracticed: 'Practiced Today',
    cards: 'cards',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    again: 'Again',
    startPractice: 'Start Practice',
    selectDeckFirst: 'Select a deck first',
    noTasksToday: 'Nothing due today',
    repeatToday: 'Repeat today',
    importCSV: 'Import CSV',
    settings: 'Settings',
    noDeck: 'No decks yet',
    noDeckSub: 'Click the upload button to import a CSV file',
    selectAll: 'All',
    deselectAll: 'None',
    invertSelection: 'Invert',
    selected: 'selected',
    editLimit: 'Set limit',
    deleteDeck: 'Delete',
    confirmDelete: 'Delete this deck?',
    confirmBulkDelete: 'Delete {n} selected decks? This cannot be undone.',
    remaining: 'Remaining',
    tapToFlip: 'Tap or press Space to reveal',
    practiceComplete: 'Session complete!',
    practiceCompleteMsg: 'You reviewed {n} cards',
    dailyRecorded: 'Progress saved',
    backToCenter: 'Back to Learning Center',
    globalSettings: 'Global Settings',
    globalLimit: 'Daily new card limit (0-1000)',
    cancel: 'Cancel',
    save: 'Save',
    editDeck: 'Edit Deck',
    deckName: 'Deck name',
    deckLimit: 'Daily new card limit for this deck',
    dailyNew: 'Daily new',
    mastered: 'Mastered',
    learning: 'Learning',
    allLanguages: 'All languages',
    language: 'Language',
    filterLanguage: 'Filter by language',
    detectingLanguage: 'Auto-detect language',
    importSuccess: 'Imported {n} decks',
    importFailed: 'Import failed',
    skippedCards: '{deck}: skipped {n} malformed cards',
    loadFailed: 'Failed to load data',
    uiLanguage: 'Interface language',
    ttsFallbackHint: 'Note: Some browsers may lack TTS support for certain languages (e.g., Thai)',
  },
  ja: {
    appName: 'WordForge',
    dashboard: '学習センター',
    learningCenter: '学習センター',
    todayPracticed: '本日練習済み',
    cards: '枚',
    hard: '難しい',
    good: '良い',
    easy: '簡単',
    again: 'もう一度',
    startPractice: '練習開始',
    selectDeckFirst: 'デッキを選択してください',
    noTasksToday: '今日のタスクなし',
    repeatToday: '本日分を再練習',
    importCSV: 'CSV インポート',
    settings: '設定',
    noDeck: 'デッキがありません',
    noDeckSub: '右上のボタンから CSV をインポート',
    selectAll: '全選択',
    deselectAll: '解除',
    invertSelection: '反転',
    selected: '選択中',
    editLimit: '上限設定',
    deleteDeck: '削除',
    confirmDelete: 'このデッキを削除しますか？',
    confirmBulkDelete: '{n} 個のデッキを削除しますか？',
    remaining: '残り',
    tapToFlip: 'タップまたはスペースキーで表示',
    practiceComplete: '完了！',
    practiceCompleteMsg: '{n} 枚のカードを学習しました',
    dailyRecorded: '本日の学習を記録しました',
    backToCenter: '学習センターへ戻る',
    globalSettings: 'グローバル設定',
    globalLimit: '1日の新規カード上限 (0-1000)',
    cancel: 'キャンセル',
    save: '保存',
    editDeck: 'デッキ編集',
    deckName: 'デッキ名',
    deckLimit: 'このデッキの1日新規カード上限',
    dailyNew: '毎日新規',
    mastered: '習得済み',
    learning: '学習中',
    allLanguages: 'すべての言語',
    language: '言語',
    filterLanguage: '言語で絞り込み',
    detectingLanguage: '言語を自動検出',
    importSuccess: '{n} 個のデッキをインポートしました',
    importFailed: 'インポート失敗',
    skippedCards: '{deck}: {n} 枚の不正カードをスキップ',
    loadFailed: 'データの読み込みに失敗しました',
    uiLanguage: 'インターフェース言語',
    ttsFallbackHint: '注：一部のブラウザは特定の言語（タイ語など）の音声合成をサポートしていません',
  },
  ko: {
    appName: 'WordForge',
    dashboard: '학습 센터',
    learningCenter: '학습 센터',
    todayPracticed: '오늘 학습',
    cards: '장',
    hard: '어려움',
    good: '좋음',
    easy: '쉬움',
    again: '다시',
    startPractice: '학습 시작',
    selectDeckFirst: '덱을 선택하세요',
    noTasksToday: '오늘 할 일 없음',
    repeatToday: '오늘 복습',
    importCSV: 'CSV 가져오기',
    settings: '설정',
    noDeck: '덱이 없습니다',
    noDeckSub: '오른쪽 상단 버튼으로 CSV 파일 가져오기',
    selectAll: '전체 선택',
    deselectAll: '선택 해제',
    invertSelection: '반전',
    selected: '선택됨',
    editLimit: '한도 설정',
    deleteDeck: '삭제',
    confirmDelete: '이 덱을 삭제할까요?',
    confirmBulkDelete: '{n}개의 덱을 삭제할까요?',
    remaining: '남은',
    tapToFlip: '탭하거나 스페이스바를 눌러 확인',
    practiceComplete: '완료!',
    practiceCompleteMsg: '{n}장의 카드를 학습했습니다',
    dailyRecorded: '오늘 학습이 기록되었습니다',
    backToCenter: '학습 센터로 돌아가기',
    globalSettings: '전역 설정',
    globalLimit: '일일 새 카드 한도 (0-1000)',
    cancel: '취소',
    save: '저장',
    editDeck: '덱 편집',
    deckName: '덱 이름',
    deckLimit: '이 덱의 일일 새 카드 한도',
    dailyNew: '일일 신규',
    mastered: '숙달',
    learning: '학습 중',
    allLanguages: '모든 언어',
    language: '언어',
    filterLanguage: '언어 필터',
    detectingLanguage: '언어 자동 감지',
    importSuccess: '{n}개의 덱을 가져왔습니다',
    importFailed: '가져오기 실패',
    skippedCards: '{deck}: {n}장의 잘못된 카드 건너뜀',
    loadFailed: '데이터 로드 실패',
    uiLanguage: '인터페이스 언어',
    ttsFallbackHint: '참고: 일부 브라우저는 특정 언어(예: 태국어)의 음성 합성을 지원하지 않을 수 있습니다',
  },
  de: {
    appName: 'WordForge',
    dashboard: 'Lernzentrum',
    learningCenter: 'Lernzentrum',
    todayPracticed: 'Heute geübt',
    cards: 'Karten',
    hard: 'Schwer',
    good: 'Gut',
    easy: 'Einfach',
    again: 'Nochmal',
    startPractice: 'Lernen starten',
    selectDeckFirst: 'Bitte Deck auswählen',
    noTasksToday: 'Heute nichts fällig',
    repeatToday: 'Heute wiederholen',
    importCSV: 'CSV importieren',
    settings: 'Einstellungen',
    noDeck: 'Keine Decks vorhanden',
    noDeckSub: 'CSV-Datei über den Upload-Button importieren',
    selectAll: 'Alle',
    deselectAll: 'Keine',
    invertSelection: 'Umkehren',
    selected: 'ausgewählt',
    editLimit: 'Limit setzen',
    deleteDeck: 'Löschen',
    confirmDelete: 'Dieses Deck löschen?',
    confirmBulkDelete: '{n} Decks löschen?',
    remaining: 'Verbleibend',
    tapToFlip: 'Tippen oder Leertaste drücken',
    practiceComplete: 'Fertig!',
    practiceCompleteMsg: '{n} Karten gelernt',
    dailyRecorded: 'Lernfortschritt gespeichert',
    backToCenter: 'Zurück zum Lernzentrum',
    globalSettings: 'Globale Einstellungen',
    globalLimit: 'Tägliches Limit neue Karten (0-1000)',
    cancel: 'Abbrechen',
    save: 'Speichern',
    editDeck: 'Deck bearbeiten',
    deckName: 'Deck-Name',
    deckLimit: 'Tägliches Limit für dieses Deck',
    dailyNew: 'Täglich neu',
    mastered: 'Gemeistert',
    learning: 'Lernend',
    allLanguages: 'Alle Sprachen',
    language: 'Sprache',
    filterLanguage: 'Nach Sprache filtern',
    detectingLanguage: 'Sprache erkennen',
    importSuccess: '{n} Decks importiert',
    importFailed: 'Import fehlgeschlagen',
    skippedCards: '{deck}: {n} fehlerhafte Karten übersprungen',
    loadFailed: 'Fehler beim Laden',
    uiLanguage: 'Oberflächensprache',
    ttsFallbackHint: 'Hinweis: Einige Browser unterstützen möglicherweise keine TTS für bestimmte Sprachen (z. B. Thailändisch)',
  },
  es: {
    appName: 'WordForge',
    dashboard: 'Centro de aprendizaje',
    learningCenter: 'Centro de aprendizaje',
    todayPracticed: 'Practicado hoy',
    cards: 'tarjetas',
    hard: 'Difícil',
    good: 'Bien',
    easy: 'Fácil',
    again: 'Otra vez',
    startPractice: 'Iniciar práctica',
    selectDeckFirst: 'Selecciona un mazo',
    noTasksToday: 'Nada pendiente hoy',
    repeatToday: 'Repetir hoy',
    importCSV: 'Importar CSV',
    settings: 'Configuración',
    noDeck: 'No hay mazos',
    noDeckSub: 'Importa un archivo CSV usando el botón de carga',
    selectAll: 'Todo',
    deselectAll: 'Ninguno',
    invertSelection: 'Invertir',
    selected: 'seleccionado',
    editLimit: 'Establecer límite',
    deleteDeck: 'Eliminar',
    confirmDelete: '¿Eliminar este mazo?',
    confirmBulkDelete: '¿Eliminar {n} mazos?',
    remaining: 'Restantes',
    tapToFlip: 'Toca o presiona espacio para revelar',
    practiceComplete: '¡Completado!',
    practiceCompleteMsg: 'Revisaste {n} tarjetas',
    dailyRecorded: 'Progreso guardado',
    backToCenter: 'Volver al centro',
    globalSettings: 'Configuración global',
    globalLimit: 'Límite diario de tarjetas nuevas (0-1000)',
    cancel: 'Cancelar',
    save: 'Guardar',
    editDeck: 'Editar mazo',
    deckName: 'Nombre del mazo',
    deckLimit: 'Límite diario para este mazo',
    dailyNew: 'Nuevas diarias',
    mastered: 'Dominado',
    learning: 'Aprendiendo',
    allLanguages: 'Todos los idiomas',
    language: 'Idioma',
    filterLanguage: 'Filtrar por idioma',
    detectingLanguage: 'Detectar idioma',
    importSuccess: '{n} mazos importados',
    importFailed: 'Error al importar',
    skippedCards: '{deck}: {n} tarjetas omitidas',
    loadFailed: 'Error al cargar datos',
    uiLanguage: 'Idioma de interfaz',
    ttsFallbackHint: 'Nota: Algunos navegadores pueden no admitir TTS para ciertos idiomas (p. ej., tailandés)',
  },
  fr: {
    appName: 'WordForge',
    dashboard: "Centre d'apprentissage",
    learningCenter: "Centre d'apprentissage",
    todayPracticed: "Pratiqué aujourd'hui",
    cards: 'cartes',
    hard: 'Difficile',
    good: 'Bien',
    easy: 'Facile',
    again: 'Encore',
    startPractice: "Commencer la pratique",
    selectDeckFirst: 'Sélectionnez un paquet',
    noTasksToday: "Rien à faire aujourd'hui",
    repeatToday: "Répéter aujourd'hui",
    importCSV: 'Importer CSV',
    settings: 'Paramètres',
    noDeck: 'Aucun paquet',
    noDeckSub: 'Importez un fichier CSV via le bouton de téléchargement',
    selectAll: 'Tout',
    deselectAll: 'Aucun',
    invertSelection: 'Inverser',
    selected: 'sélectionné',
    editLimit: 'Définir limite',
    deleteDeck: 'Supprimer',
    confirmDelete: 'Supprimer ce paquet ?',
    confirmBulkDelete: 'Supprimer {n} paquets ?',
    remaining: 'Restant',
    tapToFlip: 'Appuyez pour révéler',
    practiceComplete: 'Terminé !',
    practiceCompleteMsg: '{n} cartes révisées',
    dailyRecorded: 'Progrès enregistré',
    backToCenter: "Retour au centre",
    globalSettings: 'Paramètres globaux',
    globalLimit: 'Limite quotidienne de nouvelles cartes (0-1000)',
    cancel: 'Annuler',
    save: 'Enregistrer',
    editDeck: 'Modifier le paquet',
    deckName: 'Nom du paquet',
    deckLimit: 'Limite quotidienne pour ce paquet',
    dailyNew: 'Nouvelles quotidiennes',
    mastered: 'Maîtrisé',
    learning: 'En cours',
    allLanguages: 'Toutes les langues',
    language: 'Langue',
    filterLanguage: 'Filtrer par langue',
    detectingLanguage: 'Détection de la langue',
    importSuccess: '{n} paquets importés',
    importFailed: "Échec de l'importation",
    skippedCards: '{deck} : {n} cartes ignorées',
    loadFailed: 'Échec du chargement',
    uiLanguage: "Langue de l'interface",
    ttsFallbackHint: 'Remarque : Certains navigateurs peuvent ne pas prendre en charge la synthèse vocale pour certaines langues (ex. thaï)',
  },
  th: {
    appName: 'WordForge',
    dashboard: 'ศูนย์การเรียน',
    learningCenter: 'ศูนย์การเรียน',
    todayPracticed: 'ฝึกวันนี้แล้ว',
    cards: 'ใบ',
    hard: 'ยาก',
    good: 'ดี',
    easy: 'ง่าย',
    again: 'อีกครั้ง',
    startPractice: 'เริ่มฝึก',
    selectDeckFirst: 'กรุณาเลือกชุดคำศัพท์',
    noTasksToday: 'ไม่มีงานวันนี้',
    repeatToday: 'ทบทวนวันนี้',
    importCSV: 'นำเข้า CSV',
    settings: 'ตั้งค่า',
    noDeck: 'ยังไม่มีชุดคำศัพท์',
    noDeckSub: 'คลิกปุ่มอัปโหลดเพื่อนำเข้าไฟล์ CSV',
    selectAll: 'เลือกทั้งหมด',
    deselectAll: 'ยกเลิก',
    invertSelection: 'สลับ',
    selected: 'เลือกแล้ว',
    editLimit: 'ตั้งขีดจำกัด',
    deleteDeck: 'ลบ',
    confirmDelete: 'ลบชุดนี้ใช่ไหม?',
    confirmBulkDelete: 'ลบ {n} ชุดที่เลือกไหม?',
    remaining: 'เหลือ',
    tapToFlip: 'แตะหรือกดสเปซเพื่อดูคำตอบ',
    practiceComplete: 'เสร็จสิ้น!',
    practiceCompleteMsg: 'คุณเรียน {n} ใบแล้ว',
    dailyRecorded: 'บันทึกความก้าวหน้าแล้ว',
    backToCenter: 'กลับสู่ศูนย์การเรียน',
    globalSettings: 'ตั้งค่าทั่วไป',
    globalLimit: 'ขีดจำกัดคำใหม่ต่อวัน (0-1000)',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    editDeck: 'แก้ไขชุด',
    deckName: 'ชื่อชุด',
    deckLimit: 'ขีดจำกัดรายวันของชุดนี้',
    dailyNew: 'ใหม่รายวัน',
    mastered: 'เชี่ยวชาญ',
    learning: 'กำลังเรียน',
    allLanguages: 'ทุกภาษา',
    language: 'ภาษา',
    filterLanguage: 'กรองตามภาษา',
    detectingLanguage: 'ตรวจจับภาษา',
    importSuccess: 'นำเข้า {n} ชุดสำเร็จ',
    importFailed: 'นำเข้าล้มเหลว',
    skippedCards: '{deck}: ข้าม {n} ใบที่ผิดพลาด',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    uiLanguage: 'ภาษาของอินเทอร์เฟซ',
    ttsFallbackHint: 'หมายเหตุ: บางเบราว์เซอร์อาจไม่รองรับการอ่านออกเสียงสำหรับบางภาษา (เช่น ภาษาไทย)',
  },
};

export function t(strings: UIStrings, key: keyof UIStrings, vars?: Record<string, string | number>): string {
  let s = strings[key] as string;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}
