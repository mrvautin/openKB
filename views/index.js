var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
	var db = req.db;
	var config = require('./config');
	
	// get the top 5 results based on viewcount
	db.kb.find({kb_published:'true'}).sort({kb_viewcount: -1}).limit(config.settings.num_top_results).exec(function (err, top_results) {
 		res.render('index', { 
			 title: 'openKB', 
			 "top_results": top_results, 
			 session: req.session,
			 config: config
		});
	});
});

router.get('/kb/:id', function(req, res) {
  var db = req.db;
  var helpers = req.handlebars.helpers;
  
  db.kb.findOne({_id: req.params.id}, function (err, result) {
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
		// show the view
		res.render('kb', { 
			title: result.kb_title, 
			"result": result,
			session: req.session,
			helpers: helpers
		});
	});
  });
});

// render the editor
router.get('/edit/:id', restrict, function(req, res) {
  var db = req.db;
  
  db.kb.findOne({_id: req.params.id}, function (err, result) {
	res.render('edit', { 
		title: 'Edit article', 
		"result": result,
		session: req.session,
		message: clear_session_value(req.session, "message"),
		message_type: clear_session_value(req.session, "message_type"),
		helpers: req.handlebars.helpers
	});
  });
});

// render the file manager
router.get('/files', function(req, res) {  
	var fs = require('fs');

	var dir = './public/';
	var files = fs.readdirSync(dir);
	
	// hold a list of file objects
	var files_list = [];
	
	// loop the physical files to create a list
	for(var i = 0; i < files.length; i++){
		var file_prop = new Object();
		file_prop.name = files[i];
		file_prop.path = dir + files[i];
		// check if file or dir
		if(fs.lstatSync(dir + files[i]).isDirectory() == true){
			file_prop.type = "dir";
		}else{
			file_prop.type = "file";
		}
		
		files_list.push(file_prop);
	}

	res.render('files', { 
		title: 'File management', 
		files_list: files_list,
		session: req.session
	});
});

// insert new KB form action
router.post('/insert_kb', restrict, function(req, res) {
  	var db = req.db;
  
  	var published_state = "false";
	if(req.body.frm_kb_published == "on"){
		published_state = "true";
	}
	
    var doc = { 
        kb_title: req.body.frm_kb_title,
		kb_body: req.body.frm_kb_body,
		kb_published: published_state,
		kb_keywords: req.body.frm_kb_keywords
	};

	db.kb.insert(doc, function (err, newDoc) {
		if(err){
			console.log(err);
		}else{
			res.redirect('/kb/' + newDoc._id);
		}
	});
});

// Update an existing KB article form action
router.post('/save_kb', restrict, function(req, res) {
  	var db = req.db;
	
	var published_state = "false";
	if(req.body.frm_kb_published == "on"){
		published_state = "true";
	}
 
	db.kb.update({_id: req.body.frm_kb_id},{ $set: 
			{   kb_title: req.body.frm_kb_title,
				kb_body: req.body.frm_kb_body,
				kb_published: published_state,
				kb_keywords: req.body.frm_kb_keywords
			}
		}, {},  function (err, numReplaced) {
		if(err){
			req.session.message = "Failed to save. Please try again";
			req.session.message_type = "danger";
		}else{
			req.session.message = "Successfully saved";
			req.session.message_type = "success";
			res.redirect('/edit/' + req.body.frm_kb_id);
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
	req.db.users.find({}, function (err, users) {
		res.render('users', { 
		  	title: 'Users',
			users: users,
			is_admin: req.session.is_admin,
			helpers: req.handlebars.helpers,
			session: req.session
		});
	});
});

// users
router.get('/user/edit/:id', restrict, function(req, res) {
	req.db.users.findOne({_id: req.params.id}, function (err, user) {
		res.render('user_edit', { 
		  	title: 'User edit',
			user: user,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type")
		});
	});
});

// users
router.get('/users/new', restrict, function(req, res) {
	req.db.users.findOne({_id: req.params.id}, function (err, user) {
		res.render('user_new', { 
		  	title: 'User - New',
			user: user,
			session: req.session,
			message: clear_session_value(req.session, "message"),
			message_type: clear_session_value(req.session, "message_type")
		});
	});
});

// kb list
router.get('/articles', restrict, function(req, res) {
	req.db.kb.find({}, function (err, articles) {
		res.render('articles', { 
		  	title: 'Articles',
			articles: articles,
			session: req.session,
			helpers: req.handlebars.helpers
		});
	});
});

// update the published state based on an ajax call from the frontend
router.post('/published_state', restrict, function(req, res) {
	req.db.kb.update({ _id: req.body.id}, 
		{ 
			$set: { 
				kb_published: req.body.state
			} 
		}, { multi: false }, function (err, numReplaced) {
			console.log(err);
	});
});	

// create a new user
router.post('/user_new', restrict, function(req, res) {
  	var db = req.db;
  
    var doc = { 
        user_email: req.body.user_email,
		user_password: req.body.user_email
	};

	db.users.insert(doc, function (err, newDoc) {
		console.log(err);
		console.log(newDoc);
	});
});

// insert a user
router.post('/user_insert', function(req, res) {
  	var db = req.db;
	var bcrypt = req.bcrypt;
	
	var doc = { 
        user_email: req.body.user_email,
		user_password: req.body.user_password,
		is_admin: "false"
	};
	
	db.users.insert(doc, function (err, doc) {
		// show the view
		req.session.message = "User account inserted.";
		req.session.message_type = "success";
		res.redirect('/user/edit/' + doc._id);
	});
});

// update a user
router.post('/user_update', function(req, res) {
  	var db = req.db;
	var bcrypt = req.bcrypt;
	
	db.users.update({ _id: req.body.user_id }, 
		{ 
			$set: { 
				user_password: bcrypt.hashSync(req.body.user_password)
			} 
		}, { multi: false }, function (err, numReplaced) {
		
		// show the view
		req.session.user = req.body.user_email;
		req.session.message = "User account updated.";
		req.session.message_type = "success";
		res.redirect('/user/edit/' + req.body.user_id);
	});
});

// login form
router.get('/login', function(req, res) {
  	res.render('login', { 
	  	title: 'Login', 
		message: clear_session_value(req.session, "message"), 
		message_type: clear_session_value(req.session, "message_type")
	});
});

// login the user and check the password
router.post('/login_action', function(req, res){
    var db = req.db;
	var bcrypt = req.bcrypt;
	
	db.users.findOne({user_email: req.body.email}, function (err, user) {  
		
		// check if user exists with that email
		if(user === undefined){
			req.session.message = "A user with that email does not exist.";
			req.session.message_type = "danger";
			res.redirect('/login');
		}else{
			// we have a user under that email so we compare the password
			if(bcrypt.compareSync(req.body.password, user.user_password) == true){
				req.session.user = req.body.email;
				req.session.user_id = user._id;
				req.session.is_admin = user.is_admin;
				res.redirect('/');
			}else{
				// password is not correct
				req.session.message = "Access denied. Check password and try again.";
				req.session.message_type = "danger";
				res.redirect('/login');
			}
		}
	});
});

// delete article
router.get('/delete/:id', restrict, function(req, res) {
  	var db = req.db;
	
	// remove the article
	db.kb.remove({_id: req.params.id}, {}, function (err, numRemoved) {
		res.redirect('/');
  	});
});

// insert form
router.get('/insert', restrict, function(req, res) {
	res.render('insert', { title: 'Insert new', session: req.session });
});

// search kb's
router.get('/search/test', restrict, function(req, res) {
  var db = req.db;
  //var search_term = req.params.tag;
  console.log("here");
  // we search on the keywords and the title for the search text
  //db.kb.find({'$or':[{kb_keywords:new RegExp(search_term,'i')},{kb_title:new RegExp(search_term,'i')}], kb_published:'true'}).exec(function(err, results) {
//	  res.render('index', { title: 'Results', "results": results, session: req.session, search_term: search_term});
  //});
});

// search kb's
router.post('/search', restrict, function(req, res) {
  var db = req.db;
  var search_term = req.body.frm_search;
  
  // we search on the keywords and the title for the search text
  db.kb.find({'$or':[{kb_keywords:new RegExp(search_term,'i')},{kb_title:new RegExp(search_term,'i')}], kb_published:'true'}).exec(function(err, results) {
	  res.render('index', { title: 'Results', "results": results, session: req.session, search_term: search_term});
  });
});

function clear_session_value(session, session_var){
	if(session_var == "message"){
		var sess_message = session.message;
		session.message = null;
		return sess_message;
	}
	if(session_var == "message_type"){
		var sess_message_type = session.message_type;
		session.message_type = null;
		return sess_message_type;
	}
}

// check if a session for the user exists
// redirect to login form if not
function restrict(req, res, next){
	if(req.session.user){
		next();
	}else{
		res.redirect('/login');
	}
}

module.exports = router;
