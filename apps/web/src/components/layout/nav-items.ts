import {
	Download,
	Gauge,
	Images,
	KeyRound,
	LayoutDashboard,
	Link2,
	type LucideIcon,
	Palette,
	Scissors,
	ScrollText,
	ShieldCheck,
	Upload,
	UserRound,
} from "lucide-react";

export interface NavItem {
	href: string;
	labelKey: string;
	icon: LucideIcon;
}

export interface NavGroup {
	labelKey?: string;
	items: NavItem[];
}

export const navGroups: NavGroup[] = [
	{
		items: [{ href: "/overview", labelKey: "overview", icon: LayoutDashboard }],
	},
	{
		labelKey: "content",
		items: [
			{ href: "/gallery", labelKey: "gallery", icon: Images },
			{ href: "/links", labelKey: "links", icon: Link2 },
		],
	},
	{
		labelKey: "settings",
		items: [
			{ href: "/uploads", labelKey: "uploads", icon: Upload },
			{ href: "/shortener", labelKey: "shortener", icon: Scissors },
			{ href: "/rate-limit", labelKey: "rateLimit", icon: Gauge },
		],
	},
	{
		labelKey: "integrations",
		items: [
			{ href: "/sharex", labelKey: "sharex", icon: Download },
			{ href: "/api-key", labelKey: "apiKey", icon: KeyRound },
		],
	},
	{
		labelKey: "account",
		items: [
			{ href: "/profile", labelKey: "profile", icon: UserRound },
			{ href: "/security", labelKey: "security", icon: ShieldCheck },
			{ href: "/appearance", labelKey: "appearance", icon: Palette },
		],
	},
	{
		labelKey: "system",
		items: [{ href: "/audit", labelKey: "audit", icon: ScrollText }],
	},
];

export const navItems = navGroups.flatMap((group) => group.items);
