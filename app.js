"use strict";
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const credential = new DefaultAzureCredential();
const vaultName = "kv-filetag-keys";
const vaulturl = "https://" + vaultName + ".vault.azure.net";
const client = new SecretClient(vaulturl, credential);

var debug = require('debug');
var express = require('express');
var path = require('path');
var url = require('url');
var fs = require('fs');
var favicon = require('serve-favicon');
var urlencode = require('urlencode');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multipart = require('connect-multiparty');
var multiparty = multipart({ uploadDir: './tmp' });
var flow = require('./res/flow-node.js')('tmp');
var utilities = require('./res/utilities.js');
var mongoclient = require('mongodb').MongoClient;
var guid = require('guid');
var extend = require('extend');
var ejs = require('ejs');
var app = express();
var root = process.cwd();
var assert = require('assert');
var crypto = require('crypto');
var moment = require('moment');
var zip = require('express-zip');
var filesize = require('filesize');

require('dotenv').config();

var Users = require('./res/users.js');
var Accounts = require('./res/accounts.js');
var Shortcuts = require('./res/shortcuts.js');
var Directories = require('./res/directories.js');

var users;
var accounts;
var shortcuts;
var directories;



const USERID_ANONYMOUS = '00000000-0000-0001-0005-000000000007';

var config = {
    keyvault: {
        resource: "kv-filetag-keys",
        secrets: {
            sendgrid: "filetag-sendgrid-notification-api-key"
        }
    },
    key: {
        sendgrid: ''
    },
    mail: {
        sender: 'no-reply@filetag.online',
        feedback: 'feedback@filetag.online'
    },
    url: {
        entry: 'http://filetag.online',
        mongodb: 'mongodb://localhost:27017'
    },
    identity: {
        appname: 'filetag.online'
    },
    path: {
        approot: process.cwd(),
        page: {
            default: {
                browseMailStorage: path.join(root, 'res/browsemailstorage.htm'),
                manageMailStorage: path.join(root, 'res/managemailstorage.ejs'),
                activateAccount: path.join(root, 'res/activateaccount.ejs'),
                send2mail: path.join(root, 'res/home.htm'),
                send2channel: path.join(root, 'res/home.htm'),
                emailactivation: path.join(root, 'res/activate.htm')
            }
        },
        uploaded: 'uploads/'
        //uploaded: path.join(root, 'uploads/')
    },
    db: {
        name: 'filetag'
    }

};

var context = {
    db: null
};

var regex4email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var regex4guid = /^(\/){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/i;
var regex4hexhash = /^(\/){0,1}[A-Fa-f0-9]{64}$/;

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

var handlers = {
    signOut: function (req, res) {
        var email = req.params.email;
        res.cookie('k', '', { expires: new Date(1), path: '/' + email });
        res.status(200).send('OK');
    },

    setRecipient: function (req, res) {

        renderBrowsePage({
            email: '',
            sessionid: '',
            isactivated: false
        }, function (html) {
            res.send(html);
        });

    },

    verifySignInCode: function (req, res) {
        var email = req.params.email;
        var signincode = req.body.s;
        var account = accounts.get(email);

        if (!account) {
            res.status(500).send('Failed');
            return;
        }

        if (!account.signincode) {
            res.status(500).send('Failed');
            return;
        }

        var uri = '/' + account.email;
        var signinkey;

        if (signinkey = account.verifySignInCode(signincode)) {
            account.activate();
            res.cookie('k', signinkey, {
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 24 * 7,
                path: uri
            });
            res.status(200).send('OK');
        }
        else {
            res.status(200).send('Failed');
        }

    },

    issueSignInCode: function (req, res) {
        var email = req.params.email;
        var account = accounts.get(email);

        if (typeof account !== 'undefined') {
            let signincode = account.issueSignInCode();
            console.log('issueSignInCode: %s', signincode);
            if (signincode) {
                sendSignInCodeByEmail(account);
                res.status(200).send('OK');
            }
            else {
                res.status(500).send('Failed');
            }
        }
    }, 

    browse: function (req, res) {
        var signinkey = req.cookies.k ? utilities.getKeyFromString(req.cookies.k) : "";
        var email = utilities.getEmailFromString(req.params.email);
        var account = accounts.get(email);

        if (!account) {
            res.status(200).send('no account');
            return;
        }

        if (!account.verifySignInKey(signinkey)) {
            res.status(200).send('wrong key');
            return;
        }

        var assets = shortcuts.getByOwnerUserId(account.owneruserid);
        if (!assets || assets.length == 0) {
            res.status(200).send('no asset');
            return;
        }

        var result = Object.keys(assets).map(function (shortcutkey) {
            let shortcut = assets[shortcutkey];
            let uri = url.resolve(config.url.entry, 'd/' + shortcutkey);
            return {
                originalname: shortcut.originalname,
                destination: uri,
                createddate: shortcut.createddate,
                contentlength: shortcut.contentlength
            };
        });
        res.json(result);
        
        return;
    },

    homeForSendToMail: function (req, res) {
        if (req.query.upload_token) {
            console.log('request_getupload: ' + req.originalUrl);
            onRequestGetUpload(req, res);
        } else {
            console.log('request_homeForSendToMail: ' + req.originalUrl);
            var email = utilities.getEmailFromRequest(req);
            var account = accounts.get(email, {
                email: email
            });
            var isowner = false;
            if ((req.cookies.a) && (req.cookies.a === account.activationkey)) {
                isowner = true;
            }

            renderBrowsePage({
                email: email,
                sessionid: utilities.generateId(),
                isactivated: account.isActivated()
            }, function (html) {
                res.status(200).send(html);
            });

        }
    },
    homeForSendToChannel: function (req, res) {
        console.log('request_homeForSendToChannel: ' + req.originalUrl);
        res.sendFile(config.path.page.default.send2channel);
    },
    file: function (req, res) {
        console.log('request_file: ' + req.originalUrl);
        res.sendFile(config.paths.sendToMail);
    },
    upload: function (req, res) {
        console.log('request_upload: ' + req.originalUrl);
        uploadFiles(req, res);
    },
    httpOptions: function (req, res) {
        console.log('request_httpOptions: ' + req.originalUrl);
        res.status(200).send();
    },
    uploadOptions: function (req, res) {
        console.log('request_uploadOptions: ' + req.originalUrl);
        res.status(200).send();
    },
    flowId: function (req, res) {
        console.log('request_flowId: ' + req.originalUrl);
        flow.write(req.params.identifier, res);
    },
    ticket: function (req, res) {
        res.status(200).send(guid.raw());
    },
    download: function (req, res) {
        downloadFile(req, res);
    }
};

var transactionMap = {};
var fileAccessKeyMap = {};
var slotAccessKeyMap = {};
var sessions = {};

function renderHTMLforShortcuts(shortcutList) {

    var html = '<ul>';

    for (var shortcutkey in shortcutList) {
        var shortcut = shortcutList[shortcutkey];
        html += '<li><span class="file-name">' + shortcut.originalname + '</span></li>';
    }

    html += '</ul>';
    return html;
}

function renderBrowsePage(props, callback) {

    return ejs.renderFile(config.path.page.default.browseMailStorage, props, {}, function (err, str) {
        if (typeof callback === 'function') {
            callback.call(ejs, str);
        }
    });

}

function renderActivationPage(email, callback) {

    return ejs.renderFile('./res/activate.ejs', {
        email: email
    }, {}, function (err, str) {
        if (typeof callback === 'function') {
            callback.call(ejs, str);
        }
    });

}

function getTransactionByTransactionId(key) {

    if (typeof key === 'undefined') return;

    var item = transactionMap[key];

    if (typeof item === 'undefined') {

        item = transactionMap[key] = {
            length: 0,
            remains: 0
        };

    }

    return item;

}

function setTransactionByTransactionId(key, length) {

    if (typeof key === 'undefined') return;
    if (typeof length === 'undefined') return;

    var item = getTransactionByTransactionId(key);

    if (item.length == 0) {
        item.remains = length;
    }

    item.length = length;

    return;

}

function removeItemByTransactionId(key) {

    if (typeof key === 'undefined') return;

    if (typeof transactionMap[key] !== 'undefined') {
        transactionMap[key] = undefined;
    }

}

function completeTransactionItem(key) {

    if (typeof key === 'undefined') return;

    var item = getTransactionByTransactionId(key);

    item.remains -= 1;

    if (item.remains <= 0) {

        removeItemByTransactionId(key);
        return true;

    }

    return false;

}

function downloadFile(req, res) {

    var rawkey = req.params.key;
    var realkey = utilities.getKeyFromString(rawkey);
    if (typeof realkey === 'undefined') {
        res.status(500).send('The access key is invalid');
        return;
    }

    var shortcut = shortcuts.get(realkey);
    if (!shortcut) {
        console.error('Error while processing a request for the file - no access key available (%s)', realkey);
        res.status(404).send();
        return;
    }

    if (!shortcut.destination) {
        console.error('Error while processing a request for the file - no file (%s)', realkey);
        res.status(500).send();
        return;

    }

    if (shortcut.originalname) {
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(shortcut.originalname));
    }

    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Content-Type', 'application/octet-stream');

    switch (shortcut.contenttype) {
        case 'file':
            res.sendFile(path.join(config.path.approot, shortcut.destination));
            break;
        case 'zip':
            let paths = shortcut.destination.split(';');
            paths = paths.map(function (dest) {
                let p = path.join(config.path.approot, dest);
                let n = path.basename(dest);
                return { path: p, name: n };
            });
            res.zip(paths, shortcut.originalname);
            break;
        default:
            res.status(500).send();
            break;
    }
    return;
}


// Notification 타이밍을 잡기 위해 업로드 파일의 개수와 TID, SID 개념을 사용

function uploadFiles(req, res) {

    flow.post(req, function (status, filename, original_filename, identifier) {

        var sid = req.body.sid || utilities.generateId();
        var tid = req.body.tid || utilities.generateId();
        var tlen = req.body.tlen || 1;
        var mail = utilities.getEmailFromRequest(req);

        setTransactionByTransactionId(tid, tlen);

        var account = accounts.get(mail);
        var userid = account.owneruserid;
        var user;
        if (userid !== USERID_ANONYMOUS) {
            user = users.get(userid, {
                primaryemail: mail
            });
        } else {
            user = users.set({
                primaryemail: mail
            });
            account.setOwner(user.userid);
        }
        var directory = directories.getBySessionId(sid, {
            owneruserid: user.userid,
            sessionid: sid,
            usagetype: 'mail'
        });
        var udir = directory.physicalpath;
        console.log('SID: %s, TID: %s, DID: %s)', sid, tid, directory.directoryid);

        if (status == 'done') {

            var upath = path.join(udir, filename);

            directory.make(function (err) {
                //assert.strictEqual('undefined', typeof err);
                if (err) {
                    console.log('Error while uploading a file - unable to make a directory (%s)', udir);
                    res.status(500).send();
                    return;
                }

                var stream = fs.createWriteStream(upath);

                stream.on('finish', function () {

                    var shortcut = shortcuts.set({
                        originalname: original_filename,
                        owneruserid: user.userid,
                        destination: upath,
                        contentlength: req.body.flowTotalSize,
                        sessionid: sid
                    });

                    res.status(200).send();
                    flow.clean(identifier);

                    if (completeTransactionItem(tid)) {
                        notify_uploadCompletion(account, sid);
                        renderCompletedUpload(directory, account);
                    }

                });

                flow.write(identifier, stream/*, { onDone: flow.clean }*/);
            });


        }
        else if (status == 'partly_done') {

            res.status(200).send();

        }

    });

}

function onRequestGetUpload(req, res) {

    flow.get(req, function (status, filename, original_filename, identifier) {

        console.log('onRequestGetUpload: ' + req.originalUrl);
        console.log('onRequestGetUpload (%s, %s, %s, %s)', status, filename, original_filename, identifier);

        if (status == 'found') {
            status = 200;
        } else {
            status = 204;
        }

        res.status(status).send();
    });

}

var run = async function () {

    config.key.sendgrid = process.env.SENDGRID_API_KEY || config.key.sendgrid;

    app.set('port', process.env.PORT || 80);

    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use('/css', express.static('css'));
    app.use('/img', express.static('img'));
    app.use('/js', express.static('js'));

    app.get('/@ticket', handlers.ticket);
    app.get('/d/:key', handlers.download);
    app.get('/', handlers.setRecipient);
    app.get('/:email/b', handlers.browse);
    app.get('/:email/o', handlers.signOut);
    app.get('/:email/i', handlers.issueSignInCode);
    app.post('/:email/v', handlers.verifySignInCode);
    app.get(regex4email, handlers.homeForSendToMail);
    app.post(regex4email, multiparty, handlers.upload);
    app.options(regex4email, handlers.uploadOptions);

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        console.log('404 NOT FOUND - %s', req.url);
        err.status = 404;
        next(err);
    });

    // error handlers
    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }
    /*
    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
    */

    var onCompleteConnectingDatabase = function (err, client) {
        assert.strictEqual(null, err);
        console.log('mongodb database - connected successfully.');
        context.db = client.db(config.db.name);
        users = new Users(config, context, onCompleteInitializingUsers);
    };

    var onCompleteInitializingUsers = function (err) {
        assert.strictEqual(null, err);
        console.log('users collection - synchronized successfully.');
        accounts = new Accounts(config, context, onCompleteInitializingAccount);
    };

    var onCompleteInitializingAccount = function (err) {
        assert.strictEqual(null, err);
        console.log('accounts collection - synchronized successfully.');
        shortcuts = new Shortcuts(config, context, onCompleteInitializingShortcuts);
    };

    var onCompleteInitializingShortcuts = function (err) {
        assert.strictEqual(null, err);
        console.log('shortcuts collection - synchronized successfully.');
        directories = new Directories(config, context, onCompleteInitializingDirectories);
    };

    var onCompleteInitializingDirectories = function (err) {
        assert.strictEqual(null, err);
        console.log('directories collection - synchronized successfully.');
        var server = app.listen(app.get('port'), function () {
            console.log('Express server listening on port ' + server.address().port);
        });
    };

    mongoclient.connect(config.url.mongodb, onCompleteConnectingDatabase);
};

function renderCompletedUpload(directory, account) {

    assert.strictEqual('object', typeof directory);
    assert.strictEqual('object', typeof account);

    directory.browse(function (err, results) {

        console.dir(results);

    });

}

function generateZipFileName(email) {

    return email + '_' + moment().format('YYYY-MM-DD_h-mm-ss') + '.zip';

}

function notify_uploadCompletion(account, sid) {

    var email = account.email;
    //var filehtml = '<ul>';
    var confirmurl = url.resolve(config.url.entry, 'a/' + account.activationkey);
    var msghtml = 'The following files have been uploaded. <a href="' + confirmurl + '">Just click on this link to browse following files</a>';
    var shortcutgroupbysid = shortcuts.getBySessionId(sid);
    var zipdestinations = '';

    if (typeof shortcutgroupbysid === 'undefined') {
        console.error('Error while notifying upload completion - no session available (%s)', sid);
        return;
    }
    
    var shortcutlist = [];

    for (let shortcutkey in shortcutgroupbysid) {
        let shortcut = shortcutgroupbysid[shortcutkey];
        let uri = url.resolve(config.url.entry, 'd/' + shortcutkey);
        if (shortcut.contenttype !== 'file') continue;
        if (zipdestinations !== '') zipdestinations += ';';
        zipdestinations += shortcut.destination;
        
        shortcutlist.push({
            uri: uri,
            name: shortcut.originalname,
            createddate: moment(shortcut.createddate).format("dddd, MMMM Do YYYY, h:mm:ss a"),
            contentlength: filesize(shortcut.contentlength),
            shortcut: shortcut
        });
    }

    if (shortcutlist.length > 1) {

        let shortcutforzip = shortcuts.set({
            contenttype: 'zip',
            destination: zipdestinations,
            originalname: generateZipFileName(email),
            sessionid: sid
        });

        let zipuri = url.resolve(config.url.entry, 'd/' + shortcutforzip.shortcutkey);

        shortcutlist.push({
            uri: zipuri,
            name: 'Above all files as .zip',
            createddate: moment(new Date()).format("dddd, MMMM Do YYYY, h:mm:ss a"),
            shortcut: shortcutforzip
        });
    }

    var sendgrid = require('@sendgrid/mail');
    ejs.renderFile('./res/uploadnotification.htm', {
        email: account.email,
        appIdentity: config.identity.appname,
        emailFeedback: config.mail.feedback,
        shortcutlist: shortcutlist
    }, {}, function (err, str) {
        sendgrid.setApiKey(config.key.sendgrid);
        sendgrid.send({
            to: account.email,
            from: config.mail.sender,
            subject: config.identity.appname + ' Files have been uploaded',
            html: str
        }, function (err, result) {
            if (err) console.dir(result);
        });
    });
}

function sendSignInCodeByEmail(account) {
    var sendgrid = require('@sendgrid/mail');
    ejs.renderFile('./res/signin.htm', {
        signincode: account.signincode,
        email: account.email,
        appIdentity: config.identity.appname,
        emailFeedback: config.mail.feedback
    }, {}, function (err, str) {
        sendgrid.setApiKey(config.key.sendgrid);
        sendgrid.send({
            to: account.email,
            from: config.mail.sender,
            subject: config.identity.appname + ' confirmation code: ' + account.signincode,
            html: str
        }, function (err, result) {
            if (err) console.dir(result);
        });

    });
}

var SendGridClient = {
    send: function () {
    }
};

async function initialize() {

    // let sendgridApiKey = await client.getSecret(config.keyvault.secrets.sendgrid);
    // console.log("sendgrid-api-key: ", sendgridApiKey);
    // config.key.sendgrid = sendgridApiKey.value;

}

(async function main() {

    await initialize();
    run();

})();