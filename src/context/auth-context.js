"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        console.warn("Failed to fetch user:", response.status);
        setUser(null);
        return;
      }
      const data = await response.json();
      setUser(data?.user ?? null);
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isLoaded,
      isSignedIn: Boolean(user),
      refreshUser,
      signOut,
    }),
    [user, isLoaded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Auth hooks must be used inside AuthProvider");
  }
  return context;
};

export const useUser = () => {
  const { user, isLoaded, isSignedIn, refreshUser } = useAuth();
  return { user, isLoaded, isSignedIn, refreshUser };
};

export const useClerk = () => {
  const { user, signOut } = useAuth();
  return { user, signOut };
};

export const UserButton = ({ afterSignOutURL = "/" }) => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    return null;
  }

  const onSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      // Small delay to ensure cookie is cleared and state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      router.push(afterSignOutURL);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <img
        src={user.imageUrl}
        alt={user.fullName}
        className="h-9 w-9 rounded-full object-cover border"
      />
      <Button variant="outline" onClick={onSignOut} disabled={isSigningOut}>
        {isSigningOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
};
