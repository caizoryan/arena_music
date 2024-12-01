import { mem, html, sig } from '../libraries/solid_monke/solid_monke.js'
import { tinyApi } from '../utilities/arena.js';
import { MD } from '../utilities/md.js';
import { SearchBar } from './search.js';
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

let group_channels = sig([])

if (parent_group() !== null) {
	tinyApi.get_group_channels(parent_group(), auth_token()).then((res) => {
		res.channels.forEach((block) => {
			group_channels.set([...group_channels(), block])
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
	let playlist_btn = (channel) => html`
				button [onclick=${() => page("/" + channel.slug)}] -- ${channel.title}`

	return html`
		.welcome
			h1 -- (Welcome Page) Bootleg Are.na Playlist 
			a [href=https://github.com/caizoryan/arena_music/archive/refs/heads/main.zip]
				button -- [ Download Source ]
		.home
			.side
				div -- ${() => SearchBar(search_open)}
				h4.mt-1 -- Auth Token
				div -- ${authenticator}

				h4.mt-1 -- Parent Group
				div -- ${ParentGroup}

				.end
					p -- Playlists my friends made!
					each of ${friends_playlists()} as ${playlist_btn}
			.intro 
				when ${mem(() => group_channels().length == 0)}
				then ${FAQ}
				
				when ${mem(() => group_channels().length > 0)}
				then ${() => html`
					.group-container
						each of ${group_channels()} as ${Channel}
				`}
				
		`
}

const Channel = (channel) => {
	let slug = channel.slug
	let title = channel.title

	return html`
		div.channel [onclick=${() => page("/" + slug)}]
			span -- ${title}
		`
}
