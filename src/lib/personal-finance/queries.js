'use client'
import supabase from './supabase'

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

export async function createAccount({ name, initial_balance }) {
  const { data, error } = await supabase
    .from('pf_accounts')
    .insert({ name, initial_balance })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAccount(id, { name, initial_balance }) {
  const { data, error } = await supabase
    .from('pf_accounts')
    .update({ name, initial_balance })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('pf_accounts').delete().eq('id', id)
  if (error) throw error
}

// Saldo attuale = initial_balance + entrate - uscite + trasferimenti in entrata - trasferimenti in uscita
export async function getAccountsWithBalance() {
  const accounts = await getAccounts()

  // Aggregate entrate per conto
  const { data: incomes } = await supabase
    .from('pf_transactions')
    .select('account_id, amount')
    .eq('type', 'income')

  // Aggregate uscite per conto
  const { data: expenses } = await supabase
    .from('pf_transactions')
    .select('account_id, amount')
    .eq('type', 'expense')

  // Trasferimenti in entrata
  const { data: transfersIn } = await supabase
    .from('pf_transactions')
    .select('to_account_id, amount')
    .eq('type', 'transfer')

  // Trasferimenti in uscita
  const { data: transfersOut } = await supabase
    .from('pf_transactions')
    .select('from_account_id, amount')
    .eq('type', 'transfer')

  const sumMap = (arr, key) => {
    const m = {}
    for (const r of arr || []) {
      m[r[key]] = (m[r[key]] || 0) + Number(r.amount)
    }
    return m
  }

  const incomeMap = sumMap(incomes, 'account_id')
  const expenseMap = sumMap(expenses, 'account_id')
  const transferInMap = sumMap(transfersIn, 'to_account_id')
  const transferOutMap = sumMap(transfersOut, 'from_account_id')

  return accounts.map((acc) => ({
    ...acc,
    current_balance:
      Number(acc.initial_balance) +
      (incomeMap[acc.id] || 0) -
      (expenseMap[acc.id] || 0) +
      (transferInMap[acc.id] || 0) -
      (transferOutMap[acc.id] || 0)
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
  const { data, error } = await supabase
    .from('pf_transactions')
    .select('date, type, amount')
    .in('type', ['income', 'expense'])
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .limit(10000)
  if (error) throw error
  return data
}

// KPI totals per periodo
export async function getKpiTotals(dateFrom, dateTo) {
  const { data, error } = await supabase
    .from('pf_transactions')
    .select('type, amount')
    .in('type', ['income', 'expense'])
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .limit(10000)
  if (error) throw error

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
  const { data, error } = await supabase
    .from('pf_transactions')
    .select('amount, category_id, pf_categories(id, name)')
    .eq('type', 'expense')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .limit(10000)
  if (error) throw error

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
  const { data, error } = await supabase
    .from('pf_transactions')
    .select('date, amount, category_id, subcategory_id, pf_categories(id, name), pf_subcategories(id, name)')
    .eq('type', type)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .limit(10000)
  if (error) throw error
  return data
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

// Patrimonio mensile dal 2023 in poi (calcolato da transazioni)
export async function getWealthByMonth() {
  const accounts = await getAccountsWithBalance()
  const { data: txAll, error } = await supabase
    .from('pf_transactions')
    .select('date, type, amount, account_id, from_account_id, to_account_id')
    .gte('date', '2023-01-01')
    .order('date', { ascending: true })
  if (error) throw error
  return { accounts, transactions: txAll }
}
