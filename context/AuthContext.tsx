import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  // Handle user state changes
  function onAuthStateChanged(user: FirebaseAuthTypes.User | null) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
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
