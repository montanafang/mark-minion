export const HTML = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Web to Markdown Converter</title>
		<script src="https://cdn.tailwindcss.com"></script>
		<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
		<style>
			body {
				font-family: 'Inter', sans-serif;
			}
		</style>
	</head>
	<body class="bg-gray-100">
		<div class="container mx-auto max-w-2xl px-4 py-8">
			<h1 class="text-4xl font-bold mb-2">Web to Markdown Converter</h1>
			<p class="text-gray-600 mb-8">Convert any web page to Markdown for use with language models.</p>

			<form class="space-y-6">
				<div>
					<label for="url" class="block text-sm font-medium text-gray-700 mb-1">URL</label>
					<input
						type="url"
						id="url"
						name="url"
						placeholder="Enter a web page URL"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Detailed Response</span>
						<label class="switch">
							<input type="checkbox" class="sr-only peer" />
							<span class="slider round bg-gray-200 peer-checked:bg-blue-600"></span>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Crawl Subpages</span>
						<label class="switch">
							<input type="checkbox" class="sr-only peer" />
							<span class="slider round bg-gray-200 peer-checked:bg-blue-600"></span>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Unnecessary Filter</span>
						<label class="switch">
							<input type="checkbox" class="sr-only peer" />
							<span class="slider round bg-gray-200 peer-checked:bg-blue-600"></span>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Content Type</span>
						<div class="flex space-x-2">
							<button type="button" id="textBtn" class="px-3 py-1 bg-black text-white rounded-md content-type-btn">Text</button>
							<button type="button" id="jsonBtn" class="px-3 py-1 bg-white border border-gray-300 rounded-md content-type-btn">JSON</button>
						</div>
					</div>
				</div>

				<button type="submit" class="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition duration-300">
					Convert
				</button>
			</form>

			<div class="mt-8 bg-white p-6 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-4">API Usage</h2>
				<p class="mb-4">
					To use this as an API, make a GET request to <code class="bg-gray-100 px-1 py-0.5 rounded">/</code> with the following parameters:
				</p>
				<ul class="list-disc pl-5 space-y-2 mb-4">
					<li><code class="font-semibold">url</code>: The URL of the web page to convert.</li>
					<li><code class="font-semibold">detailed</code>: (optional) Set to true to get a more detailed response.</li>
					<li><code class="font-semibold">subpage</code>: (optional) Set to true to crawl and convert all subpages.</li>
					<li><code class="font-semibold">unnecessaryfilter</code>: (optional) Set to true to apply a language model filter.</li>
					<li>
						<code class="font-semibold">contenttype</code>: Set to text/plain or application/json to specify the desired output
						format.
					</li>
				</ul>
				<p class="font-medium mb-2">Example:</p>
				<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto">
$ curl 'https://markminion.dhruvvakharwala.dev/?url=https://example.com&contenttype=text/plain'
            </pre
				>
			</div>
		</div>

		<style>
			.switch {
				position: relative;
				display: inline-block;
				width: 48px;
				height: 24px;
			}

			.slider {
				position: absolute;
				cursor: pointer;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				transition: 0.4s;
				border-radius: 34px;
			}

			.slider:before {
				position: absolute;
				content: '';
				height: 20px;
				width: 20px;
				left: 2px;
				bottom: 2px;
				background-color: white;
				transition: 0.4s;
				border-radius: 50%;
			}

			input:checked + .slider:before {
				transform: translateX(24px);
			}
		</style>

		<script>
			document.addEventListener('DOMContentLoaded', function () {
				const textBtn = document.getElementById('textBtn');
				const jsonBtn = document.getElementById('jsonBtn');

				function toggleContentType(activeBtn, inactiveBtn) {
					activeBtn.classList.remove('bg-white', 'border', 'border-gray-300');
					activeBtn.classList.add('bg-black', 'text-white');

					inactiveBtn.classList.remove('bg-black', 'text-white');
					inactiveBtn.classList.add('bg-white', 'border', 'border-gray-300');
				}

				textBtn.addEventListener('click', function () {
					toggleContentType(textBtn, jsonBtn);
				});

				jsonBtn.addEventListener('click', function () {
					toggleContentType(jsonBtn, textBtn);
				});
			});
		</script>
	</body>
</html>

`