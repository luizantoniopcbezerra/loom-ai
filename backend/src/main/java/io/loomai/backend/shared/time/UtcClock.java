package io.loomai.backend.shared.time;

import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class UtcClock {

    public Instant now() {
        return Instant.now();
    }
}
