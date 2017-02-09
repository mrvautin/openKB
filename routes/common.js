var path = require('path');
var fs = require('fs');

exports.clear_session_value = function(session, session_var){
	var temp = session[session_var];
	session[session_var] = null;
	return temp;
};

exports.read_config = function(){
    var loadedConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.js')));

    if(loadedConfig.settings.database.type === 'mongodb'){
        loadedConfig.settings.database.connection_string = process.env.MONGODB_CONNECTION_STRING || loadedConfig.settings.database.connection_string;
    }

    if(typeof loadedConfig.settings.route_name === 'undefined' || loadedConfig.settings.route_name === ''){
        loadedConfig.settings.route_name = 'kb';
    }

    return loadedConfig;
};

// This is called on the suggest url. If the value is set to false in the config
// a 403 error is rendered.
exports.suggest_allowed = function(req, res, next){
    var config = exports.read_config();
	if(config.settings.suggest_allowed === true){
		next();
		return;
	}
    res.render('error', {message: '403 - Forbidden', helpers: req.handlebars});
};

exports.validate_permalink = function(db, data, callback){
    // only validate permalink if it exists
    if(typeof data.kb_permalink === 'undefined' || data.kb_permalink === ''){
		callback(null, 'All good');
	}else{
        db.kb.count({'kb_permalink': data.kb_permalink}, function (err, kb){
            if(kb > 0){
                callback('Permalink already exists', null);
            }else{
                callback(null, 'All good');
            }
        });
    }
};

// This is called on all URL's. If the "password_protect" config is set to true
// we check for a login on thsoe normally public urls. All other URL's get
// checked for a login as they are considered to be protected. The only exception
// is the "setup", "login" and "login_action" URL's which is not checked at all.
exports.restrict = function(req, res, next){
    var config = exports.read_config();
	var url_path = req.url;

	// if not protecting we check for public pages and don't check_login
	if(url_path.substring(0, 5).trim() === '/'){
		if(config.settings.password_protect === false){
			next();
			return;
		}
	}
	if(url_path.substring(0, 7) === '/search'){
		if(config.settings.password_protect === false){
			next();
			return;
		}
	}

	if(url_path.substring(0, config.settings.route_name.length + 1) === '/' + config.settings.route_name){
		if(config.settings.password_protect === false){
			next();
			return;
		}
	}

	if(url_path.substring(0, 12) === '/user_insert'){
		next();
		return;
	}

	// if the "needs_setup" session variable is set, we allow as
	// this means there is no user existing
	if(req.session.needs_setup === true){
		res.redirect(req.app_context + '/setup');
		return;
	}

	// if not a public page we
	exports.check_login(req, res, next);
};

// does the actual login check
exports.check_login = function(req, res, next){
    // set template dir
    exports.setTemplateDir('admin', req);

	if(req.session.user){
		next();
	}else{
		res.redirect(req.app_context + '/login');
	}
};

// exposes select server side settings to the client
exports.config_expose = function(app){
    var config = exports.read_config();
    var clientConfig = {};
    clientConfig.route_name = config.settings.route_name !== undefined ? config.settings.route_name : 'kb';
    clientConfig.add_header_anchors = config.settings.add_header_anchors !== undefined ? config.settings.add_header_anchors : false;
    clientConfig.links_blank_page = config.settings.links_blank_page !== undefined ? config.settings.links_blank_page : true;
    clientConfig.typeahead_search = config.settings.typeahead_search !== undefined ? config.settings.typeahead_search : true;
    clientConfig.enable_spellchecker = config.settings.enable_spellchecker !== undefined ? config.settings.enable_spellchecker : true;
    app.expose(clientConfig, 'config');
};

exports.setTemplateDir = function(type, req){
    var config = exports.read_config();
    if(type !== 'admin'){
        // if theme selected, override the layout dir
        var layoutDir = config.settings.theme ? path.join(__dirname, '../public/themes/', config.settings.theme, '/views/layouts/layout.hbs') : path.join(__dirname, '../views/layouts/layout.hbs');
        var viewDir = config.settings.theme ? path.join(__dirname, '../public/themes/', config.settings.theme, '/views') : path.join(__dirname, '../views');

        // set the views dir
        req.app.locals.settings.views = viewDir;
        req.app.locals.layout = layoutDir;
    }else{
        // set the views dir
        req.app.locals.settings.views = path.join(__dirname, '../views/');
        req.app.locals.layout = path.join(__dirname, '../views/layouts/layout.hbs');
    }
};

exports.getId = function(id){
    var config = exports.read_config();
    var ObjectID = require('mongodb').ObjectID;
    if(config.settings.database.type === 'embedded'){
        return id;
    }
    if(id.length !== 24){
        return id;
    }
    return ObjectID(id);
};

exports.dbQuery = function(db, query, sort, limit, callback){
    var config = exports.read_config();
    if(config.settings.database.type === 'embedded'){
        if(sort && limit){
            db.find(query).sort(sort).limit(parseInt(limit)).exec(function(err, results){
                callback(null, results);
            });
        }else{
            db.find(query).exec(function(err, results){
                callback(null, results);
            });
        }
    }else{
        if(sort && limit){
            db.find(query).sort(sort).limit(parseInt(limit)).toArray(function(err, results){
                callback(null, results);
            });
        }else{
            db.find(query).toArray(function(err, results){
                callback(null, results);
            });
        }
    }
};

exports.safe_trim = function(str){
	if(str !== undefined){
		return str.trim();
	}
    return str;
};
