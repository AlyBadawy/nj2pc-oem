package org.nj2pc.oem.mesh;

import org.nj2pc.oem.common.ApiException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.ConnectException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Actively probes a node's LAN DHCP address range for live clients, rather than relying only on
 * what the node itself advertises under "Local Devices" (a device that's up but hasn't announced
 * itself, or whose announcement expired, would otherwise never show up at all).
 * <p>
 * Browsers have no ICMP capability, so this can't run client-side like the rest of the mesh scan
 * — it runs here instead, where a real ping is available.
 */
@Service
public class MeshLanPingSweepService {

    // A sweep is only ever a handful of addresses per node (DHCP ranges on a mesh LAN are tiny,
    // e.g. a /29 has 5 usable addresses) — this is a sanity cap against a malformed/huge request,
    // not a realistic ceiling.
    private static final int MAX_TOTAL_IPS = 512;
    private static final int PING_TIMEOUT_SECONDS = 1;
    private static final int PING_PROCESS_TIMEOUT_SECONDS = 3;
    private static final int TCP_CONNECT_TIMEOUT_MS = 400;
    private static final int[] TCP_PROBE_PORTS = {80, 443, 22, 554, 8080};

    public MeshLanPingSweepResponse sweep(MeshLanPingSweepRequest request) {
        int totalIps = request.targets().stream().mapToInt(t -> t.ips().size()).sum();
        if (totalIps > MAX_TOTAL_IPS) {
            throw ApiException.badRequest("Too many addresses in one sweep (max " + MAX_TOTAL_IPS + ")");
        }

        record PendingProbe(String nodeHostname, String ip) {
        }
        List<PendingProbe> probes = new ArrayList<>();
        for (MeshLanPingSweepRequest.Target target : request.targets()) {
            for (String ip : target.ips()) {
                probes.add(new PendingProbe(target.nodeHostname(), ip));
            }
        }

        List<MeshLanPingSweepResponse.Result> results = new ArrayList<>();
        // Bounded pool so a sweep across several nodes' ranges runs concurrently instead of
        // waiting out a full ping timeout per address, one at a time.
        ExecutorService executor = Executors.newFixedThreadPool(Math.min(16, Math.max(1, probes.size())));
        try {
            List<Future<Boolean>> futures = new ArrayList<>();
            for (PendingProbe probe : probes) {
                futures.add(executor.submit(() -> isReachable(probe.ip())));
            }
            for (int i = 0; i < futures.size(); i++) {
                boolean reachable;
                try {
                    reachable = futures.get(i).get(PING_PROCESS_TIMEOUT_SECONDS + 2L, TimeUnit.SECONDS);
                } catch (Exception e) {
                    reachable = false;
                }
                if (reachable) {
                    PendingProbe probe = probes.get(i);
                    results.add(new MeshLanPingSweepResponse.Result(probe.nodeHostname(), probe.ip()));
                }
            }
        } finally {
            executor.shutdownNow();
        }
        return new MeshLanPingSweepResponse(results);
    }

    private boolean isReachable(String ip) {
        Boolean pingResult = tryPing(ip);
        if (pingResult != null) return pingResult;
        return tryTcpConnect(ip);
    }

    /** Shells out to the system `ping` for a real ICMP echo rather than
     * java.net.InetAddress.isReachable(), which silently degrades to an unreliable TCP probe on
     * port 7 when the JVM lacks raw-socket privileges — the system ping binary carries its own
     * capability (setcap cap_net_raw) independent of the JVM process. Returns null (not false)
     * when the binary itself can't be run at all, so the caller falls back to a TCP-based check
     * instead of reporting every address as unreachable. */
    private Boolean tryPing(String ip) {
        try {
            Process process = new ProcessBuilder("ping", "-c", "1", "-W", String.valueOf(PING_TIMEOUT_SECONDS), ip)
                    .redirectErrorStream(true)
                    .start();
            boolean finished = process.waitFor(PING_PROCESS_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return false;
            }
            return process.exitValue() == 0;
        } catch (IOException e) {
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** Fallback when ICMP isn't available at all: a refused TCP connection still proves the host
     * is up (it actively responded), even though nothing is listening on that particular port. */
    private boolean tryTcpConnect(String ip) {
        for (int port : TCP_PROBE_PORTS) {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(ip, port), TCP_CONNECT_TIMEOUT_MS);
                return true;
            } catch (ConnectException e) {
                return true;
            } catch (IOException ignored) {
                // timeout or no route — try the next port
            }
        }
        return false;
    }
}
