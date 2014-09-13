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