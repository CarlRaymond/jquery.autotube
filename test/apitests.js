// Tests interation with YouTube data API
// The YouTube video data API key, ytDataApiKey, is defined outside this file. You must get your own.
 
var ytVideoApiUrl = "https://www.googleapis.com/youtube/v3/videos";


QUnit.test("jsonResult", function(assert) {
	var params = {
		id: 'tLt5rBfNucc',
		key: ytDataApiKey,
		part: 'snippet,contentDetails'
		};
	
	var testDone = assert.async();
	
	$.get(ytVideoApiUrl, params)
		.fail(function(jqXHR, textStatus, errorThrown) {
			assert.ok(false, "AJAX request returned error");
		})
		.done(function(result) {

			// Result contains (among other properties)
			var expected = {
				kind: "youtube#videoListResponse",
					"items": [
 					{
			  		"kind": "youtube#video",
						"id": "tLt5rBfNucc",
						"snippet": {
			    			"title": "Cat Wearing A Shark Costume Cleans The Kitchen On A Roomba.  Shark Week. #SharkCat cleaning Kitchen!",
							"thumbnails": {
								"default": {
									"url": "https://i.ytimg.com/vi/tLt5rBfNucc/default.jpg",
									"width": 120,
									"height": 90
									}
								}
							},
						"contentDetails": {
							"duration": "PT1M55S"
						}
						}
					]
				};
		
			assert.equal(result.kind, "youtube#videoListResponse");
			assert.equal(result.items[0].kind, "youtube#video");
			assert.equal(result.items[0].id, params.id);
			assert.equal(result.items[0].snippet.title, "Cat Wearing A Shark Costume Cleans The Kitchen On A Roomba.  Shark Week. #SharkCat cleaning Kitchen!");
			assert.equal(result.items[0].snippet.thumbnails['default'].url, "https://i.ytimg.com/vi/tLt5rBfNucc/default.jpg");
			assert.equal(result.items[0].contentDetails.duration, "PT1M55S");
			testDone();
		});
	
	
});