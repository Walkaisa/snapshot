import { z } from "zod";

export const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 1024;

export const usernameSchema = z.string().trim().regex(USERNAME_PATTERN, {
	message: "Username must be 1-64 characters using letters, digits, dot, underscore or hyphen and start with a letter or digit",
});

export const passwordSchema = z
	.string()
	.min(PASSWORD_MIN_LENGTH, {
		message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
	})
	.max(PASSWORD_MAX_LENGTH, {
		message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`,
	});

export const SUPPORTED_LOCALES = ["en", "de"] as const;

export const themeChoiceSchema = z.enum(["system", "light", "dark"]);
export type ThemeChoice = z.infer<typeof themeChoiceSchema>;

export const localeChoiceSchema = z.enum(["system", ...SUPPORTED_LOCALES] as const);
export type LocaleChoice = z.infer<typeof localeChoiceSchema>;

export const preferencesSchema = z.object({
	theme: themeChoiceSchema,
	locale: localeChoiceSchema,
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const preferencesUpdateSchema = preferencesSchema.partial().strict();
export type PreferencesUpdate = z.infer<typeof preferencesUpdateSchema>;

export const usernameChangeRequestSchema = z.object({
	username: usernameSchema,
	currentPassword: z.string().min(1),
});
export type UsernameChangeRequest = z.infer<typeof usernameChangeRequestSchema>;

export const accountViewSchema = z.object({
	username: z.string(),
	theme: themeChoiceSchema,
	locale: localeChoiceSchema,
});
export type AccountView = z.infer<typeof accountViewSchema>;

export const setupRequestSchema = z.object({
	username: usernameSchema,
	password: passwordSchema,
});
export type SetupRequest = z.infer<typeof setupRequestSchema>;

export const loginRequestSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const passwordChangeRequestSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: passwordSchema,
});
export type PasswordChangeRequest = z.infer<typeof passwordChangeRequestSchema>;

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_CODE_PATTERN = /^\d{6}$/;
export const RECOVERY_CODE_COUNT = 10;
export const TOTP_LABEL_MAX_LENGTH = 64;
export const RECOVERY_CODE_PATTERN = /^[A-Z2-9]{5}-[A-Z2-9]{5}$/;

export const totpCodeSchema = z
	.string()
	.trim()
	.transform((value) => value.replaceAll(/[\s-]/g, ""))
	.refine((value) => TOTP_CODE_PATTERN.test(value), { message: `Enter the ${TOTP_DIGITS}-digit code from your authenticator app` });

export const mfaCodeSchema = z
	.string()
	.trim()
	.min(1, { message: "Enter a code" })
	.max(64, { message: "Enter a code" })
	.transform((value) => value.toUpperCase().replaceAll(/\s/g, ""));

export const currentPasswordSchema = z.string().min(1, { message: "Enter your current password" });

export const totpLabelSchema = z
	.string()
	.trim()
	.min(1, { message: "Give this authenticator a name" })
	.max(TOTP_LABEL_MAX_LENGTH, { message: `Name must be at most ${TOTP_LABEL_MAX_LENGTH} characters long` });

export const mfaStatusSchema = z.object({
	enabled: z.boolean(),
	pendingEnrollment: z.boolean(),
	label: z.string().nullable(),
	enabledAt: z.iso.datetime({ offset: true }).nullable(),
	recoveryCodesRemaining: z.number().int().nonnegative(),
});
export type MfaStatus = z.infer<typeof mfaStatusSchema>;

export const totpEnrollmentSchema = z.object({
	secret: z.string(),
	otpauthUri: z.string(),
	issuer: z.string(),
	account: z.string(),
	digits: z.number().int(),
	period: z.number().int(),
});
export type TotpEnrollment = z.infer<typeof totpEnrollmentSchema>;

export const recoveryCodesSchema = z.object({
	codes: z.array(z.string()),
});
export type RecoveryCodes = z.infer<typeof recoveryCodesSchema>;

export const passwordConfirmRequestSchema = z.object({
	currentPassword: currentPasswordSchema,
});
export type PasswordConfirmRequest = z.infer<typeof passwordConfirmRequestSchema>;

export const totpEnableRequestSchema = z.object({
	code: totpCodeSchema,
	label: totpLabelSchema,
});
export type TotpEnableRequest = z.infer<typeof totpEnableRequestSchema>;

export const mfaDisableRequestSchema = z.object({
	currentPassword: currentPasswordSchema,
	code: mfaCodeSchema,
});
export type MfaDisableRequest = z.infer<typeof mfaDisableRequestSchema>;

export const recoveryCodesRegenerateRequestSchema = z.object({
	currentPassword: currentPasswordSchema,
	code: mfaCodeSchema,
});
export type RecoveryCodesRegenerateRequest = z.infer<typeof recoveryCodesRegenerateRequestSchema>;

export const mfaVerifyRequestSchema = z.object({
	code: mfaCodeSchema,
});
export type MfaVerifyRequest = z.infer<typeof mfaVerifyRequestSchema>;

export const sessionDataSchema = z.object({
	username: z.string(),
	csrfToken: z.string(),
	theme: themeChoiceSchema,
	locale: localeChoiceSchema,
});
export type SessionData = z.infer<typeof sessionDataSchema>;

export const authStateSchema = z.object({
	initialized: z.boolean(),
	authenticated: z.boolean(),
});
export type AuthState = z.infer<typeof authStateSchema>;

export const mfaChallengeSchema = z.object({
	mfaRequired: z.literal(true),
	csrfToken: z.string(),
});
export type MfaChallenge = z.infer<typeof mfaChallengeSchema>;

export const signInResultSchema = z.discriminatedUnion("mfaRequired", [
	sessionDataSchema.extend({ mfaRequired: z.literal(false) }),
	mfaChallengeSchema,
]);
export type SignInResult = z.infer<typeof signInResultSchema>;

export const sessionsDataSchema = z.object({
	activeSessions: z.number().int().nonnegative(),
});
export type SessionsData = z.infer<typeof sessionsDataSchema>;

export const sessionInfoSchema = z.object({
	id: z.string(),
	ip: z.string().nullable(),
	userAgent: z.string().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	lastSeenAt: z.iso.datetime({ offset: true }),
	current: z.boolean(),
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;

export const sessionListSchema = z.object({
	sessions: z.array(sessionInfoSchema),
});
export type SessionList = z.infer<typeof sessionListSchema>;

export const sessionRevokeRequestSchema = z.object({
	sessionId: z.string().min(1).optional(),
});
export type SessionRevokeRequest = z.infer<typeof sessionRevokeRequestSchema>;

export const revokeDataSchema = z.object({
	revoked: z.number().int().nonnegative(),
});
export type RevokeData = z.infer<typeof revokeDataSchema>;
