import type { InlineToken } from '@mdocui/core'
import { parseBlocks, parseInline, sanitizeHref } from '@mdocui/core'
import { createElement } from 'react'

/**
 * Lightweight built-in markdown renderer for prose nodes.
 *
 * Parsing lives in @mdocui/core so every renderer shares one implementation;
 * this file only turns the resulting tokens and blocks into React elements.
 *
 * Consumers who need full GFM support can override via the
 * `renderProse` prop on the Renderer.
 */

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
					{ key, href: sanitizeHref(token.href), target: '_blank', rel: 'noopener noreferrer' },
					token.content,
				)
			default:
				return createElement('span', { key }, token.content)
		}
	})
}

export interface SimpleMarkdownProps {
	content: string
	dataKey: string
}

/**
 * Render a lightweight subset of markdown content as React elements.
 *
 * @param content - The markdown-like text to parse and render.
 * @param dataKey - Base key used for React element keys and the `data-mdocui-prose` attribute.
 * @returns A React node tree representing the rendered markdown content.
 */
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
