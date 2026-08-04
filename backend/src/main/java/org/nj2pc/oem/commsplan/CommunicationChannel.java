package org.nj2pc.oem.commsplan;

import jakarta.persistence.*;

@Entity
@Table(name = "communication_channels")
public class CommunicationChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "communication_plan_id", nullable = false)
    private CommunicationPlan plan;

    @Column(name = "zone_group", nullable = false)
    private String zoneGroup;

    @Column(name = "channel_number", nullable = false)
    private Integer channelNumber;

    @Column(nullable = false)
    private String function;

    @Column(name = "channel_name", nullable = false)
    private String channelName;

    private String assignment;

    @Column(name = "rx_frequency")
    private String rxFrequency;

    @Column(name = "rx_tone")
    private String rxTone;

    @Column(name = "tx_frequency")
    private String txFrequency;

    @Column(name = "tx_tone")
    private String txTone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChannelMode mode = ChannelMode.ANALOG;

    private String remarks;

    public Long getId() {
        return id;
    }

    public CommunicationPlan getPlan() {
        return plan;
    }

    public void setPlan(CommunicationPlan plan) {
        this.plan = plan;
    }

    public String getZoneGroup() {
        return zoneGroup;
    }

    public void setZoneGroup(String zoneGroup) {
        this.zoneGroup = zoneGroup;
    }

    public Integer getChannelNumber() {
        return channelNumber;
    }

    public void setChannelNumber(Integer channelNumber) {
        this.channelNumber = channelNumber;
    }

    public String getFunction() {
        return function;
    }

    public void setFunction(String function) {
        this.function = function;
    }

    public String getChannelName() {
        return channelName;
    }

    public void setChannelName(String channelName) {
        this.channelName = channelName;
    }

    public String getAssignment() {
        return assignment;
    }

    public void setAssignment(String assignment) {
        this.assignment = assignment;
    }

    public String getRxFrequency() {
        return rxFrequency;
    }

    public void setRxFrequency(String rxFrequency) {
        this.rxFrequency = rxFrequency;
    }

    public String getRxTone() {
        return rxTone;
    }

    public void setRxTone(String rxTone) {
        this.rxTone = rxTone;
    }

    public String getTxFrequency() {
        return txFrequency;
    }

    public void setTxFrequency(String txFrequency) {
        this.txFrequency = txFrequency;
    }

    public String getTxTone() {
        return txTone;
    }

    public void setTxTone(String txTone) {
        this.txTone = txTone;
    }

    public ChannelMode getMode() {
        return mode;
    }

    public void setMode(ChannelMode mode) {
        this.mode = mode;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
