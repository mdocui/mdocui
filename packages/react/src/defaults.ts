import { ComponentRegistry } from '@mdocui/core'
import { Badge, Callout, CodeBlock, Image, Link } from './components/content'
import { Chart, Progress, Stat, Table } from './components/data'
import {
	Button,
	ButtonGroup,
	Checkbox,
	Form,
	Input,
	Select,
	Textarea,
	Toggle,
} from './components/interactive'
import { Accordion, Card, Divider, Grid, Stack, Tab, Tabs } from './components/layout'
import type { ComponentMap } from './context'
import { allDefinitions, defaultGroups } from './definitions'

export const defaultComponents: ComponentMap = {
	stack: Stack,
	grid: Grid,
	card: Card,
	divider: Divider,
	accordion: Accordion,
	tabs: Tabs,
	tab: Tab,
	button: Button,
	'button-group': ButtonGroup,
	input: Input,
	textarea: Textarea,
	select: Select,
	checkbox: Checkbox,
	toggle: Toggle,
	form: Form,
	chart: Chart,
	table: Table,
	stat: Stat,
	progress: Progress,
	callout: Callout,
	badge: Badge,
	image: Image,
	'code-block': CodeBlock,
	link: Link,
}

export function createDefaultRegistry(): ComponentRegistry {
	const registry = new ComponentRegistry()
	registry.registerAll(allDefinitions)
	return registry
}

export { defaultGroups }
