// ═══════════════════════════════════════════════════════════
// Prisma Seed — Default templates + demo data
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { DEFAULT_THEME_CONFIG } from "@cvbuilder/shared";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Default Templates ──────────────────────────────────

  const templates = [
    {
      id: "10000000-0000-0000-0000-000000000001",
      name: "Classic Professional",
      slug: "classic-professional",
      description:
        "A clean, traditional CV layout with clear section hierarchy. Perfect for corporate and finance roles.",
      category: "PROFESSIONAL" as const,
      structure: {
        sections: [
          "personalInfo",
          "summary",
          "experience",
          "education",
          "skills",
          "certifications",
          "languages",
        ],
        layout: "SINGLE_COLUMN",
      },
      defaultTheme: {
        ...DEFAULT_THEME_CONFIG,
        primaryColor: "#1a365d",
        headingFont: "Merriweather",
        bodyFont: "Source Sans Pro",
      },
      supportedLayouts: ["SINGLE_COLUMN", "TWO_COLUMN_LEFT"],
    },
    {
      id: "10000000-0000-0000-0000-000000000002",
      name: "Modern Minimal",
      slug: "modern-minimal",
      description:
        "Minimalist design with generous white space and modern typography. Great for design and tech positions.",
      category: "MODERN" as const,
      structure: {
        sections: [
          "personalInfo",
          "summary",
          "experience",
          "projects",
          "skills",
          "education",
        ],
        layout: "TWO_COLUMN_LEFT",
      },
      defaultTheme: {
        ...DEFAULT_THEME_CONFIG,
        primaryColor: "#2563eb",
        layout: "TWO_COLUMN_LEFT",
        headingFont: "Inter",
        bodyFont: "Inter",
        spacing: "RELAXED",
      },
      supportedLayouts: [
        "SINGLE_COLUMN",
        "TWO_COLUMN_LEFT",
        "TWO_COLUMN_RIGHT",
      ],
    },
    {
      id: "10000000-0000-0000-0000-000000000003",
      name: "Creative Portfolio",
      slug: "creative-portfolio",
      description:
        "Bold colors and creative layout for designers, artists, and creative professionals.",
      category: "CREATIVE" as const,
      structure: {
        sections: [
          "personalInfo",
          "summary",
          "projects",
          "experience",
          "skills",
          "awards",
          "education",
        ],
        layout: "TWO_COLUMN_RIGHT",
      },
      defaultTheme: {
        ...DEFAULT_THEME_CONFIG,
        primaryColor: "#7c3aed",
        accentColor: "#f59e0b",
        layout: "TWO_COLUMN_RIGHT",
        headingFont: "Poppins",
        bodyFont: "Nunito",
        photoStyle: "ROUND",
        showIcons: true,
      },
      supportedLayouts: ["TWO_COLUMN_LEFT", "TWO_COLUMN_RIGHT", "THREE_PANEL"],
    },
    {
      id: "10000000-0000-0000-0000-000000000004",
      name: "Academic CV",
      slug: "academic-cv",
      description:
        "Formal academic curriculum vitae with emphasis on publications, research, and teaching experience.",
      category: "ACADEMIC" as const,
      structure: {
        sections: [
          "personalInfo",
          "summary",
          "education",
          "experience",
          "publications",
          "awards",
          "skills",
          "volunteerExperience",
          "references",
        ],
        layout: "SINGLE_COLUMN",
      },
      defaultTheme: {
        ...DEFAULT_THEME_CONFIG,
        primaryColor: "#0d4f4f",
        headingFont: "Lora",
        bodyFont: "Noto Sans",
        sectionDivider: "THIN_LINE",
      },
      supportedLayouts: ["SINGLE_COLUMN"],
    },
    {
      id: "10000000-0000-0000-0000-000000000005",
      name: "Tech Developer",
      slug: "tech-developer",
      description:
        "Developer-focused template highlighting technical skills, projects, and open source contributions.",
      category: "TECHNICAL" as const,
      structure: {
        sections: [
          "personalInfo",
          "summary",
          "skills",
          "experience",
          "projects",
          "certifications",
          "education",
          "hobbies",
        ],
        layout: "TWO_COLUMN_LEFT",
      },
      defaultTheme: {
        ...DEFAULT_THEME_CONFIG,
        primaryColor: "#059669",
        secondaryColor: "#1e293b",
        layout: "TWO_COLUMN_LEFT",
        headingFont: "Fira Code",
        bodyFont: "IBM Plex Sans",
        showIcons: true,
        sectionDivider: "LINE",
      },
      supportedLayouts: [
        "SINGLE_COLUMN",
        "TWO_COLUMN_LEFT",
        "TWO_COLUMN_RIGHT",
      ],
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {},
      create: template,
    });
  }

  console.log(`✅ ${templates.length} templates seeded`);

  // ── Demo User ──────────────────────────────────────────

  const demoUserId = "00000000-0000-0000-0000-000000000001";
  const demoPasswordHash = await bcrypt.hash("DemoPassword123!", 12);

  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {
      email: "demo@cvbuilder.local",
      name: "Demo User",
      passwordHash: demoPasswordHash,
    },
    create: {
      id: demoUserId,
      email: "demo@cvbuilder.local",
      name: "Demo User",
      passwordHash: demoPasswordHash,
    },
  });

  console.log("✅ Demo user seeded");

  // ── Demo CV ────────────────────────────────────────────

  const demoCvId = "20000000-0000-0000-0000-000000000001";

  await prisma.cV.upsert({
    where: { id: demoCvId },
    update: {},
    create: {
      id: demoCvId,
      title: "Full-Stack Developer Resume",
      slug: "full-stack-developer-resume-demo",
      status: "DRAFT",
      locale: "en",
      userId: demoUserId,
      templateId: templates[1].id,
      sectionOrder: [
        "personalInfo",
        "summary",
        "experience",
        "projects",
        "skills",
        "education",
        "certifications",
        "languages",
      ],
      themeConfig: templates[1].defaultTheme,
    },
  });

  await prisma.personalInfo.upsert({
    where: { cvId: demoCvId },
    update: {},
    create: {
      cvId: demoCvId,
      firstName: "Alex",
      lastName: "Johnson",
      professionalTitle: "Senior Full-Stack Developer",
      email: "alex.johnson@example.com",
      phone: "+1 (555) 123-4567",
      city: "San Francisco",
      country: "United States",
      website: "https://alexjohnson.dev",
      linkedIn: "https://linkedin.com/in/alexjohnson",
      github: "https://github.com/alexjohnson",
    },
  });

  await prisma.summary.upsert({
    where: { cvId: demoCvId },
    update: {},
    create: {
      cvId: demoCvId,
      content:
        "Passionate full-stack developer with 6+ years of experience building scalable web applications. Proficient in TypeScript, React, Node.js, and cloud infrastructure. Strong advocate for clean code, test-driven development, and agile methodologies.",
    },
  });

  await prisma.experience.createMany({
    data: [
      {
        cvId: demoCvId,
        jobTitle: "Senior Full-Stack Developer",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        startDate: "2022-01",
        isCurrent: true,
        description:
          "Leading development of a SaaS platform serving 50k+ users. Architecting microservices with Node.js and managing React frontend.",
        achievements: JSON.stringify([
          "Reduced page load time by 40% through code splitting and lazy loading",
          "Led migration from REST to GraphQL, improving data fetching efficiency by 60%",
          "Mentored 4 junior developers through code reviews and pair programming",
        ]),
        technologies: JSON.stringify([
          "TypeScript",
          "React",
          "Node.js",
          "PostgreSQL",
          "AWS",
          "Docker",
        ]),
        orderIndex: 0,
      },
      {
        cvId: demoCvId,
        jobTitle: "Full-Stack Developer",
        company: "StartupXYZ",
        location: "Remote",
        startDate: "2019-06",
        endDate: "2021-12",
        description:
          "Built and maintained the core product from prototype to production, handling both frontend and backend development.",
        achievements: JSON.stringify([
          "Developed real-time collaboration features using WebSockets",
          "Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes",
        ]),
        technologies: JSON.stringify([
          "JavaScript",
          "Vue.js",
          "Express",
          "MongoDB",
          "Redis",
        ]),
        orderIndex: 1,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.education.create({
    data: {
      cvId: demoCvId,
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      institution: "University of California, Berkeley",
      location: "Berkeley, CA",
      startDate: "2015-09",
      endDate: "2019-05",
      gpa: "3.7",
      relevantCoursework: JSON.stringify([
        "Data Structures",
        "Algorithms",
        "Distributed Systems",
        "Database Systems",
      ]),
    },
  });

  await prisma.skill.createMany({
    data: [
      {
        cvId: demoCvId,
        name: "TypeScript",
        category: "TECHNICAL",
        proficiencyLevel: "EXPERT",
        yearsOfExperience: 5,
        orderIndex: 0,
      },
      {
        cvId: demoCvId,
        name: "React",
        category: "FRAMEWORK",
        proficiencyLevel: "EXPERT",
        yearsOfExperience: 5,
        orderIndex: 1,
      },
      {
        cvId: demoCvId,
        name: "Node.js",
        category: "TECHNICAL",
        proficiencyLevel: "ADVANCED",
        yearsOfExperience: 6,
        orderIndex: 2,
      },
      {
        cvId: demoCvId,
        name: "PostgreSQL",
        category: "TOOL",
        proficiencyLevel: "ADVANCED",
        yearsOfExperience: 4,
        orderIndex: 3,
      },
      {
        cvId: demoCvId,
        name: "Docker",
        category: "TOOL",
        proficiencyLevel: "INTERMEDIATE",
        yearsOfExperience: 3,
        orderIndex: 4,
      },
      {
        cvId: demoCvId,
        name: "Problem Solving",
        category: "SOFT",
        proficiencyLevel: "EXPERT",
        orderIndex: 5,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.language.createMany({
    data: [
      {
        cvId: demoCvId,
        name: "English",
        proficiency: "NATIVE",
        orderIndex: 0,
      },
      {
        cvId: demoCvId,
        name: "Spanish",
        proficiency: "PROFESSIONAL_WORKING",
        orderIndex: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Demo CV with sections seeded");
  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
