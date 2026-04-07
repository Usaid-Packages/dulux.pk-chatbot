import value from '#env';

export const buildComplaintsSocketUrl = (threadId: string, accessToken: string): string => {
  const configuredBaseUrl = value.VITE_COMPLAINTS_SOCKET_BASE_URL;
  const socketBaseUrl = new URL(configuredBaseUrl);

  if (socketBaseUrl.protocol === 'https:') {
    socketBaseUrl.protocol = 'wss:';
  } else if (socketBaseUrl.protocol === 'http:') {
    socketBaseUrl.protocol = 'ws:';
  }

  socketBaseUrl.pathname = `/ws/complaints/${threadId}/chat/`;
  socketBaseUrl.search = `token=${encodeURIComponent(accessToken)}`;
  return socketBaseUrl.toString();
};
