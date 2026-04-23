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
             (row[0].toLowerCase().includes('front') || row[0].toLowerCase().includes('word') || row[0].includes('單字'))) {
            continue; // Skip header
          }
          if (row.length < 2) {
            skippedCount++;
            if (errors.length < 3) errors.push(`第 ${i + 1} 行: 缺少逗號分隔`);
            continue;
          }
          
          const front = row[0].trim();
          let morphology, derivatives, phonetic, partOfSpeech, definition, example, collocations, contextType;
          
          if (row.length >= 9) {
            // New 9-column format matched with academic generator v3 output:
            // Word(0), IPA(1), POS(2), Inflections(3), Derivatives(4), Definition(5), Example(6), Collocations(7), Context_Type(8)
            phonetic = row[1]?.trim();
            partOfSpeech = row[2]?.trim();
            morphology = row[3]?.trim();
            derivatives = row[4]?.trim();
            definition = row[5]?.trim();
            example = row[6]?.trim();
            collocations = row[7]?.trim();
            contextType = row[8]?.trim();
            
            if (!front || (!definition && !example)) {
              skippedCount++;
              if (errors.length < 3) errors.push(`第 ${i + 1} 行: 單字或解釋/例句不可為空`);
              continue;
            }
          } else if (row.length >= 8) {
            // Legacy 8-column support
            phonetic = row[1]?.trim();
            partOfSpeech = row[2]?.trim();
            morphology = row[3]?.trim();
            definition = row[4]?.trim();
            example = row[5]?.trim();
            collocations = row[6]?.trim();
            contextType = row[7]?.trim();
          } else {
            // Legacy 2-column fallback (potentially more if commas exist but not 8 columns)
            back = row.slice(1).join('\n').trim();
            if (!front || !back) {
              skippedCount++;
              if (errors.length < 3) errors.push(`第 ${i + 1} 行: 單字或背面內容為空`);
              continue;
            }
          }
          
          if (front.length > 500) {
            skippedCount++;
            if (errors.length < 3) errors.push(`第 ${i + 1} 行: 單字 (Front) 長度超過 500 字`);
            continue;
          }
          
          if (back.length > 3000) {
            skippedCount++;
            if (errors.length < 3) errors.push(`第 ${i + 1} 行: 背面 (Back) 長度超過 3000 字`);
            continue;
          }
          
          parsedCards.push({
            id: deckId + '-' + Date.now() + '-' + i,
            deckId,
            group: groupName,
            front,
            back,
            morphology,
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
        
        if (parsedCards.length === 0) {
          const errorMsg = `無效的卡片格式。共跳過 ${skippedCount} 張卡片。\n` +
                           `請確保第一欄是單字，並且提供正確的其他欄位 (例如: Word, Morphology, IPA, POS, Definition, Example, Collocations, Context_Type)，或是相容的雙欄位格式。\n\n` +
                           `常見錯誤偵測：\n${errors.join('\n')}`;
          reject(new Error(errorMsg));
        } else {
          resolve({ cards: parsedCards, skipped: skippedCount });
        }
      },
      error: (err: Error) => {
        reject(err);
      }
    });
  });
}
