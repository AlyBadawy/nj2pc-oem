package org.nj2pc.oem.checkin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/operator-checkins")
public class OperatorCheckInController {

    private final OperatorCheckInService operatorCheckInService;

    public OperatorCheckInController(OperatorCheckInService operatorCheckInService) {
        this.operatorCheckInService = operatorCheckInService;
    }

    @GetMapping("/active")
    public List<OperatorCheckInResponse> findActive() {
        return operatorCheckInService.findAllOpen();
    }
}
