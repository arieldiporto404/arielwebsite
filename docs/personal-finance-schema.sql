-- ============================================================
-- Personal Finance Tracker — Schema + Seed
-- Tutte le tabelle usano prefisso pf_ per isolarsi dal DB esistente
-- ============================================================

-- ============================================================
-- SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS pf_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  initial_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pf_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pf_subcategories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES pf_categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pf_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date NOT NULL,
  type            text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category_id     uuid REFERENCES pf_categories(id) ON DELETE SET NULL,
  subcategory_id  uuid REFERENCES pf_subcategories(id) ON DELETE SET NULL,
  description     text,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  account_id      uuid REFERENCES pf_accounts(id) ON DELETE SET NULL,
  from_account_id uuid REFERENCES pf_accounts(id) ON DELETE SET NULL,
  to_account_id   uuid REFERENCES pf_accounts(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pf_historical_balances (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES pf_accounts(id) ON DELETE CASCADE,
  year       integer NOT NULL,
  balance    numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, year)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_pf_transactions_date         ON pf_transactions(date);
CREATE INDEX IF NOT EXISTS idx_pf_transactions_type         ON pf_transactions(type);
CREATE INDEX IF NOT EXISTS idx_pf_transactions_category_id  ON pf_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_pf_transactions_account_id   ON pf_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_pf_transactions_date_type    ON pf_transactions(date, type);


-- ============================================================
-- SEED — Categorie e Sottocategorie
-- ============================================================

-- Income categories (no subcategories)
WITH ins AS (
  INSERT INTO pf_categories (name, type) VALUES
    ('Paycheck',       'income'),
    ('Side Hustle',    'income'),
    ('Gifts',          'income'),
    ('Interest Rates', 'income'),
    ('Dividends',      'income'),
    ('Capital Gains',  'income'),
    ('Other',          'income')
  ON CONFLICT DO NOTHING
  RETURNING id, name
)
SELECT id, name FROM ins;


-- Expense categories + subcategories
-- House
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('House', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Rent', 'Bills', 'Maintenance', 'Other - House'])
FROM cat;

-- Food
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Food', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Groceries', 'Eat Out', 'Office Lunch', 'Bar', 'Delivery', 'Other - Food'])
FROM cat;

-- Leisure
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Leisure', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Activities', 'Stadium', 'Restaurants', 'Sport', 'Drink', 'Concerts', 'Other - Leisure'])
FROM cat;

-- Bills
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Bills', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Phone', 'Other - Bills'])
FROM cat;

-- Subscriptions
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Subscriptions', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Netflix', 'Spotify', 'Playstation Plus', 'Amazon Prime', 'DAZN', 'iCloud', '1Password', 'Other - Subscription'])
FROM cat;

-- Shopping
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Shopping', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Tech', 'Books', 'Wardrobe', 'LP', 'Other - Shopping'])
FROM cat;

-- PersonalCare
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('PersonalCare', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Barber', 'Gym', 'Supplements', 'Education', 'Other - Personal Care'])
FROM cat;

-- Health
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Health', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Doctors', 'Drugs', 'Other - Health'])
FROM cat;

-- Transportation
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Transportation', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY[
  'Fuel', 'Sharing Services', 'Public Transportation', 'Parking',
  'Insurance', 'Car Amortizing', 'Financing Interest and Expenses',
  'Car Maintenance', 'Car Expenses', 'Car Fines', 'Other - Transportation'
])
FROM cat;

-- Travel
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Travel', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY[
  'Trip', 'Stay', 'In-Place Food', 'In-Place Activities',
  'In-Place Transportation', 'Other - Travel'
])
FROM cat;

-- Taxes
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Taxes', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY['Comunità', 'Income Taxes', 'Investment Taxes', 'Other - Taxes'])
FROM cat;

-- Other
WITH cat AS (
  INSERT INTO pf_categories (name, type) VALUES ('Other', 'expense')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO pf_subcategories (category_id, name)
SELECT id, unnest(ARRAY[
  'Cash Withdrawal', 'Fees', 'Interest', 'Work Expenses', 'Gifts', 'Other Expenses'
])
FROM cat;
