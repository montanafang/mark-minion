import puppeteer from '@cloudflare/puppeteer';

export default {
	async fetch(req: Request, env: Env) {},
};

export class Browser {
	private browser: puppeteer.Browser | undefined = undefined;
	private env: Env;
	private req: Request;
	helper: Helpers;

	constructor(req: Request, env: Env) {
		this.req = req;
		this.env = env;
		this.helper = new Helpers();
	}
	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url).searchParams.get('url');
		const enableDetailedResponse = new URL(req.url).searchParams.get('detailed') === 'true';
		const subpageCrawl = new URL(req.url).searchParams.get('subpage') === 'true';
		const unnecessaryFilter = new URL(req.url).searchParams.get('unnecessaryfilter') === 'true';
		const contentType = new URL(req.url).searchParams.get('contenttype') === 'application/json' ? 'json' : 'text';

		if (!url) {
			return new Response('Please provide a URL', { status: 400 });
		}
		if (!this.helper.isValidUrl(url)) {
			return new Response('Invalid URL', { status: 400 });
		}

		return new Response('Hello World', { status: 200 });
	}
	async ifBrowser() {
		let tries = 5;
		while (tries) {
			if (!this.browser || !this.browser.isConnected()) {
				try {
					// this.browser = await puppeteer.launch();
				} catch (error) {}
			}
		}
	}
}

export class Helpers {
	isValidUrl(url: string): boolean {
		return url.match(/(http|https):\/\/[^ "]+/) ? true : false;
	}
}
