import { useMockUser } from './MockUserContext';

/**
 * Helper hook to inject mock user data into backend function calls
 * Returns object with mockUserId, mockUserName, mockUserEmail if mock user is active
 */
export function useMockUserData() {
  const { activeMockUser } = useMockUser();

  if (activeMockUser) {
    return {
      mockUserId: activeMockUser.id,
      mockUserName: activeMockUser.name,
      mockUserEmail: `${activeMockUser.id}@dev.local`
    };
  }

  return {};
}