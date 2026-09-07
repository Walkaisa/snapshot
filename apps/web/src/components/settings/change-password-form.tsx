"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordStrength } from "@/components/auth/password-strength";
import { UsernameHint } from "@/components/auth/username-hint";
import { SettingsCard } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-account";
import { useChangePassword } from "@/hooks/use-security";
import { ApiError } from "@/lib/api/types";

interface PasswordValues {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export function ChangePasswordForm() {
	const t = useTranslations("settings.password");
	const changePassword = useChangePassword();
	const { data: session } = useSession();

	const resolver = useMemo<Resolver<PasswordValues>>(() => {
		const schema = z
			.object({
				currentPassword: z.string().min(1, t("errors.required")),
				newPassword: z.string().min(PASSWORD_MIN_LENGTH, t("errors.short")).max(PASSWORD_MAX_LENGTH, t("errors.long")),
				confirmPassword: z.string(),
			})
			.refine((values) => values.newPassword === values.confirmPassword, {
				path: ["confirmPassword"],
				message: t("errors.mismatch"),
			});

		return zodResolver(schema) as Resolver<PasswordValues>;
	}, [t]);

	const form = useForm<PasswordValues>({
		resolver,
		defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
	});

	const newPassword = form.watch("newPassword");

	async function onSubmit(values: PasswordValues): Promise<void> {
		try {
			await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
			form.reset();
			toast.success(t("saved"));
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				form.setError("currentPassword", { message: t("errors.currentWrong") });
				return;
			}
			toast.error(error instanceof ApiError ? error.message : t("errors.generic"));
		}
	}

	return (
		<SettingsCard title={t("title")} description={t("description")}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<UsernameHint username={session?.username ?? ""} />
				<FieldGroup>
					<Controller
						control={form.control}
						name="currentPassword"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.current")}</FieldLabel>
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
					<Controller
						control={form.control}
						name="newPassword"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.new")}</FieldLabel>
								<Input
									id={field.name}
									type="password"
									autoComplete="new-password"
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
									{...field}
								/>
								{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
								{newPassword.length > 0 ? <PasswordStrength password={newPassword} /> : null}
							</Field>
						)}
					/>
					<Controller
						control={form.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.confirm")}</FieldLabel>
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
					<Field>
						<FieldDescription>{t("signsOutOthers")}</FieldDescription>
						<div>
							<Button type="submit" disabled={changePassword.isPending}>
								{changePassword.isPending ? t("submitting") : t("submit")}
							</Button>
						</div>
					</Field>
				</FieldGroup>
			</form>
		</SettingsCard>
	);
}
