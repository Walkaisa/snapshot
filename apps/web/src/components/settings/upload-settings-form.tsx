"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ConfigUpdate, ConfigView } from "@snapshot/contracts";
import { parseCsv } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { EmbedCard, type EmbedValues, useEmbedFields } from "@/components/settings/embed-card";
import { fromIdAlphabetValue, toIdAlphabetValue } from "@/components/settings/id-alphabet-field";
import { IdGenerationCard, type IdGenerationValues, useIdGenerationSchema } from "@/components/settings/id-generation-card";
import { SaveBar } from "@/components/settings/save-bar";
import { SettingsCardSkeleton } from "@/components/settings/settings-card";
import { UploadRulesCards, type UploadRulesValues, useUploadRulesSchema } from "@/components/settings/upload-rules-cards";
import { useUpdateConfig } from "@/hooks/use-config";
import { useConfigView } from "@/hooks/use-dashboard";
import { ApiError } from "@/lib/api/types";

const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = BYTES_PER_MB * 1024;
const DEFAULT_STORAGE_GB = 50;

function roundToTwo(value: number): number {
	return Math.round(value * 100) / 100;
}

type UploadSettingsValues = UploadRulesValues & IdGenerationValues & EmbedValues;

function toValues(config: ConfigView): UploadSettingsValues {
	return {
		maxFileSizeMb: roundToTwo(config.maxFileSizeBytes / BYTES_PER_MB),
		restrictStorage: config.maxTotalStorageBytes !== null,
		maxStorageGb: config.maxTotalStorageBytes === null ? DEFAULT_STORAGE_GB : roundToTwo(config.maxTotalStorageBytes / BYTES_PER_GB),
		restrictExtensions: config.allowedExtensions !== null,
		extensions: parseCsv(config.allowedExtensions ?? ""),
		restrictMimeTypes: config.allowedMimeTypes !== null,
		mimeTypes: parseCsv(config.allowedMimeTypes ?? ""),
		alphabet: toIdAlphabetValue(config.uploadIdAlphabet),
		minDigits: config.uploadIdMinDigits,
		minSymbols: config.uploadIdMinSymbols,
		idLength: config.uploadIdLength,
		embedEnabled: config.embedEnabled,
		embedProviderName: config.embedProviderName,
		embedThemeColor: config.embedThemeColor,
		embedTitleTemplate: config.embedTitleTemplate,
		embedDescriptionTemplate: config.embedDescriptionTemplate,
		embedLocale: config.embedLocale.replaceAll("-", "_"),
		timezone: config.timezone,
	};
}

function toUpdate(values: UploadSettingsValues): ConfigUpdate {
	return {
		maxFileSizeBytes: Math.round(values.maxFileSizeMb * BYTES_PER_MB),
		maxTotalStorageBytes: values.restrictStorage ? Math.round(values.maxStorageGb * BYTES_PER_GB) : null,
		allowedExtensions: values.restrictExtensions ? values.extensions.join(",") : null,
		allowedMimeTypes: values.restrictMimeTypes ? values.mimeTypes.join(",") : null,
		uploadIdAlphabet: fromIdAlphabetValue(values.alphabet),
		uploadIdMinDigits: values.minDigits,
		uploadIdMinSymbols: values.minSymbols,
		uploadIdLength: values.idLength,
		embedEnabled: values.embedEnabled,
		embedProviderName: values.embedProviderName,
		embedThemeColor: values.embedThemeColor,
		embedTitleTemplate: values.embedTitleTemplate,
		embedDescriptionTemplate: values.embedDescriptionTemplate,
		embedLocale: values.embedLocale,
		timezone: values.timezone,
	};
}

function UploadSettingsForm({
	baseUrl,
	config,
	previewFileId,
	username,
}: {
	baseUrl: string;
	config: ConfigView;
	previewFileId: string;
	username: string;
}) {
	const t = useTranslations("settings.uploads");
	const update = useUpdateConfig();

	const rules = useUploadRulesSchema();
	const ids = useIdGenerationSchema("upload");
	const embedFields = useEmbedFields();

	const resolver = useMemo<Resolver<UploadSettingsValues>>(() => {
		const schema = z.object({ ...rules.fields, ...ids.fields, ...embedFields }).superRefine((values, ctx) => {
			rules.refine(values, ctx);
			ids.refine(values, ctx);
		});

		return zodResolver(schema) as Resolver<UploadSettingsValues>;
	}, [rules, ids, embedFields]);

	const values = useMemo(() => toValues(config), [config]);
	const form = useForm<UploadSettingsValues>({ resolver, values });

	async function onSubmit(input: UploadSettingsValues): Promise<void> {
		try {
			await update.mutateAsync(toUpdate(input));
			toast.success(t("saved"));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("saveError"));
		}
	}

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6" noValidate>
				<EmbedCard baseUrl={baseUrl} previewFileId={previewFileId} username={username} />
				<UploadRulesCards />
				<IdGenerationCard kind="upload" />
				<SaveBar dirty={form.formState.isDirty} saving={update.isPending} onReset={() => form.reset()} />
			</form>
		</FormProvider>
	);
}

export function UploadSettings({ baseUrl, previewFileId, username }: { baseUrl: string; previewFileId: string; username: string }) {
	const { data, isPending, isError, refetch } = useConfigView();

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={6} />;
	}

	return <UploadSettingsForm baseUrl={baseUrl} config={data} previewFileId={previewFileId} username={username} />;
}
