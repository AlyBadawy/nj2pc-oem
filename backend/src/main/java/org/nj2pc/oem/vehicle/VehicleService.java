package org.nj2pc.oem.vehicle;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.operator.Permission;
import org.nj2pc.oem.operator.PermissionGuard;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final OperatorRepository operatorRepository;
    private final PermissionGuard permissionGuard;
    private final AuditLogService auditLogService;

    public VehicleService(VehicleRepository vehicleRepository, OperatorRepository operatorRepository,
                           PermissionGuard permissionGuard, AuditLogService auditLogService) {
        this.vehicleRepository = vehicleRepository;
        this.operatorRepository = operatorRepository;
        this.permissionGuard = permissionGuard;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findByOperator(Authentication authentication, Long operatorId) {
        permissionGuard.requireSelfOrPermission(authentication, operatorId, Permission.RESOURCE_MANAGE_ALL);
        return vehicleRepository.findByOperatorId(operatorId).stream().map(VehicleResponse::from).toList();
    }

    @Transactional
    public VehicleResponse create(Authentication authentication, Long operatorId, VehicleRequest request) {
        permissionGuard.requireSelfOrAnyPermission(authentication, operatorId,
                Permission.RESOURCE_MANAGE_ALL, Permission.RESOURCE_ASSIGN_OWNER);
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + operatorId));
        Vehicle vehicle = new Vehicle();
        vehicle.setOperator(operator);
        applyRequest(vehicle, request);
        vehicle = vehicleRepository.save(vehicle);
        auditLogService.record(EntityType.VEHICLE, vehicle.getId(), "CREATE",
                "Added vehicle " + vehicle.getLicensePlateNumber() + " for " + operator.getCallsign(),
                authentication.getName());
        return VehicleResponse.from(vehicle);
    }

    @Transactional
    public VehicleResponse update(Authentication authentication, Long operatorId, Long id, VehicleRequest request) {
        permissionGuard.requireSelfOrPermission(authentication, operatorId, Permission.RESOURCE_MANAGE_ALL);
        Vehicle vehicle = getVehicleOrThrow(operatorId, id);
        applyRequest(vehicle, request);
        vehicle = vehicleRepository.save(vehicle);
        auditLogService.record(EntityType.VEHICLE, vehicle.getId(), "UPDATE",
                "Updated vehicle " + vehicle.getLicensePlateNumber(), authentication.getName());
        return VehicleResponse.from(vehicle);
    }

    @Transactional
    public void delete(Authentication authentication, Long operatorId, Long id) {
        permissionGuard.requireSelfOrPermission(authentication, operatorId, Permission.RESOURCE_MANAGE_ALL);
        Vehicle vehicle = getVehicleOrThrow(operatorId, id);
        vehicleRepository.delete(vehicle);
        auditLogService.record(EntityType.VEHICLE, id, "DELETE",
                "Deleted vehicle " + vehicle.getLicensePlateNumber(), authentication.getName());
    }

    private Vehicle getVehicleOrThrow(Long operatorId, Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Vehicle not found: " + id));
        if (!vehicle.getOperator().getId().equals(operatorId)) {
            throw ApiException.notFound("Vehicle not found: " + id);
        }
        return vehicle;
    }

    private void applyRequest(Vehicle vehicle, VehicleRequest request) {
        vehicle.setYear(request.year());
        vehicle.setMake(request.make());
        vehicle.setModel(request.model());
        vehicle.setColor(request.color());
        vehicle.setLicensePlateNumber(request.licensePlateNumber());
        vehicle.setLicensePlateState(request.licensePlateState());
        vehicle.setNotes(request.notes());
    }
}
