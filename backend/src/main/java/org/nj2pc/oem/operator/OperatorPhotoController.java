package org.nj2pc.oem.operator;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/operators/{operatorId}/photo")
public class OperatorPhotoController {

    private final OperatorPhotoService operatorPhotoService;

    public OperatorPhotoController(OperatorPhotoService operatorPhotoService) {
        this.operatorPhotoService = operatorPhotoService;
    }

    @GetMapping
    public ResponseEntity<Resource> get(@PathVariable Long operatorId) {
        Resource resource = operatorPhotoService.load(operatorId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(operatorPhotoService.contentTypeFor(operatorId))
                .body(resource);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void upload(Authentication authentication, @PathVariable Long operatorId,
                        @RequestParam("file") MultipartFile file) {
        operatorPhotoService.upload(authentication, operatorId, file);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long operatorId) {
        operatorPhotoService.delete(authentication, operatorId);
    }
}
