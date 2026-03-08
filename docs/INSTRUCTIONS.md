# INSTRUCTIONS.md — Personal Finance Tracker

## Panoramica

Tool di finanza personale per uso esclusivo del proprietario. Traccia entrate, uscite e trasferimenti tra conti, monitora il patrimonio nel tempo. Nessuna autenticazione richiesta.

---

## Stack Tecnologico

- **Framework:** Next.js (App Router)
- **UI Components:** shadcn/ui (chart components inclusi, basati su Recharts)
- **Database:** Supabase (PostgreSQL)
- **Lingua UI:** Italiano
- **Tema:** Solo light mode
- **Formattazione numeri:** Formato italiano (`1.234,56 €`)
- **Valuta:** EUR (€)
- **Base path:** `/personal-finance`
- **Deploy:** Vercel + dev locale

---

## Design System

Prima di scrivere qualsiasi componente, **leggi il file `DESIGN_SYSTEM.md`** nella root del repository e segui le sue indicazioni per colori, spacing, tipografia e componenti.

---

## Struttura Navigazione

Sidebar collassabile a sinistra (icone quando compressa, icone + label quando espansa). Sezioni:

1. **Dashboard** — Panoramica finanziaria
2. **Transazioni** — Gestione entrate, uscite, trasferimenti
3. **Conti** — Gestione conti e saldi
4. **Patrimonio** — Evoluzione patrimoniale nel tempo
5. **Impostazioni** — Categorie, sottocategorie, reset dati

---

## Database Schema (Supabase)

### Tabella `accounts`

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK, auto-generato |
| name | text | Nome del conto |
| initial_balance | numeric | Saldo iniziale configurabile |
| created_at | timestamptz | Auto |

### Tabella `categories`

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| name | text | Nome categoria |
| type | text | `income` o `expense` |
| created_at | timestamptz | Auto |

### Tabella `subcategories`

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| category_id | uuid | FK → categories.id |
| name | text | Nome sottocategoria |
| created_at | timestamptz | Auto |

### Tabella `transactions`

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| date | date | Data transazione |
| type | text | `income`, `expense`, `transfer` |
| category_id | uuid | FK → categories.id (null per transfer) |
| subcategory_id | uuid | FK → subcategories.id (null per income e transfer) |
| description | text | Descrizione libera |
| amount | numeric | Importo in EUR (sempre positivo) |
| account_id | uuid | FK → accounts.id (conto di riferimento per income/expense) |
| from_account_id | uuid | FK → accounts.id (solo per transfer) |
| to_account_id | uuid | FK → accounts.id (solo per transfer) |
| created_at | timestamptz | Auto |

### Tabella `historical_balances`

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| account_id | uuid | FK → accounts.id |
| year | integer | Anno (pre-2023) |
| balance | numeric | Saldo di fine anno |
| created_at | timestamptz | Auto |

---

## Categorie e Sottocategorie (Seed Data)

Queste categorie vanno inserite come dati iniziali. L'utente potrà poi gestirle dalla pagina Impostazioni.

### Income (type: `income`) — nessuna sottocategoria

- Paycheck
- Side Hustle
- Gifts
- Interest Rates
- Dividends
- Capital Gains
- Other

### Expenses (type: `expense`) — con sottocategorie

**House:** Rent, Bills, Maintenance, Other - House

**Food:** Groceries, Eat Out, Office Lunch, Bar, Delivery, Other - Food

**Leisure:** Activities, Stadium, Restaurants, Sport, Drink, Concerts, Other - Leisure

**Bills:** Phone, Other - Bills

**Subscriptions:** Netflix, Spotify, Playstation Plus, Amazon Prime, DAZN, iCloud, 1Password, Other - Subscription

**Shopping:** Tech, Books, Wardrobe, LP, Other - Shopping

**PersonalCare:** Barber, Gym, Supplements, Education, Other - Personal Care

**Health:** Doctors, Drugs, Other - Health

**Transportation:** Fuel, Sharing Services, Public Transportation, Parking, Insurance, Car Amortizing, Financing Interest and Expenses, Car Maintenance, Car Expenses, Car Fines, Other - Transportation

**Travel:** Trip, Stay, In-Place Food, In-Place Activities, In-Place Transportation, Other - Travel

**Taxes:** Comunità, Income Taxes, Investment Taxes, Other - Taxes

**Other:** Cash Withdrawal, Fees, Interest, Work Expenses, Gifts, Other Expenses

---

## Import Dati (Bulk)

L'utente importa dati da file Excel. I dati hanno sempre la stessa struttura. Supportare il copia-incolla da Excel o upload file.

### Struttura Entrate

| Colonna Excel | Campo DB | Note |
|---------------|----------|------|
| DATE | date | Data della transazione |
| MONTH | — | Non utilizzare (ultimo giorno del mese, ignorare) |
| CATEGORY | category_id | Matchare con nome categoria income |
| DESCRIPTION | description | Testo libero |
| AMOUNT | amount | Importo in EUR |
| ACCOUNT | account_id | Matchare con nome conto |

### Struttura Uscite

| Colonna Excel | Campo DB | Note |
|---------------|----------|------|
| DATE | date | Data della transazione |
| MONTH | — | Non utilizzare |
| CATEGORY | category_id | Matchare con nome categoria expense |
| DETAILS | subcategory_id | Matchare con nome sottocategoria |
| DESCRIPTION | description | Testo libero |
| AMOUNT | amount | Importo in EUR |
| ACCOUNT | account_id | Matchare con nome conto |

### Struttura Trasferimenti

| Colonna Excel | Campo DB | Note |
|---------------|----------|------|
| DATE | date | Data della transazione |
| MONTH | — | Non utilizzare |
| FROM | from_account_id | Matchare con nome conto origine |
| TO | to_account_id | Matchare con nome conto destinazione |
| DESCRIPTION | description | Testo libero |
| AMOUNT | amount | Importo in EUR |

Il sistema deve validare i dati prima dell'import e segnalare eventuali errori (categoria non trovata, conto non trovato, ecc.).

---

## Pagine e Funzionalità

### 1. Dashboard (`/personal-finance`)

**Periodo di default:** ultimi 12 mesi rolling.

**KPI Cards** (in alto):
- Totale Entrate (periodo selezionato)
- Totale Uscite (periodo selezionato)
- Risparmio (Entrate - Uscite)
- Patrimonio attuale (somma saldi tutti i conti)

**Area Chart — Entrate vs Uscite:**
- Area chart (stile shadcn chart) con due aree sovrapposte
- Entrate in verde, Uscite in rosso
- Asse X: mesi
- Tooltip con valori al passaggio del mouse

**Area Chart — Tasso di Risparmio (%):**
- Area chart stacked expanded (normalizzato a 100%)
- Mostra la percentuale di risparmio vs spese sul totale entrate, mese per mese

**Pie/Donut Chart — Breakdown Spese per Categoria:**
- Donut chart con le categorie di spesa
- Mostra la distribuzione percentuale delle uscite per il periodo selezionato

**Tabelle Pivot — Entrate e Uscite per Categoria:**
- Tabella Income: righe = categorie income, colonne = mesi, con riga Totale
- Tabella Expenses: righe = categorie expense, colonne = mesi, con righe Totale e **Expenses (Ex Income Taxes)** (totale uscite escludendo la categoria Taxes > Income Taxes)
- Design coerente con shadcn/ui

**Modale Dettaglio Categoria (Rolling Analysis):**
- Cliccando su una categoria nelle tabelle pivot, si apre una modale
- Contiene un line chart: spesa mensile vs media mobile
- Rolling window selezionabile dall'utente (3, 6, 12 mesi)
- Se la categoria ha sottocategorie, poter filtrare anche per sottocategoria

### 2. Transazioni (`/personal-finance/transactions`)

**Tabs:** Entrate | Uscite | Trasferimenti

**Tabella transazioni** con:
- Colonne: Data, Categoria, Sottocategoria (se expense), Descrizione, Importo, Conto
- Filtri: per data (range), categoria, conto, importo (min/max)
- Ordinamento su tutte le colonne
- Paginazione

**Azioni:**
- Inserimento manuale singola transazione (form modale)
- Import bulk (upload Excel o copia-incolla dati tabulari)
- Edit transazione esistente (click sulla riga → modale edit)
- Delete transazione singola
- Export in CSV/Excel (dati filtrati)

### 3. Conti (`/personal-finance/accounts`)

- Lista di tutti i conti con **saldo attuale calcolato** (saldo iniziale + entrate - uscite + trasferimenti in entrata - trasferimenti in uscita)
- Possibilità di aggiungere nuovo conto (nome + saldo iniziale)
- Modificare conto esistente (nome, saldo iniziale)
- Eliminare conto (con conferma — warning se ci sono transazioni associate)

### 4. Patrimonio (`/personal-finance/wealth`)

**Grafico evoluzione patrimonio nel tempo:**
- Line chart o area chart
- Asse X: tempo (anni/mesi)
- Asse Y: patrimonio totale (€)
- Per gli anni pre-2023: usa i saldi annuali inseriti manualmente (somma di tutti i conti per quell'anno)
- Dal 2023 in poi: patrimonio calcolato mese per mese dai dati delle transazioni

**Inserimento saldi storici:**
- Form per inserire saldo di fine anno per ogni conto, per gli anni precedenti al 2023

### 5. Impostazioni (`/personal-finance/settings`)

**Gestione Categorie:**
- Lista categorie income ed expense
- Aggiungere, modificare, eliminare categorie
- Per le expense: gestire le sottocategorie associate

**Reset Dati:**
- Bottone per cancellazione totale di tutte le transazioni (entrate, uscite, trasferimenti)
- Conferma con doppio step (es. digitare "RESET" per confermare)
- I conti, le categorie e i saldi storici NON vengono cancellati dal reset

---

## Regole Generali

- **Tutti gli importi sono in EUR**, sempre positivi nel DB
- **Formattazione italiana** ovunque: `1.234,56 €`
- **I trasferimenti** non sono né entrate né uscite, servono solo per calcolare i saldi dei conti
- **La colonna MONTH** nei dati Excel va ignorata
- **Responsive:** l'app deve funzionare bene su desktop; il mobile è secondario ma la sidebar deve collassarsi automaticamente su schermi piccoli
- **Performance:** usare query Supabase ottimizzate, evitare di caricare tutte le transazioni in memoria per i calcoli aggregati — usare query aggregate lato DB quando possibile
- **Error handling:** mostrare toast/notifiche per errori e successi nelle operazioni CRUD e import
