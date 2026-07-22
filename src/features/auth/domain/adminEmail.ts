export const ADMIN_EMAIL = 'asfaqueahmedsakkar@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
