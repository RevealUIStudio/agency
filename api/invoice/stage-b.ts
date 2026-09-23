import { handleShareRequest } from '../../server/share-http';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleShareRequest(request);
}
