import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isAdmin: false, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // Use getDocFromServer for initial check to avoid offline hang
          const userDoc = await getDocFromServer(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          const isDefaultAdmin = user.email === 'jeremyabiera72@gmail.com';
          const hasAdminRole = userData?.role === 'admin';
          
          setIsAdmin(isDefaultAdmin || hasAdminRole);
        } catch (error) {
          console.warn("Failed to reach Firestore for admin check, falling back to email check:", error);
          // Fallback to email-only check if network is down
          setIsAdmin(user.email === 'jeremyabiera72@gmail.com');
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
