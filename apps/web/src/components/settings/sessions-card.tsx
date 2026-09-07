"use client";

import type { SessionInfo } from "@snapshot/contracts";
import { EllipsisVertical, LogOut, Monitor, Smartphone } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardError } from "@/components/dashboard/dashboard-error";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { SettingsCard, SettingsCardSkeleton } from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRevokeSessions, useSessions } from "@/hooks/use-security";
import { ApiError } from "@/lib/api/types";
import { parseUserAgent } from "@/lib/user-agent";

function SessionRow({ session, onRevoke }: { session: SessionInfo; onRevoke: (session: SessionInfo) => void }) {
	const t = useTranslations("settings.sessions");
	const format = useFormatter();
	const { browser, os, mobile } = parseUserAgent(session.userAgent);
	const DeviceIcon = mobile ? Smartphone : Monitor;
	const label = browser !== null && os !== null ? t("device", { browser, os }) : (browser ?? os ?? t("unknownAgent"));

	return (
		<TableRow>
			<TableCell>
				<div className="flex items-center gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
						<DeviceIcon className="size-4" />
					</div>
					<p className="truncate font-medium text-sm">{label}</p>
				</div>
			</TableCell>
			<TableCell>
				<span className="text-muted-foreground text-sm">{session.ip ?? t("unknownIp")}</span>
			</TableCell>
			<TableCell>
				<span className="text-muted-foreground text-sm">{format.relativeTime(new Date(session.lastSeenAt))}</span>
			</TableCell>
			<TableCell>{session.current ? <Badge>{t("current")}</Badge> : <Badge variant="secondary">{t("active")}</Badge>}</TableCell>
			<TableCell className="text-right">
				{session.current ? null : (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button type="button" variant="ghost" size="icon-sm" aria-label={t("columns.actions")} />}
						>
							<EllipsisVertical />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem variant="destructive" onClick={() => onRevoke(session)}>
								<LogOut />
								{t("revokeSession")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</TableCell>
		</TableRow>
	);
}

export function SessionsCard() {
	const t = useTranslations("settings.sessions");
	const { data, isPending, isError, refetch } = useSessions();
	const revoke = useRevokeSessions();
	const [confirmOthersOpen, setConfirmOthersOpen] = useState(false);
	const [sessionToRevoke, setSessionToRevoke] = useState<SessionInfo | null>(null);

	if (isError) {
		return <DashboardError onRetry={() => void refetch()} />;
	}

	if (isPending) {
		return <SettingsCardSkeleton rows={3} />;
	}

	const sorted = [...data.sessions].sort(
		(a, b) => Number(b.current) - Number(a.current) || new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
	);
	const others = data.sessions.filter((session) => !session.current).length;

	async function onRevokeOthers(): Promise<void> {
		try {
			const result = await revoke.mutateAsync({});
			setConfirmOthersOpen(false);
			toast.success(t("revoked", { count: result.revoked }));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("revokeError"));
		}
	}

	async function onRevokeOne(): Promise<void> {
		if (sessionToRevoke === null) {
			return;
		}

		try {
			const result = await revoke.mutateAsync({ sessionId: sessionToRevoke.id });
			setSessionToRevoke(null);
			toast.success(t("revoked", { count: result.revoked }));
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : t("revokeError"));
		}
	}

	return (
		<SettingsCard title={t("title")} description={t("description", { count: data.sessions.length })}>
			<div className="overflow-hidden rounded-lg">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("columns.device")}</TableHead>
							<TableHead>{t("columns.ip")}</TableHead>
							<TableHead>{t("columns.lastActive")}</TableHead>
							<TableHead>{t("columns.status")}</TableHead>
							<TableHead className="text-right">
								<span className="sr-only">{t("columns.actions")}</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sorted.map((session) => (
							<SessionRow key={session.id} session={session} onRevoke={setSessionToRevoke} />
						))}
					</TableBody>
				</Table>
			</div>
			<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground text-sm">{t("revokeHint")}</p>
				<Button type="button" variant="outline" disabled={others === 0} onClick={() => setConfirmOthersOpen(true)}>
					{t("revokeOthers")}
				</Button>
			</div>
			<ConfirmDialog
				open={confirmOthersOpen}
				onOpenChange={setConfirmOthersOpen}
				title={t("confirmTitle")}
				description={t("confirmDescription")}
				confirmLabel={t("revokeOthers")}
				onConfirm={onRevokeOthers}
				pending={revoke.isPending}
				destructive
			/>
			<ConfirmDialog
				open={sessionToRevoke !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSessionToRevoke(null);
					}
				}}
				title={t("confirmOneTitle")}
				description={t("confirmOneDescription")}
				confirmLabel={t("revokeSession")}
				onConfirm={onRevokeOne}
				pending={revoke.isPending}
				destructive
			/>
		</SettingsCard>
	);
}
