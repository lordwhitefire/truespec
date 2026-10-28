/**
 * RFC 9116 places the file at `/.well-known/security.txt`. The root path is a
 * convenience redirect so `/security.txt` and the well-known address resolve to
 * the one file.
 */
export function GET(request: Request): Response {
  return Response.redirect(new URL('/.well-known/security.txt', request.url), 308);
}
