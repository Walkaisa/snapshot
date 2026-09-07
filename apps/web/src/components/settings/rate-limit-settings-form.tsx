"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ConfigUpdate, ConfigView } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { RateLimitCard, type RateLimitValues, useRateLimitFields } from "@/components/settings/rate-limit-card";
import { SaveBar } from "@/components/settings/save-bar";
import { SettingsCardSkeleton } from "@/components/settings/settings-card";
import { useUpdateConfig } from "@/hooks/use-config";
import { useConfigView } from "@/hooks/use-dashboard";
import { ApiError } from "@/lib/api/types";

function toValues(config: ConfigView): RateLimitValues {
	return {
		rateLimitEnabled: config.rateLimitEnabled,
		rateLimitRequests: config.rateLimitRequests,
		rateLimitWindowSeconds: config.rateLimitWindowSeconds,
	};
}

function RateLimitSettingsForm({ config }: { config: ConfigView }) {
	const t = useTranslations("settings.rateLimit");
	const update = useUpdateConfig();
	const fields = useRateLimitFields();

	const resolver = useMemo<Resolver<RateLimitValues>>(() => zodResolver(z.object(fields)) as Resolver<RateLimitValues>, [fields]);

	const values = useMemo(() => toValues(config), [config]);
	const form = useForm<RateLimitValues>({ resolver, values });

	async function onSubmit(input: RateLimitValues): Promise<void> {
		try {
			await update.mutateAsync(input satisfies ConfigUpdate);
			toast.success(t("saved"));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("saveError"));
		}
	}

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6" noValidate>
				<RateLimitCard />
				<SaveBar dirty={form.formState.isDirty} saving={update.isPending} onReset={() => form.reset()} />
			</form>
		</FormProvider>
	);
}

export function RateLimitSettings() {
	const { data, isPending, isError, refetch } = useConfigView();

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={3} />;
	}

	return <RateLimitSettingsForm config={data} />;
}
