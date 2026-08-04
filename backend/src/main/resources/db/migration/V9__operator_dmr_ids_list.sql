CREATE TABLE operator_dmr_ids (
    operator_id BIGINT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    sort_order  INT NOT NULL,
    dmr_id      VARCHAR(20) NOT NULL,
    PRIMARY KEY (operator_id, sort_order)
);

INSERT INTO operator_dmr_ids (operator_id, sort_order, dmr_id)
SELECT id, 0, dmr_id FROM operators WHERE dmr_id IS NOT NULL AND dmr_id <> '';

ALTER TABLE operators DROP COLUMN dmr_id;
