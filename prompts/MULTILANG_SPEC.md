# WordForge 多語系單字卡格式規範 v1.0

## 架構決策：單一入口 + 語言切換

**為何選擇單一入口？**
- 套牌資料庫共用（IndexedDB），學習記錄統一管理
- 語言篩選器在 Dashboard 可隨時切換
- 未來新增語言只需加一份 Config + 一份 Prompt，不需要複製整個 App

---

## 各語言欄位差異分析

| 語言 | 獨特欄位 | 備註 |
|:---|:---|:---|
| 🇺🇸 English | collocations, derivatives | 原版 9 欄，已有完整 Prompt |
| 🇯🇵 日本語 | kana（假名）, kanji（漢字）, romaji | 無 IPA，假名取代音標 |
| 🇰🇷 한국어 | hangul（韓字）, hanja（漢字）, romanization | 結構類似日語 |
| 🇩🇪 Deutsch | gender（der/die/das）, declension（格變化）| 無搭配詞 |
| 🇪🇸 Español | gender（m./f.）, conjugation | 結構類似法語 |
| 🇫🇷 Français | gender（m./f.）, conjugation | 結構類似西語 |
| 🇹🇭 ภาษาไทย | thai-script, tone（聲調）, romanization | 無 IPA |

---

## CSV 欄位規範（各語言）

### 🇺🇸 English（原版，不變）
```
Word,Phonetic,Part of Speech,Inflections,Derivatives,Definition,Example,Collocations,ContextType
```
→ 詳見 `prompts/english-cards_zh-tw.txt`

---

### 🇯🇵 日本語
```
Word,Kana,Kanji,Romaji,Part of Speech,Conjugations,Definition,Example,ContextType
```
| 欄位 | 說明 | 範例 |
|:---|:---|:---|
| Word | 單字（平假名或片假名原型） | `たべる` or `コーヒー` |
| Kana | 完整假名讀音 | `たべる` |
| Kanji | 漢字形式（若無填 `None`） | `食べる` |
| Romaji | 羅馬字 | `taberu` |
| Part of Speech | 詞性（日語格式） | `動詞` / `名詞` / `形容詞` |
| Conjugations | 活用形（逗號分隔） | `たべない, たべます, たべた` |
| Definition | 繁體中文解釋（全型分號分隔） | `吃；食用` |
| Example | 60-120 字元例句 | `毎日野菜を食べることが大切です。` |
| ContextType | `General / Daily` / `Campus Life` / `Academic / Tech` | `General / Daily` |

---

### 🇰🇷 한국어
```
Word,Hangul,Hanja,Romanization,Part of Speech,Conjugations,Definition,Example,ContextType
```
| 欄位 | 說明 | 範例 |
|:---|:---|:---|
| Word | 標準韓字原型 | `먹다` |
| Hangul | 韓字讀音（與 Word 通常相同） | `먹다` |
| Hanja | 漢字形式（若無填 `None`） | `食-` |
| Romanization | 國際標準羅馬字（RR） | `meokda` |
| Part of Speech | 品詞 | `동사` / `명사` / `형용사` |
| Conjugations | 活用形 | `먹어, 먹습니다, 먹었다` |
| Definition | 繁體中文解釋 | `吃；食用` |
| Example | 例句 | `매일 아침 밥을 먹어요.` |
| ContextType | `General / Daily` / `Campus Life` / `Academic / Tech` | `General / Daily` |

---

### 🇩🇪 Deutsch
```
Word,Phonetic,Gender,Part of Speech,Declension,Derivatives,Definition,Example,ContextType
```
| 欄位 | 說明 | 範例 |
|:---|:---|:---|
| Word | 原型（名詞加冠詞） | `das Haus` |
| Phonetic | IPA | `/daːs haʊ̯s/` |
| Gender | 文法性 | `n.` / `m.` / `f.` |
| Part of Speech | 詞性 | `n.` / `v.` / `adj.` |
| Declension | 格變化/動詞變位 | `des Hauses, dem Haus, das Haus` |
| Derivatives | 衍生詞 | `häuslich (adj.), Haushalt (n.)` |
| Definition | 繁體中文解釋 | `房子；家` |
| Example | 例句 | `Das Haus ist sehr groß und hat einen Garten.` |
| ContextType | `General / Daily` / `Academic / Tech` | `General / Daily` |

---

### 🇪🇸 Español
```
Word,Phonetic,Gender,Part of Speech,Conjugations,Derivatives,Definition,Example,ContextType
```
| 欄位 | 說明 | 範例 |
|:---|:---|:---|
| Word | 原型 | `comer` |
| Phonetic | IPA | `/koˈmeɾ/` |
| Gender | 文法性（名詞用） | `m.` / `f.` / `-` |
| Part of Speech | 詞性 | `v.` / `n.` / `adj.` |
| Conjugations | 動詞變位（主要時態） | `como, comes, come, comemos` |
| Derivatives | 衍生詞 | `comida (n.f.), comedor (n.m.)` |
| Definition | 繁體中文解釋 | `吃；食用` |
| Example | 例句（60-120字） | `Me gusta comer frutas frescas todos los días.` |
| ContextType | `General / Daily` / `Academic / Tech` | `General / Daily` |

---

### 🇫🇷 Français
```
Word,Phonetic,Gender,Part of Speech,Conjugations,Derivatives,Definition,Example,ContextType
```
| 欄位 | 說明 | 範例 |
|:---|:---|:---|
| Word | 原型 | `manger` |
| Phonetic | IPA | `/mɑ̃ʒe/` |
| Gender | 文法性（名詞用） | `m.` / `f.` / `-` |
| Part of Speech | 詞性 | `v.` / `n.` / `adj.` |
| Conjugations | 動詞變位 | `je mange, tu manges, il mange` |
| Derivatives | 衍生詞 | `nourriture (n.f.), repas (n.m.)` |
| Definition | 繁體中文解釋 | `吃；食用` |
| Example | 例句 | `J'aime manger des fruits frais chaque matin.` |
| ContextType | `General / Daily` / `Academic / Tech` | `General / Daily` |

---

### 🇹🇭 ภาษาไทย
```
Word,ThaiScript,Romanization,Tone,Part of Speech,Definition,Example,Collocations,ContextType
```
| 欄位 | 說明 | 範例 |
|:---|:---|:---|
| Word | 泰語單字 | `กิน` |
| ThaiScript | 完整泰文拼寫（通常與 Word 相同） | `กิน` |
| Romanization | RTGS 羅馬字 | `kin` |
| Tone | 聲調 | `mid` / `low` / `falling` / `high` / `rising` |
| Part of Speech | 詞性 | `กริยา` / `นาม` / `คำคุณศัพท์` |
| Definition | 繁體中文解釋 | `吃；食用` |
| Example | 例句 | `ฉันกินข้าวทุกวันเช้า` |
| Collocations | 搭配詞（2-3個） | `กินข้าว, กินยา` |
| ContextType | `General / Daily` / `Academic / Tech` | `General / Daily` |

---

## 自動語言偵測邏輯

CSV 匯入時，系統會依序嘗試：
1. **Header 比對**：比對第一行欄位名稱（如含 `Kana` → 日語）
2. **Unicode 字元偵測**：
   - `[\u3040-\u309f]` → 日語（平假名）
   - `[\uAC00-\uD7AF]` → 韓語（韓字）
   - `[\u0E00-\u0E7F]` → 泰語
   - `/[áéíóúüñ¿¡]/` → 西班牙語
   - `/[àâæçèéêëîïôœùûüÿ]/` → 法語
   - `/\b(der|die|das)\b/` → 德語
3. **Fallback**：預設為英語

---

## 微批次建議（每語言）

| 語言 | 建議批次 | 原因 |
|:---|:---|:---|
| English | ≤ 30 | 已驗證 |
| 日語 | ≤ 20 | 活用形複雜，需逐一確認 |
| 韓語 | ≤ 20 | 同上 |
| 德語 | ≤ 20 | 格變化較多 |
| 西語/法語 | ≤ 25 | 動詞變位中等複雜 |
| 泰語 | ≤ 15 | 聲調標記需人工確認 |
