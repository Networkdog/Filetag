var assert = require('assert');
var crypto = require('crypto');
var fs = require('fs');
var guid = require('guid');
var extend = require('extend');
var utilities = require('./utilities.js');

const USERID_ANONYMOUS = '00000000-0000-0001-0005-000000000007';

var Shortcut = function (props, shortcuts) {
    this._parent = shortcuts;
    this._context = shortcuts.getContext();
    this.import(
        extend({
            shortcutkey: utilities.generateKey(),
            owneruserid: USERID_ANONYMOUS,
            contenttype: 'file',
            createddate: new Date(),
            expirecount: 0,
            accessedcount: 0,
            isenabled: true
        }, props));
}

Shortcut.prototype = {
    save: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var shortcut = this;
        var db = this._context.db;
        db.collection('shortcuts')
            .save(this.export())
            .then(function (err, db) {
                if (typeof callback === 'function') {
                    assert.equal(null, err);
                    callback.call(shortcut, err, db);
                }
            });
        return;
    },
    load: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var shortcut = this;
        var db = this._context.db;
        db.collection('shortcuts')
            .findOne({ '_id': this.shortcutkey })
            .then(function (result) {
                shortcut.import.call(shortcut, result);
            });
        return;
    },
    import: function (props) {
        this.shortcutkey = props._id || props.shortcutkey;
        this.originalname = props.originalname;
        this.destination = props.destination;
        this.contenttype = props.contenttype;
        this.contentlength = props.contentlength;
        this.owneruserid = props.owneruserid;
        this.sessionid = props.sessionid;
        this.createddate = props.createddate;
        this.expiredate = props.expiredate;
        this.expirecount = props.expirecount;
        this.accessedcount = props.accessedcount;
        this.alloweduserid = props.alloweduserid;
        this.isenabled = props.isenabled;
        return;
    },
    export: function () {
        return {
            _id: this.shortcutkey,
            originalname: this.originalname,
            destination: this.destination,
            contenttype: this.contenttype,
            contentlength: this.contentlength,
            owneruserid: this.owneruserid,
            sessionid: this.sessionid,
            createddate: this.createddate,
            expiredate: this.expiredate,
            expirecount: this.expirecount,
            accessedcount: this.accessedcount,
            alloweduserid: this.alloweduserid,
            isenabled: this.isenabled
        }
    }
}

var Shortcuts = function (config, context, callback) {
    assert.notStrictEqual('undefined', typeof config);
    assert.notStrictEqual('undefined', typeof context);
    assert.notStrictEqual('undefined', typeof context.db);
    assert.notStrictEqual('undefined', typeof context.db.collection);

    this._config = config;
    this._context = context;
    this._db = context.db;

    this._shortcutIndexedByShortcutKey = {};
    this._shortcutsIndexedBySessionId = {};
    this._shortcutsIndexedByUserId = {};
    this.load(callback);
}

Shortcuts.prototype = {
    getConfig: function () {
        return this._config;
    },
    getContext: function () {
        return this._context;
    },
    get: function (shortcutkey, props) {
        assert.equal('string', typeof shortcutkey);

        shortcutkey = utilities.getKeyFromString(shortcutkey);
        if (typeof shortcutkey === 'undefined') return;

        var shortcut = this._shortcutIndexedByShortcutKey[shortcutkey];
        if ((typeof account === 'undefined')
            && (typeof props !== 'undefined')) {
            shortcut = this.set(props);
        }

        return shortcut;
    },
    getBySessionId: function (sessionid) {
        assert.strictEqual('string', typeof sessionid);
        return this._shortcutsIndexedBySessionId[sessionid];
    },
    getByOwnerUserId: function (owneruserid) {
        assert.strictEqual('string', typeof owneruserid);
        if (owneruserid === USERID_ANONYMOUS) return;
        return this._shortcutsIndexedByUserId[owneruserid];
    },
    set: function (props) {
        assert.equal('object', typeof props);

        var shortcut = new Shortcut(props, this);
        var sessionid = shortcut.sessionid;
        var owneruserid = shortcut.owneruserid;
        var shortcutkey = shortcut.shortcutkey;
        var sessionids = this._shortcutsIndexedBySessionId;
        var shortcutkeys = this._shortcutIndexedByShortcutKey;
        var ownerids = this._shortcutsIndexedByUserId;
        var shortcutgroup = sessionids[sessionid];
        var ownergroup = ownerids[owneruserid];
        
        if (typeof shortcutgroup === 'undefined') {
            shortcutgroup = this._shortcutsIndexedBySessionId[sessionid] = {};
        }
        
        if (typeof ownergroup === 'undefined') {
            ownergroup = this._shortcutsIndexedByUserId[owneruserid] = {};
        }

        shortcutkeys[shortcutkey] = ownergroup[shortcutkey] = shortcutgroup[shortcutkey] = shortcut;

        this.save(shortcut);

        return shortcut;
    },
    save: function (shortcut) {
        var issync = typeof shortcut === 'undefined';
        var db = this._db;
        if (issync) {
            // not implemented yet
        }
        else {
            db.collection('shortcuts')
                .save(shortcut.export())
                .then(function (err, db) {
                });
        }

    },
    load: function (callback) {
        var db = this._db;
        var shortcuts = this;
        db.collection('shortcuts')
            .find()
            .toArray(function (err, result) {
                assert.equal(null, err);

                result.forEach(function (element, index) {
                    shortcuts.set(element);
                });

                if (typeof callback === 'function') {
                    callback.call(result, err);
                }
            });
    }
}

module.exports = Shortcuts;