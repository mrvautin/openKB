const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const Nedb = require('nedb');
const session = require('express-session');
const bcrypt = require('bcrypt');
const markdownit = require('markdown-it')({ html: true, linkify: true, typographer: true });
const moment = require('moment');
const fs = require('fs');
const Nedb_store = require('nedb-session-store')(session);
const remove_md = require('remove-markdown');
const common = require('./routes/common');
const config = common.read_config();
const MongoClient = require('mongodb').MongoClient;
const expstate = require('express-state');
const compression = require('compression');
let handlebars = require('express-handlebars');

// require the routes
const index = require('./routes/index');
const api = require('./routes/api');

const app = express();

// setup the translation
const i18n = new (require('i18n-2'))({
    locales: ['en', 'de', 'da', 'es', 'cn', 'ru', 'pt-br', 'jp', 'fi', 'sv', 'tr'],
    directory: path.join(__dirname, 'locales/'),
    defaultLocale: 'en',
    cookieName: 'locale'
});

if(config.settings.locale){
    i18n.setLocale(config.settings.locale);
    i18n.setLocaleFromCookie();
}

// compress all requests
app.use(compression());

// setup express-state
expstate.extend(app);

// add the config items we want to expose to the client
common.config_expose(app);

// check theme directory exists if set
if(config.settings.theme){
    if(!fs.existsSync(path.join(__dirname, '/public/themes/', config.settings.theme))){
        console.error('Theme folder does not exist. Please check theme in /config/config.json');
        process.exit();
    }
}

// view engine setup
app.set('views', path.join(__dirname, '/views'));
app.engine('hbs', handlebars({ extname: 'hbs', layoutsDir: path.join(__dirname, '/views/layouts'), defaultLayout: 'layout.hbs', partialsDir: 'public/themes/' }));
app.set('view engine', 'hbs');

// helpers for the handlebar templating platform
handlebars = handlebars.create({
    helpers: {
        __: function (value){
            return i18n.__(value);
        },
        split_keywords: function (keywords){
            let app_context = config.settings.app_context;
            if(app_context !== ''){
                app_context = '/' + app_context;
            }
            if(keywords){
                let array = keywords.split(','); let links = '';
                for(let i = 0; i < array.length; i++){
                    if(array[i].trim() !== ''){
                        links += '<a href="' + app_context + '/search/' + array[i].trim() + '">' + array[i].trim() + '</a> <span class="keywordSeporator">|</span> ';
                    }
                }return links.substring(0, links.length - 1);
            }
            return keywords;
        },
        encodeURI: function (url){
            return encodeURI(url);
        },
        removeEmail: function (user){
            return user.replace(/ - ([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/, '');
        },
        checked_state: function (state){
            if(state === true || state === 'true'){
                return'checked';
            }
            return'';
        },
        select_state: function (value, option){
            if(value === option){
                return'selected';
            }return'';
        },
        if_null: function (val1, val2){
            if(val1){
                return val1;
            }
            return val2;
        },
        substring: function (val, length){
            if(val.length > length){
                return val.substring(0, length);
            }
            return val;
        },
        strip_md: function (md){
            if(md !== null && md !== ''){
                return remove_md(md);
            }
            return md;
        },
        view_count: function (value){
            if(value === '' || value === undefined){
                return'0';
            }
            return value;
        },
        ifBoth: function (val1, val2, options){
            if(val1 && val2){
                return options.fn(this);
            }
            return options.inverse(this);
        },
        format_date: function (date){
            if(config.settings.date_format){
                return moment(date).format(config.settings.date_format);
            }
            return moment(date).format('DD/MM/YYYY h:mmA');
        },
        app_context: function (){
            if(config.settings.app_context !== undefined && config.settings.app_context !== ''){
                return'/' + config.settings.app_context;
            }return'';
        },
        simpleCSS: function (config){
            let cssString = '';
            if(typeof config.settings.style.cssHeaderBackgroundColor !== 'undefined' && config.settings.style.cssHeaderBackgroundColor !== ''){
                cssString = cssString + '.navbar-default, .headerText h1 {background-color:' + config.settings.style.cssHeaderBackgroundColor + ';}';
            }
            if(typeof config.settings.style.cssHeaderTextColor !== 'undefined' && config.settings.style.cssHeaderTextColor !== ''){
                cssString = cssString + '.navbar-default .navbar-brand, .headerText h1 {color:' + config.settings.style.cssHeaderTextColor + ';}';
                cssString = cssString + '.navbar-default .navbar-brand:hover, .navbar-default .navbar-brand:focus, .brand-text, .contactLink {color:' + config.settings.style.cssHeaderTextColor + ' !important;}';
            }
            if(typeof config.settings.style.cssFooterBackgroundColor !== 'undefined' && config.settings.style.cssFooterBackgroundColor !== ''){
                cssString = cssString + '.footer{background-color:' + config.settings.style.cssFooterBackgroundColor + ';}';
            }
            if(typeof config.settings.style.cssFooterTextColor !== 'undefined' && config.settings.style.cssFooterTextColor !== ''){
                cssString = cssString + '.footer p{color:' + config.settings.style.cssFooterTextColor + ';}';
            }
            if(typeof config.settings.style.cssButtonBackgroundColor !== 'undefined' && config.settings.style.cssButtonBackgroundColor !== ''){
                cssString = cssString + '#btn_search, .btn-default{background-color:' + config.settings.style.cssButtonBackgroundColor + ';border-color:' + config.settings.style.cssButtonBackgroundColor + ';}';
            }
            if(typeof config.settings.style.cssButtonTextColor !== 'undefined' && config.settings.style.cssButtonTextColor !== ''){
                cssString = cssString + '#btn_search, .btn-default{color:' + config.settings.style.cssButtonTextColor + ';}';
            }
            if(typeof config.settings.style.cssLinkColor !== 'undefined' && config.settings.style.cssLinkColor !== ''){
                cssString = cssString + 'a, footer a, a:hover, a:focus, .contactLink a{color:' + config.settings.style.cssLinkColor + ' !important;}';
            }
            if(typeof config.settings.style.cssTextColor !== 'undefined' && config.settings.style.cssTextColor !== ''){
                cssString = cssString + 'body, .panel-primary>.panel-heading, .list-group-heading{color:' + config.settings.style.cssTextColor + ';}';
            }
            if(typeof config.settings.style.cssFontFamily !== 'undefined' && config.settings.style.cssFontFamily !== ''){
                cssString = cssString + 'body, h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6{font-family:' + config.settings.style.cssFontFamily + ';}';
            }
            return cssString;
        },
        ifCond: function (v1, operator, v2, options){
            switch(operator){
                case'==':
                    return(v1 === v2) ? options.fn(this) : options.inverse(this);
                case'!=':
                    return(v1 !== v2) ? options.fn(this) : options.inverse(this);
                case'===':
                    return(v1 === v2) ? options.fn(this) : options.inverse(this);
                case'<':
                    return(v1 < v2) ? options.fn(this) : options.inverse(this);
                case'<=':
                    return(v1 <= v2) ? options.fn(this) : options.inverse(this);
                case'>':
                    return(v1 > v2) ? options.fn(this) : options.inverse(this);
                case'>=':
                    return(v1 >= v2) ? options.fn(this) : options.inverse(this);
                case'&&':
                    return(v1 && v2) ? options.fn(this) : options.inverse(this);
                case'||':
                    return(v1 || v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        },
        is_an_admin: function (value, options){
            if(value === 'true'){
                return options.fn(this);
            }
            return options.inverse(this);
        }
    }
});

app.enable('trust proxy');
app.set('port', process.env.PORT || 4444);
app.set('bind', process.env.BIND || '0.0.0.0');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser('5TOCyfH3HuszKGzFZntk'));
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'pAgGxo8Hzg7PFlv1HpO8Eg0Y6xtP7zYx',
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 3600000 * 24
    },
    store: new Nedb_store({
        filename: 'data/sessions.db'
    })
}));

// setup the app context
let app_context = '';
if(config.settings.app_context !== undefined && config.settings.app_context !== ''){
    app_context = '/' + config.settings.app_context;
}

// frontend modules loaded from NPM
app.use(app_context + '/static', express.static(path.join(__dirname, 'public/')));
app.use(app_context + '/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(app_context + '/font-awesome', express.static(path.join(__dirname, 'node_modules/font-awesome/')));
app.use(app_context + '/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist/')));
app.use(app_context + '/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));
app.use(app_context + '/bootstrapTabs', express.static(path.join(__dirname, 'node_modules/bootstrap/js/')));
app.use(app_context + '/simplemde', express.static(path.join(__dirname, 'node_modules/simplemde/dist/')));
app.use(app_context + '/markdown-it', express.static(path.join(__dirname, 'node_modules/markdown-it/dist/')));
app.use(app_context + '/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use(app_context + '/fonts', express.static(path.join(__dirname, 'public/fonts')));
app.use(app_context + '/javascripts', express.static(path.join(__dirname, 'public/javascripts')));
app.use(app_context + '/lunr', express.static(path.join(__dirname, 'node_modules/lunr')));
app.use(app_context + '/favicon.png', express.static(path.join(__dirname, 'public/favicon.png')));

// serving static content
app.use(express.static(path.join(__dirname, 'public')));

// Make stuff accessible to our router
app.use((req, res, next) => {
    req.markdownit = markdownit;
    req.handlebars = handlebars.helpers;
    req.bcrypt = bcrypt;
    req.i18n = i18n;
    req.app_context = app_context;
    req.i18n.setLocaleFromCookie();
    next();
});

// setup the routes
if(app_context !== ''){
    app.use(app_context, index);
    app.use(app_context, api);
}else{
    app.use('/', index);
    app.use('/', api);
}

// catch 404 and forward to error handler
app.use((req, res, next) => {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// === Error handlers ===

// development error handler
// will print stacktrace
if(app.get('env') === 'development'){
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            helpers: handlebars.helpers,
            config: config
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        helpers: handlebars.helpers,
        config: config
    });
});

// sets up the databse depending on whether it's embedded (NeDB) or MongoDB
if(config.settings.database.type === 'embedded'){
    // setup the db's
    let db = new Nedb();
    db = {};
    db.users = new Nedb({ filename: path.join(__dirname, '/data/users.db'), autoload: true });
    db.kb = new Nedb({ filename: path.join(__dirname, '/data/kb.db'), autoload: true });
    db.votes = new Nedb({ filename: path.join(__dirname, '/data/votes.db'), autoload: true });

    // add db to app for routes
    app.db = db;

    // add articles to index
    common.buildIndex(db, (index) => {
        // add the index
        app.index = index;

        // lift the app
        app.listen(app.get('port'), app.get('bind'), () => {
            console.log('openKB running on host: http://' + app.get('bind') + ':' + app.get('port'));
            app.emit('openKBstarted');
        });
    });
}else{
    MongoClient.connect(config.settings.database.connection_string, {}, (err, db) => {
        // On connection error we display then exit
        if(err){
            console.error('Error connecting to MongoDB: ' + err);
            process.exit();
        }

        // setup the collections
        db.users = db.collection('users');
        db.kb = db.collection('kb');
        db.votes = db.collection('votes');

        // add db to app for routes
        app.db = db;

        // add articles to index
        common.buildIndex(db, (index) => {
            // add the index
            app.index = index;
            // lift the app
            app.listen(app.get('port'), app.get('bind'), () => {
                console.log('openKB running on host: http://' + app.get('bind') + ':' + app.get('port'));
                app.emit('openKBstarted');
            });
        });
    });
}

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('clean');
        if(config.settings.database.type !== 'embedded'){
            app.db.close();
        }
    }
    if (err) {
        console.log(err.stack);
    }
    if (options.exit) {
        process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

module.exports = app;
