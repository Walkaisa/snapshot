"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LINK_SLUG_MAX_LENGTH, linkSlugSchema, linkTargetSchema } from "@snapshot/contracts";
import { LoaderCircle, Scissors } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SlugAvailability } from "@/components/ids/slug-availability";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { useCreateLink } from "@/hooks/use-links";
import { ApiError } from "@/lib/api/types";

interface CreateValues {
	url: string;
	slug: string;
}

const EMPTY: CreateValues = { url: "", slug: "" };

export function LinkCreateDialog({
	open,
	onOpenChange,
	baseUrl,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	baseUrl: string;
}) {
	const t = useTranslations("links.create");
	const originLabel = `${baseUrl.replace(/^https?:\/\//, "")}/`;
	const create = useCreateLink();

	const resolver = useMemo<Resolver<CreateValues>>(() => {
		const schema = z.object({
			url: z
				.string()
				.trim()
				.min(1, t("errors.urlRequired"))
				.superRefine((value, ctx) => {
					if (!linkTargetSchema.safeParse(value).success) {
						ctx.addIssue({ code: "custom", message: t("errors.url") });
					}
				}),
			slug: z
				.string()
				.trim()
				.superRefine((value, ctx) => {
					if (value.length > 0 && !linkSlugSchema.safeParse(value).success) {
						ctx.addIssue({ code: "custom", message: t("errors.slug") });
					}
				}),
		});

		return zodResolver(schema) as Resolver<CreateValues>;
	}, [t]);

	const form = useForm<CreateValues>({ resolver, defaultValues: EMPTY });
	const slug = form.watch("slug").trim();

	useEffect(() => {
		if (!open) {
			form.reset(EMPTY);
		}
	}, [open, form]);

	async function onSubmit(values: CreateValues): Promise<void> {
		try {
			const link = await create.mutateAsync({
				url: values.url.trim(),
				...(values.slug.trim().length > 0 ? { slug: values.slug.trim() } : {}),
			});
			form.reset(EMPTY);
			onOpenChange(false);
			toast.success(t("created", { slug: link.slug }));
		} catch (error) {
			if (error instanceof ApiError && error.errorCode === "slug_unavailable") {
				form.setError("slug", { message: t("errors.slugTaken") });
				return;
			}

			toast.error(error instanceof ApiError ? error.message : t("errors.generic"));
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && create.isPending) {
					return;
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
					<Controller
						control={form.control}
						name="url"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.url")}</FieldLabel>
								<Input
									id={field.name}
									type="url"
									inputMode="url"
									autoComplete="off"
									placeholder={t("fields.urlPlaceholder")}
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
						name="slug"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>{t("fields.slug")}</FieldLabel>
								<InputGroup>
									<InputGroupAddon>
										<InputGroupText>{originLabel}</InputGroupText>
									</InputGroupAddon>
									<InputGroupInput
										id={field.name}
										autoComplete="off"
										spellCheck={false}
										maxLength={LINK_SLUG_MAX_LENGTH}
										placeholder={t("fields.slugPlaceholder")}
										aria-invalid={fieldState.invalid}
										aria-describedby={fieldState.invalid ? `${field.name}-error` : `${field.name}-hint`}
										{...field}
									/>
									<InputGroupAddon align="inline-end">
										<SlugAvailability slug={slug} isUsable={(value) => linkSlugSchema.safeParse(value).success} />
									</InputGroupAddon>
								</InputGroup>
								{fieldState.invalid ? (
									<FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
								) : (
									<FieldDescription id={`${field.name}-hint`}>{t("fields.slugHint")}</FieldDescription>
								)}
							</Field>
						)}
					/>
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
							{t("cancel")}
						</Button>
						<Button type="submit" disabled={create.isPending}>
							{create.isPending ? <LoaderCircle className="animate-spin" /> : <Scissors />}
							{create.isPending ? t("submitting") : t("submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
