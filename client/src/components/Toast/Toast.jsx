import { useLocation } from "react-router-dom";
import { ToastContainer, toast, Bounce } from "react-toastify";
import styled from "styled-components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext/AuthContext";

export function notifySuccess(msg) {
  toast.success(msg, {
    position: "top-center",
    autoClose: 2500,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Bounce,
    className: "toast-success",
    bodyClassName: "toast-body-success",
  });
}

export function notifyError(msg) {
  toast.error(msg, {
    position: "top-center",
    autoClose: 2500,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Bounce,
    className: "toast-error",
    bodyClassName: "toast-body-error",
  });
}

export function notifyInfo(msg) {
  toast.info(msg, {
    position: "top-center",
    autoClose: 2500,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Bounce,
  });
}

export function notifyWarn(msg) {
  toast.warn(msg, {
    position: "top-center",
    autoClose: 2500,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Bounce,
  });
}

const StyledContainer = styled(ToastContainer)`
  &&&.Toastify__toast-container {
    top: ${(props) => (props.$hasNavbar ? "100px" : "20px")};
  }

  /* Default toast styles */
  .Toastify__toast {
    border-radius: 7px;
    overflow: hidden;
    backdrop-filter: blur(23px);
    box-shadow: 0px 0px 15px 1px rgba(0, 0, 0, 0.35);
    min-height: 35px;
    font-size: 15px;
    padding: 10px 33px 11px 13px;
    width: auto;
    z-index:4;
  }

  .Toastify__toast-icon{
    display: none;
  }
  
  .Toastify__close-button{
    position: absolute;
    top: 50%;
    transform: translateY(-40%) translateX(-14%);
    color: black;
  }

  .Toastify__close-button svg{
    fill: black;
  }

  .Toastify__toast-body {
    font-size: 15px;
    color:rgb(66, 66, 66);
    letter-spacing: 0%;
    margin: 0;
  }

  .Toastify__progress-bar--wrp{
    position: absolute;
    top: 0;
    left: 0;
    height: 3px; 
  }

  .Toastify__progress-bar {
    top: 0px;
    width: 100%;
    height: 100%;
    background-color:rgb(29, 29, 29);
    filter: brightness(200%);
    border-radius: 10px;
  }

  .toast-success {
    background-color: rgba(59, 220, 38, 0.75);
  }

  /* Error toast specific styles */
  .toast-error {
    background-color: rgba(248, 55, 55, 0.75);
    color: #fff;
  }
`;

export default function Toast() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [hasNavbar, setHasNavbar] = useState(false);
  const hiddenNavPages = ["/signup", "/login"];

  useEffect(() => {
    const newHasNavbar = !!user && !hiddenNavPages.includes(location.pathname);
    setHasNavbar(newHasNavbar);
    // console.log('hasNavbar state changed:', newHasNavbar, 'user:', !!user, 'path:', location.pathname);
  }, [location.pathname, user, hiddenNavPages]);

  return (
    <div className="baloo-2-semiBold">
      <StyledContainer
        position="top-center"
        autoClose={2500}
        limit={3}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
        $hasNavbar={hasNavbar}
      />
    </div>
  );
}
