import { eff_on, html, sig, mem } from "./solid_monke/solid_monke.js"
import page from "./page.js"

async function search(query) {
	let res = await fetch(`https://api.are.na/v2/search/channels?q=${query}&per=20`)
	return await res.json()
}

export function SearchBar(open) {
	oninput = (e) => {
		let query = e.target.value
		search(query).then((res) => {
			let channels = res.channels
			if (channels) results.set(channels)
		})
	}

	// onkeydown = (e) => {
	// 	if (!open()) return
	// 	if (e.key === "Escape") open.set(false)
	// 	if (e.key === "Enter") page("/" + results()[0].slug)
	// }

	let results = sig([])
	let classes = mem(() => (open() ? "search-bar open" : "search-bar"))

	return html`
		div [class=${classes}]
			input [ oninput=${oninput} ]
			.search-results
				each of ${results} as ${(r) => html`p -- ${r.title}`}
`
} 
