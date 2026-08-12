package org.nj2pc.oem.auth;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.config.JwtService;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorPrincipal;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.OperatorResponse;
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

    public AuthService(OperatorRepository operatorRepository,
                        PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager,
                        JwtService jwtService,
                        AuditLogService auditLogService) {
        this.operatorRepository = operatorRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
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
        return OperatorResponse.from(operator);
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
}
