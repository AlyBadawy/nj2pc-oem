package org.nj2pc.oem.operator;

import org.nj2pc.oem.auditlog.AuditLogService;
import org.nj2pc.oem.auditlog.EntityType;
import org.nj2pc.oem.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@Service
public class OperatorPhotoService {

    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );
    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final Path photosDir;
    private final OperatorRepository operatorRepository;
    private final AuditLogService auditLogService;

    public OperatorPhotoService(@Value("${app.storage.dir}") String storageDir,
                                 OperatorRepository operatorRepository,
                                 AuditLogService auditLogService) {
        this.photosDir = Path.of(storageDir, "operator-photos");
        try {
            Files.createDirectories(photosDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to create photo storage directory: " + photosDir, e);
        }
        this.operatorRepository = operatorRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public void upload(Authentication authentication, Long operatorId, MultipartFile file) {
        Operator operator = requireSelfOrAdmin(authentication, operatorId);

        if (file.isEmpty()) {
            throw ApiException.badRequest("No file provided");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("Photo must be 5MB or smaller");
        }
        String extension = ALLOWED_TYPES.get(file.getContentType());
        if (extension == null) {
            throw ApiException.badRequest("Photo must be JPEG, PNG, or WebP");
        }

        deleteFile(operator);
        String filename = operatorId + "." + extension;
        try {
            file.transferTo(photosDir.resolve(filename));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to save photo for operator " + operatorId, e);
        }
        operator.setPhotoPath(filename);
        operatorRepository.save(operator);
        auditLogService.record(EntityType.OPERATOR, operatorId, "PHOTO_UPDATE",
                "Updated photo for " + operator.getCallsign(), authentication.getName());
    }

    @Transactional
    public void delete(Authentication authentication, Long operatorId) {
        Operator operator = requireSelfOrAdmin(authentication, operatorId);
        deleteFile(operator);
        operator.setPhotoPath(null);
        operatorRepository.save(operator);
        auditLogService.record(EntityType.OPERATOR, operatorId, "PHOTO_DELETE",
                "Removed photo for " + operator.getCallsign(), authentication.getName());
    }

    @Transactional(readOnly = true)
    public Resource load(Long operatorId) {
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + operatorId));
        if (operator.getPhotoPath() == null) {
            throw ApiException.notFound("No photo for operator " + operatorId);
        }
        Path path = photosDir.resolve(operator.getPhotoPath());
        if (!Files.exists(path)) {
            throw ApiException.notFound("No photo for operator " + operatorId);
        }
        return new FileSystemResource(path);
    }

    @Transactional(readOnly = true)
    public MediaType contentTypeFor(Long operatorId) {
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + operatorId));
        String path = operator.getPhotoPath();
        if (path != null && path.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (path != null && path.endsWith(".webp")) {
            return MediaType.valueOf("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }

    private void deleteFile(Operator operator) {
        if (operator.getPhotoPath() == null) {
            return;
        }
        try {
            Files.deleteIfExists(photosDir.resolve(operator.getPhotoPath()));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete existing photo for operator " + operator.getId(), e);
        }
    }

    private Operator requireSelfOrAdmin(Authentication authentication, Long operatorId) {
        Operator caller = operatorRepository.findByCallsignIgnoreCase(authentication.getName())
                .orElseThrow(() -> ApiException.forbidden("You do not have permission to perform this action"));
        Operator target = operatorRepository.findById(operatorId)
                .orElseThrow(() -> ApiException.notFound("Operator not found: " + operatorId));
        if (!caller.isAdmin() && !caller.getId().equals(operatorId)) {
            throw ApiException.forbidden("You may only manage your own photo");
        }
        return target;
    }
}
