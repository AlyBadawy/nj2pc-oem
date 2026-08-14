package org.nj2pc.oem.mesh;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeshLinkSnapshotRepository extends JpaRepository<MeshLinkSnapshot, Long> {
    List<MeshLinkSnapshot> findBySessionId(Long sessionId);

    long countBySessionId(Long sessionId);
}
