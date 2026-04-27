import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export const addXP = async (user, amount) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      xp: amount,
      level: Math.floor(amount / 100),
    });
    return;
  }

  const data = snap.data();
  const newXP = (data.xp || 0) + amount;

  await updateDoc(ref, {
    xp: newXP,
    level: Math.floor(newXP / 100),
  });
};
