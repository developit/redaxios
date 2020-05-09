declare module "redaxios" {
	/** HTTP method */
	export type Method =
		| "get"
		| "GET"
		| "post"
		| "POST"
		| "patch"
		| "PATCH"
		| "put"
		| "PUT"
		| "options"
		| "OPTIONS"
		| "delete"
		| "DELETE";

	type MethodRequiringBody =
		| "post"
		| "POST"
		| "patch"
		| "PATCH"
		| "put"
		| "PUT";
	type BodylessMethod =
		| "get"
		| "GET"
		| "options"
		| "OPTIONS"
		| "delete"
		| "DELETE";

	/** An encoding to use for the response */
	export type ResponseType =
		| "text"
		| "json"
		| "stream"
		| "blob"
		| "arrayBuffer"
		| "formData"
		| "stream";

	/** Override status code handling (default: 200-399 is a success) */
	export type ValidateStatus = (status: number) => boolean;

	/** An transformation to apply to the outgoing request */
	export type TransformRequestCallback<
		TOptions extends BaseOptionsWithBody | BaseOptions<Method>,
		TBody = TOptions extends BaseOptionsWithBody ? TOptions["body"] : never
	> = (body: TBody, headers: Headers) => unknown;

	/** Describes a request with no body. */
	interface BaseOptions<TMethods extends Method = BodylessMethod> {
		/**
		 * HTTP method, case-insensitive
		 * @default 'get'
		 */
		method?: TMethods;

		/** Requwst headers */
		headers?: Headers;

		/** Authorization header value to send with the request */
		auth?: string;

		/** Pass an Cross-site Request Forgery prevention cookie value as a header defined by `xsrfHeaderName` */
		ssrfCookieName?: string;

		/** The name of a header to use for passing XSRF cookies */
		ssrfHeaderName?: string;

		/** Override status code handling (default: 200-399 is a success) */
		validateStatus?: ValidateStatus;

		/** An array of transformations to apply to the outgoing request */
		transformRequest?: TransformRequestCallback<BaseOptions<TMethods>>[];
	}

	interface BaseOptionsWithBody extends BaseOptions<MethodRequiringBody> {
		/** a body, optionally encoded, to send */
		body: FormData | string | object;

		/**
		 * An encoding to use for the response
		 * @default 'text'
		 */
		responseType?: ResponseType;

		/** HTTP method, case-insensitive */
		method: MethodRequiringBody;
	}

	export type Options = BaseOptionsWithBody | BaseOptions;

	function create<TDefaults extends Partial<BaseOptions>>(
		defaults: TDefaults
	): RedAxios<Omit<Options, keyof TDefaults>>;

	export interface RedAxios<TOptions = Options> {
		/* Bodyless methods: */

		/** Perform a GET request to the specified URL. */
		get(
			url: string,
			configuration: Omit<BaseOptions, "method">
		): Promise<Response>;

		/** Perform a DELETE request to the specified URL. */
		delete(
			url: string,
			configuration: Omit<BaseOptions, "method">
		): Promise<Response>;

		/** Perform an OPTIONS request to the specified URL. */
		options(
			url: string,
			configuration: Omit<BaseOptions, "method">
		): Promise<Response>;

		/* Body methods: */

		/** Perform a POST request to the specified URL. */
		post(
			url: string,
			configuration: Omit<BaseOptionsWithBody, "method">
		): Promise<Response>;

		/** Perform a PUT request to the specified URL. */
		put(
			url: string,
			configuration: Omit<BaseOptionsWithBody, "method">
		): Promise<Response>;

		/** Perform a PATCH request to the specified URL. */
		patch(
			url: string,
			configuration: Omit<BaseOptionsWithBody, "method">
		): Promise<Response>;

		/* Utilities: */
		spread<TFunction extends (...args: unknown[]) => unknown>(
			func: TFunction
		): (
			this: ThisType<TFunction>,
			...args: Parameters<TFunction>
		) => ReturnType<TFunction>;
		all: typeof Promise.all;

		/** Issues a request. */
		(url: string, config: TOptions): Promise<Response>;

		/** Issues a request. */
		(config: TOptions & { url: string }): Promise<Response>;

		CancelToken: AbortController | typeof Object;
		create: typeof create;
	}

	const redaxios: RedAxios;
	export default redaxios;
}
