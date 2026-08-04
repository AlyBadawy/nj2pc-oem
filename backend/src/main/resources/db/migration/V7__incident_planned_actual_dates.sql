ALTER TABLE incidents RENAME COLUMN start_time TO planned_start_time;
ALTER TABLE incidents RENAME COLUMN end_time TO planned_end_time;
ALTER TABLE incidents ADD COLUMN actual_start_time TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN actual_end_time TIMESTAMPTZ;
