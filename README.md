# openKB

![logo](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_logo_full.png)

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

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

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

### Running in production

Using [PM2](https://github.com/Unitech/pm2) seems to be the easiest and best option for running production websites.
See the [PM2](https://github.com/Unitech/pm2) for more information or a short guide here: [http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2](http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2).