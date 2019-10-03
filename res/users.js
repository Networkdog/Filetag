var assert = require('assert');
var extend = require('extend');
var utilities = require('./utilities.js');

const USERID_ANONYMOUS = '00000000-0000-0001-0005-000000000007';

var User = function (props, users) {
    var now = new Date();
    var userid = utilities.generateId();
    var userkey = utilities.generateKey(userid);
    this._parent = users;
    this._context = users.getContext();
    this.import(
        extend({
            _id: userid,
            userkey: userkey,
            createddate: now,
            lastaccesseddate: now,
            isenabled: true
        }, props));
}

User.prototype = {
    save: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var user = this;
        var db = this._context.db;
        db.collection('users')
            .save(this.export())
            .then(function (err, db) {
                if (typeof callback === 'function') {
                    assert.equal(null, err);
                    callback.call(user, err, db);
                }
            });
        return;
    },
    load: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var user = this;
        var db = this._context.db;
        db.collection('users')
            .findOne({ '_id': this.userid })
            .then(function (result) {
                user.import.call(user, result);
            });
        return;
    },
    import: function (props) {
        this.userid = props._id || props.userid || USERID_ANONYMOUS;
        this.userkey = props.userkey;
        this.usertype = props.usertype;
        this.createdate = props.createdate;
        this.lastaccessdate = props.lastaccessdate;
        this.primaryemail = props.primaryemail;
        this.isenabled = props.isenabled;
        return;
    },
    export: function () {
        return {
            _id: this.userid,
            userkey: this.userkey,
            usertype: this.usertype,
            createddate: this.createddate,
            lastaccesseddate: this.lastaccesseddate,
            primaryemail: this.primaryemail,
            isenabled: this.isenabled
        };
    }
};

var Users = function (config, context, callback) {
    assert.notStrictEqual('undefined', typeof config);
    assert.notStrictEqual('undefined', typeof context);
    assert.notStrictEqual('undefined', typeof context.db);
    assert.notStrictEqual('undefined', typeof context.db.collection);

    this._config = config;
    this._context = context;
    this._db = context.db;
    this._usersIndexedByUserId = {};
    this.load(callback);
}

Users.prototype = {
    getConfig: function () {
        return this._config;
    },
    getContext: function () {
        return this._context;
    },
    get: function (userid, props) {
        assert.strictEqual('string', typeof userid);

        userid = utilities.getGuidFromString(userid);
        if (typeof userid === 'undefined') return;

        var user = this._usersIndexedByUserId[userid];
        if ((typeof user === 'undefined')
            && (typeof props !== 'undefined')) {
            user = this.set(props);
        }

        return user;
    },
    set: function (props) {
        assert.strictEqual('object', typeof props);

        var user = new User(props, this);
        var users = this._usersIndexedByUserId;
        users[user.userid] = user;

        this.save(user);
        return user;
    },
    save: function (user) {
        var db = this._db;

        db.collection('users')
            .save(user.export())
            .then(function (err, db) {
            });
    },
    load: function (callback) {
        var db = this._db;
        var users = this;
        db.collection('users')
            .find()
            .toArray(function (err, result) {
                assert.equal(null, err);

                result.forEach(function (element, index) {
                    users.set(element);
                });

                if (typeof callback === 'function') {
                    callback.call(result, err);
                }
            });
    }

}

module.exports = Users;