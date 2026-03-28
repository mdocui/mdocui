import { createElement } from 'react'

/**
 * Lightweight built-in markdown renderer for prose nodes.
 * Handles bold, italic, inline code, links, headings (h1-h3),
 * unordered lists, and paragraph breaks. No external dependencies.
 *
 * Consumers who need full GFM support can override via the
 * `renderProse` prop on the Renderer.
 */

interface InlineToken {
	type: 'text' | 'bold' | 'italic' | 'code' | 'link'
	content: string
	href?: string
}

function parseInline(text: string): InlineToken[] {
	const tokens: InlineToken[] = []
	// Order matters: bold before italic so ** is matched first
	const pattern =
		/(\*\*(.+?)\*\*|__(.+?)__)|(\*(.+?)\*|_([^_]+?)_)|(`([^`]+?)`)|(\[([^\]]+?)\]\(([^)]+?)\))/g

	let lastIndex = 0
	let match: RegExpExecArray | null = pattern.exec(text)

	while (match !== null) {
		// Push any plain text before this match
		if (match.index > lastIndex) {
			tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) })
		}

		if (match[1]) {
			// Bold: **text** or __text__
			tokens.push({ type: 'bold', content: match[2] ?? match[3] })
		} else if (match[4]) {
			// Italic: *text* or _text_
			tokens.push({ type: 'italic', content: match[5] ?? match[6] })
		} else if (match[7]) {
			// Inline code: `code`
			tokens.push({ type: 'code', content: match[8] })
		} else if (match[9]) {
			// Link: [text](url)
			tokens.push({ type: 'link', content: match[10], href: match[11] })
		}

		lastIndex = match.index + match[0].length
		match = pattern.exec(text)
	}

	// Remaining plain text
	if (lastIndex < text.length) {
		tokens.push({ type: 'text', content: text.slice(lastIndex) })
	}

	return tokens
}

function renderInline(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
	return tokens.map((token, i) => {
		const key = `${keyPrefix}-${i}`
		switch (token.type) {
			case 'bold':
				return createElement('strong', { key }, token.content)
			case 'italic':
				return createElement('em', { key }, token.content)
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
	type: 'heading' | 'list' | 'paragraph'
	level?: number // for headings: 1-3
	items?: string[] // for lists
	content?: string // for heading / paragraph
}

function parseBlocks(content: string): Block[] {
	// Split on double newline for paragraphs
	const paragraphs = content.split(/\n{2,}/)
	const blocks: Block[] = []

	for (const para of paragraphs) {
		const trimmed = para.trim()
		if (!trimmed) continue

		// Check for heading (# through ###)
		const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
		if (headingMatch) {
			blocks.push({
				type: 'heading',
				level: headingMatch[1].length,
				content: headingMatch[2],
			})
			continue
		}

		// Check for unordered list (all lines start with - or *)
		const lines = trimmed.split('\n')
		const listPattern = /^\s*[-*]\s+(.+)$/
		const isAllList = lines.every((line) => listPattern.test(line.trim()) || line.trim() === '')
		if (isAllList && lines.some((line) => listPattern.test(line.trim()))) {
			const items = lines
				.map((line) => {
					const m = line.trim().match(listPattern)
					return m ? m[1] : null
				})
				.filter((item): item is string => item !== null)
			blocks.push({ type: 'list', items })
			continue
		}

		// Default: paragraph
		blocks.push({ type: 'paragraph', content: trimmed })
	}

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

				case 'list': {
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

				default: {
					const inlineTokens = parseInline(block.content ?? '')
					// Replace single newlines with <br> within a paragraph
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
