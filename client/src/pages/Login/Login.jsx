import styles from '../../components/modularCSS/LoginSignup.module.css';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { useState } from 'react';

export default function Login(){
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
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
        </div>
        <div className={`${styles.dontMsgContainer} baloo-2-medium`}>
          <p className={styles.dont}>Don't have an account?</p>
          <p className={styles.dontCTA}>SignUp</p>
        </div>
        <div className={`${styles.buttonCTA} baloo-2-semiBold `}>
          <p>Login</p>
        </div>
      </form>
    </div>
  );
}