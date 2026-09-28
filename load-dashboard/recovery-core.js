/* Pure statistical routines. No independent-observation p-values for repeated games. */
(function(root){
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  const sd=a=>{if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
  function groups(rows,key='id'){const m=new Map();for(const r of rows){if(!m.has(r[key]))m.set(r[key],[]);m.get(r[key]).push(r);}return [...m.values()];}
  function corr(rows){if(rows.length<3)return null;const mx=mean(rows.map(r=>r.x)),my=mean(rows.map(r=>r.y));let a=0,b=0,c=0;for(const r of rows){a+=(r.x-mx)*(r.y-my);b+=(r.x-mx)**2;c+=(r.y-my)**2;}return b>1e-12&&c>1e-12?a/Math.sqrt(b*c):null;}
  function within(rows,keys=['x','y']){return groups(rows).filter(g=>g.length>=2).flatMap(g=>{const means=Object.fromEntries(keys.map(k=>[k,mean(g.map(r=>r[k]))]));return g.map(r=>({...r,...Object.fromEntries(keys.map(k=>[k,r[k]-means[k]]))}));});}
  function rm(rows){const clean=rows.filter(r=>finite(r.x)&&finite(r.y));return corr(within(clean));}
  function solve(a,b){a=a.map((r,i)=>[...r,b[i]]);const n=b.length;for(let i=0;i<n;i++){let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;if(Math.abs(a[pivot][i])<1e-9)return null;[a[i],a[pivot]]=[a[pivot],a[i]];let div=a[i][i];for(let k=i;k<=n;k++)a[i][k]/=div;for(let j=0;j<n;j++)if(j!==i){let f=a[j][i];for(let k=i;k<=n;k++)a[j][k]-=f*a[i][k];}}return a.map(r=>r[n]);}
  function ols(rows,keys){const p=keys.length;if(rows.length<p+4)return null;const a=Array.from({length:p},()=>Array(p).fill(0)),b=Array(p).fill(0);for(const r of rows)for(let i=0;i<p;i++){b[i]+=r[keys[i]]*r.y;for(let j=0;j<p;j++)a[i][j]+=r[keys[i]]*r[keys[j]];}const coef=solve(a,b);if(!coef)return null;const my=mean(rows.map(r=>r.y));let sse=0,sst=0;for(const r of rows){sse+=(r.y-keys.reduce((s,k,i)=>s+r[k]*coef[i],0))**2;sst+=(r.y-my)**2;}return {coef,r2:sst>0?1-sse/sst:null};}
  function model(rows,covs=[],between=false){
    const clean=rows.filter(r=>['x','y',...covs].every(k=>finite(r[k])));
    let work=between?clean:within(clean,['x','y',...covs]);
    if(work.length<10||groups(work).length<3)return null;
    const sx=sd(work.map(r=>r.x));if(!sx||sx<1e-9)return null;
    const used=covs.filter(k=>(sd(work.map(r=>r[k]))||0)>1e-9);
    const scales=Object.fromEntries(used.map(k=>[k,sd(work.map(r=>r[k]))]));
    work=work.map(r=>({...r,x:r.x/sx,one:1,...Object.fromEntries(used.map(k=>[k,r[k]/scales[k]]))}));
    const keys=['x',...used,...(between?['one']:[])];const result=ols(work,keys);if(!result)return null;
    const baseline=keys.length>1?ols(work,keys.slice(1)):null;
    return {effect:result.coef[0],r2:result.r2,deltaR2:result.r2-(baseline?.r2||0),n:work.length,athletes:groups(work).length,used,sx};
  }
  function bootstrap(rows,fn,reps=200){const gs=groups(rows);if(gs.length<6)return null;let seed=83123;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};const vals=[];for(let b=0;b<reps;b++){const sample=[];for(let k=0;k<gs.length;k++)for(const r of gs[Math.floor(rand()*gs.length)])sample.push({...r,id:String(k)});const v=fn(sample);if(finite(v))vals.push(v);}if(vals.length<reps*.8)return null;vals.sort((a,b)=>a-b);return [vals[Math.floor(vals.length*.025)],vals[Math.floor(vals.length*.975)]];}
  function paired(rows){const pairs=groups(rows).map(g=>({id:g[0].id,a:mean(g.filter(r=>r.tag==='D_-1').map(r=>r.y)),b:mean(g.filter(r=>r.tag==='D_+2/-1').map(r=>r.y))})).filter(r=>finite(r.a)&&finite(r.b));const dif=pairs.map(r=>r.b-r.a),spread=sd(dif);return {n:pairs.length,a:mean(pairs.map(r=>r.a)),b:mean(pairs.map(r=>r.b)),difference:mean(dif),dz:spread>1e-9?mean(dif)/spread:null,ci:bootstrap(pairs,s=>mean(s.map(r=>r.b-r.a)))};}
  root.RecoveryStats={finite,mean,sd,groups,corr,within,rm,model,bootstrap,paired,solve};
})(typeof window==='undefined'?globalThis:window);
