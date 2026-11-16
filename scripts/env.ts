/**
 * scripts/env.ts
 *
 * Loads .env.local and its siblings the way Next does, for scripts run
 * outside Next (migrate, seed, invitations). Import it first, before
 * anything that reads the environment.
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
