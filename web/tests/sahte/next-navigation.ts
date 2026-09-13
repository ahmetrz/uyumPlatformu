export function redirect(url: string): never { throw new Error(`REDIRECT:${url}`); }
