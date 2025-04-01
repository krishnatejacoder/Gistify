import React, { useState } from 'react'
import MarkDownButton from './MarkDownButton';
import { IoSend } from "react-icons/io5";
import './GistIt_Chatbot.css';
export default function GistIt_Chatbot() {
    const[isOpenMenu,setOpenMenu] = useState(false);
    const options = ["MarkDown","PDF","Docx"];
    return (
        <div className='chatbot_container'>
            <div className="chatbot_left">
                <div className="top_heading_chatbot">
                    <h2>Gist</h2>
                </div>
                <div className="content_section_chatbot">
                    <div className="menu_button_gist">
                        <div className="menu_editing">
                            <button onClick={() => (setOpenMenu((cur) => !cur))} className='but_style menu_dots'><span>...</span></button>
                        </div>
                        <div className='markdown'>
                            {
                                isOpenMenu && <MarkDownButton options={options} />
                            }
                        </div>
                    </div>
                </div>
            </div>
            <div className="chatbot_right">
               
                <div className="dummy">
                    <div className="top_heading_right_chatbot">
                        <h2>Chat</h2>
                        <button className='but_style back'>Back</button>
                    </div>
                </div> 
                <div className='chat_container'>
                        <div className='user_message'>
                            <p>What are the main formulae used in this paper</p>
                        </div>
                        <div className='chatting'>

                         </div>
                         <div className='prompt_section'>
                                <input className='prompt' type="text" placeholder='keep question coming...'/>
                                <span className='sendicon'><IoSend className='send'/></span>
                         </div>
                </div>
                


            </div>
        </div>
    )
}
