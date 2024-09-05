import { AtpAgent } from "@atproto/api";
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
				await agent
					.post({
						text: `🛫 ${res.body.head.length > 10 ? "10" : res.body.head.length} TRENDING TOPICS PARA VOCÊ ACOMPANHAR:\n\n${res.body.data
							.sort((a, b) => b.count - a.count)
							.slice(0, 10)
							.map(
								(element, i) =>
									`${i + 1}. ${element.text} - ${new Intl.NumberFormat("en", { notation: "compact" }).format(element.count)}`,
							)
							.join("\n")}`,
						langs: ["pt"],
					})
					.then(async (element) => {
						await agent.like(element.uri, element.cid);
					})
					.catch((err) => {
						return console.log(err);
					});
		});
}

console.log("✅ [GATEWAY] • Iniciado");

scheduleJob("*/30 * * * *", async () => {
	console.log("❇️ [GATEWAY] • Reproduzindo novo post");
	start();
	console.log("✅ [GATEWAY] • Reproduzido com sucesso");
});
