import type { Card, Deck, Report, ClicksStats } from './types';

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeReport(report: any, dateStr: string): Report {
  if (!report) {
    return { dateStr, uniqueCards: 0, clicks: { again: 0, hard: 0, good: 0, easy: 0 } };
  }
  return {
    dateStr: report.dateStr || dateStr,
    uniqueCards: report.uniqueCards || 0,
    clicks: {
      again: report.clicks?.again || 0,
      hard:  report.clicks?.hard  || 0,
      good:  report.clicks?.good  || 0,
      easy:  report.clicks?.easy  || 0,
    }
  };
}

let db: IDBDatabase | null = null;
let dbReady: Promise<void> | null = null;

export const DB = {
  init: (): Promise<void> => {
    if (dbReady) return dbReady;
    dbReady = new Promise((resolve, reject) => {
      const request = indexedDB.open('SRS_DB', 1);
      request.onupgradeneeded = (e: any) => {
        const _db = e.target.result;
        if (!_db.objectStoreNames.contains('decks')) {
          _db.createObjectStore('decks', { keyPath: 'id' });
        }
        if (!_db.objectStoreNames.contains('cards')) {
          const cardStore = _db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('deckId', 'deckId', { unique: false });
        }
        if (!_db.objectStoreNames.contains('reports')) {
          _db.createObjectStore('reports', { keyPath: 'dateStr' });
        }
      };
      request.onsuccess = (e: any) => {
        db = e.target.result;
        resolve();
      };
      request.onerror = (e) => reject(e);
    });
    return dbReady;
  },

  getAllDecks: async (): Promise<Deck[]> => {
    await DB.init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction('decks', 'readonly');
      const req = tx.objectStore('decks').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  putDeck: async (deck: Deck): Promise<void> => {
    await DB.init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction('decks', 'readwrite');
      tx.objectStore('decks').put(deck);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  deleteDeck: async (deckId: string): Promise<void> => {
    await DB.init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(['decks', 'cards'], 'readwrite');
      tx.objectStore('decks').delete(deckId);
      const cardStore = tx.objectStore('cards');
      const index = cardStore.index('deckId');
      const req = index.openCursor(IDBKeyRange.only(deckId));
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  getCardsByDeck: async (deckId: string): Promise<Card[]> => {
    await DB.init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction('cards', 'readonly');
      const index = tx.objectStore('cards').index('deckId');
      const req = index.getAll(IDBKeyRange.only(deckId));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  putCards: async (cards: Card[]): Promise<void> => {
    await DB.init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction('cards', 'readwrite');
      const store = tx.objectStore('cards');
      cards.forEach(c => store.put(c));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  getTodayReport: async (todayStr: string = getTodayStr()): Promise<Report> => {
    await DB.init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction('reports', 'readonly');
      const req = tx.objectStore('reports').get(todayStr);
      req.onsuccess = () => resolve(normalizeReport(req.result, todayStr));
      req.onerror = () => reject(req.error);
    });
  },

  commitReview: async (
    updatedCard: Card,
    todayStr: string,
    rating: keyof ClicksStats,
    isFirstTouchToday: boolean,
    previousRating?: keyof ClicksStats
  ): Promise<Report> => {
    await DB.init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(['cards', 'reports'], 'readwrite');
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      tx.onerror = (e) => { e.preventDefault(); };
      
      tx.objectStore('cards').put(updatedCard);
      
      const reports = tx.objectStore('reports');
      const getReq = reports.get(todayStr);
      let nextReport: Report;

      getReq.onsuccess = () => {
        try {
          nextReport = normalizeReport(getReq.result, todayStr);
          if (rating in nextReport.clicks) {
            nextReport.clicks[rating] = (Number(nextReport.clicks[rating]) || 0) + 1;
            if (!isFirstTouchToday && previousRating && previousRating in nextReport.clicks) {
              nextReport.clicks[previousRating] = Math.max(0, (Number(nextReport.clicks[previousRating]) || 0) - 1);
            }
          }
          if (isFirstTouchToday) nextReport.uniqueCards += 1;
          reports.put(nextReport);
        } catch (err) {
          tx.abort();
          reject(err);
        }
      };

      tx.oncomplete = () => resolve(nextReport!);
    });
  }
};

export { getTodayStr };
