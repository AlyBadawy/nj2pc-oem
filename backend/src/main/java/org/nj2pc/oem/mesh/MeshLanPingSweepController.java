package org.nj2pc.oem.mesh;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mesh")
public class MeshLanPingSweepController {

    private final MeshLanPingSweepService meshLanPingSweepService;

    public MeshLanPingSweepController(MeshLanPingSweepService meshLanPingSweepService) {
        this.meshLanPingSweepService = meshLanPingSweepService;
    }

    @PostMapping("/lan-ping-sweep")
    public MeshLanPingSweepResponse sweep(@Valid @RequestBody MeshLanPingSweepRequest request) {
        return meshLanPingSweepService.sweep(request);
    }
}
