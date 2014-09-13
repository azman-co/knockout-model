knockOutModel.bindings = {
    model: function(element, value) {
        if (this.attr(element, 'view')) {
            return;
        }

        ko.applyBindings(this.get(value), element);
    }
};