import{isChangeMessage as ne,isControlMessage as se}from"@electric-sql/client";import{MultiShapeStream as ae}from"@electric-sql/experimental";var te="subscriptions_metadata";async function H({pg:n,metadataSchema:o,subscriptionKey:e}){let a=await n.query(`
      SELECT key, shape_metadata, last_lsn
      FROM ${B(o)}
      WHERE key = $1
    `,[e]);if(a.rows.length===0)return null;if(a.rows.length>1)throw new Error(`Multiple subscriptions found for key: ${e}`);let u=a.rows[0];if(typeof u.last_lsn=="string")return{...u,last_lsn:BigInt(u.last_lsn)};throw new Error(`Invalid last_lsn type: ${typeof u.last_lsn}`)}async function Y({pg:n,metadataSchema:o,subscriptionKey:e,shapeMetadata:a,lastLsn:u,debug:b}){b&&console.log("updating subscription state",e,a,u),await n.query(`
      INSERT INTO ${B(o)}
        (key, shape_metadata, last_lsn)
      VALUES
        ($1, $2, $3)
      ON CONFLICT(key)
      DO UPDATE SET
        shape_metadata = EXCLUDED.shape_metadata,
        last_lsn = EXCLUDED.last_lsn;
    `,[e,a,u.toString()])}async function V({pg:n,metadataSchema:o,subscriptionKey:e}){await n.query(`DELETE FROM ${B(o)} WHERE key = $1`,[e])}async function J({pg:n,metadataSchema:o}){await n.exec(`
      SET ${o}.syncing = false;
      CREATE SCHEMA IF NOT EXISTS "${o}";
      CREATE TABLE IF NOT EXISTS ${B(o)} (
        key TEXT PRIMARY KEY,
        shape_metadata JSONB NOT NULL,
        last_lsn TEXT NOT NULL
      );
    `)}function B(n){return`"${n}"."${te}"`}async function Q({pg:n,table:o,schema:e="public",message:a,mapColumns:u,primaryKey:b,debug:m}){let f=u?U(u,a):a.value;switch(a.headers.operation){case"insert":{m&&console.log("inserting",f);let g=Object.keys(f);return await n.query(`
            INSERT INTO "${e}"."${o}"
            (${g.map(s=>'"'+s+'"').join(", ")})
            VALUES
            (${g.map((s,y)=>"$"+(y+1)).join(", ")})
          `,g.map(s=>f[s]))}case"update":{m&&console.log("updating",f);let g=Object.keys(f).filter(s=>!b.includes(s));return g.length===0?void 0:await n.query(`
            UPDATE "${e}"."${o}"
            SET ${g.map((s,y)=>'"'+s+'" = $'+(y+1)).join(", ")}
            WHERE ${b.map((s,y)=>'"'+s+'" = $'+(g.length+y+1)).join(" AND ")}
          `,[...g.map(s=>f[s]),...b.map(s=>f[s])])}case"delete":return m&&console.log("deleting",f),await n.query(`
            DELETE FROM "${e}"."${o}"
            WHERE ${b.map((g,s)=>'"'+g+'" = $'+(s+1)).join(" AND ")}
          `,[...b.map(g=>f[g])])}}async function G({pg:n,table:o,schema:e="public",messages:a,mapColumns:u,debug:b}){let m=a.map(t=>u?U(u,t):t.value);b&&console.log("inserting",m);let f=Object.keys(m[0]),g=t=>{if(t===null)return 0;if(t instanceof ArrayBuffer)return t.byteLength;if(t instanceof Blob)return t.size;if(t instanceof Uint8Array||t instanceof DataView||ArrayBuffer.isView(t))return t.byteLength;switch(typeof t){case"string":return t.length;case"number":return 8;case"boolean":return 1;default:return t instanceof Date?8:t?.toString()?.length||0}},s=t=>f.reduce((d,E)=>{let l=t[E];if(l===null)return d;if(Array.isArray(l)){if(l.length===0)return d;let _=l[0];switch(typeof _){case"number":return d+l.length*8;case"string":return d+l.reduce((j,$)=>j+$.length,0);case"boolean":return d+l.length;default:return _ instanceof Date?d+l.length*8:d+l.reduce((j,$)=>j+g($),0)}}return d+g(l)},0),y=32e3,I=50*1024*1024,O=async t=>{let d=`
      INSERT INTO "${e}"."${o}"
      (${f.map(l=>`"${l}"`).join(", ")})
      VALUES
      ${t.map((l,_)=>`(${f.map((j,$)=>"$"+(_*f.length+$+1)).join(", ")})`).join(", ")}
    `,E=t.flatMap(l=>f.map(_=>l[_]));await n.query(d,E)},c=[],h=0,P=0;for(let t=0;t<m.length;t++){let d=m[t],E=s(d),l=f.length;c.length>0&&(h+E>I||P+l>y)&&(b&&h+E>I&&console.log("batch size limit exceeded, executing batch"),b&&P+l>y&&console.log("batch params limit exceeded, executing batch"),await O(c),c=[],h=0,P=0),c.push(d),h+=E,P+=l}c.length>0&&await O(c),b&&console.log(`Inserted ${a.length} rows using INSERT`)}async function z({pg:n,table:o,schema:e="public",messages:a,mapColumns:u,debug:b}){b&&console.log("applying messages with json_to_recordset");let m=a.map(s=>u?U(u,s):s.value),f=(await n.query(`
        SELECT column_name, udt_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = $2
      `,[o,e])).rows.filter(s=>Object.prototype.hasOwnProperty.call(m[0],s.column_name)),g=1e4;for(let s=0;s<m.length;s+=g){let y=m.slice(s,s+g);await n.query(`
        INSERT INTO "${e}"."${o}"
        SELECT x.* from json_to_recordset($1) as x(${f.map(I=>`${I.column_name} ${I.udt_name.replace(/^_/,"")}`+(I.data_type==="ARRAY"?"[]":"")).join(", ")})
      `,[y])}b&&console.log(`Inserted ${a.length} rows using json_to_recordset`)}async function F({pg:n,table:o,schema:e="public",messages:a,mapColumns:u,debug:b}){b&&console.log("applying messages with COPY");let m=a.map(y=>u?U(u,y):y.value),f=Object.keys(m[0]),g=m.map(y=>f.map(I=>{let O=y[I];return typeof O=="string"&&(O.includes(",")||O.includes('"')||O.includes(`
`))?`"${O.replace(/"/g,'""')}"`:O===null?"\\N":O}).join(",")).join(`
`),s=new Blob([g],{type:"text/csv"});await n.query(`
      COPY "${e}"."${o}" (${f.map(y=>`"${y}"`).join(", ")})
      FROM '/dev/blob'
      WITH (FORMAT csv, NULL '\\N')
    `,[],{blob:s}),b&&console.log(`Inserted ${a.length} rows using COPY`)}function U(n,o){if(typeof n=="function")return n(o);let e={};for(let[a,u]of Object.entries(n))e[a]=o.value[u];return e}async function oe(n,o){let e=o?.debug??!1,a=o?.metadataSchema??"electric",u=[],b=new Map,m=!1,f=async()=>{m||(m=!0,await J({pg:n,metadataSchema:a}))},g=async({key:c,shapes:h,useCopy:P=!1,initialInsertMethod:t="insert",onInitialSync:d})=>{let E=!1;await f(),Object.values(h).filter(r=>!r.onMustRefetch).forEach(r=>{if(b.has(r.table))throw new Error("Already syncing shape for table "+r.table);b.set(r.table)});let l=null;c!==null&&(l=await H({pg:n,metadataSchema:a,subscriptionKey:c}),e&&l&&console.log("resuming from subscription state",l));let _=l===null;P&&t==="insert"&&(t="csv",console.warn("The useCopy option is deprecated and will be removed in a future version. Use initialInsertMethod instead."));let j=!_||t==="insert",$=!1,v=new Map(Object.keys(h).map(r=>[r,new Map])),k=new Map(Object.keys(h).map(r=>[r,BigInt(-1)])),x=new Set,K=l?.last_lsn??BigInt(-1),D=new AbortController;Object.values(h).filter(r=>!!r.shape.signal).forEach(r=>{r.shape.signal.addEventListener("abort",()=>D.abort(),{once:!0})});let R=new ae({shapes:Object.fromEntries(Object.entries(h).map(([r,L])=>{let S=l?.shape_metadata[r];return[r,{...L.shape,...S?{offset:S.offset,handle:S.handle}:{},signal:D.signal}]}))}),Z={json:z,csv:F,useCopy:F,insert:G},ee=async r=>{let L=new Map(Object.keys(h).map(S=>[S,[]]));for(let[S,w]of v.entries()){let i=L.get(S);for(let p of w.keys())if(p<=r){for(let T of w.get(p))i.push(T);w.delete(p)}}await n.transaction(async S=>{e&&console.time("commit"),await S.exec(`SET LOCAL ${a}.syncing = true;`);for(let[w,i]of L.entries()){let p=h[w],T=i;if(x.has(w)){if(e&&console.log("truncating table",p.table),p.onMustRefetch)await p.onMustRefetch(S);else{let M=p.schema||"public";await S.exec(`DELETE FROM "${M}"."${p.table}";`)}x.delete(w)}if(!j){let M=[],N=[],X=!1;for(let q of T)!X&&q.headers.operation==="insert"?M.push(q):(X=!0,N.push(q));M.length>0&&t==="csv"&&N.unshift(M.pop()),T=N,M.length>0&&(await Z[t]({pg:S,table:p.table,schema:p.schema,messages:M,mapColumns:p.mapColumns,debug:e}),j=!0)}let C=[],A=null,W=T.length;for(let M=0;M<W;M++){let N=T[M];N.headers.operation==="insert"?C.push(N):A=N,(A||M===W-1)&&(C.length>0&&(await G({pg:S,table:p.table,schema:p.schema,messages:C,mapColumns:p.mapColumns,debug:e}),C.length=0),A&&(await Q({pg:S,table:p.table,schema:p.schema,message:A,mapColumns:p.mapColumns,primaryKey:p.primaryKey,debug:e}),A=null))}}c&&await Y({pg:S,metadataSchema:a,subscriptionKey:c,shapeMetadata:Object.fromEntries(Object.keys(h).map(w=>[w,{handle:R.shapes[w].shapeHandle,offset:R.shapes[w].lastOffset}])),lastLsn:r,debug:e}),E&&await S.rollback()}),e&&console.timeEnd("commit"),d&&!$&&R.isUpToDate&&(d(),$=!0)};return R.subscribe(async r=>{if(E)return;e&&console.log("received messages",r.length),r.forEach(i=>{let p=k.get(i.shape)??BigInt(-1);if(ne(i)){let T=v.get(i.shape),C=typeof i.headers.lsn=="string"?BigInt(i.headers.lsn):BigInt(0);if(C<=p)return;let A=i.headers.last??!1;T.has(C)||T.set(C,[]),T.get(C).push(i),A&&k.set(i.shape,C)}else if(se(i))switch(i.headers.control){case"up-to-date":{if(e&&console.log("received up-to-date",i),typeof i.headers.global_last_seen_lsn!="string")throw new Error("global_last_seen_lsn is not a string");let T=BigInt(i.headers.global_last_seen_lsn);if(T<=p)return;k.set(i.shape,T);break}case"must-refetch":{e&&console.log("received must-refetch",i),v.get(i.shape).clear(),k.set(i.shape,BigInt(-1)),x.add(i.shape);break}}});let L=Array.from(k.values()).reduce((i,p)=>p<i?p:i),S=L>K,w=L>=K&&x.size>0;(S||w)&&(ee(L),await new Promise(i=>setTimeout(i)))}),u.push({stream:R,aborter:D}),{unsubscribe:()=>{e&&console.log("unsubscribing"),E=!0,R.unsubscribeAll(),D.abort();for(let r of Object.values(h))b.delete(r.table)},get isUpToDate(){return R.isUpToDate},streams:Object.fromEntries(Object.keys(h).map(r=>[r,R.shapes[r]]))}};return{namespaceObj:{initMetadataTables:f,syncShapesToTables:g,syncShapeToTable:async c=>{let h=await g({shapes:{shape:{shape:c.shape,table:c.table,schema:c.schema,mapColumns:c.mapColumns,primaryKey:c.primaryKey,onMustRefetch:c.onMustRefetch}},key:c.shapeKey,useCopy:c.useCopy,initialInsertMethod:c.initialInsertMethod,onInitialSync:c.onInitialSync});return{unsubscribe:h.unsubscribe,get isUpToDate(){return h.isUpToDate},stream:h.streams.shape}},deleteSubscription:async c=>{await V({pg:n,metadataSchema:a,subscriptionKey:c})}},close:async()=>{for(let{stream:c,aborter:h}of u)c.unsubscribeAll(),h.abort()}}}function me(n){return{name:"ElectricSQL Sync",setup:async o=>{let{namespaceObj:e,close:a}=await oe(o,n);return{namespaceObj:e,close:a}}}}export{me as electricSync};
//# sourceMappingURL=index.js.map