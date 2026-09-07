"use client";

import { EXTENSION_PATTERN, MIME_TYPE_PATTERN, normalizeExtension } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";

import { ChipEditor } from "@/components/settings/chip-editor";
import { SettingsCard } from "@/components/settings/settings-card";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { ZodFields } from "@/lib/form-fields";

export interface UploadRulesValues {
	maxFileSizeMb: number;
	restrictStorage: boolean;
	maxStorageGb: number;
	restrictExtensions: boolean;
	extensions: string[];
	restrictMimeTypes: boolean;
	mimeTypes: string[];
}

export interface UploadRulesSchema {
	fields: ZodFields<UploadRulesValues>;
	refine: (values: UploadRulesValues, ctx: z.RefinementCtx) => void;
}

export function useUploadRulesSchema(): UploadRulesSchema {
	const t = useTranslations("settings.uploads");

	return useMemo(
		() => ({
			fields: {
				maxFileSizeMb: z.coerce.number().positive(t("errors.sizeMin")),
				restrictStorage: z.boolean(),
				maxStorageGb: z.coerce.number().positive(t("errors.storageMin")),
				restrictExtensions: z.boolean(),
				extensions: z.array(z.string()),
				restrictMimeTypes: z.boolean(),
				mimeTypes: z.array(z.string()),
			},
			refine: (values, ctx) => {
				if (values.restrictExtensions && values.extensions.length === 0) {
					ctx.addIssue({ code: "custom", path: ["extensions"], message: t("errors.needExtension") });
				}
				if (values.restrictMimeTypes && values.mimeTypes.length === 0) {
					ctx.addIssue({ code: "custom", path: ["mimeTypes"], message: t("errors.needMime") });
				}
			},
		}),
		[t],
	);
}

export function UploadRulesCards() {
	const t = useTranslations("settings.uploads");
	const form = useFormContext<UploadRulesValues>();

	const restrictStorage = form.watch("restrictStorage");
	const restrictExtensions = form.watch("restrictExtensions");
	const restrictMimeTypes = form.watch("restrictMimeTypes");

	function renderRestriction(name: "restrictStorage" | "restrictExtensions" | "restrictMimeTypes", hint: string) {
		return (
			<Controller
				control={form.control}
				name={name}
				render={({ field }) => (
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel htmlFor={field.name}>{t(`fields.${name}`)}</FieldLabel>
							<FieldDescription>{hint}</FieldDescription>
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

	return (
		<>
			<SettingsCard title={t("limits.title")} description={t("limits.description")}>
				<div className="grid gap-5 sm:grid-cols-2">
					<Controller
						control={form.control}
						name="maxFileSizeMb"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.maxSize")}</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id={field.name}
										type="number"
										min={1}
										step="any"
										aria-invalid={fieldState.invalid}
										aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
										{...field}
									/>
									<InputGroupAddon align="inline-end">
										<InputGroupText>MB</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
								<FieldDescription>{t("fields.maxSizeHint")}</FieldDescription>
								{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
							</Field>
						)}
					/>
					<Controller
						control={form.control}
						name="maxStorageGb"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid} data-disabled={!restrictStorage}>
								<FieldLabel htmlFor={field.name}>{t("fields.maxStorage")}</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id={field.name}
										type="number"
										min={1}
										step="any"
										disabled={!restrictStorage}
										aria-invalid={fieldState.invalid}
										aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
										{...field}
									/>
									<InputGroupAddon align="inline-end">
										<InputGroupText>GB</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
								<FieldDescription>{t("fields.maxStorageHint")}</FieldDescription>
								{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
							</Field>
						)}
					/>
				</div>
				<Separator />
				{renderRestriction("restrictStorage", t("fields.restrictStorageHint"))}
			</SettingsCard>

			<SettingsCard title={t("types.title")} description={t("types.description")}>
				{renderRestriction("restrictExtensions", t("fields.restrictHint"))}
				<Controller
					control={form.control}
					name="extensions"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid} data-disabled={!restrictExtensions}>
							<FieldLabel htmlFor={field.name}>{t("fields.extensions")}</FieldLabel>
							<ChipEditor
								id={field.name}
								value={field.value}
								onChange={field.onChange}
								normalize={normalizeExtension}
								validate={(item) => EXTENSION_PATTERN.test(item)}
								placeholder={t("fields.extensionPlaceholder")}
								emptyLabel={t("fields.extensionsEmpty")}
								disabled={!restrictExtensions}
								invalid={fieldState.invalid}
								describedBy={fieldState.invalid ? `${field.name}-error` : undefined}
							/>
							{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
						</Field>
					)}
				/>
				<Separator />
				{renderRestriction("restrictMimeTypes", t("fields.restrictMimeHint"))}
				<Controller
					control={form.control}
					name="mimeTypes"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid} data-disabled={!restrictMimeTypes}>
							<FieldLabel htmlFor={field.name}>{t("fields.mimeTypes")}</FieldLabel>
							<ChipEditor
								id={field.name}
								value={field.value}
								onChange={field.onChange}
								normalize={(item) => item.trim().toLowerCase()}
								validate={(item) => MIME_TYPE_PATTERN.test(item)}
								placeholder={t("fields.mimePlaceholder")}
								emptyLabel={t("fields.mimeEmpty")}
								disabled={!restrictMimeTypes}
								invalid={fieldState.invalid}
								describedBy={fieldState.invalid ? `${field.name}-error` : undefined}
							/>
							{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
						</Field>
					)}
				/>
			</SettingsCard>
		</>
	);
}
