import { useEffect, useState } from "react";
import { auth } from "./lib/firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Handle Google redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Google Login Success");
        }
      })
      .catch((err) => console.log(err));

    // Check login state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        window.location.href = "/home"; // ✅ go to home
      } else {
        window.location.href = "/login"; // ✅ go to login
      }
      setLoading(false);
    });

    return () => unsubscribe();

  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return null;
}

export default App;