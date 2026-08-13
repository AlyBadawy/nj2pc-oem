package org.nj2pc.oem.auth;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.checkin.OperatorCheckInRepository;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.config.JwtService;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorPrincipal;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.OperatorResponse;
import org.nj2pc.oem.vehicle.VehiclePlateFormatter;
import org.nj2pc.oem.vehicle.VehicleRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final OperatorRepository operatorRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;
    private final OperatorCheckInRepository operatorCheckInRepository;
    private final VehicleRepository vehicleRepository;

    public AuthService(OperatorRepository operatorRepository,
                        PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager,
                        JwtService jwtService,
                        AuditLogService auditLogService,
                        OperatorCheckInRepository operatorCheckInRepository,
                        VehicleRepository vehicleRepository) {
        this.operatorRepository = operatorRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
        this.operatorCheckInRepository = operatorCheckInRepository;
        this.vehicleRepository = vehicleRepository;
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.callsign(), request.password())
        );
        OperatorPrincipal principal = (OperatorPrincipal) authentication.getPrincipal();
        Operator operator = principal.getOperator();
        String token = jwtService.generateToken(principal);
        auditLogService.record(EntityType.OPERATOR, operator.getId(), "LOGIN",
                operator.getCallsign() + " logged in", operator.getCallsign());
        return new AuthResponse(token, operator.getCallsign(), operator.getName(), operator.isAdmin(),
                operator.getPermissions());
    }

    @Transactional
    public void logout(String callsign) {
        Operator operator = operatorRepository.findByCallsignIgnoreCase(callsign)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + callsign));
        auditLogService.record(EntityType.OPERATOR, operator.getId(), "LOGOUT",
                operator.getCallsign() + " logged out", operator.getCallsign());
    }

    @Transactional(readOnly = true)
    public OperatorResponse me(String callsign) {
        Operator operator = operatorRepository.findByCallsignIgnoreCase(callsign)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + callsign));
        var checkIn = operatorCheckInRepository.findByOperatorIdAndCheckedOutAtIsNull(operator.getId()).orElse(null);
        String plateSummary = VehiclePlateFormatter.summarize(vehicleRepository.findByOperatorId(operator.getId()));
        return OperatorResponse.from(operator, true, checkIn, plateSummary);
    }

    @Transactional
    public void changePassword(String callsign, ChangePasswordRequest request) {
        Operator operator = operatorRepository.findByCallsignIgnoreCase(callsign)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + callsign));

        if (operator.getPasswordHash() == null
                || !passwordEncoder.matches(request.currentPassword(), operator.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }

        operator.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        operatorRepository.save(operator);
    }

    @Transactional
    public OperatorResponse updateProfile(String callsign, SelfProfileUpdateRequest request) {
        Operator operator = operatorRepository.findByCallsignIgnoreCase(callsign)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + callsign));

        operator.setName(request.name());
        operator.setLicenseClass(request.licenseClass());
        operator.getDmrIds().clear();
        if (request.dmrIds() != null) {
            operator.getDmrIds().addAll(request.dmrIds());
        }
        operator.setPhone(request.phone());
        operator.setEmail(request.email());
        operator.setNotes(request.notes());
        operator.setAddressLine1(request.addressLine1());
        operator.setAddressLine2(request.addressLine2());
        operator.setAddressAttn(request.addressAttn());
        operator.setLatitude(request.latitude());
        operator.setLongitude(request.longitude());
        operator.setGridSquare(request.gridSquare());
        operator = operatorRepository.save(operator);

        auditLogService.record(EntityType.OPERATOR, operator.getId(), "UPDATE",
                operator.getCallsign() + " updated their own profile", callsign);

        var checkIn = operatorCheckInRepository.findByOperatorIdAndCheckedOutAtIsNull(operator.getId()).orElse(null);
        String plateSummary = VehiclePlateFormatter.summarize(vehicleRepository.findByOperatorId(operator.getId()));
        return OperatorResponse.from(operator, true, checkIn, plateSummary);
    }
}
