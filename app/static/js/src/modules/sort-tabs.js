var utils = require('utils/utils.js');

var SortTabs = function SortTabs() {
    this.btns = Array.prototype.slice.call(document.querySelectorAll('.tab-sort-item'), 0);

    this.init();
};

SortTabs.prototype = {
    init: function() {
        var self = this;

        rd('app.tabs.sorted.set').subscribe(function(msg) {
            var tabsContextBox = document.querySelector('[data-sort-context="' + msg.contextId + '"]');

            self.sort(tabsContextBox, msg.sortType);
        });

        rd('app.tabs.sorted.content.show').subscribe(function(msg) {
            var container = msg.tabContentBox,
                content = msg.tabContent;

            container.classList.add('tvz-animation-fadeOut');

            setTimeout(function() {
                if(msg.callback && typeof msg.callback == 'function' ) {
                    msg.callback();
                }

                container.appendChild(content);
                container.classList.add('tvz-animation-fadeIn');
                container.classList.remove('tvz-animation-fadeOut');
            }, 600);
        });

        self.addListeners();
    },
    addListeners: function() {
        var self = this;

        self.btns.forEach(function(item) {
            item.addEventListener('click', function(event) {
                var tabsContextBox = item.parentNode.hasAttribute('data-sort-context') ? item.parentNode : null,
                    sortType = item.getAttribute('data-sort-type'),
                    isActive = item.classList.contains('tvz-tag-sorted');
                utils.haltEvent(event);

                if(isActive) return;

                if(tabsContextBox && sortType) {
                    self.sort(tabsContextBox, sortType);
                }
            });
        });
    },
    sort: function(tabsContextBox, sortType) {
        var self = this,
            tabs = Array.prototype.slice.call(tabsContextBox.querySelectorAll('.tab-sort-item')),
            activeTab = tabsContextBox.querySelector('[data-sort-type="' + sortType + '"]'),
            context = tabsContextBox.getAttribute('data-sort-context');

        tabs.forEach(function(item) {
            item.classList.remove('tvz-tag-sorted');
        });

        activeTab.classList.add('tvz-tag-sorted');

        switch (context) {
            case 'payment_history':
                rd('app.history.payments').broadcast({type: sortType});
            break;
        }
    }
};

module.exports = SortTabs;