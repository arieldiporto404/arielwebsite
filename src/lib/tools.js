export const TOOLS = [
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
