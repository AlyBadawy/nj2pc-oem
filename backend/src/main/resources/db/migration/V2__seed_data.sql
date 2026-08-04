INSERT INTO operator_roles (name) VALUES
    ('Com-T'),
    ('Com-L'),
    ('Net Control'),
    ('Weather (Skywarn)'),
    ('Radio Operator'),
    ('Logistics');

-- Bootstrap admin account. Callsign: ADMIN (case-insensitive) / Password: ChangeMe!23
-- Change this password immediately after first login via Account Settings.
INSERT INTO operators (callsign, name, status, password_hash, access_level)
VALUES ('ADMIN', 'System Administrator', 'ACTIVE',
        '$2a$10$wn8XRWiXHev927L4CkzzR.a6fFP1srVLHH5JP5xPvt74MBNqKgx6i', 'ADMIN');
