import Papa from 'papaparse';
import type { Card } from './types';
import { detectLanguageFromCSV, detectSecondaryLang, parseDefinitionBilingual } from './languages';
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
                card = buildMinCard(row, deckId, groupName, i);
              }
            } else if (detectedLang === 'ja') {
              // Japanese: word, kana, kanji, romaji, pos, conjugations, definition, example, context_type
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                ipa: getCol(1),       // kana mapped to ipa
                kanji: getCol(2),          // kanji
                romaji: getCol(3),         // romaji
                pos: getCol(4),
                inflections: getCol(5),     // conjugations mapped to inflections
                definition: getCol(6),
                example: getCol(7),
                context_type: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'ko') {
              // Korean: word, hangul, hanja, romanization, pos, conjugations, definition, example, context_type
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                ipa: getCol(1),       // hangul mapped to ipa
                hanja: getCol(2),
                romaji: getCol(3),         // romanization
                pos: getCol(4),
                inflections: getCol(5),
                definition: getCol(6),
                example: getCol(7),
                context_type: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'de') {
              // German: word, ipa, gender, pos, inflections, derivatives, definition, example, context_type
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                ipa: getCol(1),
                gender: getCol(2),
                pos: getCol(3),
                inflections: getCol(4),     // declension
                derivatives: getCol(5),
                definition: getCol(6),
                example: getCol(7),
                context_type: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'es' || detectedLang === 'fr') {
              // Spanish/French: word, ipa, gender, pos, inflections, derivatives, definition, example, context_type
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                ipa: getCol(1),
                gender: getCol(2),
                pos: getCol(3),
                inflections: getCol(4),
                derivatives: getCol(5),
                definition: getCol(6),
                example: getCol(7),
                context_type: getCol(8),
                back: getCol(6) + '\n' + getCol(7),
              };
            } else if (detectedLang === 'th') {
              // Thai: word, thai-script, romanization, tone, pos, definition, example, collocations, context_type
              card = {
                ...baseCard(deckId, groupName, i),
                front,
                ipa: getCol(1),       // thai script
                romaji: getCol(2),         // romanization
                tone: getCol(3),
                pos: getCol(4),
                definition: getCol(5),
                example: getCol(6),
                collocations: getCol(7),
                context_type: getCol(8),
                back: getCol(5) + '\n' + getCol(6),
              };
            } else {
              card = buildMinCard(row, deckId, groupName, i);
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
  const rawDef = row[5]?.trim() || '';
  const { secondary, isBilingual } = parseDefinitionBilingual(rawDef);
  const definitionLang = isBilingual && secondary ? detectSecondaryLang(secondary) : undefined;
  return {
    ...baseCard(deckId, groupName, i),
    front,
    back: rawDef + '\n' + (row[6]?.trim() || ''),
    ipa: row[1]?.trim() || '',
    pos: row[2]?.trim() || '',
    inflections: row[3]?.trim() || '',
    derivatives: row[4]?.trim() || '',
    definition: rawDef,
    definitionLang,
    example: row[6]?.trim() || '',
    collocations: row[7]?.trim() || '',
    context_type: row[8]?.trim() || '',
  };
}

function buildEnCard8(row: string[], deckId: string, groupName: string, i: number): Card {
  const front = row[0]?.trim();
  const rawDef = row[5]?.trim() || '';
  const { secondary, isBilingual } = parseDefinitionBilingual(rawDef);
  const definitionLang = isBilingual && secondary ? detectSecondaryLang(secondary) : undefined;
  return {
    ...baseCard(deckId, groupName, i),
    front,
    back: rawDef + '\n' + (row[6]?.trim() || ''),
    ipa: row[1]?.trim() || '',
    pos: row[2]?.trim() || '',
    inflections: row[3]?.trim() || '',
    derivatives: row[4]?.trim() || '',
    definition: rawDef,
    definitionLang,
    example: row[6]?.trim() || '',
    collocations: row[7]?.trim() || '',
  };
}

function buildMinCard(
  row: string[],
  deckId: string,
  groupName: string,
  i: number
): Card {
  const front = row[0]?.trim();
  const rawDef = row.slice(1).join('\n').trim();
  const { secondary, isBilingual } = parseDefinitionBilingual(rawDef);
  const definitionLang = isBilingual && secondary ? detectSecondaryLang(secondary) : undefined;
  return {
    ...baseCard(deckId, groupName, i),
    front,
    back: rawDef,
    definition: rawDef,
    definitionLang,
  };
}
