# openKB

![logo](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_logo_small.png)

![npm downloads badge](https://img.shields.io/npm/dm/openkb.svg "npm download badge")
![npm version badge](https://img.shields.io/npm/v/openkb.svg "npm version badge")
[![Build Status](https://travis-ci.org/mrvautin/openKB.svg?branch=master)](https://travis-ci.org/mrvautin/opnkb)
[![Github stars](https://img.shields.io/github/stars/mrvautin/openkb.svg?style=social&label=Star)](https://github.com/mrvautin/openkb)

openKB is a Markdown Knowledge base application (FAQ) built with [Nodejs](https://nodejs.org/) and [ExpressJS](http://expressjs.com/). The application uses an embedded database ([nedb](https://github.com/louischatriot/nedb))
by default but can also use a MongoDB server by changing the config (see below). The application is designed to be easy to use and install and based around search rather than nested categories. Simply search for what you want and select from the results.

Demo: [http://openkb.mrvautin.com](http://openkb.mrvautin.com)

### Installation

1. Clone Repository: `git clone https://github.com/mrvautin/openKB.git && cd openKB`
2. Install dependencies: `npm install`
3. Start application: `npm start`
4. Go to  [http://127.0.0.1:4444](http://127.0.0.1:4444) in your browser

### Deploy on Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/mrvautin/openKB)

### Features

- **Search**: openKB is a search based Knowledgebase (FAQ) backed by [Lunr.js](https://github.com/olivernn/lunr.js/) indexing to create the best possible results on searches.
- **Backend**: openKB uses the pure Javascript [nedb](https://github.com/louischatriot/nedb) embedded database by default or a MongoDB server.
- **Design/Themes**: openKB is meant to be simple flat design. Themes can be added by creating a theme folder within `public/themes/`. See the example theme for more information.
- **Responsive**: openKB is built using Bootstrap allowing it to be responsive and work on all devices. The `admin` can be a little difficult editing Markdown on smaller screens.
- **Mermaid**: openKB allows for [Mermaid](http://knsv.github.io/mermaid/) charts in articles.
- **Editor**: openKB uses Markdown-it which is based off the [CommonMark spec](http://spec.commonmark.org/). This allows for the very best Markdown experience.
- **Image management**: openKB allows for drag and drop of images into articles. The image is automatically uploaded to the server in the background. Google Chrome users can also paste images directly from the clipboard.

### Screenshots

**Homepage**

![Homepage](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_homepage_.png)

**Responsive**

![Responsive](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_desktop_mobile.png)

**Fully Configurable**

![Fully Configurable](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_settings.png)

**Admin editor**

![Editor](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_editor.png)

**Article view**

![Article view](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_articleview.png)

**Admin article management**

![Article filtering](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_articlefiltering.png)

**Managing files**

![Files](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_files.png)

**This is a deliberate rip from [https://twitter.com](https://twitter.com) to show an example. All design and credit goes to [https://twitter.com](https://twitter.com) and not openKB.**

![Theme](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_theme_example.png)

**Live search/typeahead**

![typeahead](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_typeahead.png)

### Admin

Visit: [http://127.0.0.1:4444/login](http://127.0.0.1:4444/login)

A new user form will be shown where a user can be created.

### Config

Most of the configuration can be done on the `/settings` page but there are some addition values which require setting manually in the `/routes/config.js` file.

|Setting|Description|
|--- |--- |
|`num_top_results`|Sets the number of results shown on the home page|
|`date_format`|Sets the global date formatting. Uses moment.js date formatting, see more here: http://momentjs.com/docs/#/displaying|
|`show_view_count`|Shows the view count next to the results on the homepage and search|
|`update_view_count_logged_in`|Updates the view count if the user is logged in, as well as for anonymous users|
|`show_published_date`|Shows the published date next to the results on the homepage and search|
|`sort_by`|The order to sort articles|
|`website_title`|The title of your website|
|`show_featured_articles`|Whether to show any articles set to featured in a sidebar|
|`show_featured_in_article`|Whether to show any articles set to featured in a sidebar when viewing an article|
|`featured_articles_count`|The number of featured articles shown|
|`theme`|The theme to use for public facing pages. Leave blank for default.|
|`password_protect`|Setting to "true" will require a user to login before viewing ANY pages|
|`show_kb_meta`|Whether to show article meta data including published date, last updated date, author etc|
|`suggest_allowed`|If enabled non authenticated users can submit article suggestions for approval|
|`show_author_email`|Controls whether the authors email address is displayed in the meta. Requires "Show article meta data" to be true.|
|`enable_mermaid_charts`|Whether to allow Mermaid charts within articles|
|`app_context`|Allows for the website to be run from a non root path. Eg: http://127.0.0.1:4444/openkb/|
|`links_blank_page`|Controls whether links within articles open a new page (tab)|
|`add_header_anchors`|Whether to add HTML anchors to all heading tags for linking within articles or direct linking from other articles|
|`typeahead_search`|Add live typeahead search results on the search inputs|
|`index_article_body`|Whether to add the body of your articles to the search index (requires restart)|
|`show_website_logo`|Controls whether to show the `website_title` text or a logo located: `/public/logo.png` (by default).|
|`website_description`|A short website description when listing the homepage URL in search engines|
|`database`|The database type to use. See **Database setup**|
|`google_analytics`|Adds Google Analytics to public facing pages. Include the entire code from Google including the &lt;script&gt; tags.|

**Data sorting**
You can control the sort order or articles. You can sort on anything but popular fields are `kb_viewcount`,  `kb_published_date`,  `kb_last_updated` or `kb_votes`

Setting the `sort_by` field in the `config.js` like so:

``` javascript
{field: 'kb_viewcount', order: -1};
```

Valid `order` values are: `-1` or `1`

`1` = ascending order

`-1` = decending order


### Database setup

By default, `openKB` uses an embedded Javascript database called [nedb](https://github.com/louischatriot/nedb) for easy installation. This works really well for small to medium sized applications but
has it's limitations if you wanted to scale your application to handle many articles and concurrent users. For this reason, `openKB` also supports using a MongoDB server by simply changing the config file.

Here is the `config.js` for the embedded database (NeDB):

``` javascript
"database": {
    "type": "embedded"
}
```

Here is an example `config.js` for a MongoDB server. You can use your own localhost MongoDB instance or you may choose a hosted MongoDB server like [mLab](https://mlab.com/).

``` javascript
"database": {
    "type": "mongodb",
    "connection_string": "mongodb://127.0.0.1:27017/openkb"
}
```

### Public API

An optional public API can be enabled through `/settings` to allow inserting of documents by HTTP POST using services like IFTTT etc.

**Note:The API is disabled by default**

Once turned on, the API is hosted on route: `example.com/api/newArticle` via POST of a Object. The JSON schema is:

``` javascript
    'type': 'object',
    'properties': {
        'api_auth_token': {'type': 'string'},
        'kb_title': {'type': 'string'},
        'kb_body': {'type': 'string'},
        'kb_permalink': {'type': 'string'},
        'kb_published': {'type': 'boolean'},
        'kb_keywords': {'type': 'string'},
        'kb_author_email': {'type': 'string'},
        'kb_password': {'type': 'string'},
        'kb_featured': {'type': 'boolean'},
        'kb_seo_title': {'type': 'string'},
        'kb_seo_description': {'type': 'string'}
    },
    'required': ['api_auth_token', 'kb_title', 'kb_body', 'kb_author_email', 'kb_published']
```

**Note: An API access token is required to be able to use the API. If the API is turned on without a token, all requests will reject. Please use a hard to guess token**

The return Object from the API will be as follows:

``` javascript
{
  "result": false,
  "errors": [
    "Any error messages"
  ]
}
```

The `errors` value will have any validation or error message which have occured. The `result` is an approval boolean. Eg: `true` was successful and `false` wasn't.

### Migrating from NeDB to MongoDB (experimental)

You can upgrade from NeDB to Mongodb by running the following command:

Note: You will first need to setup a valid MongoDB connection as per the "Database setup" instructions.

```
npm run-script dbUpgrade
```

**please raise a Github issue if errors are encountered**

### Typeahead search

The typeahead search is great! Your user types in the word or phrase and the results pop up under the search box. But... One of the things to consider is that
there is a little more data being transmitted from server to browser to enable this functionality. This is not normally a big issue for most browsers
as the data is cached but you **may** run into issues if the number of articles in your app is quite large.

As a general rule there is about 3KB of compressed data being transferred from server to browser for 20 articles with long titles and keywords. If you have
hundreds of articles, the amount of data will increase and could cause performance issues. It is something to consider if your app seems to slow down once the
article numbers increase. If this is the case, you can simply just turn it off.

### Running in production

Using [PM2](https://github.com/Unitech/pm2) seems to be the easiest and best option for running production websites.
See the [PM2](https://github.com/Unitech/pm2) for more information or a short guide here: [http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2](http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2).
