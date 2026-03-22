import React, { createContext, useContext, useState } from 'react';

const MockUserContext = createContext(null);

// IDs must match real User records in the database.
// USER → lanirbs (admin acting as user for dev), or use a real user ID.
// COMMANDER and ADMIN → update with real DB user IDs once those users are invited with the correct role.
const MOCK_USERS = {
  USER: {
    id: '69b915f413039cfab1777809',
    name: 'נעמה הרוש',
    full_name: 'נעמה הרוש',
    email: 'n3131024@gmail.com',
    role: 'user'
  },
  COMMANDER: {
    id: 'cmd-1',
    name: 'ישראל ישראלי - מפקד',
    full_name: 'ישראל ישראלי - מפקד',
    email: 'cmd-1@guardtech.local',
    role: 'commander'
  },
  ADMIN: {
    id: '69b7e4ac518f051b7f5cdce7',
    name: 'lanirbs',
    full_name: 'lanirbs',
    email: 'lanirbs@102.gov.il',
    role: 'admin'
  }
};

export function MockUserProvider({ children }) {
  const [activeMockUser, setActiveMockUser] = useState(null);

  const switchMockUser = (userType) => {
    setActiveMockUser(userType ? MOCK_USERS[userType] : null);
  };

  return (
    <MockUserContext.Provider value={{ activeMockUser, switchMockUser, MOCK_USERS }}>
      {children}
    </MockUserContext.Provider>
  );
}

export function useMockUser() {
  const context = useContext(MockUserContext);
  if (!context) {
    throw new Error('useMockUser must be used within MockUserProvider');
  }
  return context;
}