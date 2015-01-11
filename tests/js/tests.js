module('Attribute Bindings');


module('Models and Collections');

test('Defining', function() {
    var User = knockOutModel.model({
        name: '',
        addresses: [],
        readComputed: function() {

        }
    });

    var bob = new User({
        name: 'Bob Bobberson'
    });

    ok(knockOutModel.isModel(User), '`knockOutModel.model()` should return a valid model.');
    ok(ko.isObservable(bob.name), 'The property should be an observable.');
    ok(typeof bob.addresses.push === 'function', 'The property should be an observable array.');
    ok(ko.isComputed(bob.computed), 'The property should be a computed observable.');
});

test('Instantiating', function() {
    var User = knockOutModel.model({
        name: ''
    });

    var instance = new User({
        name: 'test',
        undefinedProperty: 'test'
    });

    ok(instance instanceof User, 'The `user` instance should be an instance of the `User` model.');
    ok(ko.isObservable(instance.observer), 'The `observer` property should be a Knockout observable.');
    ok(instance.name() === 'test', 'The instance should be filled when data is passed to the constructor.');
    ok(typeof instance.undefinedProperty === 'undefined', 'Undefined properties should not be set.');
});

test('Relationships', function() {
    var Friend = knockOutModel.model({
        name: ''
    });

    var User = knockOutModel.model({
        bestFriend: Friend,
        friends: Friend.Collection
    });

    var user = new User().bestFriend({
        name: 'Dog'
    }).friends([
        { name: 'Cat' },
        { name: 'Lizard' }
    ]);

    var exported = user.raw();

    ok(exported.bestFriend.name === user.bestFriend().name(), 'Dog should be the best friend.');
    ok(exported.friends[0].name === user.friends().first().name(), 'Cat should be 2nd best.');
    ok(exported.friends[1].name === user.friends().at(1).name(), 'Lizard should be 3rd best.');
});

test('Collection Manipulation', function() {
    var Item = knockOutModel.model({
        name: ''
    });

    var Items = knockOutModel.model({
        items: Item.Collection
    });

    var model = new Items;

    model.items([{
        name: 'test1'
    }, {
        name: 'test2'
    }]);

    ok(model.items().length === 2, 'Items not set.');

    model.items([{
        name: 'test1'
    }, {
        name: 'test2'
    }]);

    ok(model.items().length === 2, 'Items should be replaced when directly set.');
});


test('Computed Observables - Readers and Writers', function() {
    var User = knockOutModel.model({
        forename: '',
        surname: '',
        readName: function() {
            return this.forename() + ' ' + this.surname();
        },
        writeName: function(name) {
            name = name.split(' ');
            this.forename(name[0]).surname(name[1]);
            return this;
        }
    });

    var user     = new User().name('Barbara Barberson');
    var exported = user.raw();

    ok(exported.name === user.name(), 'The `name` reader should have been exported.');
});

test('Ownership Binding', function() {
    var ChildModel = knockOutModel.model({
        name: ''
    });

    var ParentModel = knockOutModel.model({
        child: ChildModel,
        children: ChildModel.Collection
    });

    var owner = new ParentModel({
        child: {
            name: 'test'
        },
        children: [{
            name: 'test'
        }]
    });

    ok(owner.child().$parent instanceof ParentModel, 'The child model\'s $parent should be an instanceof ParentModel.');
    ok(owner.children().at(0).$parent instanceof ParentModel, 'The children collection\'s $parent should be an instanceof ParentModel.');
});

test('Resetting Properties - Values, Models and Collections', function() {
    var CheeseModel = knockOutModel.model({
        name:        'Mozzarella',
        consistency: 'Stringy'
    });

    var MeatModel = knockOutModel.model({
        name: 'Bacon',
        cut:  'Rasher'
    });

    var PizzaModel = knockOutModel.model({
        meats: MeatModel.Collection,
        slices: 8,
        cheese: CheeseModel
    });

    var pizza = new PizzaModel;
    pizza.slices(12);
    pizza.meats().append(new MeatModel);
    pizza.meats().append(new MeatModel({
        'name': 'Beef',
        'cut': 'Ground'
    }));
    pizza.cheese().name('Gouda');

    ok(pizza.slices() === 12, 'There should now be 12 slices in the pizza model (found: '+ pizza.slices() +').');
    ok(pizza.meats().length === 2, 'There should be 2 different meats on the pizza (found: '+ pizza.meats().length +').');
    ok(pizza.cheese().name() === 'Gouda', 'The pizza should have Gouda cheese (found: '+ pizza.cheese().name() +').');

    pizza.reset();

    ok(pizza.slices() === 8, 'The pizza should have 8 slices again (found: '+ pizza.slices() +').');
    ok(pizza.meats().length === 0, 'There should be no meats on the pizza (found: '+ pizza.meats().length +').');
    ok(pizza.cheese().name() === 'Mozzarella', 'The pizza should have Mozzarella cheese again (found: '+ pizza.cheese().name() +').');
});