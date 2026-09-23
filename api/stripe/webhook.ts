import { handleConsultationRequest } from '../../server/consultation-http';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleConsultationRequest(request);
}
