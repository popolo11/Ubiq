"use client";
import { useState } from "react";

type Extracted = {
  sourceUrl:string; shortcode:string; caption?:string; account?:string;
  location?:string; images:string[]; clues:string[]; attempts:string[];
};

export default function Home(){
  const [url,setUrl]=useState("");
  const [data,setData]=useState<Extracted|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function inspect(){
    setLoading(true); setError(""); setData(null);
    try{
      const r=await fetch("/api/extract",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url})});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Could not inspect post");
      setData(j);
    }catch(e:any){setError(e.message||"Could not inspect post")}finally{setLoading(false)}
  }
  return <main className="wrap">
    <div className="eyebrow">UBIQ · LOCATIONS</div>
    <h1>Instagram Location Intake</h1>
    <p className="sub">Paste a public Instagram post. UBIQ tries to recover the caption, account, location clues and carousel images so the property can be researched and added to All Locations.</p>
    <div className="bar"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." /><button onClick={inspect} disabled={!url||loading}>{loading?"Inspecting…":"Inspect post"}</button></div>
    {error&&<div className="error">{error}</div>}
    {data&&<section className="result">
      <div className="status"><span>Research lead</span><code>{data.shortcode}</code></div>
      <div className="grid">
        <div><label>Account</label><p>{data.account||"Not exposed"}</p></div>
        <div><label>Location</label><p>{data.location||"Not exposed"}</p></div>
      </div>
      <label>Caption / visible text</label><p className="caption">{data.caption||"Not exposed by available public sources."}</p>
      <label>Research clues</label><div className="chips">{data.clues.length?data.clues.map(x=><span key={x}>{x}</span>):<span>None recovered yet</span>}</div>
      <label>Recovered images</label>
      <div className="photos">{data.images.length?data.images.map((src,i)=><a href={src} target="_blank" rel="noreferrer" key={src+i}><img src={src} alt={`Instagram location reference ${i+1}`}/></a>):<div className="empty">No images recovered from public endpoints.</div>}</div>
      <details><summary>Extraction attempts</summary><ul>{data.attempts.map(x=><li key={x}>{x}</li>)}</ul></details>
    </section>}
  </main>
}