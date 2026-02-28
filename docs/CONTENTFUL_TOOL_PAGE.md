# Contentful — Content Type "Tool Page"

Istruzioni per creare il content type e usarlo nel progetto Next.js.

---

## 1. Creare il Content Type su Contentful

### Dove farlo
1. Vai su [app.contentful.com](https://app.contentful.com)
2. Seleziona il tuo space
3. **Content model** → **Add content type**

### Configurazione

**Name:** `Tool Page`
**API Identifier:** `toolPage` ← deve essere esattamente questo (usato nelle query GraphQL)
**Description:** `Contenuto editoriale per le pagine dei tool interattivi`

---

## 2. Campi da aggiungere

Aggiungi i campi nell'ordine indicato:

### Campo 1 — `title`
| Proprietà | Valore |
|-----------|--------|
| Field type | Short text |
| Name | `Title` |
| Field ID | `title` |
| Required | ✅ Sì |

### Campo 2 — `slug`
| Proprietà | Valore |
|-----------|--------|
| Field type | Short text |
| Name | `Slug` |
| Field ID | `slug` |
| Required | ✅ Sì |
| Validation | Unique field ✅ |

> Il valore deve corrispondere esattamente allo `slug` in `src/lib/tools.js`
> Es: `equity-story`

### Campo 3 — `description`
| Proprietà | Valore |
|-----------|--------|
| Field type | Short text |
| Name | `Description` |
| Field ID | `description` |
| Required | No |

> Breve frase mostrata sotto il titolo nella pagina tool e nella griglia.

### Campo 4 — `howToUse`
| Proprietà | Valore |
|-----------|--------|
| Field type | Rich text |
| Name | `How To Use` |
| Field ID | `howToUse` |
| Required | No |

> Sezione "Come si usa" mostrata dopo il componente interattivo.
> Usa headings H2/H3, paragrafi, liste numerate e liste puntate.
> Non includere il titolo "Come si usa" — viene aggiunto automaticamente dalla pagina.

### Campo 5 — `faq`
| Proprietà | Valore |
|-----------|--------|
| Field type | Rich text |
| Name | `FAQ` |
| Field ID | `faq` |
| Required | No |

> Sezione FAQ opzionale mostrata in fondo alla pagina.
> Usa **H3** per le domande e paragrafi per le risposte.
> Non includere il titolo "FAQ" — viene aggiunto automaticamente.
> Se questo campo è vuoto, la sezione FAQ non appare.

---

## 3. Creare un entry di esempio (Equity Story)

1. **Content** → **Add entry** → seleziona **Tool Page**
2. Compila i campi:
   - **Title:** `Equity Story`
   - **Slug:** `equity-story`
   - **Description:** `Cap table, round di investimento ed exit waterfall per startup.`
   - **How To Use:** (vedi esempio sotto)
   - **FAQ:** (opzionale)
3. **Publish** → il contenuto è live

### Esempio contenuto `howToUse`

```
Fondatori e quote iniziali
Inserisci un founder per ogni socio con la relativa percentuale iniziale.
Le quote vengono normalizzate automaticamente al 100%.

Round di investimento
Aggiungi un round con premoney valuation, importo raccolto, percentuale ESOP
e data di chiusura. Il postmoney e la diluizione vengono calcolati in automatico.
Spunta "Liquidation preference" se l'investitore ha una preference 1x
(participating o non-participating).

Exit waterfall
Inserisci la data e l'importo dell'exit. La tabella mostra per ogni socio:
distribuzione, % dei proventi, MOIC e IRR.
```

### Esempio contenuto `faq` (con H3 per le domande)

```
H3: Cos'è il MOIC?
Il MOIC (Multiple on Invested Capital) indica quante volte l'investitore
riceve indietro il capitale investito. Es. 3.0x = 3 volte il capitale.

H3: Cos'è l'IRR?
L'IRR (Internal Rate of Return) è il tasso di rendimento annualizzato
tenendo conto della data di investimento e della data di exit.

H3: I dati vengono salvati?
No. Tutto è calcolato nel browser in tempo reale. Nessun dato viene inviato
o salvato: puoi usare il tool anche offline.
```

---

## 4. Come funziona l'integrazione

### Flusso dati

```
Contentful (toolPageCollection)
        ↓
  getToolPage(slug)       src/lib/contentful.js
        ↓
  ToolPage({ params })    src/app/tools/[slug]/page.js
        ↓
  <RichText content={howToUse} />   src/components/contentful/rich-text.js
```

### Fallback automatico

Se un tool non ha ancora un entry su Contentful:
- `title` e `description` vengono presi da `src/lib/tools.js`
- `instructions` (array di passi) da `tools.js` viene mostrato come "Come si usa" statico
- La sezione FAQ non appare

Appena si pubblica un entry su Contentful con lo stesso `slug`, i dati Contentful
sovrascrivono automaticamente quelli statici.

### Preview mode

In sviluppo (`NODE_ENV=development`) viene usato il token di preview Contentful,
quindi le bozze non pubblicate sono visibili automaticamente.

---

## 5. Aggiungere un nuovo tool con contenuto Contentful

1. Aggiungere il tool a `src/lib/tools.js` (slug, title, description, category)
2. Creare il componente in `src/components/tools/nome-tool.jsx`
3. Registrarlo in `TOOL_COMPONENTS` in `src/app/tools/[slug]/page.js`
4. Creare l'entry "Tool Page" su Contentful con lo stesso slug
5. Pubblicare l'entry

I campi `howToUse` e `faq` su Contentful sono opzionali: il tool funziona
anche senza entry Contentful, usando i dati statici di `tools.js` come fallback.
