knockOutModel.collection = function(model) {
    var Collection = function(data) {
        Array.prototype.push.apply(this, []);

        this.observer = generateObserver(this);

        this.aggregate = function(joiner, fields) {
            var arr = [];

            if (!fields) {
                fields = [joiner];
                joiner = '';
            }

            this.each(function(k, model) {
                var parts = [];

                each(fields, function(kk, field) {
                    if (typeof model[field] === 'function') {
                        parts.push(model[field]());
                    }
                });

                arr.push(parts.join(joiner));
            });

            return arr;
        };

        this.at = function(index) {
            return typeof this[index] === 'undefined' ? false : this[index];
        };

        this.first = function() {
            return this.at(0);
        };

        this.last = function() {
            return this.at(this.length - 1);
        };

        this.has = function(index) {
            return typeof this[index] !== 'undefined';
        };

        this.remove = function(at) {
            at = typeof at === 'number' ? at : this.index(at);

            if (this.has(at)) {
                Array.prototype.splice.call(this, at, 1);

                this.observer.notifySubscribers();
            }

            return this;
        };

        this.empty = function() {
            Array.prototype.splice.call(this, 0, this.length);
            this.observer.notifySubscribers();

            return this;
        };

        this.prepend = function(item) {
            return this.insert(0, item);
        };

        this.append = function(item) {
            return this.insert(this.length, item);
        };

        this.insert = function(at, item) {
            item         = knockOutModel.isModel(item) ? item : new model(item);
            item.$parent = this.$parent;

            Array.prototype.splice.call(this, at, 0, item);
            this.observer.notifySubscribers();

            return this;
        };

        this.replace = function (at, item) {
            item         = knockOutModel.isModel(item) ? item : new model(item);
            item.$parent = this.$parent;

            Array.prototype.splice.call(this, at, 1, item);
            this.observer.notifySubscribers();

            return this;
        };

        this.index = function(item) {
            var index = -1;

            this.each(function(i, it) {
                if (it === item) {
                    index = i;
                    return;
                }
            });

            return index;
        };

        this.from = function(data) {
            var that = this;

            if (knockOutModel.isCollection(data)) {
                data = data.raw();
            }

            each(data, function(i, model) {
                if (that.has(i)) {
                    that.replace(i, model);
                } else {
                    that.replace(i, model);
                }
            });

            return this;
        };

        this.raw = function() {
            var out = [];

            this.each(function(i, v) {
                out.push(v.raw());
            });

            return out;
        };

        this.each = function(fn) {
            for (var i = 0; i < this.length; i++) {
                fn.call(this, i, this[i]);
            }
            return this;
        };

        this.find = function(query, limit, page) {
            var collection     = new this.$self.Model.Collection();
            collection.$parent = this.$parent;

            if (knockOutModel.isModel(query)) {
                query = query.raw();
            }

            if (typeof query === 'object') {
                query = (function(query) {
                    return function() {
                        var that = this,
                            ret  = true;

                        each(query, function(k, v) {
                            if (typeof that[k] === 'undefined' || that[k]() !== v) {
                                ret = false;
                                return false;
                            }
                        });

                        return ret;
                    };
                })(query);
            }

            this.each(function(i, model) {
                if (limit && page) {
                    var offset = (limit * page) - limit;

                    if (offset < i) {
                        return;
                    }
                }

                if (query.call(model, i)) {
                    collection.append(model);
                }

                if (limit && collection.length === limit) {
                    return false;
                }
            });

            return collection;
        };

        this.findOne = function(query) {
            return this.find(query, 1).first();
        };

        // alias deprecated methods
        this['export'] = this.raw;
        this['import'] = this.from;

        this.from(data);
    };

    Collection.Model = model;

    Collection.prototype = {
        $self: Collection
    };

    return Collection;
};