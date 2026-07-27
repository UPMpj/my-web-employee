import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { usePageMeta } from "../../context/PageMetaContext";
import EmptyState from "../../components/EmptyState";
import "./notfound.css";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setNotFound } = usePageMeta();

  useEffect(() => {
    setNotFound(true);
    return () => setNotFound(false);
  }, [setNotFound]);

  return (
    <div className="nf-page">
      <EmptyState
        type="search"
        title={t("notfound_title")}
        message={t("notfound_msg")}
        action={
          <button className="nf-btn" onClick={() => navigate("/dashboard")}>
            {t("notfound_button")}
          </button>
        }
      />
    </div>
  );
}
