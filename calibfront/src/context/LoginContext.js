import { createContext, useContext, useState } from "react";

const LoginContext = createContext();
export const LoginProvider = ({ children }) => {
  const [showLogin, setShowLogin] = useState(false);
  const openLoginModal = () => setShowLogin(true);
  const closeLoginModal = () => setShowLogin(false);

  return (
    <LoginContext.Provider value={{
      showLogin,
      setShowLogin,
      openLoginModal,
      closeLoginModal
    }}>
      {children}
    </LoginContext.Provider>
  );
};

export const useLoginModal = () => useContext(LoginContext);