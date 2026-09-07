"use client";

import { ID_CHARSET_KEYS, ID_CHARSETS, type IdAlphabet, type IdCharset, resolveIdAlphabet } from "@snapshot/contracts";
import { useTranslations } from "next-intl";

import { SettingsSection } from "@/components/settings/settings-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

export type IdAlphabetMode = IdAlphabet["mode"];

export interface IdAlphabetValue {
	mode: IdAlphabetMode;
	charsets: IdCharset[];
	characters: string;
}

export function toIdAlphabetValue(alphabet: IdAlphabet): IdAlphabetValue {
	return {
		mode: alphabet.mode,
		charsets: alphabet.mode === "charsets" ? [...alphabet.charsets] : [],
		characters: alphabet.mode === "custom" ? alphabet.characters : "",
	};
}

export function fromIdAlphabetValue(value: IdAlphabetValue): IdAlphabet {
	return value.mode === "custom" ? { mode: "custom", characters: value.characters } : { mode: "charsets", charsets: value.charsets };
}

export function resolveValueAlphabet(value: IdAlphabetValue): string {
	return resolveIdAlphabet(fromIdAlphabetValue(value));
}

const MODES: IdAlphabetMode[] = ["charsets", "custom"];

export function IdAlphabetField({
	id,
	value,
	onChange,
	onBlur,
	invalid = false,
	describedBy,
}: {
	id: string;
	value: IdAlphabetValue;
	onChange: (value: IdAlphabetValue) => void;
	onBlur?: () => void;
	invalid?: boolean;
	describedBy?: string;
}) {
	const t = useTranslations("settings.ids.alphabet");

	function toggleCharset(charset: IdCharset, checked: boolean): void {
		const next = checked ? [...value.charsets, charset] : value.charsets.filter((entry) => entry !== charset);

		onChange({ ...value, charsets: ID_CHARSET_KEYS.filter((key) => next.includes(key)) });
	}

	return (
		<div className="grid gap-5">
			<SettingsSection title={t("mode.title")} description={t("mode.description")}>
				<RadioGroup
					aria-label={t("mode.title")}
					value={value.mode}
					onValueChange={(mode) => onChange({ ...value, mode: mode as IdAlphabetMode })}
					className="sm:grid-cols-2"
				>
					{MODES.map((mode) => (
						<FieldLabel key={mode} htmlFor={`${id}-mode-${mode}`}>
							<Field orientation="horizontal">
								<FieldContent>
									<FieldTitle>{t(`mode.${mode}.title`)}</FieldTitle>
									<FieldDescription>{t(`mode.${mode}.description`)}</FieldDescription>
								</FieldContent>
								<RadioGroupItem id={`${id}-mode-${mode}`} value={mode} />
							</Field>
						</FieldLabel>
					))}
				</RadioGroup>
			</SettingsSection>

			<Separator />

			{value.mode === "charsets" ? (
				<SettingsSection title={t("charsets.title")} description={t("charsets.description")}>
					<div data-slot="checkbox-group" className="grid gap-3 sm:grid-cols-2">
						{ID_CHARSET_KEYS.map((charset) => (
							<FieldLabel key={charset} htmlFor={`${id}-${charset}`}>
								<Field orientation="horizontal">
									<FieldContent>
										<FieldTitle>{t(`charsets.${charset}`)}</FieldTitle>
										<FieldDescription>
											<span className="font-mono">{ID_CHARSETS[charset]}</span>
										</FieldDescription>
									</FieldContent>
									<Checkbox
										id={`${id}-${charset}`}
										checked={value.charsets.includes(charset)}
										onCheckedChange={(checked) => toggleCharset(charset, checked)}
										onBlur={onBlur}
										aria-invalid={invalid}
										aria-describedby={describedBy}
									/>
								</Field>
							</FieldLabel>
						))}
					</div>
				</SettingsSection>
			) : (
				<SettingsSection title={t("custom.title")} description={t("custom.description")}>
					<Field data-invalid={invalid}>
						<div className="font-mono">
							<Input
								id={`${id}-characters`}
								value={value.characters}
								onChange={(event) => onChange({ ...value, characters: event.target.value.trim() })}
								onBlur={onBlur}
								placeholder={t("custom.placeholder")}
								autoComplete="off"
								spellCheck={false}
								aria-label={t("custom.label")}
								aria-invalid={invalid}
								aria-describedby={describedBy}
							/>
						</div>
					</Field>
				</SettingsSection>
			)}
		</div>
	);
}
