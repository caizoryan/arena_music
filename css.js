import { mut } from "./solid_monke/solid_monke.js"
import { channel_slug } from "./script.js"
import { selector_item_class } from './script.js'

export let css = mut({
	StyleSheet: {
		".block": {}
	}
})

export function edit_css_selector(selector, new_selector) {
	if (selector === new_selector) return
	if (new_selector === "") {
		delete css.StyleSheet[selector]
		return
	}
	let rules = css.StyleSheet[selector]
	css.StyleSheet[new_selector] = rules
	delete css.StyleSheet[selector]
}

export function edit_css_rule(selector, key, value, old_key) {
	if (old_key !== key) {
		delete css.StyleSheet[selector][old_key]
	}

	if (key === "" || value === "") {
		delete css.StyleSheet[selector][key]
		return
	}

	let rules = css.StyleSheet[selector]
	if (!rules) return

	rules[key] = value
}

export function create_css_selector(selector) {
	let exists = css.StyleSheet[selector]
	if (exists) {
		let class_name = selector_item_class(selector)
		let existing = document.querySelector("." + class_name.split(" ")[0])
		existing.scrollIntoView({ behavior: "smooth" })
		existing.style.border = "1px solid red"

		setTimeout(() => {
			existing.style = ""
		}, 2000)

	} else {

		css.StyleSheet[selector] = {}
	}
}

export function add_css_rule(selector, key, value) {
	let rules = css.StyleSheet[selector]
	if (!rules) return

	rules[key] = value
}

export function save_css() {
	localStorage.setItem(channel_slug(), JSON.stringify(css.StyleSheet, null, 2))
}

export function copy_css() {
	let cssString = JSON.stringify(css.StyleSheet, null, 2)
	navigator.clipboard.writeText(cssString)
}

export function safe_json_parse(str) {
	try {
		return JSON.parse(str)
	} catch (e) {
		return false
	}
}

export function load_css(str) {
	if (str) {
		try {
			str = safe_json_parse(str)
			if (str) {
				css.StyleSheet = str
			}
		}
		catch (e) {
			console.log(e)
		}
	}
}
