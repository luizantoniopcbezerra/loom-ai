package io.loomai.backend.profile;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProfileRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProfileRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<Profile> findProfile() {
        String sql = """
                SELECT id, username, color, created_at, updated_at
                FROM profiles
                LIMIT 1
                """;
        return jdbcTemplate.query(sql, this::mapProfile).stream().findFirst();
    }

    public Profile save(Profile profile) {
        if (findProfile().isPresent()) {
            update(profile);
            return profile;
        }

        insert(profile);
        return profile;
    }

    private void insert(Profile profile) {
        String sql = """
                INSERT INTO profiles (id, username, color, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """;
        jdbcTemplate.update(
                sql,
                profile.id(),
                profile.username(),
                profile.color(),
                profile.createdAt().toString(),
                profile.updatedAt().toString()
        );
    }

    private void update(Profile profile) {
        String sql = """
                UPDATE profiles
                SET username = ?, color = ?, updated_at = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(
                sql,
                profile.username(),
                profile.color(),
                profile.updatedAt().toString(),
                profile.id()
        );
    }

    private Profile mapProfile(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Profile(
                resultSet.getString("id"),
                resultSet.getString("username"),
                resultSet.getString("color"),
                Instant.parse(resultSet.getString("created_at")),
                Instant.parse(resultSet.getString("updated_at"))
        );
    }
}
