const Deserializer = jest.fn();

Deserializer.prototype.deserialize = jest.fn().mockResolvedValue({
  id: '123',
  firstName: 'John',
  lastName: 'Doe',
});

export = Deserializer;
