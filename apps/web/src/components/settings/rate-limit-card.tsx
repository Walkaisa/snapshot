"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";

import { SettingsCard } from "@/components/settings/settings-card";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ZodFields } from "@/lib/form-fields";

export interface RateLimitValues {
	rateLimitEnabled: boolean;
	rateLimitRequests: number;
	rateLimitWindowSeconds: number;
}

export function useRateLimitFields(): ZodFields<RateLimitValues> {
	const t = useTranslations("settings.rateLimit");

	return useMemo(
		() => ({
			rateLimitEnabled: z.boolean(),
			rateLimitRequests: z.coerce.number().int().min(1, t("errors.min")),
			rateLimitWindowSeconds: z.coerce.number().int().min(1, t("errors.min")),
		}),
		[t],
	);
}

export function RateLimitCard() {
	const t = useTranslations("settings.rateLimit");
	const form = useFormContext<RateLimitValues>();
	const enabled = form.watch("rateLimitEnabled");

	function renderNumber(name: "rateLimitRequests" | "rateLimitWindowSeconds") {
		return (
			<Controller
				control={form.control}
				name={name}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid} data-disabled={!enabled}>
						<FieldLabel htmlFor={field.name}>{t(`fields.${name === "rateLimitRequests" ? "requests" : "window"}`)}</FieldLabel>
						<Input
							id={field.name}
							type="number"
							min={1}
							disabled={!enabled}
							aria-invalid={fieldState.invalid}
							aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
							{...field}
						/>
						{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
					</Field>
				)}
			/>
		);
	}

	return (
		<SettingsCard title={t("title")} description={t("description")}>
			<Controller
				control={form.control}
				name="rateLimitEnabled"
				render={({ field }) => (
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel htmlFor={field.name}>{t("fields.enabled")}</FieldLabel>
							<FieldDescription>{t("appliesLive")}</FieldDescription>
						</FieldContent>
						<Switch
							id={field.name}
							name={field.name}
							checked={field.value}
							onCheckedChange={(checked) => field.onChange(checked)}
							onBlur={field.onBlur}
						/>
					</Field>
				)}
			/>
			<div className="grid gap-5 sm:grid-cols-2">
				{renderNumber("rateLimitRequests")}
				{renderNumber("rateLimitWindowSeconds")}
			</div>
		</SettingsCard>
	);
}
