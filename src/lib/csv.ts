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
        const errors: string[] = [];
        
        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i] as string[];
          if (i === 0 && row.length > 0 && 
             (row[0].toLowerCase().includes('front') || row[0].includes('單字'))) {
            continue; // Skip header
          }
          if (row.length < 2) {
            skippedCount++;
            if (errors.length < 3) errors.push(`第 ${i + 1} 行: 缺少逗號分隔 (內容可能未用雙引號包覆)`);
            continue;
          }
          
          const front = row[0].trim();
          const back = row.slice(1).join('\n').trim();
          
          if (!front || !back) {
            skippedCount++;
            if (errors.length < 3) errors.push(`第 ${i + 1} 行: Front 或 Back 為空`);
          } else if (front.length > 500) {
            skippedCount++;
            if (errors.length < 3) errors.push(`第 ${i + 1} 行: 單字 (Front) 長度超過 500 字`);
          } else if (back.length > 3000) {
            skippedCount++;
            if (errors.length < 3) errors.push(`第 ${i + 1} 行: 背面 (Back) 長度超過 3000 字`);
          } else {
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
          }
        }
        
        if (parsedCards.length === 0) {
          const errorMsg = `無效的卡片格式。共跳過 ${skippedCount} 張卡片。\n` +
                           `請確保第一欄是單字，第二欄是內容，且內容若有多行請用雙引號 " " 包覆整段。\n\n` +
                           `常見錯誤偵測：\n${errors.join('\n')}`;
          reject(new Error(errorMsg));
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
