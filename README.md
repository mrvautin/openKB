# openKB

![npm downloads badge](https://img.shields.io/npm/dm/openkb.svg "npm download badge")
![npm version badge](https://img.shields.io/npm/v/openkb.svg "npm version badge")
[![Build Status](https://travis-ci.org/mrvautin/openKB.svg?branch=master)](https://travis-ci.org/mrvautin/opnkb)
[![Github stars](https://img.shields.io/github/stars/mrvautin/openkb.svg?style=social&label=Star)](https://github.com/mrvautin/openkb)

openKB is a Markdown Knowledge base application (FAQ) built with [Nodejs](https://nodejs.org/) and [ExpressJS](http://expressjs.com/). The application uses an embedded database ([nedb](https://github.com/louischatriot/nedb)) for easy installation.
The application is designed to be easy to use and install and based around search rather than nested categories. Simply search for what you want and select from the results.

Demo: [http://openkb.mrvautin.com](http://openkb.mrvautin.com)

### Installation

1. Clone Repository: `git clone https://github.com/mrvautin/openKB.git && cd openKB`
2. Install dependencies: `npm install`
3. Start application: `npm start`
4. Go to  [http://127.0.0.1:4444](http://127.0.0.1:4444) in your browser

### Features

- **Seach**: openKB is a search based Knowledgebase (FAQ) backed by [Lunr.js](https://github.com/olivernn/lunr.js/) indexing to create the best possible results on searches. 
- **Backend**: openKB uses the pure javascript [nedb](https://github.com/louischatriot/nedb) embedded database. This means no external databases need to be setup.
- **Design**: openKB is meant to be simple flat design. With that said, openKB is very customizable by adding your CSS file to `/public/stylesheets/` and adding a link in `/views/layouts/layout.hbs` you can add your own styling and graphics.
- **Responsive**: openKB is built using Bootstrap allowing it to be responsive and work on all devices. The `admin` can be a little difficult editing Markdown on smaller screens.
- **Mermaid**: openKB allows for [Mermaid](http://knsv.github.io/mermaid/) charts in articles.
- **Editor**: openKB uses Markdown-it which is based off the [CommonMark spec](http://spec.commonmark.org/). This allows for the very best Markdown experience.
- **Image management**: openKB allows for drag and drop of images into articles. The image is automatically uploaded to the server in the background. Google Chrome users can also paste images directly from the clipboard.

### Screenshots

![Homepage](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_homepage_.png)
![Editor](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_editor.png)
![Article view](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_articleview.png)
![Article filtering](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_articlefiltering.png)
![Files](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_files.png)

### Admin

Visit: [http://127.0.0.1:4444/login](http://127.0.0.1:4444/login) 

A new user form will be shown where a user can be created.

### Config

There are are a few configurations that can be made which are held in `/routes/config.js`. If any values have been changed the app will need to be restarted.

### Running in production

Using [PM2](https://github.com/Unitech/pm2) seems to be the easiest and best option for running production websites.
See the [PM2](https://github.com/Unitech/pm2) for more information or a short guide here: [http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2](http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2).