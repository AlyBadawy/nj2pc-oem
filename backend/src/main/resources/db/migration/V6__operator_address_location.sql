ALTER TABLE operators
    ADD COLUMN address_line1 VARCHAR(255),
    ADD COLUMN address_line2 VARCHAR(255),
    ADD COLUMN address_attn VARCHAR(100),
    ADD COLUMN latitude VARCHAR(20),
    ADD COLUMN longitude VARCHAR(20),
    ADD COLUMN grid_square VARCHAR(10);
