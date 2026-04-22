// ═══════════════════════════════════════════════════════════
// AI Repository — persistence and data access helpers
// ═══════════════════════════════════════════════════════════

import type { AITargetSection } from "@cvbuilder/shared";
import type { Prisma } from "@prisma/client";
import { AiArtifactStatus, AiToolKind } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const AI_CV_INCLUDE = {
  personalInfo: true,
  summary: true,
  coverLetter: true,
  experiences: { orderBy: { orderIndex: "asc" as const } },
  educations: { orderBy: { orderIndex: "asc" as const } },
  skills: { orderBy: { orderIndex: "asc" as const } },
  projects: { orderBy: { orderIndex: "asc" as const } },
  certifications: { orderBy: { orderIndex: "asc" as const } },
  languages: { orderBy: { orderIndex: "asc" as const } },
} satisfies Prisma.CVInclude;

export const AI_ARTIFACT_SELECT = {
  id: true,
  tool: true,
  status: true,
  title: true,
  provider: true,
  model: true,
  locale: true,
  targetSection: true,
  input: true,
  output: true,
  summary: true,
  error: true,
  cvId: true,
  appliedAt: true,
  dismissedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AiArtifactSelect;

export interface CreateAIArtifactInput {
  userId: string;
  cvId?: string | null;
  tool: AiToolKind;
  status?: AiArtifactStatus;
  title: string;
  provider?: string;
  model: string;
  locale: string;
  targetSection?: AITargetSection | null;
  input?: Prisma.InputJsonValue | null;
  output?: Prisma.InputJsonValue | null;
  summary?: string | null;
  error?: string | null;
  appliedAt?: Date | null;
  dismissedAt?: Date | null;
}

export const aiRepository = {
  findCVForUser(userId: string, cvId: string) {
    return prisma.cV.findFirst({
      where: { id: cvId, userId },
      include: AI_CV_INCLUDE,
    });
  },

  listArtifacts(userId: string, filters: { cvId?: string; tool?: AiToolKind; limit?: number }) {
    return prisma.aiArtifact.findMany({
      where: {
        userId,
        ...(filters.cvId ? { cvId: filters.cvId } : {}),
        ...(filters.tool ? { tool: filters.tool } : {}),
      },
      select: AI_ARTIFACT_SELECT,
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 10,
    });
  },

  findArtifactById(userId: string, artifactId: string) {
    return prisma.aiArtifact.findFirst({
      where: { id: artifactId, userId },
      select: AI_ARTIFACT_SELECT,
    });
  },

  createArtifact(input: CreateAIArtifactInput) {
    return prisma.aiArtifact.create({
      data: {
        userId: input.userId,
        cvId: input.cvId ?? null,
        tool: input.tool,
        status: input.status ?? AiArtifactStatus.READY,
        title: input.title,
        provider: input.provider ?? "ollama",
        model: input.model,
        locale: input.locale,
        targetSection: input.targetSection ?? null,
        input: input.input ?? undefined,
        output: input.output ?? undefined,
        summary: input.summary ?? null,
        error: input.error ?? null,
        appliedAt: input.appliedAt ?? null,
        dismissedAt: input.dismissedAt ?? null,
      },
      select: AI_ARTIFACT_SELECT,
    });
  },

  updateArtifact(artifactId: string, data: Prisma.AiArtifactUpdateInput) {
    return prisma.aiArtifact.update({
      where: { id: artifactId },
      data,
      select: AI_ARTIFACT_SELECT,
    });
  },

  async addSkills(cvId: string, names: string[]) {
    if (names.length === 0) {
      return 0;
    }

    const orderOffset = await prisma.skill.count({ where: { cvId } });
    const result = await prisma.skill.createMany({
      data: names.map((name, index) => ({
        cvId,
        name,
        category: "TECHNICAL",
        proficiencyLevel: "INTERMEDIATE",
        yearsOfExperience: null,
        orderIndex: orderOffset + index,
      })),
    });

    return result.count;
  },

  getSkillNames(cvId: string) {
    return prisma.skill.findMany({
      where: { cvId },
      select: { name: true },
      orderBy: { orderIndex: "asc" },
    });
  },

  upsertSummary(cvId: string, content: string) {
    return prisma.summary.upsert({
      where: { cvId },
      create: { cvId, content, aiGenerated: true },
      update: { content, aiGenerated: true },
    });
  },

  upsertCoverLetter(cvId: string, content: string) {
    return prisma.coverLetter.upsert({
      where: { cvId },
      create: { cvId, content, aiGenerated: true },
      update: { content, aiGenerated: true },
    });
  },

  markCvAtsOptimized(cvId: string) {
    return prisma.cV.update({
      where: { id: cvId },
      data: { isAtsOptimized: true },
    });
  },
};
