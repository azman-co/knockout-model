!function(factory) {
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        factory(require('knockout'), module.exports || exports);
    } else if (typeof define === 'function' && define.amd) {
        define(['knockout', 'exports'], factory);
    } else {
        factory(ko, window.knockOutModel = {});
    }
}(function(ko, knockOutModel) {

if (typeof ko === 'undefined') {
    throw 'KnockoutJS is required. Download at https://github.com/SteveSanderson/knockout.';
}

knockOutModel.bindings = {
    model: function(element, value) {
        if (this.attr(element, 'view')) {
            return;
        }

        ko.applyBindings(this.get(value), element);
    }
};
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
var globals = {};

knockOutModel.set = function(name, value) {
    globals[name] = value;

    return this;
};

knockOutModel.get = function(name) {
    return this.has(name) ? globals[name] : null;
};

knockOutModel.has = function(name) {
    return typeof globals[name] !== 'undefined';
};

knockOutModel.remove = function(name) {
    if (this.has(name)) {
        delete globals[name];
    }

    return this;
};

knockOutModel.reset = function() {
    globals = {};
    return this;
};
knockOutModel.Event = function() {
    this.stack = [];
    return this;
};

knockOutModel.Event.prototype = {
    bind: function(cb) {
        this.stack.push(cb);
        return this;
    },

    unbind: function(cb) {
        if (cb) {
            var stack = [];

            for (var i in this.stack) {
                if (this.stack[i] !== cb) {
                    stack.push(this.stack[i]);
                }
            }

            this.stack = stack;
        } else {
            this.stack = [];
        }

        return this;
    },

    trigger: function(args) {
        for (var i in this.stack) {
            if (this.stack[i].apply(this, args) === false) {
                return false;
            }
        }
    }
};
knockOutModel.Events = function() {
    this.events = {};
    return this;
};

knockOutModel.Events.prototype = {
    on: function(name, handler) {
        if (typeof this.events[name] === 'undefined') {
            this.events[name] = new knockOutModel.Event();
        }

        this.events[name].bind(handler);

        return this;
    },

    off: function(name, handler) {
        if (!name) {
            this.events = {};
            return this;
        }

        if (typeof this.events[name] !== 'undefined') {
            this.events[name].unbind(handler);
        }

        return this;
    },

    trigger: function(name, args) {
        if (typeof this.events[name] !== 'undefined') {
            if (this.events[name].trigger(args) === false) {
                return false;
            }
        }
    }
};
function fnCompare(fn, str) {
    if (!fn) {
        return false;
    }

    if (typeof fn === 'object' && fn.constructor) {
        fn = fn.constructor;
    }

    if (typeof fn === 'function') {
        fn = fn.toString();
    }

    return fn === str;
}

function each(items, fn) {
    items = items || [];

    if (typeof items === 'string') {
        items = [items];
    }

    if (typeof items.length === 'number') {
        for (var i = 0; i < items.length; i++) {
            if (fn(i, items[i]) === false) {
                return;
            }
        }
    } else {
        for (var x in items) {
            if (fn(x, items[x]) === false) {
                return;
            }
        }
    }
}

function generateObserver(obj) {
    return ko.computed({
        read: function() {
            return obj;
        },
        write: function(value) {
            obj.from(value);
        },
        owner: obj
    });
}
knockOutModel.element = document;

knockOutModel.run = function(element) {
    element = element || this.element;

    if (typeof element === 'function') {
        element = element();
    }

    if (typeof element === 'string') {
        element = document.getElementById(element);
    }

    if (element !== document) {
        knockOutModel.bindOne(element);
    }

    knockOutModel.bindDescendants(element);
};

knockOutModel.bindOne = function(element) {
    var self = this;

    each(element.attributes, function(i, node) {
        if (node.name.indexOf(self.prefix) === 0) {
            var name = node.name.substring(self.prefix.length);

            if (typeof self.bindings[name] === 'function') {
                self.bindings[name].call(self, element, node.value);
            }
        }
    });
};

knockOutModel.bindDescendants = function(element) {
    each(element.childNodes, function(i, el) {
        knockOutModel.run(el);
    });
};

knockOutModel.attr = function(element, attribute, value) {
    attribute = knockOutModel.prefix + attribute;

    if (typeof value === 'undefined') {
        if (element.getAttribute) {
            return element.getAttribute(attribute);
        }

        return typeof element[attribute] === 'undefined' ? null : element[attribute];
    }

    if (!value) {
        if (element.removeAttribute) {
            element.removeAttribute(attribute);
        } else if (typeof element[attribute] !== 'undefined') {
            delete element[attribute];
        }

        return this;
    }

    if (element.setAttribute) {
        element.setAttribute(attribute, value);
    } else {
        element[attribute] = value;
    }

    return this;
};

knockOutModel.outerHtml = function(element) {
    var div = document.createElement('div');
    div.appendChild(element);
    return div.innerHTML;
};

knockOutModel.throwForElement = function(element, message) {
    throw message + "\n" + knockOutModel.outerHtml(element);
};

knockOutModel.isReader = function(name) {
    return name.indexOf('read') === 0;
};

knockOutModel.isWriter = function(name) {
    return name.indexOf('write') === 0;
};

knockOutModel.toReader = function(name) {
    return 'read' + name.substring(0, 1).toUpperCase() + name.substring(1);
};

knockOutModel.toWriter = function(name) {
    return 'write' + name.substring(0, 1).toUpperCase() + name.substring(1);
};

knockOutModel.fromReader = function(name) {
    return name.substring(4, 5).toLowerCase() + name.substring(5);
};

knockOutModel.fromWriter = function(name) {
    return name.substring(5, 6).toLowerCase() + name.substring(6);
};

knockOutModel.isModel = function(fn) {
    return fnCompare(fn, knockOutModel.model().toString());
};

knockOutModel.isCollection = function(fn) {
    return fnCompare(fn, knockOutModel.collection().toString());
};
knockOutModel.model = function(definition) {
    var Model = function(data) {
        var that = this;

        this.clone = function() {
            var clone     = new Model(this.raw());
            clone.$parent = this.$parent;
            return clone;
        };

        this.from = function(obj) {
            if (knockOutModel.isModel(obj)) {
                var data = obj.raw();

                each(obj.$self.computed, function(name) {
                    delete data[name];
                });

                obj = data;
            }

            each(obj, function(name, value) {
                if (typeof that[name] === 'function') {
                    that[name](value);
                }
            });

            this.observer.notifySubscribers();

            if (obj != null) {
                this.afterPopulate();
            }

            return this;
        };

        this.afterPopulate = function(){

        };

        this.raw = function() {
            var out = {};

            each(that.$self.properties, function(i, v) {
                out[i] = that[i]();
            });

            each(that.$self.computed, function(i, v) {
                out[i] = that[i]();
            });

            each(that.$self.relations, function(i, v) {
                out[i] = that[i]().raw();
            });

            return out;
        };

        this.hasSameValue = function() {

        };

        this.reset = function() {
            each(that.$self.properties, function(i, v) {
                that[i](v);
            });

            each(that.$self.relations, function(i, v) {
                if (knockOutModel.isCollection(v)) {
                    that[i]().empty();
                } else {
                    that[i]().reset();
                }
            });

            return this;
        };

        // alias deprecated methods
        this['export'] = this.raw;
        this['import'] = this.from;

        define(this);
        this.from(data);

        if (typeof this.init === 'function') {
            this.init();
        }
    };

    Model.Collection      = knockOutModel.collection(Model);
    Model.computed        = {};
    Model.methods         = {};
    Model.properties      = {};
    Model.relations       = {};
    Model.prototype.$self = Model;

    Model.extend = function(OtherModel) {
        OtherModel = knockOutModel.isModel(OtherModel) ? OtherModel : knockOutModel.model(OtherModel);

        each(Model.computed, function(i, v) {
            if (typeof OtherModel.computed[i] === 'undefined') {
                OtherModel.computed[i] = v;
            }
        });

        each(Model.methods, function(i, v) {
            if (typeof OtherModel.methods[i] === 'undefined') {
                OtherModel.methods[i] = v;
            }
        });

        each(Model.properties, function(i, v) {
            if (typeof OtherModel.properties[i] === 'undefined') {
                OtherModel.properties[i] = v;
            }
        });

        each(Model.relations, function(i, v) {
            if (typeof OtherModel.relations[i] === 'undefined') {
                OtherModel.relations[i] = v;
            }
        });

        return OtherModel;
    };

    Model.inherit = function(OtherModel) {
        return OtherModel.extend(Model);
    };

    interpretDefinition(Model, definition);

    return Model;
};

function interpretDefinition(Model, definition) {
    each(definition, function(i, v) {
        if (knockOutModel.isModel(v) || knockOutModel.isCollection(v)) {
            Model.relations[i] = v;
            return;
        }

        if (typeof v === 'function') {
            var name, type;

            if (knockOutModel.isReader(i)) {
                name = knockOutModel.fromReader(i);
                type = 'read';
            } else if (knockOutModel.isWriter(i)) {
                name = knockOutModel.fromWriter(i);
                type = 'write';
            }

            if (type) {
                if (typeof Model.computed[name] === 'undefined') {
                    Model.computed[name] = {};
                }

                Model.computed[name][type] = v;
                return;
            }

            Model.methods[i] = v;
            return;
        }

        Model.properties[i] = v;
    });
}

function define(obj) {
    obj.observer = generateObserver(obj);

    defineComputed(obj);
    defineMethods(obj);
    defineProperties(obj);
    defineRelations(obj);
}

function defineComputed(obj) {
    each(obj.$self.computed, function(name, computed) {
        obj[name] = ko.computed({
            owner: obj,
            deferEvaluation: true,
            read: computed.read || function(){},
            write: computed.write || function(){}
        });
    });
}

function defineMethods(obj) {
    each(obj.$self.methods, function(name, method) {
        obj[name] = function() {
            return method.apply(obj, arguments);
        };
    });
}

function defineProperties(obj) {
    each(obj.$self.properties, function(name, property) {
        if (Object.prototype.toString.call(property) === '[object Array]') {
            obj[name] = ko.observableArray(property);
        } else {
            obj[name] = ko.observable(property);
        }
    });
}

function defineRelations(obj) {
    each(obj.$self.relations, function(name, relation) {
        var instance     = new relation();
        obj[name]        = instance.observer;
        instance.$parent = obj;
    });
}

});
