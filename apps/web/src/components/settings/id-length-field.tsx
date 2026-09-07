"use client";

import { ID_LENGTH_BOUNDS, type IdKind, type IdMinimums } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";

import { IdCapacity } from "@/components/settings/id-capacity";
import type { IdGenerationValues } from "@/components/settings/id-generation-card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function IdLengthField({ kind, alphabet, minimums }: { kind: IdKind; alphabet: string; minimums: IdMinimums }) {
	const t = useTranslations("settings.ids");
	const form = useFormContext<IdGenerationValues>();
	const bounds = ID_LENGTH_BOUNDS[kind];
	const length = clamp(Number(form.watch("idLength")) || bounds.min, bounds.min, bounds.max);

	return (
		<div className="grid gap-5">
			<Controller
				control={form.control}
				name="idLength"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<div className="flex items-center justify-between gap-4">
							<FieldLabel htmlFor={field.name}>{t(`kinds.${kind}.lengthLabel`)}</FieldLabel>
							<InputGroup className="w-32">
								<InputGroupInput
									id={field.name}
									type="number"
									min={bounds.min}
									max={bounds.max}
									className="tabular-nums"
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? `${field.name}-error` : `${field.name}-hint`}
									{...field}
								/>
								<InputGroupAddon align="inline-end">
									<InputGroupText>{t("units.chars")}</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
						</div>
						<Slider
							value={length}
							onValueChange={(next) => field.onChange(next)}
							onBlur={field.onBlur}
							min={bounds.min}
							max={bounds.max}
							aria-label={t("length.slider")}
						/>
						<div className="flex items-center justify-between text-muted-foreground text-xs tabular-nums">
							<span>{bounds.min}</span>
							<span>{bounds.max}</span>
						</div>
						<FieldDescription id={`${field.name}-hint`}>{t(`kinds.${kind}.lengthHint`)}</FieldDescription>
						{fieldState.invalid ? <FieldError id={`${field.name}-error`} errors={[fieldState.error]} /> : null}
					</Field>
				)}
			/>
			<IdCapacity alphabet={alphabet} length={length} minimums={minimums} />
		</div>
	);
}
