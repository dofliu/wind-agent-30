# Content research: fact sheets, sourcing, conservative claims, Taiwan usage

The film is a teaching piece. Every chapter needs content that is short on screen and right in
detail, plus sources a teacher can click. The research step writes `research/fact-sheet.md`.
`chapters.js` and the scenes are then written **from the fact sheet, not from memory**.

## 1. Picking the chapters

- **Count:**
  - default 8–12 chapters for a 1.5–2 min film;
  - 4–6 for a short (< 1 min);
  - up to 20–24 for a full history (3 min at 8 s each).
- **One idea per chapter:** a moment, a machine, a person's contribution, or a step in a process. Choose ones that can be **drawn**, with a visible subject and something that moves.
- **Spread them over time:** cover the arc (origins → turning points → today) and avoid five chapters in one decade unless that decade is the story.
- **Variety of place:** if the topic is global, include more than one region, and add a local (Taiwan) chapter when the audience is in Taiwan and a genuine connection exists.
- **Non-history topics** (how a process works, a project's milestones) use step or phase labels instead of dates: `第 1 步`, `2019 Q3`, `v1.0`. The ruler still works.
- **Present the list to the user** as a table before writing scenes (id · dateLabel · title · one-line claim · medium · preset). This is the cheapest moment to change course.

## 2. Fact-sheet template (one section per chapter; the heading must contain the id)

```markdown
## <id> · <dateLabel> · <title>

- **Claim:** the one sentence this chapter teaches.
- **Date / place / people:** with "c." or a range when unsure.
- **Visual facts:** what it looked like: machine parts, materials, tools, clothing, buildings,
  landscape, colours. These drive the scene. Note what you could NOT verify ("rotor count unknown → keep generic").
- **Facts for the info card (2–4):**
  1. <fact> — <source label>
- **Sources:**
  - <label> — https://…
- **Do not claim:** contested firsts, unverified numbers, legends or anecdotes, brand names,
  living-person attributions you could not check.
- **Hedged wording used:** 「約」「已知最早的…之一」「一般認為」「據記載」…
```

`check_film.mjs` checks that every chapter has a section with a source URL and a "Do not
claim" entry, and that no `TODO` remains.

## 3. Sourcing

- **Prefer, in order:**
  1. museum and archive pages, government or agency sites, university pages, the original patent or report;
  2. reputable encyclopaedias (Britannica, Wikipedia *with its cited sources checked* for key numbers);
  3. trade bodies (for statistics, with the year stated).
- **For every number** (year, size, capacity, count), use one good source. Use two when the number is the chapter's headline.
- **Source labels** read like `Wikipedia — Ballpoint pen` or `Smithsonian — …`, with the URL in full.
- **With a web search tool:** search, open the page and copy the exact figure.
- **Without one:** use well-known stable pages, phrase everything conservatively, and mark uncertain items in the fact sheet. Tell the user which facts need a human check.
- **Never invent:** no fake quotes, citations or URLs. If no URL can be confirmed, put the reference title and mark the item for checking.

## 4. Conservative claims (the house style)

| avoid | write instead |
|---|---|
| 「X 發明了 Y」 | 「X 申請了 Y 的專利」/「X 改良了…」/「一般認為 X…」 |
| 「世界第一個…」 | 「已知最早的…之一」/「最早有紀錄的…」 |
| 「1888 年，…」 (uncertain) | 「約 1888 年」/「1880 年代末」 |
| exact counts from one weak source | a range or an order of magnitude 「數百座」 |
| superlatives (最大、最高) without a date | 「當時最大的…之一（2019 年）」 |
| anecdotes as fact | 「據說」/「相傳」, or leave them out |

- **Strong words** (`最早 / 第一 / 唯一 / 首創 / 發明 / first / invented / largest`) are listed by check_film for re-checking. They are allowed when the source says so.
- **Brands and logos:** describe generically (「一家丹麥製造商」, 「美國太空總署」 is a public agency and fine). Never draw a real logo.
- **Living people:** stick to public, documented roles.

## 5. Writing the chapter text (chapters.js)

| field | length / style |
|---|---|
| `dateLabel` | as on a museum label: `約前 3300–3000`, `1888`, `1970 年代`, `第 3 步` |
| `ruler` | ≤ 6 CJK chars or ~8 Latin: `前3200`, `中世紀`, `1888` |
| `title` | 4–10 CJK chars, a noun phrase: 「原子筆」「荷蘭風車造陸」 |
| `titleAlt` | English title (secondary language) |
| `caption` | one line ≤ 30 CJK chars: what you see + why it matters |
| `description` | 3–5 sentences of teaching text for the info card (hedged per §4) |
| `facts` | 2–4 bullets, each traceable to a source |
| `specs` | optional one-line technical spec |
| `style` / `styleAlt` | the art medium (art-media.md), zh + en |

## 6. Traditional Chinese, Taiwan usage (default language `zh-Hant`)

- **Characters:** Traditional only. check_film fails on simplified characters (这 们 为 时 发 电 机 …). The usual traps are copying from simplified sources and IME slips. Prefer 臺/台 consistently (台 is fine and common).
- **Punctuation:** full-width 「，。、：；！？「」『』（）」 between CJK text. Use 「」 for quotes, not “ ”. Write years with Arabic numerals (1888 年). Put a space between CJK and Latin or digits only where it helps readability (e.g. `1938 年`, `0.5 mm`). Be consistent.
- **Vocabulary** (mainland → Taiwan):

  | mainland | Taiwan |
  |---|---|
  | 视频 | 影片 |
  | 软件 | 軟體 |
  | 硬件 | 硬體 |
  | 网络 | 網路 |
  | 信息 | 資訊 |
  | 数据库 | 資料庫 |
  | 默认 | 預設 |
  | 屏幕 | 螢幕 |
  | 打印 | 列印 |
  | 激光 | 雷射 |
  | 芯片 | 晶片 |
  | 集成电路 | 積體電路 |
  | 晶体管 | 電晶體 |
  | 人工智能 | 人工智慧 |
  | 航天 | 太空/航太 |
  | 宇航员 | 太空人 |
  | 质量 (quality) | 品質 |
  | 意大利 | 義大利 |
  | 新西兰 | 紐西蘭 |
  | 悉尼 | 雪梨 |

  check_film warns on these.
- **Names:** use the common Taiwan transliteration where one exists (e.g. 牛頓, 瓦特, 愛迪生). Otherwise give the original name in `titleAlt` or the description: 「比羅（László Bíró）」.
- **Units:** SI with Taiwan conventions (公里, 公尺, 公斤, 瓩/千瓦, 百萬瓦 MW).
- **Era names** may add 民國 for Taiwan-specific events, e.g. 「1987 年（民國 76 年）」, but only where it helps.
- **English films** (`lang: 'en'`): use the same rules in plain international English. Skip the zh-Hant gate.

## 7. Reviewing content (gate)

Before the build, read every chapter's on-screen text aloud against the fact sheet:
- Is every number sourced?
- Is every strong word justified?
- Are all names spelled consistently?
- Is any scene showing something the fact sheet says not to claim (a wrong flag, a brand, an anachronistic machine)?

Fix the text, or the scene, or both.
