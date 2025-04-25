import React, { createContext, useState, useEffect, useContext } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  // Handle user state changes
  function onAuthStateChanged(user: FirebaseAuthTypes.User | null) {
    console.log("Auth state changed:", user ? "User logged in" : "No user");
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    try {
      const subscriber = auth().onAuthStateChanged(onAuthStateChanged);

      // Safety timeout to ensure initializing is set to false
      const timeoutId = setTimeout(() => {
        if (initializing) {
          console.log("Auth initialization timed out, forcing completion");
          setInitializing(false);
        }
      }, 3000);

      return () => {
        subscriber(); // unsubscribe on unmount
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("Error setting up auth state listener:", error);
      setInitializing(false); // Make sure to set initializing to false on error
      return () => {}; // Return empty cleanup function
    }
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      await auth().signInWithEmailAndPassword(email, pass);
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error; // Re-throw to handle in UI
    }
  };

  const signup = async (email: string, pass: string) => {
    try {
      await auth().createUserWithEmailAndPassword(email, pass);
    } catch (error: any) {
      console.error("Signup failed:", error);
      throw error; // Re-throw to handle in UI
    }
  };

  const logout = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const value = {
    user,
    initializing,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
