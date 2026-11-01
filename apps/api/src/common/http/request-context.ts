import type { Request } from "express";
import { CORRELATION_ID_HEADER } from "../interceptors/correlation-id.interceptor.js";
import { hashIp } from "../security/ip-hash.js";

const MAX_USER_AGENT_LENGTH = 255;
const MAX_CORRELATION_LENGTH = 64;

export type RequestContext = {
    ipHash: string | null;
    userAgent: string | null;
    correlationId: string | null;
}

function truncated(value: unknown, limit: number): string | null {
    return typeof value === "string" && value.length > 0 ? value.slice(0, limit) : null;
}

export function requestContextOf(request: Request, secret: string): RequestContext {
    return {
        ipHash: hashIp(request.ip, secret),
        userAgent: truncated(request.headers["user-agent"], MAX_USER_AGENT_LENGTH),
        correlationId: truncated(request.headers[CORRELATION_ID_HEADER], MAX_CORRELATION_LENGTH),
    }
}