package org.nj2pc.oem.commsplan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunicationChannelRepository extends JpaRepository<CommunicationChannel, Long> {
    List<CommunicationChannel> findByPlanIdOrderByChannelNumberAsc(Long planId);
}
