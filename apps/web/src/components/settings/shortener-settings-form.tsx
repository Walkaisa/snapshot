"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ConfigUpdate, ConfigView } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { fromIdAlphabetValue, toIdAlphabetValue } from "@/components/settings/id-alphabet-field";
import { IdGenerationCard, type IdGenerationValues, useIdGenerationSchema } from "@/components/settings/id-generation-card";
import { SaveBar } from "@/components/settings/save-bar";
import { SettingsCardSkeleton } from "@/components/settings/settings-card";
import { useUpdateConfig } from "@/hooks/use-config";
import { useConfigView } from "@/hooks/use-dashboard";
import { ApiError } from "@/lib/api/types";

function toValues(config: ConfigView): IdGenerationValues {
	return {
		alphabet: toIdAlphabetValue(config.linkIdAlphabet),
		minDigits: config.linkIdMinDigits,
		minSymbols: config.linkIdMinSymbols,
		idLength: config.linkIdLength,
	};
}

function toUpdate(values: IdGenerationValues): ConfigUpdate {
	return {
		linkIdAlphabet: fromIdAlphabetValue(values.alphabet),
		linkIdMinDigits: values.minDigits,
		linkIdMinSymbols: values.minSymbols,
		linkIdLength: values.idLength,
	};
}

function ShortenerSettingsForm({ config }: { config: ConfigView }) {
	const t = useTranslations("settings.shortener");
	const update = useUpdateConfig();
	const ids = useIdGenerationSchema("link");

	const resolver = useMemo<Resolver<IdGenerationValues>>(() => {
		const schema = z.object(ids.fields).superRefine((values, ctx) => ids.refine(values, ctx));

		return zodResolver(schema) as Resolver<IdGenerationValues>;
	}, [ids]);

	const values = useMemo(() => toValues(config), [config]);
	const form = useForm<IdGenerationValues>({ resolver, values });

	async function onSubmit(input: IdGenerationValues): Promise<void> {
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
				<IdGenerationCard kind="link" />
				<SaveBar dirty={form.formState.isDirty} saving={update.isPending} onReset={() => form.reset()} />
			</form>
		</FormProvider>
	);
}

export function ShortenerSettings() {
	const { data, isPending, isError, refetch } = useConfigView();

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={5} />;
	}

	return <ShortenerSettingsForm config={data} />;
}
