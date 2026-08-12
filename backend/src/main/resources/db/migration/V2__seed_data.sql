INSERT INTO operator_roles (name) VALUES
    ('Com-T'),
    ('Com-L'),
    ('Net Control'),
    ('Weather (Skywarn)'),
    ('Radio Operator'),
    ('Logistics');

INSERT INTO resource_types (name) VALUES
    ('Radio'),
    ('Repeater'),
    ('Equipment');

-- Bootstrap superuser account. Callsign: ADMIN (case-insensitive) / Password: ChangeMe!23
-- Change this password immediately after first login via Account Settings. This operator has
-- admin = TRUE, which bypasses every permission check unconditionally.
INSERT INTO operators (callsign, name, status, password_hash, admin)
VALUES ('ADMIN', 'System Administrator', 'ACTIVE',
        '$2a$10$wn8XRWiXHev927L4CkzzR.a6fFP1srVLHH5JP5xPvt74MBNqKgx6i', TRUE);
