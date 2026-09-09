import { ApiClient, type ApiClientOptions } from './client';

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

export default createApiClient;
