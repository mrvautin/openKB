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

// Show KB meta data including published date, last updated date and author
config.settings.show_kb_meta = true;

// whether users are allowed to suggest articles without a login
config.settings.suggest_allowed = true;

// Controls whether the authors email address is displayed in the meta. Needs "config.settings.show_kb_meta" set to true
config.settings.show_author_email = true;

// Comma separated list of tags to be featured on the home page
config.settings.featured_tags = "help,info,kb";

// Controls how many articles are being displayed on the home page for each featured tag
config.settings.featured_tags_limit = 5;

module.exports = config;