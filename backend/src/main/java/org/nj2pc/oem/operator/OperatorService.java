package org.nj2pc.oem.operator;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.checkin.OperatorCheckIn;
import org.nj2pc.oem.checkin.OperatorCheckInRepository;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.vehicle.Vehicle;
import org.nj2pc.oem.vehicle.VehiclePlateFormatter;
import org.nj2pc.oem.vehicle.VehicleRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class OperatorService {

    private final OperatorRepository operatorRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;
    private final OperatorCheckInRepository operatorCheckInRepository;
    private final VehicleRepository vehicleRepository;

    public OperatorService(OperatorRepository operatorRepository, PasswordEncoder passwordEncoder,
                            PermissionGuard permissionGuard, AuditLogService auditLogService,
                            OperatorCheckInRepository operatorCheckInRepository,
                            VehicleRepository vehicleRepository) {
        this.operatorRepository = operatorRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
        this.operatorCheckInRepository = operatorCheckInRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Transactional(readOnly = true)
    public List<OperatorResponse> findAll(Authentication authentication) {
        permissionGuard.require(authentication, Permission.OPERATOR_LIST);
        Operator caller = permissionGuard.requireCaller(authentication);
        boolean showContactAll = caller.isAdmin() || caller.getPermissions().contains(Permission.OPERATOR_VIEW_CONTACT);
        Map<Long, OperatorCheckIn> openCheckIns = operatorCheckInRepository.findByCheckedOutAtIsNull().stream()
                .collect(Collectors.toMap(c -> c.getOperator().getId(), Function.identity(), (a, b) -> a));
        Map<Long, List<Vehicle>> vehiclesByOperator = vehicleRepository.findAll().stream()
                .collect(Collectors.groupingBy(v -> v.getOperator().getId()));
        return operatorRepository.findAll().stream()
                .map(o -> toResponse(o, caller, showContactAll, openCheckIns.get(o.getId()),
                        vehiclesByOperator.getOrDefault(o.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OperatorResponse findById(Authentication authentication, Long id) {
        permissionGuard.require(authentication, Permission.OPERATOR_LIST);
        Operator caller = permissionGuard.requireCaller(authentication);
        boolean showContactAll = caller.isAdmin() || caller.getPermissions().contains(Permission.OPERATOR_VIEW_CONTACT);
        Operator operator = getOperatorOrThrow(id);
        OperatorCheckIn checkIn = operatorCheckInRepository.findByOperatorIdAndCheckedOutAtIsNull(id).orElse(null);
        List<Vehicle> vehicles = vehicleRepository.findByOperatorId(id);
        return toResponse(operator, caller, showContactAll, checkIn, vehicles);
    }

    private OperatorResponse toResponse(Operator o, Operator caller, boolean showContactAll, OperatorCheckIn checkIn,
                                         List<Vehicle> vehicles) {
        boolean showContact = showContactAll || o.getId().equals(caller.getId());
        return OperatorResponse.from(o, showContact, checkIn, VehiclePlateFormatter.summarize(vehicles));
    }

    @Transactional
    public OperatorResponse create(Authentication authentication, OperatorRequest request) {
        permissionGuard.require(authentication, Permission.OPERATOR_CREATE);
        if (operatorRepository.existsByCallsignIgnoreCase(request.callsign())) {
            throw ApiException.conflict("Callsign already registered: " + request.callsign());
        }
        if (request.password() == null || request.password().isBlank()) {
            throw ApiException.badRequest("Password is required");
        }
        Operator operator = new Operator();
        applyRequest(operator, request);
        String creatorCallsign = authentication.getName();
        operatorRepository.findByCallsignIgnoreCase(creatorCallsign).ifPresent(operator::setCreatedBy);
        operator = operatorRepository.save(operator);
        auditLogService.record(EntityType.OPERATOR, operator.getId(), "CREATE",
                "Registered operator " + operator.getCallsign(), creatorCallsign);
        return OperatorResponse.from(operator);
    }

    @Transactional
    public OperatorResponse update(Authentication authentication, Long id, OperatorRequest request) {
        permissionGuard.require(authentication, Permission.OPERATOR_EDIT);
        Operator caller = permissionGuard.requireCaller(authentication);
        Operator operator = getOperatorOrThrow(id);
        if (!operator.getCallsign().equalsIgnoreCase(request.callsign())
                && operatorRepository.existsByCallsignIgnoreCase(request.callsign())) {
            throw ApiException.conflict("Callsign already registered: " + request.callsign());
        }
        Set<Permission> previousPermissions = new HashSet<>(operator.getPermissions());
        applyRequest(operator, request);
        boolean canManagePermissions = caller.isAdmin()
                || caller.getPermissions().contains(Permission.OPERATOR_MANAGE_PERMISSIONS);
        if (!canManagePermissions) {
            // OPERATOR_EDIT alone only covers profile fields — changing another operator's
            // permission grants still requires OPERATOR_MANAGE_PERMISSIONS (or admin), otherwise
            // this endpoint would be a privilege-escalation path.
            operator.setPermissions(previousPermissions);
        }
        operator = operatorRepository.save(operator);
        auditLogService.record(EntityType.OPERATOR, operator.getId(), "UPDATE",
                "Updated operator " + operator.getCallsign(), authentication.getName());
        return OperatorResponse.from(operator);
    }

    @Transactional
    public OperatorResponse updatePermissions(Authentication authentication, Long id, OperatorPermissionsRequest request) {
        permissionGuard.require(authentication, Permission.OPERATOR_MANAGE_PERMISSIONS);
        Operator operator = getOperatorOrThrow(id);
        operator.setPermissions(new HashSet<>(request.permissions()));
        operator = operatorRepository.save(operator);
        auditLogService.record(EntityType.OPERATOR, operator.getId(), "PERMISSION_GRANT",
                "Set permissions for " + operator.getCallsign() + " to " + operator.getPermissions(),
                authentication.getName());
        return OperatorResponse.from(operator);
    }

    @Transactional
    public void delete(Long id) {
        if (!operatorRepository.existsById(id)) {
            throw ApiException.notFound("Operator not found: " + id);
        }
        operatorRepository.deleteById(id);
    }

    Operator getOperatorOrThrow(Long id) {
        return operatorRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + id));
    }

    private void applyRequest(Operator operator, OperatorRequest request) {
        operator.setCallsign(request.callsign());
        operator.setName(request.name());
        operator.setLicenseClass(request.licenseClass());
        operator.getDmrIds().clear();
        if (request.dmrIds() != null) {
            operator.getDmrIds().addAll(request.dmrIds());
        }
        operator.setPhone(request.phone());
        operator.setEmail(request.email());
        operator.setStatus(request.status());
        operator.setNotes(request.notes());
        operator.setAddressLine1(request.addressLine1());
        operator.setAddressLine2(request.addressLine2());
        operator.setAddressAttn(request.addressAttn());
        operator.setLatitude(request.latitude());
        operator.setLongitude(request.longitude());
        operator.setGridSquare(request.gridSquare());
        operator.setPermissions(request.permissions() != null ? new HashSet<>(request.permissions()) : new HashSet<>());
        if (request.password() != null && !request.password().isBlank()) {
            operator.setPasswordHash(passwordEncoder.encode(request.password()));
        }
    }
}
