import { sig, mut, mem } from "../libraries/solid_monke/solid_monke.js"
import { channel_slug } from "../main.js"
import { selector_item_class } from '../main.js'
import { css_parse } from "../utilities/css_parser.js"

export let css = mut({
	StyleSheet: {}
})

export let css_edited = sig(false)

export function clean_rules(rules) {
	let css_obj = {}

	rules.forEach((rule) => {
		let selectors = rule.selectors.join(" ")
		let declarations = rule.declarations
		let props = {}

		declarations.forEach((declaration) => {
			let property = declaration.property
			let value = declaration.value
			if (property === "" || value === "") {
				if (declaration.type === "comment") {
					let uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
					props["comment-" + uid] = value
				}
			}
			props[property] = value
		})

		css_obj[selectors] = props
	})

	return css_obj
}

export function edit_css_selector(selector, new_selector) {

	if (selector === new_selector) return
	if (new_selector === "") {
		delete css.StyleSheet[selector]
		return
	}
	let rules = css.StyleSheet[selector]
	css.StyleSheet[new_selector] = rules
	delete css.StyleSheet[selector]
	css_edited.set(true)
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
	css_edited.set(true)
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
		css_edited.set(true)
	}
}

export function add_css_rule(selector, key, value) {
	let rules = css.StyleSheet[selector]
	if (!rules) return

	rules[key] = value
	css_edited.set(true)
}

export function save_css() {
	let cssString = css_string()
	localStorage.setItem(channel_slug(), cssString)
	css_edited.set(false)
}

export function copy_css() {
	// let cssString = JSON.stringify(css.StyleSheet, null, 2)

	let cssString = css_string()
	navigator.clipboard.writeText(cssString)
}

export function safe_json_parse(str) {
	try {
		return JSON.parse(str)
	} catch (e) {
		return false
	}
}

export function load_css_json(str) {
	if (str) {
		try {
			str = safe_json_parse(str)
			if (str) {
				Object.entries(str).forEach(([selector, rules]) => {
					if (!css.StyleSheet[selector]) css.StyleSheet[selector] = {}
					Object.assign(css.StyleSheet[selector], rules)
				})
			}
		}
		catch (e) {
			console.log(e)
		}
	}
}


export function load_css(str) {
	let css_obj
	try {
		css_obj = css_parse(str)
	} catch {
		console.error("error parsing css from str: ", str)
		return
	}

	let rules = css_obj.stylesheet.rules
	let cleaned = clean_rules(rules)

	Object.entries(cleaned).forEach(([selector, rules]) => {
		if (!css.StyleSheet[selector]) css.StyleSheet[selector] = {}
		Object.assign(css.StyleSheet[selector], rules)
	})

}

export const temporary_css_applier = (str) => {
	let old;
	let apply = () => {
		old = JSON.parse(JSON.stringify(css.StyleSheet))
		load_css(str)
	}

	let revert = () => {
		if (!old) return
		console.log("reverting")
		if (old) css.StyleSheet = old
	}

	return { apply, revert }

}

export let css_string = mem(() => {
	let c = css.StyleSheet
	let cssString = ""
	Object.entries(c).forEach(([selector, rules]) => {
		cssString += selector + " {" + `\n`
		Object.entries(rules).forEach(([key, value]) => {

			if (key.includes("comment")) {
				cssString += `\t` + "/* " + value + " */" + `\n`
				return
			}

			cssString += `\t` + key + ":" + value + ";" + `\n`
		})
		cssString += "}" + `\n\n`
	})
	return cssString
})

