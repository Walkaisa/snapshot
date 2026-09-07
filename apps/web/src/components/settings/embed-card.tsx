"use client";

import { TEMPLATE_VARIABLES, THEME_COLOR_PATTERN, templatePlaceholders } from "@snapshot/contracts";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";

import { DEFAULT_EMBED_THEME_COLOR, EmbedPreview } from "@/components/settings/embed-preview";
import { SearchSelect } from "@/components/settings/search-select";
import { SettingsCard, SettingsSection } from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { localeOptions, timeZoneOptions } from "@/lib/embed-options";
import type { ZodFields } from "@/lib/form-fields";
import { cn } from "@/lib/utils";

const TEMPLATE_VARIABLE_SET = new Set<string>(TEMPLATE_VARIABLES);
type TemplateField = "embedTitleTemplate" | "embedDescriptionTemplate";

export interface EmbedValues {
	embedEnabled: boolean;
	embedProviderName: string;
	embedThemeColor: string;
	embedTitleTemplate: string;
	embedDescriptionTemplate: string;
	embedLocale: string;
	timezone: string;
}

export function useEmbedFields(): ZodFields<EmbedValues> {
	const t = useTranslations("settings.embed");

	return useMemo(() => {
		const template = z.string().superRefine((value, ctx) => {
			for (const name of templatePlaceholders(value)) {
				if (!TEMPLATE_VARIABLE_SET.has(name)) {
					ctx.addIssue({ code: "custom", message: t("errors.templateVariable", { name }) });
				}
			}
		});

		return {
			embedEnabled: z.boolean(),
			embedProviderName: z.string().trim().min(1, t("errors.providerRequired")).max(64, t("errors.providerLong")),
			embedThemeColor: z.string().trim().regex(THEME_COLOR_PATTERN, t("errors.color")),
			embedTitleTemplate: template,
			embedDescriptionTemplate: template,
			embedLocale: z
				.string()
				.trim()
				.superRefine((locale, ctx) => {
					try {
						new Intl.Locale(locale.replaceAll("_", "-"));
					} catch {
						ctx.addIssue({ code: "custom", message: t("errors.locale") });
					}
				}),
			timezone: z
				.string()
				.trim()
				.superRefine((zone, ctx) => {
					try {
						new Intl.DateTimeFormat("en-US", { timeZone: zone });
					} catch {
						ctx.addIssue({ code: "custom", message: t("errors.timezone") });
					}
				}),
		};
	}, [t]);
}

function EnabledField() {
	const t = useTranslations("settings.embed");
	const form = useFormContext<EmbedValues>();

	return (
		<Controller
			control={form.control}
			name="embedEnabled"
			render={({ field }) => (
				<Field orientation="horizontal">
					<FieldContent>
						<FieldLabel htmlFor={field.name}>{t("fields.enabled")}</FieldLabel>
						<FieldDescription>{t("enabledHint")}</FieldDescription>
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
	);
}

export function EmbedCard({ baseUrl, previewFileId, username }: { baseUrl: string; previewFileId: string; username: string }) {
	const t = useTranslations("settings.embed");
	const locale = useLocale();
	const form = useFormContext<EmbedValues>();
	const [activeField, setActiveField] = useState<TemplateField>("embedTitleTemplate");

	const enabled = form.watch("embedEnabled");
	const providerName = form.watch("embedProviderName");
	const themeColor = form.watch("embedThemeColor");
	const titleTemplate = form.watch("embedTitleTemplate");
	const descriptionTemplate = form.watch("embedDescriptionTemplate");
	const embedLocale = form.watch("embedLocale");
	const timezone = form.watch("timezone");
	const localeChoices = useMemo(() => localeOptions(embedLocale, locale), [embedLocale, locale]);
	const timeZoneChoices = useMemo(() => timeZoneOptions(timezone), [timezone]);

	function insertVariable(name: string): void {
		const current = form.getValues(activeField);
		form.setValue(activeField, `${current}{${name}}`, { shouldDirty: true, shouldValidate: true });
	}

	function renderTemplate(name: TemplateField, label: string) {
		return (
			<Controller
				control={form.control}
				name={name}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
						<Input
							id={field.name}
							aria-invalid={fieldState.invalid}
							aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
							{...field}
							onFocus={() => setActiveField(name)}
						/>
						{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
					</Field>
				)}
			/>
		);
	}

	return (
		<SettingsCard title={t("title")} description={t("description")}>
			<EnabledField />
			<Separator />
			<div className="grid gap-8 lg:grid-cols-2">
				<SettingsSection title={t("configuration")} description={t("configurationHint")}>
					<Controller
						control={form.control}
						name="embedProviderName"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.provider")}</FieldLabel>
								<Input
									id={field.name}
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
						name="embedThemeColor"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.color")}</FieldLabel>
								<div className="flex items-center gap-2">
									<input
										type="color"
										value={field.value}
										onChange={(event) => field.onChange(event.target.value)}
										aria-label={t("fields.color")}
										className="h-9 w-12 shrink-0 cursor-pointer"
									/>
									<Input
										id={field.name}
										aria-invalid={fieldState.invalid}
										aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
										{...field}
									/>
								</div>
								{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
							</Field>
						)}
					/>
					{renderTemplate("embedTitleTemplate", t("fields.title"))}
					{renderTemplate("embedDescriptionTemplate", t("fields.descriptionTemplate"))}
					<div className="grid gap-2">
						<span className="text-muted-foreground text-sm">{t("variables")}</span>
						<div className="flex flex-wrap gap-1.5">
							{TEMPLATE_VARIABLES.map((name) => (
								<Badge
									key={name}
									variant="secondary"
									render={<button type="button" onClick={() => insertVariable(name)} />}
								>
									{`{${name}}`}
								</Badge>
							))}
						</div>
					</div>
					<div className="@container">
						<div className="grid @md:grid-cols-2 gap-5">
							<Controller
								control={form.control}
								name="embedLocale"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={field.name}>{t("fields.locale")}</FieldLabel>
										<SearchSelect
											id={field.name}
											value={field.value}
											onChange={field.onChange}
											options={localeChoices}
											placeholder={t("select.localePlaceholder")}
											searchPlaceholder={t("select.localeSearch")}
											emptyMessage={t("select.empty")}
											invalid={fieldState.invalid}
											describedBy={fieldState.invalid ? `${field.name}-error` : undefined}
										/>
										{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
									</Field>
								)}
							/>
							<Controller
								control={form.control}
								name="timezone"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={field.name}>{t("fields.timezone")}</FieldLabel>
										<SearchSelect
											id={field.name}
											value={field.value}
											onChange={field.onChange}
											options={timeZoneChoices}
											placeholder={t("select.timezonePlaceholder")}
											searchPlaceholder={t("select.timezoneSearch")}
											emptyMessage={t("select.empty")}
											invalid={fieldState.invalid}
											describedBy={fieldState.invalid ? `${field.name}-error` : undefined}
										/>
										{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
									</Field>
								)}
							/>
						</div>
					</div>
				</SettingsSection>

				<SettingsSection title={t("preview")} description={enabled ? t("previewHint") : t("disabledHint")}>
					<div className={cn("flex justify-center transition-opacity lg:justify-start", !enabled && "opacity-45")}>
						<EmbedPreview
							baseUrl={baseUrl}
							previewFileId={previewFileId}
							providerName={providerName}
							themeColor={THEME_COLOR_PATTERN.test(themeColor) ? themeColor : DEFAULT_EMBED_THEME_COLOR}
							title={titleTemplate}
							description={descriptionTemplate}
							embedLocale={embedLocale}
							timezone={timezone}
							username={username}
						/>
					</div>
				</SettingsSection>
			</div>
		</SettingsCard>
	);
}
