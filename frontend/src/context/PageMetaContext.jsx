import { createContext, useContext, useState } from "react";

/* Lets a deeply-nested route (e.g. NotFound) signal facts about itself up to
   layout chrome (Topbar's breadcrumb) that has no router-independent way to
   know it — this app uses declarative <BrowserRouter>, so hooks like
   useMatches() that need a data router (createBrowserRouter) aren't available. */
const PageMetaContext = createContext({ notFound: false, setNotFound: () => {} });

export function PageMetaProvider({ children }) {
  const [notFound, setNotFound] = useState(false);
  return (
    <PageMetaContext.Provider value={{ notFound, setNotFound }}>
      {children}
    </PageMetaContext.Provider>
  );
}

export const usePageMeta = () => useContext(PageMetaContext);
