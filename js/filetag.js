(function ($, window, document, undefined) {

    var regexValidateGuid = /^(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}$/i;

    var validate = function (guid) {
        if (typeof guid !== 'string') return false;
        return regexValidateGuid.test(guid);
    }

    var filetag = {
        users: {
            issue: function (email, succeed, fail) {
                $.ajax({
                    url: '/' + email + '/i',
                    method: 'get',
                    cache: false,
                    type: 'json'
                }).done(function (result) {
                    if (typeof succeed === 'function') {
                        succeed.call(this, result);
                    }
                }).fail(function (result) {
                    if (typeof fail === 'function') {
                        fail.call(this, result);
                    }
                });
            },
            signin: function (email, code, succeed, fail) {
                $.ajax({
                    url: '/' + email + '/v',
                    method: 'post',
                    cache: false,
                    data: {
                        's': code
                    },
                    type: 'json'
                }).done(function (result) {
                    switch (result) {
                        case 'OK':
                            if (typeof succeed === 'function') {
                                succeed.call(this, result);
                            }
                            break;
                        case 'Failed':
                            if (typeof fail === 'function') {
                                fail.call(this, result);
                            }
                            break;
                    }
                }).fail(function (result) {
                    if (typeof fail === 'function') {
                        fail.call(this, result);
                    }
                });
            },
            signout: function (email, succeed, fail) {
                $.ajax({
                    url: '/' + email + '/o',
                    method: 'get',
                    cache: false,
                    type: 'json'
                }).done(function (result) {
                    switch (result) {
                        case 'OK':
                            if (typeof succeed === 'function') {
                                succeed.call(this, result);
                            }
                            break;
                        case 'Failed':
                            if (typeof fail === 'function') {
                                fail.call(this, result);
                            }
                            break;
                    }
                }).fail(function (result) {
                    if (typeof fail === 'function') {
                        fail.call(this, result);
                    }
                });
            }
        },
        sessions: {
            getticket: function (succeed, fail) {
                $.ajax({
                    url: '/@ticket',
                    method: 'get',
                    cache: false
                }).done(function (result) {
                    if (validate(result)) {
                        if (typeof succeed === 'function') {
                            succeed.call(this, result);
                        }
                    }
                    else {
                        if (typeof fail === 'function') {
                            fail.call(this, result);
                        }
                    }
                }).fail(function (result) {
                    if (typeof fail === 'function') {
                        fail.call(this, result);
                    }
                });
            }
        },
        files: {
            browse: function (recipient, succeed, fail) {
                $.ajax({
                    url: '/' + recipient + '/b',
                    method: 'get',
                    cache: false,
                    type: 'json'
                }).done(function (result) {
                    if (typeof succeed === 'function') {
                        succeed.call(this, result);
                    }
                }).fail(function (result) {
                    if (typeof fail === 'function') {
                        fail.call(this, result);
                    }
                });
            }
        }
    };

    window.filetag = filetag;

})($, window, document);

