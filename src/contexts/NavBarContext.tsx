import { createContext, useContext, useState, ReactNode } from "react";

interface NavBarContextType {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const NavBarContext = createContext<NavBarContextType | undefined>(undefined);

export function NavBarProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <NavBarContext.Provider value={{ actions, setActions }}>
      {children}
    </NavBarContext.Provider>
  );
}

export function useNavBarActions() {
  const context = useContext(NavBarContext);
  if (context === undefined) {
    throw new Error("useNavBarActions must be used within a NavBarProvider");
  }
  return context;
}
