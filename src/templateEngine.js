// Very simple template engine adapted from John Resig's Secrets of the
// Javascript Ninja, and http://ejohn.org/blog/javascript-micro-templating.
// Good luck figuring it out (the original was worse).
//
// The engine has one public method, Renderer(), which takes one argument
// that specifies the template text. It can take one of three forms:
// 1. The DOM id of a template in the HTML document (enclosed in a <script> tag)
// 2. A URL to a template file,
// 3. The literal template text itslef.
//
// In each case, Renderer returns a deferred object that resolves to a function
// which is invoked on a data object to render a template.
// Compiled templates loaded by id or url are cached, and so can be repeatedly
// invoked with little additional overhead. Templates created by passing the
// template text as a string literal are not cached.
//
// In all cases, Renderer returns a deferred, which resolves to the rendering
// function. Invoke the renderer with a data object to instantiate the template.
//
// Case 1: Compile a template in markup, by enclosing it in a <script> tag
// to prevent the browser from rendering the template text directly:
//
//	<script id="inlineTemplate'' type="text/template">
//	<p>The {{=weather}} in {{=locale}}... </p> 
//  </script>
// ...
// var engine = new TemplateEngine();
// var defRenderer = engine.template("inlineTemplate");
// defRenderer.done(function(template) {
//		var result = template({ weather: "rain", locale: "Spain" });
//		... do something with rendered markup.
// };
//
// Case 2: Compile a template fetched by URL:
//
// var engine = new TemplateEngine();
// var defRenderer = engine.template("/some/url/to/myTemplate.html");
// defRenderer.done(function(template) {
//		var result = template({ weather: "rain", locale: "Spain" });
//		... do something with rendered markup.
// });
// 
//
// Case 3: Compile a literal template:
//
// var engine = new TemplateEngine();
// var defRenderer = engine.template("<p>The {{=weather}} in {{=locale}}... </p>");
// derRenderer.done(function(template) {
// 		var result = template({ weather: "rain", locale: "Spain" });
//		... do something with the rendered markup.
// });

function TemplateEngine() {

	// Matches HTML4 compliant id names. HTML5 is more lax,
	// so lax that it can't be done with a reasonable RE.
	// So this is fine.
	var idexpr = /^[A-Za-z][A-Za-z0-9.:_-]*$/;

	// Matches a "url", which is anything that starts with a slash
	var urlexpr = /^\/.*/;

	// Cache for loaded templates
	var cache = {};

	// Invoked to compile template text into a function
	var compile = function(text) {
		// Compile a rendering function using
		// Function constructor and buttload of string replacements
		return new Function("obj",
			"var p=[], print=function() { p.push.apply(p, arguments); };" +
			"with(obj) { p.push('" +
			text
				.replace(/[\r\t\n]/g, " ")
				.split("{{").join("\t")
				.replace(/((^|}})[^\t]*)'/g, "$1\r")
				.replace(/\t=(.*?)}}/g, "',$1,'")
				.split("\t").join("');")
				.split("}}").join("p.push('")
				.split("\r").join("\\'") +
			"');} return p.join('');");
	};

	// Returns a deferred that resolves to a template renderer function. Execute the function
	// with a data object to instantiate the template.
	// The specifier can be the id of a script tag containing the template, or a url
	// to fetch the template from, or the template text itself.
	this.template = function(spec) {
		var def = $.Deferred();
		var template;

		// Template already cached?
		if (cache[spec]) {
			def.resolve(cache[spec]);
			return def;
		}

		// If id passed, get template from DOM
		if (idexpr.test(spec)) {
			var $specNode = $("#" + spec);
			if ($specNode.length === 0)
				throw('Template not found: "' + spec + '". Use the id of a script block (of type "text/html") or a url to an external HTML file containing the template.');
			template = compile($specNode.html());
			cache[spec] = template;
			def.resolve(template);
			return def;			
		}

		// If url passed, load template AJAXically.
		if (urlexpr.test(spec)) {
			var req = $.ajax(spec, { dataType: "html"});
			var compiled = req.then(function(text) {
				template = compile(text);
				cache[spec] = template;
				return template;
			});

			req.fail(function (jqXHR, textStatus, errorThrown ) {
				// Can't throw here (who would catch it?)
				if (window.console) {
					console.log('Error fetching template "' + spec + '": ' + errorThrown); 
				}
			});

			return compiled;
		}

		// Otherwise, spec is raw template text. Compile into a renderer, but don't cache.
		template = compile(spec);
		return def.resolve(template);
	};

}
