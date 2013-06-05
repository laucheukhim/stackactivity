// ==UserScript==
// @name             Stack Activity
// @namespace        Stack Activity
// @version          1.1
// @description      Stack Activity is a simple userscript that shows you the last activity of every question on the homepage and active tab of any Stack Exchange sites.
// @include          http://stackoverflow.com/*
// @include          http://meta.stackoverflow.com/*
// @include          http://superuser.com/*
// @include          http://meta.superuser.com/*
// @include          http://serverfault.com/*
// @include          http://meta.serverfault.com/*
// @include          http://askubuntu.com/*
// @include          http://meta.askubuntu.com/*
// @include          http://answers.onstartups.com/*
// @include          http://meta.answers.onstartups.com/*
// @include          http://nothingtoinstall.com/*
// @include          http://meta.nothingtoinstall.com/*
// @include          http://seasonedadvice.com/*
// @include          http://meta.seasonedadvice.com/*
// @include          http://stackapps.com/*
// @include          http://*.stackexchange.com/*
// @author           Antony Lau
// ==/UserScript==

function with_jquery(f) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = "(" + f.toString() + ")(jQuery)";
    document.body.appendChild(script);
};

with_jquery(function ($) {

    if (!(window.StackExchange && StackExchange.ready)) return;

    if (($('body').hasClass('home-page') || $('body').hasClass('questions-page')) && $('div.summary div.started a.started-link').length) {

        function getLastActivity(question_ids) {
            var api_url = 'http://api.stackexchange.com/2.1/questions/';
            var api_param = '?pagesize=100&order=desc&sort=activity&site=' + location.host;
            var api_filter = '!*1KcrsL3BXwn6U3cZB9sIDUW7iYlpxNFJBuEgMsCI';
            var api_key = 'JcFmrH*OeA0JAQKlVkwNcQ((';
            return $.ajax({
                type: 'GET',
                url: api_url + question_ids.join(';') + api_param + '&filter=' + api_filter + '&key=' + api_key + '&callback=?',
                dataType: 'json'
            });
        }

        function getRevisions(question_id) {
            var api_url = 'http://api.stackexchange.com/2.1/posts/';
            var api_param = '/revisions?pagesize=100&site=' + location.host;
            var api_filter = '!2.5sIHIlV6DvWc(mDFp4Y';
            var api_key = 'JcFmrH*OeA0JAQKlVkwNcQ((';
            return $.ajax({
                type: 'GET',
                url: api_url + question_id + api_param + '&filter=' + api_filter + '&key=' + api_key + '&callback=?',
                dataType: 'json'
            });
        }

        function timestampFromISO(ISODate) {
            var ISOdatetime = ISODate.split(' ');
            var ISOdate = ISOdatetime[0].split('-');
            var ISOtime = ISOdatetime[1].split(':');
            var d = new Date();
            d.setFullYear(+ISOdate[0]);
            d.setUTCMonth(+ISOdate[1] - 1);
            d.setUTCDate(+ISOdate[2]);
            d.setUTCHours(+ISOtime[0]);
            d.setUTCMinutes(+ISOtime[1]);
            d.setUTCSeconds(+ISOtime[2].replace('Z', ''));
            return Math.round(d.getTime() / 1000);
        }

        function init() {
            var question_ids = [],
                question_prefix = '';
            $('div.question-summary').each(function () {
                    question_ids.push($(this).attr('id').match(/\d+/)[0]);
                    question_prefix = question_prefix.length ? question_prefix : $(this).attr('id').replace(/\d/g, '');
                })

            getLastActivity(question_ids).done(function (data) {
                    if (data.items && data.items.length) {
                        var questions = data.items;
                        var results = {};
                        for (var i in questions) {
                            results[questions[i].question_id] = false;
                            var last_activity_date = questions[i].last_activity_date;
                            if (questions[i].migrated_to) {
                                results[questions[i].question_id] = {
                                    last_activity: "migrated away",
                                    last_activity_date: last_activity_date
                                };
                            }
                            if (questions[i].creation_date >= last_activity_date) {
                                last_activity_date = questions[i].creation_date;
                                results[questions[i].question_id] = {
                                    last_activity: "asked",
                                    last_activity_date: last_activity_date,
                                    user_id: questions[i].owner.user_id
                                };
                            }
                            if (questions[i].last_edit_date >= last_activity_date) {
                                last_activity_date = questions[i].last_edit_date;
                                results[questions[i].question_id] = {
                                    last_activity: "edited question",
                                    last_activity_date: last_activity_date
                                };
                            }
                            if (questions[i].migrated_from && questions[i].migrated_from.on_date >= last_activity_date) {
                                last_activity_date = questions[i].migrated_from.on_date;
                                results[questions[i].question_id] = {
                                    last_activity: "migrated here",
                                    last_activity_date: last_activity_date
                                };
                            }
                            if (typeof questions[i].answers !== 'undefined') {
                                var answers = questions[i].answers;
                                for (var j in answers) {
                                    last_activity_date = answers[j].last_activity_date > last_activity_date ? answers[j].last_activity_date : last_activity_date;
                                    if (answers[j].creation_date >= last_activity_date) {
                                        last_activity_date = answers[j].creation_date;
                                        results[questions[i].question_id] = {
                                            last_activity: "answered",
                                            last_activity_date: last_activity_date,
                                            user_id: answers[j].owner.user_id
                                        };
                                    }
                                    if (answers[j].last_edit_date >= last_activity_date) {
                                        last_activity_date = answers[j].last_edit_date;
                                        results[questions[i].question_id] = {
                                            last_activity: "edited answer",
                                            last_activity_date: last_activity_date
                                        };
                                    }
                                }
                            }
                            if (!results[questions[i].question_id]) {
                                if (questions[i].bounty_closes_date) {
                                    results[questions[i].question_id] = {
                                        last_activity: "placed bounty",
                                        last_activity_date: questions[i].bounty_closes_date - 7 * 24 * 3600
                                    };
                                } else if (questions[i].notice && questions[i].notice.creation_date >= last_activity_date) {
                                    last_activity_date = questions[i].notice.creation_date;
                                    results[questions[i].question_id] = {
                                        last_activity: "placed bounty",
                                        last_activity_date: last_activity_date
                                    };
                                } else {
                                    // Fallback
                                    results[questions[i].question_id] = {
                                        last_activity_date: last_activity_date
                                    }
                                    $('div#' + question_prefix + questions[i].question_id).find('div.summary div.started a.started-link').filter(function () {
                                        if (!$(this).find('span.last-activity').length) {
                                            // Create element for holding last activity value
                                            $(this).prepend('<span class="last-activity">modified</span> ');
                                            // Remove 'modified' from question lists
                                            $(this).parent().contents().filter(function () {
                                                if (this.nodeType === 3 && this.nodeValue.trim().length) {
                                                    if (this.nodeValue.trim() === 'modified') {
                                                        this.nodeValue = '';
                                                    }
                                                }
                                            });
                                        }
                                        if ($(this).siblings('a:contains("Community")').length || $(this).parent().siblings('div.user-details').find('a:contains("Community")').length) {
                                            $(this).find('span.last-activity').text('poked');
                                        } else {
                                            getRevisions(questions[i].question_id).done(function (data) {
                                                if (data.items && data.items.length) {
                                                    var revisions = data.items;
                                                    if (revisions[0].creation_date >= results[data.items[0].post_id].last_activity_date && revisions[0].comment && revisions[0].comment.toLowerCase().indexOf('reopen') !== -1) {
                                                        $('div#' + question_prefix + data.items[0].post_id + ' div.summary div.started a.started-link span.last-activity').text('reopened');
                                                    } else {
                                                        $('div#' + question_prefix + data.items[0].post_id + ' div.summary div.started a.started-link span.last-activity').text('deleted answer');
                                                    }
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                        for (var question_id in results) {
                            $('div#' + question_prefix + question_id).find('div.summary div.started a.started-link').filter(function () {
                                if (!$(this).find('span.last-activity').length) {
                                    // Create element for holding last activity value
                                    $(this).prepend('<span class="last-activity">modified</span> ');
                                    // Remove 'modified' from question lists
                                    $(this).parent().contents().filter(function () {
                                        if (this.nodeType === 3 && this.nodeValue.trim().length) {
                                            if (this.nodeValue.trim() === 'modified') {
                                                this.nodeValue = '';
                                            }
                                        }
                                    });
                                }
                                if (results[question_id] && results[question_id].last_activity) {
                                    if (results[question_id].user_id) {
                                        if ($(this).siblings('a[href*="users"]').length) {
                                            var user_id = $(this).siblings('a[href*="users"]').attr('href').match(/\/([-\d]+)\//)[1];
                                            if (user_id == results[question_id].user_id) {
                                                $(this).find('span.last-activity').text(results[question_id].last_activity);
                                            }
                                        } else if ($(this).parent().siblings('div.user-details').length) {
                                            var user_id = $(this).parent().siblings('div.user-details').find('a[href*="users"]').attr('href').match(/\/([-\d]+)\//)[1];
                                            if (user_id == results[question_id].user_id) {
                                                $(this).find('span.last-activity').text(results[question_id].last_activity);
                                            }
                                        }
                                    } else {
                                        if ($(this).find('span.relativetime') && $(this).find('span.relativetime').attr('title')) {
                                            if (Math.abs(results[question_id].last_activity_date - timestampFromISO($(this).find('span.relativetime').attr('title'))) <= 1) {
                                                $(this).find('span.last-activity').text(results[question_id].last_activity);
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }
                });
        }
        init();

        $('body').on('click', 'div.new-post-activity', function () {
            init();
        });

    }
});