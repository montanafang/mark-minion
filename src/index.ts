import * as cheerio from "cheerio";
import { Tweet } from 'react-tweet/api'
import { HTML } from "./webResponse";

export default {
	async fetch(req: Request, env: Env) {
		const ip = req.headers.get('cf-connecting-ip');
		if (!(env.BACKEND_SECURITY_TOKEN === req.headers.get('Authorization')?.replace('Bearer ', ''))) {
			const url = new URL(req.url).searchParams.get('url');
			if(!url) {
				const helper = new Helpers()
				return helper.intialResponse()
			}
			const { success } = await env.RENDER_RATE_LIMITER.limit({ key: ip });

			if (!success) {
				return new Response('Rate limit exceeded', { status: 429 });
			}
		}
		const obj = new Renderer(env)
		const resp = obj.fetch(req)

		return resp
	},
};

export class Renderer {
	env: Env;
	helper: Helpers;
	req: Request | undefined;
	llmFilter: boolean;
	token = '';

	constructor(env: Env) {
		this.env = env;
		this.helper = new Helpers();
		this.llmFilter = false;
		this.req = undefined
	}
	async fetch(req: Request) {
		this.req = req

		if (!(req.method === 'GET')) {
			return new Response('Method Not Allowed', { status: 405 });
		}

		// Rate Limiter
		const ipAddress = req.headers.get('cf-connecting-ip') || ""
		if (!(this.env.BACKEND_SECURITY_TOKEN === req.headers.get('Authorization')?.replace('Bearer ', ''))) {
			const { success } = await this.env.RENDER_RATE_LIMITER.limit({ key: ipAddress })

		if (!success) {
			return new Response('Rate limit exceeded', { status: 429 });
		}
		}


		const url = new URL(req.url).searchParams.get('url');
		const enableDetailedResponse = new URL(req.url).searchParams.get('detailed') === 'true';
		const subpageCrawl = new URL(req.url).searchParams.get('subpage') === 'true';
		const unnecessaryFilter = new URL(req.url).searchParams.get('unnecessaryfilter') === 'true';
		const contentType = req.headers.get('content-type') === 'application/json' ? 'json' : 'text';
		const token = req.headers.get('Authorization')?.replace('Bearer ', '');

		this.token = token ?? '';
		this.llmFilter = unnecessaryFilter

		if (contentType === 'text' && subpageCrawl) {
			return new Response('Error: Crawl subpages can only be enabled with JSON content type', { status: 400 });
		}

		if (!url) {
			return new Response('Provide an URL', { status: 400 });
		}
		if (!this.helper.isValidUrl(url)) {
			return new Response('Invalid URL', { status: 400 });
		}

		return subpageCrawl ? this.crawlSubPages(url, enableDetailedResponse) : this.crawlSinglePage(url, enableDetailedResponse, contentType)
	}

	async getWebsiteMarkdown({
		urls,
		enableDetailedResponse,
		env,
	}: {
		urls: string[];
		enableDetailedResponse: boolean;
		env: Env;
	}) {
		return await Promise.all(
			urls.map(async (url) => {
				const id = url + (enableDetailedResponse ? '-detailed' : '') + (this.llmFilter ? '-llm' : '');
				const cached = await env.BROWSER_KV.get(id);

				if (url.startsWith('https://x.com') || url.startsWith('https://twitter.com')) {
					const tweetID = url.split('/').pop();
					if (!tweetID) return { url, md: 'Invalid tweet URL' };

					const cached = await env.BROWSER_KV.get(tweetID);
					if (cached) return { url, md: cached };

					const tweet = await this.helper.handleTweet(tweetID);
					if (!tweet || typeof tweet !== 'object' || tweet.text === undefined) return { url, md: 'Tweet not found' };

					const tweetMd = `Tweet from @${tweet.user?.name ?? tweet.user?.screen_name ?? 'Unknown'}

					${tweet.text}
					Images: ${tweet.photos ? tweet.photos.map((photo) => photo.url).join(', ') : 'none'}
					Time: ${tweet.created_at}, Likes: ${tweet.favorite_count}, Retweets: ${tweet.conversation_count}

					raw: ${JSON.stringify(tweet)}`;

					await env.BROWSER_KV.put(tweetID, tweetMd)

					return { url, md: tweetMd }
				}
				let md = cached ?? (await this.helper.fetchAndProcessPage(url, enableDetailedResponse));

				if (this.llmFilter && !cached) {
					const AgentResponse = (
						await env.AI_AGENT.run('@cf/mistral/mistral-7b-instruct-v0.1', {
							prompt: `You are an AI assistant whose work is to convert webpage content into markdown at the same time filtering out unnecessary information. Follow the given guidelines:
						Remove any inappropriate content, ads, or irrelevant information
						If unsure about including any content, keep it aside.
						Make the content clean, readable markdown.
						Input: ${md}
						Output: \`\`\`markdown\n`,
						temperature: 0.2
						})) as { response: string }

					md = AgentResponse.response
				}
				await env.BROWSER_KV.put(id, md, { expirationTtl: 1800 })
				return { id, md }
			}))
	}


	async crawlSinglePage(url: string, enableDetailedResponse: boolean, contentType: string) {
		const md = await this.getWebsiteMarkdown({
			urls: [url],
			enableDetailedResponse,
			env: this.env
		})
		if (contentType === 'json') {
			return new Response(JSON.stringify(md), { status: 200 });
		} else {
			return new Response(md[0].md, {
				status: 200,
			});
		}
	}
	async crawlSubPages(baseUrl: string, enableDetailedResponse: boolean) {
		const links = await this.helper.extractLinks(baseUrl);
		const uniqueLinks = Array.from(new Set(links)).splice(0, 10);
		const md = await this.getWebsiteMarkdown({
			urls: uniqueLinks,
			enableDetailedResponse,
			env: this.env
		});

		let status = 200;

		return new Response(JSON.stringify(md), { status: status });
	}
}

export class Helpers {
	isValidUrl(url: string): boolean {
		return url.match(/(http|https):\/\/[^ "]+/) ? true : false;
	}

	async extractLinks(url: string): Promise<string[]> {
		const response = await fetch(url);
		const html = await response.text();
		const $ = cheerio.load(html);

		// Extract the base URL
		const baseUrl = new URL(url).origin;

		return $("a")
			.map((_, elem) => {
				const href = $(elem).attr("href");
				if (!href) return null;

				// Handle relative URLs
				if (href.startsWith('/')) {
					return new URL(href, baseUrl).href;
				}

				// Check if the href is from the same domain
				try {
					const hrefUrl = new URL(href);
					if (hrefUrl.origin === baseUrl) {
						return href;
					}
				} catch (e) {
					// Invalid URL, ignore
				}

				return null;
			})
			.get()
			.filter(Boolean); // Remove null values
	}

	async handleTweet(tweetId: string): Promise<Tweet> {
		const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue%3Btfw_tweet_edit_backend%3Aon%3Btfw_refsrc_session%3Aon%3Btfw_fosnr_soft_interventions_enabled%3Aon%3Btfw_show_birdwatch_pivots_enabled%3Aon%3Btfw_show_business_verified_badge%3Aon%3Btfw_duplicate_scribes_to_settings%3Aon%3Btfw_use_profile_image_shape_enabled%3Aon%3Btfw_show_blue_verified_badge%3Aon%3Btfw_legacy_timeline_sunset%3Atrue%3Btfw_show_gov_verified_badge%3Aon%3Btfw_show_business_affiliate_badge%3Aon%3Btfw_tweet_edit_frontend%3Aon&token=4iace3gbq7`;

		const resp = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
				Accept: 'application/json',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate, br',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
				'Cache-Control': 'max-age=0',
				TE: 'Trailers',
			},
		});
		const data = (await resp.json()) as Tweet;

		return data
	}

	htmlToMarkdown(html: string): string {
		const $ = cheerio.load(html);
	
		function processNode(node: any): string {
			if (node.type === 'text') {
				return node.data.replace(/\s+/g, ' ').trim() || '';
			}
	
			if (node.type !== 'tag') {
				return '';
			}
	
			const children = $(node).contents().map((_, el) => processNode(el)).get().join('');
	
			switch (node.tagName.toLowerCase()) {
				case 'h1': return `# ${children}\n\n`;
				case 'h2': return `## ${children}\n\n`;
				case 'h3': return `### ${children}\n\n`;
				case 'h4': return `#### ${children}\n\n`;
				case 'h5': return `##### ${children}\n\n`;
				case 'h6': return `###### ${children}\n\n`;
				case 'p': return `${children}\n\n`;
				case 'strong':
				case 'b': return `**${children}**`;
				case 'em':
				case 'i': return `*${children}*`;
				case 'a': return `[${children}](${$(node).attr('href')})`;
				case 'code': return `\`${children}\``;
				case 'pre': return `\`\`\`\n${children}\n\`\`\`\n\n`;
				case 'ul':
				case 'ol': return $(node).children().map((_, li) => `- ${processNode(li)}`).get().join('\n') + '\n\n';
				case 'li': return processNode($(node).contents()[0]);
				case 'img': return `![${$(node).attr('alt') || ''}](${$(node).attr('src')})\n\n`;
				case 'blockquote': return `> ${children.split('\n').join('\n> ')}\n\n`;
				case 'br': return '\n';
				case 'table': return processTable(node);
				default: return children;
			}
		}
	
		function processTable(tableNode: any): string {
			let output = "Table content:\n\n";
			const headers = $(tableNode).find('th').map((_, th) => $(th).text().trim()).get();
			if (headers.length > 0) {
				output += "Headers:\n" + headers.map(header => `- ${header}`).join('\n') + "\n\n";
			}
			$(tableNode).find('tr').each((_, row) => {
				const cells = $(row).find('td').map((_, cell) => $(cell).text().trim()).get();
				if (cells.length > 0) {
					output += "Row:\n" + cells.map(cell => `  - ${cell}`).join('\n') + "\n\n";
				}
			});
		
			return output;
		}
	
		return $('body').contents().map((_, el) => processNode(el)).get().join('').trim();
	}

	async fetchAndProcessPage(url: string, enableDetailedResponse: boolean) {
		const response = await fetch(url);
		const html = await response.text();
		const $ = cheerio.load(html);

		// Remove unwanted elements
		$('script, style, iframe, noscript').remove();

		let content = enableDetailedResponse ? $('body').html() : $('article').html() || $('main').html() || $('body').html();

		if (!content) {
			return 'No content found';
		}
		const md = this.htmlToMarkdown(content)
		return md;
	}

	intialResponse() {
		return new Response(HTML, {
			headers: {
				'content-type': 'text/html;charset=UTF-8'
			}
		})
	}
}
