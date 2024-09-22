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
let default_channel = "fish-radio"
let channel_slug = sig("")
let channel_title = sig("")

// data
let channel = mut({ contents: [] })

// init
eff_on(channel_slug,
	() => tinyApi.get_channel(channel_slug()).then((res) => {
		if (!res || !res.title || !res.contents) return
		channel_title.set(res.title)
		channel.contents = res.contents.filter((block) => block.class === "Media" || block.class === "Attachment")
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

//
// ------------------------
// View
// ------------------------

const Unplayable = () => html`
	.block
		.metadata
			span -- Unplayable`

let find_previous = (id) => {
	// find the index of the current block
	let index = channel.contents.findIndex((block) => block.id === id)

	// if the current block is not found, return the first block
	if (index === -1) return channel.contents[0]
	if (index === 0) return channel.contents[channel.contents.length - 1]

	return channel.contents[index - 1]
}

let find_previous_and_play = (id) => {
	let find = find_previous(id)
	if (!find.handle_play) {
		find_previous_and_play(find.id)
	} else { find.handle_play() }
}

let find_next_and_play = (id) => {
	let find = find_next(id)
	if (!find.handle_play) {
		find_next_and_play(find.id)
	} else { find.handle_play() }
}
const Block = (block) => {
	let url = getURL(block)
	if (!url) return Unplayable
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

	block.handle_play = handle_play
	block.handle_pause = handle_pause
	block.playing = playing
	block.duration = duration
	block.current = current
	block.percentDone = percentDone

	return html`
	.block [onclick=${handle_toggle}]
		img [src=${block?.image?.thumb.url}]
		.metadata
			when ${isLoading} then ${() => html`span -- Loading...`}
			when ${playing} then ${() => html`span.playing -- (▶)`}
			when ${notLoading} then ${() => html`span.title -- ${" " + block?.title} `}
	`
}

const loaderString = (percent, len = 10) => {
	console.log("percent", percent)
	console.log("len", len)
	console.log("normalized", percent * len)
	let percentOutOfLen = (percent * len)
	console.log(percentOutOfLen)
	let empty = "-"
	// let full = "x█"
	let full = "█"

	let cap = Math.floor(percentOutOfLen) + 1

	let loader = Array.from(
		{ length: len },
		(_, i) => {
			let char = empty

			if (i < cap) char = full

			if (i === 0) char = "["
			if (i === cap) char = "]"


			return char
		}).join("")

	return loader
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

	return html`
		.player 
			.controls 
					button [onclick=${handle_previous}] -- (<<)

					when ${isPlaying} 
					then ${html`button [onclick=${handle_pause}] -- (pause)`}

					when ${isNotPlaying}
					then ${html`button [onclick=${handle_play}] -- (▶)`}

					button [onclick=${handle_next}] -- (>>) 
			.meta [style=${hideStyle}]
				.song-title -- ${title}
				.duration -- ${current} ${mem(() => loaderString(percent(), 50))} ${duration}
	`
}
const Channel = () => html`
	.div -- ${Player}
	.channel
		.header
			.title -- ${channel_title}
		.list
			each of ${_ => channel.contents} as ${Block}
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

setTimeout(() => {
	if (channel_slug() === "") {
		page("/" + default_channel)
	}
}, 200)

window.onload = () => {
	init();
	// if(channel_slug() === "") channel_slug.set(default_channel)
	// page()
}
