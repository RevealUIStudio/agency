import { handleAvailability } from '../../server/consultation-http';

export const config = { runtime: 'nodejs' };

export default function handler(request: Request): Promise<Response> {
  return handleAvailability(request);
}
