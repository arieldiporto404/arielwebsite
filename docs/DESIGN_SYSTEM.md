# Design System

Estratto dal codice esistente del progetto. Non inventato.

---

## Fonts

Definiti in `src/app/layout.js` e mappati come variabili CSS in `globals.css`:

```
--font-sans: var(--font-geist-sans)   → classe Tailwind: font-sans
--font-mono: var(--font-geist-mono)   → classe Tailwind: font-mono
```

Geist Sans è il font di default del body. Geist Mono si usa per codice, valori numerici, monospace.

---

## Breakpoint

Definiti in `globals.css @theme`:

| Nome | Valore |
|------|--------|
| xs   | 390px  |
| sm   | 435px  |
| md   | 768px  |
| lg   | 1024px |
| xl   | 1280px |

---

## Colori ricorrenti

### Testo
| Uso | Classe |
|-----|--------|
| Testo principale | `text-gray-900` |
| Testo secondario | `text-gray-500` |
| Testo dimmed / label | `text-gray-400` |
| Testo su sfondo scuro | `text-white` |
| Link / accent | `text-blue-600` |
| Errore | `text-red-500` |

### Sfondi
| Uso | Classe |
|-----|--------|
| Pagina / bianco | `bg-white` |
| Card / superficie | `bg-gray-50` |
| Hover su card | `bg-gray-100` |
| Sidebar | `bg-zinc-50` |
| Overlay modale | `bg-black/80` |

### Bordi
| Uso | Classe |
|-----|--------|
| Bordo standard | `border-gray-200` |
| Bordo hover | `border-gray-300` |
| Bordo pill dashed | `border-dashed border-gray-400` |

---

## Tipografia

Definita in `globals.css @layer base`:

| Elemento | Classi |
|----------|--------|
| `h1` | `text-2xl md:text-3xl font-semibold tracking-tighter text-black slashed-zero` |
| `h2` | `text-lg md:text-xl font-semibold tracking-tighter text-black slashed-zero` |
| `h3` | `md:text-lg font-semibold tracking-tighter text-black slashed-zero` |
| `p` | `mb-6 leading-[1.75]` |
| Body | `font-sans text-base text-gray-900` |

Pattern frequenti nei componenti:

```
font-semibold tracking-tight          → titoli di card e sezioni
text-xs font-semibold uppercase tracking-widest text-gray-400  → label categoria
text-sm text-gray-500                 → descrizioni secondarie
text-sm font-medium                   → bottoni, link navigazione
```

---

## Spaziature / Layout

### Contenitori di pagina (CSS utilities in globals.css)

```css
content-wrapper: px-6 pt-8 pb-8 lg:px-8 lg:pt-24 lg:pb-16
content:         mx-auto w-full lg:max-w-4xl
```

**Uso standard:**
```jsx
<div className="content-wrapper">
  <div className="content">
    {/* contenuto pagina */}
  </div>
</div>
```

### Sidebar (layout.js)
```jsx
<div className="lg:flex">
  <SideMenu className="relative hidden lg:flex">  {/* lg:w-60 xl:w-72 */}
    <MenuContent />
  </SideMenu>
  <div className="flex flex-1">{children}</div>
</div>
```

---

## Border Radius

| Uso | Classe |
|-----|--------|
| Card, componenti principali | `rounded-xl` |
| Immagini grandi | `rounded-2xl` |
| Bottoni, input, select | `rounded-md` |
| Pill / badge | `rounded-full` |
| Elemento piccolo (shortcut, focus) | `rounded-sm` |

---

## Ombre

### `thumbnail-shadow` (utility custom)
Usata su bookmark card e note card. Simula un effetto multilayer:
```css
box-shadow:
  0 0 0 0.5px #e2e8f0,
  0 0 0 1px rgba(226,232,240,0.5),
  0 0 0 3px #f8fafc,
  0 0 0 3.5px #f1f5f9,
  0 10px 15px -3px rgb(59 130 246/5%),
  0 4px 6px -4px rgb(59 130 246/5%)
```

### Ombre standard Tailwind
- `shadow-xs` — input, select, bottoni
- `shadow-sm` — card UI
- `shadow-lg` — dialogs/modal

---

## Animazioni

### `animate-reveal` (custom keyframe)
Usata su immagini: `className="animate-reveal"`.
Effetto: opacity 0→1 + blur 15px→0 + leggero scale, durata 0.7s ease-in-out.

### Animazioni Tailwind (da `tailwindcss-animate`)
```
animate-in / animate-out
fade-in / fade-out
zoom-in-95 / zoom-out-95
slide-in-from-bottom-2
duration-200 / duration-300
```

Usate principalmente su Dialog, Select (data-state), e voci di menu con `animationDelay` stagger.

---

## Utilities CSS custom (globals.css)

| Utility | Descrizione |
|---------|-------------|
| `content-wrapper` | Padding pagina con responsive |
| `content` | Max-width centrato (`max-w-4xl`) |
| `link-card` | Hover grigio per link navigazione (sidebar) |
| `link` | Link blu con underline al hover |
| `thumbnail-shadow` | Shadow multilayer per card |
| `scrollable-area` | Scroll container full-height |
| `horizontal-scroll-area` | Scroll orizzontale |
| `inline-code` | Stile blocco codice inline |
| `bg-grid` | Background con griglia sottile |
| `bg-dots` | Background con puntini |
| `word-break-word` | Word break |
| `px-safe` | Padding safe area iOS |

---

## Componenti UI (`src/components/ui/`)

### Button

```
variant default:     bg-gray-900 text-gray-50 hover:bg-gray-900/90
variant outline:     border border-gray-200 bg-transparent hover:bg-gray-100
variant secondary:   bg-gray-100 text-gray-900 hover:bg-gray-100/80
variant ghost:       hover:bg-gray-100 hover:text-gray-900
variant link:        text-gray-900 underline-offset-4 hover:underline
variant destructive: bg-red-500 text-gray-50 hover:bg-red-500/90

size default: h-9 px-4 py-2
size sm:      h-8 px-2.5 text-sm
size xs:      h-7 px-2.5 text-xs
size lg:      h-10 px-8
size icon:    size-9
```

Base: `inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-300`

### Card
```
Card:            rounded-xl border border-gray-200 bg-white shadow-sm
CardHeader:      flex flex-col gap-1.5 p-6
CardTitle:       leading-none font-semibold tracking-tight
CardDescription: text-sm text-gray-500
CardContent:     p-6 pt-0
CardFooter:      flex items-center p-6 pt-0
```

### Dialog
```
DialogContent:     fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)]
                   translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border
                   border-gray-200 bg-white p-6 shadow-lg sm:max-w-lg
DialogTitle:       text-lg leading-none font-semibold tracking-tight
DialogDescription: text-sm text-gray-500
DialogHeader:      flex flex-col gap-2 text-center sm:text-left
DialogFooter:      flex flex-col-reverse gap-2 sm:flex-row sm:justify-end
DialogOverlay:     fixed inset-0 z-50 bg-black/80
```

### Table
```
TableHead: h-10 px-2 text-left align-middle font-medium text-gray-500
TableRow:  border-b transition-colors hover:bg-gray-100/50
TableCell: p-2 align-middle
```

### Input
```
flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm
shadow-xs transition-colors placeholder:text-gray-500
focus-visible:ring-1 focus-visible:ring-gray-950
```

---

## Componenti layout (`src/components/`)

### `ScrollArea`
Wrapper per ogni pagina. Usa `scrollable-area` utility.
```jsx
<ScrollArea useScrollAreaId>
  {children}
</ScrollArea>
```

### `FloatingHeader`
Header sticky mobile (nascosto su `lg:`). Si mostra con scroll.
```jsx
<FloatingHeader scrollTitle="Titolo pagina" />
```

### `PageTitle`
`<h1>` con `mb-6`, opzionalmente nascosto su desktop con `className="lg:hidden"`.
```jsx
<PageTitle title="Titolo" />
<PageTitle title="Titolo" className="lg:hidden" />
```

### `SideMenu`
Sidebar desktop. `hidden` su mobile, `lg:flex` su desktop.
Larghezza: `lg:w-60 xl:w-72`.

### `NavigationLink`
Link di navigazione con stato attivo (sfondo nero), hover grigio, shortcut keyboard.

---

## Pattern card interattiva

Da `services-section.js`:
```
rounded-xl border border-gray-200 bg-gray-50 p-5
```
Con hover:
```
transition-colors hover:border-gray-300 hover:bg-gray-100
```

---

## Pattern griglia card

```jsx
// 2 colonne
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

// 3 colonne (con colonna larga)
<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
  <div className="md:col-span-2 ...">  {/* 2/3 */}
  <div className="...">               {/* 1/3 */}
```

---

## Z-index

| Layer | Valore |
|-------|--------|
| Background | z-0 |
| Content wrapper | z-1 |
| Header sticky | z-10 |
| Modal / overlay | z-50 |
