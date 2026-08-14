package org.nj2pc.oem.mesh;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeshSessionRepository extends JpaRepository<MeshSession, Long> {
    List<MeshSession> findByIncidentIdOrderByCapturedAtDesc(Long incidentId);
}
