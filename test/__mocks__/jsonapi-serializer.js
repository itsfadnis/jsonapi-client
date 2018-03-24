var Deserializer = jest.fn();
var Serializer = jest.fn();

Deserializer.prototype.deserialize = jest.fn().mockReturnValue({
  id: '123',
  firstName: 'John',
  lastName: 'Doe'
});

Serializer.prototype.serialize = jest.fn().mockReturnValue({
  data: {
    type: 'users',
    id: '123',
    attributes: {
      'first-name': 'John',
      'last-name': 'Doe'
    }
  }
});

module.exports = {
  Serializer: Serializer,
  Deserializer: Deserializer
};
