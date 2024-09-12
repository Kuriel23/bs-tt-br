import { Bot, RichText } from "@skyware/bot";
import axios from "axios";
import * as dotenv from "dotenv";
import { scheduleJob } from "node-schedule";
import * as process from "node:process";

dotenv.config();

const agent = new Bot({ langs: ["pt"] });

agent.login({
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
							`🛫 ${res.data.head.length > 10 ? "10" : res.data.head.length} TRENDING TOPICS PARA VOCÊ ACOMPANHAR:\n`,
						);
						res.data.data.slice(0, 5).map((element, i) => {
							richText.text(`\n${i + 1}. `);

							element.text.startsWith("#")
								? richText.tag(element.text.replace("\n", ""))
								: element.text.startsWith("@")
									? richText.link(
											element.text.replace("\n", ""),
											`https://bsky.app/profile/${element.text.replace("@", "")}`,
										)
									: richText.link(
											element.text.replace("\n", ""),
											`https://bs-redirect.onrender.com/search/${encodeURI(element.text.replace("\n", ""))}`,
										);

							return (
								element.count !== 0 &&
								richText.text(
									` - ${new Intl.NumberFormat("en", { notation: "compact" }).format(element.count)} posts`,
								)
							);
						});
						richText.text("\n++");
						await agent
							.post({
								text: richText,
								images: [
									{
										alt: "10 tendências/hashtags/palavras mais comentadas listadas por imagem.",
										data: new Blob([buffer], { type: "image/png" }),
										aspectRatio: {
											width: 800,
											height:
												400 +
												(res.data.head.length > 10
													? 10
													: res.data.head.length) *
													160,
										},
									},
								],
							})
							.then(async (element) => {
								await element.like();

								const richText2 = new RichText();
								res.data.data.slice(5, 10).map((element, i) => {
									richText2.text(`\n${i + 6}. `);

									element.text.startsWith("#")
										? richText2.tag(element.text.replace("\n", ""))
										: element.text.startsWith("@")
											? richText2.link(
													element.text.replace("\n", ""),
													`https://bsky.app/profile/${element.text.replace("@", "")}`,
												)
											: richText2.link(
													element.text.replace("\n", ""),
													`https://bs-redirect.onrender.com/search/${encodeURI(element.text.replace("\n", ""))}`,
												);

									return (
										element.count !== 0 &&
										richText2.text(
											` - ${new Intl.NumberFormat("en", { notation: "compact" }).format(element.count)} posts`,
										)
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

if (process.env.status === "local") start();
else
	scheduleJob("*/10 * * * *", async () => {
		console.log("❇️ [GATEWAY] • Reproduzindo novo post");
		start();
	});
