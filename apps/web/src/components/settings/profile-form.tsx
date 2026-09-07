"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { USERNAME_PATTERN } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { SettingsCard, SettingsCardSkeleton } from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChangeUsername, useSession } from "@/hooks/use-account";
import { ApiError } from "@/lib/api/types";

interface ProfileValues {
	username: string;
	currentPassword: string;
}

function ProfileFields({ username }: { username: string }) {
	const t = useTranslations("settings.profile");
	const changeUsername = useChangeUsername();

	const resolver = useMemo<Resolver<ProfileValues>>(() => {
		const schema = z.object({
			username: z.string().trim().regex(USERNAME_PATTERN, t("errors.username")),
			currentPassword: z.string().min(1, t("errors.currentRequired")),
		});

		return zodResolver(schema) as Resolver<ProfileValues>;
	}, [t]);

	const form = useForm<ProfileValues>({ resolver, defaultValues: { username, currentPassword: "" } });

	async function onSubmit(values: ProfileValues): Promise<void> {
		try {
			await changeUsername.mutateAsync({ username: values.username, currentPassword: values.currentPassword });
			form.reset({ username: values.username, currentPassword: "" });
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
								<FieldDescription>{t("fields.usernameHint")}</FieldDescription>
								{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
							</Field>
						)}
					/>
					<Controller
						control={form.control}
						name="currentPassword"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.currentPassword")}</FieldLabel>
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
					<Field>
						<div>
							<Button type="submit" disabled={changeUsername.isPending}>
								{changeUsername.isPending ? t("submitting") : t("submit")}
							</Button>
						</div>
					</Field>
				</FieldGroup>
			</form>
		</SettingsCard>
	);
}

export function ProfileForm() {
	const { data, isPending, isError, refetch } = useSession();

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={2} />;
	}

	return <ProfileFields username={data.username} />;
}
