import Papa from 'papaparse';
import type { Card } from './types';

export function validateCard(front: string, back: string): boolean {
  if (!front || !back) return false;
  if (!front.trim() || !back.trim()) return false;
  return true;
}

export function parseCSV(file: File, deckId: string, groupName: string): Promise<{ cards: Card[], skipped: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const parsedCards: Card[] = [];
        let skippedCount = 0;
        
        // 取得標題列 (如果有)
        const headerRow = results.data[0] as string[];
        const hasHeader = headerRow && headerRow[0]?.toLowerCase().includes('word');
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < results.data.length; i++) {
          const row = results.data[i] as string[];
          if (!row || row.length < 2) {
            skippedCount++;
            continue;
          }

          const front = row[0]?.trim();
          let phonetic = '', partOfSpeech = '', morphology = '', derivatives = '', definition = '', example = '', collocations = '', contextType = '';

          // 嚴格對位邏輯 (根據 WordForge v10.0 標準 9 欄位)
          // 0:word, 1:ipa, 2:pos (小寫帶點), 3:infl, 4:der, 5:dfn (全型分號), 6:ex, 7:coll, 8:ctx
          if (row.length >= 9) {
            phonetic = row[1]?.trim() || '';
            partOfSpeech = row[2]?.trim() || '';
            morphology = row[3]?.trim() || '';
            derivatives = row[4]?.trim() || '';
            definition = row[5]?.trim() || '';
            example = row[6]?.trim() || '';
            collocations = row[7]?.trim() || '';
            contextType = row[8]?.trim() || '';
          } else if (row.length === 8) {
            // 處理 Agent 5 遺漏最後一欄的情況
            phonetic = row[1]?.trim() || '';
            partOfSpeech = row[2]?.trim() || '';
            morphology = row[3]?.trim() || '';
            derivatives = row[4]?.trim() || '';
            definition = row[5]?.trim() || '';
            example = row[6]?.trim() || '';
            collocations = row[7]?.trim() || '';
          } else {
            // 基礎雙欄位支援
            definition = row.slice(1).join('\n').trim();
          }

          if (!front) {
            skippedCount++;
            continue;
          }

          parsedCards.push({
            id: deckId + '-' + Date.now() + '-' + i,
            deckId,
            group: groupName,
            front,
            back: definition + "\n" + example,
            morphology,
            derivatives,
            phonetic,
            partOfSpeech,
            definition,
            example,
            collocations,
            contextType,
            state: 'new',
            interval: 0,
            easeFactor: 2.5,
            failCount: 0,
            hardCount: 0,
            introducedDate: '',
            lastReviewedDate: ''
          });
        }
        resolve({ cards: parsedCards, skipped: skippedCount });
      },
      error: (err: Error) => reject(err)
    });
  });
}
