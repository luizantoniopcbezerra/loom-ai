package io.loomai.backend.settings;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SettingsRepository {

    private final JdbcTemplate jdbcTemplate;

    public SettingsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<Settings> findSettings() {
        String sql = """
                SELECT id, accent_color, sidebar_expanded, theme, updated_at
                FROM settings
                LIMIT 1
                """;
        return jdbcTemplate.query(sql, this::mapSettings).stream().findFirst();
    }

    public Settings save(Settings settings) {
        if (findSettings().isPresent()) {
            update(settings);
            return settings;
        }

        insert(settings);
        return settings;
    }

    private void insert(Settings settings) {
        String sql = """
                INSERT INTO settings (id, accent_color, sidebar_expanded, theme, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """;
        jdbcTemplate.update(
                sql,
                settings.id(),
                settings.accentColor(),
                toDatabaseBoolean(settings.sidebarExpanded()),
                settings.theme(),
                settings.updatedAt().toString()
        );
    }

    private void update(Settings settings) {
        String sql = """
                UPDATE settings
                SET accent_color = ?, sidebar_expanded = ?, theme = ?, updated_at = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(
                sql,
                settings.accentColor(),
                toDatabaseBoolean(settings.sidebarExpanded()),
                settings.theme(),
                settings.updatedAt().toString(),
                settings.id()
        );
    }

    private Settings mapSettings(ResultSet resultSet, int rowNumber) throws SQLException {
        Number sidebarExpanded = (Number) resultSet.getObject("sidebar_expanded");
        return new Settings(
                resultSet.getString("id"),
                resultSet.getString("accent_color"),
                sidebarExpanded == null ? null : sidebarExpanded.intValue() == 1,
                resultSet.getString("theme"),
                Instant.parse(resultSet.getString("updated_at"))
        );
    }

    private Integer toDatabaseBoolean(Boolean value) {
        if (value == null) {
            return null;
        }
        return value ? 1 : 0;
    }
}
