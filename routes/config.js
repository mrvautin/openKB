var config = {};

config.settings = {};

// sets the number of results shown on the home page
config.settings.num_top_results = 10;

// sets the global date formatting. Uses moment.js date formatting, see more here: http://momentjs.com/docs/#/displaying/
config.settings.date_format = 'DD/MM/YYYY h:mmA';

// sets whether the view count will be shown next to the top results on the homepage/search
config.settings.show_view_count = true;

// sets whether the published date will be shown next to the results on the homepage/search
config.settings.show_published_date = true;

config.settings.sort_by = {field: 'kb_viewcount', order: -1}; // see below:
// field options are: 'kb_published_date', 'kb_viewcount', 'kb_last_updated'
// order options are: -1 or 1

// sets the website title
config.settings.website_title = 'openKB';

// sets the website theme (themes are located in /public/themes/<folder name>)
//config.settings.theme = 'twitter';

// sets whether to show the featured articles
config.settings.show_featured_articles = true;

// sets whether to show the featured articles sidebar when viewing the artcile
config.settings.show_featured_in_article = false;

// if featured articles enabled, this is how many are returned
config.settings.featured_articles_count = 4;

// If set to "true", this locks down all pages of the blog and requires an authenticated user
config.settings.password_protect = false;

// Show KB meta data including published date, last updated date and author
config.settings.show_kb_meta = true;

// whether users are allowed to suggest articles without a login
config.settings.suggest_allowed = true;

// Controls whether the authors email address is displayed in the meta. Needs "config.settings.show_kb_meta" set to true
config.settings.show_author_email = true;

// Controls whether the enable mermaid charts
config.settings.enable_mermaid_charts = false;

module.exports = config;
