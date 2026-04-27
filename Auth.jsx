import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "./firebase";
import { useLang } from "./useLang";

export default function Auth({ user }) {
  const { t } = useLang();

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const userLabel = user?.displayName || user?.email || t("defaultUser");

  return (
    <div style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
      {user ? (
        <>
          <span>👤 {userLabel}</span>
          <button onClick={logout}>{t("logout")}</button>
        </>
      ) : (
        <button onClick={login}>{t("loginGoogle")}</button>
      )}
    </div>
  );
}

