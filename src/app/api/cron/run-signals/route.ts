import { type NextRequest, NextResponse } from "next/server";
import { executeCronJob } from "@/app/api/cron/cron-handler";
import { runAllSignals } from "@/signals/run-all-signals";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("CRON_SECRET not set — cron endpoint is unprotected");
    return true;
  }
  return authHeader === `Bearer ${secret}`;
}

async function logSync(
  jobName: string,
  result: Record<string, unknown>,
): Promise<void> {
  await prisma.syncLog.create({
    data: {
      jobName,
      status: result.error ? "error" : "success",
      details: result as Parameters<
        typeof prisma.syncLog.create
      >[0]["data"]["details"],
      error: result.error as string | undefined,
    },
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");

  const result = await executeCronJob("run-signals", authHeader, {
    verifyCronSecret,
    execute: () =>
      runAllSignals() as unknown as Promise<Record<string, unknown>>,
    logSync,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}
