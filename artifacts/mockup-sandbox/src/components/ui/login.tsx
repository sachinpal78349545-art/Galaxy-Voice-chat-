import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

function Login() {

  const login = () => {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
  };

  return (
    <div>
      <h1>Login Page</h1>
      <button onClick={login}>Login with Google</button>
    </div>
  );
}

export default Login;