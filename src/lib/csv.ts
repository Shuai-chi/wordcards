import Papa from 'papaparse';
import type { Card } from './types';

export function validateCard(front: string, back: string): boolean {
  if (!front || !back) return false;
  if (!front.trim() || !back.trim()) return false;
  
  if (front.length > 500 || back.length > 3000) return false;

  return true;
}

export function parseCSV(file: File, deckId: string, groupName: string): Promise<{ cards: Card[], skipped: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const parsedCards: Card[] = [];
        let skippedCount = 0;
        
        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i] as string[];
          if (i === 0 && row.length > 0 && 
             (row[0].toLowerCase().includes('front') || row[0].includes('單字'))) {
            continue;
          }
          if (row.length >= 2) {
            const front = row[0].trim();
            const back = row.slice(1).join('\n').trim();
            if (validateCard(front, back)) {
              parsedCards.push({
                id: deckId + '-' + Date.now() + '-' + i,
                deckId,
                group: groupName,
                front,
                back,
                state: 'new',
                interval: 0,
                easeFactor: 2.5,
                failCount: 0,
                hardCount: 0,
                introducedDate: '',
                lastReviewedDate: ''
              });
            } else {
              skippedCount++;
            }
          }
        }
        
        if (parsedCards.length === 0) {
          reject(new Error(`無效的卡片格式。共跳過 ${skippedCount} 張卡片。請確保符合 Front / Back 規範，Back 包含音標、意思、例句、搭配。`));
        } else {
          resolve({ cards: parsedCards, skipped: skippedCount });
        }
      },
      error: (err: any) => {
        reject(err);
      }
    });
  });
}
