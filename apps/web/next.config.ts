import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
	output: "standalone",
	experimental: {
		proxyClientMaxBodySize: "1gb",
	},
	async rewrites() {
		if (process.env.NODE_ENV !== "development") {
			return [];
		}

		return [
			{ source: "/api/:path*", destination: `${apiInternalUrl}/api/:path*` },
			{ source: "/raw/:path*", destination: `${apiInternalUrl}/raw/:path*` },
		];
	},
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
