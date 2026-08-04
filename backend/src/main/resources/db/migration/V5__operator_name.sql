ALTER TABLE operators ADD COLUMN name VARCHAR(200);
UPDATE operators SET name = trim(both ' ' from (first_name || ' ' || last_name));
ALTER TABLE operators ALTER COLUMN name SET NOT NULL;
ALTER TABLE operators DROP COLUMN first_name;
ALTER TABLE operators DROP COLUMN last_name;
