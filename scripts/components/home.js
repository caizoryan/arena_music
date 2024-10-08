import { html, sig } from '../libraries/solid_monke/solid_monke.js'
import { MD } from '../utilities/md.js';
import { SearchBar } from './search.js';

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
	return html`
		.welcome
			h1 -- (Welcome Page) Bootleg Are.na Playlist 
			a [href=https://github.com/caizoryan/arena_music/archive/refs/heads/main.zip]
				button -- [ Download Source ]
		.home
			div -- ${() => SearchBar(search_open)}
			.intro -- ${Markdown("faq.md")}
							`
}
