import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

export interface HandlerOptions<TBody = unknown> {
  auth?: boolean;
  requiredRole?: string;
  rateLimit?: string;
  bodySchema?: { parse: (data: unknown) => TBody };
}

export interface HandlerContext<TBody = unknown> {
  req: NextRequest;
  params: Record<string, string>;
  session: { user: { id: string; role: string } } | null;
  body: TBody | undefined;
}

export interface HandlerDeps {
  checkRateLimit?: (
    req: NextRequest,
    limiterName: string,
  ) => Promise<RateLimitResult>;
  getSession?: (
    req: NextRequest,
  ) => Promise<{ user: { id: string; role: string } } | null>;
  onError?: (error: unknown, req: NextRequest) => void;
}

type Handler<TBody = unknown> = (
  ctx: HandlerContext<TBody>,
) => Promise<NextResponse>;

type RouteHandler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

// ─── Role Hierarchy ───────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  FREE: 0,
  PREMIUM: 1,
  ADMIN: 2,
};

// ─── Handler Factory ──────────────────────────────────────────────────────

export function createHandler<TBody = unknown>(
  options: HandlerOptions<TBody>,
  handler: Handler<TBody>,
  deps?: HandlerDeps,
): RouteHandler {
  return async (req, routeContext) => {
    try {
      const params = routeContext?.params
        ? await routeContext.params
        : {};

      // 1. Rate limiting
      if (options.rateLimit && deps?.checkRateLimit) {
        const result = await deps.checkRateLimit(req, options.rateLimit);
        if (!result.success) {
          const retryAfter = result.reset
            ? String(Math.ceil((result.reset - Date.now()) / 1000))
            : "60";
          return errorResponse("Too many requests. Please try again later.", 429, {
            "X-RateLimit-Limit": String(result.limit ?? ""),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset ?? ""),
            "Retry-After": retryAfter,
          });
        }
      }

      // 2. Auth check
      let session: { user: { id: string; role: string } } | null = null;
      if (options.auth) {
        if (deps?.getSession) {
          session = await deps.getSession(req);
        }
        if (!session) {
          return errorResponse("Unauthorized", 401);
        }
        if (options.requiredRole) {
          const userRank = ROLE_RANK[session.user.role] ?? 0;
          const requiredRank = ROLE_RANK[options.requiredRole] ?? 0;
          if (userRank < requiredRank) {
            return errorResponse("Insufficient permissions", 403);
          }
        }
      }

      // 3. Body validation
      let body: TBody | undefined;
      if (options.bodySchema) {
        try {
          const raw = await req.json();
          body = options.bodySchema.parse(raw);
        } catch {
          return errorResponse("Invalid request body", 400);
        }
      }

      // 4. Execute handler
      return await handler({ req, params, session, body });
    } catch (error) {
      deps?.onError?.(error, req);
      return errorResponse("Internal server error", 500);
    }
  };
}

// ─── Response Helpers ─────────────────────────────────────────────────────

export function jsonResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  error: string,
  status = 400,
  headers?: Record<string, string>,
): NextResponse {
  const res = NextResponse.json({ error }, { status });
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.headers.set(key, value);
    }
  }
  return res;
}
