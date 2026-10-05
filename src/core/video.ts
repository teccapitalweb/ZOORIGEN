import { requestApi } from './remoto';

type VideoToken = { embedUrl: string; expires: number; courseId: string; lesson: number };

export async function loadProtectedVideo(courseId: string, lesson: number): Promise<VideoToken> {
  return requestApi<VideoToken>('/video/token', {
    method: 'POST',
    body: JSON.stringify({ courseId, lesson }),
  });
}

export async function startCheckout(plan: 'monthly' | 'annual'): Promise<string> {
  const response = await requestApi<{ url: string }>('/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
  return response.url;
}
