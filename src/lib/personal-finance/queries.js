'use client'
import supabase from './supabase'

// Supabase ha max_rows=1000 per default — questa funzione recupera TUTTE
// le transazioni con paginazione per bypassare quel limite
async function fetchAllTransactions(query) {
  const batchSize = 1000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await query(from, from + batchSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < batchSize) break
    from += batchSize
  }
  return all
}

// ============================================================
// ACCOUNTS
// ============================================================

export async function getAccounts() {
  const { data, error } = await supabase
    .from('pf_accounts')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createAccount({ name, initial_balance, account_type = 'asset', tags = [] }) {
  const { data, error } = await supabase
    .from('pf_accounts')
    .insert({ name, initial_balance, account_type, tags })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAccount(id, { name, initial_balance, account_type, tags }) {
  const { data, error } = await supabase
    .from('pf_accounts')
    .update({ name, initial_balance, account_type, tags })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Saldo di tutti i conti ad una data specifica
export async function getAccountsWithBalanceAtDate(targetDate) {
  const accounts = await getAccounts()

  const txs = await fetchAllTransactions((from, to) =>
    supabase
      .from('pf_transactions')
      .select('type, amount, account_id, from_account_id, to_account_id')
      .lte('date', targetDate)
      .order('created_at', { ascending: true })
      .range(from, to)
  )

  const delta = {}
  for (const t of txs) {
    const amt = Number(t.amount)
    if (t.type === 'income' && t.account_id) {
      delta[t.account_id] = (delta[t.account_id] || 0) + amt
    } else if (t.type === 'expense' && t.account_id) {
      delta[t.account_id] = (delta[t.account_id] || 0) - amt
    } else if (t.type === 'transfer') {
      if (t.from_account_id) delta[t.from_account_id] = (delta[t.from_account_id] || 0) - amt
      if (t.to_account_id)   delta[t.to_account_id]   = (delta[t.to_account_id]   || 0) + amt
    }
  }

  return accounts.map((acc) => ({
    ...acc,
    balance: Number(acc.initial_balance) + (delta[acc.id] || 0)
  }))
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('pf_accounts').delete().eq('id', id)
  if (error) throw error
}

// Saldo attuale = initial_balance + entrate - uscite + trasferimenti in entrata - trasferimenti in uscita
export async function getAccountsWithBalance() {
  const accounts = await getAccounts()

  const txs = await fetchAllTransactions((from, to) =>
    supabase
      .from('pf_transactions')
      .select('type, amount, account_id, from_account_id, to_account_id')
      .order('created_at', { ascending: true })
      .range(from, to)
  )

  const delta = {}
  for (const t of txs) {
    const amt = Number(t.amount)
    if (t.type === 'income' && t.account_id) {
      delta[t.account_id] = (delta[t.account_id] || 0) + amt
    } else if (t.type === 'expense' && t.account_id) {
      delta[t.account_id] = (delta[t.account_id] || 0) - amt
    } else if (t.type === 'transfer') {
      if (t.from_account_id) delta[t.from_account_id] = (delta[t.from_account_id] || 0) - amt
      if (t.to_account_id)   delta[t.to_account_id]   = (delta[t.to_account_id]   || 0) + amt
    }
  }

  return accounts.map((acc) => ({
    ...acc,
    current_balance: Number(acc.initial_balance) + (delta[acc.id] || 0)
  }))
}

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories(type) {
  let q = supabase
    .from('pf_categories')
    .select('*, pf_subcategories(id, name)')
    .order('name', { ascending: true })
  if (type) q = q.eq('type', type)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createCategory({ name, type }) {
  const { data, error } = await supabase
    .from('pf_categories')
    .insert({ name, type })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id, { name }) {
  const { data, error } = await supabase
    .from('pf_categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('pf_categories').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// SUBCATEGORIES
// ============================================================

export async function createSubcategory({ category_id, name }) {
  const { data, error } = await supabase
    .from('pf_subcategories')
    .insert({ category_id, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSubcategory(id, { name }) {
  const { data, error } = await supabase
    .from('pf_subcategories')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSubcategory(id) {
  const { error } = await supabase.from('pf_subcategories').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// TRANSACTIONS
// ============================================================

export async function getTransactions({ type, dateFrom, dateTo, categoryId, accountId, amountMin, amountMax, page = 1, pageSize = 50 } = {}) {
  let q = supabase
    .from('pf_transactions')
    .select(`
      *,
      pf_categories(id, name, type),
      pf_subcategories(id, name),
      account:pf_accounts!pf_transactions_account_id_fkey(id, name),
      from_account:pf_accounts!pf_transactions_from_account_id_fkey(id, name),
      to_account:pf_accounts!pf_transactions_to_account_id_fkey(id, name)
    `, { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) q = q.eq('type', type)
  if (dateFrom) q = q.gte('date', dateFrom)
  if (dateTo) q = q.lte('date', dateTo)
  if (categoryId) q = q.eq('category_id', categoryId)
  if (accountId) {
    if (type === 'transfer') {
      q = q.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    } else {
      q = q.eq('account_id', accountId)
    }
  }
  if (amountMin != null) q = q.gte('amount', amountMin)
  if (amountMax != null) q = q.lte('amount', amountMax)

  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error

  // count può tornare null con join complesse — fallback con query separata
  if (count === null) {
    let cq = supabase.from('pf_transactions').select('id', { count: 'exact', head: true })
    if (type) cq = cq.eq('type', type)
    if (dateFrom) cq = cq.gte('date', dateFrom)
    if (dateTo) cq = cq.lte('date', dateTo)
    if (categoryId) cq = cq.eq('category_id', categoryId)
    if (accountId) {
      if (type === 'transfer') cq = cq.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      else cq = cq.eq('account_id', accountId)
    }
    if (amountMin != null) cq = cq.gte('amount', amountMin)
    if (amountMax != null) cq = cq.lte('amount', amountMax)
    const { count: fallbackCount } = await cq
    return { data, count: fallbackCount ?? data.length }
  }

  return { data, count }
}

export async function createTransaction(tx) {
  const { data, error } = await supabase
    .from('pf_transactions')
    .insert(tx)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(id, tx) {
  const { data, error } = await supabase
    .from('pf_transactions')
    .update(tx)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('pf_transactions').delete().eq('id', id)
  if (error) throw error
}

export async function bulkInsertTransactions(rows) {
  const { data, error } = await supabase
    .from('pf_transactions')
    .insert(rows)
    .select()
  if (error) throw error
  return data
}

// ============================================================
// RESET
// ============================================================

export async function resetAllTransactions() {
  const { error } = await supabase.from('pf_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}

// ============================================================
// DASHBOARD AGGREGATES
// ============================================================

// Entrate e uscite mensili (ultimi N mesi)
export async function getMonthlyTotals(dateFrom, dateTo) {
  return fetchAllTransactions((from, to) =>
    supabase
      .from('pf_transactions')
      .select('date, type, amount')
      .in('type', ['income', 'expense'])
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('created_at', { ascending: true })
      .range(from, to)
  )
}

// KPI totals per periodo
export async function getKpiTotals(dateFrom, dateTo) {
  const data = await fetchAllTransactions((from, to) =>
    supabase
      .from('pf_transactions')
      .select('type, amount')
      .in('type', ['income', 'expense'])
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('created_at', { ascending: true })
      .range(from, to)
  )

  let totalIncome = 0
  let totalExpense = 0
  for (const r of data) {
    if (r.type === 'income') totalIncome += Number(r.amount)
    else totalExpense += Number(r.amount)
  }
  return { totalIncome, totalExpense, savings: totalIncome - totalExpense }
}

// Totale patrimonio attuale
export async function getTotalWealth() {
  const accounts = await getAccountsWithBalance()
  return accounts.reduce((sum, a) => sum + a.current_balance, 0)
}

// Breakdown spese per categoria nel periodo
export async function getExpensesByCategory(dateFrom, dateTo) {
  const data = await fetchAllTransactions((from, to) =>
    supabase
      .from('pf_transactions')
      .select('amount, category_id, pf_categories(id, name)')
      .eq('type', 'expense')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('created_at', { ascending: true })
      .range(from, to)
  )

  const map = {}
  for (const r of data) {
    const catId = r.category_id
    const catName = r.pf_categories?.name || 'Altro'
    if (!map[catId]) map[catId] = { id: catId, name: catName, total: 0 }
    map[catId].total += Number(r.amount)
  }
  return Object.values(map).sort((a, b) => b.total - a.total)
}

// Tabella pivot: per categoria × mese
export async function getPivotData(type, dateFrom, dateTo) {
  return fetchAllTransactions((from, to) =>
    supabase
      .from('pf_transactions')
      .select('date, amount, category_id, subcategory_id, pf_categories(id, name), pf_subcategories(id, name)')
      .eq('type', type)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('created_at', { ascending: true })
      .range(from, to)
  )
}

// Dati mensili per una categoria specifica (rolling analysis)
export async function getCategoryMonthlyData(categoryId, dateFrom, dateTo, subcategoryId) {
  let q = supabase
    .from('pf_transactions')
    .select('date, amount, subcategory_id, pf_subcategories(id, name)')
    .eq('category_id', categoryId)
    .gte('date', dateFrom)
    .lte('date', dateTo)
  if (subcategoryId) q = q.eq('subcategory_id', subcategoryId)
  const { data, error } = await q
  if (error) throw error
  return data
}

// ============================================================
// HISTORICAL BALANCES (patrimonio)
// ============================================================

export async function getHistoricalBalances() {
  const { data, error } = await supabase
    .from('pf_historical_balances')
    .select('*, pf_accounts(id, name)')
    .order('year', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertHistoricalBalance({ account_id, year, balance }) {
  const { data, error } = await supabase
    .from('pf_historical_balances')
    .upsert({ account_id, year, balance }, { onConflict: 'account_id,year' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteHistoricalBalance(id) {
  const { error } = await supabase.from('pf_historical_balances').delete().eq('id', id)
  if (error) throw error
}

// Tutte le transazioni con campi necessari per calcolo saldi per conto
export async function getAllTransactionsForAccounts() {
  const { data, error } = await supabase
    .from('pf_transactions')
    .select('date, type, amount, account_id, from_account_id, to_account_id')
    .order('date', { ascending: true })
    .limit(10000)
  if (error) throw error
  return data
}

// Patrimonio mensile (calcolato da tutte le transazioni con paginazione)
export async function getWealthByMonth() {
  const accounts = await getAccounts()
  const transactions = await fetchAllTransactions((from, to) =>
    supabase
      .from('pf_transactions')
      .select('date, type, amount, account_id, from_account_id, to_account_id')
      .order('date', { ascending: true })
      .range(from, to)
  )
  return { accounts, transactions }
}
