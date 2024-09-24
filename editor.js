import { html, sig, mem, mounted, } from './solid_monke/solid_monke.js'
import { Icons, Config, selected_ids, selected_classes, selector_item_class } from './script.js'
import { save_css, copy_css, css, } from './css.js'
import { create_css_selector, add_css_rule, edit_css_rule, edit_css_selector } from './css.js';

const sanitise_css = (str) => {
	let [property, ...value] = str.split(":")
	value = value.join(":")
	if (!property || !value) return [Config.default_property, Config.default_value]

	if (property === "") property = Config.default_property
	if (value === "") value = Config.default_value

	if (value.includes(";")) value = value.replace(";", "")

	return [property.trim(), value.trim()]
}

const CssItem = ([selector, rules]) => {

	let key_value = ([key, value]) => {
		let id = "selector-input-" + selector + "-key-" + key

		let onkeydown = (e) => {
			if (e.key === "Enter") {
				let santised = sanitise_css(e.target.value)
				edit_css_rule(selector, ...santised, key)
			}
		}

		let key_value_input = () => html`input.key-value [id=${id} value=${key + " : " + value + " ;"} onkeydown=${onkeydown}]`

		mounted(() => {
			let el = document.getElementById(id)
			el?.addEventListener("focusout", (e) => {
				let santised = sanitise_css(e.target.value)
				edit_css_rule(selector, ...santised, key)
			})
		})

		return html`
			p
				span.hide -- _ 
				span -- ${key_value_input}
`
	}

	let editSelector = sig(false)
	let editSelectorToggle = () => {
		editSelector.set(!editSelector());
		if (editSelector()) setTimeout(() => {
			let el = document.getElementById("selector-input-" + selector)
			el?.focus()
			el?.addEventListener("focusout", () => editSelectorToggle())
		}, 50)
	}

	let editingSelector = mem(() => editSelector())
	let notEditingSelector = mem(() => !editingSelector())

	let onkeydown = (e) => {
		if (e.key === "Enter") {
			edit_css_selector(selector, e.target.value)
			editSelectorToggle()
		}
	}

	let selectorInput = html`
	input [value=${selector}
		id=${"selector-input-" + selector}
		onkeydown=${onkeydown}
	]`

	let selectorHoverIn = () => {
		let items = document.querySelectorAll(selector)
		items.forEach((el) => {
			el.style.border = "1px solid red"
			if (items.length === 1) el.scrollIntoView({ behavior: "smooth" })
		})
	}

	let selectorHoverOut = () => {
		document.querySelectorAll(selector).forEach((el) => {
			el.style = ""
		})
	}


	let s_class = selector_item_class(selector)

	let selectorDisplay = html`
		span.selector-item [
			class = ${s_class}
			onclick=${editSelectorToggle} 
			onmouseenter=${selectorHoverIn}
			onmouseleave=${selectorHoverOut}
		] -- ${selector} `

	let handle_add_rule = () => add_css_rule(selector, Config.default_property, Config.default_value)
	let rulesIter = mem(() => Object.entries(rules))

	return html`
	.css-item
		p 
		 when ${editingSelector} then ${selectorInput}
		 when ${notEditingSelector} then ${selectorDisplay}
		 span -- {
		each of ${rulesIter} as ${key_value}
		button.add-rule [onclick=${handle_add_rule}] -- +
		p -- }
`
}

export const Editor = () => {
	let open = sig(false)
	let openEditor = () => open.set(true)
	let closeEditor = () => open.set(false)

	let classItem = (item) => {
		if (item === "") return
		let government_name = "." + item
		let c = () => create_css_selector(government_name)

		let hoverIn = () => {
			let items = document.querySelectorAll(government_name)
			items.forEach((el) => {
				el.style.border = "1px solid red"
			})
		}

		let hoverOut = () => {
			document.querySelectorAll(government_name).forEach((el) => {
				el.style = ""
			})
		}

		return html`span.rounded [ 
			onclick=${c}
			onmouseover=${hoverIn} 
			onmouseleave=${hoverOut} ] -- ${government_name}`
	}

	let idItem = (item) => {
		if (item === "") return
		let government_name = "#" + item
		let c = () => create_css_selector(government_name)
		let hoverIn = () => {
			let items = document.querySelectorAll(government_name)
			items.forEach((el) => {
				el.style.border = "1px solid red"
			})
		}

		let hoverOut = () => {
			document.querySelectorAll(government_name).forEach((el) => {
				el.style = ""
			})
		}

		return html`span.rounded [ 
			onclick=${c}
			onmouseover=${hoverIn} 
			onmouseleave=${hoverOut} ] -- ${government_name}`
	}

	return html`
		button.editor-toggle [onclick=${openEditor}] -- ${Icons.editor}
		.editor [ activated = ${open} ] 
			button.close [onclick=${closeEditor}] -- X
			button.save-css [onclick=${save_css}] -- Save CSS
			button.save-css [onclick=${copy_css}] -- Copy CSS
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
