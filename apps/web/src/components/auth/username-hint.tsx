export function UsernameHint({ username }: { username: string }) {
	return (
		<input
			type="text"
			name="username"
			autoComplete="username"
			value={username}
			readOnly
			tabIndex={-1}
			aria-hidden="true"
			className="sr-only"
		/>
	);
}
