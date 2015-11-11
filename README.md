# openKB

openKB is a Knowledge base application built with [Nodejs](https://nodejs.org/) and [ExpressJS](http://expressjs.com/). The application uses a flat file database called [nedb](https://github.com/louischatriot/nedb) for easy installation.
The application is designed to be easy and based around search rather than nested categories. Simply search for what you want and select from the results.

Demo: [http://openkb.mrvautin.com](http://openkb.mrvautin.com)

### Installation

1. Clone Repository: `git clone https://github.com/mrvautin/openKB.git && cd openKB`
2. Install dependencies: `npm install`
3. Start application: `npm start`
4. Go to  [http://127.0.0.1:4444](http://127.0.0.1:4444) in your browser

### Admin

Visit: [http://127.0.0.1:4444/login](http://127.0.0.1:4444/login) 

A new user form will be shown where a user can be created.

### Config

There are are a few configurations that can be made which are held in `/routes/config.js`. If any values have been changed the app will need to be restarted.

### Running in production

Using [PM2](https://github.com/Unitech/pm2) seems to be the easiest and best option for running production websites.
See the [PM2](https://github.com/Unitech/pm2) for more information or a short guide here: [http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2](http://mrvautin.com/Running-Nodejs-applications-in-production-forever-vs-supervisord-vs-pm2).