import { html, sig, mem, mounted, } from '../libraries/solid_monke/solid_monke.js'
import { Icons, Config, selected_ids, selected_classes, selector_item_class } from '../main.js'
import { tinyApi } from '../utilities/arena.js';
import { css_edited, save_css, copy_css, css, create_css_selector, add_css_rule, edit_css_rule, edit_css_selector, load_css, temporary_css_applier } from '../utilities/css.js';
import { MD } from '../utilities/md.js';

function sanitise_css(str) {
	let [property, ...value] = str.split(":")
	value = value.join(":")
	if (!property || !value) return [Config.default_property, Config.default_value]

	if (property === "") property = Config.default_property
	if (value === "") value = Config.default_value

	if (value.includes(";")) value = value.replace(";", "")

	return [property.trim(), value.trim()]
}

function CssItem([selector, rules]) {

	// ------------------------------------------------
	// ------------------------------------------------
	// Key Value Pair Component
	// [in local scope so has access to selector]
	// ------------------------------------------------
	// ------------------------------------------------
	function key_value([key, value]) {
		if (key.includes("comment")) return html`p.comment -- /* ${value} /*`
		let id = "selector-input-" + selector + "-key-" + key
		let _value = key + " : " + value + " ;"
		if (key === Config.default_property && value === Config.default_value) _value = `\n`

		function onkeydown(e) {
			e.stopPropagation()
			if (e.key === "Enter") {
				let santised = sanitise_css(e.target.value)
				if (emptyEntry(santised)) deleteEntry()
				else {
					edit_css_rule(selector, ...santised, key)
					e.target.blur()
					add_css_rule(selector, Config.default_property, Config.default_value)
				}
			}
		}

		function emptyEntry(santised) {
			return santised[0] === Config.default_property && santised[1] === Config.default_value
		}

		function deleteEntry() {
			delete css.StyleSheet[selector][key]
		}

		let key_value_input = () => html`input.key-value [id=${id} value = ${_value} onkeydown=${onkeydown}]`

		mounted(() => {
			let el = document.getElementById(id)
			el?.focus()
			el?.addEventListener("focusout", (e) => {
				let santised = sanitise_css(e.target.value)
				if (emptyEntry(santised)) deleteEntry()
				else edit_css_rule(selector, ...santised, key)
			})
		})

		return html`
			p
				span.hide -- _ 
				span -- ${key_value_input}`
	}
	// ------------------------------------------------
	// ------------------------------------------------

	let editSelector = sig(false)
	let editingSelector = mem(() => editSelector())
	let notEditingSelector = mem(() => !editingSelector())

	function editSelectorToggle() {
		editSelector.set(!editSelector());
		if (editSelector()) setTimeout(() => {
			let el = document.getElementById("selector-input-" + selector)
			el?.focus()
			el?.addEventListener("focusout", (e) => {
				edit_css_selector(selector, e.target.value)
				editSelectorToggle()
			})
		}, 50)
	}


	function onkeydown(e) {
		e.stopPropagation()
		if (e.key === "Enter") {
			edit_css_selector(selector, e.target.value)
			editSelectorToggle()
		}
	}


	function selectorHoverIn() {
		let items = document.querySelectorAll(selector)
		items.forEach((el) => {
			el.style.border = "1px solid red"
			if (items.length === 1) el.scrollIntoView({ behavior: "smooth" })
		})
	}

	function selectorHoverOut() {
		document.querySelectorAll(selector).forEach((el) => {
			el.style = ""
		})
	}


	let selectorClass = selector_item_class(selector)

	let handleAddRule = () => add_css_rule(selector, Config.default_property, Config.default_value)
	let rulesIterable = mem(() => Object.entries(rules))

	const selectorInput = html`
		input [value=${selector}
			id=${"selector-input-" + selector}
			onkeydown=${onkeydown}
		]`

	const selectorDisplay = html`
		span.selector-item [
			class = ${selectorClass}
			onclick=${editSelectorToggle} 
			onmouseenter=${selectorHoverIn}
			onmouseleave=${selectorHoverOut}
		] -- ${selector} `


	return html`
		.css-item
			p 
			 when ${editingSelector} then ${selectorInput}
			 when ${notEditingSelector} then ${selectorDisplay}
			 span -- {
			each of ${rulesIterable} as ${key_value}
			button.add-rule [onclick=${handleAddRule}] -- +
			p -- }
`
}

export const Editor = () => {
	let open = sig(false)
	let openEditor = () => open.set(true)
	let closeEditor = () => open.set(false)

	function classItem(item) {
		if (item === "") return
		let government_name = "." + item
		let c = () => create_css_selector(government_name)

		function hoverIn() {
			let items = document.querySelectorAll(government_name)
			items.forEach((el) => {
				el.style.border = "1px solid red"
			})
		}

		function hoverOut() {
			document.querySelectorAll(government_name).forEach((el) => {
				el.style = ""
			})
		}

		return html`span.rounded [ 
			onclick=${c}
			onmouseover=${hoverIn} 
			onmouseleave=${hoverOut} ] -- ${government_name}`
	}

	function idItem(item) {
		if (item === "") return
		let government_name = "#" + item
		let c = () => create_css_selector(government_name)

		function hoverIn() {
			let items = document.querySelectorAll(government_name)
			items.forEach((el) => {
				el.style.border = "1px solid red"
			})
		}

		function hoverOut() {
			document.querySelectorAll(government_name).forEach((el) => {
				el.style = ""
			})
		}

		return html`span.rounded [ 
			onclick=${c}
			onmouseover=${hoverIn} 
			onmouseleave=${hoverOut} ] -- ${government_name}`
	}

	let save_css_classes = mem(() => {
		let _class = "save-css"
		if (css_edited()) _class += " unsaved"
		return _class
	})

	let save_text = mem(() => {
		if (css_edited()) return "[ Save CSS ]"
		return "Changes Saved"
	})

	let css_library = sig([])

	tinyApi.get_channel("bootleg-mac-css-library")
		.then((res) => {
			css_library.set(res.contents)
			console.log(css_library)
		})

	const load_block_to_css = (block) => {
		load_css(block.content)
	}


	const css_block = (block) => {
		let css_temp = temporary_css_applier(block.content)

		let previewed = sig(false)
		let applied = sig(false)

		let not_applied = mem(() => !applied())
		let is_applied = mem(() => applied())

		let is_previewed = mem(() => previewed() && !applied())
		let not_previewed = mem(() => !previewed() && !applied())


		const apply = _ => { applied.set(true); load_block_to_css(block) }

		const preview = _ => { previewed.set(true); css_temp.apply() }
		const revert = _ => { previewed.set(false); css_temp.revert() }

		if (block.class === "Text") return html`
			.css-block [
				onclick=${onclick} ]
				span -- ${MD(block.content)}
			p -- ${block.title} by ${block.user?.first_name} ${block.user?.last_name}
			when ${not_previewed} then ${html`button [onclick=${preview}] -- Preview`}
			when ${is_previewed} then ${html`button [onclick=${revert}] -- Revert`}
			when ${not_applied} then ${html` button [onclick=${apply}] -- Apply `}
			when ${is_applied} then ${html`p -- -> Applied <-`}
`
	}


	let css_library_open = sig(false)
	let open_css_library = () => {
		css_library_open.set(true)
	}

	let close_css_library = () => {
		css_library_open.set(false)
	}


	return html`
		button.editor-toggle [onclick=${openEditor}] -- ${Icons.editor}
		.css-library [ activated = ${css_library_open} ] 
			button.close [onclick=${close_css_library}] -- [   X   ]
			a [href=https://www.are.na/channels/bootleg-mac-css-library]
				button -- View on Are.na
			.css-block-container
				p -- -------------------
				p -- Hover to preview, click to apply
				p -- -------------------
				each of ${css_library} as ${css_block}
		.editor [ activated = ${open} ] 
			button.close [onclick=${closeEditor}] -- [   X   ]
			button [class = ${save_css_classes} onclick=${save_css}] -- ${save_text}
			button.save-css [onclick=${copy_css}] -- [  Copy CSS  ]
			button [onclick=${open_css_library}] -- [  CSS Library  ]
			br
			.css-item-container
				each of ${mem(() => Object.entries(css.StyleSheet))} as ${CssItem}

			button.add-selector [onclick=${() => create_css_selector(".new-selector")}] -- Add Selector
			.show-selectors
				div	
					p -- Selected Classes
					each of ${selected_classes} as ${classItem}

				div	
					p -- Selected IDs
					each of ${selected_ids} as ${idItem}
		`
}
