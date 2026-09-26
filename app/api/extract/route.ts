import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function uniq<T>(xs:T[]){ return [...new Set(xs)]; }
function clean(s:string){
  return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\\u0026/g,"&").trim();
}
function meta(html:string, property:string){
  const patterns=[
    new RegExp('<meta[^>]+property=["\\\']'+property+'["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\']','i'),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+property=["\\\']'+property+'["\\\']','i'),
    new RegExp('<meta[^>]+name=["\\\']'+property+'["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\']','i'),
  ];
  for(const p of patterns){ const m=html.match(p); if(m?.[1]) return clean(m[1]); }
}
function imageUrls(html:string){
  const found:string[]=[];
  const re=/(https?:\\/\\/[^"'<>\\s]+(?:jpg|jpeg|png|webp)(?:\\?[^"'<>\\s]*)?)/gi;
  let m; while((m=re.exec(html))){ found.push(clean(m[1].replace(/\\u0026/g,"&").replace(/\\\//g,"/"))); }
  const og=meta(html,"og:image"); if(og) found.unshift(og);
  return uniq(found).filter(u=>!/(logo|avatar|profile_pic|favicon)/i.test(u)).slice(0,24);
}
function cluesFrom(text:string){
  const handles=text.match(/@[A-Za-z0-9._]+/g)||[];
  const tags=text.match(/#[A-Za-z0-9_]+/g)||[];
  const urls=text.match(/https?:\\/\\/[^\\s<>"']+/g)||[];
  const locationWords=(text.match(/(?:located in|location:?|address:?|listed by|listing by|realtor|broker|architect|designed by|interiors by)[^.!?\\n]{0,120}/gi)||[]);
  return uniq([...handles,...tags,...urls,...locationWords].map(x=>clean(x))).slice(0,40);
}
async function grab(url:string,label:string,attempts:string[]){
  try{
    const r=await fetch(url,{redirect:"follow",cache:"no-store",headers:{
      "user-agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36",
      "accept-language":"en-US,en;q=0.9",
      "accept":"text/html,application/xhtml+xml"
    }});
    attempts.push(`${label}: HTTP ${r.status}`);
    if(!r.ok) return null;
    const html=await r.text();
    return {html,finalUrl:r.url};
  }catch(e:any){ attempts.push(`${label}: ${e?.message||"request failed"}`); return null; }
}

export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));
  const sourceUrl=String(body?.url||"").trim();
  const match=sourceUrl.match(/instagram\\.com\\/(?:p|reel)\\/([A-Za-z0-9_-]+)/i);
  if(!match) return NextResponse.json({error:"Paste a public Instagram post or reel URL."},{status:400});
  const shortcode=match[1];
  const canonical=`https://www.instagram.com/p/${shortcode}/`;
  const attempts:string[]=[];
  const pages:(Awaited<ReturnType<typeof grab>> & {})[]=[];
  const direct=await grab(canonical,"Instagram public page",attempts); if(direct) pages.push(direct);
  const mirror=await grab(`https://imginn.com/p/${shortcode}/`,"Imginn public mirror",attempts); if(mirror) pages.push(mirror);

  let caption="",account="",location="";
  let images:string[]=[]; let allText="";
  for(const p of pages){
    if(!p) continue;
    const title=meta(p.html,"og:title")||meta(p.html,"twitter:title")||"";
    const desc=meta(p.html,"og:description")||meta(p.html,"description")||meta(p.html,"twitter:description")||"";
    if(!caption && desc) caption=desc;
    if(!account){
      const h=(title+" "+desc).match(/@([A-Za-z0-9._]+)/); if(h) account="@"+h[1];
    }
    if(!location){
      const l=(title+" "+desc).match(/(?:at|in) ([A-Z][A-Za-z0-9 .,'&-]{3,70})(?:[|•·]|$)/); if(l) location=l[1].trim();
    }
    images.push(...imageUrls(p.html));
    allText+=" "+title+" "+desc+" "+p.html.slice(0,250000);
  }
  images=uniq(images).slice(0,20);
  const clues=cluesFrom((caption+" "+allText).slice(0,300000));
  return NextResponse.json({sourceUrl,shortcode,caption,account,location,images,clues,attempts});
}