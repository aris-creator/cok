const mongodb = require("mongodb");
const getDb = require("../util/database").getDb;

const ObjectId = new mongodb.ObjectId();

class User {
  constructor(username, email, cart, id) {
    this.name = username;
    this.email = email;
    this.cart = cart;
    this._id = id ? new mongodb.ObjectId(id) : null;
  }

  save() {
    const db = getDb();
    return db
      .collection("users")
      .insertOne(this)
      .then(result => {
        return result;
      })
      .catch(err => console.log(err));
  }

  addToCart(product) {
    const cartProductIndex = this.cart.items.findIndex(item => {
      return item.productId.toString() == product._id.toString();
    });

    let newQuantity = 1;
    let updatedCartItems = this.cart ? [...this.cart.items] : [];

    if (cartProductIndex >= 0) {
      newQuantity = updatedCartItems[cartProductIndex].quantity;
      updatedCartItems[cartProductIndex].quantity = newQuantity + 1;
    } else {
      updatedCartItems.push({
        productId: new mongodb.ObjectId(product._id),
        quantity: newQuantity
      });
    }
    const updatedCart = { items: updatedCartItems };

    const db = getDb();
    return db
      .collection("users")
      .updateOne({ _id: this._id }, { $set: { cart: updatedCart } });
  }

  getCart() {
    const db = getDb();
    
    const validCartItems = this.cart.items.filter(item => {
       return db.collection('products')
        .distinct('_id')
        .then(productIds => {
          return productIds.map(id => id.toString()).indexOf(item.productId.toString()) >= 0; 
        })
        .catch(err => console.log(err));  
    })
    const cartItemIds = validCartItems.map(item => item.productId);
    
    const updatedCart = { items: validCartItems };
    
    return db.collection('users')
      .updateOne({ _id: this._id }, { $set: { cart: updatedCart } })
      .then(result => {
        return db.collection("products")
          .find({ _id: { $in: cartItemIds } })
          .toArray()
          .then(products => {
            return products.map(p => {
              return {
                ...p,
                quantity: validCartItems.find(item => {
                  return item.productId.toString() == p._id.toString();
                }).quantity
              };
            });
          });
      });
  }

  deleteItemFromCart(productId) {
    const updatedCartItems = this.cart.items.filter(
      item => item.productId.toString() != productId.toString()
    );

    const updatedCart = {items: updatedCartItems};
    
    const db = getDb();
    return db
      .collection("users")
      .updateOne({ _id: this._id }, { $set: { cart: updatedCart } });
  }

  addOrder(){
    const db = getDb();
    return this.getCart()
      .then(products => {      
        const order = {
          items: products,
          user: {
            _id: new mongodb.ObjectId(this._id),
            name: this.name,
            email: this.email
          }
        }
        return db.collection('orders')
          .insertOne(order)
          .then(result => {
            const updatedCart = { items: []};
            return db.collection('users')
              .updateOne({ _id: new mongodb.ObjectId(this._id) }, { $set: { cart: updatedCart } });
          })
          .catch(err => console.log(err));
    });
  }

  getOrders(){
    const db = getDb();
    return db.collection('orders')
      .find({'user._id': new mongodb.ObjectId(this._id)})
      .toArray()
      .then(orders => { 
        return orders
      })
      .catch(err => console.log(err))
  }

  static findById(userId) {
    const db = getDb();
    return db
      .collection("users")
      .findOne({ _id: new mongodb.ObjectId(userId) })
      .then(user => {
        console.log(user);
        return user;
      })
      .catch(err => console.log(err));
  }
}

module.exports = User;