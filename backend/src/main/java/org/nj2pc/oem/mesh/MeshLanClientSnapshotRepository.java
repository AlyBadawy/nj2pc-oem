package org.nj2pc.oem.mesh;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeshLanClientSnapshotRepository extends JpaRepository<MeshLanClientSnapshot, Long> {
    List<MeshLanClientSnapshot> findBySessionId(Long sessionId);
}
