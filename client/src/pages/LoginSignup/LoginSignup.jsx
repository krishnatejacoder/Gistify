import styles from "../../components/modularCSS/LoginSignup.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import "./LoginSignup.css";
import { useState, useContext, useEffect, useRef } from "react";
import Eye from "../../assets/icons/eye/eye.svg?react";
import EyeSlash from "../../assets/icons/eye/eyeSlash.svg?react";
import { AuthContext } from "../../context/AuthContext/AuthContext";
import { notifySuccess, notifyError, notifyInfo, notifyWarn } from "../../components/Toast/Toast";
import Loading from "../../components/loading/Loading";
import axios from "axios";

function isAuthorized(users, providedUsername, providedPassword){
  const userExists = users.find(user => {
    return user.username === providedUsername && user.password === providedPassword;
  });
  return !!userExists;
}

export default function LoginSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginContext = useContext(AuthContext);
  const [fadeOutTimer, setFadeOutTimer] = useState();
  const containerRef = useRef();

  const validUsers = [{
    username: "shah",
    password: "1234"
  }]

  const [test, setTest] = useState({
    oneLower: false,
    oneDigit: false,
    ln: false,
    oneUpper: false,
    oneSpecial: false,
  });

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
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username: loginFormData.username,
        password: loginFormData.password,
      });

      // console.log(res);

      if (res && res.data) {
        notifySuccess("Login Successful");
        setTimeout(() => {
          setLoading(false);
          loginContext.login({username: res.data.username, email: res.data.email, userId: res.data.userId });
          localStorage.setItem('accessToken', res.data.token);
          console.log(localStorage.getItem('accessToken'))
          navigate("/dashboard");
        }, 500);
      }
    } catch (err) {
      setLoading(false);
      notifyError(err.response?.data?.error || "Login Failed");
    }
  };  
  
  
  const handleSignup = async () => {
    setLoading(true);
    if (!(signupFormData.password === signupFormData.confirmPassword)) {
      notifyError("Confirm Password and Password must be the same");
      setLoading(false);
      return;
    }
  
    if (!(test.oneLower && test.oneDigit && test.ln && test.oneUpper && test.oneSpecial)) {
      notifyError("Please match the password format");
      setLoading(false);
      return;
    }
  
    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup", {
        username: signupFormData.username,
        email: signupFormData.email,
        password: signupFormData.password,
      });
  
      notifySuccess("Signup Successful");
      setTimeout(() => {
        setLoading(false);
        loginContext.login({ username: signupFormData.username });
        console.log(res.data.token)
        localStorage.setItem('accessToken', res.data.token);
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      setLoading(false);
      notifyError(err.response?.data?.error || "Signup Failed");

      // console.log(err.response.data);
    }
  }

  const handleNavigate = (toLocation) => {
    console.log(containerRef.current.classList)
    navigate(toLocation);
  }
  

  useEffect(() => {
    if (/[a-z]/.test(signupFormData.password)) {
      setTest((cur) => ({...cur, oneLower:true}))
    } else {
      setTest((cur) => ({...cur, oneLower:false}))
    }

    if (/[1-9]/.test(signupFormData.password)) {
      setTest((cur) => ({...cur, oneDigit:true}))
    } else {
      setTest((cur) => ({...cur, oneDigit:false}))
    }

    if (
      signupFormData.password.length >= 8 &&
      signupFormData.password.length <= 15
    ) {
      setTest((cur) => ({...cur, ln:true}))
    } else {
      setTest((cur) => ({...cur, ln:false}))
    }

    if (/[A-Z]/.test(signupFormData.password)) {
      setTest((cur) => ({...cur, oneUpper:true}))
    } else {
      setTest((cur) => ({...cur, oneUpper:false}))
    }

    if (/[@$#!%*?&]/.test(signupFormData.password)) {
      setTest((cur) => ({...cur, oneSpecial:true}))
    } else {
      setTest((cur) => ({...cur, oneSpecial:false}))
    }
  }, [signupFormData]);

  return (
    <>
      <div className={`${location.pathname === "/login" ? 'loginContainer' : 'signupContainer'} loginSignupContainer`}>
      {loading ? (
        <Loading val={location.pathname === "/login" ? "Logging In" : "Signing Up"} />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (location.pathname === "/login") {
              handleLogin();
            } else {
              if(!(signupFormData.password === signupFormData.confirmPassword)){
                notifyError("Confirm Password and Password must be same");
              }
              else if(!(test.oneLower && test.oneDigit && test.ln && test.oneUpper && test.oneSpecial)) {
                notifyError("Please match the password format");
              }
              else{
                handleSignup();
              }
            }
          }}
        >
          <p className={`${styles.title} piazzolla-bold`}>Welcome to Gistify</p>
          <div className={styles.toggle}>
            <div 
              className={styles.toggleOverlay} 
              style={{
                transform: location.pathname === "/login" 
                  ? "translateX(0px)" 
                  : "translateX(calc(100% - 5px))"
              }}
            ></div>
            <p
              className={`${styles.toggleLogin} toggle ${location.pathname == "/login" ? "active" : ""} baloo-2-regular`}
              onClick={() => handleNavigate("/login")}
            >
              Login
            </p>
            <p
              className={`${styles.toggleSignUp} toggle ${location.pathname == "/signup" ? "active" : ""} baloo-2-regular`}
              onClick={() => handleNavigate("/signup")}
            >
              Signup
            </p>
          </div>

          <div ref={containerRef} className="innerContainer">
            {location.pathname === "/login" ? (
              <>
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
                  <div className={`${styles.inpLabelContainer} inpActiveUsername baloo-2-regular`}>
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
                    required
                    onChange={(e) =>
                      setLoginFormData((cur) => ({ ...cur, password: e.target.value }))
                    }
                  />
                  <div className={`${styles.inpLabelContainer} inpActivePassword baloo-2-regular`}>
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
                  <p className={styles.dontCTA} onClick={() => handleNavigate("/signup")}>
                    SignUp
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={`${styles.inputWrapper}`}>
                  <input
                    placeholder="Username"
                    className={`${styles.inputBoxSignup} baloo-2-regular ${styles.inpBoxUsername}`}
                    type="text"
                    name="username"
                    id="username"
                    value={signupFormData.username}
                    required
                    onChange={(e) =>
                      setSignupFormData((cur) => ({ ...cur, username: e.target.value }))
                    }
                  />
                  <div className={`${styles.inpLabelContainer} inpActiveUsername baloo-2-regular`}>
                    <p>Username</p>
                  </div>
                </div>
                <div className={styles.inputWrapper}>
                  <input
                    placeholder="Email"
                    className={`${styles.inputBoxSignup} baloo-2-regular ${styles.inpBoxEmail}`}
                    type="email"
                    name="email"
                    id="email"
                    value={signupFormData.email}
                    required
                    onChange={(e) =>
                      setSignupFormData((cur) => ({ ...cur, email: e.target.value }))
                    }
                  />
                  <div className={`${styles.inpLabelContainer} inpActiveEmail baloo-2-regular`}>
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
                    required
                    onChange={(e) =>
                      setSignupFormData((cur) => ({ ...cur, password: e.target.value }))
                    }
                  />
                  <div className={`${styles.inpLabelContainer} inpActivePassword signup baloo-2-regular`}>
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
                <div className={`${styles.directionsPassword} directionsPassword  baloo-2-medium`}>
                  <div>
                    <p style={test.oneLower ? { color: "var(--success-color)" } : { color: "var(--danger-color)" }}>
                      Atleast one lowercase
                    </p>
                    <p style={test.oneDigit ? { color: "var(--success-color)" } : { color: "var(--danger-color)" }}>
                      Atleast one digit
                    </p>
                    <p style={test.ln ? { color: "var(--success-color)" } : { color: "var(--danger-color)" }}>
                      8 to 15 characters long
                    </p>
                  </div>
                  <div>
                    <p style={test.oneUpper ? { color: "var(--success-color)" } : { color: "var(--danger-color)" }}>
                      Atleast one uppercase
                    </p>
                    <p style={test.oneSpecial ? { color: "var(--success-color)" } : { color: "var(--danger-color)" }}>
                      Atleast one special character: @$#!%*?&
                    </p>
                  </div>
                </div>
                <div className={styles.inputWrapper}>
                  <input
                    placeholder="Confirm Password"
                    className={`${styles.inputBoxSignup} baloo-2-regular ${styles.inpBoxConfirmPassword}`}
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    id="confirmPassword"
                    value={signupFormData.confirmPassword}
                    required
                    onChange={(e) =>
                      setSignupFormData((cur) => ({
                        ...cur,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                  <div className={`${styles.inpLabelContainer} inpActiveConfirmPassword baloo-2-regular`}>
                    <p>Confirm Password</p>
                  </div>
                </div>
                <div className={`${styles.dontMsgContainer} baloo-2-medium`}>
                  <p className={styles.dont}>Already have an account?</p>
                  <p className={styles.dontCTA} onClick={() => handleNavigate("/login")}>
                    Login
                  </p>
                </div>
              </>
            )}
          </div>
          <div className={styles.buttonWrapper}>
            <button className={`${styles.buttonCTA} baloo-2-semiBold`}>
              {location.pathname === "/login" ? "Login" : "Signup"}
            </button>
          </div>
        </form>
      )}
      </div>
    </>
  );
}