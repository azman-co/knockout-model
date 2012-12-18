// Knockup, MVC for Knockout, v0.1.0
// Copyright (c) Trey Shugart http://iamtres.com
// License: MIT http://www.opensource.org/licenses/mit-license.php
!function(factory) {
    // Common / Node
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        factory(require('knockout'), module['exports'] || exports);
    // AMD
    } else if (typeof define === 'function' && define.amd) {
        define(['knockout', 'exports'], factory);
    // Global
    } else {
        factory(ko, window.ku = {});
    }
}(function(ko, ku) {
    // Require KnockoutJS.
    if (typeof ko === 'undefined') {
        throw 'KnockoutJS is required. Download at https://github.com/SteveSanderson/knockout.';
    }



    // Model
    // -----

    // Creates a knockup model.
    ku.model = function(define) {
        var model = function(data) {
            var computed   = {},
                properties = {},
                relations  = {},
                methods    = {},
                self       = this;

            // The observer is what is returned when the object is accessed.
            this.observer = generateObserver.call(this);
            
            // Defers the call to the specified function in the current context.
            this.proxy = function(fn) {
                if (typeof fn === 'string') {
                    fn = self[fn];
                }
                
                if (!fn) {
                    return function() {};
                }
                
                var args = Array.prototype.slice.call(arguments, 1);
                
                return function() {
                    return fn.apply(self, args);
                }
            };

            // Fills the model with the specified values.
            this.import = function(obj) {
                if (ku.isModel(obj)) {
                    obj = obj.export();
                }

                // Update each value.
                each(obj, function(name, value) {
                    if (typeof self[name] === 'function') {
                        self[name](value);
                    }
                });

                // Tell everyone.
                this.observer.notifySubscribers();

                return this;
            };

            // Returns a raw object of the model.
            this.export = function() {
                var out = {}

                each(properties, function(i, v) {
                    out[i] = self[i]();
                });

                each(computed, function(i, v) {
                    out[i] = self[i]();
                });

                each(relations, function(i, v) {
                    out[i] = self[i]().export();
                });

                return out;
            };

            // Clones the object.
            this.clone = function() {
                var clone = new model(this.export());
                clone.$parent = this.$parent;
                return clone;
            };

            // Reset the model back to defaults.
            this.reset = function() {
                each(properties, function(i, v) {
                    self[i](v);
                });
                return this;
            };

            // Applies the model to the specified root element using Knockout.
            this.knockup = function(to) {
                ko.applyBindings(this, to);
                return this;
            };

            // Define the object structure.
            each(define, function(i, v) {
                if (ku.isModel(v) || ku.isCollection(v)) {
                    // Create the new model.
                    var obj = new v;

                    // Set the property to the model observer.
                    self[i] = obj.observer;

                    // The model / collection should have a parent.
                    obj.$parent = self;

                    // Mark it as a relation.
                    relations[i] = v;

                    // Continue iteration.
                    return;
                }

                // Handle functions, both get*, set* and normal.
                if (typeof v === 'function') {
                    var name, type;

                    if (ku.isReader(i)) {
                        name = ku.fromReader(i);
                        type = 'read';
                    } else if (ku.isWriter(i)) {
                        name = ku.fromWriter(i);
                        type = 'write';
                    }

                    // If a "get" or "set" prefix was found, it is a computed observable.
                    if (type) {
                        // We make sure that an object is registered so
                        // that future getters or setters can be applied
                        // to it.
                        if (typeof computed[name] === 'undefined') {
                            computed[name] = {};
                        }

                        // Apply the function to the computed observer.
                        computed[name][type] = v;

                        return;
                    }

                    // Normal functions have to be wrapped in a function
                    // that will apply the current context to it and pass
                    // along the arguments.
                    self[i] = function() {
                        return v.apply(self, arguments);
                    };

                    // Mark as a method.
                    methods[i] = v;

                    return;
                }

                // Make observable.
                self[i] = ko.observable(v);

                // Mark as property.
                properties[i] = v;
            });

            // Apply computed properties.
            each(computed, function(name, computed) {
                // Automatically apply the current model.
                computed.owner = self;

                // If evaluation is not deferred, then some properties
                // accessed within the observer may not be available.
                computed.deferEvaluation = true;

                // Apply the computed observer.
                self[name] = ko.computed(computed);
            });

            // Fill with instance values.
            this.import(data);

            // Initialize if given an initializer.
            if (typeof this.init === 'function') {
                this.init();
            }
        };

        // The set constuctor for the current model.
        model.collection = ku.collection(model);

        // Save the model definition.
        model.definition = define;

        // So static members can be accessed from an instance.
        model.prototype.$static = model;

        // Ability to extend another model's definition.
        model.extend = function(otherModel) {
            otherModel = ku.isModel(otherModel) ? otherModel : ku.model(otherModel);
            each(define, function(i, v) {
                if (typeof otherModel.definition[i] === 'undefined') {
                    otherModel.definition[i] = v;
                }
            });
            return otherModel;
        };

        // Ability to inherit another model's definition.
        model.inherit = function(otherModel) {
            otherModel = ku.isModel(otherModel) ? otherModel : ku.model(otherModel);
            each(otherModel.definition, function(i, v) {
                define[i] = v;
            });
            return model;
        };
        
        // Ability to statically bind.
        model.knockup = function(to) {
            return new model().knockup(to);
        };

        return model;
    };



    // Collection
    // ----------

    // Contains a set of models and can be used like an array.
    ku.collection = function(model) {
        var collection = function(data) {
            Array.prototype.push.apply(this, []);

            // The observer is what is returned when the object is accessed.
            this.observer = generateObserver.call(this);
            
            // Returns an array values for the specified model property.
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

            // Returns the item at the specified index.
            this.at = function(index) {
                return typeof this[index] === 'undefined' ? false : this[index];
            };

            // Returns the first item.
            this.first = function() {
                return this.at(0);
            };

            // Returns the last item.
            this.last = function() {
                return this.at(this.length - 1);
            };

            // Returns whether or not an item exists at the specified index.
            this.has = function(index) {
                return typeof this[index] !== 'undefined';
            };

            // Removes the item at the specified index.
            this.remove = function(at) {
                var at = typeof at === 'number' ? at : this.index(at);

                // Only attempt to remove if it exists.
                if (this.has(at)) {
                    // Remove the item.
                    Array.prototype.splice.call(this, at, 1);

                    // Notify subscribers.
                    this.observer.notifySubscribers();
                }

                return this;
            };

            // Clears all the models in the collection and notifies listeners.
            this.empty = function() {
                Array.prototype.splice.call(this, 0, this.length);
                this.observer.notifySubscribers();
                
                return this;
            }

            // Prepends the specified model.
            this.prepend = function(item) {
                return this.insert(0, item);
            };

            // Appends the specified model.
            this.append = function(item) {
                return this.insert(this.length, item);
            };

            // Inserts the model at the specified index.
            this.insert = function(at, item) {
                // Ensure instance of specified model.
                item = ku.isModel(item) ? item : new model(item);

                // Notify the model about its parent context.
                item.$parent = this.$parent;

                // Insert it into the collection.
                Array.prototype.splice.call(this, at, 0, item);

                // Notify anyone who cares about the update.
                this.observer.notifySubscribers();

                return this;
            };

            // Returns the index of the specified item.
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

            // Fills the set with the specified data.
            this.import = function(data) {
                var self = this;

                if (ku.isCollection(data)) {
                    data = data.export();
                }

                each(data, function(i, model) {
                    self.append(model);
                });

                return this;
            };

            this.export = function() {
                var out = [];

                this.each(function(i, v) {
                    out.push(v.export());
                });

                return out;
            };

            // Executes the callback for each item in the set.
            this.each = function(fn) {
                for (var i = 0; i < this.length; i++) {
                    fn.call(this, i, this[i]);
                }
                return this;
            };

            // Finds several items in the set.
            this.find = function(query, limit, page) {
                var collection = new this.$static.model.collection;

                // Ensure proper object hierarchy.
                collection.$parent = this.$parent;

                // If a model is passed, convert to raw values.
                if (ku.isModel(query)) {
                    query = query.export();
                }

                // If an object is passed, create a query for it.
                if (typeof query === 'object') {
                    query = (function(query) {
                        return function() {
                            var self = this,
                                ret  = true;

                            each(query, function(k, v) {
                                if (typeof self[k] === 'undefined' || self[k]() !== v) {
                                    ret = false;
                                    return false;
                                }
                            });

                            return ret;
                        }
                    })(query);
                }

                // Query each item.
                this.each(function(i, model) {
                    // If limiting and pagin, make sure we are at the proper offset.
                    if (limit && page) {
                        var offset = (limit * page) - limit;
                        
                        if (offset < i) {
                            return;
                        }
                    }
                    
                    // Append the item to the new collection.
                    if (query.call(model, i)) {
                        collection.append(model);
                    }

                    // If the limit has been reached, break;
                    if (limit && collection.length === limit) {
                        return false;
                    }
                });

                // We return collections so that object hierarchy is maintained and methods can continue to be called.
                return collection;
            };

            // Finds one item in the set.
            this.findOne = function(query) {
                return this.find(query, 1).first();
            };

            // Fill with the initial data.
            this.import(data);
        };

        // Model constructor.
        collection.model = model;

        // Instance members.
        collection.prototype = {
            $static: collection
        };

        return collection;
    };

    // Returns whether or not the member is a reader.
    ku.isReader = function(name) {
        return name.indexOf('read') === 0;
    };

    // Returns whether or not the member is a writer.
    ku.isWriter = function(name) {
        return name.indexOf('write') === 0;
    };

    // Transforms the name to a reader name.
    ku.toReader = function(name) {
        return 'read' + name.substring(0, 1).toUpperCase() + name.substring(1);
    }

    // Transforms the name to a writer name.
    ku.toWriter = function(name) {
        return 'write' + name.substring(0, 1).toUpperCase() + name.substring(1);
    }

    // Transforms the name from a reader name.
    ku.fromReader = function(name) {
        return name.substring(4, 5).toLowerCase() + name.substring(5);
    };

    // Transforms the name from a writer name.
    ku.fromWriter = function(name) {
        return name.substring(5, 6).toLowerCase() + name.substring(6);
    };

    // Returns whether or not the speicfied function is a model constructor.
    var modelString = ku.model().toString();
    ku.isModel = function(fn) {
        return fnCompare(fn, modelString);
    };

    // Returns whether or not the speicfied function is a collection constructor.
    var collectionString = ku.collection().toString();
    ku.isCollection = function(fn) {
        return fnCompare(fn, collectionString);
    };

    // Compares the passed in function to the definition string.
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

    // Iterates over an array or hash.
    function each(items, fn) {
        var items = items || [];

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
            for (var i in items) {
                if (fn(i, items[i]) === false) {
                    return;
                }
            }
        }
    };
    
    // Generates an observer for the applied context.
    function generateObserver() {
        return ko.computed({
            read: function() {
                return this;
            },
            write: function(value) {
                this.import(value);
            },
            owner: this
        });
    }



    // Events
    // ------
    // 
    // The `Events` component is used to manage a collection of different `Event` objects.
    ku.Events = function() {
        return this;
    };

    ku.Events.prototype = {
        events: {},

        on: function(name, handler) {
            if (typeof this.events[name] === 'undefined') {
                this.events[name] = new ku.Event;
            }

            this.events[name].bind(handler);

            return this;
        },

        off: function(name, handler) {
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

    // Event
    // -----
    // 
    // The event component is used internally, however, you can also use this to create event stacks that you can bind and unbind events to.

    // ### Usage
    // 
    // Event stacks are meant to be applied as a property to an object rather than triggered by passing a string telling which event you want to bind.
    // 
    //     var myObj       = {};
    //     myObj.triggered = false;
    //     myObj.myEvent   = new ku.Event;
    //     
    //     myObj.myEvent.bind(function() {
    //         this.triggered = true;
    //     });
    //     
    //     ok(myObj.triggered, 'Event was not triggered.');
    ku.Event = function() {
        return this;
    };

    ku.Event.prototype = {
        stack: [],

        // You bind callbacks to the event object.
        // 
        //     event.bind(myCallback);
        bind: function(cb) {
            this.stack.push(cb);
            return this;
        },

        // You can either unbind the whole stack by passing no arguments, or unbind a specific callback.
        // 
        //     event.unbind();
        //     event.unbind(myCallback);
        unbind: function(cb) {
            if (cb) {
                var stack = [];

                for (var i in this.stack) {
                    if (!this.stack[i] === cb) {
                        stack.push(this.stack[i]);
                    }
                }

                this.stack = stack;
            } else {
                this.stack = [];
            }

            return this;
        },

        // Triggering is as simple as calling a method.
        // 
        //     event.trigger();
        trigger: function(args) {
            for (var i in this.stack) {
                if (this.stack[i].apply(this, args) === false) {
                    return false;
                }
            }
        }
    };



    // Router
    // ------

    // ### Internal Variables

    // `Array` Contains router instances that are to be dispatched when a popstate or hashchange event is fired.
    var bound = [];

    // ### Constructor
    // 
    // The main router that is responsible for routing hash changes.
    ku.Router = function() {
        this.events = new ku.Events(this);
        this.state  = new ku.State;
        this.view   = new ku.View;
        
        // The router contains a DI object that is used to apply to the `action` so you can access these objects by using `this`.
        this.di = {
            http: new ku.Http,
            router: this
        };

        return this;
    };

    ku.Router.prototype = {
        // ### Instance Properties

        // #### route
        // 
        // `Boolean` `Route` The current route. False if none.
        route: false,

        // #### routes
        // 
        // `Array` The collection of routes applied to the router.
        routes: {},

        // ### Instance Methods

        // #### bind
        // 
        // `Router` Binds the URL change monitor.
        bind: function() {
            // add it to the dispatch stack
            bound.push(this);

            // if pop state is not supported or not enabled, we have to initialize a hash change to mimic pop state
            if (!('onpopstate' in window) || (!this.state.enabled || ($this.state.enabled && !window.location.hash))) {
                this.dispatch();
            }

            return this;
        },

        // #### unbind
        // 
        // `Router` Unbinds the URL change monitor.
        unbind: function() {
            for (var i = 0; i < bound.length; i++) {
                if (this === bound[i]) {
                    delete bound[i];
                }
            }

            return this;
        },

        // #### set
        // 
        // `Router` Shortcut for creating and applying a `Route` instance.
        // 
        // 1. `String name` The name of the `Route`.
        // 2. `Object|Function options` The callback or options to pass to the `Route`.
        set: function(name, options) {
            // Allow a function to be passed (action) instead of options.
            if (typeof options === 'function') {
                options = {
                    match: new RegExp('^' + name + '$'),
                    format: name,
                    action: options
                };
            }

            // If no view is specified it defaults to the route name.
            if (!options.view) {
                options.view = name;
            }

            // Allow a route to be passed in, a method, or a list of options.
            this.routes[name] = options instanceof ku.Route ? options : new ku.Route(options);

            return this;
        },

        // #### get
        // 
        // `Route` Returns the specified route.
        // 
        // 1. `String name` The route name.
        // 
        // Throws an exception if the route does not exist.
        get: function(name) {
            if (this.has(name)) {
                return this.routes[name];
            }

            throw 'Route "' + name + '" does not exist.';
        },

        // #### has
        // 
        // `Boolean` Returns whether or not the specified route exists.
        // 
        // 1. `String name` The name of the route.
        has: function(name) {
            return typeof this.routes[name] !== 'undefined';
        },

        // #### remove
        // 
        // `Router` Removes the specified route.
        // 
        // 1. `String name` The name of the route.
        remove: function(name) {
            if (this.has(name)) {
                delete this.routes[name];
            }

            return this;
        },

        // #### dispatch
        // 
        // `Router` Dispatches the call.
        // 
        // 1. `String request` The request to dispatch. If not specified, it defaults to the current state.
        dispatch: function(request) {
            // If no request is specified, default to the current state.
            if (typeof request === 'undefined') {
                request = this.state.get();
            }

            // Go through each route and attempt to action it if it matches. If it does not match continue to the next
            // one. If it does, action and return.
            for (var i in this.routes) {
                var route  = this.routes[i],
                    params = route.query(request);

                // If a route is matched, it returns an array of matched parameters, otherwise it returns false.
                if (typeof params.length === 'number') {
                    if (this.events.trigger('exit', [this]) === false) {
                        return this;
                    }

                    if (this.route && this.events.trigger('exit.' + i, [this, this.route]) === false) {
                        return this;
                    }

                    if (this.events.trigger('enter', [this]) === false) {
                        return this;
                    }

                    if (this.events.trigger('enter.' + i, [this, route]) === false) {
                        return this;
                    }

                    // Action the new route.
                    var model = route.action.apply(this.di, params);

                    // Ensure the return value is a model.
                    if (model && model.constructor === Object) {
                        model = new (ku.model(model));
                    }

                    // If false is returned, then that means we don't render the view.
                    if (model !== false) {
                        this.view.render(route.view, model);
                    }

                    // Apply the new route.
                    this.route = route;

                    // Set the new state.
                    this.state.previous = request;

                    // Stop routing since a route was matched.
                    return this;
                }
            }

            // If we got here, then no route was matched.
            this.route = false;

            return this;
        },

        // #### go
        // 
        // `Router` Shortcut for calling go on the specified route.
        // 
        // 1. `String name` The name of the route to go to.
        // 2. `Object params` The parameters to use.
        // 3. `mixed data` The data to apply to the state, if any.
        go: function(name, params, data) {
            this.state.push(this.get(name).generate(params), data);
            return this;
        },

        // #### generate
        // 
        // `Router` Shortcut for generating a URL from a route.
        // 
        // 1. `String name` The name of the route to go to.
        // 2. `Object params` The parameters to use.
        generate: function(name, params) {
            return this.get(name).generate(params);
        }
    };



    // Route
    // -----

    // ### Route
    // 
    // Instantiates the route.
    // 
    // 1. `Object options` The route options to use.
    ku.Route = function(options) {
        for (var i in options) {
            this[i] = options[i];
        }

        return this;
    };

    ku.Route.prototype = {
        // ### Instance Properties

        // #### match
        // 
        // `RegExp` The regex to match against the request.
        match: /.*/,

        // #### format
        // 
        // `String` The string to use for format engineering the route.
        format: '',

        // #### view
        // 
        // `String` The name of the view associated to the route.
        view: false,

        // ### Instance Methods

        // #### action
        // 
        // Callback to action the route - i.e. a controller.        
        action: function(){},

        // #### query
        // 
        // `Object` `Boolean` Returns whether or not the specified request matches the set route.
        // 
        // 1. `String request` The request to match.
        query: function(request) {
            // simple string match, or regex if specified
            var params = request.match(this.match);

            // if no parameters are matched, it returns null, but we should return false
            if (params === null) {
                return false;
            }

            // remove the matched portion
            params.shift();

            // return the parameter object
            return params;
        },

        // #### generate
        // 
        // `String` Reverse engineers the route into a hash fragment without the preceding hash mark.
        // 
        // 1. `Object params` The named parameters to format engineer the route with.
        generate: function(params) {
            var format = this.format;

            for (var name in params) {
                format = format.replace(new RegExp('\:' + name, 'g'), params[name]);
            }

            return format;
        }
    };



    // State
    // -----

    // The state object is used for managing state between URL changes in a cross-browser manner dependent on the
    // capabilities that are detected.

    // ### Internal Variables

    // `String` The old state. Only used if having to fall back to setInterval for hash checking. This is initialized
    // to mimic onhashchange behavior in that it is only fired if it changes, not if the page is loaded with it.
    var oldState = window.location.hash;

    // `Object` The interval reference if using an interval to monitor the hash.
    var interval;

    // `Boolean` Whether or not state listening has started.
    var isStarted = false;

    // ### Constructor
    // 
    // Initializes events and state properties.
    ku.State = function() {
        ku.State.start();
        return this;
    };

    // ### Static Properties

    // #### interval
    // 
    // `Number` The interval at which to check for hash updates if using a crappy browser.
    ku.State.interval = 500;

    // ### Static Methods

    // #### start
    // 
    // `State` Starts state listening. Only allows a single binding.
    ku.State.start = function() {
        if (isStarted) {
            return ku.State;
        }

        // Internet Explorer lies about supporting the hashchange event in 6 and 7 in compatibility mode.
        var isIeLyingAboutHashChange = 'onhashchange' in window && /MSIE\s(6|7)/.test(navigator.userAgent);

        if ('onpopstate' in window) {
            bind('popstate');
        } else if ('onhashchange' in window && !isIeLyingAboutHashChange) {
            bind('hashchange');
        } else {
            bind('hashchange');
            interval = setInterval(function() {
                if (oldState !== window.location.hash) {
                    oldState = window.location.hash;
                    trigger('hashchange');
                }
            }, ku.State.interval);
        }

        isStarted = true;

        return ku.State;
    };

    // #### stop
    // 
    // `State` Stops state listening.
    ku.State.stop = function() {
        if (interval) {
            clearInterval(interval);
        }

        var e = 'onpopstate' in window ? 'popstate' : 'hashchange';
        if (window.removeEventListener) {
            window.removeEventListener(e, dispatch);
        } else if (window[e]) {
            delete window[e];
        }

        isStarted = false;

        return State;
    }

    ku.State.prototype = {
        // ### Instance Properties

        // #### states
        // 
        // `Object` Contains state data.
        states: {},

        // #### previous
        // 
        // `String | Boolean` The previous state. False if none.
        previous: false,

        // #### enabled
        // 
        // `Boolean` Whether or not native state support is enabled.
        enabled: false,

        // #### scroll
        // 
        // `Boolean` Whether or not to let the page scroll if the hash is changed.
        scroll: false,

        // ### Instance Methods

        // #### get()
        // 
        // `String` Returns the current state as a string.
        get: function() {
            if (this.enabled && window.history.pushState) {
                return removeHostPart(window.location.href);
            }
            return window.location.hash.substring(1);
        },

        // #### push
        // 
        // `State` Pushes the current state if it is supported, or changes the hash if not.
        // 
        // 1. `String uri` The URI to use for the new state.
        // 2. `mixed data` The data to attach to the new state.
        // 3. `String description` The description of the new state.
        push: function(uri, data, description) {
            if (this.enabled && window.history.pushState) {
                window.history.pushState(data, description, uri || '.');
                dispatch();
            } else {
                updateHash(uri, this.scroll);
            }

            // create a new state event
            this.states[uri] = data;

            return this;
        },

        // #### data
        // 
        // `mixed` Returns the data is applied for the given state.
        // 
        // 1. `String state` The state to get the data for.
        data: function(state) {
            var state = state || this.get();
            if (typeof this.states[state] === 'undefined') {
                return null;
            }
            return this.states[state];
        }
    };

    // Internal Functions
    // ------------------

    // ### removeHostPart
    // 
    // `String` Removes the host part from the specified href.
    // 
    // 1. `String href` The href to format.
    function removeHostPart(href) {
        return href.replace(/http(s)?\:\/\/[^\/]+/, '');
    }

    // ### bind
    // 
    // `void` Binds the specified event based on browser capabilities.
    // 
    // 1. `String e` The event name/type.
    function bind(e) {
        // modern browsers else IE
        if (window.addEventListener) {
            window.addEventListener(e, dispatch, false);
        } else {
            window['on' + e] = dispatch;
        }
    }

    // ### trigger
    // 
    // `void` Triggers the specified event based on browser capabilities.
    // 
    // 1. `String e` The event name/type.
    function trigger(e) {
        // again, modern browsers else IE
        if (document.createEvent) {
            event = document.createEvent('HTMLEvents');
            event.initEvent(e, true, true);
            window.dispatchEvent(event);
        } else {
            window['on' + e](document.createEventObject());
        }
    }

    // ### updateHash
    // 
    // 'void' Updates the hash directly and prevents scrolling if scroll is true.
    // 
    // 1. `String uri` The URI to set.
    // 2. `Boolean scroll` Whether or not to scroll.
    function updateHash(uri, scroll) {
        // make the browser think it's scrolling to the correct element
        if (!scroll) {
            var id    = uri.replace(/^#/, '');
            var node  = document.getElementById(id);
            var x     = window.pageXOffset ? window.pageXOffset : document.body.scrollLeft;
            var y     = window.pageYOffset ? window.pageYOffset : document.body.scrollTop;
            var dummy = document.createElement('div');

            // only set the id if the node exists
            if (node) {
                node.id = '';
            }

            // set dummy values
            dummy.id             = id || '_';
            dummy.style.position = 'absolute';
            dummy.style.width    = 0;
            dummy.style.height   = 0;
            dummy.style.left     = x + 'px';
            dummy.style.top      = y + 'px';
            dummy.style.padding  = 0;
            dummy.style.margin   = 0;

            // apply it to the body
            document.body.appendChild(dummy);
        }

        // update the hash
        window.location.hash = '#' + dummy.id;

        // restore the state before the hash changed
        if (!scroll) {
            // remove the dummy node
            try {
                document.body.removeChild(dummy);
            } catch (e) {
                console.log(e); //TODO: some sort of error message or ignore
            }

            // re-apply the old node's id if it exists
            if (node) {
                node.id = id;
            }
        }
    }

    // ### dispatch
    // 
    // 'void' Performs route matching and execution.
    function dispatch() {
        for (var i = 0; i < bound.length; i++) {
            bound[i].dispatch();
        }
    }



    // REST
    // ----
    // 
    // The REST component is designed to give you a way to easily make RESTful requests to an endpoint.
    ku.Http = function() {
        this.events = new ku.Events(this);
        return this;
    };

    ku.Http.prototype = {
        // ### Using a Default URL Prefix
        // 
        // A lot of times, you will want to always call a request that begins with the same thing. By setting the `prefix` property you are telling the client to always prepend this to the requested URL.
        // 
        //     http.prefix = 'api/';
        prefix: '',

        // ### Using a Default URL Suffix
        // 
        // For some applications, you will always want to request URLs ending in a given suffix, or extension. By setting the `suffix` property it tells the client to always append this suffix to the requested URL.
        // 
        //     http.suffix = '.json';
        suffix: '',

        // ### Specifying a Default Content Type to Accept
        // 
        // Setting the `accept` property tells the client to set the `Accept` header to the given value. By default this is set to `application/json` since this is very common. However, if you are consuming another type of service, you will want to change this accordingly:
        // 
        //     http.accept = 'text/xml';
        //     http.accept = 'text/plain';
        //     // ...
        // 
        // The value of the `accept` property also maps directly to `parsers` which parse the resulting response text and pass it to your request callback.
        accept: 'application/json',

        // ### Response Parsers
        // 
        // By default, a plain text response is returned unless a given parser is found for it. Response parsers are just simple functions that take the response text and return a parsed value.
        // 
        //     http.parsers['application/json']('{ "some": "json string" }');
        // 
        // By default, the only included parser is for `application/json`. If you need to add one, simply specify a function for the given content type you require:
        // 
        //     http.parsers['text/xml'] = function(response) {
        //         return jQuery(response);
        //     };
        parsers: {
            'application/json': function(response) {
                return JSON.parse(response);
            }
        },

        // ### DELETE Requests
        // 
        // Makes a request using the `DELETE` method. The following are equivalent:
        // 
        //     http.delete(url, fn);
        //     this.request(url, undefined, 'delete', fn);
        delete: function(url, fn) {
            return this.request(url, {}, 'delete', fn);
        },

        // ### GET Requests
        // 
        // Makes a request using the `GET` method. The following are equivalent:
        // 
        //     http.get(url, fn);
        //     this.request(url, undefined, 'get', fn);
        get: function(url, fn) {
            return this.request(url, {}, 'get', fn);
        },

        // ### HEAD Requests
        // 
        // Makes a request using the `HEAD` method. The following are equivalent:
        // 
        //     http.head(url, fn);
        //     this.request(url, undefined, 'head', fn);
        head: function(url, fn) {
            return this.request(url, {}, 'head', fn);
        },

        // ### OPTIONS Requests
        // 
        // Makes a request using the `OPTIONS` method. The following are equivalent:
        // 
        //     http.options(url, fn);
        //     this.request(url, undefined, 'options', fn);
        options: function(url, fn) {
            return this.request(url, {}, 'options', fn);
        },

        // ### PATCH Requests
        // 
        // Makes a request using the `PATCH` method. Although `PATCH` requests aren't part of the final spec yet, a lot of APIs make use of them including GitHub. The following are equivalent:
        // 
        //     http.patch(url, data, fn);
        //     this.request(url, data, 'patch', fn);
        patch: function(url, data, fn) {
            return this.request(url, data, 'patch', fn);
        },

        // ### POST Requests
        // 
        // Makes a request using the `POST` method. The following are equivalent:
        // 
        //     http.post(url, data, fn);
        //     this.request(url, data, 'post', fn);
        post: function(url, data, fn) {
            return this.request(url, data, 'post', fn);
        },

        // ### PUT Requests
        // 
        // Makes a request using the `PUT` method. The following are equivalent:
        // 
        //     http.put(url, data, fn);
        //     this.request(url, data, 'put', fn);
        put: function(url, data, fn) {
            return this.request(url, data, 'put', fn);
        },

        // ### Manually specifying a request.
        // 
        // For most use-cases, using the pre-defined methods will work. However, there may be a case where you must manually make a request. You can do this with the `request` method.
        // 
        //     http.request('some/url', { some: 'param' }, 'patch', function(response) {
        //         console.log(response);
        //     });
        request: function(url, data, type, fn) {
            var self = this;
            var request = false;
            var factories = [
                    function () { return new XMLHttpRequest() },
                    function () { return new ActiveXObject('Msxml2.XMLHTTP') },
                    function () { return new ActiveXObject('Msxml3.XMLHTTP') },
                    function () { return new ActiveXObject('Microsoft.XMLHTTP') }
                ];

            for (var i = 0; i < factories.length; i++) {
                try {
                    request = factories[i]();
                } catch (e) {
                    continue;
                }

                break;
            }

            if (!request) {
                return;
            }

            request.open(type.toUpperCase(), this.prefix + url + this.suffix, true);
            request.setRequestHeader('Accept', this.accept);

            request.onreadystatechange = function () {
                // If it's not ready yet, just continue.
                if (request.readyState !== 4) {
                    return;
                }

                // On an unsuccessful request, trigger error events.
                if (request.status !== 200 && request.status !== 304) {
                    self.events.trigger('error');
                    self.events.trigger('stop');
                    return;
                }

                // Grab the response text so we can format it if a parser is found.
                var response = request.responseText;

                // If a parser is found, use it to parse the response.
                if (typeof self.parsers[self.accept] !== 'undefined') {
                    response = self.parsers[self.accept](response);
                }

                // Pass the formatted response to the callback.
                if (typeof fn === 'function') {
                    fn(response);
                }

                // Trigger success events.
                self.events.trigger('success');
                self.events.trigger('stop');
            }

            // Don't do anything if the request isn't ready yet.
            if (request.readyState === 4) {
                return;
            }

            // Allow a model to be passed in.
            if (ku.isModel(data)) {
                data = data.export();
            }

            // Serialize objects.
            if (typeof data === 'object') {
                data = this.serialize(data);
            }

            // If there is data to send, set the appropriate request header.
            if (data) {
                request.setRequestHeader('Content-type','application/x-www-form-urlencoded')
            }

            // Trigger start events.
            this.events.trigger('start');

            // Send the request.
            request.send(data);

            return this;
        },

        // ### Serializing Requests
        // 
        // Generally, all parameters are serialized by each REST method, but you can call the serialize method manually if you like:
        // 
        //     http.serialize({ str: 'some string', arr: [0, 1] });
        // 
        // Outputs:
        // 
        //     str=some%20string&arr[0]=0&arr[1]=1
        serialize: function(obj, prefix) {
            var str = [];

            for (var p in obj) {
                var k = prefix ? prefix + '[' + p + ']' : p, v = obj[p];
                str.push(typeof v === 'object' ? this.serialize(v, k) : encodeURIComponent(k) + '=' + encodeURIComponent(v));
            }

            return str.join('&');
        }
    };



    // View
    // ----
    // 
    // The view component is responsible for locating a view and rendering it. Rendering it consists generally of
    // binding a model to the returned view and inserting it into the DOM. A custom renderer can be specified if
    // necessary, but it shouldn't be necessary for 99% of use cases.

    // ### Constructor
    // 
    // `View` Sets up the view.
    ku.View = function() {
        this.http        = new ku.Http;
        this.http.prefix = 'views/';
        this.http.suffix = '.html';
        this.http.accept = 'text/html';

        return this;
    };

    ku.View.prototype = {
        // ### Instance Properties

        // #### cache
        // 
        // `Object` The view cache.
        cache: {},

        // #### http
        // 
        // `Http` The REST client used to locate views.
        http: false,

        // #### target
        // 
        // `String` The ID of the target container for the view.
        target: 'ku-view',

        // ### Instance Methods

        // #### render
        // 
        // `View` Renders the view and binds the specified model to it.
        // 
        // 1. `String name` The name of the view to render.
        // 2. `Model model` The model to bind to the view.
        render: function(name, model) {
            var self = this;

            // Template resolution can take 3 steps.
            // 
            // 1. We look in the cache. If it's here, we render it.
            // 2. If not in the cache, we look for a script tag with an id matching the view name. If found, it's cached and rendered.
            // 3. Lastly, we attept to load it using the REST client. If found, it is cached and rendered. 
            if (this.cache[name]) {
                this.renderer(this.cache[name], model);
            } else if (document.getElementById(name)) {
                this.renderer(this.cache[name] = document.getElementById(name).innerHTML, model);
            } else if (this.http) {
                this.http.get(name, function(html) {
                    self.renderer(self.cache[name] = html, model);
                });
            }

            return this;
        },

        // #### renderer
        // 
        // `void` The default renderer.
        // 
        // 1. `String view` The view to render.
        // 2. `Model model` The view model to bind to the view being rendered.
        renderer: function(view, model) {
            var target = this.target;

            // Target can be an element id, function returning the object or a DOM object.
            if (typeof target === 'string') {
                target = document.getElementById(target);
            } else if (typeof target === 'function') {
                var target = target();
            }

            // Just set the innerHTML.
            target.innerHTML = view;

            // Only apply the view model if one was passed.
            if (ku.isModel(model)) {
                model.knockup(target);
            }
        }
    };

});
