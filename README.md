# Markminion

Markminion is a powerful web application that converts webpages to Markdown format, making it easy to feed data to Language Learning Models (LLMs). This tool is designed to simplify the process of extracting and formatting web content for use in various AI and natural language processing tasks.

## Features

- Convert any web page to Markdown format
- Option for detailed response to capture more content
- Ability to crawl and convert subpages (up to 10 links)
- Unnecessary content filter using AI (optional)
- Support for both plain text and JSON output
- Built-in rate limiting for API usage
- Caching mechanism to improve performance
- Special handling for Twitter/X.com tweets

## Architecture

Markminion is built using modern web technologies and is designed to run on Cloudflare Workers. Here's an overview of the main components:

1. **Frontend**: A simple HTML/CSS/JavaScript interface that allows users to input a URL and set conversion options.

2. **Backend**: A Cloudflare Worker that handles the main logic:
   - URL validation
   - Web page fetching and processing
   - Markdown conversion
   - Caching
   - Rate limiting

3. **External Services**:
   - Cloudflare KV for caching
   - AI model (cf-mistral) for content filtering

## API Usage

Markminion can be used as an API by making a GET request to the root endpoint with the following parameters:

- `url` (required): The URL of the web page to convert
- `detailed` (optional): Set to `true` for a more detailed response
- `subpage` (optional): Set to `true` to crawl and convert subpages
- `unnecessaryfilter` (optional): Set to `true` to apply AI-based content filtering
- `contenttype`: Set to `text/plain` or `application/json` to specify the desired output format

Example API call:

```bash
curl 'https://markminion.dhruvvakharwala.dev/?url=https://example.com&subpage=true'
