import * as p from "@clack/prompts";
import pc from "picocolors";
import { sshExec } from "@tom-and-jerry/core";
import { isCancelled, type WizardContext } from "../context.ts";

const STARTUP_BAT = `@echo off
:: start-gateway.bat — Waits for Tailscale then starts OpenClaw gateway
:: Installed by tj onboard

echo [TJ] Waiting for Tailscale to come online...
:wait_tailscale
tailscale status >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_tailscale
)
echo [TJ] Tailscale is online.

echo [TJ] Starting OpenClaw gateway...
cd /d "%USERPROFILE%"
openclaw gateway
`;

const STARTUP_SH = `#!/usr/bin/env bash
# start-gateway.sh — Waits for Tailscale then starts OpenClaw gateway
# Installed by tj onboard

echo "[TJ] Waiting for Tailscale to come online..."
until tailscale status &>/dev/null; do
    sleep 2
done
echo "[TJ] Tailscale is online."

echo "[TJ] Starting OpenClaw gateway..."
cd ~
openclaw gateway
`;

export async function stepStartup(ctx: Partial<WizardContext>): Promise<Partial<WizardContext>> {
  // Only relevant for Jerry node
  const isJerrySetup =
    (ctx.role === "jerry") ||
    (ctx.role === "tom" && ctx.peerOS !== undefined);

  if (!isJerrySetup) {
    return { ...ctx, startupScriptInstalled: false };
  }

  const peerIsWindows = ctx.role === "tom" ? ctx.peerOS === "windows" : process.platform === "win32";

  if (ctx.role === "jerry") {
    // We're ON the Jerry machine
    p.note(
      `The gateway needs to start automatically after boot.\n` +
      `We'll install a startup script that waits for Tailscale, then launches the gateway.`,
      "Startup Script"
    );

    const install = await p.confirm({
      message: "Install the startup script on this machine?",
      initialValue: true,
    });

    if (isCancelled(install)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    if (!install) {
      p.log.warn("Skipping startup script — you'll need to ensure the gateway starts after boot manually.");
      return { ...ctx, startupScriptInstalled: false };
    }

    if (process.platform === "win32") {
      p.note(
        `Two startup methods will be configured (belt and suspenders):\n\n` +
        `1. ${pc.cyan("Startup folder:")} Shell:Startup\\start-gateway.bat\n` +
        `2. ${pc.cyan("Scheduled Task:")} Logon trigger → start-gateway.bat\n\n` +
        `The script waits for Tailscale to be ready before starting the gateway.`,
        "Windows Startup"
      );

      const startupDir = `${process.env.APPDATA}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`;
      const batPath = `${startupDir}\\start-gateway.bat`;

      p.note(
        `Save the following as ${pc.cyan(batPath)}:\n\n${pc.dim(STARTUP_BAT)}\n` +
        `Then create a Scheduled Task:\n` +
        `  Trigger: At logon\n` +
        `  Action: Start a program → ${batPath}\n` +
        `  Run whether user is logged on or not: No (user must be logged in for GUI)`,
        "Manual Steps"
      );

      const done = await p.confirm({ message: "Have you set this up?" });
      if (isCancelled(done)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }
      return { ...ctx, startupScriptInstalled: !!done };
    }

    // Linux/macOS Jerry — create systemd service or launchd plist
    p.note(
      `Save the startup script and enable it:\n\n` +
      pc.dim(STARTUP_SH) + `\n` +
      `chmod +x ~/start-gateway.sh\n` +
      `# Add to crontab or systemd as needed`,
      "Linux/macOS Startup"
    );

    const done = await p.confirm({ message: "Have you set this up?" });
    if (isCancelled(done)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }
    return { ...ctx, startupScriptInstalled: !!done };
  }

  // We're Tom — install on remote Jerry via SSH
  const install = await p.confirm({
    message: "Install startup script on the remote Jerry node via SSH?",
    initialValue: true,
  });

  if (isCancelled(install)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (!install) {
    p.log.warn("Skipping remote startup script installation.");
    return { ...ctx, startupScriptInstalled: false };
  }

  const spinner = p.spinner();
  spinner.start("Installing startup script on Jerry via SSH...");

  const sshConfig = {
    host: ctx.peerTailscaleIP!,
    user: ctx.peerSSHUser!,
    keyPath: ctx.peerSSHKeyPath!,
  };

  try {
    if (peerIsWindows) {
      // Write bat file to Jerry's startup folder
      const escapedBat = STARTUP_BAT.replace(/\n/g, "`n").replace(/"/g, '`"');
      const psCmd = [
        `$startup = [Environment]::GetFolderPath('Startup')`,
        `$bat = "${escapedBat}"`,
        `Set-Content -Path "$startup\\start-gateway.bat" -Value $bat -Encoding ASCII`,
      ].join("; ");

      await sshExec(sshConfig, `powershell -Command "${psCmd.replace(/"/g, '\\"')}"`, 15_000);

      // Also create scheduled task
      const taskCmd = `schtasks /Create /TN "TJ-StartGateway" /TR "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\start-gateway.bat" /SC ONLOGON /F`;
      await sshExec(sshConfig, taskCmd, 15_000);

      spinner.stop(`${pc.green("✓")} Startup script + scheduled task installed on Windows Jerry.`);
    } else {
      // Write shell script + crontab entry
      const escapedSh = STARTUP_SH.replace(/'/g, "'\\''");
      await sshExec(sshConfig, `cat > ~/start-gateway.sh << 'TJEOF'\n${STARTUP_SH}\nTJEOF\nchmod +x ~/start-gateway.sh`, 15_000);
      await sshExec(sshConfig, `(crontab -l 2>/dev/null | grep -v start-gateway; echo "@reboot ~/start-gateway.sh") | crontab -`, 15_000);

      spinner.stop(`${pc.green("✓")} Startup script + crontab installed on Linux/macOS Jerry.`);
    }

    return { ...ctx, startupScriptInstalled: true };
  } catch (err) {
    spinner.stop(`${pc.yellow("!")} Could not install startup script via SSH.`);
    p.log.warn("You'll need to install the startup script on the Jerry machine manually.");
    return { ...ctx, startupScriptInstalled: false };
  }
}
