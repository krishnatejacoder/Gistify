import "./Loading.css";

export default function Loading({ val }) {
  return (
    <div className="loadingContainer piazzolla-bold">
      <span>{val}</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <radialGradient
          id="a6"
          cx=".66"
          fx=".66"
          cy=".3125"
          fy=".3125"
          gradientTransform="scale(1.5)"
        >
          <stop offset="0" stopColor="#0500A5" />
          <stop offset=".3" stopColor="#0500A5" stopOpacity=".9" />
          <stop offset=".6" stopColor="#0500A5" stopOpacity=".6" />
          <stop offset=".8" stopColor="#0500A5" stopOpacity=".3" />
          <stop offset="1" stopColor="#0500A5" stopOpacity="0" />
        </radialGradient>
        <circle
          transformOrigin="center"
          fill="none"
          stroke="url(#a6)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray="200 1000"
          strokeDashoffset="0"
          cx="100"
          cy="100"
          r="70"
        >
          <animateTransform
            type="rotate"
            attributeName="transform"
            calcMode="spline"
            dur="2s"
            values="360;0"
            keyTimes="0;1"
            keySplines="0 0 1 1"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          transformOrigin="center"
          fill="none"
          opacity=".2"
          stroke="#0500A5"
          strokeWidth="13"
          strokeLinecap="round"
          cx="100"
          cy="100"
          r="70"
        />
      </svg>
    </div>
  );
}
