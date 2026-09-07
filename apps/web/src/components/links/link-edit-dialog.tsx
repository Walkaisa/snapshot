"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Link, linkTargetSchema } from "@snapshot/contracts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUpdateLink } from "@/hooks/use-links";
import { ApiError } from "@/lib/api/types";

interface EditValues {
	url: string;
}

export function LinkEditDialog({ link, onClose }: { link: Link | null; onClose: () => void }) {
	const t = useTranslations("links.edit");
	const update = useUpdateLink();

	const resolver = useMemo<Resolver<EditValues>>(() => {
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
		});

		return zodResolver(schema) as Resolver<EditValues>;
	}, [t]);

	const values = useMemo<EditValues>(() => ({ url: link?.targetUrl ?? "" }), [link]);
	const form = useForm<EditValues>({ resolver, values });

	async function onSubmit(input: EditValues): Promise<void> {
		if (link === null) {
			return;
		}

		try {
			await update.mutateAsync({ slug: link.slug, input: { url: input.url.trim() } });
			onClose();
			toast.success(t("saved"));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("errors.generic"));
		}
	}

	return (
		<Dialog
			open={link !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description", { slug: link?.slug ?? "" })}</DialogDescription>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
					<Controller
						control={form.control}
						name="url"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`edit-${field.name}`}>{t("fields.url")}</FieldLabel>
								<Input
									id={`edit-${field.name}`}
									type="url"
									inputMode="url"
									autoComplete="off"
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? `edit-${field.name}-error` : undefined}
									{...field}
								/>
								{fieldState.invalid ? <FieldError id={`edit-${field.name}-error`} errors={[fieldState.error]} /> : null}
							</Field>
						)}
					/>
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose} disabled={update.isPending}>
							{t("cancel")}
						</Button>
						<Button type="submit" disabled={update.isPending}>
							{update.isPending ? t("saving") : t("submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
