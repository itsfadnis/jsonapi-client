type MetaObject = object;

type LinksObject = {
  about:
    | string
    | {
        href: string;
        meta?: MetaObject;
      };
};

type ErrorSourceObject = {
  pointer?: string;
  parameter?: string;
};

type ErrorObject = {
  id?: string;
  links?: LinksObject;
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: ErrorSourceObject;
  meta?: MetaObject;
};

type ExtractedErrors = {
  [k: string]: Array<ErrorObject>;
};

interface JSONAPIError {
  errors: Array<ErrorObject>;
  add(error: ErrorObject): void;
  count(): number;
  clear(): void;
  extract(): ExtractedErrors;
}

class JSONAPIError {
  errors: Array<ErrorObject>;

  constructor(args: { errors?: Array<object> } = {}) {
    const errors = Array.isArray(args.errors) ? args.errors : [];

    this.errors = errors.map(this.processError);
  }

  private processError(error: ErrorObject): ErrorObject {
    const object: ErrorObject = {};

    if (error.id) {
      object.id = error.id;
    }
    if (error.status) {
      object.status = error.status;
    }
    if (error.code) {
      object.code = error.code;
    }
    if (error.title) {
      object.title = error.title;
    }
    if (error.detail) {
      object.detail = error.detail;
    }
    if (error.meta) {
      object.meta = error.meta;
    }

    if (error.links) {
      if (error.links.about) {
        object.links = {
          about: error.links.about,
        };
      }
    }

    if (error.source) {
      object.source = {};

      if (error.source.pointer) {
        object.source.pointer = error.source.pointer;
      }

      if (error.source.parameter) {
        object.source.parameter = error.source.parameter;
      }
    }

    return object;
  }

  clear(): void {
    this.errors = [];
  }

  count(): number {
    return this.errors.length;
  }

  parsePointer(pointer: string): string | undefined {
    if (pointer === '/data') {
      return 'base';
    }
    if (pointer.indexOf('/data/attributes/') === 0) {
      return pointer.substring('/data/attributes/'.length, pointer.length);
    }
  }

  extract(): ExtractedErrors {
    return this.errors.reduce((a: ExtractedErrors, b: ErrorObject) => {
      if (b.source) {
        let key: string;
        key = b.source.parameter;

        if (!key && b.source.pointer) {
          key = this.parsePointer(b.source.pointer);
        }

        if (key) {
          if (a.hasOwnProperty(key)) {
            a[key].push(b);
          } else {
            a[key] = [b];
          }
        }
      }
      return a;
    }, {});
  }

  add(error: object): void {
    this.errors.push(this.processError(error));
  }
}

export default JSONAPIError;
