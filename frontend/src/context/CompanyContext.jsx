import { createContext, useContext, useState, useEffect } from "react";

const CompanyContext = createContext();

export function CompanyProvider({ children }) {

  const [company, setCompany] = useState(null);

  // โหลด company ตอน refresh
  useEffect(() => {
    const saved = localStorage.getItem("company");
    if (saved) setCompany(JSON.parse(saved));
  }, []);

  // เลือกบริษัท
  const selectCompany = (c) => {
    setCompany(c);
    localStorage.setItem("company", JSON.stringify(c));
  };

  return (
    <CompanyContext.Provider value={{ company, selectCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);