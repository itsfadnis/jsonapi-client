[![Build Status](https://semaphoreci.com/api/v1/itsfadnis/jsonapi-client/branches/master/badge.svg)](https://semaphoreci.com/itsfadnis/jsonapi-client)

# jsonapi-client
A convenient module to consume a jsonapi service

## Install
```console
$ npm install --save @itsfadnis/jsonapi-client
```
or
```console
$ yarn add @itsfadnis/jsonapi-client
```

## Basic usage

### Configure

```javascript
import { HttpAdapter, Model } from '@itsfadnis/jsonapi-client';

// Setup an instance of the adapter for the model
Model.adapter = new HttpAdapter({
  baseURL: 'https://foo.com',
  namespace: '/v2',
  headers: {
    key: 'value'
  }
});
```

### How serialization/deserialization works

`@itsfadnis/jsonapi-client` internally uses [jsonapi-serializer](https://github.com/itsfadnis/jsonapi-serializer) for serializing/deserializing data to [JSON API](http://jsonapi.org/) (1.0 compliant)

Models serialize themselves before making a request, and deserialize the recieved response into instances of the Model. This abstraction allows yours models to talk to a jsonapi service seamlessly without having to worry about the serialization/deserialization business.

In any case if you want finer control, it can be done by overriding some defaults.

Default serializer options are defined in the `Model#serializerOptions()` method, to override/customize them you can override this method on your model.

Default deserializer options are defined on the static property `Model.deserializerOptions`, to override/customize them you can override this property.

#### Available options

- [Serializer options](https://github.com/itsfadnis/jsonapi-serializer#available-serialization-option-opts-argument)
- [Deserializer options](https://github.com/itsfadnis/jsonapi-serializer#available-deserialization-option-opts-argument)

### Model definition

```javascript
class Post extends Model {
  static baseURL = '/posts';

  constructor(args) {
    super(args);
    this.title = args.title;
    this.body = args.body;
  }
}
```

#### Standard CRUD APIs

- Fetch posts
```javascript
Post.fetchAll();
```

- Fetch a single Post
```javascript
Post.fetch(id);
```

- Create/update post
```javascript
// New record (if no `id` provided)
const p1 = new Post({
  title: 'foo',
  body: 'bar'
});

// Will make a `POST` request on save
p1.save();

// Treated as persisted record since `id` provided
const p2 = new Post({
  id: 1,
  title: 'boo',
  body: 'baz'
});

// Will make a `PATCH` request on `save`
p2.save();
```

- Delete a post
```javascript
// Static method
Post.destroy(id)


// Instance method
const p = new Post({
  id: 1
});

p.destroy();
```
