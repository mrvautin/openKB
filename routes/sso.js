const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const router = express.Router();

router.get('/auth/google', passport.authenticate('google', { scope: 'email' }));

router.get('/auth/google/callback', function(req, res, next) {
    passport.authenticate('google', function(err, user, info) {

        if (err) {
            return next(err);
        }

        if (!user) {
            req.session.message = req.i18n.__('A user with that email does not exist.');
            req.session.message_type = 'danger';
            res.redirect(req.app_context + '/login');
        }

        if (user) {
            req.session.user = user.user_email;
            req.session.users_name = user.users_name;
            req.session.user_id = user._id.toString();
            req.session.is_admin = user.is_admin;
            res.redirect(req.app_context + '/');
        }

    })(req, res, next);
});


passport.use(new GoogleStrategy({
        clientID: "CHANGE",
        clientSecret: "CHANGE",
        callbackURL: "CHANGE",
        passReqToCallback: true
    },
    function(req, token, tokenSecret, profile, done) {
        const db = req.app.db;
        db.users.findOne({ user_email: profile.emails[0].value }, function(err, user) {

            if (err) {
                return done(err)
            }

            if (!user) {
                return done(null, false)
            }

            return done(null, user, { scope: 'all' })

        });
    }
));

module.exports = router;