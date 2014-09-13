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