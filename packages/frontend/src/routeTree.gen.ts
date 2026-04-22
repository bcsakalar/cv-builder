// ═══════════════════════════════════════════════════════════
// Route tree — manual setup until TanStack Router plugin is added
// ═══════════════════════════════════════════════════════════

import { rootRoute } from "./routes/__root";
import { authRoute } from "./routes/auth/index";
import { indexRoute } from "./routes/index";
import { cvIndexRoute } from "./routes/cv/index";
import { cvNewRoute } from "./routes/cv/new";
import { cvEditRoute } from "./routes/cv/$cvId/edit";
import { templatesRoute } from "./routes/templates/index";
import { githubRoute } from "./routes/github/index";
import { recruiterRoute } from "./routes/recruiter/index";
import { settingsRoute } from "./routes/settings/index";

const routeTree = rootRoute.addChildren([
  authRoute,
  indexRoute,
  cvIndexRoute,
  cvNewRoute,
  cvEditRoute,
  templatesRoute,
  githubRoute,
  recruiterRoute,
  settingsRoute,
]);

export { routeTree };
