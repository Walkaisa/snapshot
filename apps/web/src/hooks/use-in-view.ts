"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

export function useInView<T extends Element>(rootMargin = "0px"): [RefObject<T | null>, boolean] {
	const ref = useRef<T | null>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		if (inView) {
			return;
		}

		const node = ref.current;

		if (node === null) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setInView(true);
				}
			},
			{ rootMargin },
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [inView, rootMargin]);

	return [ref, inView];
}
