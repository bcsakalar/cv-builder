// ═══════════════════════════════════════════════════════════
// CV Section Definitions
// ═══════════════════════════════════════════════════════════

export interface SectionDefinition {
  key: string;
  label: string;
  icon: string;
  description: string;
  isRequired: boolean;
  isRepeatable: boolean;
  maxEntries?: number;
}

export const CV_SECTIONS: Record<string, SectionDefinition> = {
  personalInfo: {
    key: "personalInfo",
    label: "Personal Information",
    icon: "User",
    description: "Name, contact details, and profile photo",
    isRequired: true,
    isRepeatable: false,
  },
  socialLinks: {
    key: "socialLinks",
    label: "Social Media & Links",
    icon: "Link",
    description: "LinkedIn, GitHub, Twitter, and other social profiles",
    isRequired: false,
    isRepeatable: false,
  },
  summary: {
    key: "summary",
    label: "Professional Summary",
    icon: "FileText",
    description: "A brief professional overview or career objective",
    isRequired: false,
    isRepeatable: false,
  },
  experience: {
    key: "experience",
    label: "Work Experience",
    icon: "Briefcase",
    description: "Employment history and professional achievements",
    isRequired: false,
    isRepeatable: true,
  },
  education: {
    key: "education",
    label: "Education",
    icon: "GraduationCap",
    description: "Academic background and qualifications",
    isRequired: false,
    isRepeatable: true,
  },
  skills: {
    key: "skills",
    label: "Skills",
    icon: "Wrench",
    description: "Technical and soft skills with proficiency levels",
    isRequired: false,
    isRepeatable: true,
  },
  projects: {
    key: "projects",
    label: "Projects",
    icon: "FolderGit2",
    description: "Personal, professional, or open-source projects",
    isRequired: false,
    isRepeatable: true,
  },
  certifications: {
    key: "certifications",
    label: "Certifications",
    icon: "Award",
    description: "Professional certifications and credentials",
    isRequired: false,
    isRepeatable: true,
  },
  languages: {
    key: "languages",
    label: "Languages",
    icon: "Globe",
    description: "Languages spoken and proficiency level",
    isRequired: false,
    isRepeatable: true,
  },
  volunteering: {
    key: "volunteering",
    label: "Volunteer Experience",
    icon: "Heart",
    description: "Voluntary work and community involvement",
    isRequired: false,
    isRepeatable: true,
  },
  publications: {
    key: "publications",
    label: "Publications",
    icon: "BookOpen",
    description: "Articles, papers, and published works",
    isRequired: false,
    isRepeatable: true,
  },
  awards: {
    key: "awards",
    label: "Awards & Honors",
    icon: "Trophy",
    description: "Awards, recognitions, and honors received",
    isRequired: false,
    isRepeatable: true,
  },
  references: {
    key: "references",
    label: "References",
    icon: "Users",
    description: "Professional references and recommendations",
    isRequired: false,
    isRepeatable: true,
  },
  hobbies: {
    key: "hobbies",
    label: "Hobbies & Interests",
    icon: "Palette",
    description: "Personal interests and hobbies",
    isRequired: false,
    isRepeatable: true,
  },
  customSection: {
    key: "customSection",
    label: "Custom Section",
    icon: "Plus",
    description: "Create your own custom section",
    isRequired: false,
    isRepeatable: true,
  },
} as const;

export const DEFAULT_SECTION_ORDER: string[] = [
  "personalInfo",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "volunteering",
  "publications",
  "awards",
  "references",
  "hobbies",
];

export const SECTION_KEYS = Object.keys(CV_SECTIONS);
