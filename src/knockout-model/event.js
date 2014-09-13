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