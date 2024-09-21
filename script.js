import { render, html, mut, sig, mem, eff_on } from './solid_monke/solid_monke.js'
import { tinyApi } from './arena.js'
import player from "./player.js"
import page from './page.js';

// ------------------------
// Model
// ------------------------

const init = () => {
	page("/:slug", (ctx) => { channel_slug.set(ctx.params.slug) });
	page({ hashbang: true });
};


// defaults
// let channel_slug = sig("fish-radio")
let channel_slug = sig("mixtape-mama")
let channel_title = sig("")

// data
let channel = mut({ contents: [] })

// init
eff_on(channel_slug,
	() => tinyApi.get_channel(channel_slug()).then((res) => {
		channel_title.set(res.title)
		channel.contents = res.contents
	})
)

const find_next = (id) => {
	// find the index of the current block
	let index = channel.contents.findIndex((block) => block.id === id)

	// if the current block is not found, return the first block
	if (index === -1) return channel.contents[0]
	if (index === channel.contents.length - 1) return channel.contents[0]

	return channel.contents[index + 1]
}


// ------------------------
// View
// ------------------------

const Block = (block) => {
	let url = block?.source?.url
	let d = "-"
	let duration = sig(d)
	let current = sig(d)
	let playing = sig(false)

	let onprogress = (t) => {
		let totalSeconds = parseInt(t.playedSeconds)
		let minutes = Math.floor(totalSeconds / 60);
		let seconds = totalSeconds % 60;

		current.set("[" + minutes + ":" + seconds + "]")
	}

	let onduration = (t) => {
		let totalSeconds = t
		let minutes = Math.floor(totalSeconds / 60);
		let seconds = totalSeconds % 60;
		duration.set("[" + minutes + ":" + seconds + "]")
	}

	let onstart = () => {
		loading.set(false)
		playing.set(true)
	}

	let onended = () => {
		playing.set(false)
		let find = find_next(block.id)
		find.handle_play()
	}

	let loading = sig(false)
	let isLoading = mem(() => loading() === true)
	let notLoading = mem(() => loading() === false)

	let handle_play = () => {
		if (current() === d) loading.set(true)
		playPlayer(url, onstart, onprogress, onduration, onended)
	}

	let handle_pause = () => {
		playing.set(false)
		pausePlayer()
	}

	block.handle_play = handle_play
	block.handle_pause = handle_pause

	return html`
	.block
		img [src=${block?.image?.thumb.url}]
		.metadata
			when ${isLoading} then ${() => html`span -- Loading...`}
			when ${notLoading} then ${() => html`.title -- ${block?.title} `}
			.duration -- ${current} / ${duration}
		button [onclick=${handle_play}] -- Play
		button [onclick=${handle_pause}] -- Pause
	`
}

const Channel = () => html`
	.channel
		h1 -- ${channel_title}
		.list
			each of ${_ => channel.contents} as ${Block}
	button [onclick=${() => page("/fish-radio")}] -- Fish Radio
	button [onclick=${() => page("/mixtape-mama")}] -- Mixtape Mama
	`

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

render(Channel, document.querySelector('#mother'))

window.onload = () => {
	init();
	page("/" + channel_slug())
}
