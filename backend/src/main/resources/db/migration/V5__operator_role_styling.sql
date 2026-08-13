ALTER TABLE operator_roles
    ADD COLUMN color        VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    ADD COLUMN access_level VARCHAR(10) NOT NULL DEFAULT 'L1',
    ADD COLUMN sort_order   INT NOT NULL DEFAULT 0;

UPDATE operator_roles SET sort_order = sub.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM operator_roles) sub
WHERE operator_roles.id = sub.id;

UPDATE operator_roles SET color = '#E8A33D', access_level = 'L3' WHERE name = 'Net Control';
UPDATE operator_roles SET color = '#D9A441', access_level = 'L2' WHERE name = 'Com-L';
UPDATE operator_roles SET color = '#9CA3AF', access_level = 'L1' WHERE name = 'Com-T';
