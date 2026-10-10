import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { recordPage } from '@/lib/navigationTrail';

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const location = useLocation();
  const { pathname, hash } = location;
  const navigationType = useNavigationType();
  useEffect(() => { recordPage(location, navigationType); }, [location, navigationType]);

  useEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}