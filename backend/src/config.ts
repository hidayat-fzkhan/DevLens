import "dotenv/config";

export type Config = {
  adoOrg: string;
  adoProject: string;
  adoPat: string;
  githubToken?: string;
  githubCommits: number;
  anthropicKey: string;
  anthropicModel: string;
  aiEnabled: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function envOptional(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

// Tuning knobs — not user-facing.
const DEFAULT_GITHUB_COMMITS = 50;

export function loadConfig(partial?: Partial<Config>): Config {
  const adoOrg = partial?.adoOrg ?? requireEnv("ADO_ORG");
  const adoProject = partial?.adoProject ?? requireEnv("ADO_PROJECT");
  const adoPat = partial?.adoPat ?? requireEnv("ADO_PAT");

  const githubToken = partial?.githubToken ?? envOptional("GITHUB_TOKEN");
  const anthropicKey = partial?.anthropicKey ?? requireEnv("ANTHROPIC_KEY");
  const anthropicModel = partial?.anthropicModel ?? envOptional("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

  return {
    adoOrg,
    adoProject,
    adoPat,
    githubToken,
    githubCommits: partial?.githubCommits ?? DEFAULT_GITHUB_COMMITS,
    anthropicKey,
    anthropicModel,
    aiEnabled: true
  };
}
