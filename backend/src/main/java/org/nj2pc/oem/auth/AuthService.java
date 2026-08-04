package org.nj2pc.oem.auth;

import org.nj2pc.oem.common.ApiException;
import org.nj2pc.oem.config.JwtService;
import org.nj2pc.oem.operator.Operator;
import org.nj2pc.oem.operator.OperatorRepository;
import org.nj2pc.oem.user.AppUserPrincipal;
import org.nj2pc.oem.user.User;
import org.nj2pc.oem.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final OperatorRepository operatorRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                        OperatorRepository operatorRepository,
                        PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager,
                        JwtService jwtService) {
        this.userRepository = userRepository;
        this.operatorRepository = operatorRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw ApiException.conflict("Username is already taken: " + request.username());
        }

        User user = new User();
        user.setUsername(request.username());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());

        if (request.operatorId() != null) {
            Operator operator = operatorRepository.findById(request.operatorId())
                    .orElseThrow(() -> ApiException.notFound("Operator not found: " + request.operatorId()));
            user.setOperator(operator);
        }

        userRepository.save(user);
        String token = jwtService.generateToken(new AppUserPrincipal(user));
        return new AuthResponse(token, user.getUsername(), user.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        String token = jwtService.generateToken(principal);
        return new AuthResponse(token, principal.getUsername(), principal.getUser().getRole());
    }
}
