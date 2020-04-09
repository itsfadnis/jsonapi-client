const Serializer = jest.fn();

Serializer.prototype.serialize = jest.fn().mockReturnValue({
  data: {
    type: 'users',
    id: '123',
    attributes: {
      'first-name': 'John',
      'last-name': 'Doe',
    },
  },
});

export = Serializer;
