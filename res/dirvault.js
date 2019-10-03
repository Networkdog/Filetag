var assert = require('assert');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var guid = require('guid');
var extend = require('extend');

const DEFAULT_DBCOLLECTION = 'directories';
const DEFAULT_DIRHASHSECRET = 'raspocket|jilee|networkdog';
const DEFAULT_EXPIRATIONDAY = 7;

module.exports = DirVault = function (args) {

    assert.notEqual(null, args);
    assert.notEqual(null, args.config);
    assert.notEqual(null, args.db);
    assert.notEqual(null, args.db.collection);
    assert.equal('string', typeof args.root);
    
    var db = this._db = args.db;
    var root = this._root = args.root;
    var config = this._config = args.config;

    this._directories = {};
    this._sessions = {};

    this.synchronize();

}

// 타이머 작업 추가 
// 1. Expiration
// 2. Synchronization
// 디렉터리 생성

DirVault.prototype = {
    
    _createId: function () {

        return guid.raw();

    },

    _createKey: function (id) {

        return crypto.createHmac('sha256', DEFAULT_DIRHASHSECRET).update(id).digest('hex');

    },

    _createPath: function (name) {

        var config = this._config;

        return path.join(config.path.uploaded, name);

    },

    get: function (sessionid, options) {

        if (typeof sessionid === 'undefined') return;
        if (typeof options === 'undefined') {
            options = { sessionid: sessionid };
        }

        var sessions = this._sessions;
        var directory = sessions[sessionid];

        //options.owneruserid;
        //options.directorytype;
        //options.uniqueuser;
        //options.uniquetype;

        if (typeof directory === 'undefined') {

            sessions[sessionid] = directory = this.create(options);

        }

        return directory;

    },

    create: function (args) {

        if (typeof args === 'undefined') return;
        if (typeof args.owneruserid === 'undefined') return;
        if (typeof args.usagetype === 'undefined') return;
        if (typeof args.uniqueperuser === 'undefined') return;
        if (typeof args.uniquepertype === 'undefined') return;
        
        var sid = args.sessionid;
        var did = this._createId();
        var dkey = this._createKey(did);
        var dpath = this._createPath(did);
        var cdate = new Date();
        var edate = new Date(cdate.getTime() + DEFAULT_EXPIRATIONDAY * 86400000);
        var entity = {
            _id: did, //GUID
            directorykey: dkey, //HEX STRING of SHA256
            sessionid: sid, //GUID
            physicalpath: dpath, //PATH
            owneruserid: args.owneruserid, //GUID
            usagetype: args.usagetype, //MAIL|CHANNEL|TEMP
            uniqueperuser: args.uniqueperuser, //Boolean
            uniquepertype: args.uniquepertype, //Boolean
            expiredate: edate, //DATETIME
            limitedsize: args.maxsize || 0, //Bytes
            limitedaccess: args.maxaccesscount || 0, //Number
            publicupload: args.publicupload || 1, //Boolean
            publicdownload: args.publicdownload || 0//Boolean
        };

        var directories = this._directories;
        var sessions = this._sessions;
        var db = this._db;
        var config = this._config;

        assert.notEqual(undefined, typeof sessions[sid]);
        
        sessions[sid] = directories[did] = entity;

        db.collection('directories')
            .save(entity)
            .then(function (err, db) {
            });

        return entity;

    },

    synchronize: function (callback) {

        var db = this._db;
        var sessions = this._sessions;
        var directories = this._directories;

        db.collection('directories')
            .find()
            .toArray(function (err, result) {

                assert.equal(null, err);

                result.forEach(function (element, index) {

                    var did = element._id;
                    var sid = element.sessionid;

                    sessions[sid] = directories[did] = element;

                });

                if (typeof callback === 'function') {

                    callback.call();

                }

            });

        return;

    },

}

