export const authenticate = async (credentials: {
  username: string;
  password: string;
}): Promise<{ success: boolean }> => {
  // Mock API call (replace with actual endpoint)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: credentials.username === 'admin' && credentials.password === 'password' });
    }, 500);
  });
};