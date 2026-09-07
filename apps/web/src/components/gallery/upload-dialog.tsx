"use client";

import { humanReadableSize, mediaKind, UPLOAD_ID_MAX_LENGTH, uploadIdSchema } from "@snapshot/contracts";
import { CloudUpload, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type DragEvent, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { SlugAvailability } from "@/components/ids/slug-availability";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { useConfigView } from "@/hooks/use-dashboard";
import { useUploadFile } from "@/hooks/use-gallery";
import { ApiError } from "@/lib/api/types";
import { breachFor, fileExtension, uploadRules } from "@/lib/upload-rules";
import { cn } from "@/lib/utils";

const PERCENT = 100;

function usePreviewUrl(file: File | null): string | null {
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		if (file === null || typeof URL.createObjectURL !== "function") {
			setUrl(null);
			return;
		}

		const objectUrl = URL.createObjectURL(file);
		setUrl(objectUrl);

		return () => {
			URL.revokeObjectURL(objectUrl);
			setUrl(null);
		};
	}, [file]);

	return url;
}

function FilePreview({ file, url }: { file: File; url: string | null }) {
	const kind = mediaKind(file.type);

	if (url === null) {
		return null;
	}

	if (kind === "video") {
		return <video src={url} muted playsInline preload="metadata" tabIndex={-1} className="size-full object-cover" />;
	}

	// biome-ignore lint/performance/noImgElement: a local object URL for the file the operator just picked — next/image cannot read it
	return <img src={url} alt="" className="size-full object-cover" />;
}

export function UploadDialog({ open, onOpenChange, baseUrl }: { open: boolean; onOpenChange: (open: boolean) => void; baseUrl: string }) {
	const t = useTranslations("gallery.upload");
	const fileInputId = useId();
	const slugInputId = useId();
	const originLabel = `${baseUrl.replace(/^https?:\/\//, "")}/`;

	const { data: config } = useConfigView();
	const upload = useUploadFile();

	const [file, setFile] = useState<File | null>(null);
	const [slug, setSlug] = useState("");
	const [slugError, setSlugError] = useState<string | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);
	const [progress, setProgress] = useState(0);

	const previewUrl = usePreviewUrl(file);
	const rules = useMemo(() => (config === undefined ? null : uploadRules(config)), [config]);
	const trimmedSlug = slug.trim();

	function reset(): void {
		setFile(null);
		setSlug("");
		setSlugError(null);
		setFileError(null);
		setDragging(false);
		setProgress(0);
	}

	function close(): void {
		reset();
		onOpenChange(false);
	}

	function accept(candidate: File | undefined): void {
		if (candidate === undefined || rules === null) {
			return;
		}

		const breach = breachFor(candidate, rules);

		if (breach !== null) {
			setFile(null);
			setFileError(
				breach === "size" ? t("errors.size", { limit: humanReadableSize(rules.maxFileSizeBytes) }) : t(`errors.${breach}`),
			);
			return;
		}

		setFileError(null);
		setFile(candidate);
	}

	function onDrop(event: DragEvent<HTMLLabelElement>): void {
		event.preventDefault();
		setDragging(false);
		accept(event.dataTransfer.files[0]);
	}

	async function onSubmit(): Promise<void> {
		if (file === null) {
			setFileError(t("errors.required"));
			return;
		}

		if (trimmedSlug.length > 0 && !uploadIdSchema.safeParse(trimmedSlug).success) {
			setSlugError(t("errors.slug"));
			return;
		}

		setSlugError(null);
		setProgress(0);

		try {
			const created = await upload.mutateAsync({
				input: { file, slug: trimmedSlug.length > 0 ? trimmedSlug : null },
				options: { onProgress: setProgress },
			});
			close();
			toast.success(t("uploaded", { id: created.id }));
		} catch (error) {
			if (error instanceof ApiError && error.errorCode === "slug_unavailable") {
				setSlugError(t("errors.slugTaken"));
				return;
			}

			toast.error(error instanceof ApiError ? error.message : t("errors.generic"));
		}
	}

	const pending = upload.isPending;
	const percent = Math.round(progress * PERCENT);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && pending) {
					return;
				}
				if (!next) {
					reset();
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void onSubmit();
					}}
					className="grid gap-5"
					noValidate
				>
					<Field data-invalid={fileError !== null}>
						<label
							htmlFor={fileInputId}
							onDragOver={(event) => {
								event.preventDefault();
								setDragging(true);
							}}
							onDragLeave={() => setDragging(false)}
							onDrop={onDrop}
							className={cn(
								"flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-4 text-center transition-colors",
								"has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50",
								dragging ? "border-primary bg-primary/5" : "hover:bg-muted/40",
								fileError !== null && "border-destructive",
							)}
						>
							<input
								id={fileInputId}
								type="file"
								aria-label={t("dropzone.title")}
								accept={rules?.accept}
								disabled={pending}
								className="sr-only"
								onChange={(event) => accept(event.target.files?.[0])}
							/>
							{file === null ? (
								<>
									<span className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
										<CloudUpload className="size-5" />
									</span>
									<span className="flex flex-col gap-1">
										<span className="font-medium text-sm">{t("dropzone.title")}</span>
										<span className="text-muted-foreground text-xs">
											{rules === null
												? t("dropzone.loading")
												: t("dropzone.hint", {
														types: rules.extensions.map((extension) => extension.slice(1)).join(" · "),
														limit: humanReadableSize(rules.maxFileSizeBytes),
													})}
										</span>
									</span>
								</>
							) : (
								<span className="flex w-full items-center gap-3 text-left">
									<span className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
										<FilePreview file={file} url={previewUrl} />
									</span>
									<span className="flex min-w-0 flex-1 flex-col gap-0.5">
										<span className="truncate font-medium text-sm">{file.name}</span>
										<span className="text-muted-foreground text-xs">
											{humanReadableSize(file.size)} · {fileExtension(file.name).slice(1).toUpperCase()}
										</span>
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										disabled={pending}
										aria-label={t("clear")}
										onClick={(event) => {
											event.preventDefault();
											setFile(null);
										}}
									>
										<X />
									</Button>
								</span>
							)}
						</label>
						{fileError !== null ? <FieldError errors={[{ message: fileError }]} /> : null}
					</Field>

					<Field data-invalid={slugError !== null}>
						<FieldLabel htmlFor={slugInputId}>{t("fields.slug")}</FieldLabel>
						<InputGroup>
							<InputGroupAddon>
								<InputGroupText>{originLabel}</InputGroupText>
							</InputGroupAddon>
							<InputGroupInput
								id={slugInputId}
								value={slug}
								onChange={(event) => {
									setSlug(event.target.value);
									setSlugError(null);
								}}
								autoComplete="off"
								spellCheck={false}
								disabled={pending}
								maxLength={UPLOAD_ID_MAX_LENGTH}
								placeholder={t("fields.slugPlaceholder")}
								aria-invalid={slugError !== null}
								aria-describedby={slugError !== null ? `${slugInputId}-error` : `${slugInputId}-hint`}
							/>
							<InputGroupAddon align="inline-end">
								<SlugAvailability slug={trimmedSlug} isUsable={(value) => uploadIdSchema.safeParse(value).success} />
							</InputGroupAddon>
						</InputGroup>
						{slugError !== null ? (
							<FieldError id={`${slugInputId}-error`} errors={[{ message: slugError }]} />
						) : (
							<FieldDescription id={`${slugInputId}-hint`}>{t("fields.slugHint")}</FieldDescription>
						)}
					</Field>

					{pending ? (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-muted-foreground text-xs">
								<span>{t("uploading")}</span>
								<span className="tabular-nums">{percent}%</span>
							</div>
							<div
								role="progressbar"
								aria-label={t("uploading")}
								aria-valuenow={percent}
								aria-valuemin={0}
								aria-valuemax={PERCENT}
								className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
							>
								<div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
							</div>
						</div>
					) : null}

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={close} disabled={pending}>
							{t("cancel")}
						</Button>
						<Button type="submit" disabled={pending || file === null}>
							{pending ? <LoaderCircle className="animate-spin" /> : <CloudUpload />}
							{pending ? t("submitting") : t("submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
