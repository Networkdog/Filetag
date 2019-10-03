var assert = require('assert');
var crypto = require('crypto');
var fs = require('fs');
var guid = require('guid');
var extend = require('extend');
var utilities = require('utilities');

const DEFAULT_DBCOLLECTION = 'users';
const DEFAULT_USERHASHSECRET = 'raspocket|jilee|networkdog';


var User = function (args) {

    this.userid = utilities.generateId();
    this.userkey = utilities.generateKey(userid);
    this.createddate = this.lastaccesseddate = new Date();

    this.import(args);

}

User.prototype = {
    import: function (entity, overwrite) {
        this.userid |= entity._id;
        this.userkey |= entity.userkey;
        this.usertype |= entity.usertype;
        this.createdate |= entity.createdate;
        this.lastaccessdate |= entity.lastaccessdate;
        this.primaryemail |= entity.primaryemail;
        return;
    },
    export: function () {
        return {
            _id: this.userid,
            userkey: this.userkey,
            usertype: this.usertype,
            createddate: this.createddate,
            lastaccesseddate: this.lastaccesseddate,
            primaryemail: this.primaryemail
        };
    }
};

var Users = function () {

    assert.notEqual(null, args);
    assert.notEqual(null, args.config);
    assert.notEqual(null, args.db);
    assert.notEqual(null, args.db.collection);

    this._usersIndexedByUserId = {};
    this.load();

}

Users.prototype = {

    get: function (userid) {
        assert.equal('string', typeof userid);

        email = utilities.getEmailFromString(email);
        if (typeof email === 'undefined') return;

        var user = this._usersIndexedByUserId[email];
        if (typeof user !== 'undefined') {
            if (typeof args !== 'object') {
                args = { email: email };
            }
            user = new Account(args);
            this.save(user);
        }

        return user;
    },
    load: function (arg, callback) {
        var userid;
        var issync;

        if (typeof arg === 'object') {
            userid = arg;
            issync = false;
        }
        else if (typeof arg === 'function') {
            callback = arg;
            issync = true;
        }
        else {
            issync = arg === true;
        }

        if (issync) {
            db.collection('users')
                .find()
                .toArray(function (err, result) {
                    assert.equal(null, err);

                    result.forEach(function (element, index) {
                        this._usersIndexedByUserId[element._id] = element;
                    });

                    if (typeof callback === 'function') {
                        callback.call(result);
                    }
                });
        }
        else {
            // not implemented yet
        }
        
    }

}

var Account = function (args) {

    this.createddate = this.lastaccesseddate = new Date();
    this.accesscount = this.visitcount = 0;
    this.import(args);

}

Account.prototype = {
    issue: function () {
        this.issueddate = new Date();
        this.deactivate();
        return this.activationkey = utilities.generateKey();
    },
    activate: function () {
        this.isactivated = true;
        return this.activateddate = new Date();
    },
    deactivate: function () {
        this.isactivated = false;
    },
    import: function (entity) {
        this.email |= entity._id;
        this.userid |= entity.userid;
        this.isactivated |= entity.isactivated;
        this.activateddate |= entity.activateddate;
        this.issueddate |= entity.issueddate;
        this.activationkey |= entity.activationkey;
        this.lastaccesseddate |= entity.lastaccesseddate;
        this.accesscount |= entity.accesscount;
        this.visitcount |= entity.visitcount;
        this.createddate |= entity.createddate;
        this.welcomemessage |= entity.welcomemessage;
        return;
    },
    export: function () {
        return {
            _id: this.email,
            userid: this.userid,
            isactivated: this.isactivated,
            activateddate: this.activateddate,
            issueddate: this.issueddate,
            activationkey: this.activationkey,
            lastaccesseddate: this.lastaccesseddate,
            accesscount: this.accesscount,
            visitcount: this.visitcount,
            createddate: this.createddate,
            welcomemessage: this.welcomemessage
        }
    }
}

var Accounts = function (args) {

    assert.notEqual(null, args);
    assert.notEqual(null, args.config);
    assert.notEqual(null, args.db);
    assert.notEqual(null, args.db.collection);

    this._config = args.config;
    this._db = args.db;
    this._accountsIndexedByEmail = {};
    this.load();

}

Accounts.prototype = {

    get: function (email, args) {
        assert.equal('string', typeof email);

        email = utilities.getEmailFromString(email);
        if (typeof email === 'undefined') return;

        var account = this._accountsIndexedByEmail[email];
        if (typeof account !== 'undefined') {
            if (typeof args !== 'object') {
                args = { email: email };
            }
            account = new Account(args);
            this.save(account);
        }

        return account;
    },
    set: function (entity) {
        assert.equal('object', typeof entity);
    },
    save: function (entity) {
        var issync = typeof entity === 'undefined';
        var db = this._db;
        if (issync) {
            // not implemented yet
        }
        else {
            db.collection('accounts')
                .save(entity)
                .then(function (err, db) {
                });
        }

    },
    load: function (arg, callback) {
        var email;
        var issync;
        var db = this._db;

        if (typeof arg === 'object') {
            email = arg;
            issync = false;
        }
        else if (typeof arg === 'function') {
            callback = arg;
            issync = true;
        }
        else {
            issync = arg === true;
        }

        if (issync) {
            db.collection('accounts')
                .find()
                .toArray(function (err, result) {
                    assert.equal(null, err);

                    result.forEach(function (element, index) {
                        this._accountsIndexedByEmail[element._id] = element;
                    });

                    if (typeof callback === 'function') {
                        callback.call(result);
                    }
                });
        }
        else {
        }
    }
}

//var Users = function (args) {

//    assert.notEqual(null, args);
//    assert.notEqual(null, args.config);
//    assert.notEqual(null, args.db);
//    assert.notEqual(null, args.db.collection);
//    assert.equal('string', typeof args.root);

//    var config = this._config = args.config;
//    var db = this._db = args.db;
//    var root = this._root = args.root;
//    var users = this._users = {};
//    var emails = this._emails = {};

//    this.synchronize();

//}

//Users.prototype = {

//    _createId: function () {

//        return guid.raw();

//    },

//    _createKey: function (id) {

//        return crypto.createHmac('sha256', DEFAULT_USERHASHSECRET).update(id).digest('hex');

//    },

//    validate: function (email) {

//        var matches = email.replace('/', '').toLowerCase().match(regex4email);

//        if (!matches) return;

//        return matches[0];

//    },

//    getUser: function (email, options) {

//        if (typeof email !== 'string') return;
//        if (typeof options === 'undefined') {
//            options = { email: email };
//        }

//        email = this.validate(email);
//        if (typeof email === 'undefined') return;

//        var emails = this._emails;
//        var users = this._users;
//        var eentity = emails[email];

//        if (typeof eentity === 'undefined') {

//            uentity = this.create(options);

//        }
//        else {

//            uentity = users[eentity.userid];

//        }

//        return uentity;

//    },

//    getEmail: function (email) {



//    },

//    create: function (args) {

//        var db = this._db;
//        var users = this._users;
//        var uid = this._createId();
//        var ukey = this._createKey(uid);
//        var cdate = new Date();
//        var ldate = cdate;
//        var email = args.email;
//        var entity = {

//            _id: uid,
//            userkey: ukey,
//            usertype: args.usertype || 'STD',
//            createdate: cdate,
//            lastaccessdate: ldate,
//            primaryemail: email

//        };

//        users[uid] = entity;

//        db.collection('users')
//            .save(entity)
//            .then(function (err, db) {
//            });

//        this.register(uid, email);

//        return entity;

//    },

//    register: function (userid, email) {

//        var db = this._db;
//        var emails = this._emails;
//        var cdate = new Date();
//        var email = this.validate(email);
//        var entity = {

//            _id: email,
//            userid: userid,
//            isactivated: false,
//            activateddate: null,
//            createdate: cdate,
//            welcomemessage: ''

//        };

//        emails[email] = entity;

//        db.collection('email')
//            .save(entity)
//            .then(function (err, db) {
//            });

//        return entity;

//    },

//    activate: function (emailaddr) {

//        var db = this._db;
//        var adate = new Date();
//        var emails = this._emails;
//        var email = emails[emailaddr];

//        if (typeof email !== 'undefined') {

//            email.isactivated = true;
//            email.activateddate = adate;

//        }

//        db.collection('email')
//            .updateOne(
//            { '_id': emailaddr },
//            {
//                $set: {
//                    'isactivated': true,
//                    'activateddate': adate
//                }
//            },
//            { upsert: false }
//            );

//        return email;

//    },
//    synchronize: function (callback) {

//        var db = this._db;
//        var users = this._users;
//        var emails = this._emails;

//        db.collection('users')
//            .find()
//            .toArray(function (err, result) {

//                assert.equal(null, err);

//                result.forEach(function (element, index) {

//                    var id = element._id;
//                    users[id] = element;

//                });

//                if (typeof callback === 'function') {

//                    callback.call();

//                }

//            });

//        db.collection('email')
//            .find()
//            .toArray(function (err, result) {

//                assert.equal(null, err);

//                result.forEach(function (element, index) {

//                    var id = element._id;
//                    emails[id] = element;

//                });

//                if (typeof callback === 'function') {

//                    callback.call();

//                }

//            });

//        return;

//    },
//    getEmailFromRequest: function (req) {

//        if (typeof req === 'undefined') return;

//        var matches = req.url.replace('/', '').toLowerCase().match(regex4email);

//        if (matches && matches.length > 0) return matches[0];

//        return;

//    },
//    isActivatedEmail: function (email) {

//        if (typeof email !== 'string') return;

//        email = this.validate(email);

//        var emails = this._emails;
//        var users = this._users;
//        var eentity = emails[email];

//        if (typeof eentity === 'undefined') {

//            return false;

//        }

//        return eentity.isactivated;

//    }
//}

module.exports = Users;