import type { AuditActor, AuditCategory, AuditOutcome, AuditSeverity } from "@snapshot/contracts";
import {
	CircleCheck,
	CircleX,
	Info,
	KeyRound,
	Link2,
	type LucideIcon,
	Monitor,
	OctagonAlert,
	Server,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	TriangleAlert,
	Upload,
	UserRound,
	Wifi,
} from "lucide-react";

export const OUTCOME_STYLES = {
	success: { icon: CircleCheck, text: "text-outcome-success" },
	failure: { icon: CircleX, text: "text-destructive" },
} as const satisfies Record<AuditOutcome, { icon: LucideIcon; text: string }>;

export interface SeverityStyle {
	icon: LucideIcon;
	text: string;
	surface: string;
	rail: string;
}

export const SEVERITY_STYLES: Record<AuditSeverity, SeverityStyle> = {
	info: {
		icon: Info,
		text: "text-severity-info",
		surface: "bg-severity-info/10 text-severity-info ring-severity-info/25",
		rail: "bg-severity-info/40",
	},
	notice: {
		icon: CircleCheck,
		text: "text-severity-notice",
		surface: "bg-severity-notice/10 text-severity-notice ring-severity-notice/25",
		rail: "bg-severity-notice/60",
	},
	warning: {
		icon: TriangleAlert,
		text: "text-severity-warning",
		surface: "bg-severity-warning/10 text-severity-warning ring-severity-warning/30",
		rail: "bg-severity-warning/70",
	},
	error: {
		icon: CircleX,
		text: "text-severity-error",
		surface: "bg-severity-error/10 text-severity-error ring-severity-error/30",
		rail: "bg-severity-error/80",
	},
	critical: {
		icon: OctagonAlert,
		text: "text-severity-critical",
		surface: "bg-severity-critical/15 text-severity-critical ring-severity-critical/40",
		rail: "bg-severity-critical",
	},
};

export const CATEGORY_ICONS: Record<AuditCategory, LucideIcon> = {
	auth: KeyRound,
	mfa: ShieldCheck,
	account: UserRound,
	config: SlidersHorizontal,
	api_key: KeyRound,
	uploads: Upload,
	links: Link2,
	security: ShieldAlert,
	system: Server,
};

export const ACTOR_ICONS: Record<AuditActor, LucideIcon> = {
	dashboard: Monitor,
	api_key: KeyRound,
	system: Server,
	anonymous: Wifi,
};
