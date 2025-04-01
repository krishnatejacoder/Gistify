import { useState } from 'react';
import { RxCross2 } from "react-icons/rx";
import { useNavigate } from 'react-router-dom';
import DragUpload from './DragUpload';
import pdf from '../../assets/PDF.svg';

import './GistIt.css';

export default function GistIt(){
    const navigate = useNavigate();
    const [activeButton,setActiveButton]= useState(null);
    const[activeOptionButton,setActiveOptionButton]=useState(null);
    const [files,setFiles] = useState([]);
    const buttons = ["PDF", "Text", "Link"];
    const option_buttons =["Concise","Analytical","Comphrehensive"];
    const handleClick=()=>{
        // if(files.length!=0)
        navigate('/gistit_uploaded');
        
    }

    return (
        <div className='outer_container'>
            <div className='middle_section'>

                <div className='title_section'>
                    <p className='heading'>Gistify your paper</p>
                    <p className='subheading'>Upload a PDF, paste text <span style={{color:"#434040"}}>or</span> paste hyperlink</p>
                </div>
                <div className="filt_toggle">
                    <div className="toggling">
                        {buttons.map((label, index) => (
                            <button
                                key={index}
                                className="but_style"
                                style={activeButton === index ?{
                                    backgroundColor:"#E9E9E9",
                                    color:"black",
                                }:{}}
                                onClick={() => setActiveButton(index)} 
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className='mid_container'>
                    <DragUpload onFileUpload={setFiles} />
                    <div className='files_opened'>
                        <div className='open_file'>
                            <div className='open_file_left'>
                                <img src={pdf} alt="" width={21.7} height={27}/>
                                <p>Reinstating ReLU Activation in LLM.pdf</p>
                            </div>
                            <div className='open_file_right'>
                            <span><RxCross2 className='cross' /></span>
                            </div>
                        </div>
                    </div>
                </div>
            
            </div>
            <div className='right_section'>
                <div className='wrapping_both'>

                    <div className='gist_options'>
                        {
                            option_buttons.map((label,index)=>(
                                <button
                                    key={index}
                                    className='but_style'
                                    style={activeOptionButton === index ?{
                                        backgroundColor:"#E9E9E9" ,
                                        color:"black",
                                        borderRadius:"8px",
                                    }:{}
                                    }
                                    onClick={()=>{setActiveOptionButton(index)}}
                                >
                                    {label}
                                </button>
                            ))
                        }
                    </div>
                    <div className='gistit_button'>
                        <button onClick={handleClick} className="but_style" style={{color:"black"}}>Gist IT!</button>
                    </div>
                </div>
            </div>

        </div>
    );
}