var express = require('express');
var path = require('path');
var router = express.Router();
var config = require('./config');

// The homepage of the site
router.get('/', restrict, function(req, res, next){
    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // set the template dir
    setTemplateDir('user', req);

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

	// get the top results based on sort order
    req.db.kb.find({kb_published: 'true'}).sort(sortBy).limit(config.settings.num_top_results).exec(function (err, top_results){
        req.db.kb.find({kb_published: 'true', kb_featured: 'true'}).sort(sortBy).limit(featuredCount).exec(function (err, featured_results){
            res.render('index', {
                title: 'openKB',
                top_results: top_results,
                featured_results: featured_results,
                session: req.session,
                message: clear_session_value(req.session, 'message'),
                message_type: clear_session_value(req.session, 'message_type'),
                config: config,
                current_url: req.protocol + '://' + req.get('host') + req.app_context,
                fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
                helpers: req.handlebars,
                show_footer: 'show_footer'
            });
        });
    });
});

router.post('/protected/action', function(req, res){
	// get article
	req.db.kb.findOne({kb_published: 'true', _id: req.body.kb_id}, function (err, result){
		// check password
		if(req.body.password === result.kb_password){
			// password correct. Allow viewing the article this time
			req.session.pw_validated = 'true';
			res.redirect(req.header('Referer'));
		}else{
			// password incorrect
			req.session.pw_validated = null;
			res.render('error', {message: 'Password incorrect. Please try again.', helpers: req.handlebars});
		}
	});
});

router.get('/kb/:id', restrict, function(req, res){
	var classy = require('../public/javascripts/markdown-it-classy');
	var markdownit = req.markdownit;
	markdownit.use(classy);
    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // set the template dir
    setTemplateDir('user', req);

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

	req.db.kb.findOne({$or: [{_id: req.params.id}, {kb_permalink: req.params.id}]}, function (err, result){
		// render 404 if page is not published
		if(result == null || result.kb_published === 'false'){
            res.render('error', {message: '404 - Page not found', helpers: req.handlebars});
		}else{
			// check if has a password
            if(result.kb_password){
                if(result.kb_password !== ''){
                    if(req.session.pw_validated === 'false' || req.session.pw_validated === undefined || req.session.pw_validated == null){
                        res.render('protected_kb', {
                            title: 'Protected Article',
                            'result': result,
                            session: req.session,
                            helpers: req.handlebars
                        });
                        return;
                    }
                }
            }

			// add to old view count
			var old_viewcount = result.kb_viewcount;
			if(old_viewcount == null){
				old_viewcount = 0;
			}

			var new_viewcount = old_viewcount + 1;
			req.db.kb.update({_id: req.params.id},
				{
					$set: {kb_viewcount: new_viewcount}
				}, {multi: false}, function (err, numReplaced){
				// clear session auth and render page
				req.session.pw_validated = null;

				// show the view
                req.db.kb.find({kb_published: 'true', kb_featured: 'true'}).sort(sortBy).limit(featuredCount).exec(function (err, featured_results){
                    res.render('kb', {
                        title: result.kb_title,
                        result: result,
                        kb_body: markdownit.render(result.kb_body),
                        featured_results: featured_results,
                        config: config,
                        session: req.session,
                        current_url: req.protocol + '://' + req.get('host') + req.app_context,
                        fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
                        message: clear_session_value(req.session, 'message'),
                        message_type: clear_session_value(req.session, 'message_type'),
                        helpers: req.handlebars,
                        show_footer: 'show_footer'
                    });
                });
			});
		}
  });
});

router.get('/kb/resetviewCount/:id', restrict, function(req, res){
    req.db.kb.update({_id: req.params.id}, {$set: {kb_viewcount: 0}}, {multi: false}, function (err, numReplaced){
        if(err){
            req.session.message = 'View count could not be reset. Try again.';
			req.session.message_type = 'danger';
        }else{
            req.session.message = 'View count successfully reset to zero.';
            req.session.message_type = 'success';
        }

        // redirect to new doc
        res.redirect(req.app_context + '/edit/' + req.params.id);
    });
});

// render the editor
router.get('/edit/:id', restrict, function(req, res){
    req.db.kb.findOne({_id: req.params.id}, function (err, result){
        res.render('edit', {
            title: 'Edit article',
            'result': result,
            session: req.session,
            message: clear_session_value(req.session, 'message'),
            message_type: clear_session_value(req.session, 'message_type'),
            config: config,
            editor: true,
            helpers: req.handlebars
        });
    });
});

// insert new KB form action
router.post('/insert_kb', restrict, function(req, res){
    var lunr_index = req.lunr_index;

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

	req.db.kb.count({'kb_permalink': req.body.frm_kb_permalink}, function (err, kb){
		if(kb > 0 && req.body.frm_kb_permalink !== ''){
			// permalink exits
			req.session.message = 'Permalink already exists. Pick a new one.';
			req.session.message_type = 'danger';

			// keep the current stuff
			req.session.kb_title = req.body.frm_kb_title;
			req.session.kb_body = req.body.frm_kb_body;
			req.session.kb_keywords = req.body.frm_kb_keywords;
			req.session.kb_permalink = req.body.frm_kb_permalink;

			// redirect to insert
			res.redirect(req.app_context + '/insert');
		}else{
			req.db.kb.insert(doc, function (err, newDoc){
				if(err){
					console.error('Error inserting document: ' + err);

					// keep the current stuff
					req.session.kb_title = req.body.frm_kb_title;
					req.session.kb_body = req.body.frm_kb_body;
					req.session.kb_keywords = req.body.frm_kb_keywords;
					req.session.kb_permalink = req.body.frm_kb_permalink;

					req.session.message = 'Error: ' + err;
					req.session.message_type = 'danger';

					// redirect to insert
					res.redirect(req.app_context + '/insert');
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
						id: newDoc._id
					};

					// add to lunr index
					lunr_index.add(lunr_doc);

					req.session.message = 'New article successfully created';
					req.session.message_type = 'success';

					// redirect to new doc
					res.redirect(req.app_context + '/edit/' + newDoc._id);
				}
			});
		}
	});
});

// Update an existing KB article form action
router.get('/suggest', suggest_allowed, function(req, res){
    // set the template dir
    setTemplateDir('admin', req);

	res.render('suggest', {
		title: 'Suggest article',
		config: config,
		editor: true,
		is_admin: req.session.is_admin,
		helpers: req.handlebars,
		message: clear_session_value(req.session, 'message'),
		message_type: clear_session_value(req.session, 'message_type'),
		session: req.session
	});
});

// Update an existing KB article form action
router.post('/insert_suggest', suggest_allowed, function(req, res){
	var lunr_index = req.lunr_index;

    // if empty, remove the comma and just have a blank string
	var keywords = req.body.frm_kb_keywords;
	if(safe_trim(keywords) === ','){
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

	req.db.kb.insert(doc, function (err, newDoc){
		if(err){
			console.error('Error inserting suggestion: ' + err);
			req.session.message = 'Suggestion failed. Please contact admin.';
			req.session.message_type = 'danger';
			res.redirect(req.app_context + '/');
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
				id: newDoc._id
			};

			// add to lunr index
			lunr_index.add(lunr_doc);

			// redirect to new doc
			req.session.message = 'Suggestion successfully processed';
			req.session.message_type = 'success';
			res.redirect(req.app_context + '/');
		}
	});
});

// Update an existing KB article form action
router.post('/save_kb', restrict, function(req, res){
	var lunr_index = req.lunr_index;
    var kb_featured = req.body.frm_kb_featured === 'on' ? 'true' : 'false';

	// if empty, remove the comma and just have a blank string
	var keywords = req.body.frm_kb_keywords;
	if(safe_trim(keywords) === ','){
		keywords = '';
	}

    req.db.kb.count({'kb_permalink': req.body.frm_kb_permalink, $not: {_id: req.body.frm_kb_id}}, function (err, kb){
		if(kb > 0 && req.body.frm_kb_permalink !== ''){
			// permalink exits
			req.session.message = 'Permalink already exists. Pick a new one.';
			req.session.message_type = 'danger';

			// keep the current stuff
			req.session.kb_title = req.body.frm_kb_title;
			req.session.kb_body = req.body.frm_kb_body;
			req.session.kb_keywords = req.body.frm_kb_keywords;
			req.session.kb_permalink = req.body.frm_kb_permalink;
            req.session.kb_featured = kb_featured;
            req.session.kb_seo_title = req.body.frm_kb_seo_title;
            req.session.kb_seo_description = req.body.frm_kb_seo_description;

			// redirect to insert
			res.redirect(req.app_context + '/edit/' + req.body.frm_kb_id);
		}else{
			req.db.kb.findOne({_id: req.body.frm_kb_id}, function (err, article){
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

				req.db.kb.update({_id: req.body.frm_kb_id}, {$set:
						{kb_title: req.body.frm_kb_title,
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
                            kb_seo_description: req.body.frm_kb_seo_description
						}
					}, {}, function(err, numReplaced){
					if(err){
						console.error('Failed to save KB: ' + err);
						req.session.message = 'Failed to save. Please try again';
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

						// update the index
						lunr_index.update(lunr_doc, false);

						req.session.message = 'Successfully saved';
						req.session.message_type = 'success';
						res.redirect(req.app_context + '/edit/' + req.body.frm_kb_id);
					}
				});
			});
		}
	});
});

// logout
router.get('/logout', function(req, res){
    req.session.user = null;
	req.session.message = null;
	req.session.message_type = null;
	res.redirect(req.app_context + '/');
});

// users
router.get('/users', restrict, function(req, res){
	req.db.users.find({}, function (err, users){
        res.render('users', {
            title: 'Users',
            users: users,
            config: config,
            is_admin: req.session.is_admin,
            helpers: req.handlebars,
            session: req.session,
            message: clear_session_value(req.session, 'message'),
            message_type: clear_session_value(req.session, 'message_type')
        });
	});
});

// users
router.get('/user/edit/:id', restrict, function(req, res){
	req.db.users.findOne({_id: req.params.id}, function (err, user){
        // if the user we want to edit is not the current logged in user and the current user is not
        // an admin we render an access denied message
        if(user.user_email !== req.session.user && req.session.is_admin === 'false'){
            req.session.message = 'Access denied';
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/Users/');
            return;
        }

        res.render('user_edit', {
            title: 'User edit',
            user: user,
            session: req.session,
            message: clear_session_value(req.session, 'message'),
            message_type: clear_session_value(req.session, 'message_type'),
            helpers: req.handlebars,
            config: config
        });
	});
});

// users
router.get('/users/new', restrict, function(req, res){
    req.db.users.findOne({_id: req.params.id}, function (err, user){
        res.render('user_new', {
            title: 'User - New',
            user: user,
            session: req.session,
            message: clear_session_value(req.session, 'message'),
            message_type: clear_session_value(req.session, 'message_type'),
            config: config,
            helpers: req.handlebars
        });
	});
});

// kb list
router.get('/articles', restrict, function(req, res){
    req.db.kb.find({}).sort({kb_published_date: -1}).limit(10).exec(function (err, articles){
        res.render('articles', {
            title: 'Articles',
            articles: articles,
            session: req.session,
            message: clear_session_value(req.session, 'message'),
            message_type: clear_session_value(req.session, 'message_type'),
            config: config,
            helpers: req.handlebars
        });
    });
});

router.get('/articles/all', restrict, function(req, res){
    req.db.kb.find({}).sort({kb_published_date: -1}).exec(function (err, articles){
        res.render('articles', {
            title: 'Articles',
            articles: articles,
            session: req.session,
            message: clear_session_value(req.session, 'message'),
            message_type: clear_session_value(req.session, 'message_type'),
            config: config,
            helpers: req.handlebars
        });
    });
});

router.get('/articles/:tag', function(req, res){
	var lunr_index = req.lunr_index;

	// we strip the ID's from the lunr index search
	var lunr_id_array = [];
	lunr_index.search(req.params.tag).forEach(function(id){
		lunr_id_array.push(id.ref);
	});

	// we search on the lunr indexes
	req.db.kb.find({_id: {$in: lunr_id_array}}).sort({kb_published_date: -1}).exec(function (err, results){
		res.render('articles', {
			title: 'Articles',
			'results': results,
			session: req.session,
			message: clear_session_value(req.session, 'message'),
			message_type: clear_session_value(req.session, 'message_type'),
			search_term: req.params.tag,
			config: config,
			helpers: req.handlebars
		});
	});
});

// update the published state based on an ajax call from the frontend
router.post('/published_state', restrict, function(req, res){
	req.db.kb.update({_id: req.body.id}, {$set: {kb_published: req.body.state}}, {multi: false}, function (err, numReplaced){
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
router.post('/user_insert', restrict, function(req, res){
	var bcrypt = req.bcrypt;
	var url = require('url');

	// set the account to admin if using the setup form. Eg: First user account
	var url_parts = url.parse(req.header('Referer'));

	var is_admin = 'false';
	if(url_parts.path === '/setup'){
		is_admin = 'true';
	}

	var doc = {
        users_name: req.body.users_name,
        user_email: req.body.user_email,
		user_password: bcrypt.hashSync(req.body.user_password),
		is_admin: is_admin
	};

    // check for existing user
    req.db.users.findOne({'user_email': req.body.user_email}, function (err, user){
        if(user){
            // user already exists with that email address
            console.error('Failed to insert user, possibly already exists: ' + err);
            req.session.message = 'A user with that email address already exists';
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/users/new');
        }else{
            // email is ok to be used.
            req.db.users.insert(doc, function (err, doc){
                // show the view
                if(err){
                    console.error('Failed to insert user: ' + err);
                    req.session.message = 'User exists';
                    req.session.message_type = 'danger';
                    res.redirect(req.app_context + '/user/edit/' + doc._id);
                }else{
                    req.session.message = 'User account inserted';
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
router.post('/user_update', restrict, function(req, res){
	var bcrypt = req.bcrypt;

    var is_admin = req.body.user_admin === 'on' ? 'true' : 'false';

    // get the user we want to update
    req.db.users.findOne({_id: req.body.user_id}, function (err, user){
        // if the user we want to edit is not the current logged in user and the current user is not
        // an admin we render an access denied message
        if(user.user_email !== req.session.user && req.session.is_admin === 'false'){
            req.session.message = 'Access denied';
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/Users/');
            return;
        }

        // create the update doc
        var update_doc = {};
        update_doc.is_admin = is_admin;
        update_doc.users_name = req.body.users_name;
        if(req.body.user_password){
            update_doc.user_password = bcrypt.hashSync(req.body.user_password);
        }

        req.db.users.update({_id: req.body.user_id},
            {
                $set: update_doc
            }, {multi: false}, function (err, numReplaced){
            if(err){
                console.error('Failed updating user: ' + err);
                req.session.message = 'Failed to update user';
                req.session.message_type = 'danger';
                res.redirect(req.app_context + '/user/edit/' + req.body.user_id);
            }else{
                // show the view
                req.session.message = 'User account updated.';
                req.session.message_type = 'success';
                res.redirect(req.app_context + '/user/edit/' + req.body.user_id);
            }
        });
    });
});

// login form
router.get('/login', function(req, res){
    // set the template
    setTemplateDir('admin', req);

	req.db.users.count({}, function (err, user_count){
		// we check for a user. If one exists, redirect to login form otherwise setup
		if(user_count > 0){
			// set needs_setup to false as a user exists
            req.session.needs_setup = false;
            res.render('login', {
                title: 'Login',
                referring_url: req.header('Referer'),
                config: config,
                message: clear_session_value(req.session, 'message'),
                message_type: clear_session_value(req.session, 'message_type'),
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
router.get('/setup', function(req, res){
	req.db.users.count({}, function (err, user_count){
		// dont allow the user to "re-setup" if a user exists.
		// set needs_setup to false as a user exists
		req.session.needs_setup = false;
        if(user_count === 0){
            res.render('setup', {
                title: 'Setup',
                config: config,
                message: clear_session_value(req.session, 'message'),
                message_type: clear_session_value(req.session, 'message_type'),
                show_footer: 'show_footer',
                helpers: req.handlebars
            });
		}else{
			res.redirect(req.app_context + '/login');
		}
	});
});

// Loops files on the disk, checks for their existance in any KB articles and removes non used files.
router.get('/file_cleanup', restrict, function(req, res){
	var path = require('path');
	var fs = require('fs');
	var walk = require('walk');
    var walkPath = path.join('public', 'uploads', 'inline_files');
    var walker = walk.walk(walkPath, {followLinks: false});

    walker.on('file', function(root, stat, next){
        var file_name = path.resolve(root, stat.name);

        // find posts with the file in question
        req.db.kb.find({'kb_body': new RegExp(stat.name)}).exec(function (err, posts){
            // if the images doesn't exists in any posts then we remove it
            if(posts.length === 0){
                fs.unlinkSync(file_name);
            }
            next();
        });
    });

    walker.on('end', function (){
        req.session.message = 'All unused files have been removed';
        req.session.message_type = 'success';
        res.redirect(req.app_context + req.header('Referer'));
    });
});

// validate the permalink
router.post('/api/validate_permalink', function(req, res){
	// if doc id is provided it checks for permalink in any docs other that one provided,
	// else it just checks for any kb's with that permalink
	var query = {};
	if(req.body.doc_id === ''){
		query = {'kb_permalink': req.body.permalink};
	}else{
		query = {'kb_permalink': req.body.permalink, $not: {_id: req.body.doc_id}};
	}

	req.db.kb.count(query, function (err, kb){
		if(kb > 0){
			res.writeHead(400, {'Content-Type': 'application/text'});
			res.end('Permalink already exists');
		}else{
			res.writeHead(200, {'Content-Type': 'application/text'});
			res.end('Permalink validated successfully');
		}
	});
});

// login the user and check the password
router.post('/login_action', function(req, res){
	var bcrypt = req.bcrypt;
	var url = require('url');

	req.db.users.findOne({user_email: req.body.email}, function (err, user){
		// check if user exists with that email
		if(user === undefined || user === null){
			req.session.message = 'A user with that email does not exist.';
			req.session.message_type = 'danger';
			res.redirect(req.app_context + '/login');
		}else{
			// we have a user under that email so we compare the password
			if(bcrypt.compareSync(req.body.password, user.user_password) === true){
				req.session.user = req.body.email;
                req.session.users_name = user.users_name;
				req.session.user_id = user._id;
				req.session.is_admin = user.is_admin;
				if(req.body.frm_referring_url === undefined || req.body.frm_referring_url === ''){
					res.redirect(req.app_context + '/');
				}else{
					var url_parts = url.parse(req.body.frm_referring_url, true);
					if(url_parts.pathname !== '/setup' && url_parts.pathname !== '/login'){
						res.redirect(req.body.frm_referring_url);
					}else{
						res.redirect(req.app_context + '/');
					}
				}
			}else{
				// password is not correct
				req.session.message = 'Access denied. Check password and try again.';
				req.session.message_type = 'danger';
				res.redirect(req.app_context + '/login');
			}
		}
	});
});

// delete user
router.get('/user/delete/:id', restrict, function(req, res){
    // remove the article
    if(req.session.is_admin === 'true'){
        req.db.users.remove({_id: req.params.id}, {}, function (err, numRemoved){
            req.session.message = 'User deleted.';
            req.session.message_type = 'success';
            res.redirect(req.app_context + '/users');
        });
    }else{
        req.session.message = 'Access denied.';
        req.session.message_type = 'danger';
        res.redirect(req.app_context + '/users');
    }
});

// delete article
router.get('/delete/:id', restrict, function(req, res){
	var lunr_index = req.lunr_index;

	// remove the article
	req.db.kb.remove({_id: req.params.id}, {}, function (err, numRemoved){
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

		// remove the index
		lunr_index.remove(lunr_doc, false);

		// redirect home
		req.session.message = 'Article successfully deleted';
		req.session.message_type = 'success';
		res.redirect(req.app_context + '/articles');
    });
});

var multer_upload = require('multer');
var inline_upload = multer_upload({dest: path.join('public', 'uploads', 'inline_files')});
router.post('/file/upload_file', restrict, inline_upload.single('file'), function (req, res, next){
	var fs = require('fs');

	if(req.file){
		// check for upload select
		var upload_dir = path.join('public', 'uploads', 'inline_files');
		var relative_upload_dir = path.join('/uploads', 'inline_files');

		var file = req.file;
		var source = fs.createReadStream(file.path);
		var dest = fs.createWriteStream(path.join(upload_dir, file.originalname));

		// save the new file
		source.pipe(dest);
		source.on('end', function(){});

		// delete the temp file.
		fs.unlink(file.path, function (err){});

		// uploaded
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({'filename': path.join(relative_upload_dir, file.originalname)}, null, 3));
		return;
	}
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({'filename': 'fail'}, null, 3));
    return;
});

router.post('/file/new_dir', restrict, function (req, res, next){
	var mkdirp = require('mkdirp');

	// if new directory exists
	if(req.body.custom_dir){
		mkdirp(path.join('public', 'uploads', req.body.custom_dir), function (err){
			if(err){
				console.error('Directory creation error: ' + err);
				req.session.message = 'Directory creation error. Please try again';
				req.session.message_type = 'danger';
				res.redirect(req.app_context + '/files');
			}else{
				req.session.message = 'Directory successfully created';
				req.session.message_type = 'success';
				res.redirect(req.app_context + '/files');
			}
		});
	}else{
		req.session.message = 'Please enter a directory name';
		req.session.message_type = 'danger';
		res.redirect(req.app_context + '/files');
	}
});

// upload the file
var multer = require('multer');
var upload = multer({dest: 'public/uploads/'});
router.post('/file/upload', restrict, upload.single('upload_file'), function (req, res, next){
	var fs = require('fs');

	if(req.file){
		// check for upload select
		var upload_dir = 'public/uploads/';
		if(req.body.directory !== '/uploads'){
			upload_dir = 'public/' + req.body.directory;
		}

		var file = req.file;
		var source = fs.createReadStream(file.path);
		var dest = fs.createWriteStream(upload_dir + '/' + file.originalname.replace(/ /g, '_'));

		// save the new file
		source.pipe(dest);
		source.on('end', function(){});

		// delete the temp file.
		fs.unlink(file.path, function (err){});

		req.session.message = 'File uploaded successfully';
		req.session.message_type = 'success';
		res.redirect(req.app_context + '/files');
	}else{
		req.session.message = 'File upload error. Please select a file.';
		req.session.message_type = 'danger';
		res.redirect(req.app_context + '/files');
	}
});

// delete a file via ajax request
router.post('/file/delete', restrict, function(req, res){
	var fs = require('fs');

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

router.get('/files', restrict, function(req, res){
	var glob = require('glob');
	var fs = require('fs');

	// loop files in /public/uploads/
	glob('public/uploads/**', {nosort: true}, function (er, files){
		// sort array
		files.sort();

		// declare the array of objects
		var file_list = [];
		var dir_list = [];

		// loop these files
		for(var i = 0; i < files.length; i++){
			// only want files
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

		// render the files route
		res.render('files', {
			title: 'Files',
			files: file_list,
			dirs: dir_list,
			session: req.session,
			config: config,
			message: clear_session_value(req.session, 'message'),
			message_type: clear_session_value(req.session, 'message_type'),
            helpers: req.handlebars
		});
	});
});

// insert form
router.get('/insert', restrict, function(req, res){
	res.render('insert', {
		title: 'Insert new',
		session: req.session,
		kb_title: clear_session_value(req.session, 'kb_title'),
		kb_body: clear_session_value(req.session, 'kb_body'),
		kb_keywords: clear_session_value(req.session, 'kb_keywords'),
		kb_permalink: clear_session_value(req.session, 'kb_permalink'),
		message: clear_session_value(req.session, 'message'),
		message_type: clear_session_value(req.session, 'message_type'),
		editor: true,
		helpers: req.handlebars,
		config: config
	});
});

// search kb's
router.get('/search/:tag', restrict, function(req, res){
	var search_term = req.params.tag;
	var lunr_index = req.lunr_index;

	// we strip the ID's from the lunr index search
	var lunr_id_array = [];
	lunr_index.search(search_term).forEach(function(id){
		lunr_id_array.push(id.ref);
	});

    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

	// we search on the lunr indexes
	req.db.kb.find({_id: {$in: lunr_id_array}, kb_published: 'true'}, function (err, results){
        req.db.kb.find({kb_published: 'true', kb_featured: 'true'}).sort(sortBy).limit(featuredCount).exec(function (err, featured_results){
            res.render('index', {
                title: 'Results',
                search_results: results,
                session: req.session,
                featured_results: featured_results,
                message: clear_session_value(req.session, 'message'),
                message_type: clear_session_value(req.session, 'message_type'),
                search_term: search_term,
                config: config,
                helpers: req.handlebars,
                show_footer: 'show_footer'
            });
        });
	});
});

// search kb's
router.post('/search', restrict, function(req, res){
	var search_term = req.body.frm_search;
	var lunr_index = req.lunr_index;

	// we strip the ID's from the lunr index search
	var lunr_id_array = [];
	lunr_index.search(search_term).forEach(function(id){
		lunr_id_array.push(id.ref);
	});

    var featuredCount = config.settings.featured_articles_count ? config.settings.featured_articles_count : 4;

    // get sortBy from config, set to 'kb_viewcount' if nothing found
    var sortByField = typeof config.settings.sort_by.field !== 'undefined' ? config.settings.sort_by.field : 'kb_viewcount';
    var sortByOrder = typeof config.settings.sort_by.order !== 'undefined' ? config.settings.sort_by.order : -1;
    var sortBy = {};
    sortBy[sortByField] = sortByOrder;

	// we search on the lunr indexes
	req.db.kb.find({_id: {$in: lunr_id_array}, kb_published: 'true'}, function (err, results){
        req.db.kb.find({kb_published: 'true', kb_featured: 'true'}).sort(sortBy).limit(featuredCount).exec(function (err, featured_results){
            res.render('index', {
                title: 'Results',
                search_results: results,
                session: req.session,
                search_term: search_term,
                featured_results: featured_results,
                message: clear_session_value(req.session, 'message'),
                message_type: clear_session_value(req.session, 'message_type'),
                config: config,
                helpers: req.handlebars,
                show_footer: 'show_footer'
            });
        });
	});
});

// export files into .md files and serve to browser
router.get('/export', restrict, function(req, res){
	var fs = require('fs');
	var JSZip = require('jszip');

	// dump all articles to .md files. Article title is the file name and body is contents
	req.db.kb.find({}, function (err, results){
		// files are written and added to zip.
		var zip = new JSZip();
		for(var i = 0; i < results.length; i++){
			// add and write file to zip
			zip.file(results[i].kb_title + '.md', results[i].kb_body);
		}

		// save the zip and serve to browser
		var buffer = zip.generate({type: 'nodebuffer'});
		fs.writeFile('data/export.zip', buffer, function(err){
			if(err)throw err;
			res.set('Content-Type', 'application/zip');
			res.set('Content-Disposition', 'attachment; filename=data/export.zip');
			res.set('Content-Length', buffer.length);
			res.end(buffer, 'binary');
			return;
		});
	});
});

function clear_session_value(session, session_var){
	var temp = session[session_var];
	session[session_var] = null;
	return temp;
}

// This is called on the suggest url. If the value is set to false in the config
// a 403 error is rendered.
function suggest_allowed(req, res, next){
	if(config.settings.suggest_allowed === true){
		next();
		return;
	}
    res.render('error', {message: '403 - Forbidden', helpers: req.handlebars});
}

// This is called on all URL's. If the "password_protect" config is set to true
// we check for a login on thsoe normally public urls. All other URL's get
// checked for a login as they are considered to be protected. The only exception
// is the "setup", "login" and "login_action" URL's which is not checked at all.
function restrict(req, res, next){
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
	check_login(req, res, next);
}

// does the actual login check
function check_login(req, res, next){
    // set template dir
    setTemplateDir('admin', req);

	if(req.session.user){
		next();
	}else{
		res.redirect(req.app_context + '/login');
	}
}

function setTemplateDir(type, req){
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
}

function safe_trim(str){
	if(str !== undefined){
		return str.trim();
	}
    return str;
}

module.exports = router;
