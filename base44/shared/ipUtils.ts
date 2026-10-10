export function getClientIp(req: Request): string {
  const headers = req.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return (
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    headers.get('fastly-client-ip') ||
    'unknown'
  );
}

export const FREE_PLAN = 'free';

export function isPaidPlan(plan: string | null | undefined): boolean {
  return !!plan && plan !== FREE_PLAN;
}