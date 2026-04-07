// jsdom does not implement requestAnimationFrame in a way that fires inside act().
// This mock defers callbacks via microtask (Promise.resolve) so they flush within
// React Testing Library's act(), while still being cancellable and non-synchronous.
// The non-synchronous behaviour is required to exercise the coalescing guard in push()
// (rafRef.current !== null), which prevents multiple same-frame pushes from each
// scheduling their own render.

let rafId = 0
const pendingRafs = new Map<number, FrameRequestCallback>()

global.requestAnimationFrame = (cb: FrameRequestCallback): number => {
	const id = ++rafId
	pendingRafs.set(id, cb)
	Promise.resolve().then(() => {
		if (pendingRafs.has(id)) {
			pendingRafs.delete(id)
			cb(performance.now())
		}
	})
	return id
}

global.cancelAnimationFrame = (id: number): void => {
	pendingRafs.delete(id)
}

// Clear any pending RAF callbacks between tests to prevent cross-test leakage.
beforeEach(() => {
	pendingRafs.clear()
})
