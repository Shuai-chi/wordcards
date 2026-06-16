// Inject bilingual test data into IndexedDB
(async () => {
  const DB_NAME = 'SRS_DB';
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('decks')) db.createObjectStore('decks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('cards')) {
          const cs = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
          cs.createIndex('by-deck', 'deckId');
        }
      };
    });
  }

  const db = await openDB();

  // Clear existing
  const tx1 = db.transaction('cards', 'readwrite');
  await tx1.objectStore('cards').clear();
  const tx2 = db.transaction('decks', 'readwrite');
  await tx2.objectStore('decks').clear();

  // Add deck
  await new Promise((resolve, reject) => {
    const tx = db.transaction('decks', 'readwrite');
    const req = tx.objectStore('decks').put({ id: 'deck_test', name: 'Test Deck', language: 'en', todayCount: 0, todayTime: 0, todayCorrect: 0, reviewedAt: null });
    req.onsuccess = resolve; req.onerror = () => reject(req.error);
  });

  // Add cards
  const cards = [
    { deckId: 'deck_test', front: 'euphoria', back: 'a state of complete happiness', definition: 'a state of complete happiness｜極度幸福且正式的心理狀態', definitionLang: 'zh', notes: '' },
    { deckId: 'deck_test', front: 'sakura', back: 'cherry blossom', definition: 'cherry blossom｜桜', definitionLang: 'ja', notes: '' },
    { deckId: 'deck_test', front: 'ordnung', back: 'order', definition: 'order｜Ordnung', definitionLang: 'de', notes: '' },
    { deckId: 'deck_test', front: 'wisdom', back: 'wisdom', definition: 'the quality of having experience, knowledge, and good judgement', definitionLang: undefined, notes: '' },
  ];

  for (const card of cards) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('cards', 'readwrite');
      const req = tx.objectStore('cards').add(card);
      req.onsuccess = resolve; req.onerror = () => reject(req.error);
    });
  }

  console.log('Test data injected successfully');
})();
