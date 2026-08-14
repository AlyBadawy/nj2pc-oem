package org.nj2pc.oem.mesh;

import jakarta.persistence.*;
import org.nj2pc.oem.resource.Resource;

@Entity
@Table(name = "mesh_lan_client_snapshots")
public class MeshLanClientSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mesh_session_id", nullable = false)
    private MeshSession session;

    @Column(name = "node_hostname", nullable = false)
    private String nodeHostname;

    @Column(name = "device_hostname", nullable = false)
    private String deviceHostname;

    @Column(name = "device_url")
    private String deviceUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private Resource resource;

    public Long getId() {
        return id;
    }

    public MeshSession getSession() {
        return session;
    }

    public void setSession(MeshSession session) {
        this.session = session;
    }

    public String getNodeHostname() {
        return nodeHostname;
    }

    public void setNodeHostname(String nodeHostname) {
        this.nodeHostname = nodeHostname;
    }

    public String getDeviceHostname() {
        return deviceHostname;
    }

    public void setDeviceHostname(String deviceHostname) {
        this.deviceHostname = deviceHostname;
    }

    public String getDeviceUrl() {
        return deviceUrl;
    }

    public void setDeviceUrl(String deviceUrl) {
        this.deviceUrl = deviceUrl;
    }

    public Resource getResource() {
        return resource;
    }

    public void setResource(Resource resource) {
        this.resource = resource;
    }
}
