import * as p from "@clack/prompts";
import pc from "picocolors";
import { isCancelled, type WizardContext } from "../context.ts";

const REGISTRY_PATH = String.raw`HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon`;

export async function stepAutologin(ctx: Partial<WizardContext>): Promise<Partial<WizardContext>> {
  // Only relevant when the Jerry node is Windows
  const jerryIsWindows =
    (ctx.role === "jerry" && process.platform === "win32") ||
    (ctx.role === "tom" && ctx.peerOS === "windows");

  if (!jerryIsWindows) {
    return { ...ctx, windowsAutologinConfigured: false };
  }

  if (!ctx.wolEnabled) {
    p.log.info("WOL is disabled — AutoAdminLogon is not required.");
    return { ...ctx, windowsAutologinConfigured: false };
  }

  p.note(
    `For Wake-on-LAN to work on Windows, the machine must auto-login after boot.\n` +
    `Otherwise it sits at the lock screen and the gateway never starts.\n\n` +
    `This requires setting AutoAdminLogon in the Windows registry:\n` +
    `  ${pc.cyan(REGISTRY_PATH)}\n\n` +
    `  AutoAdminLogon  = 1\n` +
    `  DefaultUserName = <your windows username>\n` +
    `  DefaultPassword = <your windows password>  ${pc.yellow("(stored in registry — encrypt your disk)")}\n\n` +
    `${pc.yellow("Security note:")} This stores your password in the registry. Enable BitLocker or similar full-disk encryption.`,
    "Windows AutoAdminLogon"
  );

  if (ctx.role === "jerry") {
    // We're ON the Jerry Windows machine — offer to configure directly
    const configure = await p.confirm({
      message: "Configure AutoAdminLogon on this machine now?",
      initialValue: true,
    });

    if (isCancelled(configure)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    if (configure) {
      const username = await p.text({
        message: "Windows username for auto-login",
        placeholder: "nicol",
        validate: (v) => {
          if (!v.trim()) return "Username is required";
        },
      });

      if (isCancelled(username)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }

      const password = await p.password({
        message: "Windows password for auto-login",
        validate: (v) => {
          if (!v.trim()) return "Password is required for AutoAdminLogon";
        },
      });

      if (isCancelled(password)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }

      p.note(
        `Run these commands in an ${pc.bold("elevated PowerShell")} (Admin):\n\n` +
        pc.cyan(`$path = "${REGISTRY_PATH}"\n`) +
        pc.cyan(`Set-ItemProperty -Path $path -Name AutoAdminLogon -Value "1"\n`) +
        pc.cyan(`Set-ItemProperty -Path $path -Name DefaultUserName -Value "${username}"\n`) +
        pc.cyan(`Set-ItemProperty -Path $path -Name DefaultPassword -Value "${password}"\n`),
        "Run these commands"
      );

      const confirmed = await p.confirm({
        message: "Have you run the commands above?",
      });

      if (isCancelled(confirmed)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }

      return { ...ctx, windowsAutologinConfigured: !!confirmed };
    }

    return { ...ctx, windowsAutologinConfigured: false };
  }

  // We're Tom, Jerry is remote Windows — just inform
  const alreadyConfigured = await p.confirm({
    message: "Is AutoAdminLogon already configured on the Windows Jerry machine?",
    initialValue: false,
  });

  if (isCancelled(alreadyConfigured)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (!alreadyConfigured) {
    p.log.warn(
      `AutoAdminLogon must be configured on the Jerry Windows machine for WOL boot to work.\n` +
      `SSH into the machine and set the registry values shown above, or run \`tj onboard\` on that machine.`,
    );
  }

  return { ...ctx, windowsAutologinConfigured: !!alreadyConfigured };
}
