"use client";

import {
	countIdCharacterClasses,
	effectiveIdMinimums,
	ID_LENGTH_BOUNDS,
	ID_MIN_OCCURRENCE_MAX,
	type IdKind,
	idAlphabetSchema,
} from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";

import { fromIdAlphabetValue, IdAlphabetField, type IdAlphabetValue, resolveValueAlphabet } from "@/components/settings/id-alphabet-field";
import { IdLengthField } from "@/components/settings/id-length-field";
import { SettingsCard, SettingsSection } from "@/components/settings/settings-card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import type { ZodFields } from "@/lib/form-fields";

export interface IdGenerationValues {
	alphabet: IdAlphabetValue;
	minDigits: number;
	minSymbols: number;
	idLength: number;
}

export interface IdGenerationSchema {
	fields: ZodFields<IdGenerationValues>;
	refine: (values: IdGenerationValues, ctx: z.RefinementCtx) => void;
}

export function useIdGenerationSchema(kind: IdKind): IdGenerationSchema {
	const t = useTranslations("settings.ids");

	return useMemo(() => {
		const bounds = ID_LENGTH_BOUNDS[kind];
		const occurrence = z.coerce.number().int().min(0, t("errors.minRange")).max(ID_MIN_OCCURRENCE_MAX, t("errors.minRange"));

		return {
			fields: {
				alphabet: z.custom<IdAlphabetValue>().superRefine((value, ctx) => {
					if (!idAlphabetSchema.safeParse(fromIdAlphabetValue(value)).success) {
						ctx.addIssue({ code: "custom", message: t("errors.alphabet") });
					}
				}),
				minDigits: occurrence,
				minSymbols: occurrence,
				idLength: z.coerce
					.number()
					.int()
					.min(bounds.min, t(`kinds.${kind}.range`))
					.max(bounds.max, t(`kinds.${kind}.range`)),
			},
			refine: (values, ctx) => {
				const alphabet = resolveValueAlphabet(values.alphabet);
				const required = effectiveIdMinimums(alphabet, { digits: values.minDigits, symbols: values.minSymbols });
				const total = required.digits + required.symbols;

				if (total > values.idLength) {
					ctx.addIssue({ code: "custom", path: ["idLength"], message: t("errors.tooShort", { count: total }) });
				}
			},
		};
	}, [t, kind]);
}

export function IdGenerationCard({ kind }: { kind: IdKind }) {
	const t = useTranslations("settings.ids");
	const form = useFormContext<IdGenerationValues>();

	const alphabetValue = form.watch("alphabet");
	const minDigits = Number(form.watch("minDigits")) || 0;
	const minSymbols = Number(form.watch("minSymbols")) || 0;

	const alphabet = useMemo(() => resolveValueAlphabet(alphabetValue), [alphabetValue]);
	const classes = useMemo(() => countIdCharacterClasses(alphabet), [alphabet]);
	const minimums = useMemo(() => ({ digits: minDigits, symbols: minSymbols }), [minDigits, minSymbols]);

	function renderMinimum(name: "minDigits" | "minSymbols", available: boolean) {
		return (
			<Controller
				control={form.control}
				name={name}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid} data-disabled={!available}>
						<FieldLabel htmlFor={field.name}>{t(`minimums.${name}.label`)}</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id={field.name}
								type="number"
								min={0}
								max={ID_MIN_OCCURRENCE_MAX}
								disabled={!available}
								aria-invalid={fieldState.invalid}
								aria-describedby={fieldState.invalid ? `${field.name}-error` : `${field.name}-hint`}
								{...field}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>{t("units.times")}</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
						<FieldDescription id={`${field.name}-hint`}>
							{available ? t(`minimums.${name}.hint`) : t(`minimums.${name}.unavailable`)}
						</FieldDescription>
						{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
					</Field>
				)}
			/>
		);
	}

	return (
		<SettingsCard title={t(`kinds.${kind}.title`)} description={t(`kinds.${kind}.description`)}>
			<Controller
				control={form.control}
				name="alphabet"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<IdAlphabetField
							id={`${kind}-alphabet`}
							value={field.value}
							onChange={field.onChange}
							onBlur={field.onBlur}
							invalid={fieldState.invalid}
							describedBy={fieldState.invalid ? `${kind}-alphabet-error` : undefined}
						/>
						{fieldState.invalid ? <FieldError id={`${kind}-alphabet-error`} errors={[fieldState.error]} /> : null}
					</Field>
				)}
			/>

			<Separator />

			<SettingsSection title={t("minimums.title")} description={t("minimums.description")}>
				<div className="grid gap-5 sm:grid-cols-2">
					{renderMinimum("minDigits", classes.digits > 0)}
					{renderMinimum("minSymbols", classes.symbols > 0)}
				</div>
			</SettingsSection>

			<Separator />

			<SettingsSection title={t("length.title")} description={t("length.description")}>
				<IdLengthField kind={kind} alphabet={alphabet} minimums={minimums} />
			</SettingsSection>
		</SettingsCard>
	);
}
