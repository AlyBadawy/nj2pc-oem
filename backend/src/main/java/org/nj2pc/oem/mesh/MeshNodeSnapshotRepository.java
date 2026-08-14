package org.nj2pc.oem.mesh;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeshNodeSnapshotRepository extends JpaRepository<MeshNodeSnapshot, Long> {
    List<MeshNodeSnapshot> findBySessionId(Long sessionId);

    long countBySessionId(Long sessionId);
}
