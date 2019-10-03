var assert = require('assert');
var path = require('path');
var fs = require('fs');
var extend = require('extend');
var utilities = require('./utilities.js');

var Directory = function (props, directories) {
    assert.strictEqual('object', typeof directories);

    var id = utilities.generateId();
    
    this._parent = directories;
    this._context = directories.getContext();
    this._config = directories.getConfig();

    this.import(
        extend({
            directoryid: id,
            physicalpath: this._generatePhysicalPath(id),
            createddate: new Date(),
            limitedsize: 0,
            publicupload: false,
            publicdownload: false,
            isenabled: true
        }, props));
}

Directory.prototype = {
    _generatePhysicalPath: function (str) {
        return path.join(this._config.path.uploaded, str);
    },
    make: function (callback) {
        assert.notStrictEqual('undefined', this.physicalpath);
        assert.strictEqual('function', typeof callback);

        var _this = this;
        fs.mkdir(this.physicalpath, function (err) {
            if (err && err.code !== 'EEXIST') {
                callback.call(_this, err);
            } else {
                callback.call(_this);
            }
        });
        return;
    },
    browse: function (callback) {
        assert.strictEqual('function', typeof callback);

        var directory = this;

        fs.readdir(this.physicalpath, function (err, results) {
            callback.call(directory, err, results);
        });
    },
    save: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var directory = this;
        var db = this._context.db;
        db.collection('directories')
            .save(this.export())
            .then(function (err, db) {
                if (typeof callback === 'function') {
                    assert.equal(null, err);
                    callback.call(directory, err, db);
                }
            });
        return;
    },
    load: function (callback) {
        assert.strictEqual('object', typeof this._context);
        assert.strictEqual('object', typeof this._context.db);

        var directory = this;
        var db = this._context.db;
        db.collection('directories')
            .findOne({ '_id': this.directoryid })
            .then(function (result) {
                directory.import.call(directory, result);
            });
        return;
    },
    import: function (entity) {
        assert.notStrictEqual('undefined', entity);

        this.directoryid = entity._id || entity.directoryid;
        this.sessionid = entity.sessionid;
        this.physicalpath = entity.physicalpath;
        this.owneruserid = entity.owneruserid;
        this.usagetype = entity.usagetype;
        this.uniqueperuser = entity.uniqueperuser;
        this.uniquepertype = entity.uniquepertype;
        this.createddate = entity.createddate;
        this.expiredate = entity.expiredate;
        this.limitedsize = entity.limitedsize;
        this.publicupload = entity.publicupload;
        this.publicdownload = entity.publicdownload;
        this.isenabled = entity.isenabled;
        return;
    },
    export: function () {
        assert.notStrictEqual('undefined', this.directoryid);

        return {
            _id: this.directoryid,
            sessionid: this.sessionid,
            physicalpath: this.physicalpath,
            owneruserid: this.owneruserid,
            usagetype: this.usagetype,
            uniqueperuser: this.uniqueperuser,
            uniquepertype: this.uniquepertype,
            createddate: this.createddate,
            expiredate: this.expiredate,
            limitedsize: this.limitedsize,
            publicupload: this.publicupload,
            publicdownload: this.publicdownload,
            isenabled: this.isenabled
        };
    }
}

var Directories = function (config, context, callback) {
    assert.notStrictEqual('undefined', typeof config);
    assert.notStrictEqual('undefined', typeof context);
    assert.notStrictEqual('undefined', typeof context.db);
    assert.notStrictEqual('undefined', typeof context.db.collection);

    this._config = config;
    this._context = context;
    this._db = context.db;

    this._directoriesIndexedByDirectoryId = {};
    this._directoriesIndexedBySessionId = {};
    this._directoriesIndexedByUserId = {};

    this.load(callback);
}

Directories.prototype = {
    getConfig: function () {
        return this._config;
    },
    getContext: function () {
        return this._context;
    },
    get: function (directoryid, props) {
        assert.strictEqual('string', typeof directoryid);

        directoryid = utilities.getKeyFromString(directoryid);
        var directory = this._directoriesIndexedByDirectoryId[directoryid];

        if ((typeof directory === 'undefined')
            && (typeof props !== 'undefined')) {
            directory = this.set(props, true);
        }

        return directory;
    },
    getBySessionId: function (sessionid, props) {
        assert.strictEqual('string', typeof sessionid);

        sessionid = utilities.getGuidFromString(sessionid);
        var directory = this._directoriesIndexedBySessionId[sessionid];

        if ((typeof directory === 'undefined')
            && (typeof props !== 'undefined')) {
            directory = this.set(props, true);
        }

        return directory;
    },
    getByOwnerUserId: function (owneruserid, props) {
        assert.strictEqual('string', typeof owneruserid);

        owneruserid = utilities.getKeyFromString(owneruserid);
        var directory = this._directoriesIndexedByUserId[owneruserid];

        if ((typeof directory === 'undefined')
            && (typeof props !== 'undefined')) {
            directory = this.set(props, true);
        }

        return directory;
    },
    set: function (props, save) {
        assert.notStrictEqual('undefined', typeof props.sessionid);

        var directory = new Directory(props, this);
        var directoryids = this._directoriesIndexedByDirectoryId;
        var sessionids = this._directoriesIndexedBySessionId;
        var userids = this._directoriesIndexedByUserId;

        directoryids[props.directoryid] = sessionids[props.sessionid] = directory;
        
        var userassets = userids[props.owneruserid];

        if (typeof userassets === 'undefined') {
            userassets = userids[props.owneruserid] = [];
        }

        userassets.push(directory);

        directory.save();

        return directory;

    },
    load: function (callback) {
        var directories = this;
        var db = this._db;
        db.collection('directories')
            .find()
            .toArray(function (err, result) {
                assert.equal(null, err);

                result.forEach(function (element, index) {
                    directories.set(element, false);
                });

                if (typeof callback === 'function') {
                    callback.call(result, err);
                }
            });

    },
    save: function (entity) {

        var issync = typeof entity === 'undefined';
        var db = this._db;
        if (issync) {
            // not implemented yet
        }
        else {
            db.collection('directories')
                .save(account.export())
                .then(function (err, db) {
                });
        }

    }

}

module.exports = Directories;