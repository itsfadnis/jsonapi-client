var Deserializer = jest.fn();

Deserializer.prototype.deserialize = jest.fn().mockReturnValue({
  id: '123',
  firstName: 'John',
  lastName: 'Doe'
});

module.exports = {
  Serializer: {},
  Deserializer: Deserializer
};
