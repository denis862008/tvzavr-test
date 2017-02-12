var api = require('utils/api.js');
var Messages = require('utils/messages.js');
var Buttons = require('utils/buttons.js');

var HistoryPayments = function HistoryPayments() {
    this.container = document.getElementById('modals-payment_history');
    this.tabsContainer = this.container.querySelector('.tab-sort-container');
    this.msg = new Messages(this.container.querySelector('.tvz-alerts'));
    this.showMoreBtn = new Buttons(this.container.querySelector('.payment_history_update'));
    this.loader = this.container.querySelector('.tvz-loader');

    this.sort = {
        '0': {
            offset: 0,
            entries: [],
            entriesExist: true
        },
        '1': {
            offset: 0,
            entries: [],
            entriesExist: true
        },
        '2': {
            offset: 0,
            entries: [],
            entriesExist: true
        }
    };

    this.limit = 5;

    this.isOffset = false;
    this.table = this.container.querySelector('.payment_history_table');
    this.trInit = this.table.querySelector('tr');
    //this.lang = document.querySelector('html').hasAttribute('lang') ? document.querySelector('html').getAttribute('lang') : null;

        this.init();
};

HistoryPayments.prototype = {
    init: function() {
        var self = this;

        rd('app.modals.closed').subscribe(function() {
            self.resetSortSettings();
            self.msg.hideAll();
            self.tabsContainer.classList.remove('tvz-hide');
            self.showMoreBtn.show();
        });

        rd('app.history.payments').subscribe(function(msg) {
            var entriesLength = self.sort[msg.type].entries.length;

            self.loader.classList.remove('tvz-hide');
            self.showMoreBtn.disable();
            self.msg.hideAll();

            self.sort[msg.type].entriesExist ? self.showMoreBtn.show() : self.showMoreBtn.hide();

            if((entriesLength == 0 && self.sort[msg.type].entriesExist) || (entriesLength < self.sort[msg.type].offset && self.sort[msg.type].entriesExist) || self.isOffset) {
                api.usr.historyPayment({
                    method: 'GET',
                    data: {
                        type: msg.type,
                        limit: self.limit,
                        offset: self.sort[msg.type].offset
                    }
                }).then(function(resp) {
                    if(resp && resp.status == 0) {
                        var respEntries = resp.result.lines,
                            linesCount = resp.result.lines_cnt,
                            sumControl = self.sort[msg.type].offset + self.limit;

                        self.sort[msg.type].offset += self.limit;
                        self.createEntries(respEntries, msg.type);

                        if(sumControl > linesCount || (self.sort[msg.type].entries.length === linesCount)) {
                            self.sort[msg.type].entriesExist = false;
                            self.showMoreBtn.hide();
                            self.currentTabEntriesAnalyze(msg.type);
                        }
                    } else {
                        self.tabsContainer.classList.add('tvz-hide');
                        self.showMoreBtn.hide();
                        self.loader.classList.add('tvz-hide');
                        self.msg.show('error', resp.error.description_ru);
                    }
                });
            } else {
                self.entriesRender(self.sort[msg.type].entries);
                self.currentTabEntriesAnalyze(msg.type);
            }
        });

        self.showMoreBtn.on('click', function() {
            var activeTab = self.container.querySelector('.tab-sort-item.tvz-tag-sorted'),
                activeTabSortType = activeTab.getAttribute('data-sort-type');

            self.isOffset = true;
            rd('app.history.payments').broadcast({type: activeTabSortType});
        });
    },
    currentTabEntriesAnalyze: function(sortType) {
        var self = this,
            entriesExist = self.sort[sortType].entriesExist,
            entriesLength = self.sort[sortType].entries.length,
            tabName = {
                '0': 'Все записи',
                '1': 'Пополнения',
                '2': 'Покупки'
            };

        setTimeout(function() {
            if(!entriesExist && entriesLength > 0) {
                self.msg.show('info', 'В разделе &laquo;' + tabName[sortType] + '&raquo; записей больше нет');
            } else if(!entriesExist && entriesLength == 0) {
                self.msg.show('info', 'В разделе &laquo;' + tabName[sortType] + '&raquo; записи отсутствуют');
            }
        }, 600);
    },
    createEntries: function(entries, sortType) {
        var self = this;

        if(!self.isOffset) {
            self.table.innerHTML = '';
        }

        entries.forEach(function(item) {
            var type = item.tr_type_id,
                tr = self.trInit.cloneNode(true),
                td = Array.prototype.slice.call(tr.querySelectorAll('td')),
                span = td[0].querySelector('span'),
                created = item.created.replace(/\s/g, ', '),
                posCreated = created.lastIndexOf(':'),
                trClass = type == 8 ? 'payment_history_enrollment' : type == 3 ? 'payment_history_debit' : 'direct payment';

            span.innerHTML = item.amount;
            td[1].innerHTML = item.tr_type_name + '. ' + self.entryInit(item, trClass) + '.';
            //td[1].innerHTML = self.lang == 'ru' ? item.tr_type_name + '. ' + self.entryInit(item, trClass) + '.' : self.entryInit(item, trClass);
            created = created.substring(0, posCreated);
            td[2].innerHTML = created;
            tr.classList.remove('tvz-hide');
            tr.classList.add(trClass);
            self.sort[sortType].entries.push(tr);
        });

        self.entriesRender(self.sort[sortType].entries);
    },
    entriesRender: function(entries) {
        var self = this,
            tableBody = self.table.querySelector('tbody'),
            tbody = tableBody ? tableBody : document.createElement('tbody'),
            i,
            callback;

        if(self.isOffset) {
            self.isOffset = false;

            _tbodyAppend();

            self.loader.classList.add('tvz-hide');
            self.showMoreBtn.reset();

            return;
        } else if(tbody.innerHTML == '') {
            _tbodyAppend();

            callback = function() {
                self.loader.classList.add('tvz-hide');
                self.showMoreBtn.reset();
            };
        } else {
            tbody.innerHTML = '';

            callback = function() {
                _tbodyAppend();

                self.loader.classList.add('tvz-hide');
                self.showMoreBtn.reset();
            };
        }

        rd('app.tabs.sorted.content.show').broadcast({
            tabContentBox: self.table,
            tabContent: tbody,
            callback: callback
        });

        function _tbodyAppend() {
            for (i = 0; i < entries.length; i++) {
                tbody.appendChild(entries[i]);
            }
        }
    },
    entryInit: function(entryItem, htmlClass) {
        var self= this,
            tariffName = entryItem.tariff_name,
            clipName = entryItem.clip_name,
            statusName = entryItem.status_name,
            highlight,
            result;

        function checkTariffName() {
            var buyMoviePos1 = tariffName.toLowerCase().indexOf('покупка'),
                buyMoviePos2 = tariffName.toLowerCase().indexOf('купить'),
                rentalMoviePos = tariffName.toLowerCase().indexOf('прокат');

            if(buyMoviePos1 !== -1 || buyMoviePos2 !== -1) {
                return 'Покупка фильма ';
            } else if(rentalMoviePos !== -1) {
                return 'Прокат фильма ';
            }
        }

        switch (htmlClass) {
            case 'payment_history_enrollment':
                result = statusName;
            break;
            case 'payment_history_debit':
                if(clipName) {
                    highlight = '<strong>' + clipName + '</strong>';
                    result = checkTariffName() + highlight;
                } else {
                    result = tariffName;
                }
            break;
        }

        return result;
    },
    resetSortSettings: function() {
        var self = this;

        for (var type in self.sort) {
            if(self.sort.hasOwnProperty(type)) {
                self.sort[type].offset = 0;
                self.sort[type].entries = [];
                self.sort[type].entriesExist = true;
            }
        }

        self.table.innerHTML = '';
        self.table.classList.add('tvz-animation-fadeOut');
        self.table.classList.remove('tvz-animation-fadeIn');
    }
};

module.exports = HistoryPayments;