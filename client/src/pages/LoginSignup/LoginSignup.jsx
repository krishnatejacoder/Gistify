import styles from "../../components/modularCSS/LoginSignup.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import "./LoginSignup.css";
import { useState, useContext, useEffect } from "react";
import Eye from "../../assets/icons/eye/eye.svg?react";
import EyeSlash from "../../assets/icons/eye/eyeSlash.svg?react";
import { AuthContext } from "../../context/AuthContext/AuthContext";

export default function LoginSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginContext = useContext(AuthContext);

  const [loginFormData, setLoginFormData] = useState({
    username: "",
    password: "",
  });
  const [signupFormData, setSignupFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  return location.pathname === "/login" ? (
    <div className={styles.loginContainer}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginContext.login(loginFormData);
          navigate("/dashboard");
        }}
      >
        <p className={`${styles.title} piazzolla-bold`}>Welcome to Gistify</p>
        <div className={styles.toggle}>
          <div className={styles.toggleOverlay}></div>
          <p
            style={{ color: "black" }}
            className={`${styles.toggleLogin} baloo-2-semiBold loginToggle`}
            onClick={() => {
              navigate("/login");
            }}
          >
            Login
          </p>
          <p
            style={{ color: "white" }}
            className={`${styles.toggleSignUp} baloo-2-semiBold signupToggle`}
            onClick={() => {
              navigate("/signup");
            }}
          >
            Signup
          </p>
        </div>
        <div className={styles.inputWrapper}>
          <input
            placeholder="Username"
            className={`${styles.inputBoxLogin} baloo-2-regular ${styles.inpBoxUsername}`}
            type="text"
            name="username"
            id="username"
            value={loginFormData.username}
            onChange={(e) =>
              setLoginFormData((cur) => ({ ...cur, username: e.target.value }))
            }
          />
          <div
            className={`${styles.inpLabelContainer} baloo-2-semiBold inpActiveUsername`}
          >
            <p>Username</p>
          </div>
        </div>
        <div className={styles.inputWrapper}>
          <input
            placeholder="Password"
            className={`${styles.inputBoxLogin} baloo-2-regular ${styles.inpBoxPassword}`}
            type={showPassword ? "text" : "password"}
            name="password"
            id="password"
            value={loginFormData.password}
            onChange={(e) =>
              setLoginFormData((cur) => ({ ...cur, password: e.target.value }))
            }
          />
          <div
            className={`${styles.inpLabelContainer} baloo-2-semiBold inpActivePassword`}
          >
            <p>Password</p>
          </div>
          {showPassword ? (
            <Eye
              className={styles.eyeIcon}
              onClick={() => setShowPassword(false)}
            />
          ) : (
            <EyeSlash
              className={styles.eyeIcon}
              onClick={() => setShowPassword(true)}
            />
          )}
        </div>
        <div className={`${styles.dontMsgContainer} baloo-2-medium`}>
          <p className={styles.dont}>Don't have an account?</p>
          <p className={styles.dontCTA} onClick={() => navigate("/signup")}>
            SignUp
          </p>
        </div>
        <button className={`${styles.buttonCTA} baloo-2-semiBold `}>
          Login
        </button>
      </form>
    </div>
  ) : (
    <div className={`${styles.signupContainer} signupContainer`}>
      <form action="">
        <p className={`${styles.title} piazzolla-bold`}>Welcome to Gistify</p>
        <div className={styles.toggle}>
          <div className={styles.toggleOverlay}></div>
          <p
            style={{ color: "black" }}
            className={`${styles.toggleLogin} baloo-2-semiBold loginToggle`}
            onClick={() => {
              navigate("/login");
            }}
          >
            Login
          </p>
          <p
            style={{ color: "white" }}
            className={`${styles.toggleSignUp} baloo-2-semiBold signupToggle`}
            onClick={() => {
              navigate("/signup");
            }}
          >
            Signup
          </p>
        </div>

        <div className={styles.inputWrapper}>
          <input
            placeholder="Username"
            className={`${styles.inputBoxSignup} baloo-2-regular ${styles.inpBoxUsername}`}
            type="text"
            name="username"
            id="username"
            value={signupFormData.username}
            onChange={(e) =>
              setSignupFormData((cur) => ({ ...cur, username: e.target.value }))
            }
          />
          <div
            className={`${styles.inpLabelContainer} baloo-2-semiBold inpActiveUsername`}
          >
            <p>Username</p>
          </div>
        </div>

        <div className={styles.inputWrapper}>
          <input
            placeholder="Email"
            className={`${styles.inputBoxSignup} baloo-2-regular ${styles.inpBoxEmail}`}
            type="text"
            name="email"
            id="email"
            value={signupFormData.email}
            onChange={(e) =>
              setSignupFormData((cur) => ({ ...cur, email: e.target.value }))
            }
          />
          <div
            className={`${styles.inpLabelContainer} baloo-2-semiBold inpActiveEmail`}
          >
            <p>Email</p>
          </div>
        </div>

        <div className={styles.inputWrapper}>
          <input
            placeholder="Password"
            className={`${styles.inputBoxSignup} baloo-2-regular ${styles.inpBoxPasswordSignup}`}
            type={showPassword ? "text" : "password"}
            name="password"
            id="password"
            value={signupFormData.password}
            onChange={(e) =>
              setSignupFormData((cur) => ({ ...cur, password: e.target.value }))
            }
          />
          <div
            className={`${styles.inpLabelContainer} baloo-2-semiBold inpActivePassword`}
          >
            <p>Password</p>
          </div>
          {showPassword ? (
            <Eye
              className={styles.eyeIconSignup}
              onClick={() => setShowPassword(false)}
            />
          ) : (
            <EyeSlash
              className={styles.eyeIconSignup}
              onClick={() => setShowPassword(true)}
            />
          )}
        </div>

        <div className={styles.directionsPassword}></div>

        <div className={styles.inputWrapper}>
          <input
            placeholder="Confirm Password"
            className={`${styles.inputBoxSignup} baloo-2-regular ${styles.inpBoxConfirmPassword}`}
            type="text"
            name="confirmPassword"
            id="confirmPassword"
            value={signupFormData.confirmPassword}
            onChange={(e) =>
              setSignupFormData((cur) => ({
                ...cur,
                confirmPassword: e.target.value,
              }))
            }
          />
          <div
            className={`${styles.inpLabelContainer} baloo-2-semiBold inpActiveConfirmPassword`}
          >
            <p>Confirm Password</p>
          </div>
        </div>

        <div className={`${styles.dontMsgContainer} baloo-2-medium`}>
          <p className={styles.dont}>Don't have an account?</p>
          <p className={styles.dontCTA} onClick={() => navigate("/login")}>
            Login
          </p>
        </div>

        <div className={`${styles.buttonCTA} baloo-2-semiBold `}>
          <p>SignUp</p>
        </div>
      </form>
    </div>
  );
}
