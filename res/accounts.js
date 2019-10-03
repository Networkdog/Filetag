var assert = require('assert');
var extend = require('extend');
var moment = require('moment');
var utilities = require('./utilities.js');

const USERID_ANONYMOUS = '00000000-0000-0001-0005-000000000007';

var Account = function (props, accounts) {
    var now = new Date();

    this._parent = accounts;
    this._context = accounts.getContext();
    this.import(
        extend({
            owneruserid: USERID_ANONYMOUS,
            isactivated: false,
            lastaccesseddate: now,
            accesscount: 0,
            visitcount: 0,
            createddate: now,
            welcomemessage: '',
            isenabled: true
        }, props));
}

Account.prototype = {
    activate: function () {
        this.isactivated = true;
        this.activateddate = new Date();
        return this.activateddate = new Date();
    },
    deactivate: function () {
        this.isactivated = false;
        return;
    },
    isActivated: function () {
        return this.isactivated || false;
    },

    issueSignInCode: function () {
        this.signincode = ('00000' + Math.floor(Math.random() * 1000000 + 1)).slice(-6);
        this.signinexpireddate = moment().add(5, 'minute').toDate();
        this.signinkey = utilities.generateKey(this.signincode);
        this.save();
        return this.signincode;
    },

    verifySignInKey: function (key) {
        return key === this.signinkey;
    },

    verifySignInCode: function (code) {
        if (code === this.signincode) {
            this.signincode = null;
            this.signinexpireddate = null;
            this.save();
            return this.signinkey;
        }
        return;
    },

    setOwner: function (userid) {
        this.owneruserid = userid;
        this.save();
    },
    save: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var account = this;
        var db = this._context.db;
        db.collection('accounts')
            .save(this.export())
            .then(function (err, db) {
                if (typeof callback === 'function') {
                    assert.equal(null, err);
                    callback.call(account, err, db);
                }
            });
        return;
    },
    load: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var account = this;
        var db = this._context.db;
        db.collection('accounts')
            .findOne({ '_id': this.email })
            .then(function (result) {
                account.import.call(account, result);
            });
        return;
    },
    import: function (props) {
        this.email = props._id || props.email;
        this.owneruserid = props.owneruserid;
        this.isactivated = props.isactivated;
        this.activateddate = props.activateddate;
        this.issueddate = props.issueddate;
        this.activationkey = props.activationkey;
        this.signincode = props.signincode;
        this.signinexpireddate = props.signinexpireddate;
        this.signinkey = props.signinkey;
        this.lastaccesseddate = props.lastaccesseddate;
        this.accesscount = props.accesscount;
        this.visitcount = props.visitcount;
        this.createddate = props.createddate;
        this.welcomemessage = props.welcomemessage;
        this.isenabled = props.isenabled;
        return;
    },
    export: function () {
        return {
            _id: this.email,
            owneruserid: this.owneruserid,
            isactivated: this.isactivated,
            activateddate: this.activateddate,
            issueddate: this.issueddate,
            activationkey: this.activationkey,
            signincode: this.signincode,
            signinexpireddate: this.signinexpireddate,
            signinkey: this.signinkey,
            lastaccesseddate: this.lastaccesseddate,
            accesscount: this.accesscount,
            visitcount: this.visitcount,
            createddate: this.createddate,
            welcomemessage: this.welcomemessage,
            isenabled: this.isenabled
        }
    }
}

var Accounts = function (config, context, callback) {
    assert.notStrictEqual('undefined', typeof config);
    assert.notStrictEqual('undefined', typeof context);
    assert.notStrictEqual('undefined', typeof context.db);
    assert.notStrictEqual('undefined', typeof context.db.collection);

    this._config = config;
    this._context = context;
    this._db = context.db;

    this._accountsIndexedByEmail = {};
    this._accountsIndexedByActivationKey = {};

    this.load(callback);
}

Accounts.prototype = {
    getConfig: function () {
        return this._config;
    },
    getContext: function () {
        return this._context;
    },
    issue: function (account) {
        assert.strictEqual('object', typeof account);

        var oldkey = account.activationkey;
        var newkey = account.issue();

        if (typeof this._accountsIndexedByActivationKey[oldkey] !== 'undefined') {
            this._accountsIndexedByActivationKey[oldkey] = undefined;
        }
        this._accountsIndexedByActivationKey[newkey] = account;

        return newkey;
    },
    get: function (email, args) {
        assert.strictEqual('string', typeof email);

        email = utilities.getEmailFromString(email);
        if (typeof email === 'undefined') return;
        var account = this._accountsIndexedByEmail[email];

        if ((typeof account === 'undefined')
            && (typeof args !== 'undefined')) {
            account = this.set(args, true);
        }
        return account;
    },
    getByActivationKey: function (key) {
        assert.strictEqual('string', typeof key);

        return this._accountsIndexedByActivationKey[key];
    },
    set: function (props, save) {
        assert.strictEqual('object', typeof props);
        
        var account = new Account(props, this);
        
        this._accountsIndexedByEmail[account.email] = account;
        this._accountsIndexedByActivationKey[account.activationkey] = account;
        if (save) {
            this.save(account);
        }

        return account;
    },
    setOwner: function (account, userid) {
        account.setOwner(userid);
        return;
    },
    save: function (account) {
        var issync = typeof account === 'undefined';
        var db = this._db;

        if (issync) {
            // not implemented yet
        }
        else {
            db.collection('accounts')
                .save(account.export())
                .then(function (err, db) {
                });
        }

    },
    load: function (callback) {
        var db = this._db;
        var accounts = this;

        db.collection('accounts')
            .find()
            .toArray(function (err, result) {
                assert.equal(null, err);
                result.forEach(function (element, index) {
                    accounts.set(element, false);
                });

                if (typeof callback === 'function') {
                    callback.call(result, err);
                }
            });

    }
}

module.exports = Accounts;