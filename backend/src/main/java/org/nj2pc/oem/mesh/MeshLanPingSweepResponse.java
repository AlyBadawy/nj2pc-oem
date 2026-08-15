package org.nj2pc.oem.mesh;

import java.util.List;

public record MeshLanPingSweepResponse(
        List<Result> results
) {
    public record Result(String nodeHostname, String ip) {
    }
}
