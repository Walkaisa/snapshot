import { spawn } from "node:child_process";

const services = [
	{ name: "api", cwd: "/app/api", entry: "dist/main.js", port: process.env.API_PORT ?? "3001" },
	{ name: "web", cwd: "/app/web", entry: "apps/web/server.js", port: process.env.WEB_PORT ?? "3000" },
];

let stopping = false;

const children = services.map(({ name, cwd, entry, port }) => {
	const child = spawn(process.execPath, [entry], {
		cwd,
		env: { ...process.env, PORT: port },
		stdio: "inherit",
	});

	child.once("error", (error) => {
		console.error(`[supervisor] ${name} failed to start: ${error.message}`);
		process.exitCode = 1;
		stop("SIGTERM");
	});

	child.once("exit", (code, signal) => {
		if (stopping) return;
		console.error(`[supervisor] ${name} exited (${signal ?? `code ${code}`})`);
		process.exitCode = code ?? 1;
		stop("SIGTERM");
	});

	return child;
});

function stop(signal) {
	if (stopping) return;
	stopping = true;

	for (const child of children) {
		if (child.exitCode === null && child.signalCode === null) child.kill(signal);
	}

	setTimeout(() => {
		for (const child of children) child.kill("SIGKILL");
	}, 10_000).unref();
}

for (const signal of ["SIGTERM", "SIGINT"]) {
	process.on(signal, () => stop(signal));
}
