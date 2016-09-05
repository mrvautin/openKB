var config = require('./config');
var path = require('path');

exports.clear_session_value = function(session, session_var){
	var temp = session[session_var];
	session[session_var] = null;
	return temp;
};

// This is called on the suggest url. If the value is set to false in the config
// a 403 error is rendered.
exports.suggest_allowed = function(req, res, next){
	if(config.settings.suggest_allowed === true){
		next();
		return;
	}
    res.render('error', {message: '403 - Forbidden', helpers: req.handlebars});
};

// This is called on all URL's. If the "password_protect" config is set to true
// we check for a login on thsoe normally public urls. All other URL's get
// checked for a login as they are considered to be protected. The only exception
// is the "setup", "login" and "login_action" URL's which is not checked at all.
exports.restrict = function(req, res, next){
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
	if(url_path.substring(0, 3) === '/kb'){
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

exports.setTemplateDir = function(type, req){
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
    var ObjectID = require('mongodb').ObjectID;
    if(config.settings.database.type === 'embedded'){
        return id;
    }
    return ObjectID(id);
};

exports.dbQuery = function(db, query, sort, limit, callback){
    if(config.settings.database.type === 'embedded'){
        if(sort && limit){
            db.find(query).sort(sort).limit(limit).exec(function(err, results){
                callback(null, results);
            });
        }else{
            db.find(query).exec(function(err, results){
                callback(null, results);
            });
        }
    }else{
        if(sort && limit){
            db.find(query).sort(sort).limit(limit).toArray(function(err, results){
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
