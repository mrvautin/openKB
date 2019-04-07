exports.route = function(router) {
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
                config: req.config,
                message: req.common.clear_session_value(req.session, 'message'),
                message_type: req.common.clear_session_value(req.session, 'message_type'),
                show_footer: 'show_footer',
                helpers: req.handlebars
            });
        }else{
            res.redirect(req.app_context + '/login');
        }
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
}

exports.logout = function(req, res) {
  res.redirect(req.app_context + '/');
};

exports.login = function(req, res) {
  var db = req.app.db;
    // set the template
    req.common.setTemplateDir('admin', req);

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
              config: req.config,
              message: req.common.clear_session_value(req.session, 'message'),
              message_type: req.common.clear_session_value(req.session, 'message_type'),
              show_footer: 'show_footer',
              helpers: req.handlebars
          });
      }else{
          // if there are no users set the "needs_setup" session
          req.session.needs_setup = true;
          res.redirect(req.app_context + '/setup');
      }
  });
}