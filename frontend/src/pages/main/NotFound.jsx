import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import EmptyState from "../../components/EmptyState";
import "./notfound.css";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useLanguage();

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
