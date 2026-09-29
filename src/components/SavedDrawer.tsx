import { Download, Music2, Trash2, X } from "lucide-react";
import { useCallback, useRef } from "react";
import type { Composition } from "../lib/music";
import { useDialogFocus } from "../lib/dialogFocus";
import { Button } from "./Button";

export interface SavedMinuet extends Composition { id: string; name: string; savedAt: number }
export function SavedDrawer({open,onClose,saves,onLoad,onRename,onDelete,onDownload}:{open:boolean;onClose:()=>void;saves:SavedMinuet[];onLoad:(item:SavedMinuet)=>void;onRename:(item:SavedMinuet)=>void;onDelete:(item:SavedMinuet)=>void;onDownload:(item:SavedMinuet)=>void}){
  const ref=useRef<HTMLElement>(null);const close=useCallback(onClose,[onClose]);useDialogFocus(open,ref,close);if(!open)return null;
  return <div className="drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><section ref={ref} className="saved-drawer" role="dialog" aria-modal="true" aria-labelledby="saved-title"><div className="drawer-head"><div><p className="kicker">Private collection</p><h2 id="saved-title">Saved on this device</h2></div><Button variant="ghost" onClick={close} aria-label="Close saved minuets"><X/></Button></div><p>These stay in this browser. No account, no cloud sync.</p>{saves.length===0?<p className="drawer-empty">No saved minuets yet.</p>:<ul className="saved-list">{saves.map(item=><li key={item.id}><button className="saved-name" onClick={()=>{onLoad(item);close()}}><Music2/><span><b>{item.name}</b><small>{new Date(item.savedAt).toLocaleDateString()} · ♪ {item.tempo}</small></span></button><button onClick={()=>onRename(item)}>Rename</button><button onClick={()=>onDownload(item)} aria-label={`Download ${item.name}`}><Download/></button><button onClick={()=>onDelete(item)} aria-label={`Delete ${item.name}`}><Trash2/></button></li>)}</ul>}</section></div>;
}