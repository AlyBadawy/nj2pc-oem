package org.nj2pc.oem.mesh;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "mesh_link_snapshots")
public class MeshLinkSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mesh_session_id", nullable = false)
    private MeshSession session;

    @Column(name = "from_hostname", nullable = false)
    private String fromHostname;

    @Column(name = "to_hostname", nullable = false)
    private String toHostname;

    @Column(name = "to_mac_address")
    private String toMacAddress;

    @Column(name = "source_section", nullable = false)
    private String sourceSection;

    @Column(name = "link_type_normalized", nullable = false)
    private String linkTypeNormalized;

    @Column(name = "raw_link_type")
    private String rawLinkType;

    @Column(name = "link_quality_status")
    private String linkQualityStatus;

    @Column(name = "rx_percent")
    private String rxPercent;

    @Column(name = "rtt_ms")
    private String rttMs;

    private String snr;

    @Column(name = "n_snr")
    private String nSnr;

    @Column(name = "errors_percent")
    private String errorsPercent;

    private String mbps;

    @Column(name = "distance_miles")
    private String distanceMiles;

    @Column(name = "rx_success_percent")
    private String rxSuccessPercent;

    @Column(name = "tx_success_percent")
    private String txSuccessPercent;

    @Column(name = "rx_cost")
    private String rxCost;

    @Column(name = "tx_cost")
    private String txCost;

    @Column(name = "ping_time_ms")
    private String pingTimeMs;

    @Column(name = "ping_success_percent")
    private String pingSuccessPercent;

    @Column(name = "avg_tx")
    private String avgTx;

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

    public String getFromHostname() {
        return fromHostname;
    }

    public void setFromHostname(String fromHostname) {
        this.fromHostname = fromHostname;
    }

    public String getToHostname() {
        return toHostname;
    }

    public void setToHostname(String toHostname) {
        this.toHostname = toHostname;
    }

    public String getToMacAddress() {
        return toMacAddress;
    }

    public void setToMacAddress(String toMacAddress) {
        this.toMacAddress = toMacAddress;
    }

    public String getSourceSection() {
        return sourceSection;
    }

    public void setSourceSection(String sourceSection) {
        this.sourceSection = sourceSection;
    }

    public String getLinkTypeNormalized() {
        return linkTypeNormalized;
    }

    public void setLinkTypeNormalized(String linkTypeNormalized) {
        this.linkTypeNormalized = linkTypeNormalized;
    }

    public String getRawLinkType() {
        return rawLinkType;
    }

    public void setRawLinkType(String rawLinkType) {
        this.rawLinkType = rawLinkType;
    }

    public String getLinkQualityStatus() {
        return linkQualityStatus;
    }

    public void setLinkQualityStatus(String linkQualityStatus) {
        this.linkQualityStatus = linkQualityStatus;
    }

    public String getRxPercent() {
        return rxPercent;
    }

    public void setRxPercent(String rxPercent) {
        this.rxPercent = rxPercent;
    }

    public String getRttMs() {
        return rttMs;
    }

    public void setRttMs(String rttMs) {
        this.rttMs = rttMs;
    }

    public String getSnr() {
        return snr;
    }

    public void setSnr(String snr) {
        this.snr = snr;
    }

    public String getNSnr() {
        return nSnr;
    }

    public void setNSnr(String nSnr) {
        this.nSnr = nSnr;
    }

    public String getErrorsPercent() {
        return errorsPercent;
    }

    public void setErrorsPercent(String errorsPercent) {
        this.errorsPercent = errorsPercent;
    }

    public String getMbps() {
        return mbps;
    }

    public void setMbps(String mbps) {
        this.mbps = mbps;
    }

    public String getDistanceMiles() {
        return distanceMiles;
    }

    public void setDistanceMiles(String distanceMiles) {
        this.distanceMiles = distanceMiles;
    }

    public String getRxSuccessPercent() {
        return rxSuccessPercent;
    }

    public void setRxSuccessPercent(String rxSuccessPercent) {
        this.rxSuccessPercent = rxSuccessPercent;
    }

    public String getTxSuccessPercent() {
        return txSuccessPercent;
    }

    public void setTxSuccessPercent(String txSuccessPercent) {
        this.txSuccessPercent = txSuccessPercent;
    }

    public String getRxCost() {
        return rxCost;
    }

    public void setRxCost(String rxCost) {
        this.rxCost = rxCost;
    }

    public String getTxCost() {
        return txCost;
    }

    public void setTxCost(String txCost) {
        this.txCost = txCost;
    }

    public String getPingTimeMs() {
        return pingTimeMs;
    }

    public void setPingTimeMs(String pingTimeMs) {
        this.pingTimeMs = pingTimeMs;
    }

    public String getPingSuccessPercent() {
        return pingSuccessPercent;
    }

    public void setPingSuccessPercent(String pingSuccessPercent) {
        this.pingSuccessPercent = pingSuccessPercent;
    }

    public String getAvgTx() {
        return avgTx;
    }

    public void setAvgTx(String avgTx) {
        this.avgTx = avgTx;
    }

    public Map<String, Object> getRawJson() {
        return rawJson;
    }

    public void setRawJson(Map<String, Object> rawJson) {
        this.rawJson = rawJson;
    }
}
