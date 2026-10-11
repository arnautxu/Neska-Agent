import { constants } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import {
  parseInstallationConfig,
  type InstallationConfig,
} from "@/config/installation-schema";

const MAX_INSTALLATION_CONFIG_BYTES = 64 * 1024;
const DEVELOPMENT_INSTALLATION_CONFIG = "config/installations/development.example.json";
// Vercel previews only serve the mock design pages; build and runtime run from
// different directories, so the bundled file is resolved from the cwd.
const VERCEL_PREVIEW_INSTALLATION_CONFIG = "config/installations/neska-agent.vercel-preview.json";

type InstallationEnvironment = {
  AIBRAIN_INSTALLATION_CONFIG?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

export type InstallationConfigLoadOptions = {
  cwd?: string;
  env?: InstallationEnvironment;
};

function configuredValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveInstallationConfigPath(
  options: InstallationConfigLoadOptions = {},
) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const configured = configuredValue(env.AIBRAIN_INSTALLATION_CONFIG);
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error("AIBRAIN_INSTALLATION_CONFIG debe ser una ruta absoluta.");
    }
    return path.normalize(configured);
  }
  if (env.VERCEL_ENV === "preview") {
    return path.join(cwd, VERCEL_PREVIEW_INSTALLATION_CONFIG);
  }
  if (env.NODE_ENV === "production") {
    throw new Error("AIBRAIN_INSTALLATION_CONFIG es obligatorio en producción.");
  }
  return path.join(cwd, DEVELOPMENT_INSTALLATION_CONFIG);
}

export async function loadInstallationConfigFromFile(
  configPath: string,
): Promise<Readonly<InstallationConfig>> {
  if (!path.isAbsolute(configPath)) {
    throw new Error("La ruta de InstallationConfig debe ser absoluta.");
  }
  let handle;
  try {
    handle = await open(configPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ELOOP") {
      throw new Error("InstallationConfig no puede ser un enlace simbólico.", { cause: error });
    }
    throw error;
  }
  try {
    const file = await handle.stat();
    if (!file.isFile()) {
      throw new Error("InstallationConfig debe ser un fichero regular.");
    }
    if (file.size > MAX_INSTALLATION_CONFIG_BYTES) {
      throw new Error(`InstallationConfig supera el máximo de ${MAX_INSTALLATION_CONFIG_BYTES} bytes.`);
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(await handle.readFile("utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`InstallationConfig contiene JSON inválido: ${error.message}`, { cause: error });
      }
      throw error;
    }
    return parseInstallationConfig(decoded);
  } finally {
    await handle.close();
  }
}

export async function loadInstallationConfig(
  options: InstallationConfigLoadOptions = {},
) {
  return loadInstallationConfigFromFile(resolveInstallationConfigPath(options));
}
