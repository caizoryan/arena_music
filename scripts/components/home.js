import { html, sig } from '../libraries/solid_monke/solid_monke.js'
import { tinyApi } from '../utilities/arena.js';
import { MD } from '../utilities/md.js';
import { SearchBar } from './search.js';
import page from "../utilities/page.js"

let friends_playlists = sig([])

tinyApi.get_channel("playlists-my-friends-made").then((res) => {
	res.contents.forEach((block) => {
		if (block.class === "Channel") friends_playlists.set([...friends_playlists(), block])
	})
})

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
				.end
					p -- Playlists my friends made!
					each of ${friends_playlists()} as ${playlist_btn}
			.intro -- ${Markdown("faq.md")}
							`
}
