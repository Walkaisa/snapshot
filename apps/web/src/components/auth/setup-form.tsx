"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USERNAME_PATTERN } from "@snapshot/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSetup } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/types";
import { AUTH_REDIRECT_PARAM, DEFAULT_LANDING, safeRedirectTarget } from "@/lib/auth-gate";

interface SetupValues {
	username: string;
	password: string;
	confirmPassword: string;
}

export function SetupForm() {
	const t = useTranslations("auth");
	const router = useRouter();
	const searchParams = useSearchParams();
	const setup = useSetup();

	const resolver = useMemo<Resolver<SetupValues>>(() => {
		const schema = z
			.object({
				username: z.string().trim().regex(USERNAME_PATTERN, t("errors.username")),
				password: z.string().min(PASSWORD_MIN_LENGTH, t("errors.passwordShort")).max(PASSWORD_MAX_LENGTH, t("errors.passwordLong")),
				confirmPassword: z.string(),
			})
			.refine((values) => values.password === values.confirmPassword, {
				message: t("errors.passwordMismatch"),
				path: ["confirmPassword"],
			});

		return zodResolver(schema) as Resolver<SetupValues>;
	}, [t]);

	const form = useForm<SetupValues>({
		resolver,
		defaultValues: { username: "", password: "", confirmPassword: "" },
	});

	const password = form.watch("password");

	async function onSubmit(values: SetupValues): Promise<void> {
		try {
			await setup.mutateAsync({ username: values.username, password: values.password });
			router.replace(safeRedirectTarget(searchParams.get(AUTH_REDIRECT_PARAM)) ?? DEFAULT_LANDING);
		} catch (error) {
			if (error instanceof ApiError && error.status === 409) {
				form.setError("username", { message: t("errors.alreadyInitialized") });
				return;
			}
			toast.error(error instanceof ApiError ? error.message : t("errors.generic"));
		}
	}

	return (
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
								autoComplete="new-password"
								aria-invalid={fieldState.invalid}
								aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
								{...field}
							/>
							{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
							{password.length > 0 ? <PasswordStrength password={password} /> : null}
						</Field>
					)}
				/>
				<Controller
					control={form.control}
					name="confirmPassword"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>{t("fields.confirmPassword")}</FieldLabel>
							<Input
								id={field.name}
								type="password"
								autoComplete="new-password"
								aria-invalid={fieldState.invalid}
								aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
								{...field}
							/>
							{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
						</Field>
					)}
				/>
				<Button type="submit" disabled={setup.isPending}>
					{setup.isPending ? t("setup.submitting") : t("setup.submit")}
				</Button>
			</FieldGroup>
		</form>
	);
}
