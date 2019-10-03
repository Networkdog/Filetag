var assert = require('assert');
var crypto = require('crypto');
var guid = require('guid');

const DEFAULT_SECRET = 'raspocket|jilee|networkdog';

var regex4email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var regex4guid = /^(\/){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/i;
var regex4hexhash = /^(\/){0,1}[A-Fa-f0-9]{64}$/;

var utilities = {

    generateId: function () {
        return guid.raw();
    },
    generateKey: function (id, secret) {
        id = id || guid.raw();
        secret = secret || DEFAULT_SECRET;
        return crypto.createHmac('sha256', secret).update(id).digest('hex');
    },
    getGuidFromString: function (str) {
        assert.equal('string', typeof str);
        var matches = str.replace('/', '').toLowerCase().match(regex4guid);
        if (!matches) return;
        return matches[0];
    },
    getEmailFromString: function (str) {
        assert.equal('string', typeof str);
        var matches = str.replace('/', '').toLowerCase().match(regex4email);
        if (!matches) return;
        return matches[0];
    },
    getEmailFromRequest: function (req) {
        assert.equal('object', typeof req);
        return utilities.getEmailFromString(req.url);
    },
    getKeyFromString: function (str) {
        assert.equal('string', typeof str);
        var matches = str.replace('/', '').toLowerCase().match(regex4hexhash);
        if (!matches) return;
        return matches[0];
    },
    getKeyFromRequest: function (req) {
        assert.equal('object', typeof req);
        return utilities.getKeyFromString(req.url);
    }

};

module.exports = utilities;