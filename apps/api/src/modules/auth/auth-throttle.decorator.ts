import { Throttle } from "@nestjs/throttler";

import {
	AUTH_IP_THROTTLER,
	AUTH_SUSTAINED_THROTTLE_BLOCK_MS,
	AUTH_SUSTAINED_THROTTLE_TTL_MS,
	AUTH_SUSTAINED_THROTTLER,
	AUTH_THROTTLE_BLOCK_MS,
	AUTH_THROTTLE_TTL_MS,
} from "./auth.constants.js";

type ThrottleRequest = Record<string, unknown>;
type IdentityTracker = (request: ThrottleRequest) => string;

function object(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringProperty(value: unknown, property: string): string | null {
	const record = object(value);
	const candidate = record?.[property];

	return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function ipIdentity(request: ThrottleRequest): string {
	return `ip:${typeof request.ip === "string" ? request.ip : "unknown"}`;
}

export function credentialsIdentity(request: ThrottleRequest): string {
	const username = stringProperty(request.body, "username")?.trim().toLocaleLowerCase("en-US") ?? "invalid";

	return `username:${username}`;
}

export function pendingMfaIdentity(request: ThrottleRequest): string {
	const pending = object(object(request.session)?.pendingMfa);
	const adminId = stringProperty(pending, "adminId") ?? "missing";

	return `admin:${adminId}`;
}

export function authenticatedIdentity(request: ThrottleRequest): string {
	const adminId = stringProperty(request.user, "id") ?? "missing";

	return `admin:${adminId}`;
}

export function AuthThrottle(limit: number, identity: IdentityTracker): MethodDecorator {
	return Throttle({
		default: {
			limit,
			ttl: AUTH_THROTTLE_TTL_MS,
			blockDuration: AUTH_THROTTLE_BLOCK_MS,
			getTracker: identity,
		},
		[AUTH_SUSTAINED_THROTTLER]: {
			limit: limit * 3,
			ttl: AUTH_SUSTAINED_THROTTLE_TTL_MS,
			blockDuration: AUTH_SUSTAINED_THROTTLE_BLOCK_MS,
			getTracker: identity,
		},
		[AUTH_IP_THROTTLER]: {
			limit: limit * 5,
			ttl: AUTH_THROTTLE_TTL_MS,
			blockDuration: AUTH_THROTTLE_BLOCK_MS,
			getTracker: ipIdentity,
		},
	});
}
