"use client";

import { TOTP_LABEL_MAX_LENGTH } from "@snapshot/contracts";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { CODE_LENGTH, CodeInput } from "@/components/auth/code-input";
import { UsernameHint } from "@/components/auth/username-hint";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { MfaSecret } from "@/components/settings/mfa-secret";
import { RecoveryCodeList } from "@/components/settings/recovery-code-list";
import { SettingsCard, SettingsCardSkeleton } from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/hooks/use-account";
import {
	useBeginMfaSetup,
	useCancelMfaSetup,
	useDisableMfa,
	useEnableMfa,
	useMfaStatus,
	useRegenerateRecoveryCodes,
} from "@/hooks/use-mfa";
import { ApiError } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Flow = "idle" | "enroll" | "disable" | "rotate";

export function MfaCard() {
	const t = useTranslations("settings.mfa");
	const format = useFormatter();
	const { data, isPending, isError, refetch } = useMfaStatus();
	const { data: session } = useSession();

	const beginSetup = useBeginMfaSetup();
	const cancelSetup = useCancelMfaSetup();
	const enable = useEnableMfa();
	const disable = useDisableMfa();
	const rotate = useRegenerateRecoveryCodes();

	const [flow, setFlow] = useState<Flow>("idle");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [label, setLabel] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [labelError, setLabelError] = useState<string | null>(null);
	const [codes, setCodes] = useState<string[] | null>(null);

	const account = session?.username ?? "";

	function reset(): void {
		setFlow("idle");
		setPassword("");
		setCode("");
		setLabel("");
		setError(null);
		setLabelError(null);
		setCodes(null);
		beginSetup.reset();
	}

	function message(caught: unknown, fallback: string): string {
		return caught instanceof ApiError ? caught.message : fallback;
	}

	async function startEnrollment(): Promise<void> {
		setError(null);

		try {
			await beginSetup.mutateAsync({ currentPassword: password });
			setPassword("");
			setCode("");
			setLabel(t("enroll.labelDefault"));
		} catch (caught) {
			setError(message(caught, t("errors.generic")));
		}
	}

	async function confirmEnrollment(value: string): Promise<void> {
		if (label.trim().length === 0) {
			setLabelError(t("errors.labelRequired"));
			return;
		}

		setError(null);
		setLabelError(null);

		try {
			const issued = await enable.mutateAsync({ code: value, label: label.trim() });
			setCodes(issued.codes);
			toast.success(t("enabled"));
		} catch (caught) {
			setCode("");
			setError(message(caught, t("errors.invalidCode")));
		}
	}

	async function confirmDisable(): Promise<void> {
		if (disable.isPending || password.length === 0 || code.trim().length === 0) {
			return;
		}

		setError(null);

		try {
			await disable.mutateAsync({ currentPassword: password, code });
			toast.success(t("disabled"));
			reset();
		} catch (caught) {
			setError(message(caught, t("errors.generic")));
		}
	}

	async function confirmRotate(): Promise<void> {
		setError(null);

		try {
			const issued = await rotate.mutateAsync({ currentPassword: password, code });
			setCodes(issued.codes);
			setPassword("");
			setCode("");
		} catch (caught) {
			setError(message(caught, t("errors.generic")));
		}
	}

	async function closeEnrollment(): Promise<void> {
		if (codes === null && beginSetup.isSuccess) {
			await cancelSetup.mutateAsync().catch(() => undefined);
		}

		reset();
	}

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={2} />;
	}

	const enrollment = beginSetup.data;
	const enrolling = enrollment !== undefined && codes === null;
	const exhausted = data.recoveryCodesRemaining === 0;

	return (
		<SettingsCard title={t("title")} description={t("description")}>
			<div className="overflow-hidden rounded-xl border">
				<div className="flex items-center gap-4 p-4">
					<div
						className={cn(
							"flex size-11 shrink-0 items-center justify-center rounded-lg",
							data.enabled ? "bg-primary/10 text-primary dark:bg-primary/15" : "bg-secondary text-muted-foreground",
						)}
					>
						{data.enabled ? <ShieldCheck className="size-5" /> : <ShieldOff className="size-5" />}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
							<p className="truncate font-medium">{data.enabled ? (data.label ?? t("defaultLabel")) : t("status.title")}</p>
							<Badge variant={data.enabled ? "default" : "secondary"}>
								{data.enabled ? t("status.enabled") : t("status.disabled")}
							</Badge>
						</div>
						<p className="mt-0.5 text-muted-foreground text-sm">
							{data.enabled
								? t("status.addedOn", {
										date: data.enabledAt === null ? "—" : format.dateTime(new Date(data.enabledAt), "dateTime"),
									})
								: t("status.hint")}
						</p>
					</div>
				</div>

				{data.enabled ? (
					<div className="flex items-center gap-3 border-t bg-muted/40 px-4 py-3 dark:bg-input/20">
						<KeyRound className={cn("size-4 shrink-0", exhausted ? "text-destructive" : "text-muted-foreground")} />
						<p className={cn("text-sm", exhausted ? "text-destructive" : "text-muted-foreground")}>
							{exhausted ? t("recovery.exhausted") : t("recovery.remaining", { count: data.recoveryCodesRemaining })}
						</p>
					</div>
				) : null}
			</div>

			<div className="flex flex-wrap justify-end gap-2">
				{data.enabled ? (
					<>
						<Button type="button" variant="outline" onClick={() => setFlow("rotate")}>
							<KeyRound />
							{t("actions.rotateCodes")}
						</Button>
						<Button type="button" variant="destructive" onClick={() => setFlow("disable")}>
							<ShieldOff />
							{t("actions.disable")}
						</Button>
					</>
				) : (
					<Button type="button" onClick={() => setFlow("enroll")}>
						<ShieldCheck />
						{t("actions.enable")}
					</Button>
				)}
			</div>

			<Dialog open={flow === "enroll"} onOpenChange={(open) => (open ? undefined : void closeEnrollment())}>
				<DialogContent className={enrolling ? "sm:max-w-2xl" : "sm:max-w-lg"}>
					<DialogHeader>
						<DialogTitle>{codes === null ? t("enroll.title") : t("recovery.title")}</DialogTitle>
						<DialogDescription>{codes === null ? t("enroll.description") : t("recovery.description")}</DialogDescription>
					</DialogHeader>

					{codes !== null ? (
						<>
							<RecoveryCodeList codes={codes} account={account} />
							<DialogFooter>
								<Button type="button" onClick={reset}>
									{t("recovery.confirm")}
								</Button>
							</DialogFooter>
						</>
					) : (
						<form
							className="grid gap-6"
							onSubmit={(event) => {
								event.preventDefault();
								void (enrolling ? confirmEnrollment(code) : startEnrollment());
							}}
						>
							<UsernameHint username={account} />

							{enrolling && enrollment !== undefined ? (
								<>
									<MfaSecret enrollment={enrollment} />
									<Separator />
									<div className="grid items-start gap-6 sm:grid-cols-2">
										<Field data-invalid={labelError !== null}>
											<FieldLabel htmlFor="mfa-label">{t("enroll.labelLabel")}</FieldLabel>
											<Input
												id="mfa-label"
												name="mfa-label"
												value={label}
												onChange={(event) => {
													setLabel(event.target.value);
													setLabelError(null);
												}}
												maxLength={TOTP_LABEL_MAX_LENGTH}
												autoComplete="off"
												placeholder={t("enroll.labelPlaceholder")}
												aria-invalid={labelError !== null}
												aria-describedby={labelError !== null ? "mfa-label-error" : undefined}
											/>
											{labelError === null ? (
												<FieldDescription>{t("enroll.labelHint")}</FieldDescription>
											) : (
												<FieldError id="mfa-label-error" errors={[{ message: labelError }]} />
											)}
										</Field>
										<Field data-invalid={error !== null}>
											<FieldLabel htmlFor="mfa-enroll-code">{t("enroll.codeLabel")}</FieldLabel>
											<CodeInput
												id="mfa-enroll-code"
												value={code}
												onChange={setCode}
												disabled={enable.isPending}
												invalid={error !== null}
												describedBy={error !== null ? "mfa-enroll-code-error" : undefined}
												autoFocus
											/>
											{error !== null ? (
												<FieldError id="mfa-enroll-code-error" errors={[{ message: error }]} />
											) : null}
										</Field>
									</div>
								</>
							) : (
								<FieldGroup>
									<Field data-invalid={error !== null}>
										<FieldLabel htmlFor="mfa-enroll-password">{t("passwordLabel")}</FieldLabel>
										<Input
											id="mfa-enroll-password"
											name="current-password"
											type="password"
											autoComplete="current-password"
											value={password}
											onChange={(event) => setPassword(event.target.value)}
											aria-invalid={error !== null}
										/>
										<FieldDescription>{t("passwordHint")}</FieldDescription>
										{error !== null ? <FieldError errors={[{ message: error }]} /> : null}
									</Field>
								</FieldGroup>
							)}

							<DialogFooter>
								<Button
									type="button"
									variant="ghost"
									onClick={() => void closeEnrollment()}
									disabled={beginSetup.isPending || enable.isPending}
								>
									{t("actions.cancel")}
								</Button>
								<Button
									type="submit"
									disabled={
										enrolling
											? enable.isPending || code.length < CODE_LENGTH
											: beginSetup.isPending || password.length === 0
									}
								>
									{enrolling ? t("enroll.confirm") : t("enroll.start")}
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={flow === "disable"} onOpenChange={(open) => (open ? undefined : reset())}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("disableDialog.title")}</DialogTitle>
						<DialogDescription>{t("disableDialog.description")}</DialogDescription>
					</DialogHeader>
					<form
						className="grid gap-6"
						onSubmit={(event) => {
							event.preventDefault();
							void confirmDisable();
						}}
					>
						<UsernameHint username={account} />
						<FieldGroup>
							<Field data-invalid={error !== null}>
								<FieldLabel htmlFor="mfa-disable-password">{t("passwordLabel")}</FieldLabel>
								<Input
									id="mfa-disable-password"
									name="current-password"
									type="password"
									autoComplete="current-password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									aria-invalid={error !== null}
								/>
								{error !== null ? <FieldError errors={[{ message: error }]} /> : null}
							</Field>
							<Field data-invalid={error !== null}>
								<FieldLabel htmlFor="mfa-disable-code">{t("disableDialog.codeLabel")}</FieldLabel>
								<Input
									id="mfa-disable-code"
									name="one-time-code"
									value={code}
									onChange={(event) => setCode(event.target.value)}
									autoComplete="one-time-code"
									autoCorrect="off"
									spellCheck={false}
									aria-invalid={error !== null}
									aria-describedby="mfa-disable-code-hint"
								/>
								<FieldDescription id="mfa-disable-code-hint">{t("disableDialog.codeHint")}</FieldDescription>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button type="button" variant="ghost" onClick={reset} disabled={disable.isPending}>
								{t("actions.cancel")}
							</Button>
							<Button
								type="submit"
								variant="destructive"
								disabled={disable.isPending || password.length === 0 || code.trim().length === 0}
							>
								{t("actions.disable")}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={flow === "rotate"} onOpenChange={(open) => (open ? undefined : reset())}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{codes === null ? t("rotateDialog.title") : t("recovery.title")}</DialogTitle>
						<DialogDescription>{codes === null ? t("rotateDialog.description") : t("recovery.description")}</DialogDescription>
					</DialogHeader>
					{codes !== null ? (
						<>
							<RecoveryCodeList codes={codes} account={account} />
							<DialogFooter>
								<Button type="button" onClick={reset}>
									{t("recovery.confirm")}
								</Button>
							</DialogFooter>
						</>
					) : (
						<form
							className="grid gap-6"
							onSubmit={(event) => {
								event.preventDefault();
								void confirmRotate();
							}}
						>
							<UsernameHint username={account} />
							<FieldGroup>
								<Field data-invalid={error !== null}>
									<FieldLabel htmlFor="mfa-rotate-password">{t("passwordLabel")}</FieldLabel>
									<Input
										id="mfa-rotate-password"
										name="current-password"
										type="password"
										autoComplete="current-password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										aria-invalid={error !== null}
									/>
									{error !== null ? <FieldError errors={[{ message: error }]} /> : null}
								</Field>
								<Field data-invalid={error !== null}>
									<FieldLabel htmlFor="mfa-rotate-code">{t("rotateDialog.codeLabel")}</FieldLabel>
									<Input
										id="mfa-rotate-code"
										name="one-time-code"
										value={code}
										onChange={(event) => setCode(event.target.value)}
										autoComplete="one-time-code"
										autoCorrect="off"
										spellCheck={false}
										className="font-mono tracking-wider"
										aria-invalid={error !== null}
									/>
									<FieldDescription>{t("rotateDialog.codeHint")}</FieldDescription>
								</Field>
							</FieldGroup>
							<DialogFooter>
								<Button type="button" variant="ghost" onClick={reset} disabled={rotate.isPending}>
									{t("actions.cancel")}
								</Button>
								<Button type="submit" disabled={rotate.isPending || password.length === 0 || code.length === 0}>
									{t("actions.rotateCodes")}
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>
		</SettingsCard>
	);
}
