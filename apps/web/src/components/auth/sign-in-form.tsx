"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { z } from "zod";

import { AuthCard } from "@/components/auth/auth-card";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSignIn } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/types";
import { AUTH_REDIRECT_PARAM, DEFAULT_LANDING, safeRedirectTarget } from "@/lib/auth-gate";

interface SignInValues {
	username: string;
	password: string;
}

export function SignInForm() {
	const t = useTranslations("auth");
	const router = useRouter();
	const searchParams = useSearchParams();
	const signIn = useSignIn();
	const landing = safeRedirectTarget(searchParams.get(AUTH_REDIRECT_PARAM)) ?? DEFAULT_LANDING;
	const [retryAfter, setRetryAfter] = useState<number | null>(null);
	const [mfaRequired, setMfaRequired] = useState(false);

	useEffect(() => {
		if (retryAfter === null) {
			return;
		}

		const timer = setInterval(() => {
			setRetryAfter((seconds) => (seconds !== null && seconds > 1 ? seconds - 1 : null));
		}, 1000);

		return () => clearInterval(timer);
	}, [retryAfter]);

	const resolver = useMemo<Resolver<SignInValues>>(() => {
		const schema = z.object({
			username: z.string().min(1, t("errors.required")),
			password: z.string().min(1, t("errors.required")),
		});

		return zodResolver(schema) as Resolver<SignInValues>;
	}, [t]);

	const form = useForm<SignInValues>({ resolver, defaultValues: { username: "", password: "" } });

	async function onSubmit(values: SignInValues): Promise<void> {
		try {
			const result = await signIn.mutateAsync(values);

			if (result.mfaRequired) {
				setMfaRequired(true);
				return;
			}

			router.replace(landing);
		} catch (error) {
			if (error instanceof ApiError && error.status === 429) {
				setRetryAfter(error.retryAfter ?? 60);
				return;
			}
			form.setError("password", { message: t("errors.invalidCredentials") });
		}
	}

	const locked = retryAfter !== null;

	if (mfaRequired) {
		return (
			<AuthCard title={t("mfa.title")} description={t("mfa.description")}>
				<MfaChallengeForm landing={landing} />
			</AuthCard>
		);
	}

	return (
		<AuthCard title={t("signIn.title")} description={t("signIn.description")}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<FieldGroup>
					<Controller
						control={form.control}
						name="username"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.username")}</FieldLabel>
								<Input
									id={field.name}
									autoComplete="username"
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
									{...field}
								/>
								{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
							</Field>
						)}
					/>
					<Controller
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.password")}</FieldLabel>
								<Input
									id={field.name}
									type="password"
									autoComplete="current-password"
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
									{...field}
								/>
								{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
							</Field>
						)}
					/>
					{locked ? <p className="text-destructive text-sm">{t("errors.throttledCountdown", { seconds: retryAfter })}</p> : null}
					<Button type="submit" disabled={signIn.isPending || locked}>
						{signIn.isPending ? t("signIn.submitting") : t("signIn.submit")}
					</Button>
				</FieldGroup>
			</form>
		</AuthCard>
	);
}
