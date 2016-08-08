var express = require('express');
var path = require('path');
var router = express.Router();

// The homepage of the site
router.get('/', restrict, function(req, res, next) {
	var db = req.db;
	var helpers = req.handlebars.helpers;
	var config = require('./config');

	var tag_list = config.settings.featured_tags.split(/,/);
	var featured_tags = new Array();
	if(tag_list.length > 0 && tag_list[0]) {
		var temp = new Array();
		var lunr_tags_index = req.lunr_tags_index;
		for (var i = 0; i < tag_list.length; i++) {
			// we strip the ID's from the lunr index search
			var lunr_id_array = new Array();
			lunr_tags_index.search(tag_list[i]).forEach(function(id) {
				lunr_id_array.push(id.ref);
			});
			var saveResults = function(tag, i) {
				return function(err, results) {
					var current_tag = {};
					current_tag.keyword = tag;
					current_tag.results = results;
					if(results && results.length > 0) {
						// convert into a 2D array, 3 tags per row
						if ( temp.length > 0 && temp.length % 3 === 0 ) {
								featured_tags.push( temp );
								temp = new Array();
						}
						temp.push( current_tag );
					}
					if(((i + 1) == tag_list.length) && temp.length > 0) {
							featured_tags.push( temp );
					}
				};
			};
			// we search on the lunr indexes
			db.kb.find({ _id: { $in: lunr_id_array}, kb_published:'true'}).sort({kb_last_updated: -1}).limit(config.settings.featured_tags_limit).exec(saveResults(tag_list[i], i));
		}
	}

	// get the top 5 results based on viewcount
	db.kb.find({kb_published:'true'}).sort({kb_last_updated: -1}).limit(config.settings.num_top_results).exec(function (err, top_results) {
 		res.render('index', {
			 title: config.settings.website_title,
			 "top_results": top_results,
			 "featured_tags": featured_tags,
			 session: req.session,
			 message: clear_session_value(req.session, "message"),
			 message_type: clear_session_value(req.session, "message_type"),
			 config: config,
			 helpers: helpers,
			 show_footer: "show_footer"
		});
	});
});

router.post('/protected/action', function(req, res) {
	// get article
	req.db.kb.findOne({kb_published:'true', _id: req.body.kb_id}, function (err, result) {
		// check password
		if(req.body.password == result.kb_password){
			// password correct. Allow viewing the article this time
			req.session.pw_validated = "true";
			res.redirect(req.header('Referer'));
		}else{
			// password incorrect
			req.session.pw_validated = null;
			res.render('error', { message: 'Password incorrect. Please try again.' });
		}
	});
});

router.get('/kb/:id', restrict, function(req, res) {
	var db = req.db;
	var classy = require("../public/javascripts/markdown-it-classy");
	var markdownit = req.markdownit;
	markdownit.use(classy);
	var helpers = req.handlebars.helpers;
	var config = require('./config');

	db.kb.findOne({ $or: [{_id: req.params.id}, { kb_permalink: req.params.id }] }, function (err, result) {
		// render 404 if page is not published
		if(result == null || result.kb_published == "false"){
			res.render('error', { message: '404 - Page not found' });
		}else{
			// check if has a password
			if(result.kb_password){
				if(result.kb_password != ""){
					if(req.session.pw_validated == "false" || req.session.pw_validated == undefined || req.session.pw_validated == null){
						res.render('protected_kb', {
							title: "Protected Article",
							"result": result,
							session: req.session
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
			db.kb.update({ _id: req.params.id },
				{
					$set: { kb_viewcount:  new_viewcount}
				}, { multi: false }, function (err, numReplaced) {

				// clear session auth and render page
				req.session.pw_validated = null;

				// show the view
				res.render('kb', {
					title: result.kb_title,
					"result": result,
					"kb_body": markdownit.render(result.kb_body),
					config: config,
					session: req.session,
					current_url: req.protocol + '://' + req.get('host'),
					message: clear_session_value(req.session, "message"),
					message_type: clear_session_value(req.session, "message_type"),
					helpers: helpers,
					show_footer: "show_footer"
				});
			});
		}
  });
});

// render the editor
router.get('/edit/:id', restrict, function(req, res) {
	var db = req.db;
	var config = require('./config');

	db.kb.findOne({_id: req.params.id}, function (err, result) {
		res.render('edit', {
			title: 'Edit article',
			"result": result,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			config: config,
			editor: true,
			helpers: req.handlebars.helpers
		});
	});
});

// insert new KB form action
router.post('/insert_kb', restrict, function(req, res) {
  	var db = req.db;
		var lunr_index = req.lunr_index;
		var lunr_tags_index = req.lunr_tags_index;

    var doc = {
		kb_permalink: req.body.frm_kb_permalink,
        kb_title: req.body.frm_kb_title,
		kb_body: req.body.frm_kb_body,
		kb_published: req.body.frm_kb_published,
		kb_keywords: req.body.frm_kb_keywords,
		kb_published_date: new Date(),
		kb_last_updated: new Date(),
        kb_last_update_user: req.session.users_name + " - " + req.session.user,
		kb_author: req.session.users_name,
        kb_author_email: req.session.user
	};

	db.kb.count({'kb_permalink': req.body.frm_kb_permalink}, function (err, kb) {
		if(kb > 0 && req.body.frm_kb_permalink != ""){
			// permalink exits
			req.session.message = "Permalink already exists. Pick a new one.";
			req.session.message_type = "danger";

			// keep the current stuff
			req.session.kb_title = req.body.frm_kb_title;
			req.session.kb_body = req.body.frm_kb_body;
			req.session.kb_keywords = req.body.frm_kb_keywords;
			req.session.kb_permalink = req.body.frm_kb_permalink;

			// redirect to insert
			res.redirect('/insert');
		}else{
			db.kb.insert(doc, function (err, newDoc) {
				if(err){
					console.error("Error inserting document: " + err);

					// keep the current stuff
					req.session.kb_title = req.body.frm_kb_title;
					req.session.kb_body = req.body.frm_kb_body;
					req.session.kb_keywords = req.body.frm_kb_keywords;
					req.session.kb_permalink = req.body.frm_kb_permalink;

					req.session.message = "Error: " + err;
					req.session.message_type = "danger";

					// redirect to insert
					res.redirect('/insert');
				}else{
					// setup keywords
					var keywords = "";
					if(req.body.frm_kb_keywords != undefined){
						keywords = req.body.frm_kb_keywords.toString().replace(/,/g, ' ');
					}

					// create lunr doc
					var lunr_doc = {
						kb_title: req.body.frm_kb_title,
						kb_keywords: keywords,
						kb_body: req.body.frm_kb_body,
						id: newDoc._id
					};

					// add to lunr index
					lunr_index.add(lunr_doc);

					// create lunr doc
					var lunr_tags_doc = {
						kb_keywords: keywords,
						id: newDoc._id
					};

					// add to lunr index
					lunr_tags_index.add(lunr_tags_doc);

					req.session.message = "New article successfully created";
					req.session.message_type = "success";

					// redirect to new doc
					res.redirect('/edit/' + newDoc._id);
				}
			});
		}
	});
});

// Update an existing KB article form action
router.get('/suggest', suggest_allowed, function(req, res) {
	var config = require('./config');

	res.render('suggest', {
		title: 'Suggest article',
		config: config,
		editor: true,
		is_admin: req.session.is_admin,
		helpers: req.handlebars.helpers,
		message: clear_session_value(req.session, "message"),
		message_type: clear_session_value(req.session, "message_type"),
		session: req.session
	});
});

// Update an existing KB article form action
router.post('/insert_suggest', suggest_allowed, function(req, res) {
	var db = req.db;
	var lunr_index = req.lunr_index;
	var lunr_tags_index = req.lunr_tags_index;

    // if empty, remove the comma and just have a blank string
	var keywords = req.body.frm_kb_keywords;
	if(safe_trim(keywords) == ","){
		keywords = "";
	}

	var doc = {
        kb_title: req.body.frm_kb_title + " (SUGGESTION)",
		kb_body: req.body.frm_kb_body,
		kb_published: "false",
		kb_keywords: keywords,
		kb_published_date: new Date(),
		kb_last_updated: new Date()
	};

	db.kb.insert(doc, function (err, newDoc) {
		if(err){
			console.error("Error inserting suggestion: " + err);

			req.session.message = "Suggestion failed. Please contact admin.";
			req.session.message_type = "danger";
			res.redirect('/');
		}else{

			// setup keywords
			var keywords = "";
			if(req.body.frm_kb_keywords != undefined){
				keywords = req.body.frm_kb_keywords.toString().replace(/,/g, ' ');
			}

			// create lunr doc
			var lunr_doc = {
				kb_title: req.body.frm_kb_title,
				kb_keywords: keywords,
				kb_body: req.body.frm_kb_body,
				id: newDoc._id
			};

			// add to lunr index
			lunr_index.add(lunr_doc);

			// create lunr doc
			var lunr_tags_doc = {
				kb_keywords: keywords,
				id: newDoc._id
			};

			// add to lunr index
			lunr_tags_index.add(lunr_tags_doc);

			// redirect to new doc
			req.session.message = "Suggestion successfully processed";
			req.session.message_type = "success";
			res.redirect('/');
		}
	});
});

// Update an existing KB article form action
router.post('/save_kb', restrict, function(req, res) {
  	var db = req.db;
		var lunr_index = req.lunr_index;
		var lunr_tags_index = req.lunr_tags_index;

	// if empty, remove the comma and just have a blank string
	var keywords = req.body.frm_kb_keywords;
	if(safe_trim(keywords) == ","){
		keywords = "";
	}

 	db.kb.count({'kb_permalink': req.body.frm_kb_permalink, $not: { _id: req.body.frm_kb_id }}, function (err, kb) {
		if(kb > 0 && req.body.frm_kb_permalink != ""){
			// permalink exits
			req.session.message = "Permalink already exists. Pick a new one.";
			req.session.message_type = "danger";

			// keep the current stuff
			req.session.kb_title = req.body.frm_kb_title;
			req.session.kb_body = req.body.frm_kb_body;
			req.session.kb_keywords = req.body.frm_kb_keywords;
			req.session.kb_permalink = req.body.frm_kb_permalink;

			// redirect to insert
			res.redirect('/edit/' + req.body.frm_kb_id);
		}else{
			db.kb.findOne({_id: req.body.frm_kb_id}, function (err, article) {

				// update author if not set
				var author =  article.kb_author ? article.kb_author : req.session.users_name;
                var author_email = article.kb_author_email ? article.kb_author_email : req.session.user;

				// set published date to now if none exists
				var published_date;
				if(article.kb_published_date == null || article.kb_published_date == undefined){
					published_date = new Date();
				}else{
					published_date = article.kb_published_date;
				}

				db.kb.update({_id: req.body.frm_kb_id},{ $set:
						{   kb_title: req.body.frm_kb_title,
							kb_body: req.body.frm_kb_body,
							kb_published: req.body.frm_kb_published,
							kb_keywords: keywords,
							kb_last_updated: new Date(),
                            kb_last_update_user: req.session.users_name + " - " + req.session.user,
							kb_author: author,
                            kb_author_email: author_email,
							kb_published_date: published_date,
							kb_password: req.body.frm_kb_password,
							kb_permalink: req.body.frm_kb_permalink
						}
					}, {},  function (err, numReplaced) {
					if(err){
						console.error("Failed to save KB: " + err)
						req.session.message = "Failed to save. Please try again";
						req.session.message_type = "danger";
						res.redirect('/edit/' + req.body.frm_kb_id);
					}else{
						// setup keywords
						var keywords = "";
						if(req.body.frm_kb_keywords != undefined){
							keywords = req.body.frm_kb_keywords.toString().replace(/,/g, ' ');
						}

						// create lunr doc
						var lunr_doc = {
							kb_title: req.body.frm_kb_title,
							kb_keywords: keywords,
							kb_body: req.body.frm_kb_body,
							id: req.body.frm_kb_id
						};

						// update the index
						lunr_index.update(lunr_doc, false);

						// create lunr doc
						var lunr_tags_doc = {
							kb_keywords: keywords,
							id: req.body.frm_kb_id
						};

						// update the index
						lunr_tags_index.update(lunr_tags_doc, false);

						req.session.message = "Successfully saved";
						req.session.message_type = "success";
						res.redirect('/edit/' + req.body.frm_kb_id);
					}
				});
			});
		}
	});
});

// logout
router.get('/logout', function(req, res) {
  	req.session.user = null;
	req.session.message = null;
	req.session.message_type = null;
	res.redirect('/');
});

// users
router.get('/users', restrict, function(req, res) {
	var config = require('./config');

	req.db.users.find({}, function (err, users) {
		res.render('users', {
		  	title: 'Users',
			users: users,
			config: config,
			is_admin: req.session.is_admin,
			helpers: req.handlebars.helpers,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
		});
	});
});

// users
router.get('/user/edit/:id', restrict, function(req, res) {
	var config = require('./config');

	req.db.users.findOne({_id: req.params.id}, function (err, user) {

        // if the user we want to edit is not the current logged in user and the current user is not
        // an admin we render an access denied message
        if(user.user_email != req.session.user && req.session.is_admin == "false"){
            req.session.message = "Access denied";
            req.session.message_type = "danger";
            res.redirect('/Users/');
            return;
        }

		res.render('user_edit', {
		  	title: 'User edit',
			user: user,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
            helpers: req.handlebars.helpers,
			config: config
		});
	});
});

// users
router.get('/users/new', restrict, function(req, res) {
	var config = require('./config');

	req.db.users.findOne({_id: req.params.id}, function (err, user) {
		res.render('user_new', {
		  	title: 'User - New',
			user: user,
			session: req.session,
            message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			config: config
		});
	});
});

// kb list
router.get('/articles', restrict, function(req, res) {
	var config = require('./config');

	req.db.kb.find({}).sort({kb_published_date: -1}).limit(10).exec(function (err, articles) {
		res.render('articles', {
		  	title: 'Articles',
			articles: articles,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			config: config,
			helpers: req.handlebars.helpers
		});
	});
});

router.get('/articles/all', restrict, function(req, res) {
    var config = require('./config');

	req.db.kb.find({}).sort({kb_last_updated: -1}).exec(function (err, articles) {
		res.render('articles', {
		    title: 'Articles',
			articles: articles,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			config: config,
			helpers: req.handlebars.helpers
		});
	});
});

router.get('/articles/:tag', function(req, res) {
	var db = req.db;
	var lunr_index = req.lunr_index;
	var config = require('./config');
	var helpers = req.handlebars.helpers;

	// we strip the ID's from the lunr index search
	var lunr_id_array = new Array();
	lunr_index.search(req.params.tag).forEach(function(id) {
		lunr_id_array.push(id.ref);
	});

	// we search on the lunr indexes
	db.kb.find({ _id: { $in: lunr_id_array}}).sort({kb_last_updated: -1}).exec(function (err, results) {
		res.render('articles', {
			title: 'Articles',
			"results": results,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			search_term: req.params.tag,
			config: config,
			helpers: helpers,
		});
	});
});

// update the published state based on an ajax call from the frontend
router.post('/published_state', restrict, function(req, res) {
	req.db.kb.update({ _id: req.body.id}, { $set: { kb_published: req.body.state} }, { multi: false }, function (err, numReplaced) {
		if(err){
			console.error("Failed to update the published state: " + err);
			res.writeHead(400, { 'Content-Type': 'application/text' });
			res.end('Published state not updated');
		}else{
			res.writeHead(200, { 'Content-Type': 'application/text' });
			res.end('Published state updated');
		}
	});
});

// insert a user
router.post('/user_insert', restrict, function(req, res) {
  	var db = req.db;
	var bcrypt = req.bcrypt;
	var url = require('url');

	// set the account to admin if using the setup form. Eg: First user account
	var url_parts = url.parse(req.header('Referer'));

	var is_admin = "false";
	if(url_parts.path == "/setup"){
		is_admin = "true";
	}

	var doc = {
        users_name: req.body.users_name,
        user_email: req.body.user_email,
		user_password: bcrypt.hashSync(req.body.user_password),
		is_admin: is_admin
	};

    // check for existing user
    db.users.findOne({'user_email': req.body.user_email}, function (err, user) {
        if(user){
            // user already exists with that email address
            console.error("Failed to insert user, possibly already exists: " + err);
            req.session.message = "A user with that email address already exists";
            req.session.message_type = "danger";
            res.redirect('/users/new');
        }else{
            // email is ok to be used.
            db.users.insert(doc, function (err, doc) {
                // show the view
                if(err){
                    console.error("Failed to insert user: " + err);
                    req.session.message = "User exists";
                    req.session.message_type = "danger";
                    res.redirect('/user/edit/' + doc._id);
                }else{
                    req.session.message = "User account inserted";
                    req.session.message_type = "success";

                    // if from setup we add user to session and redirect to login.
                    // Otherwise we show users screen
                    if(url_parts.path == "/setup"){
                        req.session.user = req.body.user_email;
                        res.redirect('/login');
                    }else{
                        res.redirect('/Users');
                    }
                }
            });
        }
    });
});

// update a user
router.post('/user_update', restrict, function(req, res) {
  	var db = req.db;
	var bcrypt = req.bcrypt;

    var is_admin = req.body.user_admin == 'on' ? "true" : "false";

    // get the user we want to update
    req.db.users.findOne({_id: req.body.user_id}, function (err, user) {
        // if the user we want to edit is not the current logged in user and the current user is not
        // an admin we render an access denied message
        if(user.user_email != req.session.user && req.session.is_admin == "false"){
            req.session.message = "Access denied";
            req.session.message_type = "danger";
            res.redirect('/Users/');
            return;
        }

        // create the update doc
        var update_doc = {};
        update_doc.is_admin = is_admin;
        update_doc.users_name = req.body.users_name;
        if(req.body.user_password){
            update_doc.user_password = bcrypt.hashSync(req.body.user_password);
        }

        db.users.update({ _id: req.body.user_id },
            {
                $set:  update_doc
            }, { multi: false }, function (err, numReplaced) {
            if(err){
                console.error("Failed updating user: " + err);
                req.session.message = "Failed to update user";
                req.session.message_type = "danger";
                res.redirect('/user/edit/' + req.body.user_id);
            }else{
                // show the view
                req.session.message = "User account updated.";
                req.session.message_type = "success";
                res.redirect('/user/edit/' + req.body.user_id);
            }
        });
    });
});

// login form
router.get('/login', function(req, res) {
	var config = require('./config');

	req.db.users.count({}, function (err, user_count) {
		// we check for a user. If one exists, redirect to login form otherwise setup
		if(user_count > 0){
			// set needs_setup to false as a user exists
			req.session.needs_setup = false;
			res.render('login', {
			  	title: 'Login',
				referring_url: req.header('Referer'),
				config: config,
				message: clear_session_value(req.session, "message"),
				message_type: clear_session_value(req.session, "message_type"),
				show_footer: "show_footer"
			});
		}else{
			// if there are no users set the "needs_setup" session
			req.session.needs_setup = true;
			res.redirect('/setup');
		}
	});
});

// setup form is shown when there are no users setup in the DB
router.get('/setup', function(req, res) {
	var config = require('./config');

	req.db.users.count({}, function (err, user_count) {
		// dont allow the user to "re-setup" if a user exists.
		// set needs_setup to false as a user exists
		req.session.needs_setup = false;
		if(user_count == 0){
			res.render('setup', {
			  	title: 'Setup',
				config: config,
				message: clear_session_value(req.session, "message"),
				message_type: clear_session_value(req.session, "message_type"),
				show_footer: "show_footer"
			});
		}else{
			res.redirect('/login');
		}
	});
});

// Loops files on the disk, checks for their existance in any KB articles and removes non used files.
router.get('/file_cleanup', restrict, function(req, res) {
	var path = require('path');
	var fs = require('fs');
	var walk    = require('walk');
    var walkPath = path.join("public", "uploads", "inline_files");
    var walker  = walk.walk(walkPath, { followLinks: false });

    walker.on('file', function(root, stat, next) {
        var file_name = path.join(root, stat.name);

        // find posts with the file in question
        req.db.kb.find({"kb_body": new RegExp(stat.name)}).exec(function (err, posts) {
            // if the images doesn't exists in any posts then we remove it
            if(posts.length == 0){
                fs.unlinkSync(file_name);
            }
            next();
        });
    });

	walker.on("end", function (){
		req.session.message = "All unused files have been removed";
		req.session.message_type = "success";
    	res.redirect(req.header('Referer'));
  	});
});

// validate the permalink
router.post('/api/validate_permalink', function(req, res){
	var db = req.db;

	// if doc id is provided it checks for permalink in any docs other that one provided,
	// else it just checks for any kb's with that permalink
	var query = {};
	if(req.body.doc_id == ""){
		query = {'kb_permalink': req.body.permalink};
	}else{
		query = {'kb_permalink': req.body.permalink, $not: { _id: req.body.doc_id }};
	}

	db.kb.count(query, function (err, kb) {
		if(kb > 0){
			res.writeHead(400, { 'Content-Type': 'application/text' });
			res.end('Permalink already exists');
		}else{
			res.writeHead(200, { 'Content-Type': 'application/text' });
			res.end('Permalink validated successfully');
		}
	});
});

// login the user and check the password
router.post('/login_action', function(req, res){
    var db = req.db;
	var bcrypt = req.bcrypt;
	var url = require('url');

	db.users.findOne({user_email: req.body.email}, function (err, user) {
		// check if user exists with that email
		if(user === undefined || user === null){
			req.session.message = "A user with that email does not exist.";
			req.session.message_type = "danger";
			res.redirect('/login');
		}else{
			// we have a user under that email so we compare the password
			if(bcrypt.compareSync(req.body.password, user.user_password) == true){
				req.session.user = req.body.email;
                req.session.users_name = user.users_name;
				req.session.user_id = user._id;
				req.session.is_admin = user.is_admin;
				if(req.body.frm_referring_url === undefined || req.body.frm_referring_url == ""){
					res.redirect('/');
				}else{
					var url_parts = url.parse(req.body.frm_referring_url, true);
					if(url_parts.pathname != "/setup" && url_parts.pathname != "/login"){
						res.redirect(req.body.frm_referring_url);
					}else{
						res.redirect('/');
					}
				}
			}else{
				// password is not correct
				req.session.message = "Access denied. Check password and try again.";
				req.session.message_type = "danger";
				res.redirect('/login');
			}
		}
	});
});

// delete user
router.get('/user/delete/:id', restrict, function(req, res) {
  	var db = req.db;

	// remove the article
	if(req.session.is_admin == "true"){
		db.users.remove({_id: req.params.id}, {}, function (err, numRemoved) {
			req.session.message = "User deleted.";
			req.session.message_type = "success";
			res.redirect("/users");
	  	});
	}else{
		req.session.message = "Access denied.";
		req.session.message_type = "danger";
		res.redirect("/users");
	}
});

// delete article
router.get('/delete/:id', restrict, function(req, res) {
  	var db = req.db;
		var lunr_index = req.lunr_index;
		var lunr_tags_index = req.lunr_tags_index;

	// remove the article
	db.kb.remove({_id: req.params.id}, {}, function (err, numRemoved) {

		// setup keywords
		var keywords = "";
		if(req.body.frm_kb_keywords != undefined){
			keywords = req.body.frm_kb_keywords.toString().replace(/,/g, ' ');
		}

		// create lunr doc
		var lunr_doc = {
			kb_title: req.body.frm_kb_title,
			kb_keywords: keywords,
			kb_body: req.body.frm_kb_body,
			id: req.body.frm_kb_id
		};

		// remove the index
		lunr_index.remove(lunr_doc, false);

		// create lunr doc
		var lunr_tags_doc = {
			kb_keywords: keywords,
			id: req.body.frm_kb_id
		};

		// remove the index
		lunr_tags_index.remove(lunr_tags_doc, false);

		// redirect home
		req.session.message = "Article successfully deleted";
		req.session.message_type = "success";
		res.redirect('/articles');
  	});
});

var multer_upload  = require('multer')
var inline_upload = multer_upload({ dest: path.join('public','uploads','inline_files') });
router.post('/file/upload_file', restrict, inline_upload.single('file'), function (req, res, next) {
	var fs = require('fs');

	if(req.file){
		// check for upload select
		var upload_dir = path.join('public','uploads','inline_files');
		var relative_upload_dir = path.join('/uploads','inline_files');

		var file = req.file;
		var source = fs.createReadStream(file.path);
		var dest = fs.createWriteStream(path.join(upload_dir,file.originalname));

		// save the new file
		source.pipe(dest);
		source.on("end", function() {});

		// delete the temp file.
		fs.unlink(file.path, function (err) {});

		// uploaded
		res.writeHead(200, { 'Content-Type': 'application/json' });
		var filenameURL = relative_upload_dir + "/" + file.originalname;
		filenameURL = filenameURL.replace(/\\/g,"/");
		res.end(JSON.stringify({ 'filename': filenameURL }, null, 3));
		return;
	}else{
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ 'filename': 'fail' }, null, 3));
		return;
	}
});

router.post('/file/new_dir', restrict, function (req, res, next) {
	var mkdirp = require('mkdirp');

	// if new directory exists
	if(req.body.custom_dir){
		mkdirp(path.join("public","uploads",req.body.custom_dir), function (err) {
			if (err){
				console.error("Directory creation error: " + err);
				req.session.message = "Directory creation error. Please try again";
				req.session.message_type = "danger";
				res.redirect('/files');
			}else{
				req.session.message = "Directory successfully created";
				req.session.message_type = "success";
				res.redirect('/files');
			}
		});
	}else{
		req.session.message = "Please enter a directory name";
		req.session.message_type = "danger";
		res.redirect('/files');
	}
});

// upload the file
var multer  = require('multer')
var upload = multer({ dest: 'public/uploads/' });
router.post('/file/upload', restrict, upload.single('upload_file'), function (req, res, next) {
	var fs = require('fs');

	if(req.file){
		// check for upload select
		var upload_dir = "public/uploads/";
		if(req.body.directory != "/uploads"){
			upload_dir = "public/" + req.body.directory;
		}

		var file = req.file;
		var source = fs.createReadStream(file.path);
		var dest = fs.createWriteStream(upload_dir + "/" + file.originalname.replace(/ /g,"_"));

		// save the new file
		source.pipe(dest);
		source.on("end", function() {});

		// delete the temp file.
		fs.unlink(file.path, function (err) {});

		req.session.message = "File uploaded successfully";
		req.session.message_type = "success";
		res.redirect('/files');
	}else{
		req.session.message = "File upload error. Please select a file.";
		req.session.message_type = "danger";
		res.redirect('/files');
	}
});

// delete a file via ajax request
router.post('/file/delete', restrict, function(req, res) {
	var fs = require('fs');

	req.session.message = null;
	req.session.message_type = null;

	fs.unlink("public/" + req.body.img, function (err) {
		if(err){
			console.error("File delete error: "+ err);
			res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Failed to delete file: ' + err);
		}else{

			res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end('File deleted successfully');
		}
	});
});

router.get('/files', restrict, function(req, res) {
	var config = require('./config');
	var glob = require("glob");
	var fs = require("fs");

	// loop files in /public/uploads/
	glob("public/uploads/**", {nosort: true}, function (er, files) {

		// sort array
		files.sort();

		// declare the array of objects
		var file_list = new Array();
		var dir_list = new Array();

		// loop these files
		for (var i = 0; i < files.length; i++) {

			// only want files
			if(fs.lstatSync(files[i]).isDirectory() == false){
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
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
		});
	});
});

// insert form
router.get('/insert', restrict, function(req, res) {
	var config = require('./config');
	var helpers = req.handlebars.helpers;

	res.render('insert', {
		title: 'Insert new',
		session: req.session,
		kb_title: clear_session_value(req.session, "kb_title"),
		kb_body: clear_session_value(req.session, "kb_body"),
		kb_keywords: clear_session_value(req.session, "kb_keywords"),
		kb_permalink: clear_session_value(req.session, "kb_permalink"),
		message: clear_session_value(req.session, "message"),
		message_type: clear_session_value(req.session, "message_type"),
		editor: true,
		helpers: helpers,
		config: config
	});
});

// search kb's
router.get('/search/:tag', restrict, function(req, res) {
	var db = req.db;
	var search_term = req.params.tag;
	var lunr_index = req.lunr_index;
	var config = require('./config');
	var helpers = req.handlebars.helpers;

	// we strip the ID's from the lunr index search
	var lunr_id_array = new Array();
	lunr_index.search(search_term).forEach(function(id) {
		lunr_id_array.push(id.ref);
	});

	// we search on the lunr indexes
	db.kb.find({ _id: { $in: lunr_id_array}, kb_published:'true'}, function (err, results) {
		res.render('index', {
			title: 'Results',
			"results": results,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			search_term: search_term,
			config: config,
			helpers: helpers,
			show_footer: "show_footer"
		});
	});
});

// search kb's
router.get('/searchtag/:tag', restrict, function(req, res) {
	var db = req.db;
	var search_term = req.params.tag;
	var lunr_tags_index = req.lunr_tags_index;
	var config = require('./config');
	var helpers = req.handlebars.helpers;

	// we strip the ID's from the lunr index search
	var lunr_id_array = new Array();
	lunr_tags_index.search(search_term).forEach(function(id) {
		lunr_id_array.push(id.ref);
	});

	// we search on the lunr indexes
	db.kb.find({ _id: { $in: lunr_id_array}, kb_published:'true'}, function (err, results) {
		res.render('index', {
			title: 'Results',
			"results": results,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			search_term: search_term,
			config: config,
			helpers: helpers,
			show_footer: "show_footer"
		});
	});
});

// search kb's
router.post('/search', restrict, function(req, res) {
	var db = req.db;
	var search_term = req.body.frm_search;
	var lunr_index = req.lunr_index;
	var helpers = req.handlebars.helpers;
	var config = require('./config');

	// we strip the ID's from the lunr index search
	var lunr_id_array = new Array();
	lunr_index.search(search_term).forEach(function(id) {
		lunr_id_array.push(id.ref);
	});

	// we search on the lunr indexes
	db.kb.find({ _id: { $in: lunr_id_array}, kb_published:'true'}, function (err, results) {
		res.render('index', {
			title: 'Results',
			"results": results,
			session: req.session,
			search_term: search_term,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type"),
			config: config,
			helpers: helpers,
			show_footer: "show_footer"
		});
	});
});

// export files into .md files and serve to browser
router.get('/export', restrict, function(req, res) {
	var db = req.db;
	var fs = require('fs');
	var JSZip = require("jszip");

	// dump all articles to .md files. Article title is the file name and body is contents
	db.kb.find({}, function (err, results) {

		// files are written and added to zip.
		var zip = new JSZip();
		for (var i = 0; i < results.length; i++) {
			// add and write file to zip
			zip.file(results[i].kb_title + ".md", results[i].kb_body);
		}

		// save the zip and serve to browser
		var buffer = zip.generate({type:"nodebuffer"});
		fs.writeFile("data/export.zip", buffer, function(err) {
			if (err) throw err;
			res.set('Content-Type', 'application/zip')
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
	var config = require('./config');

	if(config.settings.suggest_allowed == true){
		next();
		return;
	}else{
		res.render('error', { message: '403 - Forbidden' });
	}
}

// This is called on all URL's. If the "password_protect" config is set to true
// we check for a login on thsoe normally public urls. All other URL's get
// checked for a login as they are considered to be protected. The only exception
// is the "setup", "login" and "login_action" URL's which is not checked at all.
function restrict(req, res, next){
	var config = require('./config');
	var url_path = req.url;

	// if not protecting we check for public pages and don't check_login
	if(url_path.substring(0,5).trim() == "/"){
		if(config.settings.password_protect == false){
			next();
			return;
		}
	}
	if(url_path.substring(0,7) == "/search"){
		if(config.settings.password_protect == false){
			next();
			return;
		}
	}
	if(url_path.substring(0,11) == "/searchtags"){
		if(config.settings.password_protect == false){
			next();
			return;
		}
	}
	if(url_path.substring(0,3) == "/kb"){
		if(config.settings.password_protect == false){
			next();
			return;
		}
	}

	if(url_path.substring(0,12) == "/user_insert"){
		next();
		return;
	}

	// if the "needs_setup" session variable is set, we allow as
	// this means there is no user existing
	if(req.session.needs_setup == true){
		res.redirect('/setup');
		return;
	}

	// if not a public page we
	check_login(req, res, next);
}

// does the actual login check
function check_login(req, res, next){
	if(req.session.user){
		next();
	}else{
		res.redirect('/login');
	}
}

function safe_trim(str){
	if(str != undefined){
		return str.trim();
	}else{
		return str;
	}
}

module.exports = router;
