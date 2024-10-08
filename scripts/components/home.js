import { html, sig, mem } from '../libraries/solid_monke/solid_monke.js'
import { MD } from '../utilities/md.js';
import { SearchBar } from './search.js';

export function create_draggable(draggable_elem) {
	let isDragging = false;
	let offsetX = 0;
	let offsetY = 0;

	draggable_elem.classList.add("unselectable");
	function update_position(elem, x, y) {
		elem.style.transition = "transform 0s";
		elem.style.transform = `translate3D(${x}px, ${y}px, 0px)`;
	}

	draggable_elem.addEventListener("pointerdown", function(e) {
		isDragging = true;
		offsetX = e.clientX - draggable_elem.getBoundingClientRect().left;
		offsetY = e.clientY - draggable_elem.getBoundingClientRect().top;
	});

	draggable_elem.addEventListener("pointermove", function(e) {
		if (!isDragging) return;
		let x = e.clientX - offsetX;
		let y = e.clientY - offsetY;

		update_position(draggable_elem, x, y);
	});

	draggable_elem.addEventListener("pointerup", function() {
		isDragging = false;
	});


	draggable_elem.addEventListener("onmouseleave", function() {
		isDragging = false;
	});
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

export const Home = () => {
	return html`
			h1 -- (Welcome Page) Bootleg Are.na Playlist 
			a [href=https://github.com/caizoryan/arena_music/archive/refs/heads/main.zip]
				button -- [ Download Source ]
			div -- ${() => SearchBar(search_open)}
			.intro
				.faq
					h2 -- FAQ
					div -- ${Markdown("faq.md")}
							`
}
