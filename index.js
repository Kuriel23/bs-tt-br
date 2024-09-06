import { Bot, RichText } from "@skyware/bot";
import axios from "axios";
import * as dotenv from "dotenv";
import { scheduleJob } from "node-schedule";
import * as process from "node:process";

dotenv.config();

const agent = new Bot({ langs: ["pt"] }).login({
	identifier: process.env.BLUESKY_USERNAME,
	password: process.env.BLUESKY_PASSWORD,
});

function start() {
	axios
		.get("https://betterbluesky.nemtudo.me/api/trends")
		.catch(() => {
			return 0;
		})
		.then(async (res) => {
			if (res.data.head.length > 0)
				await axios
					.post(
						"https://prismatic-squirrel-9e8dca.netlify.app/api/cards/trendingTT",
						res.data.data.slice(0, 10),
						{
							responseType: "text",
							responseEncoding: "base64",
						},
					)
					.then(async (response) => {
						const buffer = Buffer.from(response.data, "base64");
						const richText = new RichText().text(
							`🛫 ${res.data.head.length > 10 ? "10" : res.data.head.length} TRENDING TOPICS PARA VOCÊ ACOMPANHAR:\n\n`,
						);
						res.data.data.slice(0, 5).map((element, i) => {
							richText.text(`${i + 1}. `);

							element.text.startsWith("#")
								? richText.tag(element.text)
								: element.text.startsWith("@")
									? richText.link(
											element.text,
											`https://bsky.app/profile/${element.text.replace("@", "")}`,
										)
									: richText.text(element.text);

							return richText.text(
								`- ${new Intl.NumberFormat("en", { notation: "compact" }).format(element.count)} posts\n`,
							);
						});
						richText.text("++");
						await agent
							.post({
								text: richText,
								images: [
									{
										alt: "10 tendências listadas por imagem.",
										data: new Blob([buffer], { type: "image/png" }),
										aspectRatio: {
											width: 800,
											height: 1900,
										},
									},
								],
							})
							.then(async (element) => {
								await element.like();

								const richText2 = new RichText();
								res.data.data.slice(5, 10).map((element, i) => {
									richText2.text(`${i + 6}. `);

									element.text.startsWith("#")
										? richText2.tag(element.text)
										: element.text.startsWith("@")
											? richText2.link(
													element.text,
													`https://bsky.app/profile/${element.text.replace("@", "")}`,
												)
											: richText2.text(element.text);

									return richText2.text(
										`- ${new Intl.NumberFormat("en", { notation: "compact" }).format(element.count)} posts\n`,
									);
								});
								await element
									.reply({
										text: richText2,
									})
									.then(async (post2) => {
										await post2.like();
										console.log("✅ [GATEWAY] • Reproduzido com sucesso");
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
});
