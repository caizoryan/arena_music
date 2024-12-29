import { eff_on, html, mem, sig } from "../libraries/solid_monke/solid_monke.js"
import page from "../utilities/page.js"

async function search(query) {
	let res = await fetch(`https://api.are.na/v2/search/channels?q=${query}&per=20`)
	return await res.json()
}

const try_parse_channel = (str) => {
	if (str.includes("https://www.are.na/")) {
		let slug = str.split("/")
		slug = slug[slug.length - 1]
		return slug
	}
}

export function SearchBar(open) {
	let results = sig([])
	const onInput = (e) => {
		let query = e.target.value
		if (query === "") return results.set([])
		if (query.includes("https://www.are.na/")) {
			let slug = try_parse_channel(query)
			if (slug) return page("/" + slug)
		}

		search(query).then((res) => {
			let channels = res.channels
			if (channels) results.set(channels)
		})
	}

	const cursor = sig(0)

	const cursor_next = () => {
		console.log(cursor())
		if (cursor() < results().length - 1) cursor.set(cursor() + 1)
		else cursor.set(0)
	}

	const cursor_prev = () => {
		console.log(cursor())
		if (cursor() > 0) cursor.set(cursor() - 1)
		else cursor.set(results().length - 1)
	}

	eff_on(results, () => {
		if (cursor() > results().length - 1) cursor.set(results().length - 1)
	})

	const onKeydown = (e) => {
		console.log(e.key)
		// if (!open()) return
		if (e.key === "Escape") open.set(false)
		if (e.key === "Enter") {
			page("/" + results()[0].slug)
			setTimeout(() => open.set(false), 100)
		}
		if (e.key === "ArrowDown") cursor_next()
		if (e.key === "ArrowUp") cursor_prev()
	}

	let placeholder = "paste channel link or search channel"

	let result = (channel, i) => {
		let color = mem(() => cursor() === i() ? "color: red" : "")
		return html`
			div
				button [style = ${color} onclick=${() => page("/" + channel.slug)}] -- ${channel.title}`
	}

	return html`
			input.search [ oninput=${onInput} onkeydown=${onKeydown} placeholder=${placeholder} ]
			.search-results
				each of ${results} as ${result}
`
} 
