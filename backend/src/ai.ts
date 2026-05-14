import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages.js";
import type { WorkItemAnalysisType } from "./types.js";

const MAX_BUG_FIELD_CHARS = 600;
const MAX_NFR_CHARS = 1500;
const MAX_REPO_CONTEXT_CHARS = 6000;
const MAX_COMMITS = 12;
const MAX_FILES_PER_COMMIT = 3;
const MAX_COMMIT_MESSAGE_CHARS = 140;
const MAX_OUTPUT_TOKENS_BUG = 900;
const MAX_OUTPUT_TOKENS_USER_STORY = 1400;
const MAX_OUTPUT_TOKENS_IMPL_PROMPT = 1800;
const MAX_OUTPUT_TOKENS_CLEANUP = 1200;

function truncate(input: string, maxChars: number): string {
  if (input.length <= maxChars) {
    return input;
  }

  return `${input.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function compactText(
  input: string | undefined,
  maxChars: number,
): string | undefined {
  if (!input) {
    return undefined;
  }

  const compact = input.replaceAll(/\s+/g, " ").trim();
  return compact ? truncate(compact, maxChars) : undefined;
}

function compactRepoContext(input: string | undefined): string | undefined {
  if (!input) {
    return undefined;
  }

  const sections = input
    .split(/\n\n---\n\n/g)
    .slice(0, 4)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length === 0) {
    return undefined;
  }

  return truncate(sections.join("\n\n---\n\n"), MAX_REPO_CONTEXT_CHARS);
}

function stripCodeFences(input: string): string {
  const trimmed = input.trim();
  const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function extractStringField(text: string, field: string): string | undefined {
  const escapedField = field.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const match = new RegExp(
    String.raw`"${escapedField}"\s*:\s*"((?:\\.|[^"\\])*)"`,
  ).exec(text);
  return match ? decodeJsonString(match[1]) : undefined;
}

function extractStringArrayField(
  text: string,
  field: string,
): string[] | undefined {
  const escapedField = field.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const match = new RegExp(
    String.raw`"${escapedField}"\s*:\s*\[([\s\S]*?)\]`,
  ).exec(text);

  if (!match) {
    return undefined;
  }

  const items: string[] = [];
  const itemPattern = /"((?:\\.|[^"\\])*)"/g;
  let itemMatch = itemPattern.exec(match[1]);

  while (itemMatch) {
    items.push(decodeJsonString(itemMatch[1]));
    itemMatch = itemPattern.exec(match[1]);
  }

  return items;
}

function recoverAnalysisResultFromText(
  text: string,
  analysisType: WorkItemAnalysisType,
): Partial<AIAnalysisResult> | null {
  const recovered: Partial<AIAnalysisResult> = {
    analysisType:
      (extractStringField(text, "analysisType") as
        | WorkItemAnalysisType
        | undefined) ?? analysisType,
    status:
      (extractStringField(text, "status") as
        | AIAnalysisResult["status"]
        | undefined) ?? "ready",
    summary: extractStringField(text, "summary"),
    likelyCause: extractStringField(text, "likelyCause"),
    implementationApproach: extractStringField(text, "implementationApproach"),
    suspectCommits: extractStringArrayField(text, "suspectCommits"),
    recommendations: extractStringArrayField(text, "recommendations"),
    importantPoints: extractStringArrayField(text, "importantPoints"),
    impactedAreas: extractStringArrayField(text, "impactedAreas"),
    dependencies: extractStringArrayField(text, "dependencies"),
  };

  const hasUsefulContent = Boolean(
    recovered.summary ||
    recovered.likelyCause ||
    recovered.implementationApproach ||
    recovered.suspectCommits?.length ||
    recovered.recommendations?.length ||
    recovered.importantPoints?.length ||
    recovered.impactedAreas?.length ||
    recovered.dependencies?.length,
  );

  return hasUsefulContent ? recovered : null;
}

export type AIAnalysisParams = {
  analysisType: WorkItemAnalysisType;
  ticketTitle: string;
  ticketDescription?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
  repoContext?: string;
  repoBranch: string;
  repoStack?: string;
  recentCommits: Array<{
    sha: string;
    message: string;
    files: string[];
    repo?: string;
  }>;
  anthropicKey: string;
  anthropicModel: string;
};

export type AIAnalysisResult = {
  analysisType: WorkItemAnalysisType;
  status: "ready" | "not-enough-data";
  summary: string;
  likelyCause?: string;
  implementationApproach?: string;
  suspectCommits: string[];
  recommendations: string[];
  importantPoints?: string[];
  impactedAreas?: string[];
  dependencies?: string[];
};

function buildBugPrompt(params: {
  ticketTitle: string;
  ticketDescription?: string;
  reproSteps?: string;
  nonFunctionalRequirements?: string;
  repoBranch: string;
  repoStack?: string;
  commitsText: string;
  repoContext?: string;
}): { systemPrompt: string; prompt: string } {
  return {
    systemPrompt: [
      "You analyze production bugs using only the supplied ticket details, recent commits, and repo snippets.",
      "Return concise JSON only.",
      "Prefer concrete evidence from the provided commits and snippets.",
      "When the repository stack is given, frame recommendations in that stack's idioms (libraries, file conventions, test frameworks).",
      "Do not speculate beyond the supplied context.",
    ].join(" "),
    prompt: [
      `Bug title: ${params.ticketTitle}`,
      params.ticketDescription
        ? `Bug description: ${params.ticketDescription}`
        : undefined,
      params.reproSteps ? `Repro steps: ${params.reproSteps}` : undefined,
      params.nonFunctionalRequirements
        ? `Non-functional requirements (APIs, services, constraints):\n${params.nonFunctionalRequirements}`
        : undefined,
      params.repoStack
        ? `Repository stack:\n${params.repoStack}`
        : undefined,
      `Branch: ${params.repoBranch}`,
      `Recent commits:\n${params.commitsText || "None provided"}`,
      params.repoContext
        ? `Relevant repo snippets:\n${params.repoContext}`
        : "Relevant repo snippets: None provided",
      [
        "Return valid JSON with this exact shape:",
        '{"analysisType":"bug","status":"ready","summary":"","likelyCause":"","suspectCommits":["sha-prefix"],"recommendations":["action"],"importantPoints":["point"],"implementationApproach":"","impactedAreas":[],"dependencies":[]}',
        "Rules:",
        "- Keep summary to 2 sentences max.",
        "- likelyCause should be one short paragraph.",
        "- suspectCommits must contain at most 3 SHA prefixes from the provided commit list. Use the bare SHA prefix (the repo is implied by the [repo] tag in the commits list).",
        "- recommendations must contain at most 3 short, concrete actions.",
        "- importantPoints must contain at most 3 short bullets.",
        "- Use empty strings or arrays for story-only fields.",
      ].join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function buildUserStoryPrompt(params: {
  ticketTitle: string;
  ticketDescription?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
  repoBranch: string;
  repoStack?: string;
  commitsText: string;
  repoContext?: string;
}): { systemPrompt: string; prompt: string } {
  return {
    systemPrompt: [
      "You analyze software user stories using only the supplied ticket details, recent commits, and repo snippets.",
      "Return concise JSON only.",
      "Focus on implementation approach, impacted areas, dependencies, and practical next steps.",
      "Treat non-functional requirements as authoritative — they list the APIs, services, and constraints the implementation must use.",
      "When the repository stack is given, frame the implementation approach in that stack's idioms (libraries, file conventions, test frameworks).",
      "Do not speculate beyond the supplied context.",
    ].join(" "),
    prompt: [
      `User story title: ${params.ticketTitle}`,
      params.ticketDescription
        ? `User story description: ${params.ticketDescription}`
        : undefined,
      params.acceptanceCriteria
        ? `Acceptance criteria: ${params.acceptanceCriteria}`
        : undefined,
      params.nonFunctionalRequirements
        ? `Non-functional requirements (APIs, services, constraints, dependencies):\n${params.nonFunctionalRequirements}`
        : undefined,
      params.repoStack
        ? `Repository stack:\n${params.repoStack}`
        : undefined,
      `Branch: ${params.repoBranch}`,
      `Recent commits:\n${params.commitsText || "None provided"}`,
      params.repoContext
        ? `Relevant repo snippets:\n${params.repoContext}`
        : "Relevant repo snippets: None provided",
      [
        "Return valid JSON with this exact shape:",
        '{"analysisType":"user-story","status":"ready","summary":"","likelyCause":"","implementationApproach":"","suspectCommits":["sha-prefix"],"recommendations":["action"],"importantPoints":["point"],"impactedAreas":["area"],"dependencies":["dependency"]}',
        "Rules:",
        "- Keep summary to 2 sentences max.",
        "- implementationApproach should be one short paragraph.",
        "- impactedAreas must contain at most 4 specific code or domain areas.",
        "- dependencies must contain at most 4 concrete dependencies or prerequisites.",
        "- suspectCommits may contain at most 3 SHA prefixes if relevant recent commits look related.",
        "- recommendations must contain at most 4 concrete implementation actions.",
        "- importantPoints must contain at most 3 short bullets.",
        "- Use an empty string for likelyCause unless a real risk is worth calling out.",
      ].join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function normalizeAnalysisResult(
  parsed: Partial<AIAnalysisResult>,
  fallbackText: string,
  analysisType: WorkItemAnalysisType,
): AIAnalysisResult {
  return {
    analysisType: parsed.analysisType ?? analysisType,
    status: parsed.status ?? "ready",
    summary: parsed.summary ?? fallbackText,
    likelyCause: parsed.likelyCause,
    implementationApproach: parsed.implementationApproach,
    suspectCommits: Array.isArray(parsed.suspectCommits)
      ? parsed.suspectCommits
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [],
    importantPoints: Array.isArray(parsed.importantPoints)
      ? parsed.importantPoints
      : [],
    impactedAreas: Array.isArray(parsed.impactedAreas)
      ? parsed.impactedAreas
      : [],
    dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
  } satisfies AIAnalysisResult;
}

export type ImplementationPromptParams = {
  ticketTitle: string;
  ticketDescription?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
  repoContext?: string;
  cachedAnalysis?: {
    implementationApproach?: string;
    recommendations?: string[];
    impactedAreas?: string[];
    dependencies?: string[];
  };
  repoBranch: string;
  repoStack?: string;
  anthropicKey: string;
  anthropicModel: string;
  additionalGuidance?: string;
};

export async function generateImplementationPrompt(
  params: ImplementationPromptParams,
): Promise<string> {
  const ticketDescription = compactText(
    params.ticketDescription,
    MAX_BUG_FIELD_CHARS,
  );
  const acceptanceCriteria = compactText(
    params.acceptanceCriteria,
    MAX_BUG_FIELD_CHARS,
  );
  const nonFunctionalRequirements = compactText(
    params.nonFunctionalRequirements,
    MAX_NFR_CHARS,
  );
  const repoContext = compactRepoContext(params.repoContext);

  const systemPrompt = [
    "You are a senior software engineer writing a ready-to-use implementation prompt for an AI coding assistant.",
    "The developer will paste your output directly into their coding tool (Claude Code, GitHub Copilot, Cursor, etc.).",
    "Output only the prompt text — no preamble, no explanation, no meta-commentary like 'Here is your prompt:'.",
    "The prompt must be self-contained, specific, and immediately actionable.",
  ].join(" ");

  const analysisContext = params.cachedAnalysis
    ? [
        params.cachedAnalysis.implementationApproach
          ? `AI analysis — implementation approach: ${params.cachedAnalysis.implementationApproach}`
          : undefined,
        params.cachedAnalysis.impactedAreas?.length
          ? `AI analysis — impacted areas: ${params.cachedAnalysis.impactedAreas.join(", ")}`
          : undefined,
        params.cachedAnalysis.dependencies?.length
          ? `AI analysis — dependencies: ${params.cachedAnalysis.dependencies.join(", ")}`
          : undefined,
        params.cachedAnalysis.recommendations?.length
          ? `AI analysis — recommendations:\n${params.cachedAnalysis.recommendations.map((r) => `- ${r}`).join("\n")}`
          : undefined,
      ]
        .filter(Boolean)
        .join("\n")
    : undefined;

  const userMessage = [
    `User story title: ${params.ticketTitle}`,
    ticketDescription
      ? `User story description: ${ticketDescription}`
      : undefined,
    acceptanceCriteria
      ? `Acceptance criteria: ${acceptanceCriteria}`
      : undefined,
    nonFunctionalRequirements
      ? `Non-functional requirements (APIs, services, constraints, dependencies — treat as authoritative):\n${nonFunctionalRequirements}`
      : undefined,
    params.repoStack
      ? `Repository stack (use these languages/frameworks for any code suggestions):\n${params.repoStack}`
      : undefined,
    `Target branch: ${params.repoBranch}`,
    analysisContext
      ? `Prior AI analysis (use as additional context):\n${analysisContext}`
      : undefined,
    repoContext ? `Relevant codebase context:\n${repoContext}` : undefined,
    params.additionalGuidance
      ? `Additional guidance from developer: ${params.additionalGuidance}`
      : undefined,
    [
      "Generate a complete implementation prompt that a developer can paste directly into an AI coding assistant.",
      "The prompt must include:",
      "- A clear, one-sentence task description",
      "- Which files or modules to create or modify (reference the codebase context if provided)",
      "- The specific APIs, services, and constraints listed in the non-functional requirements (if any) — name each one explicitly",
      "- Idiomatic patterns for the repository stack (e.g. if it's a TypeScript/Express repo, use those conventions; do not invent unrelated technologies)",
      "- Any edge cases or additional non-functional concerns derived from the story",
      "- All acceptance criteria that the implementation must satisfy",
      "- The target branch name for the implementation",
    ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const anthropic = new Anthropic({ apiKey: params.anthropicKey });
  const response = await anthropic.messages.create({
    model: params.anthropicModel,
    system: systemPrompt,
    max_tokens: MAX_OUTPUT_TOKENS_IMPL_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  return content.text.trim();
}

export function hasEnoughDataForUserStoryAnalysis(params: {
  ticketDescription?: string;
  acceptanceCriteria?: string;
}): boolean {
  const combined = [params.ticketDescription, params.acceptanceCriteria]
    .filter(Boolean)
    .join(" ")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (!combined) {
    return false;
  }

  return (
    combined.length >= 80 || combined.split(" ").filter(Boolean).length >= 12
  );
}

export async function analyzeWithAI(
  params: AIAnalysisParams,
): Promise<AIAnalysisResult> {
  const commitsText = params.recentCommits
    .slice(0, MAX_COMMITS)
    .map((c) => {
      const repoPrefix = c.repo ? `[${c.repo}] ` : "";
      const message = truncate(
        c.message.replaceAll(/\s+/g, " ").trim(),
        MAX_COMMIT_MESSAGE_CHARS,
      );
      const files = c.files.slice(0, MAX_FILES_PER_COMMIT).join(", ");
      return `${repoPrefix}${c.sha.slice(0, 8)} | ${message} | ${files}`;
    })
    .join("\n\n");

  const ticketDescription = compactText(
    params.ticketDescription,
    MAX_BUG_FIELD_CHARS,
  );
  const reproSteps = compactText(params.reproSteps, MAX_BUG_FIELD_CHARS);
  const acceptanceCriteria = compactText(
    params.acceptanceCriteria,
    MAX_BUG_FIELD_CHARS,
  );
  const nonFunctionalRequirements = compactText(
    params.nonFunctionalRequirements,
    MAX_NFR_CHARS,
  );
  const repoContext = compactRepoContext(params.repoContext);

  const { systemPrompt, prompt } =
    params.analysisType === "bug"
      ? buildBugPrompt({
          ticketTitle: params.ticketTitle,
          ticketDescription,
          reproSteps,
          nonFunctionalRequirements,
          repoBranch: params.repoBranch,
          repoStack: params.repoStack,
          commitsText,
          repoContext,
        })
      : buildUserStoryPrompt({
          ticketTitle: params.ticketTitle,
          ticketDescription,
          acceptanceCriteria,
          nonFunctionalRequirements,
          repoBranch: params.repoBranch,
          repoStack: params.repoStack,
          commitsText,
          repoContext,
        });

  const anthropic = new Anthropic({ apiKey: params.anthropicKey });
  const messages: MessageParam[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await anthropic.messages.create({
    model: params.anthropicModel,
    system: systemPrompt,
    max_tokens:
      params.analysisType === "bug"
        ? MAX_OUTPUT_TOKENS_BUG
        : MAX_OUTPUT_TOKENS_USER_STORY,
    messages,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const responseText = stripCodeFences(content.text);

  try {
    const parsed = JSON.parse(responseText) as Partial<AIAnalysisResult>;
    return normalizeAnalysisResult(parsed, responseText, params.analysisType);
  } catch {
    const recovered = recoverAnalysisResultFromText(
      responseText,
      params.analysisType,
    );
    if (recovered) {
      return normalizeAnalysisResult(
        recovered,
        responseText,
        params.analysisType,
      );
    }

    return normalizeAnalysisResult({}, responseText, params.analysisType);
  }
}

export type CleanupResult = {
  status: "ready" | "not-enough-data";
  summary: string;
  problem?: string;
  expectedBehavior?: string;
  currentBehavior?: string;
  reproSteps?: string[];
  acceptanceCriteria?: string[];
  nonFunctional?: string[];
  openQuestions?: string[];
};

export type CleanupParams = {
  analysisType: WorkItemAnalysisType;
  ticketTitle: string;
  ticketDescription?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
  anthropicKey: string;
  anthropicModel: string;
};

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeCleanupResult(parsed: Record<string, unknown>, fallback: string): CleanupResult {
  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : fallback;
  return {
    status: "ready",
    summary,
    problem: typeof parsed.problem === "string" ? parsed.problem.trim() : undefined,
    expectedBehavior:
      typeof parsed.expectedBehavior === "string" ? parsed.expectedBehavior.trim() : undefined,
    currentBehavior:
      typeof parsed.currentBehavior === "string" ? parsed.currentBehavior.trim() : undefined,
    reproSteps: asStringArray(parsed.reproSteps),
    acceptanceCriteria: asStringArray(parsed.acceptanceCriteria),
    nonFunctional: asStringArray(parsed.nonFunctional),
    openQuestions: asStringArray(parsed.openQuestions),
  };
}

export function hasEnoughDataForCleanup(params: {
  ticketDescription?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
}): boolean {
  const combined = [
    params.ticketDescription,
    params.reproSteps,
    params.acceptanceCriteria,
    params.nonFunctionalRequirements,
  ]
    .filter(Boolean)
    .join(" ")
    .replaceAll(/\s+/g, " ")
    .trim();
  if (!combined) return false;
  return combined.length >= 50;
}

export async function cleanupWorkItem(params: CleanupParams): Promise<CleanupResult> {
  const description = compactText(params.ticketDescription, MAX_BUG_FIELD_CHARS * 2);
  const reproSteps = compactText(params.reproSteps, MAX_BUG_FIELD_CHARS * 2);
  const acceptanceCriteria = compactText(params.acceptanceCriteria, MAX_BUG_FIELD_CHARS * 2);
  const nonFunctionalRequirements = compactText(
    params.nonFunctionalRequirements,
    MAX_NFR_CHARS,
  );

  if (
    !hasEnoughDataForCleanup({
      ticketDescription: description,
      reproSteps,
      acceptanceCriteria,
      nonFunctionalRequirements,
    })
  ) {
    return {
      status: "not-enough-data",
      summary: "Not enough content to refine.",
    };
  }

  const isBug = params.analysisType === "bug";
  const systemPrompt = [
    "You normalize messy Azure DevOps work-item text into a clean, structured restatement.",
    "Use ONLY information present in the source — never invent facts, names, or APIs.",
    "Deduplicate content that appears in multiple fields (description vs. repro steps is common).",
    "If a field is genuinely missing in the source, omit it from the JSON.",
    "Return strict JSON only — no preamble, no markdown fences.",
  ].join(" ");

  const sourceBlock = [
    `Title: ${params.ticketTitle}`,
    description ? `Description:\n${description}` : undefined,
    isBug && reproSteps ? `Repro steps / additional details:\n${reproSteps}` : undefined,
    !isBug && acceptanceCriteria ? `Acceptance criteria:\n${acceptanceCriteria}` : undefined,
    nonFunctionalRequirements
      ? `Non-functional requirements (APIs, services, constraints):\n${nonFunctionalRequirements}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  const schemaInstructions = isBug
    ? [
        "Return JSON shape:",
        '{"summary":"","problem":"","expectedBehavior":"","currentBehavior":"","reproSteps":["step"],"nonFunctional":["bullet"],"openQuestions":["question"]}',
        "Rules:",
        "- summary: 1–2 plain-language sentences stating what is broken.",
        "- problem: one short paragraph framing the bug from the user's perspective.",
        "- expectedBehavior and currentBehavior: short paragraphs, no markdown.",
        "- reproSteps: ordered list, one action per array item, max 8 items.",
        "- nonFunctional: bulletize any APIs/services/constraints from the NFR section, max 6 items.",
        "- openQuestions: at most 3 questions for missing info; omit the field entirely if none.",
      ].join("\n")
    : [
        "Return JSON shape:",
        '{"summary":"","problem":"","acceptanceCriteria":["criterion"],"nonFunctional":["bullet"],"openQuestions":["question"]}',
        "Rules:",
        "- summary: 1–2 plain-language sentences stating what the user wants and why.",
        "- problem: one short paragraph framing the need from the user's perspective.",
        "- acceptanceCriteria: one criterion per array item, max 8 items, written as testable statements.",
        "- nonFunctional: bulletize any APIs/services/constraints from the NFR section, max 6 items.",
        "- openQuestions: at most 3 questions for missing info; omit the field entirely if none.",
      ].join("\n");

  const userPrompt = [sourceBlock, schemaInstructions].join("\n\n");

  const anthropic = new Anthropic({ apiKey: params.anthropicKey });
  const response = await anthropic.messages.create({
    model: params.anthropicModel,
    system: systemPrompt,
    max_tokens: MAX_OUTPUT_TOKENS_CLEANUP,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }
  const text = stripCodeFences(content.text);

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return normalizeCleanupResult(parsed, text);
  } catch {
    return {
      status: "ready",
      summary: text,
    };
  }
}
