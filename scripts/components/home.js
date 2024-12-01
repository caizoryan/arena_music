import { mem, html, sig } from '../libraries/solid_monke/solid_monke.js'
import { tinyApi } from '../utilities/arena.js';
import { MD } from '../utilities/md.js';
import { SearchBar } from './search.js';
import { create_channel_click, set_mixer_slug } from '../main.js';
import page from "../utilities/page.js"

export let auth_token = () => localStorage.getItem("token")
export let set_auth_token = (token) => localStorage.setItem("token", token)
export let parent_group = sig(localStorage.getItem("parent_group"))
let set_parent_group = (value) => { localStorage.setItem("parent_group", value); parent_group.set(value) }

let friends_playlists = sig([])


export const check_auth = async (auth) => {
	let res = await fetch("https://api.are.na/v2/me", {
		headers: {
			"Authorization": "Bearer " + auth
		}
	}).then((res) => res.json())
		.then((res) => res?.slug)

	return res
}

tinyApi.get_channel("playlists-my-friends-made").then((res) => {
	res.contents.forEach((block) => {
		if (block.class === "Channel") friends_playlists.set([...friends_playlists(), block])
	})
})

let group_channels_raw = sig([])
let group_channels_grouped = mem(() => {
	let grouped = {}
	group_channels_raw().forEach((block) => {
		let first = block.title.split(" ")[0].toLowerCase()

		if (grouped[first] === undefined) {
			grouped[first] = []
		}

		grouped[first].push(block)
	})
	return Object.entries(grouped)
})

if (parent_group() !== null) {
	tinyApi.get_group_channels(parent_group(), auth_token()).then((res) => {
		res.channels.forEach((block) => {
			group_channels_raw.set([...group_channels_raw(), block])
		})
	})
}

const Markdown = (file) => {
	let markdown = sig("")

	fetch("./pages/" + file)
		.then((res) => res.text())
		.then((res) => markdown.set(MD(res)))


	return html`
		div -- ${markdown}
`
}

const search_open = sig(true)
const authenticated = sig(false)
const user_slug = sig("")

function attempt_auth(auth) {
	check_auth(auth).then((res) => {
		if (res) {
			set_auth_token(auth)
			authenticated.set(true)
			user_slug.set(res)
		}
	})
}

attempt_auth(auth_token())


const authenticator = () => {

	const onKeydown = (e) => {
		if (e.key === "Enter") {
			let value = document.querySelector("input.token").value
			attempt_auth(value)

		}
	}

	return html`
		when ${authenticated}
		then ${html`span.green-border -- Authenticated as ${user_slug}`}

		when ${mem(() => !authenticated())}
		then ${html`input.token [placeholder=auth-token onkeydown=${onKeydown}] `}
`
}

export const ParentGroup = () => {
	let onInput = (e) => {
		if (e.key === "Enter") {
			let value = e.target.value
			set_parent_group(value)
		}
	}

	return html`
		div
			input.token [ onkeydown=${onInput} placeholder=group-slug value=${parent_group}]`
}

const FAQ = Markdown("faq.md")

export const Home = () => {
	let settings_open = sig(false)

	let settings = () => html`
				div
					h4 -- Auth Token
					div -- ${authenticator}

				div
					h4 -- Parent Group
					div -- ${ParentGroup}
	`

	let settings_class = mem(() => {
		if (settings_open()) {
			return "settings"
		}
		else {
			return "settings close"
		}
	})

	return html`
		.settings [class=${settings_class}] -- ${settings}
		.welcome
			h1 -- Bootleg Are.na Player 
			a [href=https://github.com/caizoryan/arena_music/archive/refs/heads/main.zip]
				button -- [ Download Source ]
			button [onclick=${() => settings_open.set(!settings_open())}] -- [ Settings ]

		.home
			.side
				div -- ${() => SearchBar(search_open)}

			.intro 
				when ${mem(() => group_channels_raw().length == 0)}
				then ${FAQ}
				
				when ${mem(() => group_channels_raw().length > 0)}
				then ${() => html`
					.group-container
						each of ${group_channels_grouped} as ${ChannelContainer}
				`}
				
		`
}

const ChannelContainer = ([group, channels]) => {
	let open = sig(false)
	return html`
		div.group [onclick=${() => open.set(!open())}]
			h3.title -- ${group}
			when ${open}
			then ${html` each of ${channels} as ${Channel} `}
		`
}

const Channel = (channel) => {
	let slug = channel.slug
	let title = channel.title

	let click = create_channel_click(slug)
	return html`
		div.channel [onclick=${click}]
			span -- ${title}
		`
}
