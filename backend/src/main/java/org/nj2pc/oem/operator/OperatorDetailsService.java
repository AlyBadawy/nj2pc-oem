package org.nj2pc.oem.operator;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class OperatorDetailsService implements UserDetailsService {

    private final OperatorRepository operatorRepository;

    public OperatorDetailsService(OperatorRepository operatorRepository) {
        this.operatorRepository = operatorRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String callsign) throws UsernameNotFoundException {
        Operator operator = operatorRepository.findByCallsignIgnoreCase(callsign)
                .orElseThrow(() -> new UsernameNotFoundException("No operator found with callsign: " + callsign));
        return new OperatorPrincipal(operator);
    }
}
