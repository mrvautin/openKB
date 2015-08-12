var config = {};

config.settings = {};

// sets the number of results shown on the home page
config.settings.num_top_results = 10;

// sets whether the view count will be shown next to the top results on the homepage
config.settings.show_view_count = true;

// sets the website title
config.settings.website_title = "openKB";

// If set to "true", this locks down all pages of the blog and requires an authenticated user
config.settings.password_protect = false;

module.exports = config;