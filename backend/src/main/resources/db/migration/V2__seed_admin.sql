-- Bootstrap admin account. Username: admin / Password: ChangeMe123!
-- Change this password immediately after first login (no self-service change endpoint yet —
-- update via SQL or re-register through /api/auth/register once authenticated as this admin).
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$pezC71y043OQiBQScU8xgeGfDUYwcKOILPK4nHlOpmRIz73UE7Rgy', 'ADMIN');
