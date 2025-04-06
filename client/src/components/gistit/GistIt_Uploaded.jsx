import React, { useState } from 'react';
import pdf from '../../assets/PDF.svg';
import { MdOutlineModeEditOutline } from "react-icons/md";
import { TfiReload } from "react-icons/tfi";
import fil from "../../assets/image.png";
import './GistIt_Upload.css';
import { useNavigate } from 'react-router-dom';
import MarkDownButton from './MarkDownButton';

function GistIt_Uploaded() {
    const[isOpenMenu,setOpenMenu] = useState(false);
    const options = ["Download","Save to"];
    const navigate = useNavigate();

    const handleClick= ()=>{
        navigate("/chatbot");
    }

    return (
        <div className='outer_upload_container'>
            <div className='left_items'>
                <div className="top_heading">
                    <div className='open_file_left'>
                        <img src={pdf} alt="" width={21.7} height={27} />
                        <p>Reinstating ReLU Activation in LLM.pdf</p>
                        <MdOutlineModeEditOutline className='edit' />
                    </div>
                    <div className="menu_editing">
                        <button onClick={()=>(setOpenMenu((cur)=>!cur))} className='but_style menu_dots'><span>...</span></button>
                    </div>
                    <div className='markdown'>
                        {
                                isOpenMenu && <MarkDownButton options={options}/>
                        }
                    </div>
                </div>
                <div className="file_opened_view">
                    <div className="file_container">
                        <img src={fil} alt="" width={410} height={529}/>
                    </div>
                </div>
            </div>
            <div className='right_items'>
                <div className="top_right_heading">
                    <div className="left_text">
                        <p >Gist</p>
                        <p>Concise</p>
                        <p>March 9,2025</p>
                    </div>
                    <div className="right_text">
                        <button className='but_style back'>Back</button>
                    </div>
                </div>
                <div className='mid_content'>
                    
                </div>  
                <div className="bottom_content">
                    <div className="left_bottom_content">
                        <div className='menu_editing'>
                            <button className='but_style menu_dots'><span>...</span></button>
                        </div>
                        <button className='but_style retry'><TfiReload className='reloading' /></button>
                    </div>
                    <div className="right_bottom_content">
                        <button onClick={handleClick} className='but_style bottom_but back continue'>Continue to Chat Bot</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GistIt_Uploaded