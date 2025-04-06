import React from 'react'
import { useState } from 'react';
import "./MarkDownButton.css";

export default function MarkDownButton({ options }) {
    const [activeButton, setActiveButton] = useState(null);
    return (
        <div className='mark'>
            {
                options.map((label, index) => (
                    <button
                        key={index}
                        className="button_style"
                        style={activeButton === index ? {
                            backgroundColor: "#E9E9E9",
                            color: "black",
                        } : {}}
                        onClick={() => setActiveButton(index)}
                    >
                        {label}

                    </button>
                ))
            }
        </div>
    )
}
