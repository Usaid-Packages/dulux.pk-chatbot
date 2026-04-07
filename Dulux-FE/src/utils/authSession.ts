import { ACCESS_TOKEN, AUTH_USER, REFRESH_TOKEN } from '#/constants';
import { removeLocalStorageItem } from './localStorage';

export const clearAuthSession = (): void => {
  removeLocalStorageItem(ACCESS_TOKEN);
  removeLocalStorageItem(REFRESH_TOKEN);
  removeLocalStorageItem(AUTH_USER);
};
