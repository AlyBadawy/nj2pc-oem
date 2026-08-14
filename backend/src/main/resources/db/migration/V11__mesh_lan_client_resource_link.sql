-- LAN devices (cameras, cellular modems, etc. hanging off a node's LAN port) can now be linked
-- to gear/equipment the same way mesh nodes already are, so they can be "added as gear" too.
ALTER TABLE mesh_lan_client_snapshots
    ADD COLUMN resource_id BIGINT REFERENCES resources(id);
