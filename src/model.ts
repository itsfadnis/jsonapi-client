import Serializer = require('jsonapi-serializer/lib/serializer');
import Deserializer = require('jsonapi-serializer/lib/deserializer');
import JSONAPIError from './jsonapi-error';
import HttpAdapter, { ResponsePayload, HttpAdapterConstructor } from './http-adapter';
import { SerializerOptions, DeserializerOptions } from 'jsonapi-serializer';

type ModelConstructor = {
  id?: string | number;
  links?: object;
  meta?: object;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

type Collection<T> = T[] & { links?: object; meta?: object };

const ErrorsSymbol = Symbol('errors');
const PersistedSymbol = Symbol('persisted');
const RelationshipSymbol = Symbol('relationship');
const LinksSymbol = Symbol('links');
const MetaSymbol = Symbol('meta');

class Model {
  static baseURL = '';
  static _type = '';
  id: string;

  private [ErrorsSymbol]: JSONAPIError;
  private [PersistedSymbol]: boolean;
  private [LinksSymbol]: object;
  private [MetaSymbol]: object;

  constructor(args: ModelConstructor = {}) {
    this.id = !!args.id ? String(args.id) : Math.random().toString(36).substring(2, 15);
    this.errors = new JSONAPIError();
    this.persisted = !!args.id;
    this.links = args.links || {};
    this.meta = args.meta || {};
  }

  get errors(): JSONAPIError {
    return this[ErrorsSymbol];
  }

  set errors(errors: JSONAPIError) {
    this[ErrorsSymbol] = errors;
  }

  get persisted(): boolean {
    return this[PersistedSymbol];
  }

  set persisted(persisted: boolean) {
    this[PersistedSymbol] = persisted;
  }

  get links(): object {
    return this[LinksSymbol];
  }

  set links(links: object) {
    this[LinksSymbol] = links;
  }

  get meta(): object {
    return this[MetaSymbol];
  }

  set meta(meta: object) {
    this[MetaSymbol] = meta;
  }

  static urlParams(): string[] | null {
    return this.baseURL.match(/:\w+/g);
  }

  hasMany<T extends Model>(Klass: new (args: object) => T, array: object[] = []): Array<T> {
    const many: Array<T> = array.map((object) => new Klass(object));
    many[RelationshipSymbol] = Klass;
    return many;
  }

  belongsTo<T extends Model>(Klass: new (args: object) => T, object: object = {}): T {
    const one: T = new Klass(object);
    one[RelationshipSymbol] = Klass;
    return one;
  }

  hasOne<T extends Model>(Klass: new (args: object) => T, object: object = {}): T {
    const one: T = new Klass(object);
    one[RelationshipSymbol] = Klass;
    return one;
  }

  isRelationship(key: string): boolean {
    return this.hasOwnProperty(key) && Object.getOwnPropertySymbols(this[key] || {}).indexOf(RelationshipSymbol) > -1;
  }

  isAttribute(key: string): boolean {
    return (
      this.hasOwnProperty(key) &&
      key !== 'id' &&
      typeof key !== 'function' &&
      Object.getOwnPropertySymbols(this[key] || {}).indexOf(RelationshipSymbol) === -1
    );
  }

  static keysForAttributes(): string[] {
    const model = new this();
    const keys: string[] = [];
    for (const key in model) {
      if (this.prototype.isAttribute.call(model, key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  static keysForRelationships(): string[] {
    const model = new this();
    const keys: string[] = [];
    for (const key in model) {
      if (this.prototype.isRelationship.call(model, key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  attributes(): object {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const object: { [k: string]: any } = {};
    for (const key in this) {
      if (this.isAttribute(key)) {
        object[key] = this[key];
      }
    }
    return object;
  }

  static toQueryString(params: object = {}, prefix = ''): string {
    const query = Object.keys(params).map((k) => {
      let key: string = k;
      const value = params[key];
      if (params.constructor === Array) {
        key = encodeURIComponent(`${prefix}[]`);
      } else if (params.constructor === Object) {
        key = prefix ? `${prefix}[${key}]` : key;
      }
      if (typeof value === 'object') {
        return this.toQueryString(value, key);
      }
      return `${key}=${encodeURIComponent(value)}`;
    });
    return [...query].join('&');
  }

  static constructBaseURL(args: object = {}): string {
    const urlParams: string[] | null = this.urlParams();
    if (!urlParams) {
      return this.baseURL;
    }
    let url: string = this.baseURL;
    urlParams.forEach((item) => {
      url = url.replace(item, args[item.substring(1)]);
    });
    return url;
  }

  constructBaseURL(): string | never {
    const urlParams: string[] | null = Model.urlParams();
    if (!urlParams) {
      // eslint-disable-next-line
      // @ts-ignore
      return this.constructor.baseURL;
    }
    throw new Error(
      'Missing url params: ' +
        urlParams.join(', ') +
        '.\n' +
        // eslint-disable-next-line
        // @ts-ignore
        'Override the #constructBaseURL() method of ' +
        this.constructor.name +
        '.',
    );
  }

  serializerOptions(): SerializerOptions {
    const object: SerializerOptions = {};

    // eslint-disable-next-line
    // @ts-ignore
    const keysForAttributes = this.constructor.keysForAttributes();
    // eslint-disable-next-line
    // @ts-ignore
    const keysForRelationships = this.constructor.keysForRelationships();

    object.attributes = [...keysForAttributes, ...keysForRelationships];

    keysForRelationships.forEach((key) => {
      const Relationship = this[key][RelationshipSymbol];
      object[key] = {
        ref: 'id',
        attributes: Relationship.keysForAttributes(),
      };
    });

    return object;
  }

  static deserializerOptions: DeserializerOptions = {
    keyForAttribute: 'camelCase',
  };

  serialize(): object {
    // eslint-disable-next-line
    // @ts-ignore
    const _type: string = this.constructor._type;
    if (!_type) {
      throw new Error('Resource object missing jsonapi type.\nSet static property _type to the model class.');
    }
    return new Serializer(_type, this.serializerOptions()).serialize(this);
  }

  static deserialize(response: object): Promise<Model> | Promise<Collection<Model>> {
    return new Deserializer(this.deserializerOptions).deserialize(response).then((data: object | Collection<object>):
      | Model
      | Collection<Model> => {
      if (Array.isArray(data)) {
        const collection: Collection<Model> = data.map((object) => new this(object));
        if (data.links) {
          collection.links = data.links;
        }
        if (data.meta) {
          collection.meta = data.meta;
        }
        return collection;
      }
      return new this(data);
    });
  }

  // Run model validations in this hook
  // Ex:
  // class Foo extends Model {
  //   validate() {
  //     if (isBlank(this.name)) {
  //       this.errors.add({
  //         code: 'blank',
  //         source: {
  //           pointer: '/data/attributes/name'
  //         }
  //       });
  //     }
  //   }
  // }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validate(): void {}

  get valid(): boolean {
    this.errors.clear();
    this.validate();
    return this.errors.count() === 0;
  }

  static adapter: HttpAdapter;

  static configureAdapter(object: HttpAdapterConstructor = {}): void {
    this.adapter = new HttpAdapter(object);
  }

  static fetch(id, args = {}, query?): Promise<Model> {
    let requestURL = `${this.constructBaseURL(args)}/${id}`;
    if (typeof query === 'object') {
      requestURL += `?${this.toQueryString(query)}`;
    }
    return (
      this.adapter
        .get(requestURL)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((response: ResponsePayload): Promise<any> => this.deserialize(response.data))
    );
  }

  static fetchAll(args: object = {}): Promise<Collection<Model>> {
    return (
      this.adapter
        .get(this.constructBaseURL(args))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((response: ResponsePayload): Promise<any> => this.deserialize(response.data))
    );
  }

  static query(query, args): Promise<Collection<ModelConstructor>> {
    const requestURL = this.constructBaseURL(args);
    const queryString = this.toQueryString(query);
    return (
      this.adapter
        .get(`${requestURL}?${queryString}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((response: ResponsePayload): Promise<any> => this.deserialize(response.data))
    );
  }

  private _update(): Promise<ResponsePayload> {
    // eslint-disable-next-line
    // @ts-ignore
    return this.constructor.adapter.patch(`${this.constructBaseURL()}/${this.id}`, this.serialize());
  }

  private _create(): Promise<ResponsePayload> {
    // eslint-disable-next-line
    // @ts-ignore
    return this.constructor.adapter.post(this.constructBaseURL(), this.serialize());
  }

  private processErrorResponse(response: ResponsePayload): never {
    this.errors = new JSONAPIError(response.data);
    throw response;
  }

  save(): Promise<Model> {
    if (!this.valid) return Promise.reject(new Error('Unprocessable Entity'));

    return (this.persisted ? this._update() : this._create())
      .then(
        (response: ResponsePayload): Promise<Model> => {
          // eslint-disable-next-line
          // @ts-ignore
          return this.constructor.deserialize(response.data);
        },
      )
      .catch(this.processErrorResponse.bind(this));
  }

  static destroy(id, args = {}): Promise<ResponsePayload> {
    return this.adapter.delete(`${this.constructBaseURL(args)}/${id}`).catch((err) => {
      throw err;
    });
  }

  destroy(): Promise<ResponsePayload> {
    // eslint-disable-next-line
    // @ts-ignore
    return this.constructor.adapter.delete(`${this.constructBaseURL()}/${this.id}`).catch((err) => {
      throw err;
    });
  }

  static new(args: ModelConstructor = {}): Model {
    return new this(args);
  }
}

export = Model;
