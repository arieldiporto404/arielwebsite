# Tool Guidelines

Regole da seguire quando si crea un nuovo tool interattivo per questo sito.

---

## Struttura file

```
src/
├── lib/
│   └── tools.js                          ← registro di tutti i tool
├── app/
│   └── tools/
│       ├── page.js                       ← griglia tool (non toccare)
│       └── [slug]/
│           └── page.js                   ← pagina singolo tool (non toccare)
└── components/
    └── tools/
        └── nome-tool.jsx                 ← componente interattivo
```

---

## 1. Registrare il tool in `src/lib/tools.js`

Aggiungere un oggetto all'array `TOOLS`:

```js
{
  slug: 'nome-tool',               // URL: /tools/nome-tool
  title: 'Nome Tool',              // mostrato in griglia e pagina
  description: 'Frase breve.',     // sotto il titolo nella griglia e in pagina
  category: 'Categoria',           // etichetta label card (es. 'Finanza', 'Analisi')
  instructions: [                  // passi numerati sopra al tool (opzionale)
    'Primo passo.',
    'Secondo passo.',
    'Terzo passo.'
  ]
}
```

---

## 2. Registrare il componente in `src/app/tools/[slug]/page.js`

```js
import { NomeTool } from '@/components/tools/nome-tool'

const TOOL_COMPONENTS = {
  'equity-story': EquityStory,
  'nome-tool': NomeTool,      // ← aggiungere qui
}
```

---

## 3. Creare il componente `src/components/tools/nome-tool.jsx`

### Regole obbligatorie

**`'use client'` sempre in cima** — i tool sono interattivi (useState, useCallback, ecc.).

**Colori: usare il design system del sito**, non inventare palette custom:

```js
// COLORI CORRETTI per il sito (light theme)
const C = {
  bg:         '#f9fafb',   // gray-50
  surface:    '#ffffff',   // white
  border:     '#e5e7eb',   // gray-200
  borderLight:'#f3f4f6',   // gray-100
  text:       '#111827',   // gray-900
  dim:        '#9ca3af',   // gray-400
  accent:     '#2563eb',   // blue-600
  green:      '#16a34a',   // green-700
  red:        '#dc2626',   // red-600
  amber:      '#d97706',   // amber-600
  cyan:       '#0891b2',   // cyan-700
  headerBg:   '#f9fafb',   // gray-50
  inputBg:    '#f3f4f6',   // gray-100
}
```

**Font: usare le variabili CSS del sito** (Geist, già caricate):

```js
const mono = 'var(--font-geist-mono, ui-monospace, monospace)'
const sans = 'var(--font-geist-sans, system-ui, sans-serif)'
```

**Non importare font esterni** (no Google Fonts, no `<link>` inline).

**Non usare `minHeight: '100vh'`** — la pagina ha già il suo scroll wrapper.

**Wrapper del componente**: nessun padding extra, nessun background aggiuntivo. Il padding viene gestito dalla pagina.

```jsx
// CORRETTO
export function NomeTool() {
  return (
    <div style={{ fontFamily: sans, color: C.text }}>
      {/* contenuto */}
    </div>
  )
}

// SBAGLIATO
export function NomeTool() {
  return (
    <div style={{ background: '#0b0b10', minHeight: '100vh', padding: '24px' }}>
      {/* dark theme non allineato al sito */}
    </div>
  )
}
```

---

## 4. Layout della pagina tool

La pagina `/tools/[slug]` renderizza automaticamente:

```
[FloatingHeader con titolo]
[content-wrapper]
  [content]
    h1 — tool.title
    p  — tool.description
    ol — tool.instructions (se presente)
  [div mt-6 px-6 lg:px-8]
    <ToolComponent />
```

Il componente non deve includere titolo o descrizione: ci pensa la pagina.

---

## 5. Pattern per card/tabella nel tool

### Card
```jsx
<div style={{
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: C.surface,
  overflowX: 'auto'
}}>
```

### Header di sezione
```jsx
<div style={{
  padding: '6px 8px',
  background: C.headerBg,
  borderBottom: `1px solid ${C.border}`,
  fontSize: 11,
  fontFamily: mono,
  fontWeight: 700,
  color: C.accent
}}>
  NOME SEZIONE
</div>
```

### Cella tabella (destra)
```js
{
  padding: '5px 8px',
  borderRight: `1px solid ${C.border}`,
  borderBottom: `1px solid ${C.border}`,
  fontSize: 12,
  fontFamily: mono,
  textAlign: 'right',
  whiteSpace: 'nowrap'
}
```

### Cella tabella (sinistra, sticky)
```js
{
  padding: '5px 8px',
  fontFamily: sans,
  fontWeight: 600,
  fontSize: 12,
  textAlign: 'left',
  color: C.text,
  position: 'sticky',
  left: 0,
  background: C.surface,
  zIndex: 2
}
```

### Bottone azione
```js
{
  background: 'transparent',
  border: `1px dashed ${C.borderLight}`,
  color: C.dim,
  fontSize: 11,
  fontFamily: mono,
  cursor: 'pointer',
  padding: '4px 12px',
  borderRadius: 4,
  transition: 'all 0.15s'
}
```

Con hover via `onMouseEnter`/`onMouseLeave`.

---

## 6. Esempio completo struttura tool

```jsx
'use client'

import { useState } from 'react'

const C = {
  bg: '#f9fafb', surface: '#ffffff', border: '#e5e7eb', borderLight: '#f3f4f6',
  text: '#111827', dim: '#9ca3af', accent: '#2563eb', green: '#16a34a',
  red: '#dc2626', headerBg: '#f9fafb', inputBg: '#f3f4f6'
}

const mono = 'var(--font-geist-mono, ui-monospace, monospace)'
const sans = 'var(--font-geist-sans, system-ui, sans-serif)'

export function NomeTool() {
  const [state, setState] = useState(...)

  return (
    <div style={{ fontFamily: sans, color: C.text }}>
      {/* tabella / input interattivi */}
      <div style={{
        overflowX: 'auto',
        borderRadius: 6,
        border: `1px solid ${C.border}`,
        background: C.surface
      }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          {/* ... */}
        </table>
      </div>
      {/* bottoni azione */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button style={/* btn style */}>+ Aggiungi</button>
      </div>
    </div>
  )
}
```

---

## 7. Contenuto editoriale su Contentful (opzionale ma consigliato)

Ogni tool può avere un entry "Tool Page" su Contentful che fornisce:
- `title` e `description` (override dei valori statici in `tools.js`)
- `howToUse` (Rich Text) — sezione "Come si usa" ricca, mostrata **dopo** il tool
- `faq` (Rich Text) — sezione FAQ opzionale in fondo alla pagina

### Setup Contentful
Vedi **`docs/CONTENTFUL_TOOL_PAGE.md`** per le istruzioni complete su come creare
il content type e le entry.

### Senza Contentful
Il tool funziona anche senza entry Contentful:
- `title` e `description` vengono da `tools.js`
- `instructions` (array di stringhe in `tools.js`) viene mostrato come lista numerata statica

### Layout risultante della pagina

```
[FloatingHeader - titolo]
[content-wrapper]
  [content]
    h1 — title
    p  — description
  [px-6 lg:px-8]
    <ToolComponent />           ← componente interattivo
  [content - se howToUse o instructions]
    h2 "Come si usa"
    <RichText> o <ol> statico
  [content - se faq]
    h2 "FAQ"
    <RichText>
```

---

## 8. Checklist prima di pubblicare un tool

- [ ] `'use client'` in cima al file
- [ ] Colori da `C` sopra (light theme)
- [ ] Font da variabili CSS Geist
- [ ] Nessun `minHeight: '100vh'` nel wrapper
- [ ] Nessun font Google importato
- [ ] Aggiunto a `TOOLS` in `src/lib/tools.js`
- [ ] Aggiunto a `TOOL_COMPONENTS` in `src/app/tools/[slug]/page.js`
- [ ] Il componente NON include titolo/descrizione (ci pensa la pagina)
- [ ] Scroll orizzontale gestito con `overflowX: 'auto'` sul contenitore tabella
- [ ] (Opzionale) Entry "Tool Page" creata e pubblicata su Contentful
