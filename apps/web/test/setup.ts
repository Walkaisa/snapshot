import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

class IntersectionObserverStub {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): [] {
		return [];
	}
}

globalThis.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof globalThis.IntersectionObserver;

window.matchMedia ??= ((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: () => {},
	removeEventListener: () => {},
	addListener: () => {},
	removeListener: () => {},
	dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

if (!Element.prototype.hasPointerCapture) {
	Element.prototype.hasPointerCapture = () => false;
	Element.prototype.setPointerCapture = () => {};
	Element.prototype.releasePointerCapture = () => {};
}

Element.prototype.scrollIntoView ??= () => {};
