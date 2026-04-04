import logo from "../assets/Logo.png"; 

export default function SplashScreen() {
  return (
    <div style={styles.container}>
      <img src={logo} alt="logo" style={styles.logo} />
      <h2 style={styles.text}>Galaxy Voice</h2>
      <div style={styles.loader}></div>
    </div>
  );
}

const styles: any = {
  container: {
    height: "100vh",
    width: "100%",
    background: "black",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },
  logo: {
    width: "140px",
    marginBottom: "20px"
  },
  text: {
    color: "white",
    fontSize: "20px",
    letterSpacing: "2px",
    fontWeight: "bold"
  },
  loader: {
    marginTop: "20px",
    width: "30px",
    height: "2px",
    background: "#3498db"
  }
};
