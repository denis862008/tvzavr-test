var Messages = require('utils/messages.js');
var Buttons = require('utils/buttons.js');
var api = require('utils/api.js');
var utils = require('utils/utils.js');

    var Card = function Card(payment_system_id, activeTabBox, activeTabBtn) {
        this.payment_system_id = payment_system_id;
        this.activeTabBox = activeTabBox;
        this.activeTabBtn = activeTabBtn;

        this.msgError = '';
        this.cpCheckoutIsLoaded = false;

        this.hiddenTabFormItems = this.activeTabBox.querySelectorAll('.tvz-hide');

        this.spinnerTpl = _.template(document.getElementById('template-list-loader').innerHTML);
        this.spinner = document.createElement('div');
        this.spinner.innerHTML = this.spinnerTpl({text: ''});
        this.spinner.classList.add('tvz-hide');

        this.isSaved = false;
        this.cardNumberContainer = document.getElementById('card-number');
        this.cardNumberHighLight = this.cardNumberContainer.querySelector('.highlight');

        this.init();
    };

    Card.prototype = {
        init: function() {
            var self = this,
                btnChangeData = self.activeTabBox.querySelector('.pay-form_change');

            this.scriptCP = document.createElement('script');
            this.scriptCP.src = 'https://widget.cloudpayments.ru/bundles/checkout';

            document.body.appendChild(this.scriptCP);

            this.scriptCP.addEventListener('load', function() {
                self.cpCheckoutIsLoaded = true;
            });

            self.changeDataBtn = new Buttons(btnChangeData);

            self.changeDataBtn.on('click', function() {
                self.displayForm(self.hiddenTabFormItems);
                self.isSaved = false;
                self.cardNumberContainer.classList.add('tvz-hide');
                self.changeDataBtn.hide();
            });

            self.activeTabBox.insertBefore(self.spinner, self.activeTabBox.children[0]);
        },
        createCryptogram: function() {
            var self = this,
                checkout, result;

            checkout = new cp.Checkout(
                "pk_608b65f76ddfc8963b498a6e9a907",
                self.activeTabBox
            );

            result = checkout.createCryptogramPacket();

            if (result.success) {
                return result.packet;
            } else {
                for (var msgName in result.messages) {
                    this.msgError += ' ' + result.messages[msgName];
                }
            }
        },
        payment: function(params, newTab) {
            var self = this,
                inputs = {},
                action;

            api.payment.getCardPayment({
                method: 'GET',
                data: params
            }).then(function(resp) {
                if(resp && resp.status === 0) {
                    if(newTab) {
                        var respArray = resp.result.error,
                            pos;

                        for(var key in respArray) {
                            pos = key.indexOf('_');

                            if(respArray.hasOwnProperty(key) && pos !== -1) {
                                if(key === 'cloudpayments_AcsUrl') {
                                    action = respArray[key];
                                    continue;
                                }

                                inputs[key.slice(pos += 1)] = respArray[key];
                            }
                        }

                        var body = newTab.document.body,
                            form = newTab.document.createElement('form');

                        form.action = action;
                        form.method = 'post';

                        for(var key in inputs) {
                            var input = newTab.document.createElement('input');

                            input.name = key;
                            input.type = 'hidden';
                            if (key == 'TermUrl') {
                                input.value = inputs[key].replace('http://', 'https://');
                            } else {
                                input.value = inputs[key];
                            }

                            form.appendChild(input);
                        }

                        body.appendChild(form);
                        form.submit();
                    }
                } else {
                    self.msgError = (resp.resume) ? resp.resume : resp.error.description_ru;
                }
            });
        },
        initialRequest: function() {
            var self = this;

            self.changeDataBtn.hide();
            self.activeTabBtn.disable();
            self.activeTabBox.classList.add('pay-form-updating');
            self.spinner.classList.remove('tvz-hide');

            api.payment.getCardTail().then(function(resp) {
                self.activeTabBtn.reset();
                self.activeTabBox.classList.remove('pay-form-updating');
                self.spinner.classList.add('tvz-hide');

                if(resp.result && resp.status === 0) {
                    self.isSaved = true;

                    if(self.isSaved) {
                        self.cardNumberHighLight.innerHTML = resp.result;
                        self.cardNumberContainer.classList.remove('tvz-hide');
                        self.changeDataBtn.reset();
                        self.changeDataBtn.show();
                    } else {
                        self.displayForm(self.hiddenTabFormItems);
                    }
                } else {
                    self.isSaved = false;
                    self.displayForm(self.hiddenTabFormItems);
                    self.changeDataBtn.hide();
                    self.cardNumberContainer.classList.add('tvz-hide');
                }
            });
        },
        hideForm: function() {
            for (var i = 0; i < this.hiddenTabFormItems.length; i++) {
                this.hiddenTabFormItems[i].classList.add('tvz-hide');
            }
        },
        displayForm: function() {
            for (var i = 0; i < this.hiddenTabFormItems.length; i++) {
                this.hiddenTabFormItems[i].classList.remove('tvz-hide');
            }
        },
        setDisabledForm: function() {
            var selectItems = this.activeTabBox.querySelectorAll('select'),
                inputItems = this.activeTabBox.querySelectorAll('input');

            if(inputItems.length > 0 || selectItems.length > 0) {
                for(var i = 0; i < inputItems.length; i++) {
                    inputItems[i].setAttribute('disabled', 'disabled');
                }

                $(selectItems).each(function() {
                    $(this).prop('disabled', true);
                });
            }
        },
        setEnabledForm: function() {
            var selectItems = this.activeTabBox.querySelectorAll('select'),
                inputItems = this.activeTabBox.querySelectorAll('input');

            if(inputItems.length > 0 || selectItems.length > 0) {
                for(var i = 0; i < inputItems.length; i++) {
                    inputItems[i].removeAttribute('disabled');
                }

                $(selectItems).each(function() {
                    $(this).prop('disabled', false);
                });
            }
        }
    };

    var Payments = function Payments() {
        this.paymentId = '';
        this.activePaymentSystem = '';
        this.activePaymentSystemName = '';
        this.statusInterval = null;
        this.pending = false;

        this.amount = document.getElementById('modals-pay_form-amount');
        this.name = document.getElementById('modals-pay_form-name');
        this.price = document.getElementById('modals-pay_form-price');
        this.desc = document.getElementById('modals-pay_form-description');

        this.purchase = {};
        this.purchaseCallback = null;

        this.container = document.getElementById('modals-pay_form');
        this.allInputs = this.container.querySelectorAll('input');

        this.truePhoneNumber = null;

        this.mobileInputs = {
            number: document.getElementById('modals-pay_form-mobile-number'),
            btn: document.querySelector('#modals-pay_form-mobile .pay-form_submit')
        };

        this.balanceNodes = this.container.querySelectorAll('.modals-pay_form-balance');

        this.newTab = '';
        this.newTabUrl = '/payment_idle';
        this.newTabUrlTarget = '_blank';

        this.msg = new Messages(this.container.querySelector('.tvz-alerts'));

        this.isModalClosed = false;
        this.paymentExpired = false;

        this.btns = {};
        this.agree = {};
        this.date = {};

        this.resetBtn = true;

        this.allLists = this.container.querySelectorAll('.tvz-select_payment');
        this.fakeSelectItems = [];
        this.fakeSelectArrayNames = [];

        this.card = null;
        this.cardNumber = null;
        this.saveCardDetails = null;

        this.context = 'wallet';
        this.systemsCohesion = {
            tvzavrwallet: 'balance',
            mixplat: 'mobile',
            paypal: 'paypal',
            cloudpayments: 'card'
        };

        this.init();
    };

    Payments.prototype = {
        init: function () {
            var self = this;

            $('.tvz-select_payment').select2({
                minimumResultsForSearch: Infinity,
                containerCssClass: 'tvz-select',
                dropdownCssClass: 'tvz-select_dropdown'
            });

            rd('app.payment').subscribe(function (msg) {
                self.changeContext('payment', msg);
                rd('app.modals.show').broadcast({id: 'pay_form', tabId: 'balance', context: 'payment'});
            });

            rd('app.modals.closed').subscribe(function() {
                for(var key in self.agree) {
                    self.agree[key].checked = false;
                }
            });

            rd('app.modals.content.changed').subscribe(function (msg) {
                var path = msg.modal,
                    paymentData = {},
                    modalId = msg.modalId;

                if (msg.context != null && msg.context != self.context) {
                    self.changeContext(msg.context, msg);
                }

                if (path === 'pay_form' && modalId === 'modalspay_form') {
                    var date = new Date();

                    if (!self.date.month && !self.date.year) {
                        self.date.month = (date.getMonth() + 1);
                        self.date.year = date.getFullYear();
                    }

                    self.amount.classList.remove('tvz-error');
                    self.clear();
                    self.activeTab = msg.contentId;
                    self.activeTabBox = document.getElementById(self.activeTab);
                    self.activeTabName = msg.content;
                    self.activePaymentSystem = self.systems[self.activeTabName].payment_system__id;
                    self.activePaymentSystemName = self.systems[self.activeTabName].payment_system__alias;
                    self.currentAgreement = document.getElementById(self.activeTabName + '-agreement');
                    self.currentBtn = self.activeTabBox.querySelector('.pay-form_submit');

                    if (!self.btns[self.activeTabName]) {
                        self.btns[self.activeTabName] = new Buttons(self.currentBtn);

                        self.btns[self.activeTabName].on('click', function () {
                            if (self.isEmptyFields() && !self.card.isSaved) {
                                self.msg.show('error', 'Не заполнены поля', 4000);
                                return;
                            }

                            switch (self.context) {
                                case 'wallet':
                                    if (self.checkAmount(self.amount.value)) {
                                        self.amount.classList.remove('tvz-error');
                                        paymentData = {amount: self.amount.value};
                                        self.startPayment[self.activeTabName].call(self, paymentData);
                                    } else {
                                        self.amount.classList.add('tvz-error');
                                    }
                                break;
                                case 'payment':
                                    self.startPayment[self.activeTabName].call(self, self.purchase);
                                break;
                            }
                        });
                    } else {
                        self.btns[self.activeTabName].reset();
                    }

                    if(self.activeTabName === 'card') {
                        if(self.card == null) {
                            self.card = new Card(self.activePaymentSystem, self.activeTabBox, self.btns[self.activeTabName]);
                        }

                        self.card.hideForm();
                        self.card.initialRequest();
                    }

                    if (self.currentAgreement) {
                        if(self.currentAgreement.checked == false) {
                            self.btns[self.activeTabName].disable();
                        }

                        if(!self.agree[self.activeTabName]) {
                            self.agree[self.activeTabName] = self.currentAgreement;
                        }

                        self.currentAgreement.addEventListener('click', function (e) {
                            if (!utils.isChecked(this)) {
                                self.btns[self.activeTabName].disable();
                            } else {
                                self.msg.hide();
                                self.btns[self.activeTabName].reset();
                            }
                        });
                    }
                }
            });

            for (var i = this.allInputs.length; i--;) {
                var field = this.allInputs[i],
                    type = this.allInputs[i].type;

                this.allInputs[i].addEventListener('focus', function (e) {
                    if (e && e.target) {
                        e.target.classList.remove('tvz-error');
                    }
                });

                if(type === 'number') {
                    field.addEventListener('wheel', function(e) {
                        utils.haltEvent(e);
                    });
                }
            }


            for(var i = 0; i < self.allLists.length; i++) {
                (function (i) {
                    var item = self.allLists[i].nextSibling;

                    if(utils.isHTMLTag(item)) {
                        var fakeSelectOption = item.querySelector('.select2-selection__rendered'),
                            text = fakeSelectOption.innerHTML;

                        item.addEventListener('click', function(e) {
                            fakeSelectOption.parentNode.classList.remove('tvz-error');
                        });

                        self.fakeSelectItems.push(item);
                        self.fakeSelectArrayNames.push(text);
                    }
                })(i);
            }

            api.payment.getPaymentSystem().then(function (resp) {
                if (resp && resp.status === 0) {
                    self.systems = resp.payment_systems.reduce(function(result, itm) {
                        if (self.systemsCohesion.hasOwnProperty(itm.payment_system__alias)) {
                            result[self.systemsCohesion[itm.payment_system__alias]] = itm;
                        }

                        return result;
                    }, {});

                    for (var key in self.systemsCohesion) {
                        if (!self.systems.hasOwnProperty(self.systemsCohesion[key])) {
                            var target = 'modals-pay_form-' + self.systemsCohesion[key],
                                link = document.querySelector('[data-target="' + target + '"]'),
                                option = document.querySelector('[value="' + target + '"]');

                            if (link) {
                                link.parentNode.parentNode.removeChild(link.parentNode);
                            }

                            if (option) {
                                option.parentNode.removeChild(option);
                            }
                        }
                    }
                }
            });
        },
        startPayment: {
            card: function(purchase) {
                var self = this,
                    crypto,
                    params = {},
                    container = document.getElementById(self.activeTab),
                    name = container.querySelector('[data-cp="name"]').value,
                    contextData,
                    fakeSelectOptions = self.activeTabBox.querySelectorAll('.select2-selection__rendered'),
                    month = Number(fakeSelectOptions[0].innerHTML),
                    year = Number(fakeSelectOptions[1].innerHTML),
                    i = 0,
                    msgExpired = 'Срок действия карты истек';

                if (month < self.date.month && year < self.date.year) {
                    for (i; i < fakeSelectOptions.length; i++) {
                        fakeSelectOptions[i].parentNode.classList.add('tvz-error');
                    }
                    self.msg.show('error', msgExpired, 4000);
                    return;
                } else if (month < self.date.month && year === self.date.year) {
                    fakeSelectOptions[0].parentNode.classList.add('tvz-error');
                    self.msg.show('error', msgExpired, 4000);
                    return;
                } else if (month >= self.date.month && year < self.date.year) {
                    fakeSelectOptions[1].parentNode.classList.add('tvz-error');
                    self.msg.show('error', msgExpired, 4000);
                    return;
                }

                if(self.card.cpCheckoutIsLoaded) {
                    if(!self.card.isSaved) {
                        self.card.msgError = '';
                        crypto = self.card.createCryptogram();

                        if(crypto) {
                            self.card.setDisabledForm();
                        } else {
                            self.msg.show('error', self.card.msgError, 4000);
                            return;
                        }
                    } else {
                        self.card.changeDataBtn.disable();
                    }
                } else {
                    self.msg.show('error', 'Платежная система в данный момент недоступна: ', 4000);
                    return;
                }

                self.blockedPaymentTab();
                self.newTab = (self.card.isSaved) ? null : window.open(self.newTabUrl, self.newTabUrlTarget);
                contextData = self.getDataContext();

                contextData.request({
                    method: 'post',
                    data: contextData.data
                }).then(function(resp) {
                    if(resp && resp.status === 0) {
                        self.clear();
                        self.paymentId = resp.result.payment_id;

                        if(self.card.isSaved) {
                            params = {
                                payment_id: self.paymentId
                            };
                        } else {
                            params = {
                                payment_id: self.paymentId,
                                cryptogram: crypto,
                                name: name
                            };

                            self.cardNumber = crypto.substring(8, 12);
                            self.saveCardDetails = document.getElementById('card-remember').checked;
                        }

                        self.card.payment(params, self.newTab);
                        self.checkPaymentStatus(self.paymentId);
                    } else {
                        self.closedCauseError(resp);
                    }
                });
            },
            mobile: function (purchase) {
                var self = this,
                    contextData;

                self.phoneNumber = this.mobileInputs.number.value;

                if (utils.isPhoneNumber(self.phoneNumber)) {
                    self.phoneNumber = self.phoneNumber.slice(2).replace(/\D/mg, '');
                    self.msg.hide();
                } else {
                    self.msg.show('error', 'Номер необходимо вводить в формате: +7 XXX XXX-XX-XX либо +7XXXXXXXXXX');
                    return;
                }

                self.blockedPaymentTab();
                contextData = self.getDataContext();
                contextData.data.phone_number = self.phoneNumber;

                contextData.request({
                    method: 'post',
                    data: contextData.data
                }).then(function(resp) {
                    if (resp && resp.status === 0) {
                        self.paymentId = resp.result.payment_id;
                        self.checkPaymentStatus(self.paymentId);
                    } else if (resp.status) {
                        self.activatePaymentTab();
                        self.msg.show('error', resp.error[0].description_ru);
                    }
                });
            },
            balance: function (purchase) {
                var self = this;

                if (utils.isChecked(self.currentAgreement)) {
                    self.msg.hide();
                } else {
                    self.msg.show('error', 'Необходимо согласие с договором оферты', 4000);
                    return;
                }

                self.blockedPaymentTab();
                purchase.payment_system__id = self.activePaymentSystem;

                api.payment.getOrderId({
                    method: 'post',
                    data: purchase
                }).then(function(resp) {
                    if (resp && resp.status === 0) {
                        self.paymentId = resp.result.payment_id;
                        self.checkPaymentStatus(self.paymentId);
                    } else {
                        setTimeout(function () {
                            self.activatePaymentTab();
                            self.msg.show('error', resp.error[0].description_ru);
                        }, 300);
                    }
                });
            },
            paypal: function (purchase) {
                var self = this,
                    contextData;

                if (utils.isChecked(self.currentAgreement)) {
                    self.msg.hide();
                } else {
                    self.msg.show('error', 'Необходимо согласие с договором оферты', 4000);
                    return;
                }

                self.blockedPaymentTab();
                self.newTab = window.open(self.newTabUrl, self.newTabUrlTarget);
                contextData = self.getDataContext();

                contextData.request({
                    method: 'post',
                    data: contextData.data
                }).then(function(resp) {
                    if (resp && resp.status === 0) {
                        self.paymentId = resp.result.payment_id;

                        if (!self.newTab.closed) {
                            self.newTabUrl = resp.result['redirect-url'];
                            self.newTab.location = self.newTabUrl;
                            self.checkPaymentStatus(self.paymentId);
                        } else {
                            self.activatePaymentTab();
                            self.msg.show('error', 'Оплата отменена', 4000);

                            api.payment.resetOrderId({
                                id: self.paymentId
                            });
                        }
                    } else {
                        self.closedCauseError(resp);
                    }
                });
            }
        },
        statusCallbacks: {
            common: {
                error: function() {
                    this.newTab.close();
                },
                pending: function() {
                    if (this.newTab.closed) {
                        clearInterval(this.statusInterval);

                        this.activatePaymentTab();
                        this.msg.show('error', 'Оплата отменена', 4000);

                        api.payment.resetOrderId({
                            id: this.paymentId
                        });

                        this.newTabUrl = '/payment_idle';
                    }

                    if (this.isModalClosed) {
                        if(this.newTab) {
                            this.newTab.close();
                        }
                        this.isModalClosed = false;
                        this.newTabUrl = '/payment_idle';
                    }
                },
                reject: function() {
                    if(this.newTab) {
                        this.newTab.close();
                    }
                },
                success: function() {
                    if(this.newTab) {
                        this.newTab.close();
                    }

                    this.newTabUrl = '/payment_idle';
                }
            },
            cloudpayments: {
                pending: function() {
                    if(this.card.msgError !== '') {
                        api.payment.resetOrderId({
                            id: this.payment_id
                        });

                        clearInterval(this.statusInterval);

                        if(this.newTab) {
                            this.newTab.close();
                        }

                        this.newTabUrl = '/payment_idle';
                        this.clear();
                        this.activatePaymentTab();

                        this.msg.show('error', this.card.msgError, 4000);
                    }
                },
                success: function() {
                    if(this.saveCardDetails && this.cardNumber) {
                        api.payment.updateCardTail({
                            card_tail: this.cardNumber
                        });
                    }
                }
            },
            paypal: {
                error: function () {
                    this.currentAgreement.removeAttribute('disabled');
                }
            },
            mobile: null,
            balance: null
        },
        checkPaymentStatus: function (payment_id) {
            var self = this,
                timerExpired,
                callback,
                commonBehavior;

            timerExpired = setTimeout(function () {
                self.paymentExpired = true;
            }, 300000);

            callback = self.statusCallbacks[self.activePaymentSystemName];
            commonBehavior = self.statusCallbacks.common;

            self.statusInterval = setInterval(function () {
                api.payment.getOrderStatus({
                    method: 'GET',
                    data: {
                        payment_id: payment_id
                    }
                }).then(function (resp) {
                    var paymentStatus;

                    if (resp && resp.status === 0) {
                        paymentStatus = resp.result.name;

                        switch (paymentStatus) {
                            case 'UNKNOWN_ERROR':
                                clearInterval(timerExpired);
                                clearInterval(self.statusInterval);

                                self.activatePaymentTab();
                                self.msg.show('error', 'Неверные параметры');

                                api.payment.resetOrderId({
                                    id: payment_id
                                });

                                if (callback) {
                                    if(commonBehavior.error) {
                                        commonBehavior.error.call(self);
                                    }

                                    if(callback.error) {
                                        callback.error.call(self);
                                    }
                                }
                            break;

                            case 'PAYMENT_PENDING':
                                self.msg.show('info', 'Ожидание подтверждения платежа');

                                if (!document.querySelector('html').classList.contains('modal-in')) {
                                    clearInterval(self.statusInterval);
                                    self.isModalClosed = true;

                                    api.payment.resetOrderId({
                                        id: payment_id
                                    });

                                    self.activatePaymentTab();
                                }

                                if (callback) {
                                    if(commonBehavior.pending) {
                                        commonBehavior.pending.call(self);
                                    }

                                    if(callback.pending) {
                                        callback.pending.call(self);
                                    }
                                }

                                if (self.paymentExpired) {
                                    if (self.newTab) {
                                        self.newTab.close();
                                        self.newTabUrl = '/payment_idle';
                                    }
                                    clearInterval(self.statusInterval);

                                    api.payment.resetOrderId({
                                        id: payment_id
                                    });

                                    self.activatePaymentTab();
                                    self.msg.show('error', 'Время ожидания оплаты вышло');

                                    self.paymentExpired = false;
                                }
                            break;

                            case 'PAYMENT_REJECTED':
                                clearInterval(timerExpired);
                                clearInterval(self.statusInterval);

                                api.payment.resetOrderId({
                                    id: payment_id
                                });

                                if (callback) {
                                    if(commonBehavior.reject) {
                                        commonBehavior.reject.call(self);
                                    }

                                    if(callback.reject) {
                                        callback.reject.call(self);
                                    }
                                }

                                self.activatePaymentTab();
                                self.msg.show('error', 'Оплата отменена пользователем', 4000);
                            break;

                            case 'PAYMENT_CONFIRMED':
                                clearInterval(timerExpired);
                                clearInterval(self.statusInterval);
                                self.clear();

                                self.resetBtn = false;
                                self.activatePaymentTab();

                                rd('app.user.update.balance').broadcast();

                                if (callback) {
                                    if(commonBehavior.success) {
                                        commonBehavior.success.call(self);
                                    }

                                    if(callback.success) {
                                        callback.success.call(self);
                                    }
                                }

                                self.msg.show('success', 'Оплата прошла успешно!', 1500);

                                setTimeout(function () {
                                    rd('app.modals.closeAll').broadcast();

                                    self.resetBtn = true;

                                    if (self.purchaseCallback != null) {
                                        self.purchaseCallback();
                                        self.purchaseCallback = null;
                                    }
                                }, 1500);
                            break;
                        }
                    }
                });
            }, 1500);
        },
        changeContext: function (context, conf) {
            this.context = context;

            switch (context) {
                case 'wallet':
                    this.amount.parentNode.classList.remove('tvz-hide');
                    this.name.innerHTML = 'Пополнение счёта';
                    this.price.parentNode.classList.add('tvz-hide');
                    this.desc.classList.add('tvz-hide');
                    for (var i = this.balanceNodes.length; i--;) {
                        this.balanceNodes[i].classList.add('tvz-hide')
                    }
                break;
                case 'payment':
                    this.amount.parentNode.classList.add('tvz-hide');
                    this.name.innerHTML = conf.name;
                    this.price.parentNode.classList.remove('tvz-hide');
                    this.price.innerHTML = conf.price;
                    this.desc.classList.remove('tvz-hide');
                    this.desc.innerHTML = conf.desc;
                    for (var i = this.balanceNodes.length; i--;) {
                        this.balanceNodes[i].classList.remove('tvz-hide')
                    }
                    this.purchase = {};

                    this.purchase.tariff__id = conf.tariffId;
                    if (conf.clipId) {
                        this.purchase.clip_id = conf.clipId;
                    }

                    this.purchaseCallback = conf.callback;
                break;
            }
        },
        clear: function () {
            for (var i = this.allInputs.length; i--;) {
                this.allInputs[i].value = '';
                this.allInputs[i].classList.remove('tvz-error');
            }

            for(var i = 0; i < this.allLists.length; i++) {
                this.allLists[i].selectedIndex = -1;
            }

            for(var i = 0; i < this.fakeSelectArrayNames.length; i++) {
                var span = this.fakeSelectItems[i].querySelector('.select2-selection__rendered');

                span.parentNode.classList.remove('tvz-error');
                span.innerHTML = this.fakeSelectArrayNames[i];
                span.removeAttribute('title');
            }

            this.clearMessages();
        },
        isEmptyFields: function () {
            var inputs = [],
                isEmpty = false,
                curTabInputs = this.activeTabBox.querySelectorAll('.tvz-input'),
                fakeSelectOptions = this.activeTabBox.querySelectorAll('.select2-selection__rendered');


            if (this.context === 'wallet') {
                inputs.push(this.amount);
            }

            if(fakeSelectOptions.length > 0) {
                for(var i = 0; i < fakeSelectOptions.length; i++) {
                    var fakeOptionValue = parseInt(fakeSelectOptions[i].innerHTML, 10);

                    if(isNaN(fakeOptionValue)) {
                        isEmpty = true;
                        fakeSelectOptions[i].parentNode.classList.add('tvz-error');
                    }
                }
            }

            for (var i = 0; i < curTabInputs.length; i++) {
                inputs.push(curTabInputs[i]);
            }

            inputs.forEach(function (itm) {
                if (itm.value === '') {
                    itm.classList.add('tvz-error');
                    isEmpty = true;
                }
            });

            return isEmpty;
        },
        getDataContext: function() {
            var self = this,
                initDataPayment = {};

            switch (self.context) {
                case 'wallet':
                    initDataPayment = {
                        request: (self.activeTabName === 'mobile') ? api.payment.getWalletPaymentMobile : api.payment.getWalletPayment,
                        data: {
                            amount: self.amount.value,
                            payment_system_id: self.activePaymentSystem
                        }
                    };
                break;
                case 'payment':
                    initDataPayment = {
                        request: (self.activeTabName === 'mobile') ? api.payment.getOrderIdMobile : api.payment.getOrderId,
                        data: {
                            tariff__id: self.purchase.tariff__id,
                            payment_system__id: self.activePaymentSystem
                        }
                    };

                    if(self.activeTabName === 'mobile') {
                        initDataPayment.data.payment_system_id = initDataPayment.data.payment_system__id;
                        initDataPayment.data.tariff_id = initDataPayment.data.tariff__id;

                        delete initDataPayment.data.payment_system__id;
                        delete initDataPayment.data.tariff__id;
                    }

                    if (self.purchase.clip_id) {
                        initDataPayment.data.clip_id = self.purchase.clip_id;
                    }
                break;
            }

            return initDataPayment;
        },
        closedCauseError: function(resp) {
            var self = this;

            setTimeout(function () {
                self.activatePaymentTab();
                self.msg.show('error', resp.error[0].description_ru);
                self.newTab.close();
            }, 300);
        },
        checkAmount: function (value) {
            var errorText = '';

            if (utils.isNumeric(value)) {
                if (value < 10) {
                    errorText = 'Минимальная сумма платежа составляет 10 рублей';
                } else if (value > 10000) {
                    errorText = 'Максимальная сумма платежа составляет 10 000 рублей';
                } else {
                    this.msg.hide();

                    return true;
                }
            } else {
                errorText = 'Сумма указана некорректно';
            }

            this.msg.show('error', errorText, 4000);

            return false;
        },
        blockedPaymentTab: function () {
            var self = this;

            rd('app.content.block').broadcast();
            self.btns[self.activeTabName].updating();

            if(self.currentAgreement) {
                self.currentAgreement.setAttribute('disabled', 'disabled');
            }
        },
        activatePaymentTab: function () {
            if (this.currentAgreement) {
                this.currentAgreement.removeAttribute('disabled');
            }

            rd('app.content.resume').broadcast();

            if(this.resetBtn) {
                this.btns[this.activeTabName].reset();
            } else {
                this.btns[this.activeTabName].disable();
            }

            if(this.activeTabName === 'card') {
                this.card.setEnabledForm();
            }
        },
        clearMessages: function () {
            this.msg.hideAll();
        }
    };

    module.exports = Payments;