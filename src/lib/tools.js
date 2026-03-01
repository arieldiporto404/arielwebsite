export const TOOLS = [
  {
    slug: 'ltv-calculator',
    title: 'LTV Calculator',
    description: 'Calcola il Lifetime Value e valuta la sostenibilità del tuo modello di acquisizione clienti.',
    category: 'Finanza',
    instructions: [
      'Inserisci ARPU mensile, gross margin e churn rate mensile della tua startup.',
      'Aggiungi il CAC (Customer Acquisition Cost) per vedere il payback time e il rapporto LTV/CAC.',
      'Leggi le tre card con LTV, Payback Time e LTV/CAC con il relativo giudizio di benchmark.',
      'Analizza il grafico del profitto cumulativo per cliente: la zona rossa mostra il periodo in cui stai ancora recuperando il costo di acquisizione.'
    ]
  },
  {
    slug: 'stock-option-calculator',
    title: 'Stock Option Calculator',
    description: 'Calcola il valore effettivo delle tue stock option o diritti di sottoscrizione in una startup.',
    category: 'Finanza',
    instructions: [
      'Seleziona il tipo di società: SRL (quote di capitale sociale) o SPA (azioni).',
      'Inserisci i dati della società: capitale sociale o numero totale di azioni, e l\'ultima valutazione post-money.',
      'Inserisci i dati delle tue opzioni: per le SRL il valore nominale delle quote e il prezzo di sottoscrizione; per le SPA il numero di azioni e lo strike price.',
      'Leggi il valore netto: la differenza tra il controvalore delle opzioni alla valutazione attuale e il costo di esercizio.'
    ]
  },
  {
    slug: 'default-analysis',
    title: 'Default Dead or Alive?',
    description: 'Scopri se la tua startup sopravvive fino alla profittabilità senza raccogliere capitale.',
    category: 'Finanza',
    instructions: [
      'Inserisci i ricavi e i costi mensili attuali della tua startup, insieme alla cassa disponibile.',
      'Imposta i tassi di crescita mensile attesi per ricavi e costi. Il tool proietta i flussi mese per mese per 36 mesi.',
      "Leggi il verdetto: Default Alive se raggiungi il break-even prima di esaurire la cassa, Default Dead altrimenti. I tre scenari (Best, Base, Worst) mostrano la sensitività alle ipotesi di crescita."
    ]
  },
  {
    slug: 'equity-story',
    title: 'Equity Story',
    description: 'Cap table, round di investimento ed exit waterfall per startup.',
    category: 'Finanza',
    instructions: [
      'Fondatori e quote iniziali: aggiungi un founder per ogni socio con nome e percentuale iniziale. Le quote vengono normalizzate automaticamente al 100%, quindi puoi inserire valori indicativi e aggiustarli in seguito.',
      'Round di investimento: aggiungi ogni round con il nome (es. Seed, Series A), la premoney valuation, l\'importo raccolto e l\'eventuale percentuale riservata all\'ESOP. Il postmoney e la diluizione di ciascun socio vengono calcolati in automatico. Spunta "Liquidation preference" se l\'investitore ha una preferenza 1x sul capitale in caso di exit.',
      'Exit waterfall: inserisci la data dell\'exit e il valore totale dei proventi. La tabella mostra per ogni socio l\'importo ricevuto, la percentuale sui proventi totali, il MOIC (quante volte il capitale investito) e l\'IRR annualizzato calcolato dalla data del round.'
    ]
  }
]
