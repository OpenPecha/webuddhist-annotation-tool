// UserbackProvider.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import Userback from '@userback/widget';
import { useAuth0 } from '@auth0/auth0-react';

interface UserbackProviderProps {
  children: React.ReactNode;
}

interface UserbackContextType {
  userback: any;
}

const UserbackContext = createContext<UserbackContextType>({ userback: null });

export const UserbackProvider: React.FC<UserbackProviderProps> = ({ children }) => {
  const [userback, setUserback] = useState<any>(null);
 const {user:currentUser} = useAuth0();
  useEffect(() => {
    if(!currentUser) return;
    const usebackId = import.meta.env.VITE_USERBACK_ID||"";
    const init = async () => {
      try {
        const options = {
          user_data: {
            id: currentUser?.id||'anonymous',
            info: {
              name: currentUser?.name||'Anonymous User',
              email: currentUser?.email || ''
            }
          }
        };
        const instance = await Userback(usebackId, options);
 
        setUserback(instance);
        
        
      } catch (error) {
        console.error('Failed to initialize Userback:', error);
        // Add more detailed error information
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack,
          userbackId: usebackId,
          userData: currentUser
        });
      }
    };
    
    init();
  }, [currentUser]);

  const contextValue = useMemo(() => ({ userback }), [userback]);

  return (
    <UserbackContext.Provider value={contextValue}>
      {children}
    </UserbackContext.Provider>
  );
};

export const useUserback = () => useContext(UserbackContext);


