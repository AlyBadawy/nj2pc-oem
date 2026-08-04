package org.nj2pc.oem.operator;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class OperatorPrincipal implements UserDetails {

    private final Operator operator;

    public OperatorPrincipal(Operator operator) {
        this.operator = operator;
    }

    public Operator getOperator() {
        return operator;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + operator.getAccessLevel().name()));
    }

    @Override
    public String getPassword() {
        return operator.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return operator.getCallsign();
    }

    @Override
    public boolean isEnabled() {
        return operator.getPasswordHash() != null;
    }
}
