/**
 * Markdown parsing for prose nodes, independent of any rendering target.
 *
 * Produces a token and block structure that a renderer walks to build its own
 * output — React elements, DOM nodes, or anything else. Nothing here emits
 * markup, so no renderer has to reach for innerHTML to display prose.
 *
 * Handles bold, italic, bold+italic, strikethrough, inline code, links,
 * headings (h1-h3), unordered and ordered lists, and paragraph breaks.
 */

export interface InlineToken {
	type: 'text' | 'bold' | 'italic' | 'bolditalic' | 'strikethrough' | 'code' | 'link'
	content: string
	href?: string
}

export interface ProseBlock {
	type: 'heading' | 'ulist' | 'olist' | 'paragraph'
	level?: number // for headings: 1-3
	items?: string[] // for lists
	content?: string // for heading / paragraph
}

// Order matters: bold+italic (***) before bold (**) before italic (*)
const INLINE_PATTERN =
	/(\*\*\*([^*]+?)\*\*\*|___([^_]+?)___)|(~~([^~]+?)~~)|(\*\*([^*]+?)\*\*|__([^_]+?)__)|(\*([^*\n]+?)\*|_([^_\n]+?)_)|(`([^`]+)`)|(\[([^\][]+)\]\(([^)\s]+)\))/g

// Matches markdown headings: 1–3 leading '#' characters, followed by space/tab, then non-whitespace content
const HEADING_RE = /^(#{1,3})[ \t]+(\S.*)$/
// Matches unordered list items: leading '-' or '*', followed by space/tab, then non-whitespace content
const UL_RE = /^[-*][ \t]+(\S.*)$/
// Matches ordered list items: one or more digits, then '.' or ')', followed by space/tab, then non-whitespace content
const OL_RE = /^\d+[.)][ \t]+(\S.*)$/

/**
 * Return the href only if its scheme is safe to put in the DOM.
 *
 * Renderers must use this rather than passing a parsed href through directly:
 * javascript: and data: URLs are rejected here, and an undefined result means
 * the link should render as plain text.
 */
export function sanitizeHref(href?: string): string | undefined {
	if (!href) return undefined
	const trimmed = href.trim()
	const lower = trimmed.toLowerCase()
	if (
		lower.startsWith('http://') ||
		lower.startsWith('https://') ||
		lower.startsWith('mailto:') ||
		lower.startsWith('tel:') ||
		(trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
		trimmed.startsWith('#') ||
		trimmed.startsWith('?')
	) {
		return trimmed
	}
	return undefined
}

/** Split a single line of text into inline formatting tokens. */
export function parseInline(text: string): InlineToken[] {
	const tokens: InlineToken[] = []
	let lastIndex = 0

	for (const match of text.matchAll(INLINE_PATTERN)) {
		if (match.index > lastIndex) {
			tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) })
		}

		if (match[1]) {
			// Bold+italic: ***text*** or ___text___
			tokens.push({ type: 'bolditalic', content: match[2] ?? match[3] })
		} else if (match[4]) {
			// Strikethrough: ~~text~~
			tokens.push({ type: 'strikethrough', content: match[5] })
		} else if (match[6]) {
			// Bold: **text** or __text__
			tokens.push({ type: 'bold', content: match[7] ?? match[8] })
		} else if (match[9]) {
			// Italic: *text* or _text_
			tokens.push({ type: 'italic', content: match[10] ?? match[11] })
		} else if (match[12]) {
			// Inline code: `code`
			tokens.push({ type: 'code', content: match[13] })
		} else if (match[14]) {
			// Link: [text](url)
			tokens.push({ type: 'link', content: match[15], href: match[16] })
		}

		lastIndex = match.index + match[0].length
	}

	if (lastIndex < text.length) {
		tokens.push({ type: 'text', content: text.slice(lastIndex) })
	}

	return tokens
}

/** Split prose content into block-level structures. */
export function parseBlocks(content: string): ProseBlock[] {
	const lines = content.split('\n')
	const blocks: ProseBlock[] = []
	let paraLines: string[] = []

	const flushParagraph = () => {
		if (paraLines.length > 0) {
			const text = paraLines.join('\n').trim()
			if (text) {
				blocks.push({ type: 'paragraph', content: text })
			}
			paraLines = []
		}
	}

	let i = 0
	while (i < lines.length) {
		const line = lines[i]
		const trimmed = line.trim()

		// Blank line — flush current paragraph
		if (!trimmed) {
			flushParagraph()
			i++
			continue
		}

		// Heading
		const headingMatch = trimmed.match(HEADING_RE)
		if (headingMatch) {
			flushParagraph()
			blocks.push({
				type: 'heading',
				level: headingMatch[1].length,
				content: headingMatch[2],
			})
			i++
			continue
		}

		// Unordered list — collect consecutive list items
		const ulMatch = trimmed.match(UL_RE)
		if (ulMatch) {
			flushParagraph()
			const items: string[] = [ulMatch[1]]
			i++
			while (i < lines.length) {
				const nextTrimmed = lines[i].trim()
				const nextUl = nextTrimmed.match(UL_RE)
				if (nextUl) {
					items.push(nextUl[1])
					i++
				} else {
					// a blank line or any other content ends the list
					break
				}
			}
			blocks.push({ type: 'ulist', items })
			continue
		}

		// Ordered list — collect consecutive list items
		const olMatch = trimmed.match(OL_RE)
		if (olMatch) {
			flushParagraph()
			const items: string[] = [olMatch[1]]
			i++
			while (i < lines.length) {
				const nextTrimmed = lines[i].trim()
				const nextOl = nextTrimmed.match(OL_RE)
				if (nextOl) {
					items.push(nextOl[1])
					i++
				} else {
					break
				}
			}
			blocks.push({ type: 'olist', items })
			continue
		}

		// Regular text — accumulate into paragraph
		paraLines.push(line)
		i++
	}

	flushParagraph()
	return blocks
}
