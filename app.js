var express = require('express');
var path = require('path');
var logger = require('morgan');
var handlebars = require('express-handlebars');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Nedb = require('nedb');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var lunr = require('lunr');
var markdownit = require('markdown-it')({html: true, linkify: true, typographer: true});
var moment = require('moment');
var fs = require('fs');
var Nedb_store = require('nedb-session-store')(session);
var remove_md = require('remove-markdown');
var common = require('./routes/common');
var config = common.read_config();
var MongoClient = require('mongodb').MongoClient;
var expstate = require('express-state');
var compression = require('compression');
var lunr_store = {};

// require the routes
var index = require('./routes/index');
var api = require('./routes/api');

var app = express();

// setup the translation
var i18n = new (require('i18n-2'))({
    locales: ['en', 'de', 'da', 'es'],
    directory: path.join(__dirname, 'locales/'),
    defaultLocale: 'en',
    cookieName: 'locale'
});

if(config.settings.locale){
    i18n.setLocale(config.settings.locale);
//    cookie('locale', config.settings.locale);
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
        console.error('Theme folder does not exist. Please check theme in /routes/config.js');
        process.exit();
    }
}

// view engine setup
app.set('views', path.join(__dirname, '/views'));
app.engine('hbs', handlebars({extname: 'hbs', layoutsDir: path.join(__dirname, '/views/layouts'), defaultLayout: 'layout.hbs'}));
app.set('view engine', 'hbs');

// helpers for the handlebar templating platform
handlebars = handlebars.create({
    helpers: {
        __: function (value){
            return i18n.__(value);
        },
        split_keywords: function (keywords){
            if(keywords){
                var array = keywords.split(','); var links = '';
                for(var i = 0; i < array.length; i++){
                    if(array[i].trim() !== ''){
                        links += "<a href='/search/" + array[i].trim() + "'>" + array[i].trim() + '</a>&nbsp;|&nbsp;';
                    }
                }return links.substring(0, links.length - 1);
            }
            return keywords;
        },
        encodeURI: function(url){
            return encodeURI(url);
        },
        removeEmail: function(user){
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
        strip_md: function(md){
            if(md !== null && md !== ''){
                return remove_md(md);
            }
            return md;
        },
        view_count: function(value){
            if(value === '' || value === undefined){
                return'0';
            }
            return value;
        },
        ifBoth: function(val1, val2, options){
            if(val1 && val2){
                return options.fn(this);
            }
            return options.inverse(this);
        },
        format_date: function(date){
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
        ifCond: function(v1, operator, v2, options){
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
app.set('bind', process.env.BIND || '127.0.0.1');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
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
var app_context = '';
if(config.settings.app_context !== undefined && config.settings.app_context !== ''){
    app_context = '/' + config.settings.app_context;
}

// frontend modules loaded from NPM
app.use(app_context + '/static', express.static(path.join(__dirname, 'public/')));
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
app.use(function (req, res, next){
	req.markdownit = markdownit;
	req.handlebars = handlebars.helpers;
    req.bcrypt = bcrypt;
    req.i18n = i18n;
    req.lunr_index = lunr_index;
    req.lunr_store = lunr_store;
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
app.use(function(req, res, next){
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// === Error handlers ===

// development error handler
// will print stacktrace
if(app.get('env') === 'development'){
    app.use(function (err, req, res, next){
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
app.use(function (err, req, res, next){
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
    var db = new Nedb();
    db = {};
    db.users = new Nedb({filename: path.join(__dirname, '/data/users.db'), autoload: true});
    db.kb = new Nedb({filename: path.join(__dirname, '/data/kb.db'), autoload: true});
    db.votes = new Nedb({filename: path.join(__dirname, '/data/votes.db'), autoload: true});

    // add db to app for routes
    app.db = db;

    // add articles to index
    indexArticles(db, function(err){
        // lift the app
        app.listen(app.get('port'), app.get('bind'), function (){
            console.log('openKB running on host: http://' + app.get('bind') + ':' + app.get('port'));
            app.emit('openKBstarted');
        });
    });
}else{
    MongoClient.connect(config.settings.database.connection_string, {}, function(err, db){
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
        indexArticles(db, function(err){
            // lift the app
            app.listen(app.get('port'), app.get('bind'), function (){
                console.log('openKB running on host: http://' + app.get('bind') + ':' + app.get('port'));
                app.emit('openKBstarted');
            });
        });
    });
}

// setup lunr indexing
var lunr_index = lunr(function (){
    this.field('kb_title', {boost: 10});
    this.field('kb_keywords');
});

// if index body is switched on
if(config.settings.index_article_body === true){
    lunr_index.field('kb_body');
}

function indexArticles(db, callback){
    // get all articles on startup
    if(config.settings.database.type === 'embedded'){
        db.kb.find({kb_published: 'true'}, function (err, kb_list){
            // add to lunr index
            kb_list.forEach(function(kb){
                // only if defined
                var keywords = '';
                if(kb.kb_keywords !== undefined){
                    keywords = kb.kb_keywords.toString().replace(/,/g, ' ');
                }

                var doc = {
                    'kb_title': kb.kb_title,
                    'kb_keywords': keywords,
                    'id': kb._id
                };

                // if index body is switched on
                if(config.settings.index_article_body === true){
                    doc['kb_body'] = kb.kb_body;
                }

                // add to store
                var href = kb.kb_permalink !== '' ? kb.kb_permalink : kb._id;
                lunr_store[kb._id] = {t: kb.kb_title, p: href};

                lunr_index.add(doc);
            });

            callback(null);
        });
    }else{
        db.kb.find({kb_published: 'true'}).toArray(function (err, kb_list){
            // add to lunr index
            kb_list.forEach(function(kb){
                // only if defined
                var keywords = '';
                if(typeof kb.kb_keywords !== 'undefined' && kb.kb_keywords !== null){
                    keywords = kb.kb_keywords.toString().replace(/,/g, ' ');
                }

                var doc = {
                    'kb_title': kb.kb_title,
                    'kb_keywords': keywords,
                    'id': kb._id
                };

                // if index body is switched on
                if(config.settings.index_article_body === true){
                    doc['kb_body'] = kb.kb_body;
                }

                // add to store
                var href = kb.kb_permalink !== '' ? kb.kb_permalink : kb._id;
                lunr_store[kb._id] = {t: kb.kb_title, p: href};

                lunr_index.add(doc);
            });

            callback(null);
        });
    }
}

module.exports = app;
