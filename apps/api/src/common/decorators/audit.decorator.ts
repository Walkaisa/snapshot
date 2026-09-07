import { SetMetadata } from "@nestjs/common";
import type { AuditAction as AuditActionName } from "@snapshot/contracts";
import type { Request } from "express";

export const AUDIT_ACTION_KEY = "audit:action";

export interface AuditRouteOptions {
	id?: (result: unknown, request: Request) => string | null | undefined;
	metadata?: (result: unknown, request: Request) => Record<string, unknown> | null | undefined;
}

export interface AuditRoute extends AuditRouteOptions {
	action: AuditActionName;
}

export function routeParam(request: Request, name: string): string | null {
	const value = request.params[name];

	return typeof value === "string" ? value : null;
}

export function requestBody(request: Request): Record<string, unknown> | null {
	return typeof request.body === "object" && request.body !== null ? (request.body as Record<string, unknown>) : null;
}

export const AuditAction = (action: AuditActionName, options: AuditRouteOptions = {}) =>
	SetMetadata<string, AuditRoute>(AUDIT_ACTION_KEY, { action, ...options });
