package io.loomai.backend.settings;

import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import io.loomai.backend.shared.time.UtcClock;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SettingsService {

    private final SettingsRepository settingsRepository;
    private final UtcClock utcClock;

    public SettingsService(SettingsRepository settingsRepository, UtcClock utcClock) {
        this.settingsRepository = settingsRepository;
        this.utcClock = utcClock;
    }

    public Settings getSettings() {
        return settingsRepository.findSettings()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Recurso nao encontrado."
                ));
    }

    public Settings saveSettings(SettingsRequest request) {
        return settingsRepository.findSettings()
                .map(existing -> updateSettings(existing, request))
                .orElseGet(() -> createSettings(request));
    }

    private Settings updateSettings(Settings existing, SettingsRequest request) {
        Settings settings = new Settings(
                existing.id(),
                request.accentColor(),
                request.sidebarExpanded(),
                request.theme(),
                utcClock.now()
        );
        return settingsRepository.save(settings);
    }

    private Settings createSettings(SettingsRequest request) {
        Settings settings = new Settings(
                UUID.randomUUID().toString(),
                request.accentColor(),
                request.sidebarExpanded(),
                request.theme(),
                utcClock.now()
        );
        return settingsRepository.save(settings);
    }
}
