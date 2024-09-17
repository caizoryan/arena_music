import { render, html, mut, sig } from './solid_monke/solid_monke.js'
import { tinyApi } from './arena.js'
import reactplayer from "./reactplayer.js"

// ------------------------
// Model
// ------------------------

// defaults
let channel_slug = "home-office"

// data
let channel = mut({ contents: [] })

// init
tinyApi.get_channel(channel_slug).then((res) => channel.contents = res.contents)

let playing = sig(false)

// ------------------------
// View
// ------------------------

const Block = (block) => {
	let url = block?.source?.url

	return html`
	.block
		.title -- ${block?.title}
		button [onclick=${() => playPlayer(url)}] -- Play
		button [onclick=${() => pausePlayer(url)}] -- Pause
	`
}

const Channel = () => html`
	.channel
		h1 -- ${channel_slug}
		.list
			each of ${_ => channel.contents} as ${Block}
	`


const container = document.getElementById('container')
const url = 'https://www.youtube.com/watch?v=d46Azg3Pm4c'

function pausePlayer(url) {
	reactplayer(container, { url, playing: false })
}
function playPlayer(url) {
	reactplayer(container, { url, playing: true, onStart: () => console.log('started') })
}



render(Channel, document.querySelector('#mother'))
