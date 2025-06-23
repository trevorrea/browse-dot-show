import JSON5 from 'json5'

// Import the JSONC file as raw text
const jsonc = `{
    "sites": {
        // sites/origin-sites/listenfairplay
        // One of 5 sites deployed by the root repository, https://github.com/jackkoppa/browse-dot-show
        // First site created (Football Clichés being the original use case that inspired the project),
        // prior to the multi-site architecture that browse-dot-show now supports 
        "listenfairplay": {
            "isOriginSite": true,
            "name": "Listen, Fair Play",
            "podcastFullDescription": "Football Clichés | Deconstructing the gloriously unique language of football – the words, the phrases and the tiny things you didn't think you cared about – with Adam Hurrey, Charlie Eccleshare & David Walker.",
            "url": "https://listenfairplay.com",
            "imageUrl": "https://listenfairplay.com/assets/web-app-manifest-512x512.png"
        },
        // sites/origin-sites/hardfork
        // One of 5 sites deployed by the root repository, https://github.com/jackkoppa/browse-dot-show
        "hardfork": {
            "isOriginSite": true,
            "name": "[browse.show] Hard Fork",
            "podcastFullDescription": "Hard Fork | Each week, journalists Kevin Roose and Casey Newton explore and make sense of the rapidly changing world of tech.",
            "url": "https://hardfork.browse.show",
            "imageUrl": "https://hardfork.browse.show/assets/web-app-manifest-512x512.png"
        },
        // sites/origin-sites/naddpod
        // One of 5 sites deployed by the root repository, https://github.com/jackkoppa/browse-dot-show
        "naddpod": {
            "isOriginSite": true,
            "name": "[browse.show] NADDPOD",
            "podcastFullDescription": "Not Another D&D Podcast | An actual-play TTRPG podcast hosted by Brian Murphy, Emily Axford, Jake Hurwitz and Caldwell Tanner.",
            "url": "https://naddpod.browse.show",
            "imageUrl": "https://naddpod.browse.show/assets/web-app-manifest-512x512.png"
        },
        // sites/origin-sites/claretandblue
        // One of 5 sites deployed by the root repository, https://github.com/jackkoppa/browse-dot-show
        "claretandblue": {
            "isOriginSite": true,
            "name": "[browse.show] Claret & Blue",
            "podcastFullDescription": "Claret & Blue | An Aston Villa Podcast. Hosted by Dan Rolinson, Mat Kendrick & John Townley. UTV!",
            "url": "https://claretandblue.browse.show",
            "imageUrl": "https://claretandblue.browse.show/assets/web-app-manifest-512x512.png"
        },
        // sites/origin-sites/searchengine
        // One of 5 sites deployed by the root repository, https://github.com/jackkoppa/browse-dot-show
        "searchengine": {
            "isOriginSite": true,
            "name": "[browse.show] Search Engine",
            "podcastFullDescription": "Search Engine | The podcast that tries to answer the questions that keep you up at night. A podcast made by humans that provides the answers that neither artificial intelligence nor actual search engines really can.",
            "url": "https://searchengine.browse.show",
            "imageUrl": "https://searchengine.browse.show/assets/web-app-manifest-512x512.png"
        }
    }
}`

// Parse using JSON5
const deployedSites = JSON5.parse(jsonc)

export default deployedSites 