import React, {useEffect, useState} from "react";


export default function Message({message, nonce}) {
  let [opacity, setOpacity] = useState(0);
  let [messageToShow, setMessageToShow] = useState('');

  useEffect(() => {
    let counter = 0;
    let interval = setInterval(() => {
      counter++;
      if (counter > 10)
        clearInterval(interval);
      setOpacity(prev => prev < 1 ? prev + 0.1 : 1);
    }, 100);
    setOpacity(0);
    setMessageToShow('');
    return () => {
      clearInterval(interval);
    }
  }, [nonce]);

  return <span style={{opacity: opacity.toString()}}>
    {message}
  </span>
}