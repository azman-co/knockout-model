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

            return this;
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