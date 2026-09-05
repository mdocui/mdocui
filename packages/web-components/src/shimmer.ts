const KEYFRAMES_ID = 'mdocui-shimmer-keyframes'

function ensureKeyframes(): void {
	if (typeof document === 'undefined') return
	if (document.getElementById(KEYFRAMES_ID)) return
	const style = document.createElement('style')
	style.id = KEYFRAMES_ID
	style.textContent =
		'@keyframes mdocui-shimmer { 0% { opacity: 0.15; } 50% { opacity: 0.35; } 100% { opacity: 0.15; } }'
	document.head.appendChild(style)
}

/**
 * Placeholder for a component whose tag has started arriving but has not
 * finished. Text can stream a character at a time, a half-parsed component
 * cannot, so it gets a shimmer until it is complete.
 */
export function createShimmer(pendingTag?: string): HTMLElement {
	ensureKeyframes()

	const box = document.createElement('div')
	box.setAttribute('data-mdocui-shimmer', 'true')
	if (pendingTag) box.setAttribute('data-pending-tag', pendingTag)
	box.style.display = 'flex'
	box.style.flexDirection = 'column'
	box.style.gap = '10px'
	box.style.padding = '16px'
	box.style.borderRadius = '8px'
	box.style.border = '1px solid currentColor'
	box.style.opacity = '0.2'

	for (const width of ['40%', '80%', '60%']) {
		const bar = document.createElement('div')
		bar.style.height = '12px'
		bar.style.width = width
		bar.style.borderRadius = '6px'
		bar.style.background = 'currentColor'
		bar.style.animation = 'mdocui-shimmer 1.5s ease-in-out infinite'
		box.appendChild(bar)
	}

	return box
}
