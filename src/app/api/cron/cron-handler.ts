export interface CronJobDeps {
  verifyCronSecret: (authHeader: string | null) => boolean;
  execute: () => Promise<Record<string, unknown>>;
  logSync: (jobName: string, result: Record<string, unknown>) => Promise<void>;
}

export interface CronResult {
  success: boolean;
  status?: number;
  data?: Record<string, unknown>;
  error?: string;
}

export async function executeCronJob(
  jobName: string,
  authHeader: string | null,
  deps: CronJobDeps,
): Promise<CronResult> {
  if (!deps.verifyCronSecret(authHeader)) {
    return { success: false, status: 401, error: "Unauthorized" };
  }

  try {
    const data = await deps.execute();
    await deps.logSync(jobName, data);
    return { success: true, data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await deps.logSync(jobName, { error: errorMsg }).catch(() => {});
    return { success: false, status: 500, error: errorMsg };
  }
}
