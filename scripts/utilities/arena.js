let host = "https://api.are.na/v2/";


// API functions
const get_channel = async (slug, auth) => {
	return await fetch(host + `channels/${slug}?per=100&force=true`, {
		headers: {
			Authorization: `Bearer ${auth}`,
			cache: "no-store",
			"Cache-Control": "max-age=0, no-cache",
			referrerPolicy: "no-referrer",
		},
	})
		.then((response) => {
			return response.json();
		})
		.then((data) => {
			return data;
		});
};

const get_block = async (id) => {
	return await fetch(host + "blocks/" + id, {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "GET",
	}).then((res) => res.json());
};

const add_block = (slug, title, content) => {
	fetch(host + "channels/" + slug + "/blocks", {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "POST",
		body: JSON.stringify({
			content: content,
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			let block_id = data.id;
			// TODO: better way to do this
			if (title !== "") update_block(block_id, { title: title }, slug);
		});
};

const add_block_multiple = (slugs, title, content) => {
	let first_slug = slugs.shift();
	fetch(host + "channels/" + first_slug + "/blocks", {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "POST",
		body: JSON.stringify({
			content: content,
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			let block_id = data.id;

			// TODO: better way to do this
			if (title !== "") update_block(block_id, { title: title }, first_slug);

			console.log("to add " + block_id + " to " + slugs);

			slugs.forEach((slug) => {
				let x = connect_block(slug, block_id);
				console.log(x);
			});
		});
};

const update_block = (block_id, body, slug, fuck = false) => {
	fetch(host + `blocks/${block_id}`, {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "PUT",
		body: JSON.stringify(body),
	}).then(() => {
		if (fuck) {
			fuck_refresh(slug);
		} else {
			refresh_journal(slug);
		}
	});
};

const connect_block = async (channel_slug, block_id, auth) => {
	return await fetch(host + "channels/" + channel_slug + "/connections", {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "POST",
		body: '{"connectable_id":"' + block_id + '","connectable_type":"Block"}',
	}).then((res) => {
		let r = res.json();
		return r;
	});
};

const move_connection = (cur_slug, new_slug, block_id) => {
	connect_block(new_slug, block_id).then(() => {
		disconnect_block(cur_slug, block_id);
	});
};

const disconnect_block = (slug, id, auth) => {
	return fetch(host + "channels/" + slug + "/blocks/" + id, {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "DELETE",
	});
};

const fuck_refresh = (slug) => {
	fetch(host + "channels/" + slug + "/blocks", {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "POST",
		body: JSON.stringify({
			content: "temp",
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			let block_id = data.id;
			disconnect_block(slug, block_id);
		});
};

const get_comments = async (block_id) => {
	let comments = await fetch(host + `blocks/${block_id}/comments`, {
		headers: {
			Authorization: `Bearer ${auth}`,
			cache: "no-store",
			"Cache-Control": "max-age=0, no-cache",
			referrerPolicy: "no-referrer",
		},
	}).then((response) => response.json());

	return comments;
};

const get_group_channels = async (slug, auth) => {
	return fetch("https://api.are.na/v2/groups/" + slug + "/channels?per=100&sort=position&direction=desc", {
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + auth,
		},
		method: "GET",
	})
		.then((res) => res.json())
		.then((res) => res)
}


export let tinyApi = {
	get_channel,
	get_group_channels,
	connect_block,
	disconnect_block,
}
