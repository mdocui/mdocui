import { createElement } from 'react'

/**
 * Lightweight built-in markdown renderer for prose nodes.
 * Handles bold, italic, bold+italic, strikethrough, inline code,
 * links, headings (h1-h3), unordered and ordered lists, and
 * paragraph breaks. No external dependencies.
 *
 * Consumers who need full GFM support can override via the
 * `renderProse` prop on the Renderer.
 */

interface InlineToken {
	type: 'text' | 'bold' | 'italic' | 'bolditalic' | 'strikethrough' | 'code' | 'link'
	content: string
	href?: string
}

function parseInline(text: string): InlineToken[] {
	const tokens: InlineToken[] = []
	// Order matters: bold+italic (***) before bold (**) before italic (*)
	const pattern =
		/(\*\*\*([^*]+?)\*\*\*|___([^_]+?)___)|(~~([^~]+?)~~)|(\*\*([^*]+?)\*\*|__([^_]+?)__)|(\*([^*]+?)\*|_([^_]+?)_)|(`([^`]+)`)|(\[([^\][]+)\]\(([^)\s]+)\))/g

	let lastIndex = 0
	let match: RegExpExecArray | null = pattern.exec(text)

	while (match !== null) {
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
		match = pattern.exec(text)
	}

	if (lastIndex < text.length) {
		tokens.push({ type: 'text', content: text.slice(lastIndex) })
	}

	return tokens
}

function renderInline(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
	return tokens.map((token, i) => {
		const key = `${keyPrefix}-${i}`
		switch (token.type) {
			case 'bolditalic':
				return createElement('strong', { key }, createElement('em', null, token.content))
			case 'bold':
				return createElement('strong', { key }, token.content)
			case 'italic':
				return createElement('em', { key }, token.content)
			case 'strikethrough':
				return createElement('del', { key }, token.content)
			case 'code':
				return createElement(
					'code',
					{
						key,
						style: {
							backgroundColor: 'rgba(127,127,127,0.15)',
							padding: '0.15em 0.3em',
							borderRadius: '3px',
							fontSize: '0.9em',
						},
					},
					token.content,
				)
			case 'link':
				return createElement(
					'a',
					{ key, href: token.href, target: '_blank', rel: 'noopener noreferrer' },
					token.content,
				)
			default:
				return createElement('span', { key }, token.content)
		}
	})
}

interface Block {
	type: 'heading' | 'ulist' | 'olist' | 'paragraph'
	level?: number // for headings: 1-3
	items?: string[] // for lists
	content?: string // for heading / paragraph
}

const HEADING_RE = /^(#{1,3})[ \t]+(\S.*)$/
const UL_RE = /^[-*][ \t]+(\S.*)$/
const OL_RE = /^\d+[.)][ \t]+(\S.*)$/

function parseBlocks(content: string): Block[] {
	const lines = content.split('\n')
	const blocks: Block[] = []
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
				} else if (!nextTrimmed) {
					// blank line ends the list
					break
				} else {
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
				} else if (!nextTrimmed) {
					break
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

export interface SimpleMarkdownProps {
	content: string
	dataKey: string
}

export function SimpleMarkdown({ content, dataKey }: SimpleMarkdownProps): React.ReactNode {
	const blocks = parseBlocks(content)

	if (blocks.length === 0) {
		return createElement('span', { key: dataKey, 'data-mdocui-prose': true }, content)
	}

	return createElement(
		'div',
		{ key: dataKey, 'data-mdocui-prose': true },
		blocks.map((block, idx) => {
			const blockKey = `${dataKey}-b${idx}`

			switch (block.type) {
				case 'heading': {
					const tag = `h${block.level ?? 1}` as 'h1' | 'h2' | 'h3'
					const inlineTokens = parseInline(block.content ?? '')
					return createElement(tag, { key: blockKey }, ...renderInline(inlineTokens, blockKey))
				}

				case 'ulist': {
					return createElement(
						'ul',
						{ key: blockKey, style: { margin: '0.25em 0', paddingLeft: '1.5em' } },
						(block.items ?? []).map((item, li) => {
							const liKey = `${blockKey}-li${li}`
							const inlineTokens = parseInline(item)
							return createElement('li', { key: liKey }, ...renderInline(inlineTokens, liKey))
						}),
					)
				}

				case 'olist': {
					return createElement(
						'ol',
						{ key: blockKey, style: { margin: '0.25em 0', paddingLeft: '1.5em' } },
						(block.items ?? []).map((item, li) => {
							const liKey = `${blockKey}-li${li}`
							const inlineTokens = parseInline(item)
							return createElement('li', { key: liKey }, ...renderInline(inlineTokens, liKey))
						}),
					)
				}

				default: {
					const text = block.content ?? ''
					if (text.includes('\n')) {
						const sublines = text.split('\n')
						const children: React.ReactNode[] = []
						sublines.forEach((line, si) => {
							const lineTokens = parseInline(line)
							children.push(...renderInline(lineTokens, `${blockKey}-l${si}`))
							if (si < sublines.length - 1) {
								children.push(createElement('br', { key: `${blockKey}-br${si}` }))
							}
						})
						return createElement('p', { key: blockKey, style: { margin: '0.25em 0' } }, ...children)
					}
					const inlineTokens = parseInline(text)
					return createElement(
						'p',
						{ key: blockKey, style: { margin: '0.25em 0' } },
						...renderInline(inlineTokens, blockKey),
					)
				}
			}
		}),
	)
}
