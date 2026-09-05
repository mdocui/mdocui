import {
	chart as chartSpec,
	progress as progressSpec,
	stat as statSpec,
	table as tableSpec,
} from '@mdocui/core'
import type { ComponentProps } from '../context'
import { renderVNode } from '../render-vnode'

export function Chart({ props, className }: ComponentProps) {
	return renderVNode(chartSpec({ props, className }), null)
}

export function Table({ props, className }: ComponentProps) {
	return renderVNode(tableSpec({ props, className }), null)
}

export function Stat({ props, className }: ComponentProps) {
	return renderVNode(statSpec({ props, className }), null)
}

export function Progress({ props, className }: ComponentProps) {
	return renderVNode(progressSpec({ props, className }), null)
}
