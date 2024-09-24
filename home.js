import { html, mut, sig, mem, eff_on, mounted } from './solid_monke/solid_monke.js'
import { MD } from './md.js';
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
const Card = (text, open, classes) => {
	let close = () => open.set(false)
	let _class = mem(() => (open() ? "card open unselectable" : "card") + " " + classes)

	return html`
		div [class=${_class} id=testy]
		  button [onclick=${close}] -- [Close]
			div -- ${MD(text)} 
		`
}

const what_is_this = () => {
	let open = sig(false)
	let toggleEditor = () => open.set(!open())

	let card = sig("")

	fetch("./pages/what-is-this.md")
		.then((res) => res.text())
		.then((res) => card.set(Card(res, open, "one")))


	return html`
		div -- ${card}
		h4.pointer [onclick=${toggleEditor}] -- What is this?
`
}

const how_do_i_make_a_playlist = () => {
	let open = sig(false)
	let toggleEditor = () => open.set(!open())

	let card = sig("")

	fetch("./pages/how-do-i-make-a-playlist.md")
		.then((res) => res.text())
		.then((res) => card.set(Card(res, open, "two")))

	return html`
		div -- ${card}
		h4.pointer [onclick=${toggleEditor}] -- How do I make a playlist?
	`
}

const search_open = sig(true)


export const Home = () => {
	return html`
		.channel
			.header
					.title -- (Welcome Page) Bootleg Are.na Playlist 
				a [href=https://github.com/caizoryan/arena_music/archive/refs/heads/main.zip]
					button -- [ Download Source ]
			div -- ${() => SearchBar(search_open)}
			.intro
				.faq
					h2 -- FAQ
					ul
						li -- ${what_is_this}
						li -- ${how_do_i_make_a_playlist}
						li
							h4.pointer -- How do I CSS this playlist?
						li	
							h4 -- TIPS, TRICKS and Miscellaneous
							p
								span.rounded -- CSS Cookbook
							p
								span.rounded -- Evading Youtube Ads
							p
								span.rounded -- Notes on Alternative Media Economies`
}
