
var hasrecipient = (__recipient != '');
var flowopts = {
    target: location.href,
    query: {
        upload_token: 'rasupload',
        sid: __sessionid
    },
    chunkSize: 16 * 1024 * 1024,
    testChunks: false
};
var flow = new Flow(flowopts);
var animopts = { duration: 500 };
var animoptsfast = { duration: 100 };
var backgroundctrl = new ProgressBar.Circle('#chart-background', { color: '#e0e0e0', strokeWidth: 4 });
var progressctrl = new ProgressBar.Circle('#chart-foreground', { color: '#ffd750', strokeWidth: 4 });
var regex4email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var FileBrowser = function ($element) {
    this._latestShortcut = null;
    this._previousCreatedDate = null;
    this._attachedElement = $element;
};
FileBrowser.prototype = {
    import: function (shortcuts) {
        var _this = this;
        if (typeof shortcuts === 'undefined') return;
        if (shortcuts.length <= 0) return;
        this.clear();
        shortcuts.forEach(function (shortcut, index) {
            _this.add(shortcut);
        });
    },
    add: function (shortcut) {
        var previousCreatedDate = this._previousCreatedDate;
        var createddatemoment = moment(shortcut.createddate);
        var relativeCreatedDate = moment().diff(createddatemoment, 'minutes') < 60 ? 'just now' : createddatemoment.fromNow();
        var parentElement = this._attachedElement;
        if (previousCreatedDate !== relativeCreatedDate)
            this._createGroupElement(relativeCreatedDate).appendTo(parentElement);
        this._createFileElement(shortcut).appendTo(parentElement);
        this._previousCreatedDate = relativeCreatedDate;
        this._latestShortcut = shortcut;
        return;
    },
    clear: function () {
        this._attachedElement.empty();
    },
    _createFileElement: function (shortcut) {
        var contentlength = filesize(shortcut.contentlength, { base: 10 });
        var createddate = moment(shortcut.createddate).format("dddd, MMMM Do YYYY, h:mm:ss a");
        var $li = $(document.createElement('li')).addClass('file');
        var $filelink = $(document.createElement('a')).addClass('file-uri').attr('href', shortcut.destination).appendTo($li);
        $(document.createElement('span')).addClass('file-name').text(shortcut.originalname).appendTo($filelink);
        var $details = $(document.createElement('div')).addClass('file-details').appendTo($li);
        $(document.createElement('span')).addClass('file-size').text(contentlength).appendTo($details);
        $(document.createElement('span')).addClass('file-date').text(createddate).appendTo($details);
        return $li;
    },
    _createGroupElement: function (title) {
        return $(document.createElement('li')).addClass('group').text(title);
    }
}
var RecipientHistory = function (localStorage) {
    this._localStorage = localStorage;
};

RecipientHistory.prototype = {
    addRecipient: function (recipient) {
        var savedRecipientHistory;
        try {
            savedRecipientHistory = JSON.parse(this._localStorage.getItem('recipient-history')) || {};
        } catch (e) {
            this._localStorage.removeItem('recipient-history');
            savedRecipientHistory = {};
        }
        var savedRecipientEntry = savedRecipientHistory[recipient];
        savedRecipientHistory[recipient] = (typeof savedRecipientEntry === 'undefined') ? 1 : savedRecipientEntry + 1;
        this._localStorage.setItem('recipient-history', JSON.stringify(savedRecipientHistory));
    },
    getAll: function () {
        return JSON.parse(this._localStorage.getItem('recipient-history'));
    },
    getTop: function () {
        var historyObj = this.getAll() || {};
        var historyArr = Object.keys(historyObj).map(function (key) {
            return { name: key, hit: historyObj[key] };
        });
        historyArr.sort(function (a, b) {
            return b.hit - a.hit;
        });
        return historyArr;
    },
    clearAll: function () {
        this._localStorage.removeItem('recipient-history');
        return;
    }
};

var recipientHistory = new RecipientHistory(window.localStorage);

var SceneControl = function () {

};
SceneControl.prototype = {
    activate: function (sceneid) {

    }
};

var NotificationBar = function (element) {
    if (typeof element === 'string') element = $(element);
    this._notificationBarElement = element;
    this._notificationMessageElement = element.find('.notification-message');
    this._messageQueue = [];
};

NotificationBar.prototype = {
    addMessage: function (text, options) {
        this._messageQueue.push({ message: text, options: options });
        if (this._notificationBarElement.hasClass('display-invisible')) {
            this._notificationBarElement.removeClass('display-invisible');
        }
        this._notificationMessageElement.text(text);
    },
    dismissTop: function () {
        if (this._messageQueue.length == 1) {
            this._messageQueue.pop();
            this._notificationBarElement.addClass('display-invisible');
        }
        else if (this._messageQueue.length > 1) {
            this._messageQueue.pop();
            var item = this._messageQueue[this._messageQueue.length - 1];
            this._notificationMessageElement.text(item.message);
        }
    }
}

var notificationBar = new NotificationBar('#notification-bar');

$(document).ready(function () {

    var $progressrate;
    var $digits;
    var $inputsendto = $('#input-sendto');
    var filebrowser = new FileBrowser($('#list-files'));
    var validateRecipient = function (recipient) {
        console.log(recipient);
        return regex4email.test(recipient);
    };
    var displayRecipientHistory = function () {
        var $recipientHistory = $('#recipient-history').empty();
        var topRecipients = recipientHistory.getTop(5);
        var $ul = $(document.createElement('ul'));
        var n = topRecipients.length > 5 ? 5 : topRecipients.length;
        for (var i = 0; i < n; i++) {
            var $li = $(document.createElement('li')).appendTo($ul);
            var recipient = topRecipients[i];
            $(document.createElement('a')).attr('href', '/' + recipient.name).text(recipient.name).appendTo($li);
        }
        $ul.appendTo($recipientHistory);
    };
    var initialize = function () {
        if (!hasrecipient) {
            var $recipient = $('.input-sendto');
            toggleScene('.scene-sendto');
            $recipient.focus();
            $recipient.keypress(function (e) {
                if ((e.keyCode == 13) && (validateRecipient($recipient.val()))) {
                    location.href = '/' + $recipient.val();
                }
            });
            $recipient.keyup(function (e) {
                if (validateRecipient($recipient.val())) {
                    $recipient.removeClass('font-invalid');
                }
                else {
                    $recipient.addClass('font-invalid');
                }
            });
            displayRecipientHistory();
        }
        else {
            toggleScene('.scene-choose');
            recipientHistory.addRecipient(__recipient);
        }

        $progressrate = $('#upload-rate');
        $estimateddate = $('#estimated-time');

        createInputDigitCode(6);
        refreshBrowser();
        backgroundctrl.set(1);
        progressctrl.set(0);
        if (!flow.support) {
            console.log('Flow.js isn\'t support');
        }
        else {
            flow.assignDrop($('.panel-drop'));
            flow.assignBrowse($('.button-browse'));
        }

        flow.on('fileAdded', function (file, event) {
            flow.totalSize += file.size;
            console.log('fileadded: %s (%s), total: %s', file, event, flow.totalSize);
        });
        if (hasrecipient && !__isactivated) {
            notificationBar.addMessage(__recipient + ' has not been used with filetag.net. Make sure that the e-mail from filetag.net has not been mistakenly marked as junk mail.');
        }
    };

    var setProgressRate = function (rate) {
        $progressrate.text((Number(rate) * 100).toFixed(0) + '%');
        progressctrl.animate(rate, flow.prevRate > rate ? animoptsfast : animopts);
        flow.prevRate = rate;
    }

    var setEstimatedDate = function (date) {
        $estimateddate.text('Your upload will be completed ' + moment(date).fromNow());
    }

    var toggleScene = function (cls) {
        var $allscenes = [$('.scene-choose'), $('.scene-upload'), $('.scene-complete'), $('.scene-browse'), $('.scene-signin'), $('.scene-sendto')];
        $allscenes.forEach(function ($scene, index) {

            $scene.hide().addClass('display-invisible');
        });
        $(cls).show().removeClass('display-invisible');
    }

    var getDigitCode = function () {
        var value = '';
        $digits.each(function (i, element) { value += element.value; });
        return value;
    }

    var focusFirstDigit = function () {
        $digits.first().focus();
    }

    var clearInputDigitCode = function () {
        $digits.val('');
        focusFirstDigit();
    };

    var setSignInLink = function (issigned) {
        if (!hasrecipient) {
            $('#link-signin').addClass('display-none');
            $('#link-signout').addClass('display-none');
        } else if (issigned) {
            $('#link-signin').addClass('display-none');
            $('#link-signout').removeClass('display-none');
        } else {
            $('#link-signin').removeClass('display-none');
            $('#link-signout').addClass('display-none');
        }
    };

    var createInputDigitCode = function (num) {
        var $target = $('.pane-digitcode');
        var $first;
        for (var i = 0; i < num; i++) {
            var $digit = $(document.createElement('input'))
                .addClass('form-digit')
                .attr('type', 'text')
                .attr('maxlength', '1')
                .attr('value', '')
                .on('focus', function (e) {
                    this.setSelectionRange(0, 1);
                })
                .on('keydown', function (e) {
                    var keyCode = (e.which) ? e.which : event.keyCode;
                    var input = this;
                    var valid = !(keyCode > 39 && (keyCode < 48 || keyCode > 57) && (keyCode < 112 || keyCode > 123));
                    if (valid) {
                        setTimeout(function () {
                            var $next;
                            switch (keyCode) {
                                case 8:
                                case 37:
                                    $next = $(input).prev('input');
                                    break;
                                case 46:
                                    return;
                                default:
                                    $next = $(input).next('input');
                                    if ($next.length == 0) {
                                        filetag.users.signin(__recipient, getDigitCode(), function () {
                                            toggleScene('.scene-browse');
                                            refreshBrowser();
                                            setSignInLink(true);
                                            clearInputDigitCode();
                                        }, function () {
                                            clearInputDigitCode();
                                        });
                                    }
                                    break;
                            }
                            $next.focus();
                        }, 0);
                    }
                    return valid;
                });
            $target.append($digit);
        }
        $digits = $('.form-digit');
        focusFirstDigit();
    };
    var browse = function (callback) {
        filetag.files.browse(__recipient, function (result) {
            if (typeof callback === 'function') {
                if (typeof result !== 'object') {
                    setSignInLink(false);
                    return;
                }
                result.sort(function (a, b) {
                    return new Date(b.createddate) - new Date(a.createddate);
                });
                toggleScene('.scene-browse');
                callback.call(this, result);
            }
            else {
                console.error('invalid key: %s', result);
            }
        }, function (result) {
            setSignInLink(false);
        });
    };
    var refreshBrowser = function () {
        browse(function (shortcuts) {
            if ((typeof shortcuts !== 'undefined') &&
                (shortcuts.length > 0)) {
                filebrowser.import(shortcuts);
                $('.layer-message').hide();
                setSignInLink(true);
            }
        });
    };
    initialize();


    //$('.text-line').slideDown('fast', 'swing');
    //text - notification
    $('#link-signin').on('click', function (e) {
        filetag.users.issue(__recipient, function () {
            toggleScene('.scene-signin');
        });
    });

    $('#link-signout').on('click', function (e) {
        filetag.users.signout(__recipient, function () {
            toggleScene('.scene-choose');
            setSignInLink(false);
        });
    });

    $('.pane-digitcode').on('blur', function (e) {
        focusFirstDigit();
    });

    flow.on('filesSubmitted', function (file) {
        console.log("File was submitted. Starting to upload.");
        var internalUpload = function (tid) {
            flow.startTime = new Date();
            flow.totalSize = 0;
            flow.files.forEach(function (element) {
                flow.totalSize += element.size;
            })
            flow.opts.query.tlen = flow.files.length;
            flow.opts.query.tid = tid;
            flow.upload();
            toggleScene('.scene-upload');
        }

        if (flow.opts.query.tid) {
            internalUpload(flow.opts.query.tid);
        }
        else {
            filetag.sessions.getticket(function (guid) {
                internalUpload(guid);
            });
        }
    });

    flow.on('fileSuccess', function (file, message) {
        //$progressfile.text(file.name);
    });
    flow.on('fileError', function (file, message) {
        console.log(file, message);
    });
    flow.on("complete", function () {
        console.log("The upload has completed");
        progressctrl.animate(1, animoptsfast, function () {
            progressctrl.animate(0, animoptsfast);
        });
        flow.opts.query.tid = null;
        flow.cancel();
        toggleScene('.scene-complete');
        setTimeout(function () {
            //browse(updateFiles)
            refreshBrowser();
        }, 200);
    });
    flow.on("fileError", function (file, message) {
        console.log("The upload has failed");
        flow.cancel();
    });
    flow.on('catchAll', function () {
        //console.log.apply(console, arguments);
    });
    flow.on('fileProgress', function (file, chunk) {
        var totalBytes = flow.totalSize;
        var uploadedBytes = flow.sizeUploaded();
        var percent = (uploadedBytes / totalBytes).toFixed(2);

        var timeLapse = new Date().getTime() - flow.startTime.getTime();
        var timeEstimated = timeLapse * totalBytes / uploadedBytes;
        var dateEstimated = new Date(flow.startTime.getTime() + timeEstimated);

        setProgressRate(percent);
        setEstimatedDate(dateEstimated);
    });
});