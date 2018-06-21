var Deserializer = jest.fn();

Deserializer.prototype.deserialize = jest.fn().mockReturnValue(
  Promise.resolve({
    id: '123',
    firstName: 'John',
    lastName: 'Doe'
  })
);

module.exports = Deserializer;
