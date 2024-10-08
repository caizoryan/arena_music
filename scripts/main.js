import { render, html, mut, sig, mem, eff_on } from './libraries/solid_monke/solid_monke.js'
import { tinyApi } from './utilities/arena.js'
import { Editor } from './components/editor.js';
import player from "./utilities/player.js"
import page from './utilities/page.js';
import { Home } from './components/home.js';
import { css_string, css, load_css } from './utilities/css.js';


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
	page("/", () => { channel_slug.set("") });
	page("/:slug", (ctx) => { channel_slug.set(ctx.params.slug) });
	page({ hashbang: true });
};


// ------------------------
// Data 
// ------------------------
export const Config = {
	auto_refresh: true,
	auto_refresh_at: .95,
	default_property: "____",
	default_value: "____"
}

// Icons
export const Icons = {
	play: "[  ▶  ]",
	pause: "[pause]",
	next: ">>",
	prev: "<<",

	editor: "((EDIT))",

	loading: "⏳",
	loadingBarFull: "♥",
	loadingBarEmpty: "♡",
	loadingBarCap: "♥",
	loadingBarStart: "[",
	loadingBarEnd: "]",
}

// Defaults
export let channel_slug = sig("")
export let selected_classes = sig([])
export let selected_ids = sig([])

let channel_title = sig("")
let debug = sig(false)
let dispatchedRefresh = false

let contents_raw = sig([])
let channel = mut({ contents: [] })

export let selector_item_class = (selector) => "selector-for-" + selector.replace(".", "__").replace(" ", "---").replace("#", "-x--") + " selector-item"



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
	load_css(content)
	// give priority to the local css, write on top
	let local_css = localStorage.getItem(channel_slug())
	if (load_css) load_css(local_css)
})

eff_on(contents_raw, () => {
	let filtered = contents_raw().filter((block) => block.class === "Media" || block.class === "Attachment")
	// filtered = filtered.sort((a, b) => b.position - a.position)
	channel.contents = filtered
})

// init
eff_on(channel_slug, () => {
	css.StyleSheet = {}
	let local = localStorage.getItem(channel_slug())
	if (local) load_css(local)

	refresh_contents(channel_slug())
})

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

		let minutes = Math.floor(totalSeconds / 60)
		if (minutes < 10) minutes = "0" + minutes

		let seconds = (totalSeconds % 60).toFixed(0);
		if (seconds < 10) seconds = "0" + seconds

		duration.set("[" + minutes + ":" + seconds + "]")
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
		loading.set(true)
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

	let _class = mem(() => "block block-" + block.class + " " + (block.playing() ? "playing" : ""))

	return html`
	div [
			onclick=${handle_toggle}
			class = ${_class}
			id = ${"block-" + block.id}]

		img.thumb-image [src=${image}]
		span.metadata
			when ${isLoading} then ${() => html`span.loading -- Loading...`}
			when ${playing} then ${() => html`span.playing -- (▶)`}
			when ${notLoading} then ${() => html`span.title -- ${" " + block?.title} `}
	`
}

const playing = mem(() => channel.contents.find((block) => { if (block?.playing) return block.playing() === true }))

const Controller = {
	playing: playing,
	title: mem(() => playing()?.title),
	current: mem(() => playing()?.current),
	duration: mem(() => playing()?.duration),
	percent: mem(() => playing()?.percentDone()),


	pause: () => playing()?.handle_pause(),
	play: () => playing() ? playing().handle_play() : (channel.contents[0].handle_play()),
	next: () => find_next_and_play(playing()?.id),
	previous: () => find_previous_and_play(playing()?.id)
}

eff_on(Controller.playing, () => {
	if (Controller.title()) { document.title = Controller.title(); dispatchedRefresh === false }
	else document.title = "Bootleg Are.na playlist: " + channel_title()
})

const Player = () => {
	let isPlaying = mem(() => Controller.playing())
	let isNotPlaying = mem(() => !Controller.playing())

	let hideStyle = mem(() => Controller.playing() ? "transform: translateY(0); opacity: 1;" : "transform: translateY(400%); opacity: 0;")


	let loaded = mem(() => {
		if (Controller.percent() > Config.auto_refresh_at && dispatchedRefresh === false && Config.auto_refresh) {
			console.log("refreshing")
			refresh_contents(channel_slug())
		}

		return loaderString(Controller.percent(), 35)
	})

	let fn = () => html`
		.player 
			.controls 
					button [onclick=${Controller.previous}] -- ${Icons.prev}

					when ${isPlaying} 
					then ${html`button [onclick=${Controller.pause}] -- ${Icons.pause}`}

					when ${isNotPlaying}
					then ${html`button [onclick=${Controller.play}] -- ${Icons.play}`}

					button [onclick=${Controller.next}] -- ${Icons.next} 
			.meta [style=${hideStyle}]
				.song-title -- ${Controller.title}
				.duration -- ${Controller.current} ${loaded} ${Controller.duration}
	`


	return fn
}

let PlayerInstance = Player()


const Channel = () => html`
	style -- ${css_string}
	div -- ${PlayerInstance}
	div -- ${Editor}
	.channel
		.header
			h1.title#channel-header -- ${channel_title}
		.list
			each of ${_ => channel.contents} as ${Block}
	`

const Main = () => html`
	when ${mem(() => channel_slug() === "")} then ${Home}
	when ${mem(() => channel_slug() !== "")} then ${Channel}
	
`

render(Main, document.querySelector('#mother'))

setTimeout(() => {
	let all = document.body.getElementsByTagName("*")

	let hover = (e) => {
		if (debug()) {
			selected_classes.set(e.target.className.split(" "))
			selected_ids.set(e.target.id.split(" "))
			e.target.classList.add("debug-hovered")

			// e.target.style.cursor = "crosshair"
			// e.target.style.border = "1px solid red"
		}
	}

	let hoverOut = (e) => {
		if (debug()) {
			e.target.classList.remove("debug-hovered")
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
	if (str) load_css(str)
	console.log("loaded css")

	document.body.addEventListener("keydown", (e) => {
		// or operator js is: ||
		if (e.key === "Control" || e.key === "Meta") {
			debug.set(true)
			console.log("debugging")
		}
		if (e.key === " ") {
			Controller.playing() ? Controller.pause() : Controller.play()
		}

		if (e.key === "N") {
			find_next_and_play(Controller.playing().id)
		}

		if (e.key === "P") {
			find_previous_and_play(Controller.playing().id)
		}

	})

	document.body.addEventListener("keyup", (e) => {
		if (e.key === "Control" || e.key === "Meta") {
			debug.set(false)
			document.querySelectorAll("*").forEach((el) => {
				el.classList.remove("debug-hovered")
			})
		}
	})
}

