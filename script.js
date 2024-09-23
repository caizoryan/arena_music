import { render, html, mut, sig, mem, eff_on, mounted } from './solid_monke/solid_monke.js'
import { tinyApi } from './arena.js'
import player from "./player.js"
import page from './page.js';

// ------------------------
// BOOTLEG NOTICE
// ------------------------
// The one trace of exact copy-paste function from :
// https://github.com/broskoski/mac.are.na/
// for those of you who don't know, this is a bootleg version of mac.are.na
// ------------------------
function getURL(item) {
	switch (item.class) {
		case 'Attachment':
			return item.attachment.url
		case 'Media':
			return item.source.url
		default:
			return false
	}
}

// ------------------------
// Model
// ------------------------

const init = () => {
	page("/:slug", (ctx) => { channel_slug.set(ctx.params.slug) });
	page({ hashbang: true });
};


// ------------------------
// Data 
// ------------------------
const Config = {
	auto_refresh: true,
	auto_refresh_at: .95,
	default_property: "____",
	default_value: "____"
}

// Icons
const Icons = {
	play: "[  ▶  ]",
	pause: "[pause]",
	next: ">>",
	prev: "<<",

	editor: "((📝))",

	loading: "⏳",
	loadingBarFull: "█",
	loadingBarEmpty: "-",
	loadingBarCap: "-",
	loadingBarStart: "[",
	loadingBarEnd: "]",
}

// Defaults
let default_channel = "fish-radio"
let channel_slug = sig("")
let channel_title = sig("")
let debug = sig(false)
let selected_classes = sig([])
let selected_ids = sig([])

let contents_raw = sig([])
let channel = mut({ contents: [] })

let css = mut({
	StyleSheet: {
		".block": {}
	}
})

let selector_item_class = (selector) => "selector-for-" + selector.replace(".", "__").replace(" ", "---").replace("#", "-x--") + " selector-item"
function save_css() {
	localStorage.setItem(channel_slug(), JSON.stringify(css.StyleSheet, null, 2))
}

function copy_css() {
	let cssString = JSON.stringify(css.StyleSheet, null, 2)
	navigator.clipboard.writeText(cssString)
}

function safe_json_parse(str) {
	try {
		return JSON.parse(str)
	} catch (e) {
		return false
	}
}

function load_css(str) {
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

let css_string = mem(() => {
	let c = css.StyleSheet
	let cssString = ""
	Object.entries(c).forEach(([selector, rules]) => {
		cssString += selector + " {" + `\n`
		Object.entries(rules).forEach(([key, value]) => {
			cssString += `\t` + key + ":" + value + ";" + `\n`
		})
		cssString += "}" + `\n\n`
	})
	return cssString
})

function edit_css_selector(selector, new_selector) {
	if (selector === new_selector) return
	if (new_selector === "") {
		delete css.StyleSheet[selector]
		return
	}
	let rules = css.StyleSheet[selector]
	css.StyleSheet[new_selector] = rules
	delete css.StyleSheet[selector]
}

function edit_css_rule(selector, key, value, old_key) {
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

function create_css_selector(selector) {
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

function add_css_rule(selector, key, value) {
	let rules = css.StyleSheet[selector]
	if (!rules) return

	rules[key] = value
}

// Dependent data
let cover = mem(() => contents_raw().find((block) => block.title.toLowerCase() === "cover" && block.class === "Image"))
let css_block = mem(() => contents_raw().find((block) => block.title.toLowerCase() === "style.css" && block.class === "Text"))

let cover_image = mem(() => cover()?.image?.display.url)

// -----------
// Effects
// -----------
eff_on(css_block, () => {
	if (!css_block()) return
	let content = css_block()?.content
	if (!content) return
	let parsed = safe_json_parse(content)
	if (!parsed) return
	css.StyleSheet = parsed
})

eff_on(contents_raw, () => {
	let filtered = contents_raw().filter((block) => block.class === "Media" || block.class === "Attachment")
	channel.contents = filtered
})

// init
eff_on(channel_slug, () => refresh_contents(channel_slug()))

function refresh_contents(slug) {
	tinyApi.get_channel(slug).then((res) => {
		// if playing, preserve the playing
		// will not retain duration.. thats fine...

		if (!res || !res.title || !res.contents) return
		channel_title.set(res.title)
		contents_raw.set(res.contents)

	})

}

function find_next(id) {
	// find the index of the current block
	let index = channel.contents.findIndex((block) => block.id === id)

	// if the current block is not found, return the first block
	if (index === -1) return channel.contents[0]
	if (index === channel.contents.length - 1) return channel.contents[0]

	return channel.contents[index + 1]
}

function find_previous(id) {
	// find the index of the current block
	let index = channel.contents.findIndex((block) => block.id === id)

	// if the current block is not found, return the first block
	if (index === -1) return channel.contents[0]
	if (index === 0) return channel.contents[channel.contents.length - 1]

	return channel.contents[index - 1]
}

function find_previous_and_play(id) {
	let find = find_previous(id)
	if (!find.handle_play) {
		find_previous_and_play(find.id)
	} else { find.handle_play() }
}

function find_next_and_play(id) {
	let find = find_next(id)
	if (!find.handle_play) {
		find_next_and_play(find.id)
	} else { find.handle_play() }
}

function pausePlayer(url) {
	player(container, { url, playing: false })
}

function playPlayer(url, onStart, onProgress, onDuration, onEnded) {
	player(container,
		{
			url,
			playing: true,
			onStart: onStart,
			onProgress: onProgress,
			onDuration: onDuration,
			onEnded: onEnded
		})
}


//
// ------------------------
// View
// ------------------------

// ------------------------
// This function is on the cusp of 
// being a utility function and a view function
// but it's mostly a view function so keeping it here
// ------------------------
//
function loaderString(percent, len = 10) {
	let percentOutOfLen = (percent * len)
	let empty = Icons.loadingBarEmpty
	let full = Icons.loadingBarFull

	let cap = Math.floor(percentOutOfLen) + 1

	let loader = Array.from(
		{ length: len },
		(_, i) => {
			let char = empty

			if (i < cap) char = full

			if (i === 0) char = Icons.loadingBarStart
			if (i === len - 1) char = Icons.loadingBarEnd
			if (i === cap) char = Icons.loadingBarCap


			return char
		}).join("")

	return loader
}

const Unplayable = () => html`
	.block
		.metadata
			span -- Unplayable`



const Block = (block) => {
	let url = getURL(block)
	if (!url) return Unplayable

	let image = block?.image?.thumb.url
	if (!image) {
		image = cover_image()
	}

	let d = "-"
	let duration = sig(d)
	let current = sig(d)
	let playing = sig(false)
	let loading = sig(false)
	let percentDone = sig(0)
	let durationRaw = sig(0)
	let isLoading = mem(() => loading() === true)
	let notLoading = mem(() => loading() === false)

	let onprogress = (t) => {
		let totalSeconds = parseInt(t.playedSeconds)

		percentDone.set(t.playedSeconds / durationRaw())

		let minutes = Math.floor(totalSeconds / 60);
		if (minutes < 10) minutes = "0" + minutes

		let seconds = totalSeconds % 60;
		if (seconds < 10) seconds = "0" + seconds

		current.set("[" + minutes + ":" + seconds + "]")
	}

	let onduration = (t) => {
		durationRaw.set(t)
		let totalSeconds = t
		let minutes = Math.floor(totalSeconds / 60);
		let seconds = totalSeconds % 60;
		duration.set("[" + minutes.toFixed(0) + ":" + seconds.toFixed(0) + "]")
	}

	let onstart = () => {
		loading.set(false)
		playing.set(true)
	}

	let onended = () => {
		playing.set(false)
		find_next_and_play(block.id)
	}

	let handle_play = () => {
		if (current() === d) loading.set(true)
		// set all other blocks to not playing
		channel.contents.forEach((block) => {
			if (block.handle_pause) block.handle_pause()
		})

		playPlayer(url, onstart, onprogress, onduration, onended)
	}

	let handle_pause = () => {
		playing.set(false)
		pausePlayer()
	}

	let handle_toggle = () => {
		if (playing()) {
			handle_pause()
		} else {
			handle_play()
		}
	}

	// ------------------------
	// set the block's functions
	// so they are globally accessible
	// ------------------------

	block.handle_play = handle_play
	block.handle_pause = handle_pause
	block.playing = playing
	block.duration = duration
	block.current = current
	block.percentDone = percentDone


	return html`
	div [
			onclick=${handle_toggle}
			class = ${"block " + block.class}
			id = ${"block-" + block.id}]

		img.thumb-image [src=${image}]
		.metadata
			when ${isLoading} then ${() => html`span -- Loading...`}
			when ${playing} then ${() => html`span.playing -- (▶)`}
			when ${notLoading} then ${() => html`span.title -- ${" " + block?.title} `}
	`
}

const Player = () => {
	let playing = mem(() => channel.contents.find((block) => { if (block?.playing) return block.playing() === true }))
	let title = mem(() => playing()?.title)
	let current = mem(() => playing()?.current)
	let duration = mem(() => playing()?.duration)
	let percent = mem(() => playing()?.percentDone())

	let hideStyle = mem(() => playing() ? "transform: translateY(0)" : "transform: translateY(400%)")

	let handle_pause = () => playing()?.handle_pause()
	let handle_play = () => playing() ? playing().handle_play() : (channel.contents[0].handle_play())
	let handle_next = () => find_next_and_play(playing().id)
	let handle_previous = () => find_previous_and_play(playing().id)

	let isPlaying = mem(() => playing())
	let isNotPlaying = mem(() => !isPlaying())
	let dispatchedRefresh = false

	eff_on(playing, () => {
		if (title()) { document.title = title(); dispatchedRefresh === false }
		else document.title = "Bootleg Are.na Mixtape: " + channel_title()
	})

	let loaded = mem(() => {
		if (percent() > Config.auto_refresh_at && dispatchedRefresh === false && Config.auto_refresh) {
			console.log("refreshing")
			refresh_contents(channel_slug())
		}

		return loaderString(percent(), 35)
	})

	return html`
		.player 
			.controls 
					button [onclick=${handle_previous}] -- ${Icons.prev}

					when ${isPlaying} 
					then ${html`button [onclick=${handle_pause}] -- ${Icons.pause}`}

					when ${isNotPlaying}
					then ${html`button [onclick=${handle_play}] -- ${Icons.play}`}

					button [onclick=${handle_next}] -- ${Icons.next} 
			.meta [style=${hideStyle}]
				.song-title -- ${title}
				.duration -- ${current} ${loaded} ${duration}
	`
}

const sanitise_css = (str) => {
	let [property, value] = str.split(":")
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
			console.log(e.target.value)
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
			if (items.length === 1) {
				console.log("scrolling")
				document.querySelector(".list").scrollTo({
					top: el.offsetTop - 200,
					behavior: 'smooth'
				})
			}
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

const Editor = () => {
	let open = sig(false)
	let openEditor = () => open.set(true)
	let closeEditor = () => open.set(false)

	let classItem = (item) => {
		if (item === "") return
		let government_name = "." + item
		let c = () => create_css_selector(government_name)
		return html`span.rounded [onclick=${c}] -- ${government_name}`
	}

	let idItem = (item) => {
		if (item === "") return
		let government_name = "#" + item
		let c = () => create_css_selector(government_name)
		return html`span.rounded [onclick=${c}] -- ${government_name}`
	}

	return html`
		button.editor-toggle [onclick=${openEditor}] -- ${Icons.editor}
		.editor [ activated = ${open} ] 
			button.close [onclick=${closeEditor}] -- X
			button.save-css [onclick=${save_css}] -- Save CSS
			button.save-css [onclick=${copy_css}] -- Copy CSS
			br
			button.add-selector [onclick=${() => create_css_selector(".new-selector")}] -- Add Selector
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

const Channel = () => html`
	style -- ${css_string}
	.div -- ${Player}
	.div -- ${Editor}
	.channel
		.header
			.title#channel-header -- ${channel_title}
		.list
			each of ${_ => channel.contents} as ${Block}
	`

render(Channel, document.querySelector('#mother'))

setTimeout(() => {
	if (channel_slug() === "") {
		page("/" + default_channel)
	}

	let all = document.body.getElementsByTagName("*")

	let hover = (e) => {
		if (debug()) {
			selected_classes.set(e.target.className.split(" "))
			selected_ids.set(e.target.id.split(" "))
			e.target.style.cursor = "crosshair"
			e.target.style.border = "1px solid red"
		}
	}

	let hoverOut = (e) => {
		if (debug()) {
			e.target.style = ""
		}
	}

	Object.values(all).forEach((el) => {
		el.addEventListener("mouseover", hover)
		el.addEventListener("mouseout", hoverOut)
	})
}, 200)


window.onload = () => {
	init();

	let str = localStorage.getItem(channel_slug())
	load_css(str)

	document.body.addEventListener("keydown", (e) => {
		if (e.key === "Shift") {
			debug.set(true)
		}
	})

	document.body.addEventListener("keyup", (e) => {
		if (e.key === "Shift") {
			debug.set(false)
			document.querySelectorAll("*").forEach((el) => {
				el.style = ""
			})
		}
	})
}

