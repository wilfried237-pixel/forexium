-- Migration: add related_transaction_id to transactions to link payment transactions to original sales
ALTER TABLE transactions
  ADD COLUMN related_transaction_id VARCHAR(100) NULL AFTER id;

-- Optional: create index for faster lookups
CREATE INDEX idx_transactions_related_tx ON transactions (related_transaction_id);
