package io.loomai.backend.profile;

import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import io.loomai.backend.shared.time.UtcClock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UtcClock utcClock;

    public ProfileService(ProfileRepository profileRepository, UtcClock utcClock) {
        this.profileRepository = profileRepository;
        this.utcClock = utcClock;
    }

    public Profile getProfile() {
        return profileRepository.findProfile()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Recurso nao encontrado."
                ));
    }

    public Profile saveProfile(ProfileRequest request) {
        Instant now = utcClock.now();
        return profileRepository.findProfile()
                .map(existing -> updateProfile(existing, request, now))
                .orElseGet(() -> createProfile(request, now));
    }

    private Profile updateProfile(Profile existing, ProfileRequest request, Instant now) {
        Profile profile = new Profile(
                existing.id(),
                request.username().trim(),
                request.color(),
                existing.createdAt(),
                now
        );
        return profileRepository.save(profile);
    }

    private Profile createProfile(ProfileRequest request, Instant now) {
        Profile profile = new Profile(
                UUID.randomUUID().toString(),
                request.username().trim(),
                request.color(),
                now,
                now
        );
        return profileRepository.save(profile);
    }
}
