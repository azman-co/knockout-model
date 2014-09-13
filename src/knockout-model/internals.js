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