package org.nj2pc.oem.resource;

import java.util.List;

public record ResourceTypeFieldResponse(
        Long id,
        String name,
        ResourceFieldType fieldType,
        boolean required,
        int sortOrder,
        List<String> options
) {
    public static ResourceTypeFieldResponse from(ResourceTypeField field) {
        return new ResourceTypeFieldResponse(
                field.getId(),
                field.getName(),
                field.getFieldType(),
                field.isRequired(),
                field.getSortOrder(),
                field.getOptions()
        );
    }
}
