var Messages = require('utils/messages.js');
var Buttons = require('utils/buttons.js');
window.req = require('../../vendor/reqwest.js');
var api = require('utils/api.js');

var ResstorePass = function () {
    this.container = document.getElementById('restore');
    this.uuid = this.container.getAttribute('data-uuid');
    this.inputs = document.querySelectorAll('input[type="password"]');

    this.password = {
        first: this.inputs[0],
        second: this.inputs[1]
    };

    this.isMatch = true;
    this.btn = new Buttons(document.querySelector('.password_btn'));
    this.msg = new Messages(document.querySelector('#restore .tvz-alerts'));

    this.init();
};

ResstorePass.prototype = {
    init: function () {
        var self = this,
            msg = '';

        self.btn.disable();

        self.password.first.addEventListener('focus', function() {
            self.clear();
        });

        self.password.second.addEventListener('focus', function() {
            if (!self.isMatch) {
                self.clear();
            }
        });

        self.password.first.addEventListener('change', function() {
            var passValue = this.value,
                passValueLength = passValue.length,
                passReValue = self.password.second.value,
                passReValueLength = passReValue.length;

            if(passValueLength < 6 || passValueLength > 16) {
                self.btn.disable();

                if(passValueLength !== 0) {
                    self.isMatch = true;
                    msg = 'Длина пароля должна быть от 6 до 16 символов';
                    self.setError(this, msg);
                } else if (passValueLength == 0 && passReValueLength !== 0) {
                    self.isMatch = true;
                    msg = 'Заполните, пожалуйста, первое поле';
                    self.setError(this, msg);
                } else {
                    self.clear();
                }
            } else {
                if(!self.validatePass(passValue)) {
                    self.isMatch = true;
                    self.btn.disable();
                    msg = 'Пароль не должен содержать специальных знаков или кирилических символов';
                    self.setError(this, msg);
                } else {
                    self.clear();

                    if(passReValueLength > 0) {
                        self.btn.reset();
                    }
                }
            }
        });

        self.password.first.addEventListener('keyup', function() {
            var passValue = this.value,
                passValueLength = passValue.length,
                passReValue = self.password.second.value,
                passReValueLength = passReValue.length;

            if (passValueLength > 0 && passReValueLength > 0 && self.validatePass(passValue)) {
                self.btn.reset();
            } else {
                self.btn.disable();
            }
        });

        self.password.second.addEventListener('keyup', function(e) {
            var keyCode = e.which || e.keyCode,
                passReValue = this.value,
                passReValueLength = passReValue.length,
                passValue = self.password.first.value,
                passValueLength = passValue.length;

            if(passValueLength == 0 && passReValueLength == 0) {
                self.clear();
            } else if(passReValueLength > 0 && self.validatePass(passValue)) {
                self.btn.reset();
                self.clear();
            } else if (passValueLength < 6 || passValueLength > 16) {
                if(passValueLength == 0 && passReValueLength !== 0) {
                    msg = 'Заполните, пожалуйста, первое поле';
                } else {
                    msg = 'Длина пароля должна быть от 6 до 16 символов';
                }
                self.setError(self.password.first, msg);
            } else if (!self.validatePass(passValue)) {
                msg = 'Пароль не должен содержать специальных знаков или кирилических символов';
                self.setError(self.password.first, msg);
            } else {
                self.btn.disable();
            }

            if(keyCode === 13) {
                self.setRecoveredPass();
            }
        });

        self.btn.on('click', function(e) {
            self.setRecoveredPass();
        });
    },
    setRecoveredPass: function() {
        var self = this,
            passVal = self.password.first.value,
            retypePassVal = self.password.second.value,
            msg = '',
            inputs = self.inputs,
            length = self.inputs.length;

        self.btn.updating();

        if (passVal === retypePassVal) {
            api.usr.setUpdatePassword({
                method: 'POST',
                data: {
                    uuid: self.uuid,
                    pass: passVal
                }
            }).then(function(resp) {
                if(resp && resp.result.value === 'true') {
                    msg = 'Пароль успешно изменен';

                    for(var i = 0; i < length; i++) {
                        inputs[i].setAttribute('disabled', 'disabled');
                    }

                    self.btn.setClass('password_btn-success');
                    self.btn.disable();
                    self.msg.show('success', msg);
                } else {
                    msg = 'Произошла ошибка. Попробуйте еще.';
                    self.msg.show('error', msg);
                    self.btn.reset();
                }
            });
        } else {
            self.isMatch = false;
            msg = 'Пароли не совпадают';
            self.setError(inputs, msg);
            self.btn.reset();
        }
    },
    setError: function(elem, msg) {
        var self = this;

        if (elem.length) {
            for(var i = 0; i < elem.length; i++) {
                elem[i].classList.add('tvz-error');
            }
        } else {
            elem.classList.add('tvz-error');
        }

        self.msg.show('error', msg);
    },
    validatePass: function (str) {
        var regexp = /^\w{6,16}$/;

        return regexp.test(str);
    },
    clear: function() {
        var self = this,
            i = 0,
            length = self.inputs.length;

        for (i; i < length; i++) {
            self.inputs[i].classList.remove('tvz-error');
        }

        self.clearMessageBox();
    },
    clearMessageBox: function() {
        this.msg.hide(400);
    }
};

window.addEventListener('load', function () {
    var restore = new ResstorePass();
});