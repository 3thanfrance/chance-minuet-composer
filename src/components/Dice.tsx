const patterns = ["c", "tl br", "tl c br", "tl tr bl br", "tl tr c bl br", "tl ml bl tr mr br"];
function Face({value,name,active}:{value:number;name:string;active:boolean}){return <span className={`die-face die-face-${name}${active?" die-face-active":""}`}>{patterns[value-1]?.split(" ").map((position,i)=><i key={i} className={`pip pip-${position}`}/>)}</span>}
export function Die({value,small=false,rolling=false,index=0}:{value:number;small?:boolean;rolling?:boolean;index?:number}){
  return <span className={`die-scene ${small?"die-small":""} ${rolling?"is-rolling":""}`} aria-label={`${value}`} role="img"><span className="die-cube" data-value={value} style={{"--die-delay":`${index*70}ms`} as React.CSSProperties}><Face value={1} name="front" active={value===1}/><Face value={6} name="back" active={value===6}/><Face value={2} name="right" active={value===2}/><Face value={5} name="left" active={value===5}/><Face value={3} name="top" active={value===3}/><Face value={4} name="bottom" active={value===4}/></span><i className="die-shadow"/></span>
}

export function DiceButton({values,rolling,onRoll,label="Roll a new minuet"}:{values:readonly[number,number];rolling:boolean;onRoll:()=>void;label?:string}){
  return <button className="dice-button" onClick={onRoll} disabled={rolling} aria-label={label}><span className="dice-stage"><Die value={values[0]} rolling={rolling}/><Die value={values[1]} rolling={rolling} index={1}/></span><span className="dice-action">{rolling?"Chance is turning…":label}</span></button>
}