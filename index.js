import { AtpAgent } from "@atproto/api";
import * as dotenv from "dotenv";
import { scheduleJob } from "node-schedule";
import * as process from "node:process";
import { get } from "superagent";

dotenv.config();

const agent = new AtpAgent({
	service: "https://bsky.social",
});

async function start() {
	await agent.login({
		identifier: process.env.BLUESKY_USERNAME,
		password: process.env.BLUESKY_PASSWORD,
	});

	get("https://betterbluesky.nemtudo.me/api/trends")
		.end(async (err, res) => {
			if (err) return 0;

			await agent
				.post({
					text: `🛫 ${res.body.head.length > 10 ? "10" : res.body.head.length} TRENDING TOPICS PRA VOCÊ ACOMPANHAR:\n\n${res.body.data
						.slice(0, 10)
						.sort((a, b) => b.count - a.count)
						.map(
							(element, i) =>
								`${i + 1}. ${element.text} - ${Math.round(element.count)} posts`,
						)
						.join("\n")}`,
					langs: ["pt"],
				})
				.catch((err) => {
					return console.log(err);
				});
		});
}

scheduleJob("*/30 * * * *", async () => {
	start();
});
