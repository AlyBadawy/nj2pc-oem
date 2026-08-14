package org.nj2pc.oem.mesh;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.nj2pc.oem.resource.Resource;

import java.util.Map;

@Entity
@Table(name = "mesh_node_snapshots")
public class MeshNodeSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mesh_session_id", nullable = false)
    private MeshSession session;

    @Column(nullable = false)
    private String hostname;

    @Column(name = "is_local_node", nullable = false)
    private boolean localNode;

    @Column(name = "mac_address")
    private String macAddress;

    @Column(name = "mesh_ip_address")
    private String meshIpAddress;

    @Column(name = "link_local_address")
    private String linkLocalAddress;

    private String model;

    @Column(name = "firmware_version")
    private String firmwareVersion;

    private String latitude;

    private String longitude;

    @Column(name = "claimed_distance_mi")
    private String claimedDistanceMi;

    private String channel;

    private String band;

    @Column(name = "frequency_mhz")
    private String frequencyMhz;

    @Column(name = "channel_width")
    private String channelWidth;

    @Column(name = "rf_power_dbm")
    private String rfPowerDbm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private Resource resource;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_json", columnDefinition = "jsonb")
    private Map<String, Object> rawJson;

    public Long getId() {
        return id;
    }

    public MeshSession getSession() {
        return session;
    }

    public void setSession(MeshSession session) {
        this.session = session;
    }

    public String getHostname() {
        return hostname;
    }

    public void setHostname(String hostname) {
        this.hostname = hostname;
    }

    public boolean isLocalNode() {
        return localNode;
    }

    public void setLocalNode(boolean localNode) {
        this.localNode = localNode;
    }

    public String getMacAddress() {
        return macAddress;
    }

    public void setMacAddress(String macAddress) {
        this.macAddress = macAddress;
    }

    public String getMeshIpAddress() {
        return meshIpAddress;
    }

    public void setMeshIpAddress(String meshIpAddress) {
        this.meshIpAddress = meshIpAddress;
    }

    public String getLinkLocalAddress() {
        return linkLocalAddress;
    }

    public void setLinkLocalAddress(String linkLocalAddress) {
        this.linkLocalAddress = linkLocalAddress;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getFirmwareVersion() {
        return firmwareVersion;
    }

    public void setFirmwareVersion(String firmwareVersion) {
        this.firmwareVersion = firmwareVersion;
    }

    public String getLatitude() {
        return latitude;
    }

    public void setLatitude(String latitude) {
        this.latitude = latitude;
    }

    public String getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = longitude;
    }

    public String getClaimedDistanceMi() {
        return claimedDistanceMi;
    }

    public void setClaimedDistanceMi(String claimedDistanceMi) {
        this.claimedDistanceMi = claimedDistanceMi;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getBand() {
        return band;
    }

    public void setBand(String band) {
        this.band = band;
    }

    public String getFrequencyMhz() {
        return frequencyMhz;
    }

    public void setFrequencyMhz(String frequencyMhz) {
        this.frequencyMhz = frequencyMhz;
    }

    public String getChannelWidth() {
        return channelWidth;
    }

    public void setChannelWidth(String channelWidth) {
        this.channelWidth = channelWidth;
    }

    public String getRfPowerDbm() {
        return rfPowerDbm;
    }

    public void setRfPowerDbm(String rfPowerDbm) {
        this.rfPowerDbm = rfPowerDbm;
    }

    public Resource getResource() {
        return resource;
    }

    public void setResource(Resource resource) {
        this.resource = resource;
    }

    public Map<String, Object> getRawJson() {
        return rawJson;
    }

    public void setRawJson(Map<String, Object> rawJson) {
        this.rawJson = rawJson;
    }
}
