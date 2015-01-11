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