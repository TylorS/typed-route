# @typed/route

Type-safe, bi-directional routing with Effect's `Schema`. 

The key benefit of `@typed/route` is type-safety through type-level parsing of strings utilizing TypeScript's string literal types. 
When constructing Routes, it *knows* exactly what path syntax is being constructed and the types of the parsed parameters.
When interpolating Routes, it *knows* exactly what path will be constructed.

[![npm version](https://badge.fury.io/js/%40typed%2Froute.svg)](https://badge.fury.io/js/%40typed%2Froute)

## Features

- 🎯 **Type-safe routing** - Catch routing errors at compile time
- 🔄 **Bi-directional routing** - Parse URLs to typed parameters and generate URLs from parameters
- 📝 **Schema-based** - Leverage Effect's `Schema` for robust parameter validation
- 🌳 **Path composition** - Build complex routes by combining path segments
- 🔍 **Pattern matching** - Match URLs against route patterns with type inference
- 🔀 **Query parameters** - Support for optional and required query parameters
- 🎭 **Route transformation** - Transform route parameters between different shapes

## Installation

```sh
npm install @typed/route
# or
pnpm add @typed/route
# or
yarn add @typed/route

```

## See it in Action

Here's some examples you can try out in your browser:

- [StackBlitz](https://stackblitz.com/edit/vitejs-vite-wrjpac8t?file=src%2Fmain.ts,src%2Futils.ts,package.json&terminal=dev)

Be sure to hover over the routes to see the inferred types, and open your console to see the printed outputs.

## Usage Guide

### Basic Route Creation

```typescript
import { Route } from '@typed/route'
import { Option } from 'effect'

// Create routes using literals
const articles = Route.literal('articles')

// Create routes with parameters
const article = Route.literal('articles').concat(Route.param('slug'))

// Create routes with integers
const userProfile = Route.literal('user')
  .concat(Route.integer('userId'))
```

### Route Composition

Routes can be composed together to create more complex paths:

```typescript
// Combine multiple route segments
const articleComments = article.concat(Route.literal('comments'))
const specificComment = articleComments.concat(Route.param('commentId'))

// Use separators for clean paths

// Matches and generates paths like '/foo-123'
const fooPrefixed = Route.literal('foo')
  .concat(Route.integer('fooId').prefix('-'))

// Matches paths like '/foo/foo-123
const fooSeparated = Route.literal('foo')
  .concat(Route.separator, Route.integer('fooId').prefix('foo-'))
```

### Parameter Types

The library supports various parameter types:

```typescript
// Basic parameters
const basic = Route.param('test')

// Optional parameters
const optional = Route.param('test').optional()

// Zero or more parameters
const zeroOrMore = Route.param('test').zeroOrMore()

// One or more parameters
const oneOrMore = Route.param('test').oneOrMore()
```

### Query Parameters

Support for URL query parameters:

```typescript
const searchRoute = Route.home.concat(
  Route.queryParams({
    tag: Route.param('tag').optional(),
    limit: Route.param('limit').optional(),
    offset: Route.param('offset').optional()
  })
)

// Matches URLs like: /?tag=javascript&limit=10&offset=20
```

### Route Matching and Interpolation

```typescript
// Match a URL against a route
const result = articleRoute.match('/articles/123')
// Returns Option.some({ slug: '123' }) if matched
// Returns Option.none() if not matched

// Generate a URL from parameters
const url = articleRoute.interpolate({ slug: '123' })
// Returns '/articles/123'
```

### Route Transformation

Transform route parameters between different shapes:

```typescript
import { Schema } from 'effect'

const transformedRoute = route.pipe(
  Route.transform(
    Schema.Struct({
      foo: Schema.Int,
      bar: Schema.Int
    }),
    // Transform from route params to your shape
    ({ paramId }) => ({ foo: paramId, bar: paramId + 1 }),
    // Transform back to route params
    ({ foo, bar }) => ({ paramId: foo })
  )
)
```

### Decoding and Encoding

The library provides utilities for type-safe decoding and encoding:

```typescript
import { Effect } from 'effect'

// Decode a URL path to typed parameters
const params = await Effect.runPromise(
  Route.decode(articleRoute, '/articles/123')
)

// Encode parameters to a URL
const url = await Effect.runPromise(
  Route.encode(articleRoute, { slug: '123' })
)
```

### Separate Path and Query Schemas

You can work with path and query parameters separately:

```typescript
const route = Route.literal('/foo')
  .concat(
    Route.integer('fooId'),
    Route.queryParams({ bar: Route.integer('bar') })
  )

const { pathSchema, querySchema } = route
```

### Route Prefixing

Add prefixes to parameter values:

```typescript
const prefixedRoute = Route.integer('id').prefix('user-')
// Will match and generate URLs like: /user-123
```

### Route Parsing and Utilities

```typescript
// Parse a string path into a Route
const route = Route.parse('/articles/:slug')

// Get the path string from a Route
const path = Route.getPath(route)

// Check if a value is a Route
const isRoute = Route.isRoute(value)
```

For more examples and advanced usage, check out the test file in the repository.

## Route Constructors

### `parse`

Convert strings into a Route

```typescript
import { Route } from '@typed/route'

// Parse a simple path
const userRoute = Route.parse('/users/:id')

// Parse a path with query parameters
const searchRoute = Route.parse('/search?q=:query')

// Parse a path with multiple parameters
const articleRoute = Route.parse('/blog/:year/:month/:slug')
```

### `literal`

Create string literal portions of the route path

```typescript
import { Route } from '@typed/route'

// Create a simple literal route
const home = Route.literal('home')

// Combine literals with other route types
const userProfile = Route.literal('users').concat(Route.param('userId'))
```

### `separator`

Create a path separator (/)


```typescript
import { Route } from '@typed/route'

// Match the root path
const homeRoute = Route.separator // matches "/*"

// Add query parameters to home route
const homeWithSearch = Route.home.concat(
  Route.queryParams({
    q: Route.param('query').optional()
  })
)
```

### `home`

Create a route for the root path, expects to be the ENTIRE path.

```typescript
import { Route } from '@typed/route'

// Match the root path
const homeRoute = Route.home // matches "/"

// Add query parameters to home route
const homeWithSearch = Route.home.concat(
  Route.queryParams({
    q: Route.param('query').optional()
  })
)
```

### `param`

Create a route parameter with string type

```typescript
import { Route } from '@typed/route'

// Simple parameter
const userRoute = Route.literal('users').concat(Route.param('userId'))

// Multiple parameters
const articleRoute = Route.literal('blog')
  .concat(Route.param('category'))
  .concat(Route.param('slug'))

// Optional parameter
const searchRoute = Route.param('query').optional()
```

### `paramWithSchema`

Create a route parameter with a custom schema

```typescript
import { Route } from '@typed/route'
import { Schema } from 'effect'

// Create a parameter with a custom schema, must start as a String
const userRoute = Route.literal('users').concat(
  Route.paramWithSchema('userId', Schema.NumberFromString)
)

// Parameter with complex schema
const dateRoute = Route.paramWithSchema('date', Schema.Date)
```

### `number`

Create a route parameter that parses to a number

```typescript
import { Route } from '@typed/route'

// Match numeric IDs
const userRoute = Route.literal('users').concat(Route.number('userId'))

// Match numeric values in query params
const pageRoute = Route.literal('posts').concat(
  Route.queryParams({
    page: Route.number('page'),
    limit: Route.number('limit')
  })
)
```

### `integer`

Create a route parameter that parses to an integer

```typescript
import { Route } from '@typed/route'

// Match integer IDs
const productRoute = Route.literal('products').concat(Route.integer('productId'))

// Match page numbers
const paginatedRoute = Route.literal('articles').concat(
  Route.queryParams({
    page: Route.integer('page')
  })
)
```

### `BigInt`

Create a route parameter that parses to a BigInt

```typescript
import { Route } from '@typed/route'

// Match large numeric IDs
const largeIdRoute = Route.literal('records').concat(Route.BigInt('recordId'))

// Match timestamp values
const timeRoute = Route.literal('events').concat(Route.BigInt('timestamp'))
```

### `bigDecimal`

Create a route parameter that parses to a BigDecimal

```typescript
import { Route } from '@typed/route'

// Match precise decimal values
const priceRoute = Route.literal('products').concat(Route.bigDecimal('price'))

// Match coordinates
const locationRoute = Route.literal('map').concat(
  Route.bigDecimal('latitude')
).concat(Route.bigDecimal('longitude'))
```

### `base64Url`

Create a route parameter that parses base64url-encoded data

```typescript
import { Route } from '@typed/route'

// Match base64url-encoded tokens
const tokenRoute = Route.literal('verify').concat(Route.base64Url('token'))

// Match encoded data
const dataRoute = Route.literal('data').concat(Route.base64Url('payload'))
```

### `boolean`

Create a route parameter that parses to a boolean

```typescript
import { Route } from '@typed/route'

// Match boolean flags
const featureRoute = Route.literal('features').concat(
  Route.queryParams({
    enabled: Route.boolean('enabled')
  })
)

// Match boolean parameters
const settingRoute = Route.literal('settings').concat(Route.boolean('active'))
```

### `ulid`

Create a route parameter that validates ULIDs

```typescript
import { Route } from '@typed/route'

// Match ULID identifiers
const documentRoute = Route.literal('documents').concat(Route.ulid('documentId'))

// Match ULID in query params
const lookupRoute = Route.queryParams({
  id: Route.ulid('recordId')
})
```

### `uuid`

Create a route parameter that validates UUIDs

```typescript
import { Route } from '@typed/route'

// Match UUID identifiers
const userRoute = Route.literal('users').concat(Route.uuid('userId'))

// Match multiple UUIDs
const batchRoute = Route.literal('batch').concat(
  Route.queryParams({
    ids: Route.uuid('id').oneOrMore()
  })
)
```

### `date`

Create a route parameter that parses to a Date

```typescript
import { Route } from '@typed/route'

// Match date parameters
const eventRoute = Route.literal('events').concat(Route.date('eventDate'))

// Match date ranges
const rangeRoute = Route.literal('reports').concat(
  Route.queryParams({
    start: Route.date('startDate'),
    end: Route.date('endDate')
  })
)
```

### `unnamed`

Create an unnamed route parameter

```typescript
import { Route } from '@typed/route'

// Match any value without naming it
const catchAllRoute = Route.literal('files').concat(Route.unnamed)

// Match multiple segments
const deepRoute = Route.literal('docs').concat(Route.unnamed.zeroOrMore())
```

### `zeroOrMore`

Match zero or more occurrences of a route

```typescript
import { Route } from '@typed/route'

// Match optional path segments
const filesRoute = Route.literal('files').concat(Route.param('path').zeroOrMore())

// Match multiple query parameters
const tagsRoute = Route.literal('posts').concat(
  Route.queryParams({
    tags: Route.param('tag').zeroOrMore()
  })
)
```

### `oneOrMore`

Match one or more occurrences of a route

```typescript
import { Route } from '@typed/route'

// Match at least one path segment
const pathRoute = Route.literal('path').concat(Route.param('segment').oneOrMore())

// Match multiple required parameters
const multiRoute = Route.literal('items').concat(
  Route.queryParams({
    id: Route.number('id').oneOrMore()
  })
)
```

### `optional`

Make a route parameter optional

```typescript
import { Route } from '@typed/route'

// Optional path parameter
const userRoute = Route.literal('users').concat(Route.param('userId').optional())

// Optional query parameters
const searchRoute = Route.literal('search').concat(
  Route.queryParams({
    q: Route.param('query').optional(),
    page: Route.number('page').optional()
  })
)
```

### `prefix`

Add a prefix to route parameters

```typescript
import { Route } from '@typed/route'

// Add prefix to parameter values
const userRoute = Route.number('userId').prefix('user-')
// Matches: /user-123

// Add prefix with separator
const tagRoute = Route.param('tag').prefix('tag/')
// Matches: /tag/javascript
```

### `concat`

Combine multiple routes together

```typescript
import { Route } from '@typed/route'

// Combine literal with parameter
const userPostRoute = Route.literal('users')
  .concat(Route.param('userId'))
  .concat(Route.literal('posts'))
  .concat(Route.param('postId'))

// Combine with query parameters
const searchRoute = Route.literal('search')
  .concat(Route.queryParams({
    q: Route.param('query'),
    page: Route.number('page').optional()
  }))
```

### `queryParams`

Add query parameters to a route

```typescript
import { Route } from '@typed/route'

// Simple query parameters
const searchRoute = Route.literal('search').concat(
  Route.queryParams({
    q: Route.param('query'),
    page: Route.number('page').optional(),
    limit: Route.number('limit').optional()
  })
)

// Complex query parameters
const filterRoute = Route.literal('products').concat(
  Route.queryParams({
    category: Route.param('category').optional(),
    minPrice: Route.number('minPrice').optional(),
    maxPrice: Route.number('maxPrice').optional(),
    tags: Route.param('tag').zeroOrMore()
  })
)
```

## Schemas

### `withSchema`

Add a custom schema to a route

```typescript
import { Route } from '@typed/route'
import { Schema } from 'effect'

// Add custom schema to route
const userRoute = Route.literal('users')
  .concat(Route.param('userId'))
  .pipe(Route.withSchema(Schema.Struct({
    userId: Schema.NumberFromString
  })))

// Complex schema transformation
const dateRoute = Route.literal('events')
  .concat(Route.param('date'))
  .pipe(Route.withSchema(Schema.transform(
    Schema.DateFromSelf,
    Schema.String,
    (date) => date.toISOString(),
    (str) => new Date(str)
  )))
```

### `decode`

Decode a URL path to typed parameters

```typescript
import { Route } from '@typed/route'
import { Effect } from 'effect'

const userRoute = Route.literal('users').concat(Route.number('userId'))

// Decode a path
const result = await Effect.runPromise(
  Route.decode(userRoute, '/users/123')
)
// Result: { userId: 123 }

// Handle decode errors
const program = Route.decode(userRoute, '/users/invalid')
  .pipe(
    Effect.catchTags({
      RouteNotMatched: () => ...,
      RouteDecodeError: ({ route, issue }) => ...
    })
  )
```

### `encode`

Encode parameters to a URL path

```typescript
import { Route } from '@typed/route'
import { Effect } from 'effect'

const userRoute = Route.literal('users').concat(Route.number('userId'))

// Encode parameters to a path
const path = await Effect.runPromise(
  Route.encode(userRoute, { userId: 123 })
)
// Result: '/users/123'

// Handle encode errors
const program = Effect.tryPromise(() =>
  Route.encode(userRoute, { userId: 'invalid' })
    .pipe(
      Effect.catchTags({
        RouteEncodeError: ({ route, issue }) => ...
      })
    )
)
```

### `updateSchema`

Update a route's schema

```typescript
import { Route } from '@typed/route'
import { Schema } from 'effect'

// Update schema to add validation
const userRoute = Route.literal('users')
  .concat(Route.param('userId'))
  .pipe(Route.updateSchema((schema) =>
    Schema.compose(
      schema,
      Schema.Struct({
        userId: Schema.String.pipe(Schema.minLength(5))
      })
    )
  ))

```

### `transform`

Transform route parameters between different shapes

```typescript
import { Route } from '@typed/route'
import { Schema } from 'effect'

// Transform parameters to a different shape
const userRoute = Route.literal('users')
  .concat(Route.param('userId'))
  .pipe(Route.transform(
    Schema.Struct({ id: Schema.Number }),
    ({ userId }) => ({ id: Number(userId) }),
    ({ id }) => ({ userId: String(id) })
  ))

// Complex transformation with validation
const dateRoute = Route.literal('events')
  .concat(Route.param('date'))
  .pipe(Route.transform(
    Schema.Date,
    ({ date }) => new Date(date),
    (date) => ({ date: data.toISOString() })
  ))
```

### `transformOrFail`

Transform route parameters with possible failure using an Effect

```typescript
import { Route } from '@typed/route'
import { Schema, Effect } from 'effect'

// Transform with Effect
const userRoute = Route.literal('users')
  .concat(Route.param('userId'))
  .pipe(Route.transformOrFail(
    Schema.Struct({ id: Schema.Number }),
    ({ userId }) => Effect.succeed({ id: Number(userId) }),
    ({ id }) => Effect.succeed({ userId: String(id) })
  ))
```

### `attachPropertySignature`

Add a property to route parameters

```typescript
import { Route } from '@typed/route'

// Add version property
const apiRoute = Route.literal('api')
  .concat(Route.param('endpoint'))
  .pipe(Route.attachPropertySignature('version', 'v1'))
// Matches to { endpoint: string; version: 'v1' }

// Add multiple properties
const userRoute = Route.literal('users')
  .concat(Route.param('userId'))
  .pipe(
    Route.attachPropertySignature('type', 'user'),
    Route.attachPropertySignature('source', 'database')
  )
// Matches to `{ userId: string; type: 'user'; source: 'database' }
```

### `addTag`

Add a discriminant tag to route parameters

```typescript
import { Route } from '@typed/route'

// Add type tag
const userRoute = Route.literal('users')
  .concat(Route.param('userId'))
  .pipe(Route.addTag('user'))
// Matches to { _tag: "user", userId: string }

// Use with different routes
const postRoute = Route.literal('posts')
  .concat(Route.integer('postId'))
  .pipe(Route.addTag('post'))
// Matches to { _tag: "post"; postId: number }
```

## Utilities

### sortRoutes

Sort routes by specificity for proper matching

```typescript
import { Route } from '@typed/route'

// Sort routes by specificity
const routes = Route.sortRoutes([
  Route.literal('users').concat(Route.param('userId')),
  Route.literal('users'),
  Route.literal('users').concat(Route.literal('settings')),
  Route.literal('users').concat(Route.param('userId'), Route.literal('posts'))
])

// Routes will be sorted with most specific first:
// 1. /users/settings
// 2. /users/:userId/posts
// 3. /users/:userId
// 4. /users
```