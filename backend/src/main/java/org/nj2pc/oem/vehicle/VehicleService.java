package org.nj2pc.oem.vehicle;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final OperatorRepository operatorRepository;

    public VehicleService(VehicleRepository vehicleRepository, OperatorRepository operatorRepository) {
        this.vehicleRepository = vehicleRepository;
        this.operatorRepository = operatorRepository;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findByOperator(Authentication authentication, Long operatorId) {
        requireSelfOrAdmin(authentication, operatorId);
        return vehicleRepository.findByOperatorId(operatorId).stream().map(VehicleResponse::from).toList();
    }

    @Transactional
    public VehicleResponse create(Authentication authentication, Long operatorId, VehicleRequest request) {
        requireSelfOrAdmin(authentication, operatorId);
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + operatorId));
        Vehicle vehicle = new Vehicle();
        vehicle.setOperator(operator);
        applyRequest(vehicle, request);
        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse update(Authentication authentication, Long operatorId, Long id, VehicleRequest request) {
        requireSelfOrAdmin(authentication, operatorId);
        Vehicle vehicle = getVehicleOrThrow(operatorId, id);
        applyRequest(vehicle, request);
        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void delete(Authentication authentication, Long operatorId, Long id) {
        requireSelfOrAdmin(authentication, operatorId);
        Vehicle vehicle = getVehicleOrThrow(operatorId, id);
        vehicleRepository.delete(vehicle);
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

    private void requireSelfOrAdmin(Authentication authentication, Long operatorId) {
        if (isAdmin(authentication)) {
            return;
        }
        Operator caller = operatorRepository.findByCallsignIgnoreCase(authentication.getName())
                .orElseThrow(() -> ApiException.forbidden("You may only manage your own vehicles"));
        if (!caller.getId().equals(operatorId)) {
            throw ApiException.forbidden("You may only manage your own vehicles");
        }
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }
}
