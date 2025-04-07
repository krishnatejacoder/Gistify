import styles from '../../components/modularCSS/LoginSignup.module.css';
import { useLocation, useNavigate } from 'react-router-dom';
import './LoginSignup.css';
import { useState } from 'react';
import Eye from '../../assets/icons/eye/eye.svg?react';
import EyeSlash from '../../assets/icons/eye/eyeSlash.svg?react';

export default function LoginSignup(){
  const navigate = useNavigate();
  const location = useLocation();
  const [loginFormData, setLoginFormData] = useState({
    username: "",
    password: ""
  });
  const [signupFormData, setSignupFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false);


  return location.pathname === "/login" ? 
  (
    <div className={styles.loginContainer}>
      <form onSubmit={() => {

      }}>
        <p className={`${styles.title} piazzolla-bold`}>Welcome to Gistify</p>
        <div className={styles.toggle}>
          <div className={styles.toggleOverlay}></div>
          <p style={{color: "black"}} className={`${styles.toggleLogin} baloo-2-semiBold loginToggle`} onClick={() => {navigate("/login")}}>Login</p>
          <p style={{color: "white"}} className={`${styles.toggleSignUp} baloo-2-semiBold signupToggle`} onClick={() => {navigate("/signup")}}>Signup</p>
          <p></p>
        </div>
        <div>
          <input placeholder='Username' className={`${styles.inputBox} baloo-2-regular ${styles.inpBoxUsername}`} type="text" name="username" id="username" value={loginFormData.username} onChange={(e) => setLoginFormData((cur) => ({...cur, username: e.target.value}))} />
          <div className={`${styles.inpLabelContainer } baloo-2-semiBold inpActiveUsername`}>
            <p>Username</p>
          </div>
        </div>
        <div>
          <input placeholder='Password' className={`${styles.inputBox} baloo-2-regular ${styles.inpBoxPassword}`} type={showPassword ? "text" : "password"} name="password" id="password" />
          <div className={`${styles.inpLabelContainer } baloo-2-semiBold inpActivePassword`}>
            <p>Password</p>
          </div>
          {showPassword ? (
            <Eye className={styles.eyeIcon} onClick={() => setShowPassword(false)} />
          ) : (
            <EyeSlash className={styles.eyeIcon} onClick={() => setShowPassword(true)} />
          )}
        </div>
        <div className={`${styles.dontMsgContainer} baloo-2-medium`}>
          <p className={styles.dont}>Don't have an account?</p>
          <p className={styles.dontCTA} onClick={() => navigate("/signup")}>SignUp</p>
        </div>
        <div className={`${styles.buttonCTA} baloo-2-semiBold `}>
          <p>Login</p>
        </div>
      </form>
    </div>
  ) : (
    <div className={styles.loginContainer}>
      <form action="">
        <p className={`${styles.title} piazzolla-bold`}>Welcome to Gistify</p>
        <div className={styles.toggle}>
          <div className={styles.toggleOverlay}></div>
          <p style={{color: "black"}} className={`${styles.toggleLogin} baloo-2-semiBold loginToggle`} onClick={() => {navigate("/login")}}>Login</p>
          <p style={{color: "white"}} className={`${styles.toggleSignUp} baloo-2-semiBold signupToggle`} onClick={() => {navigate("/signup")}}>Signup</p>
          <p></p>
        </div>
        <div>
          <input placeholder='Username' className={`${styles.inputBox} baloo-2-regular ${styles.inpBoxUsername}`} type="text" name="username" id="username" />
          <div className={`${styles.inpLabelContainer } baloo-2-semiBold inpActiveUsername`}>
            <p>Username</p>
          </div>
        </div>
        <div>
          <input placeholder='Password' className={`${styles.inputBox} baloo-2-regular ${styles.inpBoxPassword}`} type={showPassword ? "text" : "password"} name="password" id="password" />
          <div className={`${styles.inpLabelContainer } baloo-2-semiBold inpActivePassword`}>
            <p>Password</p>
          </div>
          {showPassword ? (
            <Eye className={styles.eyeIcon} onClick={() => setShowPassword(false)} />
          ) : (
            <EyeSlash className={styles.eyeIcon} onClick={() => setShowPassword(true)} />
          )}
        </div>
        <div className={`${styles.dontMsgContainer} baloo-2-medium`}>
          <p className={styles.dont}>Don't have an account?</p>
          <p className={styles.dontCTA} onClick={() => navigate("/signup")}>SignUp</p>
        </div>
        <div className={`${styles.buttonCTA} baloo-2-semiBold `}>
          <p>Login</p>
        </div>
      </form>
    </div>
  );
}