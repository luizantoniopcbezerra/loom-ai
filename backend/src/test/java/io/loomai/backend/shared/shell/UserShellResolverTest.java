package io.loomai.backend.shared.shell;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.assertj.core.api.Assertions.assertThat;

class UserShellResolverTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldPreferShellFromEnvironment() throws Exception {
        Path shell = Files.createFile(tempDir.resolve("zsh"));
        shell.toFile().setExecutable(true);
        Path passwd = Files.createFile(tempDir.resolve("passwd"));

        String resolved = UserShellResolver.resolve(Map.of("SHELL", shell.toString()), "ti", passwd);

        assertThat(resolved).isEqualTo(shell.toString());
    }

    @Test
    void shouldFallbackToPasswdWhenEnvironmentIsMissing() throws Exception {
        Path shell = Files.createFile(tempDir.resolve("fish"));
        shell.toFile().setExecutable(true);
        Path passwd = tempDir.resolve("passwd");
        Files.writeString(passwd, "ti:x:1000:1000::/home/ti:%s%n".formatted(shell));

        String resolved = UserShellResolver.resolve(Map.of(), "ti", passwd);

        assertThat(resolved).isEqualTo(shell.toString());
    }

    @Test
    void shouldBuildShellCommandForFish() throws Exception {
        Path shell = Files.createFile(tempDir.resolve("fish"));
        shell.toFile().setExecutable(true);
        List<String> command = UserShellResolver.command(shell.toString(), "echo ok");

        assertThat(command).containsExactly(shell.toString(), "-l", "-c", "echo ok");
    }

    @Test
    void shouldBuildShellCommandForZshLikeShells() {
        List<String> command = UserShellResolver.command("/bin/zsh", "echo ok");

        assertThat(command).containsExactly("/bin/zsh", "-lc", "echo ok");
    }
}
