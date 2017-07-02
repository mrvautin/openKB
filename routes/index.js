var express = require('express');
var path = require('path');
var router = express.Router();
var fs = require('fs');
var getSlug = require('speakingurl');
var common = require('./common');
var _ = require('lodash');
var mime = require('mime-types');
var lunr = require('lunr');
var config = common.read_config();

var appDir = path.dirname(require.main.filename);

// The homepage of the site
router.get('/', common.restrict, function (req, res, next){
    var db = req.app.db;
    common.config_expose(req.app);
    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // set the template dir
    common.setTemplateDir('user', req);

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

    // get the top results based on sort order
    common.dbQuery(db.kb, {kb_published: 'true'}, sortBy, config.settings.num_top_results, function (err, top_results){
        common.dbQuery(db.kb, {kb_published: 'true', kb_featured: 'true'}, sortBy, featuredCount, function (err, featured_results){
            res.render('index', {
                title: 'openKB',
                user_page: true,
                homepage: true,
                top_results: top_results,
                featured_results: featured_results,
                session: req.session,
                message: common.clear_session_value(req.session, 'message'),
                message_type: common.clear_session_value(req.session, 'message_type'),
                config: config,
                current_url: req.protocol + '://' + req.get('host') + req.app_context,
                fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
                helpers: req.handlebars,
                show_footer: 'show_footer'
            });
        });
    });
});

router.post('/protected/action', function (req, res){
    var db = req.app.db;
    // get article
    db.kb.findOne({kb_published: 'true', _id: common.getId(req.body.kb_id)}, function (err, result){
        // check password
        if(req.body.password === result.kb_password){
            // password correct. Allow viewing the article this time
            req.session.pw_validated = 'true';
            res.redirect(req.header('Referer'));
        }else{
            // password incorrect
            req.session.pw_validated = null;
            res.render('error', {message: 'Password incorrect. Please try again.', helpers: req.handlebars, config: config});
        }
    });
});

router.post('/search_api', function (req, res){
    var db = req.app.db;
    var index = req.app.index;
    
    // we strip the ID's from the lunr index search
    var index_id_array = [];
    index.search(req.body.searchTerm).forEach(function (id){
        // if mongoDB we use ObjectID's, else normal string ID's
        if(config.settings.database.type !== 'embedded'){
            index_id_array.push(common.getId(id.ref));
        }else{
            index_id_array.push(id.ref);
        }
    });

    common.dbQuery(db.kb, {_id: {$in: index_id_array}, kb_published: 'true', kb_versioned_doc: {$ne: true}}, null, null, function (err, results){
        if(err){
            return res.status(400).json({});
        }
        return res.status(200).json(results);
    });
});

// vote on articles
router.post('/vote', function (req, res){
    var db = req.app.db;

    // if voting allowed
    if(config.settings.allow_voting === true){
        // check if voted
        db.votes.findOne({$and: [{doc_id: req.body.doc_id}, {session_id: req.sessionID}]}, function (err, result){
            // if not voted
            if(!result){
                var vote = req.body.vote_type === 'upvote' ? 1 : -1;
                // update kb vote
                db.kb.update({_id: common.getId(req.body.doc_id)}, {$inc: {kb_votes: vote}}, function (err, numReplaced){
                    // insert session id into table to stop muli-voters
                    db.votes.insert({doc_id: req.body.doc_id, session_id: req.sessionID}, function (err, newDoc){
                        res.writeHead(200, {'Content-Type': 'application/text'});
                        res.end('Vote successful');
                    });
                });
            }else{
                // User has already voted
                res.writeHead(404, {'Content-Type': 'application/text'});
                res.end('User already voted');
            }
        });
    }else{
        // Voting not allowed
        res.writeHead(404, {'Content-Type': 'application/text'});
        res.end('Voting now allowed');
    }
});

// Render a version of the article to logged in users
router.get('/' + config.settings.route_name + '/:id/version', common.restrict, function (req, res){
    var db = req.app.db;
    common.config_expose(req.app);
    var classy = require('../public/javascripts/markdown-it-classy');
    var markdownit = req.markdownit;
    markdownit.use(classy);

    // check for logged in user
    if(!req.session.user){
        res.render('error', {message: '404 - Page not found', helpers: req.handlebars, config: config});
        return;
    }

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    db.kb.findOne({_id: common.getId(req.params.id)}, function (err, result){
        // show the view
        common.dbQuery(db.kb, {kb_published: 'true', kb_versioned_doc: {$eq: true}}, sortBy, featuredCount, function (err, featured_results){
            res.render('kb', {
                title: result.kb_title,
                result: result,
                user_page: true,
                kb_body: common.sanitizeHTML(markdownit.render(result.kb_body)),
                featured_results: featured_results,
                config: config,
                session: req.session,
                current_url: req.protocol + '://' + req.get('host') + req.app_context,
                fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
                message: common.clear_session_value(req.session, 'message'),
                message_type: common.clear_session_value(req.session, 'message_type'),
                helpers: req.handlebars,
                show_footer: 'show_footer'
            });
        });
    });
});

router.get('/' + config.settings.route_name + '/:id', common.restrict, function (req, res){
    var db = req.app.db;
    common.config_expose(req.app);
    var classy = require('../public/javascripts/markdown-it-classy');
    var markdownit = req.markdownit;
    markdownit.use(classy);

    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // set the template dir
    common.setTemplateDir('user', req);

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

    db.kb.findOne({$or: [{_id: common.getId(req.params.id)}, {kb_permalink: req.params.id}], kb_versioned_doc: {$ne: true}}, function (err, result){
        // render 404 if page is not published
        if(result == null || result.kb_published === 'false'){
            res.render('error', {message: '404 - Page not found', helpers: req.handlebars, config: config});
        }else{
            // check if has a password
            if(result.kb_password){
                if(result.kb_password !== ''){
                    if(req.session.pw_validated === 'false' || req.session.pw_validated === undefined || req.session.pw_validated == null){
                        res.render('protected_kb', {
                            title: 'Protected Article',
                            result: result,
                            config: config,
                            session: req.session,
                            helpers: req.handlebars
                        });
                        return;
                    }
                }
            }

            // if article is set to private, redirect to login
            if(typeof result.kb_visible_state !== 'undefined' && result.kb_visible_state === 'private'){
                if(!req.session.user){
                    req.session.refer_url = req.originalUrl;
                    res.redirect('/login');
                    return;
                }
            }

            // add to old view count
            var old_viewcount = result.kb_viewcount;
            if(old_viewcount == null){
                old_viewcount = 0;
            }

            var new_viewcount = old_viewcount;
            // increment if the user is logged in and if settings say so
            if(req.session.user && config.settings.update_view_count_logged_in){
                new_viewcount = old_viewcount + 1;
            }

            // increment if the user is a guest and not logged in
            if(!req.session.user){
                new_viewcount = old_viewcount + 1;
            }

            // update kb_viewcount
            db.kb.update({$or: [{_id: common.getId(req.params.id)}, {kb_permalink: req.params.id}]},
                {
                    $set: {kb_viewcount: new_viewcount}
                }, {multi: false}, function (err, numReplaced){
                // clear session auth and render page
                req.session.pw_validated = null;

                // show the view
                common.dbQuery(db.kb, {kb_published: 'true'}, sortBy, featuredCount, function (err, featured_results){
                    res.render('kb', {
                        title: result.kb_title,
                        result: result,
                        user_page: true,
                        kb_body: common.sanitizeHTML(markdownit.render(result.kb_body)),
                        featured_results: featured_results,
                        config: config,
                        session: req.session,
                        current_url: req.protocol + '://' + req.get('host') + req.app_context,
                        fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
                        message: common.clear_session_value(req.session, 'message'),
                        message_type: common.clear_session_value(req.session, 'message_type'),
                        helpers: req.handlebars,
                        show_footer: 'show_footer'
                    });
                });
            });
        }
    });
});

// render the settings page
router.get('/settings', common.restrict, function (req, res){
    var junk = require('junk');

    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    // path to themes
    var themePath = path.join(__dirname, '../public/themes');

    fs.readdir(themePath, function (err, files){
        res.render('settings', {
            title: 'Settings',
            session: req.session,
            themes: files.filter(junk.not),
            locale: Object.keys(req.i18n.locales),
            message: common.clear_session_value(req.session, 'message'),
            message_type: common.clear_session_value(req.session, 'message_type'),
            config: config,
            helpers: req.handlebars
        });
    });
});

// update the settings
router.post('/update_settings', common.restrict, function (req, res){
    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    // get the new settings
    var settings = req.body;

    // possible boolean type values
    var booleanArray = [true, 'true', false, 'false'];

    // loop settings, update config
    for(var key in settings){
        if(Object.prototype.hasOwnProperty.call(settings, key)){
            var settingValue = settings[key];
            // check for style keys
            if(key.split('.')[0] === 'style'){
                config.settings.style[key.split('.')[1]] = settingValue;
            }else{
                // if true/false, convert to boolean - TODO: Figure a better way of doing this?
                if(booleanArray.indexOf(settingValue) > -1){
                    settingValue = (settingValue === 'true');
                }
                config.settings[key] = settingValue;
            }
        }
    }

    // write settings to file
    var dir = path.join(__dirname, '..', 'config');
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 4), 'utf8');

    if(config.settings.locale){
        req.i18n.setLocale(config.settings.locale);
        res.cookie('locale', config.settings.locale);
        req.i18n.setLocaleFromCookie();
    }

    // set notification
    req.session.message = req.i18n.__('Settings successfully updated.');
    req.session.message_type = 'success';

    // redirect back
    res.redirect(req.app_context + '/settings');
});

// resets the view count of a given article ID
router.get('/' + config.settings.route_name + '/resetviewCount/:id', common.restrict, function (req, res){
    var db = req.app.db;
    db.kb.update({_id: common.getId(req.params.id)}, {$set: {kb_viewcount: 0}}, {multi: false}, function (err, numReplaced){
        if(err){
            req.session.message = req.i18n.__('View count could not be reset. Try again.');
            req.session.message_type = 'danger';
        }else{
            req.session.message = req.i18n.__('View count successfully reset to zero.');
            req.session.message_type = 'success';
        }

        // redirect to new doc
        res.redirect(req.app_context + '/edit/' + req.params.id);
    });
});

// resets the vote count of a given article ID
router.get('/' + config.settings.route_name + '/resetvoteCount/:id', common.restrict, function (req, res){
    var db = req.app.db;
    db.kb.update({_id: common.getId(req.params.id)}, {$set: {kb_votes: 0}}, {multi: false}, function (err, numReplaced){
        if(err){
            req.session.message = req.i18n.__('Vote count could not be reset. Try again.');
            req.session.message_type = 'danger';
        }else{
            req.session.message = req.i18n.__('Vote count successfully reset to zero.');
            req.session.message_type = 'success';
        }

        // redirect to new doc
        res.redirect(req.app_context + '/edit/' + req.params.id);
    });
});

// render the editor
router.get('/edit/:id', common.restrict, function (req, res){
    var db = req.app.db;
    common.config_expose(req.app);
    db.kb.findOne({_id: common.getId(req.params.id), kb_versioned_doc: {$ne: true}}, function (err, result){
        if(!result){
            res.render('error', {message: '404 - Page not found', helpers: req.handlebars, config: config});
            return;
        }

        common.dbQuery(db.kb, {kb_parent_id: req.params.id}, {kb_last_updated: -1}, 20, function (err, versions){
            res.render('edit', {
                title: 'Edit article',
                result: result,
                versions: versions,
                session: req.session,
                message: common.clear_session_value(req.session, 'message'),
                message_type: common.clear_session_value(req.session, 'message_type'),
                config: config,
                editor: true,
                helpers: req.handlebars
            });
        });
    });
});

// insert new KB form action
router.post('/insert_kb', common.restrict, function (req, res){
    var db = req.app.db;
    var lunr_index = req.app.index;

    var doc = {
        kb_permalink: req.body.frm_kb_permalink,
        kb_title: req.body.frm_kb_title,
        kb_body: req.body.frm_kb_body,
        kb_published: req.body.frm_kb_published,
        kb_keywords: req.body.frm_kb_keywords,
        kb_published_date: new Date(),
        kb_last_updated: new Date(),
        kb_last_update_user: req.session.users_name + ' - ' + req.session.user,
        kb_author: req.session.users_name,
        kb_author_email: req.session.user
    };

    db.kb.count({'kb_permalink': req.body.frm_kb_permalink}, function (err, kb){
        if(kb > 0 && req.body.frm_kb_permalink !== ''){
            // permalink exits
            req.session.message = req.i18n.__('Permalink already exists. Pick a new one.');
            req.session.message_type = 'danger';

            // keep the current stuff
            req.session.kb_title = req.body.frm_kb_title;
            req.session.kb_body = req.body.frm_kb_body;
            req.session.kb_keywords = req.body.frm_kb_keywords;
            req.session.kb_permalink = req.body.frm_kb_permalink;

            // redirect to insert
            res.redirect(req.app_context + '/insert');
        }else{
            db.kb.insert(doc, function (err, newDoc){
                if(err){
                    console.error('Error inserting document: ' + err);

                    // keep the current stuff
                    req.session.kb_title = req.body.frm_kb_title;
                    req.session.kb_body = req.body.frm_kb_body;
                    req.session.kb_keywords = req.body.frm_kb_keywords;
                    req.session.kb_permalink = req.body.frm_kb_permalink;

                    req.session.message = req.i18n.__('Error') + ': ' + err;
                    req.session.message_type = 'danger';

                    // redirect to insert
                    res.redirect(req.app_context + '/insert');
                }else{
                    // setup keywords
                    var keywords = '';
                    if(req.body.frm_kb_keywords !== undefined){
                        keywords = req.body.frm_kb_keywords.toString().replace(/,/g, ' ');
                    }

                    // get the new ID
                    var newId = newDoc._id;
                    if(config.settings.database.type !== 'embedded'){
                        newId = newDoc.insertedIds[0];
                    }

                    // create lunr doc		
                    var lunr_doc = {		
                        kb_title: req.body.frm_kb_title,		
                        kb_keywords: keywords,		
                        id: newId		
                    };		
                    
                    console.log('lunr_doc', lunr_doc);
            
                    // if index body is switched on		
                    if(config.settings.index_article_body === true){		
                        lunr_doc['kb_body'] = req.body.frm_kb_body;		
                    }		
		
                    // add to lunr index
                    lunr_index.add(lunr_doc);

                    req.session.message = req.i18n.__('New article successfully created');
                    req.session.message_type = 'success';

                    // redirect to new doc
                    res.redirect(req.app_context + '/edit/' + newId);
                }
            });
        }
    });
});

// Update an existing KB article form action
router.get('/suggest', common.suggest_allowed, function (req, res){
    // set the template dir
    common.setTemplateDir('admin', req);

    res.render('suggest', {
        title: 'Suggest article',
        config: config,
        editor: true,
        is_admin: req.session.is_admin,
        helpers: req.handlebars,
        message: common.clear_session_value(req.session, 'message'),
        message_type: common.clear_session_value(req.session, 'message_type'),
        session: req.session
    });
});

// Update an existing KB article form action
router.post('/insert_suggest', common.suggest_allowed, function (req, res){
    var db = req.app.db;
    var lunr_index = req.app.index;

    // if empty, remove the comma and just have a blank string
    var keywords = req.body.frm_kb_keywords.replace(/<(?:.|\n)*?>/gm, '');;
    if(common.safe_trim(keywords) === ','){
        keywords = '';
    }

    var doc = {
        kb_title: req.body.frm_kb_title + ' (SUGGESTION)',
        kb_body: req.body.frm_kb_body,
        kb_published: 'false',
        kb_keywords: keywords,
        kb_published_date: new Date(),
        kb_last_updated: new Date()
    };

    db.kb.insert(doc, function (err, newDoc){
        if(err){
            console.error('Error inserting suggestion: ' + err);
            req.session.message = req.i18n.__('Suggestion failed. Please contact admin.');
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/');
        }else{
            // get the new ID
            var newId = newDoc._id;
            if(config.settings.database.type !== 'embedded'){
                newId = newDoc.insertedIds[0];
            }

            // create lunr doc		
            var lunr_doc = {		
                kb_title: req.body.frm_kb_title,		
                kb_keywords: keywords,		
                id: newId		
            };		

            // if index body is switched on		
            if(config.settings.index_article_body === true){		
                lunr_doc['kb_body'] = req.body.frm_kb_body;		
            }		

            // add to lunr index
            lunr_index.add(lunr_doc);

            // redirect to new doc
            req.session.message = req.i18n.__('Suggestion successfully processed');
            req.session.message_type = 'success';
            res.redirect(req.app_context + '/');
        }
    });
});

// Update an existing KB article form action
router.post('/save_kb', common.restrict, function (req, res){
    var db = req.app.db;
    var lunr_index = req.app.index;
    var kb_featured = req.body.frm_kb_featured === 'on' ? 'true' : 'false';

    // if empty, remove the comma and just have a blank string
    var keywords = req.body.frm_kb_keywords.replace(/<(?:.|\n)*?>/gm, '');
    if(common.safe_trim(keywords) === ','){
        keywords = '';
    }

    db.kb.count({'kb_permalink': req.body.frm_kb_permalink, $not: {_id: common.getId(req.body.frm_kb_id)}, kb_versioned_doc: {$ne: true}}, function (err, kb){
        if(kb > 0 && req.body.frm_kb_permalink !== ''){
            // permalink exits
            req.session.message = req.i18n.__('Permalink already exists. Pick a new one.');
            req.session.message_type = 'danger';

            // keep the current stuff
            req.session.kb_title = req.body.frm_kb_title;
            req.session.kb_body = req.body.frm_kb_body;
            req.session.kb_keywords = req.body.frm_kb_keywords;
            req.session.kb_permalink = req.body.frm_kb_permalink;
            req.session.kb_featured = kb_featured;
            req.session.kb_seo_title = req.body.frm_kb_seo_title;
            req.session.kb_seo_description = req.body.frm_kb_seo_description;
            req.session.kb_edit_reason = req.body.frm_kb_edit_reason;
            req.session.kb_visible_state = req.body.frm_kb_visible_state;

            // redirect to insert
            res.redirect(req.app_context + '/edit/' + req.body.frm_kb_id);
        }else{
            db.kb.findOne({_id: common.getId(req.body.frm_kb_id)}, function (err, article){
                // update author if not set
                var author = article.kb_author ? article.kb_author : req.session.users_name;
                var author_email = article.kb_author_email ? article.kb_author_email : req.session.user;

                // set published date to now if none exists
                var published_date;
                if(article.kb_published_date == null || article.kb_published_date === undefined){
                    published_date = new Date();
                }else{
                    published_date = article.kb_published_date;
                }

                // update our old doc
                db.kb.update({_id: common.getId(req.body.frm_kb_id)}, {
                    $set: {
                        kb_title: req.body.frm_kb_title,
                        kb_body: req.body.frm_kb_body,
                        kb_published: req.body.frm_kb_published,
                        kb_keywords: keywords,
                        kb_last_updated: new Date(),
                        kb_last_update_user: req.session.users_name + ' - ' + req.session.user,
                        kb_author: author,
                        kb_author_email: author_email,
                        kb_published_date: published_date,
                        kb_password: req.body.frm_kb_password,
                        kb_permalink: req.body.frm_kb_permalink,
                        kb_featured: kb_featured,
                        kb_seo_title: req.body.frm_kb_seo_title,
                        kb_seo_description: req.body.frm_kb_seo_description,
                        kb_visible_state: req.body.frm_kb_visible_state
                    }
                }, {}, function (err, numReplaced){
                    if(err){
                        console.error('Failed to save KB: ' + err);
                        req.session.message = req.i18n.__('Failed to save. Please try again');
                        req.session.message_type = 'danger';
                        res.redirect(req.app_context + '/edit/' + req.body.frm_kb_id);
                    }else{
                        // setup keywords
                        var keywords = '';
                        if(req.body.frm_kb_keywords !== undefined){
                            keywords = req.body.frm_kb_keywords.toString().replace(/,/g, ' ');
                        }

                        // create lunr doc		
                        var lunr_doc = {		
                            kb_title: req.body.frm_kb_title,		
                            kb_keywords: keywords,		
                            id: req.body.frm_kb_id		
                        };		
	
                        // if index body is switched on		
                        if(config.settings.index_article_body === true){		
                            lunr_doc['kb_body'] = req.body.frm_kb_body;		
                        }		
 		
                        // update the index
                        lunr_index.update(lunr_doc, false);
                            
                        // check if versioning enabled
                        var article_versioning = config.settings.article_versioning ? config.settings.article_versioning : false;

                        // if versions turned on, insert a doc to track versioning
                        if(article_versioning === true){
                            // version doc
                            var version_doc = {
                                kb_title: req.body.frm_kb_title,
                                kb_parent_id: req.body.frm_kb_id,
                                kb_versioned_doc: true,
                                kb_edit_reason: req.body.frm_kb_edit_reason,
                                kb_body: req.body.frm_kb_body,
                                kb_published: false,
                                kb_keywords: keywords,
                                kb_last_updated: new Date(),
                                kb_last_update_user: req.session.users_name + ' - ' + req.session.user,
                                kb_author: author,
                                kb_author_email: author_email,
                                kb_published_date: published_date,
                                kb_password: req.body.frm_kb_password,
                                kb_permalink: req.body.frm_kb_permalink,
                                kb_featured: kb_featured,
                                kb_seo_title: req.body.frm_kb_seo_title,
                                kb_seo_description: req.body.frm_kb_seo_description
                            };

                            // insert a doc to track versioning
                            db.kb.insert(version_doc, function (err, version_doc){
                                req.session.message = req.i18n.__('Successfully saved');
                                req.session.message_type = 'success';
                                res.redirect(req.app_context + '/edit/' + req.body.frm_kb_id);
                            });
                        }else{
                            req.session.message = req.i18n.__('Successfully saved');
                            req.session.message_type = 'success';
                            res.redirect(req.app_context + '/edit/' + req.body.frm_kb_id);
                        }
                    }
                });
            });
        }
    });
});

// logout
router.get('/logout', function (req, res){
    req.session.user = null;
    req.session.users_name = null;
    req.session.is_admin = null;
    req.session.pw_validated = null;
    req.session.message = null;
    req.session.message_type = null;
    res.redirect(req.app_context + '/');
});

// users
router.get('/users', common.restrict, function (req, res){
    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    var db = req.app.db;
    common.dbQuery(db.users, {}, null, null, function (err, users){
        res.render('users', {
            title: 'Users',
            users: users,
            config: config,
            is_admin: req.session.is_admin,
            helpers: req.handlebars,
            session: req.session,
            message: common.clear_session_value(req.session, 'message'),
            message_type: common.clear_session_value(req.session, 'message_type')
        });
    });
});

// users
router.get('/user/edit/:id', common.restrict, function (req, res){
    var db = req.app.db;
    db.users.findOne({_id: common.getId(req.params.id)}, function (err, user){
        // if the user we want to edit is not the current logged in user and the current user is not
        // an admin we render an access denied message
        if(user.user_email !== req.session.user && req.session.is_admin === 'false'){
            req.session.message = req.i18n.__('Access denied');
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/Users/');
            return;
        }

        res.render('user_edit', {
            title: 'User edit',
            user: user,
            session: req.session,
            message: common.clear_session_value(req.session, 'message'),
            message_type: common.clear_session_value(req.session, 'message_type'),
            helpers: req.handlebars,
            config: config
        });
    });
});

// users
router.get('/users/new', common.restrict, function (req, res){
    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    res.render('user_new', {
        title: 'User - New',
        session: req.session,
        message: common.clear_session_value(req.session, 'message'),
        message_type: common.clear_session_value(req.session, 'message_type'),
        config: config,
        helpers: req.handlebars
    });
});

// kb list
router.get('/articles', common.restrict, function (req, res){
    var db = req.app.db;
    common.dbQuery(db.kb, {kb_versioned_doc: {$ne: true}}, {kb_published_date: -1}, 10, function (err, articles){
        res.render('articles', {
            title: 'Articles',
            articles: articles,
            session: req.session,
            message: common.clear_session_value(req.session, 'message'),
            message_type: common.clear_session_value(req.session, 'message_type'),
            config: config,
            helpers: req.handlebars
        });
    });
});

router.get('/articles/all', common.restrict, function (req, res){
    var db = req.app.db;
    common.dbQuery(db.kb, {kb_versioned_doc: {$ne: true}}, {kb_published_date: -1}, null, function (err, articles){
        res.render('articles', {
            title: 'Articles',
            articles: articles,
            session: req.session,
            message: common.clear_session_value(req.session, 'message'),
            message_type: common.clear_session_value(req.session, 'message_type'),
            config: config,
            helpers: req.handlebars
        });
    });
});

router.get('/articles/:tag', function (req, res){
    var db = req.app.db;
    var lunr_index = req.app.index;

    // we strip the ID's from the lunr index search
    var lunr_id_array = [];
    lunr_index.search(req.params.tag + '*').forEach(function (id){
        lunr_id_array.push(id.ref);
    });

    // we search on the lunr indexes
    common.dbQuery(db.kb, {_id: {$in: lunr_id_array}}, {kb_published_date: -1}, null, function (err, results){
        res.render('articles', {
            title: 'Articles',
            results: results,
            session: req.session,
            message: common.clear_session_value(req.session, 'message'),
            message_type: common.clear_session_value(req.session, 'message_type'),
            search_term: req.params.tag,
            config: config,
            helpers: req.handlebars
        });
    });
});

// update the published state based on an ajax call from the frontend
router.post('/published_state', common.restrict, function (req, res){
    var db = req.app.db;
    db.kb.update({_id: common.getId(req.body.id)}, {$set: {kb_published: req.body.state}}, {multi: false}, function (err, numReplaced){
        if(err){
            console.error('Failed to update the published state: ' + err);
            res.writeHead(400, {'Content-Type': 'application/text'});
            res.end('Published state not updated');
        }else{
            res.writeHead(200, {'Content-Type': 'application/text'});
            res.end('Published state updated');
        }
    });
});

// insert a user
router.post('/user_insert', common.restrict, function (req, res){
    var db = req.app.db;
    var bcrypt = req.bcrypt;
    var url = require('url');

    // set the account to admin if using the setup form. Eg: First user account
    var url_parts = url.parse(req.header('Referer'));

    // check if account being setup from the /setup route.
    // probably not the most elegent code but does the job.
    var is_admin = 'false';
    if(typeof config.settings.app_context !== 'undefined' && config.settings.app_context !== ''){
        if(url_parts.path === '/' + config.settings.app_context + '/setup'){
            is_admin = 'true';
        }
    }else if(url_parts.path === '/setup'){
        is_admin = 'true';
    }

    // sets up the document
    var doc = {
        users_name: req.body.users_name,
        user_email: req.body.user_email,
        user_password: bcrypt.hashSync(req.body.user_password),
        is_admin: is_admin
    };

    // check for existing user
    db.users.findOne({'user_email': req.body.user_email}, function (err, user){
        if(user){
            // user already exists with that email address
            console.error('Failed to insert user, possibly already exists: ' + err);
            req.session.message = req.i18n.__('A user with that email address already exists');
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/users/new');
        }else{
            // email is ok to be used.
            db.users.insert(doc, function (err, doc){
                // show the view
                if(err){
                    console.error('Failed to insert user: ' + err);
                    req.session.message = req.i18n.__('User exists');
                    req.session.message_type = 'danger';
                    res.redirect(req.app_context + '/user/edit/' + doc._id);
                }else{
                    req.session.message = req.i18n.__('User account inserted');
                    req.session.message_type = 'success';

                    // if from setup we add user to session and redirect to login.
                    // Otherwise we show users screen
                    if(url_parts.path === '/setup'){
                        req.session.user = req.body.user_email;
                        res.redirect(req.app_context + '/login');
                    }else{
                        res.redirect(req.app_context + '/Users');
                    }
                }
            });
        }
    });
});

// update a user
router.post('/user_update', common.restrict, function (req, res){
    var db = req.app.db;
    var bcrypt = req.bcrypt;
    var is_admin = req.body.user_admin === 'on' ? 'true' : 'false';

    // get the user we want to update
    db.users.findOne({_id: common.getId(req.body.user_id)}, function (err, user){
        // if the user we want to edit is not the current logged in user and the current user is not
        // an admin we render an access denied message
        if(user.user_email !== req.session.user && req.session.is_admin === 'false'){
            req.session.message = req.i18n.__('Access denied');
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/Users/');
            return;
        }

        // if editing your own account, retain admin true/false
        if(user.user_email === req.session.user){
            is_admin = user.is_admin;
        }

        // create the update doc
        var update_doc = {};
        update_doc.is_admin = is_admin;
        update_doc.users_name = req.body.users_name;
        if(req.body.user_password){
            update_doc.user_password = bcrypt.hashSync(req.body.user_password);
        }

        db.users.update({_id: common.getId(req.body.user_id)},
            {
                $set: update_doc
            }, {multi: false}, function (err, numReplaced){
                if(err){
                    console.error('Failed updating user: ' + err);
                    req.session.message = req.i18n.__('Failed to update user');
                    req.session.message_type = 'danger';
                    res.redirect(req.app_context + '/user/edit/' + req.body.user_id);
                }else{
                    // show the view
                    req.session.message = req.i18n.__('User account updated.');
                    req.session.message_type = 'success';
                    res.redirect(req.app_context + '/user/edit/' + req.body.user_id);
                }
            });
    });
});

// login form
router.get('/login', function (req, res){
    var db = req.app.db;
    // set the template
    common.setTemplateDir('admin', req);

    db.users.count({}, function (err, user_count){
        // we check for a user. If one exists, redirect to login form otherwise setup
        if(user_count > 0){
            // set needs_setup to false as a user exists
            req.session.needs_setup = false;
            
            // set the referring url
            var referringUrl = req.header('Referer');
            if(typeof req.session.refer_url !== 'undefined' && req.session.refer_url !== ''){
                referringUrl = req.session.refer_url;
            }

            res.render('login', {
                title: 'Login',
                referring_url: referringUrl,
                config: config,
                message: common.clear_session_value(req.session, 'message'),
                message_type: common.clear_session_value(req.session, 'message_type'),
                show_footer: 'show_footer',
                helpers: req.handlebars
            });
        }else{
            // if there are no users set the "needs_setup" session
            req.session.needs_setup = true;
            res.redirect(req.app_context + '/setup');
        }
    });
});

// setup form is shown when there are no users setup in the DB
router.get('/setup', function (req, res){
    var db = req.app.db;
    db.users.count({}, function (err, user_count){
        // dont allow the user to "re-setup" if a user exists.
        // set needs_setup to false as a user exists
        req.session.needs_setup = false;
        if(user_count === 0){
            res.render('setup', {
                title: 'Setup',
                config: config,
                message: common.clear_session_value(req.session, 'message'),
                message_type: common.clear_session_value(req.session, 'message_type'),
                show_footer: 'show_footer',
                helpers: req.handlebars
            });
        }else{
            res.redirect(req.app_context + '/login');
        }
    });
});

// Loops files on the disk, checks for their existance in any KB articles and removes non used files.
router.get('/file_cleanup', common.restrict, function (req, res){
    var db = req.app.db;
    var path = require('path');
    var fs = require('fs');
    var walk = require('walk');
    var walkPath = path.join(appDir, 'public', 'uploads', 'inline_files');
    var walker = walk.walk(walkPath, {followLinks: false});

    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    walker.on('file', function (root, stat, next){
        var file_name = path.resolve(root, stat.name);

        // find posts with the file in question
        common.dbQuery(db.kb, {'kb_body': new RegExp(stat.name)}, null, null, function (err, posts){
            // if the images doesn't exists in any posts then we remove it
            if(posts.length === 0){
                fs.unlinkSync(file_name);
            }
            next();
        });
    });

    walker.on('end', function (){
        req.session.message = req.i18n.__('All unused files have been removed');
        req.session.message_type = 'success';
        res.redirect(req.app_context + req.header('Referer'));
    });
});

// login the user and check the password
router.post('/login_action', function (req, res){
    var db = req.app.db;
    var bcrypt = req.bcrypt;
    var url = require('url');

    db.users.findOne({user_email: req.body.email}, function (err, user){
        // check if user exists with that email
        if(user === undefined || user === null){
            req.session.message = req.i18n.__('A user with that email does not exist.');
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/login');
        }else{
            // we have a user under that email so we compare the password
            if(bcrypt.compareSync(req.body.password, user.user_password) === true){
                req.session.user = req.body.email;
                req.session.users_name = user.users_name;
                req.session.user_id = user._id.toString();
                req.session.is_admin = user.is_admin;
                if(req.body.frm_referring_url === undefined || req.body.frm_referring_url === ''){
                    res.redirect(req.app_context + '/');
                }else{
                    var url_parts = url.parse(req.body.frm_referring_url, true);
                    if(url_parts.pathname !== '/setup' && url_parts.pathname !== req.app_context + '/login'){
                        res.redirect(req.body.frm_referring_url);
                    }else{
                        res.redirect(req.app_context + '/');
                    }
                }
            }else{
                // password is not correct
                req.session.message = req.i18n.__('Access denied. Check password and try again.');
                req.session.message_type = 'danger';
                res.redirect(req.app_context + '/login');
            }
        }
    });
});

// delete user
router.get('/user/delete/:id', common.restrict, function (req, res){
    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    var db = req.app.db;
    // remove the article
    if(req.session.is_admin === 'true'){
        db.users.remove({_id: common.getId(req.params.id)}, {}, function (err, numRemoved){
            req.session.message = req.i18n.__('User deleted.');
            req.session.message_type = 'success';
            res.redirect(req.app_context + '/users');
        });
    }else{
        req.session.message = req.i18n.__('Access denied.');
        req.session.message_type = 'danger';
        res.redirect(req.app_context + '/users');
    }
});

// delete article
router.get('/delete/:id', common.restrict, function (req, res){
    var db = req.app.db;
    var lunr_index = req.app.index;

    // remove the article
    db.kb.remove({_id: common.getId(req.params.id)}, {}, function (err, numRemoved){
        // setup keywords
        var keywords = '';
        if(req.body.frm_kb_keywords !== undefined){
            keywords = req.body.frm_kb_keywords.toString().replace(/,/g, ' ');
        }

        // create lunr doc
        var lunr_doc = {
            id: req.params.id
        };

        // remove from index		
        lunr_index.remove(lunr_doc, false);

        // redirect home
        req.session.message = req.i18n.__('Article successfully deleted');
        req.session.message_type = 'success';
        res.redirect(req.app_context + '/articles');
    });
});

var multer_upload = require('multer');
var inline_upload = multer_upload({dest: path.join(appDir, 'public', 'uploads', 'inline_files')});
router.post('/file/upload_file', common.restrict, inline_upload.single('file'), function (req, res, next){
    var fs = require('fs');

    if(req.file){
        // check for upload select
        var upload_dir = path.join(appDir, 'public', 'uploads', 'inline_files');
        var relative_upload_dir = req.app_context + '/uploads/inline_files';

        var file = req.file;
        var source = fs.createReadStream(file.path);
        var dest = fs.createWriteStream(path.join(upload_dir, file.originalname));

        // save the new file
        source.pipe(dest);
        source.on('end', function (){ });

        // delete the temp file.
        fs.unlink(file.path, function (err){ });

        // uploaded
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({'filename': relative_upload_dir + '/' + file.originalname}));
        return;
    }
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({'filename': 'fail'}, null, 3));
    return;
});

router.post('/file/new_dir', common.restrict, function (req, res, next){
    var mkdirp = require('mkdirp');

    // if new directory exists
    if(req.body.custom_dir){
        mkdirp(path.join(appDir, 'public', 'uploads', req.body.custom_dir), function (err){
            if(err){
                console.error('Directory creation error: ' + err);
                req.session.message = req.i18n.__('Directory creation error. Please try again');
                req.session.message_type = 'danger';
                res.redirect(req.app_context + '/files');
            }else{
                req.session.message = req.i18n.__('Directory successfully created');
                req.session.message_type = 'success';
                res.redirect(req.app_context + '/files');
            }
        });
    }else{
        req.session.message = req.i18n.__('Please enter a directory name');
        req.session.message_type = 'danger';
        res.redirect(req.app_context + '/files');
    }
});

// upload the file
var multer = require('multer');
var upload = multer({dest: path.join(appDir, 'public', 'uploads')});
router.post('/file/upload', common.restrict, upload.single('upload_file'), function (req, res, next){
    var fs = require('fs');

    if(req.file){
        // check for upload select
        var upload_dir = path.join(appDir, 'public', 'uploads');
        if(req.body.directory !== '/uploads'){
            upload_dir = path.join(appDir, 'public/', req.body.directory);
        }

        var file = req.file;
        var source = fs.createReadStream(file.path);
        var dest = fs.createWriteStream(path.join(upload_dir, file.originalname.replace(/ /g, '_')));

        // save the new file
        source.pipe(dest);
        source.on('end', function (){ });

        // delete the temp file.
        fs.unlink(file.path, function (err){ });

        req.session.message = req.i18n.__('File uploaded successfully');
        req.session.message_type = 'success';
        res.redirect(req.app_context + '/files');
    }else{
        req.session.message = req.i18n.__('File upload error. Please select a file.');
        req.session.message_type = 'danger';
        res.redirect(req.app_context + '/files');
    }
});

// delete a file via ajax request
router.post('/file/delete', common.restrict, function (req, res){
    var fs = require('fs');

    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.writeHead(400, {'Content-Type': 'application/text'});
        res.end('Access denied');
        return;
    }

    req.session.message = null;
    req.session.message_type = null;

    fs.unlink('public/' + req.body.img, function (err){
        if(err){
            console.error('File delete error: ' + err);
            res.writeHead(400, {'Content-Type': 'application/text'});
            res.end('Failed to delete file: ' + err);
        }else{
            res.writeHead(200, {'Content-Type': 'application/text'});
            res.end('File deleted successfully');
        }
    });
});

router.get('/files', common.restrict, function (req, res){
    var glob = require('glob');
    var fs = require('fs');

    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    // loop files in /public/uploads/
    glob('public/uploads/**', {nosort: true}, function (er, files){
        // sort array
        files.sort();

        // declare the array of objects
        var file_list = [];
        var dir_list = [];

        // loop these files
        for(var i = 0; i < files.length; i++){
            if(fs.existsSync(files[i])){
                if(fs.lstatSync(files[i]).isDirectory() === false){
                    // declare the file object and set its values
                    var file = {
                        id: i,
                        path: files[i].substring(6)
                    };

                    // push the file object into the array
                    file_list.push(file);
                }else{
                    var dir = {
                        id: i,
                        path: files[i].substring(6)
                    };

                    // push the dir object into the array
                    dir_list.push(dir);
                }
            }
        }

        // render the files route
        res.render('files', {
            title: 'Files',
            files: file_list,
            dirs: dir_list,
            session: req.session,
            config: config,
            message: common.clear_session_value(req.session, 'message'),
            message_type: common.clear_session_value(req.session, 'message_type'),
            helpers: req.handlebars
        });
    });
});

// insert form
router.get('/insert', common.restrict, function (req, res){
    res.render('insert', {
        title: 'Insert new',
        session: req.session,
        kb_title: common.clear_session_value(req.session, 'kb_title'),
        kb_body: common.clear_session_value(req.session, 'kb_body'),
        kb_keywords: common.clear_session_value(req.session, 'kb_keywords'),
        kb_permalink: common.clear_session_value(req.session, 'kb_permalink'),
        message: common.clear_session_value(req.session, 'message'),
        message_type: common.clear_session_value(req.session, 'message_type'),
        editor: true,
        helpers: req.handlebars,
        config: config
    });
});

// redirect home with a null topic
router.get('/topic', function(req, res){
    res.redirect('/');
});

// search kb's
router.get(['/search/:tag', '/topic/:tag'], common.restrict, function (req, res){
    var db = req.app.db;
    common.config_expose(req.app);
    var search_term = req.params.tag;
    var lunr_index = req.app.index;

    // determine whether its a search or a topic
    var routeType = 'search';
    if(req.path.split('/')[1] === 'topic'){
        routeType = 'topic';
    }

    // we strip the ID's from the lunr index search
    var lunr_id_array = [];
    lunr_index.search(search_term).forEach(function (id){
        // if mongoDB we use ObjectID's, else normal string ID's
        if(config.settings.database.type !== 'embedded'){
            lunr_id_array.push(common.getId(id.ref));
        }else{
            lunr_id_array.push(id.ref);
        }
    });

    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

    // we search on the lunr indexes
    common.dbQuery(db.kb, {_id: {$in: lunr_id_array}, kb_published: 'true', kb_versioned_doc: {$ne: true}}, null, null, function (err, results){
        common.dbQuery(db.kb, {kb_published: 'true', kb_featured: 'true'}, sortBy, featuredCount, function (err, featured_results){
            res.render('index', {
                title: 'Search results: ' + search_term,
                search_results: results,
                user_page: true,
                session: req.session,
                featured_results: featured_results,
                routeType: routeType,
                message: common.clear_session_value(req.session, 'message'),
                message_type: common.clear_session_value(req.session, 'message_type'),
                search_term: search_term,
                config: config,
                helpers: req.handlebars,
                show_footer: 'show_footer'
            });
        });
    });
});

// search kb's
router.post('/search', common.restrict, function (req, res){
    var db = req.app.db;
    common.config_expose(req.app);
    var search_term = req.body.frm_search;
    var lunr_index = req.app.index;

    // we strip the ID's from the lunr index search
    var lunr_id_array = [];
    lunr_index.search(search_term).forEach(function (id){
        // if mongoDB we use ObjectID's, else normal string ID's
        if(config.settings.database.type !== 'embedded'){
            lunr_id_array.push(common.getId(id.ref));
        }else{
            lunr_id_array.push(id.ref);
        }
    });

    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

    // we search on the lunr indexes
    common.dbQuery(db.kb, {_id: {$in: lunr_id_array}, kb_published: 'true', kb_versioned_doc: {$ne: true}}, null, null, function (err, results){
        common.dbQuery(db.kb, {kb_published: 'true', kb_featured: 'true'}, sortBy, featuredCount, function (err, featured_results){
            res.render('index', {
                title: 'Search results: ' + search_term,
                search_results: results,
                user_page: true,
                session: req.session,
                search_term: search_term,
                featured_results: featured_results,
                message: common.clear_session_value(req.session, 'message'),
                message_type: common.clear_session_value(req.session, 'message_type'),
                config: config,
                helpers: req.handlebars,
                show_footer: 'show_footer'
            });
        });
    });
});

// import form
router.get('/import', common.restrict, function (req, res){
    res.render('import', {
        title: 'Import',
        session: req.session,
        helpers: req.handlebars,
        message: common.clear_session_value(req.session, 'message'),
        message_type: common.clear_session_value(req.session, 'message_type'),
        config: config
    });
});

router.post('/importer', common.restrict, upload.single('import_file'), function (req, res, next){
    var fs = require('fs');
    var path = require('path');
    var zipExtract = require('extract-zip');
    var rimraf = require('rimraf');
    var db = req.app.db;
    var file = req.file;

    // check for allowed file type
    var checkMime = _.includes('application/zip', mime.lookup(file.originalname));
    if(checkMime === false){
        // clean up temp file
        fs.unlinkSync(file.path);

        // return error
        res.writeHead(400, {'Content-Type': 'application/text'});
        res.end('File type not permitted. Please upload a zip of Markdown documents.');
        return;
    }

    // extract our zip
    zipExtract(file.path, {dir: path.join(__dirname, '..', 'public', 'temp', 'import')}, function (err){
        // remove the zip
        fs.unlinkSync(file.path);

        // loop extracted files
        fs.readdir(path.join(__dirname, '..', 'public', 'temp', 'import'), (err, files) => {
            files.forEach(file => {
                // check for blank permalink field and set a nice one base on the title of the FAQ
                var fileNoExt = file.replace(/\.[^/.]+$/, '');
                var permalink = getSlug(fileNoExt);
                var faq_body = fs.readFileSync(path.join(__dirname, '..', 'public', 'temp', 'import', file), 'utf-8');
                if(faq_body === ''){
                    faq_body = 'FAQ body';
                }

                // setup the doc to insert
                var doc = {
                    kb_permalink: permalink,
                    kb_title: fileNoExt,
                    kb_body: faq_body,
                    kb_published: 'false',
                    kb_keywords: '',
                    kb_published_date: new Date(),
                    kb_last_updated: new Date(),
                    kb_featured: 'false',
                    kb_last_update_user: req.session.users_name + ' - ' + req.session.user,
                    kb_author: req.session.users_name,
                    kb_author_email: req.session.user
                };

                // check permalink if it exists
                common.validate_permalink(db, doc, function (err, result){
                    // duplicate permalink
                    if(!err){
                        // insert article
                        db.kb.insert(doc, function (err, newDoc){ });
                    }
                });
            });

            // clean up dir
            rimraf.sync('public/temp/import');
            req.session.message = 'Articles imported successfully';
            req.session.message_type = 'success';
            res.redirect('/import');
        });
    });
});

// export files into .md files and serve to browser
router.get('/export', common.restrict, function (req, res){
    var db = req.app.db;
    var fs = require('fs');
    var JSZip = require('jszip');

    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.render('error', {message: 'Access denied', helpers: req.handlebars, config: config});
        return;
    }

    // dump all articles to .md files. Article title is the file name and body is contents
    common.dbQuery(db.kb, {}, null, null, function (err, results){
        // files are written and added to zip.
        var zip = new JSZip();
        for(var i = 0; i < results.length; i++){
            // add and write file to zip
            zip.file(results[i].kb_title + '.md', results[i].kb_body);
        }

        // save the zip and serve to browser
        var buffer = zip.generate({type: 'nodebuffer'});
        fs.writeFile('data/export.zip', buffer, function (err){
            if(err)throw err;
            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', 'attachment; filename=data/export.zip');
            res.set('Content-Length', buffer.length);
            res.end(buffer, 'binary');
            return;
        });
    });
});

// return sitemap
router.get('/sitemap.xml', function (req, res, next){
    var sm = require('sitemap');
    var db = req.app.db;

    // get the articles
    common.dbQuery(db.kb, {kb_published: 'true', kb_visible_state: {$ne: 'private'}}, null, null, function (err, articles){
        var urlArray = [];

        // push in the base url
        urlArray.push({url: '/', changefreq: 'weekly', priority: 1.0});

        // get the article URL's
        for(var key in articles){
            if(Object.prototype.hasOwnProperty.call(articles, key)){
                // check for permalink
                var pageUrl = '/' + config.settings.route_name + '/' + articles[key]._id;
                if(articles[key].kb_permalink !== ''){
                    pageUrl = '/' + config.settings.route_name + '/' + articles[key].kb_permalink;
                }
                urlArray.push({url: pageUrl, changefreq: 'weekly', priority: 1.0});
            }
        }

        // create the sitemap
        var sitemap = sm.createSitemap({
            hostname: req.protocol + '://' + req.headers.host,
            cacheTime: 600000,        // 600 sec - cache purge period
            urls: urlArray
        });

        // render the sitemap
        sitemap.toXML(function(err, xml){
            if(err){
                return res.status(500).end();
            }
            res.header('Content-Type', 'application/xml');
            res.send(xml);
        });
    });
});

module.exports = router;
