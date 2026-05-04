import Papa from 'papaparse';
import type { Card } from './types';
import { detectLanguageFromCSV } from './languages';
import type { SupportedLang } from './languages';

export function validateCard(front: string, back: string): boolean {
  if (!front || !back) return false;
  if (!front.trim() || !back.trim()) return false;
  return true;
}

export function parseCSV(
  file: File,
  deckId: string,
  groupName: string
): Promise<{ cards: Card[]; skipped: number; detectedLang: SupportedLang }> {
  return new Promise((resolve, reject) => {
    // First read file as text to detect language
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const detectedLang = detectLanguageFromCSV(csvText);

      Papa.parse(csvText, {
        skipEmptyLines: true,
        complete: (results) => {
          const parsedCards: Card[] = [];
          let skippedCount = 0;

          const headerRow = results.data[0] as string[];
          const hasHeader =
            headerRow &&
            (headerRow[0]?.toLowerCase().includes('word') ||
              headerRow[0]?.toLowerCase().includes('単語') ||
              headerRow[0]?.toLowerCase().includes('단어') ||
              headerRow[0]?.toLowerCase().includes('wort') ||
              headerRow[0]?.toLowerCase().includes('palabra') ||
              headerRow[0]?.toLowerCase().includes('mot') ||
              headerRow[0]?.toLowerCase().includes('คำ'));
          const startIndex = hasHeader ? 1 : 0;

          for (let i = startIndex; i < results.data.length; i++) {
            const row = results.data[i] as string[];
            if (!row || row.length < 2) {
              skippedCount++;
              continue;
            }

            const front = row[0]?.trim();
            if (!front) {
              skippedCount++;
              continue;
            }

            // Map fields based on detected language config
            const getCol = (idx: number) => row[idx]?.trim() || '';

            let card: Card;

            if (detectedLang === 'en') {
              // English: original 9-column format
              if (row.length >= 9) {
                card = buildEnCard(row, deckId, groupName, i);
              } else if (row.length === 8) {
                card = buildEnCard8(row, deckId, groupName, i);
              } else {
                card = buildMinCard(row, deckId, groupName, i, detectedLang);
              }
            } else if (detectedLang === 'ja') {
              // Japanese: word, kana, kanji, romaji, pos, conjugations, definition, example, contextType
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                phonetic: getCol(1),       // kana
                kanji: getCol(2),          // kanji
                romaji: getCol(3),         // romaji
                partOfSpeech: getCol(4),
                morphology: getCol(5),     // conjugations
                definition: getCol(6),
                example: getCol(7),
                contextType: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'ko') {
              // Korean: word, hangul, hanja, romanization, pos, conjugations, definition, example, contextType
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                phonetic: getCol(1),       // hangul
                hanja: getCol(2),
                romaji: getCol(3),         // romanization
                partOfSpeech: getCol(4),
                morphology: getCol(5),
                definition: getCol(6),
                example: getCol(7),
                contextType: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'de') {
              // German: word, phonetic, gender, pos, declension, derivatives, definition, example, contextType
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                phonetic: getCol(1),
                gender: getCol(2),
                partOfSpeech: getCol(3),
                morphology: getCol(4),     // declension
                derivatives: getCol(5),
                definition: getCol(6),
                example: getCol(7),
                contextType: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'es' || detectedLang === 'fr') {
              // Spanish/French: word, phonetic, gender, pos, conjugations, derivatives, definition, example, contextType
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                phonetic: getCol(1),
                gender: getCol(2),
                partOfSpeech: getCol(3),
                morphology: getCol(4),
                derivatives: getCol(5),
                definition: getCol(6),
                example: getCol(7),
                contextType: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'th') {
              // Thai: word, thai-script, romanization, tone, pos, definition, example, collocations, contextType
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                phonetic: getCol(1),       // thai script
                romaji: getCol(2),         // romanization
                tone: getCol(3),
                partOfSpeech: getCol(4),
                definition: getCol(5),
                example: getCol(6),
                collocations: getCol(7),
                contextType: getCol(8),
                back: getCol(5) + '\n' + getCol(6),
              };
            } else {
              card = buildMinCard(row, deckId, groupName, i, detectedLang);
            }

            parsedCards.push(card);
          }

          resolve({ cards: parsedCards, skipped: skippedCount, detectedLang });
        },
        error: (err: Error) => reject(err),
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'utf-8');
  });
}

function baseCard(deckId: string, groupName: string, i: number): Omit<Card, 'front' | 'back'> {
  return {
    id: deckId + '-' + Date.now() + '-' + i,
    deckId,
    group: groupName,
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    failCount: 0,
    hardCount: 0,
    introducedDate: '',
    lastReviewedDate: '',
  };
}

function buildEnCard(row: string[], deckId: string, groupName: string, i: number): Card {
  const front = row[0]?.trim();
  return {
    ...baseCard(deckId, groupName, i),
    front,
    back: (row[5]?.trim() || '') + '\n' + (row[6]?.trim() || ''),
    phonetic: row[1]?.trim() || '',
    partOfSpeech: row[2]?.trim() || '',
    morphology: row[3]?.trim() || '',
    derivatives: row[4]?.trim() || '',
    definition: row[5]?.trim() || '',
    example: row[6]?.trim() || '',
    collocations: row[7]?.trim() || '',
    contextType: row[8]?.trim() || '',
  };
}

function buildEnCard8(row: string[], deckId: string, groupName: string, i: number): Card {
  const front = row[0]?.trim();
  return {
    ...baseCard(deckId, groupName, i),
    front,
    back: (row[5]?.trim() || '') + '\n' + (row[6]?.trim() || ''),
    phonetic: row[1]?.trim() || '',
    partOfSpeech: row[2]?.trim() || '',
    morphology: row[3]?.trim() || '',
    derivatives: row[4]?.trim() || '',
    definition: row[5]?.trim() || '',
    example: row[6]?.trim() || '',
    collocations: row[7]?.trim() || '',
  };
}

function buildMinCard(
  row: string[],
  deckId: string,
  groupName: string,
  i: number,
  _lang: SupportedLang
): Card {
  const front = row[0]?.trim();
  const definition = row.slice(1).join('\n').trim();
  return {
    ...baseCard(deckId, groupName, i),
    front,
    back: definition,
    definition,
  };
}
