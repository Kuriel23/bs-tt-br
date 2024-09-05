import { AtpAgent } from "@atproto/api";
import axios from "axios";
import * as dotenv from "dotenv";
import { scheduleJob } from "node-schedule";
import * as process from "node:process";
import superagent from "superagent";

dotenv.config();

const agent = new AtpAgent({
	service: "https://bsky.social",
});

async function start() {
	await agent.login({
		identifier: process.env.BLUESKY_USERNAME,
		password: process.env.BLUESKY_PASSWORD,
	});

	superagent
		.get("https://betterbluesky.nemtudo.me/api/trends")
		.end(async (err, res) => {
			if (err) return 0;
			if (res.body.head.length > 0)
				await axios
					.post(
						"https://prismatic-squirrel-9e8dca.netlify.app/api/cards/trendingTT",
						res.body.data.sort((a, b) => b.count - a.count).slice(0, 10),
						{
							responseType: "text",
							responseEncoding: "base64",
						},
					)
					.then(async (response) => {
						const buffer = Buffer.from(response.data, "base64");
						const { data } = await agent.uploadBlob(buffer);
						await agent
							.post({
								text: `🛫 ${res.body.head.length > 10 ? "10" : res.body.head.length} TRENDING TOPICS PARA VOCÊ ACOMPANHAR:\n\n${res.body.data
									.sort((a, b) => b.count - a.count)
									.slice(0, 5)
									.map(
										(element, i) =>
											`${i + 1}. ${element.text} - ${new Intl.NumberFormat("en", { notation: "compact" }).format(element.count)} posts`,
									)
									.join("\n")} ++`,
								langs: ["pt"],
								embed: {
									$type: "app.bsky.embed.images",
									images: [
										{
											alt: "10 tendências listadas por imagem.",
											image: data.blob,
											aspectRatio: {
												width: 800,
												height: 1900,
											},
										},
									],
								},
							})
							.then(async (element) => {
								await agent.like(element.uri, element.cid);
								await agent
									.post({
										text: `${res.body.data
											.sort((a, b) => b.count - a.count)
											.slice(5, 10)
											.map(
												(element, i) =>
													`${i + 6}. ${element.text} - ${new Intl.NumberFormat("en", { notation: "compact" }).format(element.count)} posts`,
											)
											.join("\n")}`,
										langs: ["pt"],
										reply: {
											root: {
												uri: element.uri,
												cid: element.cid,
											},
											parent: {
												uri: element.uri,
												cid: element.cid,
											},
										},
									})
									.then(async (post2) => {
										await agent.like(post2.uri, post2.cid);
									});
							})
							.catch((err) => {
								return console.log(err);
							});
					});
		});
}

console.log("✅ [GATEWAY] • Iniciado");

scheduleJob("*/30 * * * *", async () => {
	console.log("❇️ [GATEWAY] • Reproduzindo novo post");
	start();
	console.log("✅ [GATEWAY] • Reproduzido com sucesso");
});
