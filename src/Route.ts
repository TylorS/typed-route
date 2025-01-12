import type { NonEmptyArray } from 'effect/Array'
import { sortBy } from 'effect/Array'
import type { BigDecimal } from 'effect/BigDecimal'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { constant, dual, pipe } from 'effect/Function'
import type * as Option from 'effect/Option'
import * as Ord from 'effect/Order'
import { ArrayFormatter, type ParseError, type ParseIssue, TreeFormatter } from 'effect/ParseResult'
import { type Pipeable, pipeArguments } from 'effect/Pipeable'
import { hasProperty } from 'effect/Predicate'
import * as Record from 'effect/Record'
import * as Schema from 'effect/Schema'
import type * as SchemaAST from 'effect/SchemaAST'
import type * as Types from 'effect/Types'
import type { N, O, U } from 'ts-toolbelt'
import * as AST from './AST.js'
import * as Path from './Path/index.js'
import { type Guard, GUARDABLE, Guardable } from '@typed/guard'

export const RouteTypeId = Symbol.for('@typed/route/Route')

export type RouteTypeId = typeof RouteTypeId

export interface Route<P extends string, S extends Schema.Schema.All = Route.PathSchema<P>>
  extends Guard<string, S['Type'], never, S['Context']>,
    Pipeable {
  readonly [RouteTypeId]: Route.Variance<P, S>

  readonly routeAst: AST.AST

  readonly routeOptions: RouteOptions

  readonly path: Path.PathJoin<[P]>

  readonly schema: Route.SchemaFromInput<P, S>

  readonly pathSchema: Route.PathSchemaFromInput<P, S>

  readonly querySchema: Route.QuerySchemaFromInput<P, S>

  readonly match: (path: string) => Option.Option<Path.ParamsOf<P>>

  readonly interpolate: Route.PathInterpolate<P>

  readonly concat: <const R2 extends ReadonlyArray<Route.Any>>(
    ...right: R2
  ) => Route.ConcatAll<[Route<P, S>, ...R2]>

  readonly optional: () => Route<
    Path.Optional<P>,
    [S] extends [never]
      ? Schema.Schema<
          Types.Simplify<Optional<Schema.Schema.Type<Route.SchemaFromPath<Path.Optional<P>>>>>,
          Types.Simplify<Optional<Schema.Schema.Encoded<Route.SchemaFromPath<Path.Optional<P>>>>>,
          never
        >
      : Schema.Schema<
          Types.Simplify<Optional<Schema.Schema.Type<S>>>,
          Types.Simplify<Optional<Schema.Schema.Encoded<S>>>,
          Schema.Schema.Context<S>
        >
  >

  readonly oneOrMore: () => Route<
    Path.OneOrMore<P>,
    [S] extends [never]
      ? never
      : Schema.Schema<
          readonly [
            Types.Simplify<Schema.Schema.Type<S>>,
            ...Array<Types.Simplify<Schema.Schema.Type<S>>>,
          ],
          readonly [
            Types.Simplify<Schema.Schema.Encoded<S>>,
            ...Array<Types.Simplify<Schema.Schema.Encoded<S>>>,
          ],
          Schema.Schema.Context<S>
        >
  >

  readonly zeroOrMore: () => Route<
    Path.ZeroOrMore<P>,
    [S] extends [never]
      ? never
      : Schema.Schema<
          ReadonlyArray<Types.Simplify<Schema.Schema.Type<S>>>,
          ReadonlyArray<Types.Simplify<Schema.Schema.Encoded<S>>>,
          Schema.Schema.Context<S>
        >
  >

  readonly prefix: <P2 extends string>(prefix: P2) => Route<Path.Prefix<P2, P>, S>
}

type Optional<T> = {
  [K in keyof T]?: T[K] | null | undefined
}

export namespace Route {
  export type Any = Route<any, any> | Route<any, never>

  export interface Variance<P extends string, S extends Schema.Schema.All> {
    readonly _P: Types.Covariant<P>
    readonly _S: Types.Covariant<S>
  }

  export type Path<T> = [T] extends [never] ? never : T extends Route<infer P, infer _> ? P : never

  export type PathWithoutQuery<T> = Path<T> extends `${infer P}\\?${infer _}` ? P : Path<T>

  export type Query<T> = Path<T> extends `${string}\\?${infer Q}`
    ? `\\?${Q}`
    : Path<T> extends `${string}?${infer Q}`
      ? `?${Q}`
      : ''

  export type Schema<T> = [T] extends [never]
    ? never
    : T extends Route<infer P, infer S>
      ? SchemaFromInput<P, S>
      : never

  export type SchemaFromInput<P extends string, S extends Schema.Schema.All = never> = [S] extends [
    never,
  ]
    ? SchemaFromPath<P>
    : S

  export type PathSchema<T> = [T] extends [never]
    ? never
    : T extends Route<infer P, infer S>
      ? PathSchemaFromInput<P, S>
      : never

  export type PathSchemaFromInput<P extends string, S extends Schema.Schema.All = never> = [
    S,
  ] extends [never]
    ? PathSchema.ExtractKeys<
        SchemaFromPath<P>,
        PathSchema.GetPathTypeKeys<PathSchema.GetPath<P>>,
        PathSchema.GetPathEncodedKeys<PathSchema.GetPath<P>>
      >
    : PathSchema.ExtractKeys<
        S,
        PathSchema.GetPathTypeKeys<PathSchema.GetPath<P>>,
        PathSchema.GetPathEncodedKeys<PathSchema.GetPath<P>>
      >

  export type PathInterpolate<P extends string> = <const P2 extends Path.ParamsOf<P>>(
    ...params: [keyof Path.ParamsOf<P>] extends [never] ? [{}?] : [P2]
  ) => Path.Interpolate<P, P2>

  export namespace PathSchema {
    export type GetPath<P extends string> = P extends `${infer R}\\?${infer _}` ? R : P

    export type GetPathEncodedKeys<P extends string> = keyof Schema.Schema.Encoded<
      SchemaFromPath<P>
    >

    export type GetPathTypeKeys<P extends string> = keyof Schema.Schema.Type<SchemaFromPath<P>>

    export type ExtractKeys<
      S extends Schema.Schema.All,
      TK extends PropertyKey,
      EK extends PropertyKey,
    > = Schema.Schema<
      Types.Simplify<Pick<Schema.Schema.Type<S>, TK>>,
      Types.Simplify<Pick<Schema.Schema.Encoded<S>, EK>>,
      Schema.Schema.Context<S>
    > extends Schema.Schema<infer A, infer I, infer R>
      ? Schema.Schema<A, I, R>
      : never
  }

  export type QuerySchema<T> = [T] extends [never]
    ? never
    : T extends Route<infer P, infer S>
      ? QuerySchemaFromInput<P, S>
      : never

  export type QuerySchemaFromInput<P extends string, S extends Schema.Schema.All = never> = [
    S,
  ] extends [never]
    ? QuerySchema.ExtractKeys<
        SchemaFromPath<QuerySchema.GetQuery<P>>,
        QuerySchema.GetQueryTypeKeys<QuerySchema.GetQuery<P>>,
        QuerySchema.GetQueryEncodedKeys<QuerySchema.GetQuery<P>>
      >
    : QuerySchema.ExtractKeys<
        S,
        QuerySchema.GetQueryTypeKeys<QuerySchema.GetQuery<P>>,
        QuerySchema.GetQueryEncodedKeys<QuerySchema.GetQuery<P>>
      >

  export namespace QuerySchema {
    export type GetQuery<P extends string> = P extends `${infer _}\\?${infer R}` ? `\\?${R}` : never

    export type GetQueryEncodedKeys<P extends string> = keyof Schema.Schema.Encoded<
      SchemaFromPath<P>
    >

    export type GetQueryTypeKeys<P extends string> = keyof Schema.Schema.Type<SchemaFromPath<P>>

    export type ExtractKeys<
      S extends Schema.Schema.All,
      TK extends PropertyKey,
      EK extends PropertyKey,
    > = [
      Schema.Schema<
        Types.Simplify<Pick<Schema.Schema.Type<S>, TK>>,
        Types.Simplify<Pick<Schema.Schema.Encoded<S>, EK>>,
        Schema.Schema.Context<S>
      >,
    ] extends [Schema.Schema<infer A, infer I, infer R>]
      ? Schema.Schema<A, I, R>
      : never
  }

  export type Type<R extends Route.Any> = Schema.Schema.Type<R['schema']>

  export type Encoded<R extends Route.Any> = Schema.Schema.Encoded<R['schema']>

  export type Params<R extends Route.Any> = Path.ParamsOf<Route.Path<R>>

  export type ParamsList<R extends Route.Any> = Path.ParamsList<Route.Path<R>>

  export type QueryParams<R extends Route.Any> = Path.QueryParams<Route.Path<R>>

  export type Context<R extends Route.Any> = Schema.Schema.Context<R>

  export type Interpolate<R extends Route.Any, P extends Route.Params<R>> = Path.Interpolate<
    Route.Path<R>,
    P
  >

  export type UpdatePath<T, P extends string> = T extends Route<infer _, infer S>
    ? Route<P, S>
    : never

  export type UpdateSchema<T, S extends Schema.Schema.All> = T extends Route<infer P, infer _>
    ? Route<P, S>
    : never

  export type Concat<I extends Route.Any, I2 extends Route.Any> = Route<
    Path.PathJoin<[PathWithoutQuery<I>, PathWithoutQuery<I2>, ConcatQuery<Query<I>, Query<I2>>]>,
    ConcatSchemas<Schema<I>, Schema<I2>>
  > extends Route<infer P, infer S>
    ? Route<P, S>
    : never

  export type ConcatAll<Routes extends ReadonlyArray<any>> = Routes extends readonly [
    infer Head extends Route.Any,
  ]
    ? Head extends Route.Any
      ? Head
      : never
    : Routes extends readonly [infer Head extends Route.Any, ...infer Tail]
      ? Concat<
          Head,
          ConcatAll<Tail> extends infer R2 extends Route.Any ? R2 : never
        > extends infer R extends Route.Any
        ? R
        : never
      : never

  export type ConcatSchemas<S1 extends Schema.Schema.All, S2 extends Schema.Schema.All> = [
    S1,
  ] extends [never]
    ? S2
    : [S2] extends [never]
      ? S1
      : Schema.Schema<
          MergeSchemaTypes<Schema.Schema.Type<S1>, Schema.Schema.Type<S2>>,
          MergeSchemaTypes<Schema.Schema.Encoded<S1>, Schema.Schema.Encoded<S2>>,
          Schema.Schema.Context<S1> | Schema.Schema.Context<S2>
        >

  export type ConcatQuery<Q1 extends string, Q2 extends string> = [Q1, Q2] extends ['', '']
    ? ''
    : [Q1] extends ['']
      ? `\\?${RemoveQuestionMark<Q2>}`
      : [Q2] extends ['']
        ? `\\?${RemoveQuestionMark<Q1>}`
        : `\\?${RemoveQuestionMark<Q1>}&${RemoveQuestionMark<Q2>}`

  type RemoveQuestionMark<Q extends string> = Q extends `?${infer R}`
    ? R
    : Q extends `\\?${infer R}`
      ? R
      : Q

  type MergeSchemaTypes<A, B> = CountUnnamedParams<A> extends infer R extends number
    ? Types.Simplify<A & IncrementUnnamedParams<B, R>>
    : never

  type CountUnnamedParams<T, Count extends number = 0> = Count extends keyof T
    ? CountUnnamedParams<T, N.Add<Count, 1>>
    : Count

  type IncrementUnnamedParams<T, Count extends number> = Count extends 0
    ? T
    : {
        [K in keyof T as K extends number ? N.Add<K, Count> : K]: T[K]
      }

  export type SchemaFromPath<P extends string> = Schema.Schema<Path.ParamsOf<P>>

  export type ParamsAreOptional<R extends Route.Any> = [keyof Params<R>] extends [never]
    ? true
    : KeysAreOptional<Params<R>>

  type KeysAreOptional<T extends object> = [keyof T] extends [O.OptionalKeys<T>] ? true : false
}

export function isRoute(value: unknown): value is Route.Any {
  return hasProperty(value, RouteTypeId)
}

const variance_: Route.Variance<any, any> = {
  _P: (_) => _,
  _S: (_) => _,
}

class RouteImpl<P extends string, S extends Schema.Schema.All>
  extends Guardable<string, S['Type'], never, S['Context']>
  implements Route<P, S>
{
  readonly [RouteTypeId]: Route.Variance<P, S> = variance_

  readonly routeOptions: RouteOptions

  constructor(
    readonly routeAst: AST.AST,
    options?: Partial<RouteOptions>,
  ) {
    super()
    this.pipe = this.pipe.bind(this)
    this.concat = this.concat.bind(this)
    this.routeOptions = { end: false, ...options }
  }

  private __path!: any
  get path(): Path.PathJoin<[P]> {
    return (this.__path ??= AST.toPath(this.routeAst) as Path.PathJoin<[P]>)
  }

  private __schema!: any
  get schema() {
    return (this.__schema ??= AST.toSchema(this.routeAst) as any)
  }

  private __pathSchema!: any
  get pathSchema() {
    return (this.__pathSchema ??= AST.toPathSchema(this.routeAst) as any)
  }

  private __querySchema!: any
  get querySchema() {
    return (this.__querySchema ??= AST.toQuerySchema(this.routeAst) as any)
  }

  private __match!: Route<P, S>['match']
  match(path: string) {
    const m = (this.__match ??= getMatch(this as any, this.routeOptions) as any)
    return m(path)
  }

  private __interpolate!: Route<P, S>['interpolate']
  interpolate<P2 extends Path.ParamsOf<P>>(
    ...[params]: [keyof Path.ParamsOf<P>] extends [never] ? [{}?] : [P2]
  ) {
    const i = (this.__interpolate ??= getInterpolate(this as any) as any)
    return i(params as any)
  }

  pipe() {
    // biome-ignore lint/style/noArguments: <explanation>
    return pipeArguments(this, arguments)
  }

  concat<R2 extends ReadonlyArray<Route.Any>>(...right: R2) {
    if (right.length === 0) return this as any

    const [first, ...rest] = right
    let inner = first
    for (const r of rest) {
      inner = concat(inner, r)
    }

    return concat(this as any, inner) as any
  }

  optional() {
    return make(new AST.Optional(this.routeAst)) as any
  }

  oneOrMore() {
    return make(new AST.OneOrMore(this.routeAst)) as any
  }

  zeroOrMore() {
    return make(new AST.ZeroOrMore(this.routeAst)) as any
  }

  prefix<P2 extends string>(prefix: P2) {
    return make(new AST.Prefix(prefix, this.routeAst)) as any
  }

  [GUARDABLE] = (input: string) => {
    return decode<Route<P, S>>(this, input).pipe(
      Effect.asSome,
      Effect.catchAll((_) => Effect.succeedNone),
    )
  }
}

export interface RouteOptions {
  readonly end: boolean
}

export const make = <P extends string, S extends Schema.Schema.All>(
  ast: AST.AST,
  options?: Partial<RouteOptions>,
): Route<P, S> => new RouteImpl<P, S>(ast, options)

export const parse = <const P extends string>(path: P, options?: Partial<RouteOptions>): Route<P> =>
  make(AST.parse(path), options)

export const literal = <const L extends string>(
  literal: L,
  options?: Partial<RouteOptions>,
): Route<L> =>
  make(new AST.Literal(Path.removeLeadingSlash(Path.removeTrailingSlash(literal))), options)

export const separator: Route<'/'> = make(new AST.Literal('/'))

export const home: Route<'/'> = make(new AST.Literal('/'), { end: true })

export const param = <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
): Route<Path.Param<Name>> => make(new AST.Param(name), options)

export const paramWithSchema: {
  <A, R = never>(
    schema: Schema.Schema<A, string, R>,
    options?: Partial<RouteOptions>,
  ): <const Name extends string>(
    name: Name,
  ) => Route<
    Path.Param<Name>,
    Schema.Schema<{ readonly [_ in Name]: A }, { readonly [_ in Name]: string }, R>
  >

  <const Name extends string, A, R = never>(
    name: Name,
    schema: Schema.Schema<A, string, R>,
    options?: Partial<RouteOptions>,
  ): Route<
    Path.Param<Name>,
    Schema.Schema<{ readonly [_ in Name]: A }, { readonly [_ in Name]: string }, R>
  >
} = dual(
  (args) => typeof args[0] === 'string',
  <const Name extends string, A, R = never>(
    name: Name,
    schema: Schema.Schema<A, string, R>,
    options?: Partial<RouteOptions>,
  ): Route<
    Path.Param<Name>,
    Schema.Schema<{ readonly [_ in Name]: A }, { readonly [_ in Name]: string }, R>
  > => withSchema(param(name, options), Schema.Struct(Record.singleton(name, schema)) as any),
)

export const number: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: number }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.NumberFromString, options)

export const integer: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: number }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.NumberFromString.pipe(Schema.int()), options)

export const BigInt: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: bigint }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.BigInt, options)

export const bigDecimal: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: BigDecimal }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.BigDecimal, options)

export const base64Url: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: Uint8Array }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.Uint8ArrayFromBase64Url, options)

export const boolean: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: boolean }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.parseJson(Schema.Boolean), options)

export const ulid: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: string }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.ULID, options)

export const uuid: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: string }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.UUID, options)

export const date: <const Name extends string>(
  name: Name,
  options?: Partial<RouteOptions>,
) => Route<
  Path.Param<Name>,
  Schema.Schema<{ readonly [_ in Name]: Date }, { readonly [_ in Name]: string }, never>
> = (name, options) => paramWithSchema(name, Schema.Date, options)

export const unnamed: Route<Path.Unnamed> = make(new AST.UnnamedParam())

export const zeroOrMore = <R extends Route<any, never>>(
  route: R,
): Route.UpdatePath<R, Path.ZeroOrMore<Route.Path<R>>> =>
  make(new AST.ZeroOrMore(route.routeAst), route.routeOptions) as Route.UpdatePath<
    R,
    Path.ZeroOrMore<Route.Path<R>>
  >

export const oneOrMore = <R extends Route<any, never>>(
  route: R,
): Route.UpdatePath<R, Path.OneOrMore<Route.Path<R>>> =>
  make(new AST.OneOrMore(route.routeAst), route.routeOptions) as Route.UpdatePath<
    R,
    Path.OneOrMore<Route.Path<R>>
  >

export const optional = <R extends Route<any, never>>(
  route: R,
): Route.UpdatePath<R, Path.Optional<Route.Path<R>>> =>
  make(new AST.Optional(route.routeAst), route.routeOptions) as Route.UpdatePath<
    R,
    Path.Optional<Route.Path<R>>
  >

export const prefix: {
  <P extends string>(
    prefix: P,
  ): <R extends Route.Any>(route: R) => Route.UpdatePath<R, Path.Prefix<P, Route.Path<R>>>
  <R extends Route.Any, P extends string>(
    prefix: P,
    route: R,
  ): Route.UpdatePath<R, `{${P}${Route.Path<R>}}`>
} = <R extends Route.Any, P extends string>(...args: [P] | [P, R]): any => {
  if (args.length === 1) {
    return (route: R) =>
      make(new AST.Prefix(args[0], route.routeAst), route.routeOptions) as Route.UpdatePath<
        R,
        Path.Prefix<P, Route.Path<R>>
      >
  }

  return make(new AST.Prefix(args[0], args[1].routeAst), args[1].routeOptions) as Route.UpdatePath<
    R,
    Path.Prefix<P, Route.Path<R>>
  >
}

const dontMergeTags = ['WithSchema', 'QueryParams', 'QueryParam']

export const concat: {
  <R extends Route.Any>(right: R): <L extends Route.Any>(left: L) => Route.Concat<L, R>

  <L extends Route.Any, R extends Route.Any>(left: L, right: R): Route.Concat<L, R>
} = dual(
  2,
  <L extends Route.Any, R extends Route.Any>(left: L, right: R): Route.Concat<L, R> =>
    make(
      AST.concat(left.routeAst, right.routeAst),
      dontMergeTags.includes(right.routeAst._tag) ? left.routeOptions : right.routeOptions,
    ) as Route.Concat<L, R>,
)

export const withSchema: {
  <R extends Route.Any, S extends Schema.Schema<any, Path.ParamsOf<Route.Path<R>>, any>>(
    schema: S,
  ): (route: R) => Route.UpdateSchema<R, S>

  <R extends Route.Any, S extends Schema.Schema<any, Path.ParamsOf<Route.Path<R>>, any>>(
    route: R,
    schema: S,
  ): Route.UpdateSchema<R, S>
} = dual(
  2,
  <R extends Route.Any, S extends Schema.Schema<any, Path.ParamsOf<Route.Path<R>>, any>>(
    route: R,
    schema: S,
  ): Route.UpdateSchema<R, S> =>
    make(new AST.WithSchema(route.routeAst, schema), route.routeOptions) as Route.UpdateSchema<
      R,
      S
    >,
)

export const getPath = <R extends Route.Any>(route: R): Route.Path<R> =>
  AST.toPath(route.routeAst) as Route.Path<R>

export function getMatch<R extends Route.Any>(
  route: R,
  options?: { end?: boolean },
): (path: string) => Option.Option<Route.Params<R>> {
  const matcher = AST.astToMatcher(route.routeAst, options?.end ?? false)
  return (path: string): Option.Option<Route.Params<R>> =>
    matcher(...AST.getPathAndQuery(path)) as any
}

export function getInterpolate<R extends Route.Any>(
  route: R,
): <P extends Route.Params<R>>(params: P) => Route.Interpolate<R, P> {
  const interpolate = AST.astToInterpolation(route.routeAst)
  if (interpolate._tag === 'Literal') return constant(interpolate.value) as any
  return interpolate.interpolate as any
}

export class RouteDecodeError<R extends Route.Any> extends Data.TaggedError('RouteDecodeError')<{
  readonly route: R
  readonly issue: ParseIssue
}> {
  constructor(props: { readonly route: R; readonly issue: ParseIssue }) {
    super(props)

    Object.assign(this, {
      message: `RouteDecodeError: ${this.route.path}\n${TreeFormatter.formatIssueSync(this.issue)}`,
    })
  }

  toJSON(): unknown {
    return {
      _tag: 'RouteDecodeError',
      route: this.route.path,
      issue: ArrayFormatter.formatIssueSync(this.issue),
    }
  }

  toString(): string {
    return this.message
  }
}

export class RouteNotMatched<R extends Route.Any> extends Data.TaggedError('RouteNotMatched')<{
  readonly route: R
}> {
  toJSON(): unknown {
    return {
      _tag: 'RouteNotMatched',
      route: this.route.path,
    }
  }

  toString(): string {
    return this.message
  }
}

export const decode: {
  (
    path: string,
  ): <R extends Route.Any>(
    route: R,
  ) => Effect.Effect<Route.Type<R>, RouteDecodeError<R> | RouteNotMatched<R>, Route.Context<R>>

  <R extends Route.Any>(
    route: R,
    path: string,
  ): Effect.Effect<Route.Type<R>, RouteDecodeError<R> | RouteNotMatched<R>, Route.Context<R>>
} = dual(2, function decode<R extends Route.Any>(route: R, path: string): Effect.Effect<
  Route.Type<R>,
  RouteDecodeError<R> | RouteNotMatched<R>,
  Route.Context<R>
> {
  return Effect.mapError(
    Effect.flatMap(
      route.match(path) as Option.Option<Route.Params<R>>,
      Schema.decode(route.schema) as (
        params: Route.Params<R>,
      ) => Effect.Effect<Route.Type<R>, ParseError, Route.Context<R>>,
    ),
    (error) =>
      error._tag === 'ParseError'
        ? new RouteDecodeError({ route, issue: error.issue })
        : new RouteNotMatched({ route }),
  )
})

export const decode_: {
  <R extends Route.Any>(
    route: R,
  ): (
    path: string,
  ) => Effect.Effect<Route.Type<R>, RouteDecodeError<R> | RouteNotMatched<R>, Route.Context<R>>

  <R extends Route.Any>(
    path: string,
    route: R,
  ): Effect.Effect<Route.Type<R>, RouteDecodeError<R> | RouteNotMatched<R>, Route.Context<R>>
} = dual(
  2,
  <R extends Route.Any>(
    path: string,
    route: R,
  ): Effect.Effect<Route.Type<R>, RouteDecodeError<R> | RouteNotMatched<R>, Route.Context<R>> =>
    decode(route, path),
)

export class RouteEncodeError<R extends Route.Any> extends Data.TaggedError('RouteEncodeError')<{
  readonly route: R
  readonly issue: ParseIssue
}> {
  toJSON(): unknown {
    return {
      _tag: 'RouteEncodeError',
      route: this.route.path,
      issue: ArrayFormatter.formatIssueSync(this.issue),
    }
  }

  toString() {
    return `RouteEncodeError: ${this.route.path}\n${TreeFormatter.formatIssueSync(this.issue)}`
  }
}

export const encode: {
  <R extends Route.Any, O extends Route.Type<R>>(
    params: O,
  ): (
    route: R,
  ) => Effect.Effect<Route.Interpolate<R, Route.Params<R>>, RouteEncodeError<R>, Route.Context<R>>

  <R extends Route.Any, O extends Route.Type<R>>(
    route: R,
    params: O,
  ): Effect.Effect<Route.Interpolate<R, Route.Params<R>>, RouteEncodeError<R>, Route.Context<R>>
} = dual(
  2,
  <R extends Route.Any, O extends Route.Type<R>>(
    route: R,
    params: O,
  ): Effect.Effect<Route.Interpolate<R, Route.Params<R>>, RouteEncodeError<R>, Route.Context<R>> =>
    pipe(
      params,
      Schema.encode(route.schema),
      Effect.catchAll((error) => new RouteEncodeError({ route, issue: error.issue })),
      Effect.map((params) => route.interpolate(params as Route.Params<R>)),
    ) as any,
)

export const encode_: {
  <R extends Route.Any, O extends Route.Type<R>>(
    route: R,
  ): (
    params: O,
  ) => Effect.Effect<Route.Interpolate<R, Route.Params<R>>, RouteEncodeError<R>, Route.Context<R>>

  <R extends Route.Any, O extends Route.Type<R>>(
    params: O,
    route: R,
  ): Effect.Effect<Route.Interpolate<R, Route.Params<R>>, RouteEncodeError<R>, Route.Context<R>>
} = dual(
  2,
  <R extends Route.Any, O extends Route.Type<R>>(
    params: O,
    route: R,
  ): Effect.Effect<Route.Interpolate<R, Route.Params<R>>, RouteEncodeError<R>, Route.Context<R>> =>
    encode(route, params) as any,
)

export const updateSchema: {
  <R extends Route.Any, S extends Schema.Schema.Any>(
    f: (s: Route.Schema<R>) => S,
  ): (route: R) => Route.UpdateSchema<R, S>
  <R extends Route.Any, S extends Schema.Schema.Any>(
    route: R,
    f: (s: Route.Schema<R>) => S,
  ): Route.UpdateSchema<R, S>
} = dual(
  2,
  <R extends Route.Any, S extends Schema.Schema.Any>(
    route: R,
    f: (s: Route.Schema<R>) => S,
  ): Route.UpdateSchema<R, S> => withSchema<R, S>(route, f(route.schema)),
)

export const transform: {
  <R extends Route.Any, S extends Schema.Schema.Any>(
    toSchema: S,
    from: (o: Route.Type<R>) => Schema.Schema.Encoded<S>,
    to: (s: Schema.Schema.Encoded<S>) => Route.Type<R>,
  ): (route: R) => Route.UpdateSchema<R, Schema.transform<Route.Schema<R>, S>>

  <R extends Route.Any, S extends Schema.Schema.Any>(
    route: R,
    toSchema: S,
    from: (o: Route.Type<R>) => Schema.Schema.Encoded<S>,
    to: (s: Schema.Schema.Encoded<S>) => Route.Type<R>,
  ): Route.UpdateSchema<R, Schema.transform<Route.Schema<R>, S>>
} = dual(4, function transform<
  R extends Route.Any,
  S extends Schema.Schema.Any,
>(route: R, toSchema: S, from: (o: Route.Type<R>) => Schema.Schema.Encoded<S>, to: (s: Schema.Schema.Encoded<S>) => Route.Type<R>): Route.UpdateSchema<
  R,
  Schema.transform<Route.Schema<R>, S>
> {
  return updateSchema(route, Schema.transform(toSchema, { decode: from, encode: to })) as any
})

export const transformOrFail: {
  <R extends Route.Any, S extends Schema.Schema.Any, R2>(
    toSchema: S,
    from: (o: Route.Type<R>) => Effect.Effect<Schema.Schema.Encoded<S>, ParseIssue, R2>,
    to: (s: Schema.Schema.Encoded<S>) => Effect.Effect<Route.Type<R>, ParseIssue, R2>,
  ): (route: R) => Route.UpdateSchema<R, Schema.transformOrFail<Route.Schema<R>, S, R2>>

  <R extends Route.Any, S extends Schema.Schema.Any, R2>(
    route: R,
    toSchema: S,
    from: (o: Route.Type<R>) => Effect.Effect<Schema.Schema.Encoded<S>, ParseIssue, R2>,
    to: (s: Schema.Schema.Encoded<S>) => Effect.Effect<Route.Type<R>, ParseIssue, R2>,
  ): Route.UpdateSchema<R, Schema.transformOrFail<Route.Schema<R>, S, R2>>
} = dual(4, function transformOrFail<
  R extends Route.Any,
  S extends Schema.Schema.Any,
  R2,
>(route: R, toSchema: S, from: (o: Route.Type<R>) => Effect.Effect<Schema.Schema.Encoded<S>, ParseIssue, R2>, to: (s: Schema.Schema.Encoded<S>) => Effect.Effect<Route.Type<R>, ParseIssue, R2>): Route.UpdateSchema<
  R,
  Schema.transformOrFail<Route.Schema<R>, S, R2>
> {
  return updateSchema(route, Schema.transformOrFail(toSchema, { decode: from, encode: to })) as any
})

export const attachPropertySignature: {
  <K extends string, V extends symbol | SchemaAST.LiteralValue>(
    key: K,
    value: V,
  ): <R extends Route.Any>(
    route: R,
  ) => Route.UpdateSchema<
    R,
    Schema.Schema<Route.Type<R> & { readonly [_ in K]: V }, Route.Encoded<R>, Route.Context<R>>
  >

  <R extends Route.Any, K extends string, V extends symbol | SchemaAST.LiteralValue>(
    route: R,
    key: K,
    value: V,
  ): Route.UpdateSchema<
    R,
    Schema.Schema<Route.Type<R> & { readonly [_ in K]: V }, Route.Encoded<R>, Route.Context<R>>
  >
} = dual(3, function attachPropertySignature<
  R extends Route.Any,
  K extends string,
  V extends SchemaAST.LiteralValue | symbol,
>(route: R, key: K, value: V): Route.UpdateSchema<
  R,
  Schema.Schema<Route.Type<R> & { readonly [_ in K]: V }, Route.Encoded<R>, Route.Context<R>>
> {
  return updateSchema(route, Schema.attachPropertySignature(key, value)) as any
})

export const addTag: {
  <const T extends string>(
    tag: T,
  ): <R extends Route.Any>(
    route: R,
  ) => Route.UpdateSchema<
    R,
    Schema.Schema<Route.Type<R> & { readonly _tag: T }, Route.Encoded<R>, Route.Context<R>>
  >

  <R extends Route.Any, const T extends string>(
    route: R,
    tag: T,
  ): Route.UpdateSchema<
    R,
    Schema.Schema<Route.Type<R> & { readonly _tag: T }, Route.Encoded<R>, Route.Context<R>>
  >
} = dual(2, function addTag<
  R extends Route.Any,
  const T extends string,
>(route: R, tag: T): Route.UpdateSchema<
  R,
  Schema.Schema<Route.Type<R> & { readonly _tag: T }, Route.Encoded<R>, Route.Context<R>>
> {
  return attachPropertySignature(route, '_tag', tag)
})

export function queryParams<Params extends Readonly<Record<string, Route.Any>>>(
  params: Params,
): RouteFromQueryParamsObject<Params> {
  return make(
    new AST.QueryParams(
      separator.routeAst,
      Object.entries(params).map(([key, value]) => new AST.QueryParam(key, value.routeAst)),
    ),
  ) as any
}

export type RouteFromQueryParamsObject<O extends Readonly<Record<string, Route.Any>>> = Route<
  QueryParamsFromObject<O>,
  QueryParamsFromObjectSchema<O>
> extends Route<infer P, Schema.Schema<infer A, infer I, infer R>>
  ? Route<P, Schema.Schema<A, I, R>>
  : never

export type QueryParamsFromObject<O extends Readonly<Record<string, Route.Any>>> = Path.QueryParams<
  U.ListOf<
    {
      readonly [K in keyof O]: `${Extract<K, string | number>}=${Route.Path<O[K]>}`
    }[keyof O]
  >
>

export type QueryParamsFromObjectSchema<O extends Readonly<Record<string, Route.Any>>> =
  Schema.Schema<
    Types.Simplify<
      Types.UnionToIntersection<
        {
          readonly [K in keyof O]: Route.Type<O[K]>
        }[keyof O]
      >
    >,
    Types.Simplify<
      Types.UnionToIntersection<
        {
          readonly [K in keyof O]: Route.Encoded<O[K]>
        }[keyof O]
      >
    >,
    Route.Context<O[keyof O]>
  >

export const Order: Ord.Order<Route.Any> = Ord.make((a, b) => {
  const aPath = a.path
  const bPath = b.path
  const aParts = aPath.split('/')
  const bParts = bPath.split('/')
  const l = Math.min(aParts.length, bParts.length)

  for (let i = 0; i < l; i++) {
    if (aParts[i] === bParts[i]) continue

    const aComplexity = guessComplexity(aParts[i])
    const bComplexity = guessComplexity(bParts[i])

    if (aComplexity === bComplexity) {
      continue
    }

    if (aComplexity === 0) return -1
    if (bComplexity === 0) return 1
    if (bComplexity > aComplexity) return -1
    return 1
  }

  if (aParts.length === bParts.length) return 0
  if (aParts.length > bParts.length) return -1
  return 1
})

export function sortRoutes<Routes extends ReadonlyArray<Route.Any>>(
  routes: Routes,
): Routes extends NonEmptyArray<infer R>
  ? NonEmptyArray<R>
  : Routes extends ReadonlyArray<infer R>
    ? ReadonlyArray<R>
    : never {
  return sortBy(Order)(routes) as any
}

function guessComplexity(part: string): number {
  if (part === '') return -1

  let complexity = 0

  for (let i = 0; i < part.length; i++) {
    if (part[i] === ':') {
      complexity += 1
    }
    if (part[i] === '{') {
      complexity += 1
    }
  }

  return complexity
}
