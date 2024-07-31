import React, {useEffect, useState} from "react";


export default function Dice({playInProgress, lastWonNumber}) {
  let [toShow, setToShow] = useState(1);

  // simple animation
  useEffect(() => {
    const interval = setInterval(function () {
      if (playInProgress) {
        setToShow((prevState => 1 + prevState % 6))
      }
    }, 200);
    return () => {
      clearTimeout(interval);
    }
  }, [playInProgress])

  if (lastWonNumber !== undefined) {
    toShow = parseInt(lastWonNumber);
  }

  return <div style={{width: '64px', height: '64px', margin: 'auto'}}>
    <img src={'/1_dot.png'} width={'100%'} style={{ display: toShow === 1 ? "block" : "none" }} />
    <img src={'/2_dots.png'} width={'100%'} style={{ display: toShow === 2 ? "block" : "none" }} />
    <img src={'/3_dots.png'} width={'100%'} style={{ display: toShow === 3 ? "block" : "none" }} />
    <img src={'/4_dots.png'} width={'100%'} style={{ display: toShow === 4 ? "block" : "none" }} />
    <img src={'/5_dots.png'} width={'100%'} style={{ display: toShow === 5 ? "block" : "none" }} />
    <img src={'/6_dots.png'} width={'100%'} style={{ display: toShow === 6 ? "block" : "none" }} />
  </div>
}