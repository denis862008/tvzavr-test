var api = require('utils/api.js');
var utils = require('utils/utils.js');

var Tags = function (wrapper, storage) {
    var self = this;

    this.wrapper = wrapper;
    this.storage = storage;

    var containers = this.wrapper.querySelectorAll('.filters-list_selected__box');

    this.countriesSelected = containers[2];
    this.genresSelected = containers[0];

    this.countriesContainer = document.getElementById('countries-list');
    this.genresContainer = document.getElementById('genres-list');


    rd('app.years.changed').subscribe(function () {
        self.updateTags('all');
    });

    rd('app.catalog.free').subscribe(function() {
        self.updateTags('all');
    });

    rd('app.catalog.adult').subscribe(function() {
        self.updateTags('all');
    });
};

Tags.prototype = {
    updateTags: function (type) {
        var self = this;

        var params = this.storage.get();

        rd('app.filter.loading.start').broadcast('genres-list');

        api.catalog.listFilters({
            tags: params.tags,
            tags_or: params.tags_or,
            from_year: params.from_year,
            till_year: params.till_year,
            cats: params.cats,
            genre: params.genre
        }).then(function (resp) {
            if (resp && resp.status === 0) {
                self.outputExistTags(resp.result.map(function (itm) {
                    return itm.mark__id
                }), self.genresContainer, type);
            } else {
                console.log('Неверные параметры');
            }

            rd('app.filter.loading.end').broadcast('genres-list');
        });

        if (type === 'all') {
            rd('app.filter.loading.start').broadcast('countries-list');

            api.catalog.listFilters({
                tags: params.tags,
                from_year: params.from_year,
                till_year: params.till_year,
                cats: params.cats,
                genre: params.genre
            }).then(function (resp) {
                if (resp && resp.status === 0) {
                    self.outputExistTags(resp.result.map(function (itm) {
                        return itm.mark__id
                    }), self.countriesContainer, type);
                } else {
                    console.log('Неверные параметры');
                }

                rd('app.filter.loading.end').broadcast('countries-list');
            });
        }
    },
    outputExistTags: function (data, container, type) {
        var disabledTags,
            allTags,
            self = this;

        disabledTags = Array.prototype.slice.call(container.querySelectorAll('.filters-list_item.tvz-disable'), 0);
        allTags = Array.prototype.slice.call(container.querySelectorAll('.filters-list_item'), 0);

        disabledTags.forEach(function (tag) {
            tag.classList.remove('tvz-disable');
        });

        allTags.forEach(function (itm) {
            var id = itm.getAttribute('data-target');
            if (data.indexOf(parseInt(id)) == -1) {
                if (itm.classList.contains('selected')) {
                    self.remove(id, false);
                }

                itm.classList.add('tvz-disable');
            }
        })
    },
    include: function (tagId, tagName, tabId, needUpdate) {
        var selectTag = document.querySelector('[data-target="' + tagId + '"]'),
            type,
            pathName = window.location.pathname,
            hasGenre = pathName.indexOf('genre'),
            genrePos = pathName.lastIndexOf('/'),
            genreId = pathName.slice((genrePos+1));

        needUpdate = needUpdate != null ? needUpdate : true;

        if (tagName === 'undefined') {
            tagName = selectTag.innerHTML;
        }

        var params = this.storage.get();

        if (!params.hasOwnProperty('tags')) {
            params.tags = [];
        }

        if (!params.hasOwnProperty('tags_or')) {
            params.tags_or = [];
        }

        if (tabId === 'genres-list' && params.tags.indexOf(tagId) === -1) {
            params.tags.push(tagId);
            params.tags.sort();
            type = 'all';
        }

        if (tabId === 'countries-list' && params.tags_or.indexOf(tagId) === -1) {
            params.tags_or.push(tagId);
            params.tags_or.sort();
            type = 'genres';
        }

        this.storage.set(params);

        this.create(tagId, tagName, null, this.remove);

        if(hasGenre && !genreId) {
            var genresSelected = Array.prototype.slice.call(this.genresSelected.querySelectorAll('a'), 0),
                genreItem = genresSelected[0].getAttribute('data-bind');

            window.history.pushState(null, '', genreItem);
            params.genre = genreItem;
            this.storage.set(params);
        }

        if (needUpdate) {
            this.updateTags(type);
            rd('app.tags.changed').broadcast();
            rd('app.catalog.reset').broadcast();
        }
    },
    create: function (dataBind, tagName, divId) {
        var self = this,
            tagLink = document.createElement('a'),
            initParams = this.storage.get();

        var tags = self.wrapper.querySelectorAll('.filters-list_selected__box'),
            tagsBox = tags[0],
            tagsOrBox = tags[tags.length - 1];


        if (divId != null) {
            tagLink.id = divId;
        }

        tagLink.setAttribute('data-bind', dataBind);
        tagLink.setAttribute('class', 'tvz-tag tvz-tag-deleted filters-list_selected_item');
        tagLink.setAttribute('href', 'javascript:void(0);');

        var tagLinkName = document.createTextNode(tagName);

        tagLink.addEventListener('click', function (e) {
            utils.haltEvent(e);

            var target = e.target;
            self.resetFlag = true;

            self.remove(target.getAttribute('data-bind'));
        });

        self.storage.del('client_ctx');

        tagLink.appendChild(tagLinkName);

        if (initParams.tags && initParams.tags.indexOf(dataBind) !== -1) {
            tagsBox.appendChild(tagLink);
        }

        if (initParams.tags_or && initParams.tags_or.indexOf(dataBind) !== -1) {
            tagsOrBox.appendChild(tagLink);
        }
    },
    remove: function (tagId, needUpdate) {
        var tag = document.querySelector('[data-target="' + tagId + '"]'),
            type,
            pathName = window.location.pathname,
            hasGenre = pathName.indexOf('genre'),
            genrePos = pathName.lastIndexOf('/'),
            genreId = pathName.slice((genrePos+1));

        needUpdate = needUpdate != null ? needUpdate : true;

        if (tag.classList.contains('selected')) {
            tag.classList.toggle('selected');
        }

        var params = this.storage.get();

        var indexTags = params.tags.indexOf(tagId),
            indexTagsOr = params.tags_or.indexOf(tagId);

        if (indexTags > -1) {
            this.genresSelected.removeChild(this.genresSelected.querySelector('[data-bind="' + tagId + '"]'));
            params.tags.splice(indexTags, 1);
            type = 'all';
        } else if (indexTagsOr > -1) {
            this.countriesSelected.removeChild(this.countriesSelected.querySelector('[data-bind="' + tagId + '"]'));
            params.tags_or.splice(indexTagsOr, 1);
            type = 'genres';
        }

        if(hasGenre && genreId) {
            var genresSelected = Array.prototype.slice.call(this.genresSelected.querySelectorAll('a'), 0),
                genresSelectedId = [];

            for (var i = 0; i < genresSelected.length; i++) {
                var itemSelectedId = genresSelected[i].getAttribute('data-bind');
                genresSelectedId.push(itemSelectedId)
            }


            if(genresSelectedId.length > 0) {
                if(genresSelectedId.indexOf(genreId) === -1) {
                    window.history.pushState(null, '', genresSelectedId[0]);
                    params.genre = genresSelectedId[0];
                }
            } else {
                window.history.pushState(null, '', pathName.slice(0, (genrePos + 1)));
                params.genre = '';
            }
        }

        this.storage.set(params);

        if (needUpdate) {
            this.updateTags(type);

            rd('app.tags.changed').broadcast();
            rd('app.catalog.reset').broadcast();
        }
    },
    clear: function (e) {
        var pathName = window.location.pathname,
            hasGenre = pathName.indexOf('genre'),
            genrePos = pathName.lastIndexOf('/'),
            genreId = pathName.slice((genrePos+1));

        this.storage.del('tags');
        this.storage.del('tags_or');

        if(hasGenre && genreId) {
            this.storage.del('genre');
            window.history.pushState(null, '', pathName.slice(0, (genrePos + 1)));
        }

        var filterItems = document.querySelectorAll('.filters-list_item.selected');

        for (var i = filterItems.length; i--;) {
            filterItems[i].classList.remove('selected');
        }

        return false;
    }
};

var Years = function (wrapper, storage) {
    var self = this;
    this.wrapper = wrapper;
    this.storage = storage;

    this.years_slider = document.getElementById('years_slider');
    this.years_from = document.getElementById('years-from');
    this.years_to = document.getElementById('years-to');
    this.lastyear = (new Date()).getFullYear();

    this.availableYears = [];
    this.isSliderCreated = false;

    this.years_from.addEventListener('wheel', function(e) {
        utils.haltEvent(e);
    });

    this.years_to.addEventListener('wheel', function(e) {
        utils.haltEvent(e);
    });

    this.years_from.addEventListener('change', function () {
        var value = self.normalizeYear(this.value, false);

        self.years_slider.noUiSlider.set([value, null]);
        self.addYear(value, 'from_year');
    });

    this.years_to.addEventListener('change', function () {
        var value = self.normalizeYear(this.value, true);

        self.years_slider.noUiSlider.set([null, value]);
        self.addYear(value, 'till_year');
    });

    rd('app.tags.changed').subscribe(function () {
        self.updateYears();
    });

    rd('app.catalog.free').subscribe(function() {
        self.updateYears();
    });

    rd('app.catalog.adult').subscribe(function() {
        self.updateYears();
    });
};

Years.prototype = {
    createSlider: function () {
        var self = this;

        this.isSliderCreated = true;

        noUiSlider.create(self.years_slider, {
            start: [self.min, self.max],
            connect: true,
            step: 1,
            range: {
                'min': self.min,
                'max': self.max
            }
        });

        this.years_slider.noUiSlider.on('update', function (values, handle) {
            var value = parseInt(values[handle]);

            if (handle) {
                self.years_to.value = value;
            } else {
                self.years_from.value = value;
            }
        });

        this.years_slider.noUiSlider.on('change', function (values, handle) {
            var value = self.normalizeYear(parseInt(values[handle]), handle);

            self.years_slider.noUiSlider.set([!handle ? value : null, handle ? value : null]);
            self.addYear(value, handle ? 'till_year' : 'from_year');
        });
    },
    updateYears: function () {
        var self = this;

        var params = this.storage.get();

        rd('app.filter.loading.start').broadcast('years-list');

        api.catalog.listFilters({
            tags: params.tags,
            tags_or: params.tags_or,
            cats: params.cats,
            genre: params.genre
        }).then(function (resp) {
            if (resp && resp.status === 0) {
                var filter = resp.result,
                    yearsFiltered = [];

                for (var i = 0; i < filter.length; i++) {
                    var yearItem = (filter[i].mark_type__type == 'Year') ? filter[i].mark__name : null;

                    if (yearItem) {
                        yearsFiltered.push(parseInt(yearItem));
                    }
                }

                self.availableYears = yearsFiltered.sort();

                self.max = Math.max.apply(null, yearsFiltered);
                self.min = Math.min.apply(null, yearsFiltered);

                if (!self.isSliderCreated) {
                    self.createSlider();
                }

                self.outputExistYears();
            } else {
                console.log('Неверные параметры');
            }

            rd('app.filter.loading.end').broadcast('years-list');
        });
    },
    outputExistYears: function () {
        var self = this,
            storage = self.storage.get(),
            from_year = storage.from_year || null,
            till_year = storage.till_year || null;

        if (from_year != null && from_year < self.min) {
            self.addYear(self.min, 'from_year', false);

            self.years_slider.noUiSlider.set([self.min, null]);
        } else if (from_year == null) {
            self.years_slider.noUiSlider.set([self.min, null]);
        }

        if (till_year != null && till_year > self.max) {
            self.addYear(self.max, 'till_year', false);

            self.years_slider.noUiSlider.set([null, self.max]);
        } else if (till_year == null) {
            self.years_slider.noUiSlider.set([null, self.max]);
        }
    },
    normalizeYear: function (year, isTillYear) {
        var i, activeYears;

        if (year <= this.min && !isTillYear) {
            year = this.min;
        } else if (year >= this.max && isTillYear) {
            year = this.max;
        } else {
            activeYears = this.storage.get();

            if (!isTillYear) {
                if (activeYears.till_year != null && year >= activeYears.till_year) {
                    for (i = this.availableYears.length; i-- && this.availableYears[i] >= activeYears.till_year;) {
                    }
                } else {
                    for (i = 0; i < this.availableYears.length && this.availableYears[i] < year; i++) {
                    }
                }
            } else {
                if (activeYears.from_year != null && year <= activeYears.from_year) {
                    for (i = 0; i < this.availableYears.length && this.availableYears[i] <= activeYears.from_year; i++) {
                    }
                } else {
                    for (i = this.availableYears.length; i-- && this.availableYears[i] > year;) {
                    }
                }
            }

            year = this.availableYears[i];
        }

        return year;
    },
    addYear: function (year, type, needUpdate) {
        var self = this;
        var yearIn = document.getElementById(type),
            name,
            params = {},
            yearsBox = this.wrapper.querySelectorAll('.filters-list_selected__box')[1];

        needUpdate = needUpdate != null ? needUpdate : true;

        name = type === 'from_year' ? 'с ' + year + ' года' : 'по ' + year + ' год';

        if (yearIn) {
            yearIn.setAttribute('data-bind', year);
            yearIn.innerHTML = name;
        } else {
            var tagYear = document.createElement('a'),
                tagYearName;

            self.storage.del('client_ctx');

            tagYear.id = type;

            tagYearName = document.createTextNode(name);

            tagYear.setAttribute('data-bind', year);
            tagYear.setAttribute('class', 'tvz-tag tvz-tag-deleted filters-list_selected_item year');
            tagYear.setAttribute('href', 'javascript:void(0);');
            tagYear.addEventListener('click', function (e) {
                var target = e.target;
                utils.haltEvent(e);

                target.parentNode.removeChild(target);

                self.remove(target.id);
            });

            tagYear.appendChild(tagYearName);

            if (tagYear.id === 'from_year' && yearsBox.children.length > 0) {
                yearsBox.insertBefore(tagYear, yearsBox.children[0]);
            } else {
                yearsBox.appendChild(tagYear);
            }
        }

        params[type] = year;

        this.storage.set(params);

        if (needUpdate) {
            rd('app.catalog.reset').broadcast();
            rd('app.years.changed').broadcast();
        }
    },
    remove: function (id) {
        if (id === 'from_year') {
            this.storage.del('from_year');
            this.years_slider.noUiSlider.set([this.min, null]);
        } else if (id === 'till_year') {
            this.storage.del('till_year');
            this.years_slider.noUiSlider.set([null, this.max]);
        }

        rd('app.catalog.reset').broadcast();
        rd('app.years.changed').broadcast();
    },
    clear: function (e) {
        var yearsBox = this.wrapper.querySelectorAll('.filters-list_selected__box')[1];

        this.storage.del('till_year');
        this.storage.del('from_year');

        for (var i = yearsBox.children.length; i--;) {
            yearsBox.removeChild(yearsBox.children[i]);
        }

        this.years_slider.noUiSlider.set([this.min, null]);
        this.years_slider.noUiSlider.set([null, this.max]);

        rd('app.catalog.reset').broadcast();
    }
};

var Sort = function (wrapper, storage) {
    this.storage = storage;
    this.wrapper = wrapper;

    var params = this.storage.get();

    this.clientCtx = params.client_ctx;

    this.currentSort = this.wrapper.querySelector('.sorted').getAttribute('data-sort');
    this.isRev = false;

    this.wrapper.addEventListener('click', function (e) {
        var target = e.target,
            selectedSort,
            lastSort,
            params;

        e.stopPropagation();

        selectedSort = target.getAttribute('data-sort');

        if (!selectedSort) {
            target = target.parentNode;
            selectedSort = target.getAttribute('data-sort');
        }

        if (selectedSort) {
            lastSort = this.wrapper.querySelector('.sorted');

            lastSort.classList.remove('sorted');
            lastSort.classList.remove('sort-rev');


            if (selectedSort == 'dayview-random') {
                this.isRev = false;
                params = this.storage.get();
                if (!((params.tags && params.tags.length)|| (params.tags_or && params.tags_or.length) || params.from_year || params.till_year)) {
                    this.storage.set({client_ctx: this.clientCtx});//Дикий костыль из-за бекенда. Убрать.
                }
            } else {
                this.storage.del('client_ctx');

                if (selectedSort == this.currentSort) {
                    this.isRev = !this.isRev;
                } else {
                    this.isRev = false;
                }
            }

            this.storage.set({sort: selectedSort + (this.isRev ? '-rev' : '')});
            target.classList.add('sorted');

            if (this.isRev) {
                target.classList.add('sort-rev');
            } else {
                target.classList.remove('sort-rev');
            }

            this.currentSort = selectedSort;
            rd('app.catalog.reset').broadcast();
        }
        return false;
    }.bind(this));

    if (params.sort != null) {
        this.set(document.querySelector('[data-sort="' + params.sort + '"]'), false);
    }
};

Sort.prototype.set = function (el, update) {
    update = update != null ? update : true;
    this.storage.set({sort: el.getAttribute('data-sort')});

    this.wrapper.querySelector('a.sorted').classList.remove('sorted');
    el.classList.add('sorted');

    if (update) {
        rd('app.catalog.reset').broadcast();
    }
};

var Filter = function (storage) {
    this.storage = storage;

    var self = this,
        initParams = this.storage.get(),
        pathName = window.location.pathname,
        hasGenre = pathName.indexOf('genre'),
        genrePos = pathName.lastIndexOf('/'),
        genreId = pathName.slice((genrePos+1));

    this.loading = false;
    this.loadingTabs = {};

    this.wrapper = document.getElementById('filters-list_selected');
    this.hideBtn = document.getElementById('filters-list_hide');
    this.isMobileViewPort = document.querySelector('html').classList.contains('mobile');

    this.tags = new Tags(this.wrapper, storage);
    this.years = new Years(this.wrapper, storage);
    this.sort = new Sort(document.getElementById('wrapper-sort'), storage);

    var selectedList = document.getElementById('filters-list_selected');
    var tagsBoxes = this.wrapper.querySelectorAll('.filters-list_selected__box');

    this.tabContainers = document.querySelectorAll('.tvz-filter_content');
    this.tagsArrayShort = this.getShortArrayTags(this.tabContainers);

    this.isTagsSelectedHidden = true;
    this.tags.updateTags('all');
    this.years.updateYears();

    this.hideBtn.addEventListener('click', this.hideAllTabs.bind(this));

    this.clearBtn = document.getElementById('filters-list_clear');
    this.clearBtn.addEventListener('click', this.clear.bind(this));

    rd('app.catalog.reset').subscribe(function () {
        self.isTagsSelectedHidden = true;

        for (var i = tagsBoxes.length; i--;) {
            if (tagsBoxes[i].children.length > 0) {
                self.isTagsSelectedHidden = false;
            }
        }

        if (!self.isTagsSelectedHidden) {
            selectedList.classList.remove('tvz-hide');
        } else {
            selectedList.classList.add('tvz-hide');
        }
    });

    rd('app.filter.loading.start').subscribe(function (tabId) {
        var tabContainer = document.getElementById(tabId);

        if (tabContainer != null) {
            self.loadingTabs[tabId] = true;
            setTimeout(function() {
                self.showLoader();
            }, 1);
            tabContainer.classList.add('filter-block-updating');
        }
    });

    rd('app.filter.loading.end').subscribe(function (tabId) {
        var tabContainer = document.getElementById(tabId);

        if (tabContainer != null) {
            self.loadingTabs[tabId] = false;
            tabContainer.classList.remove('filter-block-updating');
        }
    });

    if(hasGenre !== -1 && genreId) {
        var genreItem = document.querySelector('[data-target="' + genreId + '"]'),
            genreName = genreItem.innerHTML;

        self.tags.include(genreId, genreName, 'genres-list', false);
        selectedList.classList.remove('tvz-hide');
        genreItem.classList.add('selected');
    }

    if (initParams.tags != null && initParams.tags.length > 0) {
        for (var index = 0; index < initParams.tags.length; index++) {
            var tagId = initParams.tags[index];
            var tagSelect = document.querySelector('[data-target="' + tagId + '"]');
            tagSelect.className += ' selected';
            var tagName = tagSelect.innerHTML;
            this.tags.include(tagId, tagName, this.currentTab, false);
        }
    }

    if (initParams.till_year) {
        this.years.addYear(initParams.till_year, 'till_year', false);
        this.years.years_slider.noUiSlider.set([null, initParams.till_year]);
    }

    if (initParams.from_year) {
        this.years.addYear(initParams.from_year, 'from_year', false);
        this.years.years_slider.noUiSlider.set([initParams.from_year, null]);
    }

    if ((initParams.tags != null && initParams.tags.length > 0)
        || initParams.till_year || initParams.from_year) {
        selectedList.classList.remove('tvz-hide');
    }

    this.tabContainers[0].addEventListener('click', this.toggleTag.bind(this));//genres
    this.tabContainers[2].addEventListener('click', this.toggleTag.bind(this));//countries

    var tab_buttons = document.getElementsByClassName('tvz-filter');

    for (var tabIndex = 0; tabIndex < tab_buttons.length; tabIndex++) {
        tab_buttons[tabIndex].addEventListener('click', this.toggleTab.bind(this));
    }

    window.addEventListener('scroll', function () {
        if (this.loadingTabs[this.currentTab] == true) {
            this.showLoader(this.currentTab);
        }
    }.bind(this));
};

Filter.prototype = {
    showLoader: function () {
        var screenHeight = document.body.clientHeight,
            blockHeight,
            currentScroll = document.body.scrollTop,
            fullContainerOffset = 0,
            loaderHeight = 48,
            checkingEl = this.activeTabContainer,
            offsetTop = 0;

        if (this.activeTabContainer) {
            blockHeight = this.activeTabContainer.clientHeight;

            if (this.isMobileViewPort) {

                if (blockHeight < loaderHeight * 3) {
                    offsetTop = Math.floor(blockHeight / 2);
                } else {
                    while (checkingEl != null) {
                        fullContainerOffset += checkingEl.offsetTop;
                        checkingEl = checkingEl.offsetParent;
                    }

                    offsetTop = screenHeight / 2 + currentScroll - fullContainerOffset;

                    if (offsetTop > blockHeight - loaderHeight) {
                        offsetTop = blockHeight - loaderHeight;
                    } else if (offsetTop < loaderHeight) {
                        offsetTop = loaderHeight;
                    }
                }

                this.activeLoader.style.top = offsetTop + 'px';
            }
        }
    },
    getShortArrayTags: function (tabContainers) {
        var tagsArrayShort = tabContainers;

        tagsArrayShort = Array.prototype.slice.call(tagsArrayShort, 0);

        for (var i = 0; i < tagsArrayShort.length; i++) {
            var id = tagsArrayShort[i].getAttribute('id');

            if (id === 'years-list') {
                tagsArrayShort.splice(i, 1);
            }
        }

        return tagsArrayShort;
    },
    hideAllTabs: function () {
        var tabContents = document.getElementsByClassName('tvz-filter_content'),
            tabSelects = document.getElementsByClassName('tvz-filter');

        for (var i = 0; i < tabContents.length; i++) {
            if (tabContents[i].classList.contains('tvz-hide') === false) {
                tabContents[i].classList.toggle('tvz-hide');
            }
        }
        for (var i = 0; i < tabSelects.length; i++) {
            if (tabSelects[i].classList.contains('tvz-filter-open') === true) {
                tabSelects[i].classList.toggle('tvz-filter-open');
            }
        }

        this.hideBtn.style.display = 'none';

        return false;
    },
    toggleTab: function (e) {
        var target = e.target,
            tabId = e.target.getAttribute('data-select'),
            tabEl = document.getElementById(tabId),
            closed = tabEl.classList.contains('tvz-hide');

        this.currentTab = tabId;
        this.activeTabContainer = tabEl;
        this.activeLoader = tabEl.querySelector('.tvz-loader');

        this.tags.currentTab = tabId;
        this.years.currentTab = tabId;

        this.hideAllTabs();

        if (closed) {
            tabEl.classList.toggle('tvz-hide');
            this.hideBtn.style.display = 'block';

            /*  Скролл к открытому блоку фильтрации и простановка класса селектам (мобильная версия и десктопная) */
            this.selectTab = document.querySelectorAll('[data-select="' + tabId + '"]');
            for (var i = 0; i < this.selectTab.length; i++) {
                this.selectTab[i].classList.add('tvz-filter-open');
            }

            var _top = $(target).offset().top;

            if (_top) {
                $('html, body').scrollTop(_top - (($('.navbar').css('position') == 'fixed') ? 95 : 10));
            }
        }
    },
    toggleTag: function (e) {
        var targetTagId = e.target.getAttribute('data-target');

        if (targetTagId != null) {
            if (e.target.classList.contains('tvz-disable')) {
                return;
            }

            e.target.classList.toggle('selected');

            if (e.target.classList.contains('selected')) {
                var targetTagName = e.target.innerHTML;
                this.tags.include(targetTagId, targetTagName, this.currentTab);
            } else {
                this.tags.remove(targetTagId);
            }
        }
    },
    clear: function () {
        var tagsBox = this.wrapper.querySelectorAll('.filters-list_selected__box')[0],
            yearsBox = this.wrapper.querySelectorAll('.filters-list_selected__box')[1],
            tagsOrBox = this.wrapper.querySelectorAll('.filters-list_selected__box')[2];

        for (var i = yearsBox.children.length; i--;) {
            yearsBox.removeChild(yearsBox.children[i]);
        }

        for (var i = tagsBox.children.length; i--;) {
            tagsBox.removeChild(tagsBox.children[i]);
        }

        for (var i = tagsOrBox.children.length; i--;) {
            tagsOrBox.removeChild(tagsOrBox.children[i]);
        }

        this.tags.clear();
        this.years.clear();

        this.tags.updateTags();
        this.years.updateYears();
    }
};

module.exports = Filter;