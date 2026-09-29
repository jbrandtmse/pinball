(()=>{var Df=Math.PI/180,ee={G:386.09,incline:6.5*Df,ballR:1.0625/2,dt:1/2e3,rollFactor:5/7,rollingDecel:1.1,maxSpeed:520,restCutoff:1.6};ee.gPlay=ee.G*Math.sin(ee.incline)*ee.rollFactor;var Nf=[[0,44],[.25,36],[.45,24],[.62,12],[.78,1],[.9,-9],[1,-15]],ca={wood:{e:.42,falloff:.3,fric:.1,soft:5},metal:{e:.45,falloff:.28,fric:.05,soft:5},plastic:{e:.5,falloff:.32,fric:.08,soft:5},rubber:{e:.86,falloff:.48,fric:.2,soft:8},post:{e:.72,falloff:.42,fric:.18,soft:8},flipper:{e:.84,falloff:.52,fric:.5,soft:40,grip:.72},target:{e:.36,falloff:.3,fric:.08,soft:5},bumper:{e:.55,falloff:.3,fric:.08,soft:5},gate:{e:.25,falloff:.3,fric:.04,soft:5},door:{e:.4,falloff:.3,fric:.06,soft:5}};function Uf(s,t){let e=ee.restCutoff;if(t<e)return 0;let i=s.e/(1+s.falloff*t/100);if(t>=s.soft)return i;let n=(t-e)/(s.soft-e);return i*n*n}var Fl=0,Ol=1,Ff=2,Hl=1;function _i(s,t,e,i,n={}){let r=e-s,a=i-t,o=r*r+a*a;return{uid:Hl++,type:Fl,ax:s,ay:t,bx:e,by:i,dx:r,dy:a,len2:o,r:n.r||0,mat:ca[n.mat||"wood"],matName:n.mat||"wood",id:n.id||null,enabled:n.enabled!==!1,kick:n.kick||null,pass:n.pass||null,hitMin:n.hitMin??4,lastKick:-1,tag:n.tag||null}}function zl(s,t,e,i={}){return{uid:Hl++,type:Ol,x:s,y:t,r:e,mat:ca[i.mat||"post"],matName:i.mat||"post",id:i.id||null,enabled:i.enabled!==!1,kick:i.kick||null,hitMin:i.hitMin??4,lastKick:-1,tag:i.tag||null}}function Oh(s,t,e,i,n,r={}){return{uid:Hl++,type:Ff,x:s,y:t,r:e,a0:i,a1:n,inside:r.inside!==!1,mat:ca[r.mat||"metal"],matName:r.mat||"metal",id:r.id||null,enabled:r.enabled!==!1,kick:null,hitMin:r.hitMin??4,lastKick:-1,tag:r.tag||null}}function Of(s,t,e){let i=Math.PI*2,n=(s-t)%i;n<0&&(n+=i);let r=(e-t)%i;return r<0&&(r+=i),r===0&&(r=i),n<=r}var ra=class{constructor(t){this.id=t.id,this.px=t.x,this.py=t.y,this.L=t.len,this.rb=t.rb,this.rt=t.rt,this.rest=t.rest,this.up=t.up,this.dir=Math.sign(t.up-t.rest),this.stroke=Math.abs(t.up-t.rest),this.angle=t.rest,this.omega=0,this.pressed=!1,this.enabled=!0,this.accelUp=t.accelUp??8e4,this.maxOmegaUp=t.maxOmegaUp??52,this.accelDown=t.accelDown??700,this.maxOmegaDown=t.maxOmegaDown??22,this.mat=ca.flipper;let e=(this.rb-this.rt)/this.L;this.sinPhi=e,this.cosPhi=Math.sqrt(1-e*e),this.atEOS=!1}get u(){return(this.angle-this.rest)*this.dir}step(t){let e=(this.angle-this.rest)*this.dir,i=this.omega*this.dir,n=this.pressed&&this.enabled;n&&!this._wasOn&&(this.strokeKey=(this.strokeKey||0)+1),this._wasOn=n,n?(i+=this.accelUp*t,i>this.maxOmegaUp&&(i=this.maxOmegaUp)):(i-=this.accelDown*t,i<-this.maxOmegaDown&&(i=-this.maxOmegaDown)),e+=i*t,this.atEOS=!1,e>=this.stroke&&(e=this.stroke,i>0&&(i=0),this.atEOS=!0),e<=0&&(e=0,i<0&&(i=0)),this.angle=this.rest+e*this.dir,this.omega=i*this.dir}distance(t,e,i){let n=Math.cos(this.angle),r=Math.sin(this.angle),a=t-this.px,o=e-this.py,c=a*n+o*r,l=-a*r+o*n,h=l>=0?1:-1,d=this.sinPhi,u=h*this.cosPhi,f=this.rb*d,m=this.rb*u,v=this.L+this.rt*d,g=this.rt*u,p=v-f,b=g-m,M=((c-f)*p+(l-m)*b)/(p*p+b*b),x,T,E;if(M<0){let R=Math.hypot(c,l)||1e-9;x=R-this.rb,T=c/R,E=l/R}else if(M>1){let R=c-this.L,y=Math.hypot(R,l)||1e-9;x=y-this.rt,T=R/y,E=l/y}else x=c*d+l*u-this.rb,T=d,E=u;return i.nx=T*n-E*r,i.ny=T*r+E*n,i.along=c,x}tip(){return{x:this.px+Math.cos(this.angle)*this.L,y:this.py+Math.sin(this.angle)*this.L}}},Bf=1,Bl=class{constructor(t,e){this.id=Bf++,this.x=t,this.y=e,this.z=0,this.vx=0,this.vy=0,this.mode="pf",this.path=null,this.s=0,this.vs=0,this.heldBy=null,this.contactFlipper=null,this.stillTime=0,this.lastSwitchTime=0,this.trig=new Set,this.q=[0,0,0,1]}get speed(){return this.mode==="path"?Math.abs(this.vs):Math.hypot(this.vx,this.vy)}},ts=class{constructor(t,e,i={}){this.id=t,this.opts=i,this.samples=kf(e,.2);let n=this.samples.length;this.length=this.samples[n-1].s,this.friction=i.friction??4,this.switches=(i.switches||[]).map(r=>({id:r.id,s:r.at*this.length})),this.next=null,this.exitSpeedScale=i.exitSpeedScale??1,this.maxExitSpeed=i.maxExitSpeed??140}at(t){let e=this.samples;t<0?t=0:t>this.length&&(t=this.length);let i=0,n=e.length-1;for(;n-i>1;){let c=i+n>>1;e[c].s<=t?i=c:n=c}let r=e[i],a=e[n],o=(t-r.s)/(a.s-r.s||1);return{x:r.x+(a.x-r.x)*o,y:r.y+(a.y-r.y)*o,z:r.z+(a.z-r.z)*o,tx:a.x-r.x,ty:a.y-r.y,tz:a.z-r.z,len:a.s-r.s,H:r.H+(a.H-r.H)*o,slope:(a.H-r.H)/(a.s-r.s||1)}}};function Ul(s,t,e,i,n){let r=n*n,a=r*n;return .5*(2*t+(-s+e)*n+(2*s-5*t+4*e-i)*r+(-s+3*t-3*e+i)*a)}function kf(s,t){let e=[],i=s.length,n=o=>s[Math.max(0,Math.min(i-1,o))],r=0,a=null;for(let o=0;o<i-1;o++){let c=n(o-1),l=n(o),h=n(o+1),d=n(o+2),u=Math.hypot(h[0]-l[0],h[1]-l[1],h[2]-l[2]),f=Math.max(2,Math.ceil(u/t));for(let m=o===0?0:1;m<=f;m++){let v=m/f,g=Ul(c[0],l[0],h[0],d[0],v),p=Ul(c[1],l[1],h[1],d[1],v),b=Ul(c[2],l[2],h[2],d[2],v);a&&(r+=Math.hypot(g-a.x,p-a.y,b-a.z)),a={x:g,y:p,z:b,s:r,H:Hf(g,p,b)},e.push(a)}}return e}function Hf(s,t,e){return e*Math.cos(ee.incline)-t*Math.sin(ee.incline)}function ha(s,t,e,i,n={}){return{kind:"circle",id:s,x:t,y:e,r:i,enabled:!0,...n}}function ua(s,t,e,i,n,r={}){let a=i-t,o=n-e,c=Math.hypot(a,o);return{kind:"line",id:s,ax:t,ay:e,bx:i,by:n,nx:-o/c,ny:a/c,len:c,enabled:!0,...r}}var kl=class{constructor(t,e,i){this.cell=i,this.cols=Math.ceil(t/i)+2,this.rows=Math.ceil(e/i)+2,this.cells=Array.from({length:this.cols*this.rows},()=>[])}key(t,e){return(e+1)*this.cols+(t+1)}insert(t,e,i,n,r){let a=Math.max(-1,Math.floor(e/this.cell)),o=Math.min(this.cols-2,Math.floor(n/this.cell)),c=Math.max(-1,Math.floor(i/this.cell)),l=Math.min(this.rows-2,Math.floor(r/this.cell));for(let h=c;h<=l;h++)for(let d=a;d<=o;d++)this.cells[this.key(d,h)].push(t)}query(t,e){let i=Math.floor(t/this.cell),n=Math.floor(e/this.cell);return i<-1||n<-1||i>this.cols-2||n>this.rows-2?zf:this.cells[this.key(i,n)]}},zf=[],aa=class{constructor(t,e){this.width=t,this.length=e,this.colliders=[],this.grid=new kl(t,e,1.25),this.flippers=[],this.balls=[],this.triggers=[],this.spinners=[],this.paths={},this.time=0,this.events=[],this.plunger=null,this.drainY=e,this.drainTest=null,this.gateAnim=new Map,this._c={nx:0,ny:0,along:0},this.ballBallE=.92}add(t){this.colliders.push(t);let e=ee.ballR+.6;if(t.type===Fl)this.grid.insert(t,Math.min(t.ax,t.bx)-t.r-e,Math.min(t.ay,t.by)-t.r-e,Math.max(t.ax,t.bx)+t.r+e,Math.max(t.ay,t.by)+t.r+e);else if(t.type===Ol)this.grid.insert(t,t.x-t.r-e,t.y-t.r-e,t.x+t.r+e,t.y+t.r+e);else{let i=Math.ceil(Math.abs(t.a1-t.a0)*t.r/.5)+1;for(let n=0;n<=i;n++){let r=t.a0+(t.a1-t.a0)*n/i,a=t.x+Math.cos(r)*t.r,o=t.y+Math.sin(r)*t.r;this.grid.insert(t,a-e,o-e,a+e,o+e)}}return t}addAll(t){for(let e of t)this.add(e)}addFlipper(t){return this.flippers.push(t),t}addTrigger(t){return this.triggers.push(t),t}addPath(t){return this.paths[t.id]=t,t}emit(t){t.t=this.time,this.events.push(t)}drainEvents(){let t=this.events;return this.events=[],t}addBall(t,e){let i=new Bl(t,e);return this.balls.push(i),i}removeBall(t){let e=this.balls.indexOf(t);e>=0&&this.balls.splice(e,1),t.mode="gone"}activeBalls(){return this.balls.filter(t=>t.mode!=="gone")}putOnPath(t,e,i,n){t.mode="path",t.path=e,t.s=i,t.vs=n;let r=e.at(i);t.x=r.x,t.y=r.y,t.z=r.z;for(let a of t.trig)this.emit({type:"switch",id:a,on:!1,ball:t.id});t.trig.clear()}stepPath(t,e){let i=t.path,n=i.at(t.s),r=-ee.G*ee.rollFactor*n.slope;t.vs+=r*e;let a=i.friction*e;Math.abs(t.vs)<2?t.vs+=(Math.sign(r)||-1)*10*e:t.vs-=Math.sign(t.vs)*a;let o=t.s;t.s+=t.vs*e;for(let l of i.switches)o<l.s&&t.s>=l.s&&this.emit({type:"switch",id:l.id,on:!0,ball:t.id,speed:Math.abs(t.vs),pulse:!0});if(t.s>=i.length){if(i.next){let u=i.next;this.emit({type:"pathEnd",id:i.id,ball:t.id,next:u.path.id}),t.path=u.path,t.s=u.s,t.vs=Math.max(20,t.vs*(u.speedScale??1));let f=t.path.at(t.s);t.x=f.x,t.y=f.y,t.z=f.z;return}let l=i.at(i.length),h=Math.hypot(l.tx,l.ty)||1,d=Math.min(i.maxExitSpeed,Math.abs(t.vs)*i.exitSpeedScale);if(t.mode="pf",t.path=null,t.z=0,t.x=l.x,t.y=l.y,t.vx=l.tx/h*d,t.vy=l.ty/h*d,i.opts.exitDir){let u=i.opts.exitDir,f=Math.hypot(u[0],u[1]);t.vx=u[0]/f*d,t.vy=u[1]/f*d}this.emit({type:"pathExit",id:i.id,ball:t.id,made:!0});return}if(t.s<=0&&t.vs<=0){let l=i.at(0),h=Math.hypot(l.tx,l.ty)||1,d=Math.max(8,Math.abs(t.vs));t.mode="pf",t.path=null,t.z=0,t.x=l.x-l.tx/h*.05,t.y=l.y-l.ty/h*.05,t.vx=-l.tx/h*d,t.vy=-l.ty/h*d,this.emit({type:"pathExit",id:i.id,ball:t.id,made:!1});return}let c=i.at(t.s);t.x=c.x,t.y=c.y,t.z=c.z}step(t=ee.dt){this.time+=t;for(let i of this.flippers)i.step(t);for(let i of this.spinners)i.step(t,this);this.plunger&&this.plunger.step(t,this);let e=this.balls;for(let i=0;i<e.length;i++){let n=e[i];if(n.mode==="path"){this.stepPath(n,t);continue}if(n.mode!=="pf")continue;n.vy+=ee.gPlay*t;let r=Math.hypot(n.vx,n.vy);if(r>0){let c=ee.rollingDecel*t;if(r<=c)n.vx=0,n.vy=0;else{let l=(r-c)/r;n.vx*=l,n.vy*=l}if(r>ee.maxSpeed){let l=ee.maxSpeed/r;n.vx*=l,n.vy*=l}}let a=n.x,o=n.y;n.x+=n.vx*t,n.y+=n.vy*t,n.contactFlipper=null;for(let c=0;c<3&&!(!this.collideStatics(n)&!this.collideFlippers(n));c++);this.plunger&&this.plunger.collide(n,this),this.checkTriggers(n,a,o),this.integrateSpin(n,t),this.drainTest&&this.drainTest(n)&&(n.mode="gone",this.emit({type:"drain",ball:n.id,x:n.x}))}for(let i=0;i<e.length;i++){let n=e[i];if(n.mode==="pf")for(let r=i+1;r<e.length;r++){let a=e[r];if(a.mode!=="pf")continue;let o=a.x-n.x,c=a.y-n.y,l=o*o+c*c,h=4*ee.ballR*ee.ballR;if(l>=h||l===0)continue;let d=Math.sqrt(l),u=o/d,f=c/d,m=2*ee.ballR-d;n.x-=u*m/2,n.y-=f*m/2,a.x+=u*m/2,a.y+=f*m/2;let v=(a.vx-n.vx)*u+(a.vy-n.vy)*f;if(v<0){let p=-(1+(-v>ee.restCutoff?this.ballBallE:0))*v/2;n.vx-=p*u,n.vy-=p*f,a.vx+=p*u,a.vy+=p*f,-v>15&&this.emit({type:"clack",speed:-v,x:n.x,y:n.y})}}}}collideStatics(t){let e=this.grid.query(t.x,t.y),i=ee.ballR,n=!1;for(let r=0;r<e.length;r++){let a=e[r];if(!a.enabled)continue;let o,c,l;if(a.type===Fl){let h=((t.x-a.ax)*a.dx+(t.y-a.ay)*a.dy)/a.len2;h<0?h=0:h>1&&(h=1);let d=a.ax+a.dx*h,u=a.ay+a.dy*h,f=t.x-d,m=t.y-u,v=f*f+m*m,g=i+a.r;if(v>=g*g)continue;let p=Math.sqrt(v);if(p>1e-9)o=f/p,c=m/p;else{let b=Math.sqrt(a.len2);o=-a.dy/b,c=a.dx/b,o*t.vx+c*t.vy>0&&(o=-o,c=-c)}if(l=g-p,a.pass){let b=t.vx*a.pass[0]+t.vy*a.pass[1],M=o*a.pass[0]+c*a.pass[1];if(b>=0||M<0){b>0&&this.swingGate(a,Math.min(1,l/i));continue}}}else if(a.type===Ol){let h=t.x-a.x,d=t.y-a.y,u=h*h+d*d,f=i+a.r;if(u>=f*f)continue;let m=Math.sqrt(u)||1e-9;o=h/m,c=d/m,l=f-m}else{let h=t.x-a.x,d=t.y-a.y,u=Math.hypot(h,d)||1e-9,f=Math.atan2(d,h);if(!Of(f,a.a0,a.a1))continue;if(a.inside){if(l=u+i-a.r,l<=0)continue;o=-h/u,c=-d/u}else{if(l=a.r+i-u,l<=0)continue;o=h/u,c=d/u}}n=!0,t.x+=o*l,t.y+=c*l,this.respond(t,a,o,c,0,0)}return n}collideFlippers(t){let e=ee.ballR,i=this._c,n=!1;for(let r of this.flippers){let a=t.x-r.px,o=t.y-r.py;if(a*a+o*o>(r.L+r.rt+e+.5)**2)continue;let c=r.omega*r.dir>2;if(c&&t.launchStroke===r.strokeKey)continue;let l=r.distance(t.x,t.y,i);if(l>=e)continue;let h=e-l,d=i.nx,u=i.ny,f=i.along;t.x+=d*h,t.y+=u*h;let m=t.x-d*e,v=t.y-u*e,g=-r.omega*(v-r.py),p=r.omega*(m-r.px),b=t.vx,M=t.vy,x=(t.vx-g)*d+(t.vy-p)*u;this.respond(t,r,d,u,g,p,!0,c),c&&-x>12&&this.flipperPolarity(t,r,f,Math.hypot(g,p),b,M),t.contactFlipper=r,n=!0}return n}flipperPolarity(t,e,i,n,r,a){let o=Math.max(0,Math.min(1,i/(e.L+e.rt))),c=Nf,l=0;for(;l<c.length-2&&o>c[l+1][0];)l++;let h=(o-c[l][0])/(c[l+1][0]-c[l][0]),d=c[l][1]+(c[l+1][1]-c[l][1])*Math.max(0,Math.min(1,h)),u=e.u/e.stroke;d-=24*u;let f=Math.cos(e.angle),m=Math.sin(e.angle),v=r*f+a*m;d+=Math.max(-6,Math.min(9,v*.09)),d+=(Math.random()-.5)*2.5;let g=e.dir<0?1:-1,p=d*Math.PI/180*g,b=Math.hypot(t.x-e.px,t.y-e.py)-ee.ballR,M=e.maxOmegaUp*Math.max(.35,b),x=1+e.mat.e/(1+e.mat.falloff*M/100),T=Math.min(ee.maxSpeed,Math.max(Math.hypot(t.vx,t.vy),M*x));t.vx=Math.sin(p)*T,t.vy=-Math.cos(p)*T,t.launchStroke=e.strokeKey,this.emit({type:"flipShot",id:e.id,u:o,theta:d,speed:T})}respond(t,e,i,n,r,a,o=!1,c=!1){let l=t.vx-r,h=t.vy-a,d=l*i+h*n;if(d>=0)return;let u=e.mat,f=-d,m=c?u.e/(1+u.falloff*f/100):Uf(u,f),v=l-d*i,g=h-d*n,p=Math.hypot(v,g),b=p;if(p>1e-6&&f>4){let x=Math.min(u.fric*(1+m)*f,p*(u.grip??.2857142857142857));b=p-x,v*=b/p,g*=b/p}let M=m*f;if(e.kick&&f>=(e.kick.minVn??0)&&this.time-e.lastKick>=(e.kick.cooldown??.1)){e.lastKick=this.time;let x=e.kick.speed*(1+(Math.random()-.5)*(e.kick.jitter??.1));M=Math.max(M,x),this.emit({type:"kick",id:e.id,speed:f,x:t.x,y:t.y,ball:t.id})}t.vx=r+v+i*M,t.vy=a+g+n*M,o?f>6&&this.emit({type:"flipperHit",id:e.id,speed:f,ball:t.id}):e.id&&f>=e.hitMin?this.emit({type:"hit",id:e.id,speed:f,ball:t.id,x:t.x,y:t.y,tag:e.tag}):f>25&&this.emit({type:"thud",mat:e.matName,speed:f,x:t.x,y:t.y})}swingGate(t,e){let i=this.gateAnim.get(t.uid)||0;e>i&&this.gateAnim.set(t.uid,e),t.id&&i<.05&&e>.2&&this.emit({type:"gate",id:t.id})}checkTriggers(t,e,i){for(let n of this.triggers)if(n.enabled){if(n.kind==="circle"){let r=t.x-n.x,a=t.y-n.y,o=r*r+a*a<n.r*n.r,c=t.trig.has(n.id);if(o&&!c){if(t.trig.add(n.id),this.emit({type:"switch",id:n.id,on:!0,ball:t.id,vx:t.vx,vy:t.vy,speed:Math.hypot(t.vx,t.vy)}),n.onEnter&&(n.onEnter(t,this),t.mode!=="pf"))return}else!o&&c&&(t.trig.delete(n.id),this.emit({type:"switch",id:n.id,on:!1,ball:t.id}))}else if(n.kind==="line"){let r=(e-n.ax)*n.nx+(i-n.ay)*n.ny,a=(t.x-n.ax)*n.nx+(t.y-n.ay)*n.ny;if(r>0==a>0)continue;let o=((t.x-n.ax)*(n.bx-n.ax)+(t.y-n.ay)*(n.by-n.ay))/(n.len*n.len);if(o<-.02||o>1.02)continue;let c=t.vx*n.nx+t.vy*n.ny;if(n.dirSign&&Math.sign(c)!==n.dirSign)continue;if(this.emit({type:"switch",id:n.id,on:!0,pulse:!0,ball:t.id,vx:t.vx,vy:t.vy,speed:Math.hypot(t.vx,t.vy)}),n.onCross&&n.onCross(t,this,c),t.mode!=="pf")return}}}integrateSpin(t,e){let i=ee.ballR,n=t.vy/i,r=-t.vx/i,a=Math.hypot(n,r)*e;if(a<1e-7)return;let o=n/(a/e),c=r/(a/e),l=Math.sin(a/2),h=Math.cos(a/2),d=o*l,u=0,f=c*l,m=h,[v,g,p,b]=t.q;t.q[0]=m*v+d*b+u*p-f*g,t.q[1]=m*g-d*p+u*b+f*v,t.q[2]=m*p+d*g-u*v+f*b,t.q[3]=m*b-d*v-u*g-f*p}},oa=class{constructor(t,e,i,n,r){this.id=t,this.ax=e,this.ay=i,this.bx=n,this.by=r,this.angle=0,this.omega=0,this.halfTurns=0;let a=n-e,o=r-i,c=Math.hypot(a,o);this.nx=-o/c,this.ny=a/c,this.len=c}hitBy(t){this.omega=Math.max(this.omega,Math.min(160,t*.55))}step(t,e){if(this.omega<=.01){let n=this.angle%Math.PI;n>.001&&(this.angle+=(n<Math.PI/2?-n:Math.PI-n)*Math.min(1,t*8)),this.omega=0;return}this.angle+=this.omega*t,this.omega-=(1.5+this.omega*.35)*t*6;let i=Math.floor(this.angle/Math.PI);i>this.halfTurns&&(this.halfTurns=i,e.emit({type:"switch",id:this.id,on:!0,pulse:!0}))}},la=class{constructor(t){this.x0=t.x0,this.x1=t.x1,this.restY=t.y,this.maxPull=t.maxPull??1.1,this.pull=0,this.pulling=!1,this.pullRate=t.pullRate??1/1.1,this.speedFn=t.speedFn,this.releaseAnim=0,this.autoFire=!1,this.autoSpeed=t.autoSpeed??215}get tipY(){return this.restY+this.pull*this.maxPull}step(t,e){this.pulling&&(this.pull=Math.min(1,this.pull+this.pullRate*t)),this.releaseAnim>0&&(this.releaseAnim=Math.max(0,this.releaseAnim-t))}ballOnTip(t){return t.mode==="pf"&&t.x>this.x0&&t.x<this.x1&&Math.abs(t.y+ee.ballR-this.tipY)<.25}release(t){let e=this.pull;if(this.pull=0,this.pulling=!1,this.releaseAnim=.06,e<.02)return;let i=this.speedFn(e);for(let n of t.balls)n.mode==="pf"&&n.x>this.x0&&n.x<this.x1&&n.y+ee.ballR>this.restY-.3&&n.y<this.restY+2&&(n.y=this.restY-ee.ballR-.002,n.vy=-i,n.vx=0,t.emit({type:"plunge",speed:i,pull:e}))}fireAuto(t){let e=!1;for(let i of t.balls)i.mode==="pf"&&i.x>this.x0&&i.x<this.x1&&i.y>this.restY-3&&(i.y=this.restY-ee.ballR-.002,i.vy=-this.autoSpeed*(.97+Math.random()*.06),i.vx=0,e=!0);return this.releaseAnim=.06,e&&t.emit({type:"autoplunge"}),e}collide(t,e){if(t.x<=this.x0||t.x>=this.x1)return;let i=this.tipY,n=t.y+ee.ballR-i;n>0&&n<1.5&&(t.y-=n,t.vy>0&&(t.vy=t.vy>20?-t.vy*.25:0))}};var Dn=Math.PI/180,Vf=20.25,Gf=45,Xs=18.55,be=s=>Xs-s,Wf=s=>s.map(([t,e])=>[be(t),e]).reverse();var Bh=[[0,28.3],[.55,26.15],[.92,25.85],[.72,25],[.5,24],[.3,23],[.14,22],[.04,21],[0,20]],Xf=[{id:"wallL",pts:[[0,42.6],...Bh,[0,10.125]],mat:"wood",style:"rail",h:1.35},{id:"wallR",pts:[[18.55,42.6],...Bh.map(([s,t])=>[be(s),t]),[18.55,11.8]],mat:"wood",style:"rail",h:1.35},{id:"shooterDiv",pts:[[18.8,11.8],[18.8,44.9]],mat:"wood",style:"rail",h:1.35},{id:"wallShooter",pts:[[20.25,10.125],[20.25,44.9]],mat:"wood",style:"rail",h:1.35},{id:"shooterFloor",pts:[[18.8,44.9],[20.25,44.9]],mat:"wood",style:"hidden",h:1}],qf={id:"arch",cx:10.125,cy:10.125,r:10.125,a0:Math.PI,a1:2*Math.PI,mat:"metal"},Gh={id:"mass",mat:"wood",style:"mass",h:1.25,pts:[[1.4,19],[1.4,10.4],[11.9,6.95],[11.75,7.35],[11.75,21.2],[11.65,21.2],[11.65,19.8],[9.45,19.8],[9.45,21.2],[8.9,21.2],[8.9,12],[6.3,12],[6.3,21.2],[4.3,21.2],[4.3,19.8],[2,19.8],[2,21.2],[1.85,21.2]]},Wh={id:"hideoutBlock",mat:"wood",style:"block",h:1.25,pts:[[13.35,20.87],[15.09,16.97],[16.9,15.5],[16.9,9.4],[17.15,9.4],[17.15,19],[15.04,21.63],[16.78,17.72],[15.32,17.07],[13.58,20.97]]},Gl=5.498,Xh=32.5,Wl=2.05,qh=1.45,fa=.25,kh=[Wl+Gl,Xh];function Yh(s,t){let e=[];for(let i=0;i<=t;i++){let n=(90-63*i/t)*Dn;e.push([kh[0]-s*Math.sin(n),kh[1]+s*Math.cos(n)])}return e}var Yf=Yh(Gl,10),Hh=[[1.55,29.8],[Wl,29.8],...Yf,[5.495,37.628],[5.45,38.45],[6.7,41.8],[1.55,41.8]],Jh=[{id:"divL",pts:Hh,mat:"wood",style:"block",h:1.1},{id:"divR",pts:Wf(Hh),mat:"wood",style:"block",h:1.1}],Vl=Yh(Gl-qh-fa,8),zh=Wl+qh+fa,Vh={A:[zh,30.3],C:[zh,Xh],D:Vl[Vl.length-1],lower:Vl},Jf=s=>({A:[be(s.A[0]),s.A[1]],C:[be(s.C[0]),s.C[1]],D:[be(s.D[0]),s.D[1]],lower:s.lower.map(([t,e])=>[be(t),e])}),Kf=[{id:"slingL",sw:"slingL",...Vh,postR:fa},{id:"slingR",sw:"slingR",...Jf(Vh),postR:fa}],jf=[Gh,Wh,...Jh],Zf=[{id:"pLOrbit",x:1.6,y:19.1,r:.22,mat:"post"},{id:"pLRampL",x:1.93,y:21.12,r:.1,mat:"metal"},{id:"pLRampR",x:4.37,y:21.12,r:.1,mat:"metal"},{id:"pVaultL",x:6.2,y:21.12,r:.12,mat:"post"},{id:"pVaultR",x:9.175,y:21.15,r:.26,mat:"post"},{id:"pRRampR",x:11.7,y:21.12,r:.1,mat:"metal"},{id:"pHideL",x:13.47,y:20.93,r:.15,mat:"post"},{id:"pHideR",x:15.1,y:21.55,r:.15,mat:"post"},{id:"pROrbit",x:17.025,y:19.05,r:.2,mat:"post"},{id:"pROrbitTop",x:17.025,y:9.4,r:.125,mat:"metal"},{id:"pShooterTop",x:18.675,y:11.8,r:.125,mat:"metal"},{id:"pNoseL",x:.68,y:25.95,r:.28,mat:"post"},{id:"pNoseR",x:be(.68),y:25.95,r:.28,mat:"post"},{id:"pDivL",x:1.8,y:29.75,r:.25,mat:"post"},{id:"pDivR",x:be(1.8),y:29.75,r:.25,mat:"post"}],$f=[11.9,13.45,15,16.55].map((s,t)=>({id:"guide"+t,x:s,y0:4.6,y1:6.8,r:.12})),Qf=[{id:"flipL",x:5.875,y:38.2,len:2.5,rb:.34,rt:.2,rest:27*Dn,up:-25*Dn},{id:"flipR",x:be(5.875),y:38.2,len:2.5,rb:.34,rt:.2,rest:153*Dn,up:205*Dn}],tp=[{id:"pop1",x:12.9,y:9,r:.95},{id:"pop2",x:15.55,y:9.35,r:.95},{id:"pop3",x:14.1,y:12.1,r:.95}],da=[0,1,2].map(s=>{let t=.8666666666666667,e=6.3+s*t;return{id:"drop"+(s+1),a:[e+.04,20.95],b:[e+t-.04,20.95],r:.12,cx:e+t/2}}),ep={id:"vaultDoor",a:[6.3,14.8],b:[8.9,14.8],r:.15},ip={id:"vault",x:7.6,y:13.3,r:1.3,ejectX:7.6,ejectY:13.6},np={id:"hideout",x:15.95,y:17.72,r:.45},sp=[{id:"standC",a:[4.55,21.12],b:[5.3,21.12]},{id:"standR",a:[5.35,21.12],b:[6.1,21.12]}],rp=[{id:"laneK",x:12.675,y:5.7,r:.42},{id:"laneE",x:14.225,y:5.7,r:.42},{id:"laneY",x:15.775,y:5.7,r:.42},{id:"outL",x:.775,y:33.6,r:.45},{id:"inL",x:2.775,y:31.4,r:.45},{id:"inR",x:be(2.775),y:31.4,r:.45},{id:"outR",x:be(.775),y:33.6,r:.45},{id:"orbitL",x:.7,y:13.2,r:.45},{id:"orbitR",x:17.85,y:13.2,r:.45},{id:"shooter",x:19.525,y:41.9,r:.55},{id:"kickback",x:.775,y:39.2,r:.5}],ap={id:"spinner",a:[.02,16.2],b:[1.38,16.2]},op=[{id:"gateShooter",a:[18.55,11.45],b:[20.25,10.4],pass:[0,-1]}],lp={x0:18.8,x1:20.25,y:43.4,laneX:19.525},cp={x:.775,y:39.2,speed:300},hp=42.35,up={rampL:{mouth:{a:[2,21.1],b:[4.3,21.1]},plasticUntil:.42,pts:[[3.15,21,0],[3.15,18,.6],[3.2,15,1.3],[3.2,12,2],[3.15,9.6,2.6],[2.85,7.9,3],[2.1,7,3.2],[1.2,7.4,3.25],[.75,8.6,3.25],[.7,10.5,3.2],[.7,15,3],[.7,20,2.6],[.8,24,2.25],[1.2,27,1.8],[2,29.2,1.25],[2.75,30.6,.55],[2.9,31,.3]],madeAt:.4},rampR:{mouth:{a:[9.45,21.1],b:[11.65,21.1]},plasticUntil:.5,pts:[[10.55,21,0],[10.55,18,.6],[10.5,15,1.3],[10.5,12,2],[10.55,9.2,2.65],[10.9,6.6,3.1],[12,4.6,3.4],[13.8,3.5,3.6],[15.8,3.7,3.6],[17.3,5.1,3.5],[17.85,7.2,3.4],[17.85,11,3.15],[17.85,16,2.9],[17.85,20.5,2.6],[17.75,24,2.25],[17.35,27,1.8],[16.55,29.2,1.25],[15.8,30.6,.55],[15.65,31,.3]],madeAt:.45},returnL:{gate:{a:[.02,19.35],b:[1.38,19.35]},pts:[[.7,19.35,0],[.72,20.6,.1],[.95,23,.33],[1.5,25.6,.55],[2.2,28,.45],[2.7,29.9,.25],[2.8,30.7,.08]]},returnR:{gate:{a:[be(1.38),19.35],b:[be(.02),19.35]},pts:[[be(.7),19.35,0],[be(.72),20.6,.1],[be(.95),23,.33],[be(1.5),25.6,.55],[be(2.2),28,.45],[be(2.7),29.9,.25],[be(2.8),30.7,.08]]},vuk:{pts:[[15.95,17.72,0],[16,17.55,1.2],[16.5,17.15,2.4],[17.3,16.9,2.85],[17.85,17,2.85]],joinRamp:"rampR",joinY:17}};function Ws(s,t,e,i){return Math.atan2(e-s,-(i-t))/Dn}var Ln={x:Xs/2,y:29.35,r:1.6},pa=["CASE","SAFE","LASER","DRIVE","INSIDE","CROSS"],dp=[{id:"arrLO",shape:"arrow",x:3.35,y:24.6,rot:Ws(3.35,24.6,.7,19),size:.95,color:"amber"},{id:"arrLR",shape:"arrow",x:4.7,y:24.9,rot:Ws(4.7,24.9,3.2,21),size:.95,color:"red"},{id:"arrVault",shape:"arrow",x:7.6,y:24.5,rot:0,size:1,color:"gold"},{id:"arrRR",shape:"arrow",x:10.5,y:24.5,rot:0,size:.95,color:"red"},{id:"arrHide",shape:"arrow",x:13.6,y:24.9,rot:Ws(13.6,24.9,16.1,21),size:.95,color:"green"},{id:"arrRO",shape:"arrow",x:15,y:24.6,rot:Ws(15,24.6,17.85,19),size:.95,color:"amber"},{id:"jpLO",shape:"circle",x:2.75,y:23.3,size:.5,color:"white"},{id:"jpLR",shape:"circle",x:4.3,y:23.4,size:.5,color:"white"},{id:"jpRR",shape:"circle",x:10.5,y:23.1,size:.5,color:"white"},{id:"jpRO",shape:"circle",x:15.6,y:23.3,size:.5,color:"white"},{id:"lock1",shape:"rect",x:7.6,y:19.4,size:.55,w:1.5,color:"gold"},{id:"lock2",shape:"rect",x:7.6,y:18.4,size:.55,w:1.5,color:"gold"},{id:"lock3",shape:"rect",x:7.6,y:17.4,size:.55,w:1.5,color:"gold"},{id:"superJP",shape:"star",x:7.6,y:16.1,size:.75,color:"white"},{id:"dropL1",shape:"circle",x:da[0].cx,y:22.1,size:.38,color:"red"},{id:"dropL2",shape:"circle",x:da[1].cx,y:22.1,size:.38,color:"red"},{id:"dropL3",shape:"circle",x:da[2].cx,y:22.1,size:.38,color:"red"},{id:"lockLit",shape:"rect",x:7.6,y:23.1,size:.5,w:1.3,color:"gold"},{id:"startJob",shape:"rect",x:12.95,y:23.2,size:.5,w:1.3,color:"green",rot:Ws(13.6,24.9,16.1,21)},{id:"extraBallLit",shape:"circle",x:12.55,y:24.3,size:.5,color:"orange"},{id:"mystery",shape:"circle",x:14.1,y:23.9,size:.42,color:"purple"},{id:"scout1",shape:"tri",x:16.3,y:27.2,size:.42,color:"amber",rot:-30},{id:"scout2",shape:"tri",x:16,y:27.9,size:.42,color:"amber",rot:-30},{id:"scout3",shape:"tri",x:15.7,y:28.6,size:.42,color:"amber",rot:-30},...pa.map((s,t)=>{let e=(-90+t*60)*Dn;return{id:"job"+t,shape:"circle",x:Ln.x+Math.cos(e)*Ln.r,y:Ln.y+Math.sin(e)*Ln.r,size:.62,color:"blue",label:s}}),{id:"bigScore",shape:"star",x:Ln.x,y:Ln.y,size:1.1,color:"gold"},{id:"lampK",shape:"circle",x:12.675,y:6.3,size:.42,color:"white",label:"K"},{id:"lampE",shape:"circle",x:14.225,y:6.3,size:.42,color:"white",label:"E"},{id:"lampY",shape:"circle",x:15.775,y:6.3,size:.42,color:"white",label:"Y"},...[2,3,4,5,6].map((s,t)=>({id:"bx"+s,shape:"circle",x:Xs/2+(t-2)*.95,y:33.95-Math.abs(t-2)*.18,size:.46,color:"orange",label:s+"X"})),{id:"lampInL",shape:"circle",x:2.775,y:32.6,size:.36,color:"white"},{id:"lampInR",shape:"circle",x:be(2.775),y:32.6,size:.36,color:"white"},{id:"lampKickback",shape:"arrow",x:.775,y:36.8,rot:0,size:.7,color:"green"},{id:"lampOutR",shape:"circle",x:be(.775),y:35.5,size:.4,color:"orange"},{id:"lampSpinner",shape:"circle",x:5.9,y:28.4,size:.42,color:"amber"},{id:"shootAgain",shape:"circle",x:Xs/2,y:40.9,size:.6,color:"red"},{id:"lampCombo",shape:"circle",x:12.65,y:28.4,size:.42,color:"amber"}],fp=[{id:"flVault",x:7.6,y:11,z:2.5,color:16761933},{id:"flPops",x:14.2,y:7,z:3.2,color:16724821},{id:"flLeft",x:1.2,y:26.5,z:2.5,color:3386111},{id:"flRight",x:17.3,y:26.5,z:2.5,color:3386111},{id:"flHide",x:16.1,y:15.3,z:2.2,color:3407752}],pp={W:Vf,L:Gf,MIRROR:Xs,walls:Xf,arch:qf,mass:Gh,hideoutBlock:Wh,dividers:Jh,slings:Kf,solids:jf,posts:Zf,laneGuides:$f,flippers:Qf,bumpers:tp,drops:da,vaultDoor:ep,vault:ip,hideout:np,standups:sp,rollovers:rp,spinner:ap,gates:op,plunger:lp,kickback:cp,drainY:hp,ramps:up,inserts:dp,flashers:fp,JOBS:pa,jobRing:Ln},J=pp;function Kh(s,t,e,i=!1){let n=[],r=t.length;for(let a=0;a<(i?r:r-1);a++){let o=t[a],c=t[(a+1)%r];n.push(s.add(_i(o[0],o[1],c[0],c[1],e)))}return n}function mp(s){return s<.1?40+90*s:s<.5?49+(s-.1)/.4*4.5:53.5+Math.pow((s-.5)/.5,1.3)*186.5}function jh(){let s=new aa(J.W,J.L),t={};for(let l of J.walls)Kh(s,l.pts,{mat:l.mat});s.add(Oh(J.arch.cx,J.arch.cy,J.arch.r,J.arch.a0,J.arch.a1,{inside:!0,mat:"metal"}));for(let l of J.solids)Kh(s,l.pts,{mat:l.mat},!0);for(let l of J.posts)s.add(zl(l.x,l.y,l.r,{mat:l.mat,id:null}));for(let l of J.laneGuides)s.add(_i(l.x,l.y0,l.x,l.y1,{r:l.r,mat:"metal"}));t.slings={};for(let l of J.slings){let{A:h,C:d,D:u,postR:f,lower:m}=l;s.add(_i(h[0],h[1],d[0],d[1],{r:f,mat:"metal"}));for(let b=0;b<m.length-1;b++)s.add(_i(m[b][0],m[b][1],m[b+1][0],m[b+1][1],{r:f,mat:"metal"}));let v=b=>[h[0]+(u[0]-h[0])*b,h[1]+(u[1]-h[1])*b],g=v(.14),p=v(.86);s.add(_i(h[0],h[1],g[0],g[1],{r:f,mat:"rubber"})),s.add(_i(p[0],p[1],u[0],u[1],{r:f,mat:"rubber"})),t.slings[l.id]=s.add(_i(g[0],g[1],p[0],p[1],{r:f,mat:"rubber",id:l.sw,hitMin:14,kick:{speed:128,minVn:14,cooldown:.13,jitter:.12}}))}t.bumpers={};for(let l of J.bumpers)t.bumpers[l.id]=s.add(zl(l.x,l.y,l.r,{mat:"bumper",id:l.id,hitMin:0,kick:{speed:118,minVn:0,cooldown:.05,jitter:.14}}));t.drops=J.drops.map(l=>s.add(_i(l.a[0],l.a[1],l.b[0],l.b[1],{r:l.r,mat:"target",id:l.id,hitMin:9}))),t.standups=J.standups.map(l=>s.add(_i(l.a[0],l.a[1],l.b[0],l.b[1],{r:.1,mat:"target",id:l.id,hitMin:6})));let e=J.vaultDoor;t.door=s.add(_i(e.a[0],e.a[1],e.b[0],e.b[1],{r:e.r,mat:"door",id:"vaultDoor",hitMin:6})),t.gates=J.gates.map(l=>s.add(_i(l.a[0],l.a[1],l.b[0],l.b[1],{mat:"gate",pass:l.pass,id:l.id}))),t.flippers={};for(let l of J.flippers)t.flippers[l.id]=s.addFlipper(new ra(l));t.triggers={};for(let l of J.rollovers)t.triggers[l.id]=s.addTrigger(ha(l.id,l.x,l.y,l.r));let i=J.spinner;t.spinner=new oa(i.id,i.a[0],i.a[1],i.b[0],i.b[1]),s.spinners.push(t.spinner),s.addTrigger(ua("spinnerLine",i.a[0],i.a[1],i.b[0],i.b[1],{onCross:l=>{t.spinner.hitBy(Math.abs(l.vy)),l.vx*=.97,l.vy*=.96}})),t.paths={};for(let l of["rampL","rampR"]){let h=J.ramps[l],d=s.addPath(new ts(l,h.pts,{friction:5,switches:[{id:l+"Made",at:h.madeAt}],maxExitSpeed:45}));t.paths[l]=d;let u=h.mouth;s.addTrigger(ua(l+"Enter",u.a[0],u.a[1],u.b[0],u.b[1],{dirSign:-1,onCross:(f,m)=>{let v=d.at(.01),g=Math.hypot(v.tx,v.ty)||1,p=Math.max(0,(f.vx*v.tx+f.vy*v.ty)/g);m.putOnPath(f,d,.02,p*.97),m.emit({type:"rampEnter",id:l,ball:f.id,speed:p})}}))}for(let l of["returnL","returnR"]){let h=J.ramps[l],d=s.addPath(new ts(l,h.pts,{friction:3,maxExitSpeed:40}));t.paths[l]=d;let u=h.gate;s.addTrigger(ua(l+"Gate",u.a[0],u.a[1],u.b[0],u.b[1],{dirSign:1,onCross:(f,m)=>{let v=Math.max(25,f.vy*.9);m.putOnPath(f,d,.02,v),m.emit({type:"orbitReturn",id:l,ball:f.id,speed:v})}}))}let n=J.ramps.vuk,r=s.addPath(new ts("vuk",n.pts,{friction:2})),a=t.paths.rampR,o=0,c=1e9;for(let l of a.samples){let h=Math.hypot(l.x-n.pts[n.pts.length-1][0],l.y-n.pts[n.pts.length-1][1]);h<c&&(c=h,o=l.s)}return r.next={path:a,s:o,speedScale:.5},t.paths.vuk=r,t.captures={},t.captures.hideout=s.addTrigger(ha("hideoutCap",J.hideout.x,J.hideout.y,J.hideout.r)),t.captures.vault=s.addTrigger(ha("vaultCap",J.vault.x,J.vault.y,J.vault.r)),s.plunger=t.plunger=new la({x0:J.plunger.x0,x1:J.plunger.x1,y:J.plunger.y,speedFn:mp,autoSpeed:175}),s.drainTest=l=>l.y>J.drainY&&l.x<18.6,{world:s,h:t}}var gp=.85,xp=J.plunger.laneX,_p=J.plunger.y-ee.ballR-.005,ma=class{constructor(t={}){let{world:e,h:i}=jh();this.world=e,this.h=i,this.totalBalls=t.balls??5,this.trough=this.totalBalls,this.time=0,this.acc=0,this.switchListeners=[],this.fxListeners=[],this.timers=[],this.flippersEnabled=!1,this.dropsDown=[!1,!1,!1],this.doorOpen=!1,this.held={hideout:[],vault:[]},this.kickbackArmed=!1,this.lastActivity=0,this.ballSearchCount=0,this.serveQueue=0,this.autoLaunchPending=0,this.tiltBob=0,this.tiltWarnCooldown=0,this.shake={x:0,y:0},this.buttons={left:!1,right:!1},this.stats={searches:0,rescues:0},this.autoPlungeEnabled=!1,this.timeScale=t.timeScale??gp,i.captures.hideout.onEnter=n=>this.capture("hideout",n),i.captures.vault.onEnter=n=>this.capture("vault",n),i.triggers.kickback.onEnter=n=>this.onKickbackLane(n),this.setDoor(!1)}onSwitch(t){this.switchListeners.push(t)}onFx(t){this.fxListeners.push(t)}sw(t,e={}){this.lastActivity=this.time;for(let i of this.switchListeners)i(t,e)}fx(t,e={}){for(let i of this.fxListeners)i(t,e)}after(t,e){this.timers.push({at:this.time+t,fn:e})}setFlipper(t,e){let i=this.h.flippers[t==="left"?"flipL":"flipR"],n=this.buttons[t];this.buttons[t]=e,e!==n&&this.sw(t==="left"?"btnLeft":"btnRight",{on:e});let r=e&&this.flippersEnabled;r!==i.pressed&&(i.pressed=r,this.fx(r?"flipperUp":"flipperDown",{id:i.id}))}setFlippersEnabled(t){this.flippersEnabled=t,this.setFlipper("left",this.buttons.left),this.setFlipper("right",this.buttons.right)}plungerPull(t){let e=this.world.plunger;t?e.pulling||(e.pulling=!0,this.fx("plungerPull")):e.pulling&&(e.release(this.world),this.fx("plungerRelease",{pull:e.pull}))}nudge(t,e){for(let n of this.world.balls)n.mode==="pf"&&(n.vx+=t*1*(.85+Math.random()*.3),n.vy+=e*1*(.85+Math.random()*.3));this.shake.x+=-t*.012,this.shake.y+=-e*.012,this.tiltBob+=1,this.fx("nudge",{dx:t,dy:e}),this.tiltBob>2.25&&this.tiltWarnCooldown<=0&&(this.tiltWarnCooldown=.9,this.tiltBob=1,this.sw("tilt",{}))}ballsInPlay(){return this.world.balls.filter(t=>t.mode!=="gone").length+this.serveQueue}ballsOnPlayfield(){return this.world.balls.filter(t=>t.mode==="pf"||t.mode==="path").length}shooterLaneBall(){return this.world.balls.find(t=>t.mode==="pf"&&t.x>J.plunger.x0&&t.y>30)}serveBall(t=!1,e=.55){this.serveQueue++,t&&(this.autoLaunchPending++,(this.launchDelays||(this.launchDelays=[])).push(e))}_tryServe(){if(this.serveQueue<=0||this.trough<=0||this.shooterLaneBall()||this._serveAt&&this.time<this._serveAt)return;this.serveQueue--,this.trough--;let t=this.world.addBall(xp,_p);this.fx("ballServe",{ball:t.id}),this._serveAt=this.time+.4,this.autoLaunchPending>0&&(this.autoLaunchPending--,this.after(this.launchDelays.shift()??.55,()=>this.autoLaunch()))}autoLaunch(){this.world.plunger.fireAuto(this.world)&&this.fx("autoLaunch")}capture(t,e){if(e.mode!=="pf"||e.noCaptureUntil&&this.time<e.noCaptureUntil)return;e.mode="held",e.heldBy=t,e.vx=0,e.vy=0;let i=t==="hideout"?J.hideout:J.vault;e.x=i.x,e.y=i.y;for(let n of e.trig)n!==i.id+"Cap"&&this.world.emit({type:"switch",id:n,on:!1,ball:e.id});e.trig.clear(),this.held[t].push(e),this.world.emit({type:"captured",dev:t,ball:e.id})}heldCount(t){return this.held[t].length}eject(t){let e=this.held[t].shift();if(!e)return!1;if(e.heldBy=null,t==="hideout")this.world.putOnPath(e,this.h.paths.vuk,.01,150),e.mode="path",this.fx("vuk");else{let i=this.doorOpen;this.dropsDown.every(Boolean)||this.dropAll(),i||(this.setDoor(!0),this.after(.9,()=>{this.doorWanted||this.setDoor(!1)})),e.mode="pf",e.x=J.vault.ejectX+.55+(Math.random()-.5)*.15,e.y=J.vault.ejectY,e.vx=-3.2-Math.random()*1.6,e.vy=46+Math.random()*10,e.noCaptureUntil=this.time+.6,this.lastVaultEject=this.time,this.fx("vaultKick")}return!0}resetDrops(){if(this.world.balls.some(e=>e.mode==="pf"&&e.x>6.1&&e.x<9.1&&e.y>11.9&&e.y<21.9)||this.heldCount("vault")>0||this.time-(this.lastVaultEject??-9)<1.2){this.after(.4,()=>this.resetDrops());return}this.dropsDown=[!1,!1,!1],this.h.drops.forEach(e=>{e.enabled=!0}),this.fx("dropReset")}dropAll(){this.dropsDown=[!0,!0,!0],this.h.drops.forEach(t=>{t.enabled=!1}),this.fx("dropDown",{all:!0})}openDoor(){this.doorWanted=!0,this.setDoor(!0)}closeDoor(){this.doorWanted=!1,this.setDoor(!1)}setDoor(t){if(!t&&this.world.balls.some(i=>i.mode==="pf"&&i.x>6.1&&i.x<9.1&&i.y>11.9&&i.y<15.8)){this.after(.3,()=>this.setDoor(!1));return}this.doorOpen!==t&&this.fx(t?"doorOpen":"doorClose"),this.doorOpen=t,this.h.door.enabled=!t}onKickbackLane(t){!this.kickbackArmed||t.vy<0||(this.kickbackArmed=!1,this.after(.04,()=>{t.mode==="pf"&&(t.vx=(Math.random()-.5)*6,t.vy=-J.kickback.speed*(.95+Math.random()*.08),this.fx("kickback"),this.sw("kickbackFired",{}))}))}update(t){t=Math.min(t,.05);let e=t*this.timeScale;this.acc+=e;let i=ee.dt;for(;this.acc>=i;)if(this.acc-=i,this.time+=i,this.world.step(i),this.processEvents(),this.timers.length)for(let n=0;n<this.timers.length;n++){let r=this.timers[n];this.time>=r.at&&(this.timers.splice(n--,1),r.fn())}this._tryServe(),this.tiltBob=Math.max(0,this.tiltBob-t*1.6),this.tiltWarnCooldown-=t,this.shake.x*=Math.pow(.02,t),this.shake.y*=Math.pow(.02,t),this.ballSearch(t)}processEvents(){let t=this.world.drainEvents();for(let e of t)switch(e.type){case"switch":if(e.on){if(e.id==="spinnerLine"||e.id==="hideoutCap"||e.id==="vaultCap")break;this.sw(e.id,e)}this.fx("switch",e);break;case"hit":{let i=e.id;if(i.startsWith("drop")){let n=Number(i[4])-1,r=e.y===void 0||e.y>J.drops[n].a[1];!this.dropsDown[n]&&e.speed>=9&&r&&(this.dropsDown[n]=!0,this.h.drops[n].enabled=!1,this.fx("dropDown",{i:n}),this.sw(i,e))}else this.sw(i,e),this.fx("hit",e);break}case"kick":this.sw(e.id,e),this.fx("kick",e);break;case"drain":this.world.removeBall(this.world.balls.find(i=>i.id===e.ball)||{}),this.trough++,this.fx("drain",e),this.sw("drain",e);break;case"captured":this.fx("capture",e),this.sw(e.dev,e);break;default:this.fx(e.type,e)}}ballSearch(t){for(let e of this.world.balls){if(e.mode==="path"){e.pathTime=(e.pathTime||0)+t,e.pathTime>8&&(e.pathTime=0,e.s=e.path.length,e.vs=30,this.stats.rescues++,this.fx("ballSearch",{x:e.x,y:e.y}));continue}if(e.pathTime=0,e.mode!=="pf"){e.stillTime=0;continue}let i=e.contactFlipper&&e.contactFlipper.pressed,n=e.x>J.plunger.x0;if(Math.hypot(e.vx,e.vy)<1.5&&!i&&!n?e.stillTime+=t:e.stillTime=0,e.stillTime>3.5){e.stillTime=0,e.x>6.1&&e.x<9.1&&e.y>11.9&&e.y<21.9&&this.dropAll();let r=Math.random()*Math.PI*2;e.vx+=Math.cos(r)*40,e.vy+=-Math.abs(Math.sin(r))*40,this.stats.rescues++,this.fx("ballSearch",{x:e.x,y:e.y})}}}resetAll(){this.world.balls.length=0,this.held={hideout:[],vault:[]},this.trough=this.totalBalls,this.serveQueue=0,this.autoLaunchPending=0,this.launchDelays=[],this.timers=[],this.resetDrops(),this.setDoor(!1)}};var vp={" ":[0,0,0,0,0],"!":[0,0,95,0,0],'"':[0,7,0,7,0],"#":[20,127,20,127,20],$:[36,42,127,42,18],"%":[35,19,8,100,98],"&":[54,73,86,32,80],"'":[0,8,7,3,0],"(":[0,28,34,65,0],")":[0,65,34,28,0],"*":[42,28,127,28,42],"+":[8,8,62,8,8],",":[0,80,48,0,0],"-":[8,8,8,8,8],".":[0,96,96,0,0],"/":[32,16,8,4,2],0:[62,81,73,69,62],1:[0,66,127,64,0],2:[114,73,73,73,70],3:[33,65,73,77,51],4:[24,20,18,127,16],5:[39,69,69,69,57],6:[60,74,73,73,49],7:[65,33,17,9,7],8:[54,73,73,73,54],9:[70,73,73,41,30],":":[0,0,20,0,0],";":[0,64,52,0,0],"<":[0,8,20,34,65],"=":[20,20,20,20,20],">":[0,65,34,20,8],"?":[2,1,89,9,6],"@":[62,65,93,89,78],A:[124,18,17,18,124],B:[127,73,73,73,54],C:[62,65,65,65,34],D:[127,65,65,65,62],E:[127,73,73,73,65],F:[127,9,9,9,1],G:[62,65,65,81,115],H:[127,8,8,8,127],I:[0,65,127,65,0],J:[32,64,65,63,1],K:[127,8,20,34,65],L:[127,64,64,64,64],M:[127,2,28,2,127],N:[127,4,8,16,127],O:[62,65,65,65,62],P:[127,9,9,9,6],Q:[62,65,81,33,94],R:[127,9,25,41,70],S:[38,73,73,73,50],T:[3,1,127,1,3],U:[63,64,64,64,63],V:[31,32,64,32,31],W:[63,64,56,64,63],X:[99,20,8,20,99],Y:[3,4,120,4,3],Z:[97,89,73,77,67],"[":[0,127,65,65,65],"]":[0,65,65,65,127],_:[64,64,64,64,64]};function yp(s,t){let e={};for(let i in s){let n=s[i],r=0,a=n.length-1;if(i!==" "){for(;r<a&&n[r]===0;)r++;for(;a>r&&n[a]===0;)a--}else r=0,a=2;let o=a-r+1,c=[];for(let l=0;l<t;l++){let h="";for(let d=r;d<=a;d++)h+=n[d]>>l&1?"#":".";c.push(h)}e[i]={w:o,rows:c}}return e}var Mp={0:"111101101101111",1:"010110010010111",2:"111001111100111",3:"111001111001111",4:"101101111001001",5:"111100111001111",6:"111100111101111",7:"111001010010010",8:"111101111101111",9:"111101111001111",A:"010101111101101",B:"110101110101110",C:"011100100100011",D:"110101101101110",E:"111100110100111",F:"111100110100100",G:"011100101101011",H:"101101111101101",I:"111010010010111",J:"001001001101010",K:"101101110101101",L:"100100100100111",M:"101111111101101",N:"110101101101101",O:"010101101101010",P:"110101110100100",Q:"010101101110011",R:"110101110101101",S:"011100010001110",T:"111010010010010",U:"101101101101111",V:"101101101101010",W:"101101111111101",X:"101101010101101",Y:"101101010010010",Z:"111001010100111"," ":"000000000000000",".":"000000000000010",",":"000000000010100",":":"000010000010000","-":"000000111000000","/":"001001010100100","!":"010010010000010","?":"110001010000010","+":"000010111010000",$:"011110010011110","%":"101001010100101","'":"010010000000000","(":"001010010010001",")":"100010010010100"};function Sp(s,t,e){let i={};for(let n in s){let r=s[n],a=[];for(let o=0;o<e;o++)a.push(r.slice(o*t,o*t+t).replace(/1/g,"#").replace(/0/g,"."));i[n]={w:t,rows:a}}return i}var bp={0:[".#####.","##...##","##...##","##...##","##...##","##...##","##...##","##...##","##...##","##...##","##...##",".#####."],1:["...##..","..###..",".####..","...##..","...##..","...##..","...##..","...##..","...##..","...##..","...##..",".######"],2:[".#####.","##...##",".....##",".....##","....##.","...##..","..##...",".##....","##.....","##.....","##.....","#######"],3:[".#####.","##...##",".....##",".....##",".....##","..####.",".....##",".....##",".....##",".....##","##...##",".#####."],4:["....##.","...###.","..####.",".##.##.","##..##.","##..##.","#######","....##.","....##.","....##.","....##.","....##."],5:["#######","##.....","##.....","##.....","######.",".....##",".....##",".....##",".....##",".....##","##...##",".#####."],6:[".#####.","##...##","##.....","##.....","######.","##...##","##...##","##...##","##...##","##...##","##...##",".#####."],7:["#######",".....##",".....##","....##.","....##.","...##..","...##..","..##...","..##...","..##...","..##...","..##..."],8:[".#####.","##...##","##...##","##...##","##...##",".#####.","##...##","##...##","##...##","##...##","##...##",".#####."],9:[".#####.","##...##","##...##","##...##","##...##","##...##",".######",".....##",".....##",".....##","##...##",".#####."],",":["..","..","..","..","..","..","..","..","..","##","##",".#","#."]," ":["...","...","...","...","...","...","...","...","...","...","...","..."]};function Tp(s){let t={};for(let e in s)t[e]={w:s[e][0].length,rows:s[e]};return t}var Nn={f5:{h:7,gap:1,glyphs:yp(vp,7)},f3:{h:5,gap:1,glyphs:Sp(Mp,3,5)},big:{h:12,gap:2,glyphs:Tp(bp),fallback:"f5"}};var Ue=128,Yi=32,qs=class s{constructor(){this.buf=new Uint8Array(Ue*Yi)}clear(t=0){this.buf.fill(t)}px(t,e,i=15){if(t|=0,e|=0,t<0||e<0||t>=Ue||e>=Yi)return;let n=e*Ue+t;i>this.buf[n]&&(this.buf[n]=i)}set(t,e,i){t|=0,e|=0,t>=0&&e>=0&&t<Ue&&e<Yi&&(this.buf[e*Ue+t]=i)}get(t,e){return t<0||e<0||t>=Ue||e>=Yi?0:this.buf[e*Ue+t]}fill(t,e,i,n,r=15){for(let a=0;a<n;a++)for(let o=0;o<i;o++)this.set(t+o,e+a,r)}rect(t,e,i,n,r=15){for(let a=0;a<i;a++)this.px(t+a,e,r),this.px(t+a,e+n-1,r);for(let a=0;a<n;a++)this.px(t,e+a,r),this.px(t+i-1,e+a,r)}line(t,e,i,n,r=15){t=Math.round(t),e=Math.round(e),i=Math.round(i),n=Math.round(n);let a=Math.abs(i-t),o=-Math.abs(n-e),c=t<i?1:-1,l=e<n?1:-1,h=a+o;for(;this.px(t,e,r),!(t===i&&e===n);){let d=2*h;d>=o&&(h+=o,t+=c),d<=a&&(h+=a,e+=l)}}circle(t,e,i,n=15,r=!1){for(let a=-i;a<=i;a++)for(let o=-i;o<=i;o++){let c=Math.sqrt(o*o+a*a);(r?c<=i+.3:Math.abs(c-i)<.55)&&this.px(t+o,e+a,n)}}dim(t){for(let e=0;e<this.buf.length;e++)this.buf[e]=Math.floor(this.buf[e]*t)}invert(t,e,i,n){for(let r=e;r<e+n;r++)for(let a=t;a<t+i;a++)this.set(a,r,15-this.get(a,r))}textWidth(t,e="f5",i={}){let n=Nn[e],r=0;for(let a of String(t)){let o=n.glyphs[a]||n.fallback&&Nn[n.fallback].glyphs[a]||n.glyphs[" "]||{w:3};r+=o.w+n.gap+(i.bold?1:0)+(i.spacing||0)}return Math.max(0,r-n.gap-(i.spacing||0))}text(t,e,i,n={}){let r=n.font||"f5",a=Nn[r],o=n.v??15,c=String(t).toUpperCase(),l=this.textWidth(c,r,n),h=n.align==="center"?Math.round(e-l/2):n.align==="right"?e-l:e;for(let d of c){let u=a.glyphs[d],f=i;!u&&a.fallback&&(u=Nn[a.fallback].glyphs[d],f=i+a.h-Nn[a.fallback].h),u||(u=a.glyphs[" "]||{w:3,rows:[]});for(let m=0;m<u.rows.length;m++){let v=u.rows[m];for(let g=0;g<v.length;g++)v[g]==="#"&&(this.px(h+g,f+m,o),n.bold&&this.px(h+g+1,f+m,o),n.shadow&&this.px(h+g+1,f+m+1,Math.max(1,o-10)))}h+=u.w+a.gap+(n.bold?1:0)+(n.spacing||0)}return l}bigText(t,e,i,n={}){let r=n.scale||2,a=new s,o=a.text(t,0,0,{...n,align:"left",font:n.font||"f5"}),c=Nn[n.font||"f5"].h,l=n.align==="center"?Math.round(e-o*r/2):n.align==="right"?e-o*r:e;for(let h=0;h<c;h++)for(let d=0;d<o+1;d++){let u=a.get(d,h);if(u)for(let f=0;f<r;f++)for(let m=0;m<r;m++)this.px(l+d*r+f,i+h*r+m,u)}return o*r}},ga=class{constructor(t){this.d=t||new qs,this.cur=null,this.queue=[],this.base=null,this.t=0}setBase(t){this.base=t}show(t,e={}){let i={scene:t,dur:e.duration??2,prio:e.priority??5,t:0};!this.cur||i.prio>this.cur.prio?(this.cur&&this.cur.t<this.cur.dur*.5&&this.cur.prio>=5&&this.queue.unshift(this.cur),this.cur=i):(this.queue.push(i),this.queue.sort((n,r)=>r.prio-n.prio),this.queue.length>6&&(this.queue.length=6))}clear(){this.cur=null,this.queue=[]}busy(){return!!this.cur}update(t){this.t+=t,this.cur&&(this.cur.t+=t,this.cur.t>=this.cur.dur&&(this.cur=this.queue.shift()||null));let e=this.d;e.clear(),this.cur?this.cur.scene.draw(e,this.cur.t,this.cur.dur):this.base&&this.base(e,this.t)}},xa=class{constructor(t){this.c=t,this.ctx=t.getContext("2d"),this.sprites=[],this.lastW=0,this.phosphor=new Float32Array(Ue*Yi)}build(t){this.sprites=[];let e=Math.ceil(t);for(let i=0;i<16;i++){let n=document.createElement("canvas");n.width=n.height=e;let r=n.getContext("2d"),a=e*.42,o=i/15,c=r.createRadialGradient(e/2,e/2,0,e/2,e/2,a);if(i===0)c.addColorStop(0,"rgba(70,28,8,0.55)"),c.addColorStop(1,"rgba(40,14,4,0.2)");else{let l=Math.round(255),h=Math.round(90+110*o),d=Math.round(20+60*o*o);c.addColorStop(0,`rgba(${l},${Math.min(255,h+40)},${d+30},1)`),c.addColorStop(.55,`rgba(${l},${h},${d},${.35+.65*o})`),c.addColorStop(1,`rgba(${Math.round(160*o+60)},${Math.round(40*o+10)},0,${.25*o})`)}r.fillStyle=c,r.beginPath(),r.arc(e/2,e/2,a,0,Math.PI*2),r.fill(),this.sprites.push(n)}}render(t,e=1/60){let i=this.c,n=i.width/Ue;Math.abs(n-this.lastW)>.01&&(this.build(n),this.lastW=n);let r=this.ctx;r.fillStyle="#0b0503",r.fillRect(0,0,i.width,i.height);let a=this.phosphor,o=t.buf,c=Math.pow(1e-10,e);for(let l=0;l<o.length;l++){let h=o[l];a[l]=h>=a[l]?h:Math.max(h,a[l]*c);let d=Math.round(a[l]),u=l%Ue*n,f=Math.floor(l/Ue)*n;r.drawImage(this.sprites[d],u,f)}}};function ge(s){return Math.round(s).toLocaleString("en-US")}var Xl=(s,t,e)=>Math.max(t,Math.min(e,s)),Fn=s=>1-Math.pow(1-Xl(s,0,1),3);function Un(s){return s=s<<13^s,(s*(s*s*15731+789221)+1376312589&2147483647)/2147483647}function ql(s,t,e=32,i=0,n=5){let r=-((i|0)%64),a=Math.floor(i/64)*9;for(;r<Ue;){let o=5+Math.floor(Un(a*7+1)*9),c=5+Math.floor(Un(a*13+3)*13);for(let l=0;l<o;l++)for(let h=0;h<c;h++){let d=r+l,u=e-1-h;s.set(d,u,2),l>0&&l<o-1&&h>1&&h<c-1&&l%2===1&&h%3===1&&Un(a*31+l*7+h*3+Math.floor(t*.7+a))>.55&&s.set(d,u,n+4)}if(Un(a*17)>.7)for(let l=0;l<4;l++)s.set(r+(o>>1),e-1-c-l,3);r+=o+1,a++}}function Yl(s,t,e=30){for(let i=0;i<e;i++){let n=Math.floor(Un(i*3+1)*Ue),r=Math.floor(Un(i*5+2)*16),a=.5+.5*Math.sin(t*(1+Un(i)*3)+i);s.px(n,r,Math.round(2+a*6))}}function Zh(s,t,e,i,n=6){for(let a=0;a<18;a++){let o=a/18*Math.PI*2+t*.8,c=8+t*60%20,l=c+14;s.line(e+Math.cos(o)*c,i+Math.sin(o)*c*.5,e+Math.cos(o)*l,i+Math.sin(o)*l*.5,n)}}function $h(s,t,e,i,n,r=0,a=12){let o=Math.round(r*(i*2+6)),c=t-o;s.circle(c,e,i,a),s.circle(c,e,i-2,Math.max(3,a-6));for(let l=0;l<8;l++){let h=l/8*Math.PI*2;s.px(c+Math.round(Math.cos(h)*(i-1)),e+Math.round(Math.sin(h)*(i-1)),15)}for(let l=0;l<3;l++){let h=n+l/3*Math.PI;s.line(c-Math.cos(h)*(i-4),e-Math.sin(h)*(i-4),c+Math.cos(h)*(i-4),e+Math.sin(h)*(i-4),a)}if(s.circle(c,e,2,15,!0),r>0)for(let l=-i+2;l<i-1;l++)for(let h=-i+2;h<i-1;h++)h*h+l*l<(i-2)*(i-2)&&(h+l+64)%3===0&&s.px(t+h,e+l,Math.round(4+8*r))}function Jl(){return{draw(s,t){Yl(s,t),s.circle(112,7,4,8,!0),s.circle(114,6,4,0,!0);for(let a=3;a<=11;a++)for(let o=108;o<=116;o++)(o-112)**2+(a-7)**2<=16&&(o-114)**2+(a-6)**2>16&&s.set(o,a,9);ql(s,t,32,t*6,4);let e=Fn(t/.8),i=Math.round(-80+e*144);s.text("MIDNIGHT",i,3,{font:"f5",bold:!0,align:"center",v:15});let n=Fn((t-.5)/.8);s.bigText("HEIST",Math.round(64+(1-n)*120),12,{scale:2,align:"center",bold:!1,v:15});let r=t*50%220-40;for(let a=0;a<26;a++)for(let o=Math.round(r-3+a*.3);o<r+3+a*.3;o++){let c=s.get(o,a);c>8?s.set(o,a,15):c===0&&s.set(o,a,1)}}}}function Qh(){return{draw(s,t){Yl(s,t,40),ql(s,t,32,t*12,6);let e=-Math.PI/2+Math.sin(t*.9)*.7;for(let i=0;i<40;i++)for(let n=-Math.floor(i/6);n<=Math.floor(i/6);n++){let r=64+Math.cos(e)*i-Math.sin(e)*n,a=30+Math.sin(e)*i+Math.cos(e)*n;s.get(Math.round(r),Math.round(a))<3&&s.px(r,a,3)}s.text("THE CITY SLEEPS",64,2,{align:"center",v:12})}}}function ke(s,t=""){return{draw(e,i,n){let r=Math.min(1,i*6),a=e.textWidth(s,"f5")>60;if(!t){a?e.text(s,64,12,{align:"center",bold:!0,v:Math.round(15*r)}):e.bigText(s,64,9,{scale:2,align:"center",v:Math.round(15*r)});return}a?e.text(s,64,5,{align:"center",bold:!0,v:15}):e.bigText(s,64,1,{scale:2,align:"center",v:15}),e.text(t,64,a?19:22,{align:"center",v:10})}}}function _a(s){return{draw(t,e){let i=Math.round(16-s.length*5);s.forEach((n,r)=>{let a=Xl((e-r*.25)*4,0,1);t.text(n,64,i+r*10,{align:"center",v:Math.round(15*a)})});for(let n=0;n<Ue;n+=2)t.px(n,0,3),t.px(n+1,31,3)}}}function Ys(s,t,e=0){return{draw(i,n){i.text(s,64,1,{align:"center",bold:!0,v:15}),i.line(8,9,120,9,4),t.forEach((r,a)=>{if(!r)return;let o=t.length===1?14:12+a*10,c=e?`${e+a}) ${r.name}`:r.name;t.length===1?(i.text(r.name,64,12,{align:"center",v:12}),i.text(ge(r.score),64,22,{align:"center",v:15,bold:!0})):(i.text(c,4,o,{v:12}),i.text(ge(r.score),124,o,{align:"right",v:15}))})}}}function tu(s){return{draw(t){t.text("LAST GAME",64,1,{align:"center",v:12}),s.forEach((e,i)=>{let n=i%2===0?4:124,r=11+Math.floor(i/2)*10;t.text(`P${i+1} ${ge(e)}`,n,r,{align:i%2===0?"left":"right",v:14,font:"f5"})})}}}function eu(s,t,e){return{draw(i,n){let r=Fn(n/.4);i.text(e>1?`PLAYER ${s}`:"GET READY",64,Math.round(-8+r*11),{align:"center",v:12}),i.bigText(`BALL ${t}`,64,13,{scale:2,align:"center",v:15})}}}function ni(s,t,e){return{draw(i,n){let r=n<.5&&Math.floor(n*16)%2===0;if(i.text(s,64,2,{align:"center",bold:!0,v:r?6:15}),t!=null){let a=ge(t);i.textWidth(a,"big")<=124?i.text(a,64,12,{font:"big",align:"center",v:15}):i.text(a,64,15,{align:"center",bold:!0})}e&&i.text(e,64,t!=null?26:16,{align:"center",v:t!=null?9:13,font:t!=null?"f3":"f5"})}}}function Js(s,t){return{draw(e,i,n){Zh(e,i,64,16,4);let r=Math.floor(i*10)%2,a=e.textWidth(s,"f5",{bold:!0});e.fill(64-(a>>1)-3,1,a+6,10,0),e.text(s,64,2,{align:"center",bold:!0,v:r?15:10});let o=i<.9?t*Fn(i/.9):t,c=ge(Math.round(o/10)*10),l=e.textWidth(c,"big");e.fill(64-(l>>1)-2,13,l+4,15,0),e.text(c,64,14,{font:"big",align:"center",v:15}),i<.25&&e.invert(0,0,Ue,Yi)}}}function va(s){return{draw(t,e){let i=Fn((e-.6)/.8);$h(t,22,16,13,e*4*(1-i*.8),i),t.text("THE VAULT",88,4,{align:"center",bold:!0}),t.text("IS OPEN",88,14,{align:"center",v:12}),t.text(s,88,25,{align:"center",font:"f3",v:Math.floor(e*6)%2?15:8})}}}function iu(s){return{draw(t,e){let i=Fn(e/.7);$h(t,22,16,13,e*3,1-i),t.text(`BALL ${s}`,88,4,{align:"center",bold:!0}),t.text("LOCKED",88,14,{align:"center",bold:!0,v:Math.floor(e*8)%2?15:9}),t.text(s<2?"LOCK 3 FOR MULTIBALL":"NEXT LOCK: MULTIBALL",88,25,{align:"center",font:"f3",v:9})}}}function nu(){return{draw(s,t){for(let i=0;i<2;i++){let n=t*6+i*Math.PI,r=i?96:32;for(let a=2;a<12;a++)s.px(r+Math.cos(n)*a,5+Math.sin(n)*a*.35,6),s.px(r-Math.cos(n)*a,5-Math.sin(n)*a*.35,6);s.circle(r,5,2,15,!0)}let e=Math.floor(t*8)%2===0;s.text("VAULT",64,2,{align:"center",bold:!0,v:e?15:9}),s.bigText("MULTIBALL",64,12,{scale:2,align:"center",v:15}),(t<.2||t>1&&t<1.1)&&s.invert(0,0,Ue,Yi)}}}function su(s){return{draw(t,e){if(t.text("MYSTERY",64,2,{align:"center",bold:!0}),e<1){let i=["BIG POINTS","EXTRA BALL","BONUS X","KICKBACK","SPINNER","ALARMS","SCOUT"];t.text(i[Math.floor(e*20)%i.length],64,16,{align:"center",v:8})}else t.text(s,64,16,{align:"center",bold:!0,v:15});for(let i=0;i<6;i++)t.text("?",6+i*23+Math.round(Math.sin(e*5+i)*2),25,{font:"f3",v:5})}}}function ru(s,t){return{draw(e,i){let n=s();e.text("SELECT YOUR JOB",64,1,{align:"center",font:"f3",v:10}),e.text(n.name,64,10,{align:"center",bold:!0}),e.text(n.blurb,64,20,{align:"center",font:"f3",v:11});let r=Math.floor(i*4)%2?15:7;e.text("<",3,10,{v:r}),e.text(">",120,10,{v:r}),e.text(`${Math.max(0,Math.ceil(t()))}`,124,26,{font:"f3",align:"right",v:8}),e.text("FLIPPERS CHOOSE  START OK",60,26,{font:"f3",align:"center",v:6})}}}function au(s){return{draw(t,e){let i=Fn(e/.5);t.fill(0,0,Math.round(128*i),11,3),t.text("JOB STARTED",64,2,{align:"center",v:15,bold:!0}),t.text(s.name,64,14,{align:"center",v:15}),t.text(s.blurb,64,25,{align:"center",font:"f3",v:Math.floor(e*5)%2?14:8})}}}function Ks(s,t,e){return{draw(i,n){i.text(s,64,1,{align:"center",font:"f3",v:10}),i.text(ge(t),64,10,{font:"big",align:"center"}),i.text(e,64,25,{align:"center",font:"f3",v:12}),n<.12&&i.invert(0,0,Ue,Yi)}}}function ou(s,t){return{draw(e,i){Zh(e,i,64,16,3),e.fill(8,0,112,32,0),e.text(s,64,1,{align:"center",v:12}),e.text("COMPLETE",64,10,{align:"center",bold:!0,v:Math.floor(i*8)%2?15:10}),t&&e.text(ge(t),64,21,{align:"center",bold:!0})}}}function lu(){return{draw(s,t){Yl(s,t,50),ql(s,t,32,t*30,8),s.fill(10,2,108,20,0),s.text("THE",64,3,{align:"center",v:12}),s.bigText("BIG SCORE",64,11,{scale:2,align:"center",v:Math.floor(t*6)%2?15:11}),Math.floor(t*3)%3===0&&s.invert(0,0,Ue,2)}}}function cu(s,t,e){return{draw(n,r){let a=Math.floor(r/1.1);if(n.text("BONUS",64,1,{align:"center",bold:!0}),a<s.length){let[o,c,l]=s[a];n.text(`${c} ${o}`,64,12,{align:"center",v:13}),n.text(`X ${ge(l)}`,64,22,{align:"center",v:10})}else r<s.length*1.1+1.1?(n.text(`${ge(e)}`,64,12,{align:"center",v:13}),n.text(`X ${t}`,64,22,{align:"center",bold:!0})):(n.text("TOTAL BONUS",64,11,{align:"center",font:"f3",v:10}),n.text(ge(e*t),64,19,{align:"center",bold:!0}))}}}function hu(s,t,e){return{draw(i,n){i.text("MATCH",32,4,{align:"center",bold:!0}),t.forEach((a,o)=>i.text(String(a).padStart(2,"0"),12+o*14,20,{v:9}));let r=n<2.2?Math.floor(n*12)%10*10:s;i.bigText(String(r).padStart(2,"0"),96,6,{scale:2,align:"center",v:n>2.2&&e&&Math.floor(n*8)%2?8:15})}}}function uu(s){return{draw(t,e){let i=s();if(i){t.text(`PLAYER ${i.player.n}`,64,0,{align:"center",font:"f3",v:9}),t.text(i.rank===0?"GRAND CHAMPION!":"ENTER INITIALS",64,7,{align:"center",bold:!0});for(let n=0;n<3;n++){let r=i.charset[i.letters[n]],a=14+n*15,c=n===i.pos?Math.floor(e*5)%2?15:6:n<i.pos?15:4;t.bigText(r===" "?"_":r,a+3,16,{scale:2,align:"center",v:c})}t.text(ge(i.player.score),126,20,{align:"right",font:"f3",v:9}),t.text("FLIPPERS + START",126,27,{align:"right",font:"f3",v:5})}}}}function du(s,t,e,i,n,r){let a=e[i];if(e.length===1){let u=ge(a.score);s.textWidth(u,"big")<=126?s.text(u,64,4,{font:"big",align:"center"}):s.text(u,64,7,{align:"center",bold:!0}),s.text(`BALL ${n}`,2,26,{font:"f3",v:9}),s.text(r,126,26,{font:"f3",align:"right",v:6});return}let o=[[2,0,"left"],[126,0,"right"],[2,27,"left"],[126,27,"right"]];e.forEach((u,f)=>{if(f===i)return;let[m,v,g]=o[f];s.text(ge(u.score),m,v,{font:"f3",align:g,v:7})});let c=ge(a.score);s.textWidth(c,"big")<=110?s.text(c,64,9,{font:"big",align:"center"}):s.text(c,64,12,{align:"center",bold:!0});let[l,h,d]=o[i];s.text(`P${i+1} BALL ${n}`,l,h,{font:"f3",align:d,v:Math.floor(t*2)%2?12:6})}function fu(s,t,e,i,n){s.text(e.def.name,2,0,{font:"f3",v:10}),s.text(String(Math.max(0,Math.ceil(e.time))),126,0,{align:"right",bold:!0,v:e.time<6&&Math.floor(t*4)%2?6:15}),s.text(ge(i.score),64,11,{align:"center",bold:!0});let r="";switch(e.id){case"CASE":r=`LIT SHOTS ${ge(e.value)}`;break;case"SAFE":r=`SPINS ${e.progress}/${e.need}`;break;case"LASER":r=`GRIDS ${e.progress}/${e.need}  750,000 EACH`;break;case"DRIVE":r=`RAMPS ${e.progress}/${e.need}  ${ge(e.value)}`;break;case"INSIDE":r=`VAULT ${ge(Math.round(e.value/1e4)*1e4)}`;break;case"CROSS":r=`HIT THE MOVING SHOT ${e.progress}/${e.need}`;break}s.text(r,64,25,{align:"center",font:"f3",v:12});let a=Xl(e.time/e.def.time,0,1);s.line(2,8,2+Math.round(40*a),8,5)}function pu(s,t,e,i){s.text("VAULT MULTIBALL",64,0,{align:"center",font:"f3",v:Math.floor(t*3)%2?12:7});let n=ge(i.score);s.textWidth(n,"big")<=126?s.text(n,64,8,{font:"big",align:"center"}):s.text(n,64,11,{align:"center",bold:!0}),s.text(e.superLit?"SUPER JACKPOT AT VAULT":`JACKPOT ${ge(e.jpValue)}`,64,26,{align:"center",font:"f3",v:13})}function mu(s,t,e,i){s.text("THE BIG SCORE",64,0,{align:"center",font:"f3",v:Math.floor(t*4)%2?15:8});let n=ge(i.score);s.textWidth(n,"big")<=126?s.text(n,64,8,{font:"big",align:"center"}):s.text(n,64,11,{align:"center",bold:!0}),s.text(e.superLit?"VAULT: 100,000,000":`SHOTS WORTH ${ge(e.value*e.level)}`,64,26,{align:"center",font:"f3",v:13})}var gu=3,wp=new Set(["shooter","gateShooter","orbitR","orbitL","returnLGate","returnRGate","inL","inR","spinner"]),Ap=10,Rp=15,Cp=20,xu=15e7,es=[{id:"CASE",name:"CASE THE JOINT",blurb:"SHOOT ALL LIT SHOTS",time:40},{id:"SAFE",name:"CRACK THE SAFE",blurb:"RIP THE SPINNER",time:40},{id:"LASER",name:"LASER MAZE",blurb:"KNOCK DOWN THE GRID",time:40},{id:"DRIVE",name:"GETAWAY DRIVE",blurb:"HIT THE RAMPS",time:40},{id:"INSIDE",name:"INSIDE MAN",blurb:"VAULT HURRY-UP",time:30},{id:"CROSS",name:"DOUBLE CROSS",blurb:"HIT THE MOVING SHOT",time:40}],js=["orbitL","rampL","vault","rampR","hideout","orbitR"],Pp={orbitL:"arrLO",rampL:"arrLR",vault:"arrVault",rampR:"arrRR",hideout:"arrHide",orbitR:"arrRO"},Zs=["orbitL","rampL","rampR","orbitR"],_u=Zs,Ip={orbitL:"jpLO",rampL:"jpLR",rampR:"jpRR",orbitR:"jpRO"},Lp={dmd:{show(){},setBase(){},clear(){},busy:()=>!1},sound:{play(){},music(){},speech(){}},flash(){},storage:{load:()=>null,save(){}}};function vu(s){return{n:s,score:0,ball:1,extraBalls:0,bonusX:1,lanes:[!1,!1,!1],laneCompletions:0,pops:0,popLevel:1,locks:0,lockLit:!1,doorHitsNeeded:0,doorHits:0,mbCount:0,lockBaseReq:0,dropBanks:0,ramps:0,orbits:0,scout:0,jobLit:!0,jobsPlayed:[],jobsDone:[],ebLitCount:0,ebAwarded:0,extraBallLit:!1,kickbackLit:!0,standups:[!1,!1],spinnerLitUntil:0,skillCount:0,replayAwarded:!1,bonus:{ramps:0,orbits:0,locks:0,jobs:0,switches:0,pops:0},wizardDone:0}}var ya=class{constructor(t,e={}){this.m=t,this.ui={...Lp,...e},this.dmd=this.ui.dmd,this.t=0,this.state="attract",this.players=[],this.pi=0,this.timers=[],this.flashers={},this.lampShowT=0,this.highScores=this.loadHighScores(),this.lastScores=[],this.credits="FREE PLAY",this.events=[],t.onSwitch((i,n)=>this.onSwitch(i,n)),this.dmd.setBase((i,n)=>this.drawBase(i,n)),this.enterAttract()}get p(){return this.players[this.pi]}after(t,e,i){let n={at:this.t+t,fn:e,tag:i};return this.timers.push(n),n}cancel(t){this.timers=this.timers.filter(e=>e.tag!==t)}log(t,e={}){this.events.push({t:this.t,type:t,...e}),this.events.length>5e3&&this.events.shift()}sfx(t,e){this.ui.sound.play(t,e)}say(t){this.ui.sound.speech&&this.ui.sound.speech(t)}flash(t,e=.25){this.flashers[t]=Math.max(this.flashers[t]||0,e),this.ui.flash(t,e)}show(t,e=2,i=5){this.dmd.show(t,{duration:e,priority:i})}score(t,e){if(!this.p||this.tilted||this.state!=="playing")return 0;let i=this.wizard?2:1,n=Math.round(t*i/10)*10;return this.p.score+=n,!this.p.replayAwarded&&this.p.score>=xu&&(this.p.replayAwarded=!0,this.sfx("knocker"),this.show(ke("REPLAY","FREE GAME AWARDED"),2,7)),n}enterAttract(){this.state="attract",this.tilted=!1,this.m.setFlippersEnabled(!1),this.dmd.clear(),this.ui.sound.music("attract"),this.attractIdx=0,this.attractNext=0}attractCycle(){let t=this.highScores,e=[()=>this.show(Jl(),6,1),()=>this.show(ke("PRESS START",this.credits),3,1),()=>this.show(Ys("GRAND CHAMPION",[t[0]]),3.5,1),()=>this.show(Ys("HIGH SCORES",t.slice(1,3),1),3.5,1),()=>this.show(Ys("HIGH SCORES",t.slice(3,5),3),3.5,1),()=>this.lastScores.length?this.show(tu(this.lastScores),3.5,1):this.show(Qh(),4,1),()=>this.show(_a(["KNOCK DOWN THE","LASER GRID TO","CRACK THE VAULT"]),3.5,1),()=>this.show(_a(["LOCK 3 BALLS FOR","VAULT MULTIBALL"]),3,1),()=>this.show(_a(["PLAY ALL 6 JOBS TO","LIGHT THE BIG SCORE"]),3.5,1)];e[this.attractIdx%e.length](),this.attractIdx++}pressStart(){if(this.state==="attract"||this.state==="gameover"){this.startGame();return}if(this.state==="hsentry"){this.hsSelect();return}if(this.state==="jobselect"){this.confirmJobSelect();return}this.state==="playing"&&this.p.ball===1&&this.pi===0&&this.players.length<4&&this.players.every(t=>t.ball===1)&&(this.players.push(vu(this.players.length+1)),this.sfx("addPlayer"),this.show(ke(`PLAYER ${this.players.length}`,"ADDED"),1.5,6))}startGame(){this.m.resetAll(),this.players=[vu(1)],this.pi=0,this.timers=[],this.state="playing",this.log("gameStart"),this.sfx("start"),this.say("Tonight we rob the vault"),this.ui.sound.music("main"),this.dmd.clear(),this.show(ke("MIDNIGHT HEIST","THE JOB IS ON"),2.2,6),this.startBall()}startBall(){let t=this.p;this.tilted=!1,this.tiltWarnings=0,this.ballActive=!1,this.ballSaveUntil=0,this.ballSaveArmed=Ap,this.mb=null,this.wizard=null,this.job=null,this.combo={last:0,n:0,lastShot:null},this.skill={active:!0,lane:Math.floor(Math.random()*3),timer:0,superUntil:0,viaOrbit:!1},this.rampStreak=0,this.m.setFlippersEnabled(!0),this.m.kickbackArmed=t.kickbackLit,this.m.closeDoor(),this.m.resetDrops(),this.restoreDoor(),this.m.serveBall(),this.dmd.clear(),this.show(eu(t.n,t.ball,this.players.length),1.6,4),this.ui.sound.music("main"),this.log("ballStart",{player:t.n,ball:t.ball})}launchDetected(){this.ballActive||(this.ballActive=!0,this.ballSaveUntil=this.t+this.ballSaveArmed,this.ballSaveArmed=0,this.skill.timer=6)}onSwitch(t,e){if(t==="btnLeft"||t==="btnRight"){this.onButton(t==="btnLeft"?"left":"right",e.on);return}if(this.state!=="playing"&&this.state!=="jobselect"){t==="drain"&&this.onDrainOutsideGame(),(t==="hideout"||t==="vault")&&this.after(.5,()=>this.m.eject(t));return}if(t==="tilt"){this.onTiltWarning();return}if(t==="drain"){this.onDrain(e);return}if(this.tilted){(t==="hideout"||t==="vault")&&this.after(.4,()=>this.m.eject(t));return}t!=="shooter"&&t!=="gateShooter"&&t!=="drain"&&!this.ballActive&&t!=="plunge"&&this.launchDetected();let i=this[`sw_${t}`];i&&i.call(this,e),this.p.bonus.switches++,this.skill.active&&this.ballActive&&!wp.has(t)&&(this.skill.active=!1)}onButton(t,e){if(this.state==="hsentry"){e&&this.hsMove(t==="left"?-1:1);return}if(this.state==="jobselect"){e&&this.moveJobSelect(t==="left"?-1:1);return}if(this.state==="bonus"&&e&&this.m.buttons.left&&this.m.buttons.right){this.bonusSpeed=6;return}if(this.state==="attract"&&e){this.show(Ys("GRAND CHAMPION",[this.highScores[0]]),2.5,2);return}if(this.state==="playing"&&e&&!this.tilted){let i=this.p;if(this.skill.active&&!this.ballActive)this.skill.lane=(this.skill.lane+(t==="left"?2:1))%3;else{let n=i.lanes;i.lanes=t==="left"?[n[1],n[2],n[0]]:[n[2],n[0],n[1]]}}}sw_shooter(){}sw_gateShooter(){this.launchDetected()}laneHit(t){let e=this.p;if(this.skill.active&&this.skill.timer>0&&(this.skill.active=!1,t===this.skill.lane)){let i=1e6+e.skillCount*5e5;e.skillCount++,this.score(i),this.sfx("skillShot"),this.flash("flPops",.6),this.say("Skill shot"),this.show(ni("SKILL SHOT",i),2.2,7),this.log("skillShot",{v:i})}e.lanes[t]?(this.score(5e3),this.sfx("rollover")):(e.lanes[t]=!0,this.score(25e3),this.sfx("laneLit"),e.lanes.every(Boolean)&&this.keyComplete())}sw_laneK(){this.laneHit(0)}sw_laneE(){this.laneHit(1)}sw_laneY(){this.laneHit(2)}keyComplete(){let t=this.p;t.laneCompletions++,this.after(.35,()=>{t.lanes=[!1,!1,!1]}),this.flash("flPops",.5);let e;t.bonusX<6?(t.bonusX++,e=`BONUS ${t.bonusX}X`):(this.score(1e6),e="1,000,000"),t.kickbackLit||(t.kickbackLit=!0,this.m.kickbackArmed=!0,e+=" +KICKBACK"),this.score(1e5),this.sfx("keyComplete"),this.show(ni("K-E-Y COMPLETE",null,e),2,6),this.log("keyComplete",{bonusX:t.bonusX})}popHit(t){let e=this.p;e.pops++,e.bonus.pops++,this.score(5e3*e.popLevel+1e3),this.sfx("pop"),this.flash("flPops",.12),e.pops%20===0&&e.popLevel<6&&(e.popLevel++,this.sfx("alarmLevel"),this.show(ni("ALARM LEVEL "+e.popLevel,null,`POPS WORTH ${ge(5e3*e.popLevel+1e3)}`),1.8,5)),this.job&&this.job.id==="INSIDE"&&this.jobInsideBump()}sw_pop1(){this.popHit(1)}sw_pop2(){this.popHit(2)}sw_pop3(){this.popHit(3)}sw_slingL(){this.score(1010),this.sfx("sling")}sw_slingR(){this.score(1010),this.sfx("sling")}sw_inL(){this.score(1e4),this.sfx("inlane"),this.combo.inlaneAt=this.t}sw_inR(){this.score(1e4),this.sfx("inlane"),this.combo.inlaneAt=this.t}sw_outL(){this.score(5e4),this.sfx("outlane")}sw_outR(){this.score(5e4),this.sfx("outlane")}sw_kickback(){}sw_kickbackFired(){this.p.kickbackLit=!1,this.sfx("kickback"),this.flash("flLeft",.4),this.show(ke("KICKBACK","SAVED!"),1.2,5)}sw_spinner(){let e=this.p.spinnerLitUntil>this.t?5e3:1e3;this.job&&this.job.id==="SAFE"&&(e=5e4,this.jobProgress(1)),this.score(e),this.sfx("spinner"),this.p.bonus.switches++}standupHit(t){let e=this.p;this.score(25e3),this.sfx("standup"),e.standups[t]=!0,e.standups.every(Boolean)&&(e.standups=[!1,!1],e.kickbackLit?(e.spinnerLitUntil=this.t+20,this.score(25e4),this.show(ni("ALIBI SET",25e4,"SPINNER LIT"),1.8,5)):(e.kickbackLit=!0,this.m.kickbackArmed=!0,this.show(ni("ALIBI SET",null,"KICKBACK LIT"),1.8,5)),this.sfx("keyComplete"))}sw_standC(){this.standupHit(0)}sw_standR(){this.standupHit(1)}majorShot(t){let e=this.combo;if(this.t-e.last<4&&e.lastShot!==null){e.n++;let i=25e4*e.n;this.score(i),this.sfx("combo"),this.show(ni(`${e.n+1}-WAY COMBO`,i),1.4,4)}else e.n=0;e.last=this.t,e.lastShot=t,this.mb&&this.mb.jp[t]&&this.collectJackpot(t),this.wizard&&this.wizard.lit[t]&&this.wizardShot(t),this.job&&this.jobShot(t)}sw_orbitL(t){if(t.vy<0){this.orbitShot("orbitL");return}this.skill.active&&this.skill.timer>0&&(this.skill.active=!1,this.skill.superUntil=this.t+6,this.sfx("superSkillLit"),this.show(ke("SUPER SKILL","SHOOT THE RIGHT RAMP"),1.8,5))}sw_orbitR(t){t.vy<0&&this.orbitShot("orbitR")}orbitShot(t){let e=this.p;e.orbits++,e.bonus.orbits++,this.score(5e4),this.sfx("orbit"),!e.jobLit&&!this.job&&!this.jobPending&&(e.scout++,e.scout>=3?(e.scout=0,e.jobLit=!0,this.sfx("jobLit"),this.show(ni("JOB IS LIT",null,"SHOOT THE HIDEOUT"),1.8,5)):this.show(ni("SCOUTING",null,`${3-e.scout} MORE TO LIGHT JOB`),1.2,3)),this.majorShot(t)}sw_rampLEnter(){this.sfx("rampEnter")}sw_rampREnter(){this.sfx("rampEnter")}sw_rampLMade(){this.rampShot("rampL")}sw_rampRMade(){if(this.skill.superUntil>this.t){this.skill.superUntil=0;let t=3e6+this.p.skillCount*1e6;this.p.skillCount++,this.score(t),this.sfx("skillShot"),this.say("Super skill shot"),this.show(ni("SUPER SKILL SHOT",t),2.4,8)}this.p.spinnerLitUntil=this.t+20,this.rampShot("rampR")}rampShot(t){let e=this.p;e.ramps++,e.bonus.ramps++,this.rampStreak++;let i=1e5+25e3*Math.min(20,this.rampStreak-1);this.score(i),this.sfx("rampMade"),this.flash(t==="rampL"?"flLeft":"flRight",.3),(e.ramps===12||e.ramps===30)&&this.lightExtraBall("RAMP MASTER"),this.majorShot(t)}dropHit(t){let e=this.p;if(this.score(25e3),this.sfx("dropTarget"),this.job&&this.job.lit&&this.job.lit.vault&&this.jobShot("vault"),this.job&&this.job.id==="LASER"&&(this.score(75e4),this.jobProgress(0)),this.m.dropsDown.every(Boolean)){if(e.dropBanks++,this.score(1e5*Math.min(10,e.dropBanks)),this.flash("flVault",.5),this.sfx("bankComplete"),this.job&&this.job.id==="LASER"){if(this.jobProgress(1,!0),!this.job)return;this.after(.8,()=>this.m.resetDrops(),"dropReset");return}!this.mb&&!this.wizard&&(e.lockLit=!0,e.doorHits=0,e.doorHitsNeeded=e.lockBaseReq+e.locks,e.doorHitsNeeded===0?this.openVaultForLock():this.show(ni("LASERS DOWN",null,`CRACK THE DOOR ${e.doorHitsNeeded}X`),1.8,5))}}sw_drop1(){this.dropHit(0)}sw_drop2(){this.dropHit(1)}sw_drop3(){this.dropHit(2)}openVaultForLock(){this.m.openDoor(),this.sfx("doorOpen"),this.say("The vault is open"),this.show(va("LOCK IS LIT"),2,6)}sw_vaultDoor(){let t=this.p;this.score(5e4),this.sfx("doorHit"),this.flash("flVault",.2),this.job&&this.job.lit&&this.job.lit.vault&&this.jobShot("vault"),this.job&&this.job.id==="SAFE"&&(this.score(5e5),this.jobProgress(4)),t.lockLit&&!this.m.doorOpen&&(t.doorHits++,t.doorHits>=t.doorHitsNeeded?this.openVaultForLock():this.show(ni("CRACKING",null,`${t.doorHitsNeeded-t.doorHits} MORE`),1.2,4))}restoreDoor(){let t=this.p,e=this.mb&&this.mb.superLit||this.wizard&&this.wizard.superLit||this.job&&this.job.id==="INSIDE"||t&&t.lockLit&&t.doorHits>=t.doorHitsNeeded;e?this.m.openDoor():this.m.closeDoor(),e&&!this.m.dropsDown.every(Boolean)&&this.m.dropAll()}sw_vault(){let t=this.p;this.flash("flVault",.8),this.sfx("vaultEnter");let e=1.2;if(this.majorShot("vault"),this.job&&this.job.id==="INSIDE"&&(this.collectInsideMan(),e=2),this.wizard&&this.wizard.superLit)this.wizardSuper(),e=2.5;else if(this.mb&&this.mb.superLit)this.collectSuper(),e=2.5;else if(!this.mb&&!this.wizard&&t.lockLit){if(t.lockLit=!1,t.locks++,t.bonus.locks++,this.score(5e5),t.locks>=3){this.startVaultMultiball();return}this.sfx("lock"),this.say(`Ball ${t.locks} locked`),this.show(iu(t.locks),2.4,7),e=2.2,this.after(e+.6,()=>{!this.mb&&!this.p.lockLit&&this.m.resetDrops()})}else this.score(25e4);this.after(e,()=>{this.m.eject("vault"),this.restoreDoor()})}startVaultMultiball(){let t=this.p;t.locks=0,t.mbCount++,t.lockBaseReq=Math.min(3,t.lockBaseReq+1),this.mb={jp:{},jpValue:5e6,collected:0,superLit:!1,superValue:2e7,addABall:!0,startedAt:this.t};for(let e of Zs)this.mb.jp[e]=!0;this.sfx("multiball"),this.say("Vault multiball"),this.ui.sound.music("multiball"),this.show(nu(),3.2,9),this.log("multiballStart"),this.after(2.6,()=>{this.m.eject("vault"),this.m.serveBall(!0),this.m.serveBall(!0),this.ballSaveUntil=this.t+Rp,this.m.closeDoor(),this.m.resetDrops()})}collectJackpot(t){let e=this.mb;e.jp[t]=!1;let i=e.jpValue;this.score(i),e.collected++,e.jpValue+=1e6,this.sfx("jackpot"),this.say("Jackpot"),this.flash("flVault",.6),this.flash("flPops",.6),this.flash("flLeft",.6),this.flash("flRight",.6),this.show(Js("JACKPOT",i),2.2,8),this.log("jackpot",{v:i}),Zs.every(n=>!e.jp[n])&&(e.superLit=!0,this.m.dropAll(),this.m.openDoor(),this.after(2.2,()=>this.show(va("SUPER JACKPOT LIT"),2,7)))}collectSuper(){let t=this.mb,e=t.superValue+t.collected*1e6;this.score(e),t.superLit=!1,t.superValue+=1e7;for(let i of Zs)t.jp[i]=!0;this.sfx("superJackpot"),this.say("Super jackpot");for(let i of["flVault","flPops","flLeft","flRight","flHide"])this.flash(i,1.2);this.show(Js("SUPER JACKPOT",e),3,9),this.log("superJackpot",{v:e}),this.after(2.5,()=>{this.m.closeDoor(),this.m.resetDrops()})}endMultiball(){this.mb=null,this.ui.sound.music(this.job?"job":"main"),this.show(ke("MULTIBALL","OVER"),1.5,4),this.restoreDoor(),this.m.resetDrops(),this.p.mbCount===1&&this.lightExtraBall("FIRST MULTIBALL"),this.log("multiballEnd")}sw_hideout(){let t=this.p;if(this.flash("flHide",.5),this.sfx("scoop"),this.majorShot("hideout"),this.state!=="playing")return;let e=[];t.extraBallLit&&e.push(()=>this.collectExtraBall()),this.mb&&this.mb.addABall&&e.push(()=>this.addABall());let i=!1;!this.mb&&!this.wizard&&!this.job?t.jobsPlayed.length>=es.length&&t.jobLit?e.push(()=>this.startWizard()):t.jobLit?i=!0:t.extraBallLit||e.push(()=>this.mystery()):e.length||(this.score(5e5),this.show(ni("HIDEOUT",5e5),1.2,4));let n=.3;for(let r of e)this.after(n,r),n+=1.8;i?(this.jobPending=!0,this.after(n,()=>this.beginJobSelect(),"jobSelectStart")):this.after(Math.max(1,n),()=>this.releaseHideout(),"hideoutRelease")}releaseHideout(){this.state!=="jobselect"&&this.m.eject("hideout")}mystery(){let t=this.p,e=[["BIG POINTS",()=>this.score(15e5),15e5],["500,000",()=>this.score(5e5)],["BONUS +1X",()=>{t.bonusX=Math.min(6,t.bonusX+1)}],["LIGHT KICKBACK",()=>{t.kickbackLit=!0,this.m.kickbackArmed=!0}],["ALARM LEVEL UP",()=>{t.popLevel=Math.min(6,t.popLevel+1)}],["BALL SAVE 10 SEC",()=>{this.ballSaveUntil=Math.max(this.ballSaveUntil,this.t)+10}],["SCOUT +2",()=>{t.scout+=2,t.scout>=3&&(t.scout=0,t.jobLit=!0)}],["SPINNER LIT",()=>{t.spinnerLitUntil=this.t+25}]];t.ebAwarded<2&&Math.random()<.06&&e.push(["LIGHT EXTRA BALL",()=>this.lightExtraBall()]);let[i,n]=e[Math.floor(Math.random()*e.length)];n(),this.score(1e5),this.sfx("mystery"),this.show(su(i),2,6)}lightExtraBall(t){let e=this.p;if(e.ebAwarded+(e.extraBallLit?1:0)>=3){this.score(2e6);return}e.extraBallLit=!0,this.sfx("ebLit"),this.say("Extra ball is lit"),this.show(ni("EXTRA BALL LIT",null,t||"SHOOT THE HIDEOUT"),2,6)}collectExtraBall(){let t=this.p;t.extraBallLit=!1,t.extraBalls++,t.ebAwarded++,this.sfx("extraBall"),this.say("Extra ball"),this.show(ke("EXTRA BALL","SHOOT AGAIN"),2.2,8),this.log("extraBall")}addABall(){this.mb.addABall=!1,this.m.serveBall(!0),this.ballSaveUntil=Math.max(this.ballSaveUntil,this.t+6),this.sfx("addABall"),this.show(ke("ADD-A-BALL","MORE CREW"),1.6,7)}beginJobSelect(){let t=this.p,e=es.map((i,n)=>n).filter(i=>!t.jobsPlayed.includes(i));if(!e.length||this.state!=="playing"){this.jobPending=!1,this.mystery(),this.after(1.8,()=>this.releaseHideout(),"hideoutRelease");return}this.state="jobselect",this.jobPending=!0,this.m.setFlippersEnabled(!1),this.jobChoices=e,this.jobSel=0,this.jobSelectTimer=7,this.cancel("hideoutRelease"),this.sfx("jobSelect"),this.ui.sound.music("select"),this.show(ru(()=>es[this.jobChoices[this.jobSel]],()=>this.jobSelectTimer),8,8)}moveJobSelect(t){this.jobSel=(this.jobSel+t+this.jobChoices.length)%this.jobChoices.length,this.sfx("select")}confirmJobSelect(){if(this.state!=="jobselect")return;let t=this.jobChoices[this.jobSel];this.state="playing",this.jobPending=!1,this.tilted||this.m.setFlippersEnabled(!0),this.dmd.clear(),this.startJob(t),this.after(1.4,()=>this.m.eject("hideout"))}startJob(t){let e=this.p,i=es[t];e.jobLit=!1,e.jobsPlayed.push(t),this.job={idx:t,id:i.id,def:i,time:i.time,progress:0,need:0,lit:{},value:0,hits:0,startedAt:this.t};let n=this.job;switch(i.id){case"CASE":for(let r of js)n.lit[r]=!0;n.need=js.length,n.value=1e6;break;case"SAFE":n.need=60;break;case"LASER":n.need=2,this.m.resetDrops();break;case"DRIVE":n.lit.rampL=n.lit.rampR=!0,n.need=5,n.value=2e6;break;case"INSIDE":n.value=15e6,n.need=1,this.m.dropAll(),this.m.openDoor(),n.lit.vault=!0;break;case"CROSS":n.need=4,n.moveT=0,n.pos=0,n.lit.orbitL=!0;break}this.sfx("jobStart"),this.say(i.name.toLowerCase()),this.ui.sound.music("job"),this.show(au(i),2.6,8),this.log("jobStart",{job:i.id})}jobShot(t){let e=this.job;switch(e.id){case"CASE":if(e.lit[t]){e.lit[t]=!1,e.progress++;let i=e.value;e.value+=25e4,this.score(i),this.sfx("jobHit"),this.show(Ks(e.def.name,i,`${e.need-e.progress} TO GO`),1.4,6),e.progress>=e.need&&this.completeJob(5e6)}break;case"DRIVE":if(t==="rampL"||t==="rampR"){e.progress++;let i=e.value;e.value+=5e5,this.score(i),e.time+=3,this.sfx("jobHit"),this.show(Ks("GETAWAY DRIVE",i,`${Math.max(0,e.need-e.progress)} TO GO`),1.4,6),e.progress>=e.need&&this.completeJob(1e7)}break;case"CROSS":e.lit[t]&&(e.progress++,this.score(3e6),this.sfx("jobHit"),this.show(Ks("DOUBLE CROSS",3e6,`${Math.max(0,e.need-e.progress)} TO GO`),1.4,6),this.crossMove(),e.progress>=e.need&&this.completeJob(6e6));break}}jobProgress(t,e){let i=this.job;i&&(i.id==="SAFE"?(t===1&&i.progress++,t===4&&(i.progress+=5),i.progress>=i.need&&this.completeJob(75e5)):i.id==="LASER"&&e&&(i.progress++,this.show(Ks("LASER MAZE",2e6,`${Math.max(0,i.need-i.progress)} TO GO`),1.4,6),this.score(2e6),i.progress>=i.need&&this.completeJob(8e6)))}jobInsideBump(){}collectInsideMan(){let t=this.job,e=Math.round(t.value/1e4)*1e4;this.score(e),this.completeJob(0,e)}crossMove(){let t=this.job;t.lit={};let e=js.filter((n,r)=>r!==t.pos),i=e[Math.floor(Math.random()*e.length)];t.pos=js.indexOf(i),t.lit[i]=!0,t.moveT=0}completeJob(t,e){let i=this.p,n=this.job;this.score(t),i.jobsDone.push(n.idx),i.bonus.jobs++,this.sfx("jobComplete"),this.say("Job complete");for(let r of["flVault","flPops","flHide"])this.flash(r,.8);this.show(ou(n.def.name,e??t),2.8,9),this.log("jobComplete",{job:n.id}),this.endJob(!0)}endJob(t){let e=this.p,i=this.job;i&&(this.job=null,t||(this.sfx("jobFail"),this.show(ke(i.def.name,"TIME IS UP"),1.8,7),this.log("jobEnd",{job:i.id})),!this.mb&&!this.wizard&&this.ui.sound.music("main"),(i.id==="INSIDE"||i.id==="LASER")&&(this.restoreDoor(),this.m.resetDrops()),e.jobsDone.length===3&&this.lightExtraBall("3 JOBS DONE"),e.jobsPlayed.length>=es.length?(e.jobLit=!0,this.after(2.5,()=>this.show(ni("THE BIG SCORE",null,"IS LIT AT HIDEOUT"),2.5,7))):e.scout=0)}updateJob(t){let e=this.job;if(!e)return;!(this.m.ballsOnPlayfield()===0)&&!this.m.shooterLaneBall()&&(e.time-=t),e.id==="INSIDE"&&(e.value=Math.max(3e6,e.value-4e5*t)),e.id==="CROSS"&&(e.moveT+=t,e.moveT>3.2&&this.crossMove()),e.time<=0&&this.endJob(!1)}startWizard(){let t=this.p;t.jobLit=!1,this.wizard={lit:{},value:1e7,collected:0,superLit:!1,level:1};for(let e of _u)this.wizard.lit[e]=!0;this.sfx("wizard"),this.say("The big score"),this.ui.sound.music("wizard"),this.show(lu(),3.5,10),this.log("wizardStart"),this.after(3,()=>{for(let e=0;e<3;e++)this.m.serveBall(!0);this.ballSaveUntil=this.t+Cp})}wizardShot(t){let e=this.wizard;e.lit[t]=!1;let i=e.value*e.level;this.score(i),e.collected++,this.sfx("jackpot"),this.show(Js("BIG SCORE",i),1.6,8),Object.values(e.lit).every(n=>!n)&&(e.superLit=!0,this.m.dropAll(),this.m.openDoor(),this.show(va("VAULT: 100,000,000"),2,8))}wizardSuper(){let t=this.wizard,e=1e8*t.level;this.score(e),this.sfx("superJackpot"),this.say("You got the big score");for(let i of["flVault","flPops","flLeft","flRight","flHide"])this.flash(i,2);this.show(Js("THE BIG SCORE",e),3.5,10),t.superLit=!1,t.level++;for(let i of _u)t.lit[i]=!0;this.after(3,()=>{this.m.closeDoor(),this.m.resetDrops()})}endWizard(){let t=this.p;this.wizard=null,t.wizardDone++,t.jobsPlayed=[],t.jobsDone=[],t.jobLit=!0,this.ui.sound.music("main"),this.show(ke("HEIST COMPLETE","NEW JOBS AVAILABLE"),2.5,8),this.restoreDoor(),this.m.resetDrops()}onDrain(){let t=this.m.ballsInPlay();if(!(this.state==="jobselect"&&t>0)){if(!this.tilted&&this.ballActive&&this.ballSaveUntil>0&&this.t<this.ballSaveUntil+2){this.m.serveBall(!0,this.mb||this.wizard?.8:1.5),this.sfx("ballSave"),this.say("Ball saved"),!this.mb&&!this.wizard&&this.show(ke("BALL SAVED","GET READY"),1.8,6),this.log("ballSaved");return}if(t===1&&(this.mb||this.wizard)){this.mb&&this.endMultiball(),this.wizard&&this.endWizard();return}t===0&&this.endBall()}}onDrainOutsideGame(){}onTiltWarning(){this.tilted||(this.tiltWarnings++,this.sfx("tiltWarning"),this.tiltWarnings>=3?this.tilt():this.show(ke("DANGER",this.tiltWarnings===1?"WARNING":"LAST WARNING"),1.6,9))}tilt(){this.state==="jobselect"&&(this.state="playing",this.jobPending=!1,this.after(.5,()=>this.m.eject("hideout"))),this.tilted=!0,this.m.setFlippersEnabled(!1),this.m.kickbackArmed=!1,this.sfx("tilt"),this.ui.sound.music(null),this.dmd.clear(),this.show(ke("T I L T",""),30,10),this.job=null,this.mb=null,this.wizard=null,this.ballSaveUntil=0,this.log("tilt")}endBall(){let t=this.p;if(this.m.setFlippersEnabled(!1),this.m.kickbackArmed=!1,this.job&&(this.job=null),this.mb=null,this.wizard=null,this.state="bonus",this.ui.sound.music(null),this.dmd.clear(),this.log("ballEnd",{player:t.n,ball:t.ball,score:t.score}),this.bonusT=0,this.bonusDur=1/0,this.tilted){this.after(2,()=>this.nextBall());return}this.sfx("drain");let e=t.bonus,i=[["RAMPS",e.ramps,5e4],["ORBITS",e.orbits,25e3],["POPS",e.pops,2e3],["LOCKS",e.locks,25e4],["JOBS",e.jobs,1e6],["SWITCHES",e.switches,500]],n=i.reduce((o,[,c,l])=>o+c*l,0);this.bonusSpeed=1;let r=cu(i,t.bonusX,n),a=1.1*i.length+2.4;this.show(r,a,9),this.bonusT=0,this.bonusDur=a,this.bonusTotal=n*t.bonusX,this.bonusLines=i.length}finishBonus(){let t=this.p;t.score+=this.bonusTotal,t.bonus={ramps:0,orbits:0,locks:0,jobs:0,switches:0,pops:0},!t.replayAwarded&&t.score>=xu&&(t.replayAwarded=!0,this.sfx("knocker")),this.nextBall()}nextBall(){let t=this.p;if(this.dmd.clear(),!this.tilted&&t.extraBalls>0){t.extraBalls--,this.state="playing",this.show(ke("SHOOT AGAIN",`PLAYER ${t.n}`),1.8,6),this.startBall();return}t.bonusX=1,t.ball++;let e=(this.pi+1)%this.players.length;for(let i=0;i<this.players.length;i++)if(this.players[(this.pi+1+i)%this.players.length].ball<=gu){e=(this.pi+1+i)%this.players.length;break}if(this.players.every(i=>i.ball>gu)){this.gameOver();return}this.pi=e,this.state="playing",this.startBall()}gameOver(){this.state="match",this.m.setFlippersEnabled(!1),this.lastScores=this.players.map(i=>i.score),this.log("gameOver",{scores:this.lastScores});let t=Math.floor(Math.random()*10)*10,e=this.players.some(i=>i.score%100===t);this.sfx("match"),this.show(hu(t,this.players.map(i=>i.score%100),e),3.5,9),this.after(3.6,()=>{e&&this.sfx("knocker"),this.hsQueue=this.players.map(i=>i).filter(i=>this.qualifies(i.score)).sort((i,n)=>n.score-i.score),this.nextHighScoreEntry()})}loadHighScores(){let t=this.ui.storage.load(),e=[{name:"VIC",score:25e7},{name:"ACE",score:15e7},{name:"MOE",score:1e8},{name:"LOU",score:75e6},{name:"SAL",score:5e7}];return Array.isArray(t)&&t.length===5&&t.every(i=>i&&typeof i.name=="string"&&Number.isFinite(i.score))?t:e}qualifies(t){return t>this.highScores[4].score}nextHighScoreEntry(){let t=this.hsQueue&&this.hsQueue.shift();if(!t){this.finishGame();return}this.state="hsentry",this.hs={player:t,letters:[0,0,0],pos:0,charset:"ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789",timeout:45},this.hs.letters=[0,0,0];let e=this.highScores.filter(i=>i.score>=t.score).length;this.hs.rank=e,this.sfx("highScore"),this.say("Enter your initials"),this.ui.sound.music("highscore"),this.dmd.clear(),this.show(uu(()=>this.hs),999,10)}hsMove(t){let e=this.hs,i=e.charset.length;e.letters[e.pos]=(e.letters[e.pos]+t+i)%i,e.timeout=45,this.sfx("select")}hsSelect(){let t=this.hs;t.pos++,this.sfx("hsLetter"),t.timeout=45,t.pos>=3&&this.hsCommit()}hsCommit(){let t=this.hs,e=t.letters.map(i=>t.charset[i]).join("");this.highScores.push({name:e.trim()?e:"???",score:t.player.score}),this.highScores.sort((i,n)=>n.score-i.score),this.highScores=this.highScores.slice(0,5),this.ui.storage.save(this.highScores),this.log("highScore",{name:e,score:t.player.score}),this.dmd.clear(),this.show(ke(t.rank===0?"GRAND CHAMPION":"HIGH SCORE",e+"  "+ge(t.player.score)),2.4,9),this.state="hswait",this.after(2.5,()=>this.nextHighScoreEntry())}finishGame(){this.state="gameover",this.ui.sound.music(null),this.show(ke("GAME OVER",""),3,8),this.after(3.2,()=>{this.state==="gameover"&&this.enterAttract()})}update(t){this.t+=t;for(let e in this.flashers)this.flashers[e]=Math.max(0,this.flashers[e]-t);if(this.timers.length){let e=this.timers.filter(i=>this.t>=i.at);if(e.length){this.timers=this.timers.filter(i=>this.t<i.at);for(let i of e)i.fn()}}switch(this.state){case"attract":this.t>=this.attractNext&&!this.dmd.busy()&&(this.attractCycle(),this.attractNext=this.t+.2);break;case"playing":this.skill.active&&(this.ballActive?(this.skill.timer-=t,this.skill.timer<=0&&(this.skill.active=!1)):this.t%.9<t&&!this.m.buttons.left&&!this.m.buttons.right&&(this.skill.lane=(this.skill.lane+1)%3)),this.updateJob(t);break;case"jobselect":this.jobSelectTimer-=t,this.updateJob(t),this.jobSelectTimer<=0&&this.confirmJobSelect();break;case"bonus":this.bonusT+=t*(this.bonusSpeed||1),this.bonusT>=this.bonusDur&&(this.state="bonusdone",this.dmd.clear(),this.finishBonus());break;case"hsentry":this.hs.timeout-=t,this.hs.timeout<=0&&this.hsCommit();break}this.state==="playing"&&this.m.heldCount("hideout")>0&&!this.timers.some(e=>e.tag==="hideoutRelease")&&!this.jobPending&&this.after(1.5,()=>this.releaseHideout(),"hideoutRelease")}drawBase(t,e){if(this.state==="attract"||this.state==="gameover"){Jl().draw(t,e%6,6);return}if(this.p){if(this.job&&this.state==="playing"){fu(t,e,this.job,this.p,this);return}if(this.mb&&this.state==="playing"){pu(t,e,this.mb,this.p);return}if(this.wizard&&this.state==="playing"){mu(t,e,this.wizard,this.p);return}du(t,e,this.players,this.pi,this.p.ball,this.credits)}}lamps(){let t={},e=this.t,i=l=>Math.floor(e*l*2)%2===0?1:0,n=i(1.2),r=i(4),a=i(2.2);if(this.state==="attract"||this.state==="gameover"||this.state==="match"||this.state==="hsentry"||this.state==="hswait")return this.attractLamps(e);let o=this.p;if(!o||this.tilted)return t;let c=l=>{if(this.wizard&&this.wizard.lit[l])return r;if(this.job){let h=this.job;if(h.lit&&h.lit[l]||h.id==="SAFE"&&l==="orbitL")return r}return 0};for(let l of js)t[Pp[l]]=c(l);if(!this.job&&!this.wizard&&(o.lockLit&&(t.arrVault=this.m.doorOpen?r:n),(o.extraBallLit||o.jobLit)&&(t.arrHide=a),this.skill.superUntil>e&&(t.arrRR=r)),this.mb){for(let l of Zs)t[Ip[l]]=this.mb.jp[l]?a:0;t.superJP=this.mb.superLit?r:0,t.arrVault=this.mb.superLit?r:t.arrVault}if(this.wizard&&(t.superJP=this.wizard.superLit?r:0,t.bigScore=r,t.arrVault=this.wizard.superLit?r:t.arrVault),this.mb||this.wizard)for(let l=1;l<=3;l++)t["lock"+l]=Math.floor(e*8)%3===3-l?1:.15;else for(let l=1;l<=3;l++)t["lock"+l]=o.locks>=l?1:o.locks+1===l&&o.lockLit?n:0;t.lockLit=o.lockLit?this.m.doorOpen?r:a:0,this.m.dropsDown.forEach((l,h)=>{t["dropL"+(h+1)]=l?0:1}),t.startJob=o.jobLit&&!this.job&&!this.wizard?a:0,t.extraBallLit=o.extraBallLit?r:0,t.mystery=!o.jobLit&&!o.extraBallLit&&!this.job?n*.6:0;for(let l=0;l<3;l++)t["scout"+(l+1)]=o.scout>l?1:0;pa.forEach((l,h)=>{t["job"+h]=this.job&&this.job.idx===h?r:o.jobsDone.includes(h)?1:o.jobsPlayed.includes(h)?.35:0}),this.wizard||(t.bigScore=o.jobsPlayed.length>=es.length?a:0),["lampK","lampE","lampY"].forEach((l,h)=>{this.skill.active&&!this.ballActive?t[l]=h===this.skill.lane?r:0:t[l]=o.lanes[h]?1:0});for(let l=2;l<=6;l++)t["bx"+l]=o.bonusX>=l?1:0;return t.lampKickback=o.kickbackLit?1:0,t.lampInL=t.lampInR=this.t-(this.combo.inlaneAt||-9)<3?a:0,t.lampSpinner=o.spinnerLitUntil>e?r:0,t.lampOutR=0,o.extraBalls>0?t.shootAgain=1:this.ballActive&&this.ballSaveUntil>e?t.shootAgain=this.ballSaveUntil-e<3?r:a:!this.ballActive&&this.ballSaveArmed>0?t.shootAgain=n:t.shootAgain=0,t.lampCombo=e-this.combo.last<4&&this.combo.lastShot?r:0,t}attractLamps(t){let e={},i=["arrLO","arrLR","arrVault","arrRR","arrHide","arrRO","jpLO","jpLR","jpRR","jpRO","lock1","lock2","lock3","superJP","dropL1","dropL2","dropL3","lockLit","startJob","extraBallLit","mystery","scout1","scout2","scout3","job0","job1","job2","job3","job4","job5","bigScore","lampK","lampE","lampY","bx2","bx3","bx4","bx5","bx6","lampInL","lampInR","lampKickback","lampOutR","lampSpinner","shootAgain","lampCombo"],n=Math.floor(t/8)%3;return i.forEach((r,a)=>{let o;n===0?o=Math.max(0,Math.sin(t*4-a*.35)):n===1?o=(Math.floor(t*6)+a)%6===0?1:.1:o=.5+.5*Math.sin(t*2+a%7),e[r]=o}),e}flasherLevels(){let t={};for(let e in this.flashers)t[e]=Math.min(1,this.flashers[e]*5);return t}};var Yu=0,Lc=1,Ju=2;var Xn=1,Ku=2,Is=3,bn=0,Ye=1,ai=2,Mi=0,Ls=1,en=2,Dc=3,Nc=4,ju=5;var qn=100,Zu=101,$u=102,Qu=103,td=104,ed=200,id=201,nd=202,sd=203,Uc=204,Fc=205,rd=206,ad=207,od=208,ld=209,cd=210,hd=211,ud=212,dd=213,fd=214,Wa=0,Xa=1,qa=2,gs=3,Ya=4,Ja=5,Ka=6,ja=7,Oc=0,pd=1,md=2,Ci=0,Nr=1,Ur=2,Fr=3,Yn=4,Or=5,Br=6,kr=7;var Bc=300,Tn=301,Jn=302,wo=303,Ao=304,Hr=306,xs=1e3,Fi=1001,Za=1002,ze=1003,gd=1004;var zr=1005;var Xe=1006,Ro=1007;var Gi=1008;var oi=1009,kc=1010,Hc=1011,Ds=1012,Co=1013,Pi=1014,Ii=1015,Ne=1016,Po=1017,Io=1018,Ns=1020,zc=35902,Vc=35899,Gc=1021,Wc=1022,Si=1023,Bi=1026,En=1027,Xc=1028,Lo=1029,wn=1030,Do=1031;var No=1033,Vr=33776,Gr=33777,Wr=33778,Xr=33779,Uo=35840,Fo=35841,Oo=35842,Bo=35843,ko=36196,Ho=37492,zo=37496,Vo=37488,Go=37489,qr=37490,Wo=37491,Xo=37808,qo=37809,Yo=37810,Jo=37811,Ko=37812,jo=37813,Zo=37814,$o=37815,Qo=37816,tl=37817,el=37818,il=37819,nl=37820,sl=37821,rl=36492,al=36494,ol=36495,ll=36283,cl=36284,Yr=36285,hl=36286;var ar=2300,$a=2301,Va=2302,Mc=2303,Sc=2400,bc=2401,Tc=2402;var xd=3200;var ul=0,_d=1,nn="",Ze="srgb",or="srgb-linear",lr="linear",re="srgb";var Ga=7680;var vd=519,yd=512,Md=513,Sd=514,dl=515,bd=516,Td=517,fl=518,Ed=519,wd=35044;var qc="300 es",Ri=2e3,_s=2001;function Dp(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function Np(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function cr(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function Ad(){let s=cr("canvas");return s.style.display="block",s}var yu={},vs=null;function Yc(...s){let t="THREE."+s.shift();vs?vs("log",t,...s):console.log(t,...s)}function Rd(s){let t=s[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=s[1];e&&e.isStackTrace?s[0]+=" "+e.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function kt(...s){s=Rd(s);let t="THREE."+s.shift();if(vs)vs("warn",t,...s);else{let e=s[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...s)}}function zt(...s){s=Rd(s);let t="THREE."+s.shift();if(vs)vs("error",t,...s);else{let e=s[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...s)}}function zn(...s){let t=s.join(" ");t in yu||(yu[t]=!0,kt(...s))}function Cd(s,t,e){return new Promise(function(i,n){function r(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:n();break;case s.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}var Pd={[Wa]:Xa,[qa]:Ka,[Ya]:ja,[gs]:Ja,[Xa]:Wa,[Ka]:qa,[ja]:Ya,[Ja]:gs},ki=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){let i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){let i=this._listeners;if(i===void 0)return;let n=i[t];if(n!==void 0){let r=n.indexOf(e);r!==-1&&n.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let i=e[t.type];if(i!==void 0){t.target=this;let n=i.slice(0);for(let r=0,a=n.length;r<a;r++)n[r].call(this,t);t.target=null}}},Ke=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var Kl=Math.PI/180,Qa=180/Math.PI;function Us(){let s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Ke[s&255]+Ke[s>>8&255]+Ke[s>>16&255]+Ke[s>>24&255]+"-"+Ke[t&255]+Ke[t>>8&255]+"-"+Ke[t>>16&15|64]+Ke[t>>24&255]+"-"+Ke[e&63|128]+Ke[e>>8&255]+"-"+Ke[e>>16&255]+Ke[e>>24&255]+Ke[i&255]+Ke[i>>8&255]+Ke[i>>16&255]+Ke[i>>24&255]).toLowerCase()}function te(s,t,e){return Math.max(t,Math.min(e,s))}function Up(s,t){return(s%t+t)%t}function jl(s,t,e){return(1-e)*s+e*t}function $s(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:case Uint8ClampedArray:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ri(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Qc=class Qc{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,i=this.y,n=t.elements;return this.x=n[0]*e+n[3]*i+n[6],this.y=n[1]*e+n[4]*i+n[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=te(this.x,t.x,e.x),this.y=te(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=te(this.x,t,e),this.y=te(this.y,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(te(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(te(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let i=Math.cos(e),n=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*i-a*n+t.x,this.y=r*n+a*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Qc.prototype.isVector2=!0;var at=Qc,Hi=class{constructor(t=0,e=0,i=0,n=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=n}static slerpFlat(t,e,i,n,r,a,o){let c=i[n+0],l=i[n+1],h=i[n+2],d=i[n+3],u=r[a+0],f=r[a+1],m=r[a+2],v=r[a+3];if(d!==v||c!==u||l!==f||h!==m){let g=c*u+l*f+h*m+d*v;g<0&&(u=-u,f=-f,m=-m,v=-v,g=-g);let p=1-o;if(g<.9995){let b=Math.acos(g),M=Math.sin(b);p=Math.sin(p*b)/M,o=Math.sin(o*b)/M,c=c*p+u*o,l=l*p+f*o,h=h*p+m*o,d=d*p+v*o}else{c=c*p+u*o,l=l*p+f*o,h=h*p+m*o,d=d*p+v*o;let b=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=b,l*=b,h*=b,d*=b}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,i,n,r,a){let o=i[n],c=i[n+1],l=i[n+2],h=i[n+3],d=r[a],u=r[a+1],f=r[a+2],m=r[a+3];return t[e]=o*m+h*d+c*f-l*u,t[e+1]=c*m+h*u+l*d-o*f,t[e+2]=l*m+h*f+o*u-c*d,t[e+3]=h*m-o*d-c*u-l*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,n){return this._x=t,this._y=e,this._z=i,this._w=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let i=t._x,n=t._y,r=t._z,a=t._order,o=Math.cos,c=Math.sin,l=o(i/2),h=o(n/2),d=o(r/2),u=c(i/2),f=c(n/2),m=c(r/2);switch(a){case"XYZ":this._x=u*h*d+l*f*m,this._y=l*f*d-u*h*m,this._z=l*h*m+u*f*d,this._w=l*h*d-u*f*m;break;case"YXZ":this._x=u*h*d+l*f*m,this._y=l*f*d-u*h*m,this._z=l*h*m-u*f*d,this._w=l*h*d+u*f*m;break;case"ZXY":this._x=u*h*d-l*f*m,this._y=l*f*d+u*h*m,this._z=l*h*m+u*f*d,this._w=l*h*d-u*f*m;break;case"ZYX":this._x=u*h*d-l*f*m,this._y=l*f*d+u*h*m,this._z=l*h*m-u*f*d,this._w=l*h*d+u*f*m;break;case"YZX":this._x=u*h*d+l*f*m,this._y=l*f*d+u*h*m,this._z=l*h*m-u*f*d,this._w=l*h*d-u*f*m;break;case"XZY":this._x=u*h*d-l*f*m,this._y=l*f*d-u*h*m,this._z=l*h*m+u*f*d,this._w=l*h*d+u*f*m;break;default:kt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let i=e/2,n=Math.sin(i);return this._x=t.x*n,this._y=t.y*n,this._z=t.z*n,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,i=e[0],n=e[4],r=e[8],a=e[1],o=e[5],c=e[9],l=e[2],h=e[6],d=e[10],u=i+o+d;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(a-n)*f}else if(i>o&&i>d){let f=2*Math.sqrt(1+i-o-d);this._w=(h-c)/f,this._x=.25*f,this._y=(n+a)/f,this._z=(r+l)/f}else if(o>d){let f=2*Math.sqrt(1+o-i-d);this._w=(r-l)/f,this._x=(n+a)/f,this._y=.25*f,this._z=(c+h)/f}else{let f=2*Math.sqrt(1+d-i-o);this._w=(a-n)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(te(this.dot(t),-1,1)))}rotateTowards(t,e){let i=this.angleTo(t);if(i===0)return this;let n=Math.min(1,e/i);return this.slerp(t,n),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let i=t._x,n=t._y,r=t._z,a=t._w,o=e._x,c=e._y,l=e._z,h=e._w;return this._x=i*h+a*o+n*l-r*c,this._y=n*h+a*c+r*o-i*l,this._z=r*h+a*l+i*c-n*o,this._w=a*h-i*o-n*c-r*l,this._onChangeCallback(),this}slerp(t,e){let i=t._x,n=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(i=-i,n=-n,r=-r,a=-a,o=-o);let c=1-e;if(o<.9995){let l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,e=Math.sin(e*l)/h,this._x=this._x*c+i*e,this._y=this._y*c+n*e,this._z=this._z*c+r*e,this._w=this._w*c+a*e,this._onChangeCallback()}else this._x=this._x*c+i*e,this._y=this._y*c+n*e,this._z=this._z*c+r*e,this._w=this._w*c+a*e,this.normalize();return this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),n=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(n*Math.sin(t),n*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},th=class th{constructor(t=0,e=0,i=0){this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Mu.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Mu.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,i=this.y,n=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*n,this.y=r[1]*e+r[4]*i+r[7]*n,this.z=r[2]*e+r[5]*i+r[8]*n,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,i=this.y,n=this.z,r=t.elements,a=1/(r[3]*e+r[7]*i+r[11]*n+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*n+r[12])*a,this.y=(r[1]*e+r[5]*i+r[9]*n+r[13])*a,this.z=(r[2]*e+r[6]*i+r[10]*n+r[14])*a,this}applyQuaternion(t){let e=this.x,i=this.y,n=this.z,r=t.x,a=t.y,o=t.z,c=t.w,l=2*(a*n-o*i),h=2*(o*e-r*n),d=2*(r*i-a*e);return this.x=e+c*l+a*d-o*h,this.y=i+c*h+o*l-r*d,this.z=n+c*d+r*h-a*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,i=this.y,n=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*n,this.y=r[1]*e+r[5]*i+r[9]*n,this.z=r[2]*e+r[6]*i+r[10]*n,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=te(this.x,t.x,e.x),this.y=te(this.y,t.y,e.y),this.z=te(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=te(this.x,t,e),this.y=te(this.y,t,e),this.z=te(this.z,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(te(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let i=t.x,n=t.y,r=t.z,a=e.x,o=e.y,c=e.z;return this.x=n*c-r*o,this.y=r*a-i*c,this.z=i*o-n*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Zl.copy(this).projectOnVector(t),this.sub(Zl)}reflect(t){return this.sub(Zl.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(te(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y,n=this.z-t.z;return e*e+i*i+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){let n=Math.sin(e)*t;return this.x=n*Math.sin(i),this.y=Math.cos(e)*t,this.z=n*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),n=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=n,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};th.prototype.isVector3=!0;var C=th,Zl=new C,Mu=new Hi,eh=class eh{constructor(t,e,i,n,r,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,n,r,a,o,c,l)}set(t,e,i,n,r,a,o,c,l){let h=this.elements;return h[0]=t,h[1]=n,h[2]=o,h[3]=e,h[4]=r,h[5]=c,h[6]=i,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,n=e.elements,r=this.elements,a=i[0],o=i[3],c=i[6],l=i[1],h=i[4],d=i[7],u=i[2],f=i[5],m=i[8],v=n[0],g=n[3],p=n[6],b=n[1],M=n[4],x=n[7],T=n[2],E=n[5],R=n[8];return r[0]=a*v+o*b+c*T,r[3]=a*g+o*M+c*E,r[6]=a*p+o*x+c*R,r[1]=l*v+h*b+d*T,r[4]=l*g+h*M+d*E,r[7]=l*p+h*x+d*R,r[2]=u*v+f*b+m*T,r[5]=u*g+f*M+m*E,r[8]=u*p+f*x+m*R,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[1],n=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8];return e*a*h-e*o*l-i*r*h+i*o*c+n*r*l-n*a*c}invert(){let t=this.elements,e=t[0],i=t[1],n=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],d=h*a-o*l,u=o*c-h*r,f=l*r-a*c,m=e*d+i*u+n*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let v=1/m;return t[0]=d*v,t[1]=(n*l-h*i)*v,t[2]=(o*i-n*a)*v,t[3]=u*v,t[4]=(h*e-n*c)*v,t[5]=(n*r-o*e)*v,t[6]=f*v,t[7]=(i*c-l*e)*v,t[8]=(a*e-i*r)*v,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,n,r,a,o){let c=Math.cos(r),l=Math.sin(r);return this.set(i*c,i*l,-i*(c*a+l*o)+a+t,-n*l,n*c,-n*(-l*a+c*o)+o+e,0,0,1),this}scale(t,e){return zn("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply($l.makeScale(t,e)),this}rotate(t){return zn("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply($l.makeRotation(-t)),this}translate(t,e){return zn("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply($l.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,i=t.elements;for(let n=0;n<9;n++)if(e[n]!==i[n])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}};eh.prototype.isMatrix3=!0;var Wt=eh,$l=new Wt,Su=new Wt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),bu=new Wt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Fp(){let s={enabled:!0,workingColorSpace:or,spaces:{},convert:function(n,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===re&&(n.r=Qi(n.r),n.g=Qi(n.g),n.b=Qi(n.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(n.applyMatrix3(this.spaces[r].toXYZ),n.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===re&&(n.r=ms(n.r),n.g=ms(n.g),n.b=ms(n.b))),n},workingToColorSpace:function(n,r){return this.convert(n,this.workingColorSpace,r)},colorSpaceToWorking:function(n,r){return this.convert(n,r,this.workingColorSpace)},getPrimaries:function(n){return this.spaces[n].primaries},getTransfer:function(n){return n===nn?lr:this.spaces[n].transfer},getToneMappingMode:function(n){return this.spaces[n].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(n,r=this.workingColorSpace){return n.fromArray(this.spaces[r].luminanceCoefficients)},define:function(n){Object.assign(this.spaces,n)},_getMatrix:function(n,r,a){return n.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(n){return this.spaces[n].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(n=this.workingColorSpace){return this.spaces[n].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(n,r){return zn("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(n,r)},toWorkingColorSpace:function(n,r){return zn("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(n,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return s.define({[or]:{primaries:t,whitePoint:i,transfer:lr,toXYZ:Su,fromXYZ:bu,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ze},outputColorSpaceConfig:{drawingBufferColorSpace:Ze}},[Ze]:{primaries:t,whitePoint:i,transfer:re,toXYZ:Su,fromXYZ:bu,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ze}}}),s}var jt=Fp();function Qi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function ms(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}var is,to=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{is===void 0&&(is=cr("canvas")),is.width=t.width,is.height=t.height;let n=is.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),i=is}return i.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=cr("canvas");e.width=t.width,e.height=t.height;let i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let n=i.getImageData(0,0,t.width,t.height),r=n.data;for(let a=0;a<r.length;a++)r[a]=Qi(r[a]/255)*255;return i.putImageData(n,0,0),e}else if(t.data){let e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(Qi(e[i]/255)*255):e[i]=Qi(e[i]);return{data:e,width:t.width,height:t.height}}else return kt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Op=0,ys=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Op++}),this.uuid=Us(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},n=this.data;if(n!==null){let r;if(Array.isArray(n)){r=[];for(let a=0,o=n.length;a<o;a++)n[a].isDataTexture?r.push(Ql(n[a].image)):r.push(Ql(n[a]))}else r=Ql(n);i.url=r}return e||(t.images[this.uuid]=i),i}};function Ql(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?to.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(kt("Texture: Unable to serialize Texture."),{})}var Bp=0,tc=new C,si=class s extends ki{constructor(t=s.DEFAULT_IMAGE,e=s.DEFAULT_MAPPING,i=Fi,n=Fi,r=Xe,a=Gi,o=Si,c=oi,l=s.DEFAULT_ANISOTROPY,h=nn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Bp++}),this.uuid=Us(),this.name="",this.source=new ys(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=n,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new at(0,0),this.repeat=new at(1,1),this.center=new at(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Wt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(tc).x}get height(){return this.source.getSize(tc).y}get depth(){return this.source.getSize(tc).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let i=t[e];if(i===void 0){kt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let n=this[e];if(n===void 0){kt(`Texture.setValues(): property '${e}' does not exist.`);continue}n&&i&&n.isVector2&&i.isVector2||n&&i&&n.isVector3&&i.isVector3||n&&i&&n.isMatrix3&&i.isMatrix3?n.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Bc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case xs:t.x=t.x-Math.floor(t.x);break;case Fi:t.x=t.x<0?0:1;break;case Za:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case xs:t.y=t.y-Math.floor(t.y);break;case Fi:t.y=t.y<0?0:1;break;case Za:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};si.DEFAULT_IMAGE=null;si.DEFAULT_MAPPING=Bc;si.DEFAULT_ANISOTROPY=1;var ih=class ih{constructor(t=0,e=0,i=0,n=1){this.x=t,this.y=e,this.z=i,this.w=n}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,n){return this.x=t,this.y=e,this.z=i,this.w=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,i=this.y,n=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*i+a[8]*n+a[12]*r,this.y=a[1]*e+a[5]*i+a[9]*n+a[13]*r,this.z=a[2]*e+a[6]*i+a[10]*n+a[14]*r,this.w=a[3]*e+a[7]*i+a[11]*n+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,n,r,c=t.elements,l=c[0],h=c[4],d=c[8],u=c[1],f=c[5],m=c[9],v=c[2],g=c[6],p=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-v)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+v)<.1&&Math.abs(m+g)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let M=(l+1)/2,x=(f+1)/2,T=(p+1)/2,E=(h+u)/4,R=(d+v)/4,y=(m+g)/4;return M>x&&M>T?M<.01?(i=0,n=.707106781,r=.707106781):(i=Math.sqrt(M),n=E/i,r=R/i):x>T?x<.01?(i=.707106781,n=0,r=.707106781):(n=Math.sqrt(x),i=E/n,r=y/n):T<.01?(i=.707106781,n=.707106781,r=0):(r=Math.sqrt(T),i=R/r,n=y/r),this.set(i,n,r,e),this}let b=Math.sqrt((g-m)*(g-m)+(d-v)*(d-v)+(u-h)*(u-h));return Math.abs(b)<.001&&(b=1),this.x=(g-m)/b,this.y=(d-v)/b,this.z=(u-h)/b,this.w=Math.acos((l+f+p-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=te(this.x,t.x,e.x),this.y=te(this.y,t.y,e.y),this.z=te(this.z,t.z,e.z),this.w=te(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=te(this.x,t,e),this.y=te(this.y,t,e),this.z=te(this.z,t,e),this.w=te(this.w,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(te(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};ih.prototype.isVector4=!0;var Me=ih,eo=class extends ki{constructor(t=1,e=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Xe,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=i.depth,this.scissor=new Me(0,0,t,e),this.scissorTest=!1,this.viewport=new Me(0,0,t,e),this.textures=[];let n={width:t,height:e,depth:i.depth},r=new si(n),a=i.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveColorBuffer=i.resolveColorBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.storeMultisampledColorBuffer=i.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=i.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=i.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Xe,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let n=0,r=this.textures.length;n<r;n++)this.textures[n].image.width=t,this.textures[n].image.height=e,this.textures[n].image.depth=i,this.textures[n].isData3DTexture!==!0&&(this.textures[n].isArrayTexture=this.textures[n].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,i=t.textures.length;e<i;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let n=Object.assign({},t.textures[e].image);this.textures[e].source=new ys(n)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Te=class extends eo{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}},hr=class extends si{constructor(t=null,e=1,i=1,n=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:n},this.magFilter=ze,this.minFilter=ze,this.wrapR=Fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var io=class extends si{constructor(t=null,e=1,i=1,n=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:n},this.magFilter=ze,this.minFilter=ze,this.wrapR=Fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var Eo=class Eo{constructor(t,e,i,n,r,a,o,c,l,h,d,u,f,m,v,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,n,r,a,o,c,l,h,d,u,f,m,v,g)}set(t,e,i,n,r,a,o,c,l,h,d,u,f,m,v,g){let p=this.elements;return p[0]=t,p[4]=e,p[8]=i,p[12]=n,p[1]=r,p[5]=a,p[9]=o,p[13]=c,p[2]=l,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=m,p[11]=v,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Eo().fromArray(this.elements)}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){let e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),i.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,i=t.elements,n=1/ns.setFromMatrixColumn(t,0).length(),r=1/ns.setFromMatrixColumn(t,1).length(),a=1/ns.setFromMatrixColumn(t,2).length();return e[0]=i[0]*n,e[1]=i[1]*n,e[2]=i[2]*n,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*a,e[9]=i[9]*a,e[10]=i[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,i=t.x,n=t.y,r=t.z,a=Math.cos(i),o=Math.sin(i),c=Math.cos(n),l=Math.sin(n),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){let u=a*h,f=a*d,m=o*h,v=o*d;e[0]=c*h,e[4]=-c*d,e[8]=l,e[1]=f+m*l,e[5]=u-v*l,e[9]=-o*c,e[2]=v-u*l,e[6]=m+f*l,e[10]=a*c}else if(t.order==="YXZ"){let u=c*h,f=c*d,m=l*h,v=l*d;e[0]=u+v*o,e[4]=m*o-f,e[8]=a*l,e[1]=a*d,e[5]=a*h,e[9]=-o,e[2]=f*o-m,e[6]=v+u*o,e[10]=a*c}else if(t.order==="ZXY"){let u=c*h,f=c*d,m=l*h,v=l*d;e[0]=u-v*o,e[4]=-a*d,e[8]=m+f*o,e[1]=f+m*o,e[5]=a*h,e[9]=v-u*o,e[2]=-a*l,e[6]=o,e[10]=a*c}else if(t.order==="ZYX"){let u=a*h,f=a*d,m=o*h,v=o*d;e[0]=c*h,e[4]=m*l-f,e[8]=u*l+v,e[1]=c*d,e[5]=v*l+u,e[9]=f*l-m,e[2]=-l,e[6]=o*c,e[10]=a*c}else if(t.order==="YZX"){let u=a*c,f=a*l,m=o*c,v=o*l;e[0]=c*h,e[4]=v-u*d,e[8]=m*d+f,e[1]=d,e[5]=a*h,e[9]=-o*h,e[2]=-l*h,e[6]=f*d+m,e[10]=u-v*d}else if(t.order==="XZY"){let u=a*c,f=a*l,m=o*c,v=o*l;e[0]=c*h,e[4]=-d,e[8]=l*h,e[1]=u*d+v,e[5]=a*h,e[9]=f*d-m,e[2]=m*d-f,e[6]=o*h,e[10]=v*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(kp,t,Hp)}lookAt(t,e,i){let n=this.elements;return ui.subVectors(t,e),ui.lengthSq()===0&&(ui.z=1),ui.normalize(),ln.crossVectors(i,ui),ln.lengthSq()===0&&(Math.abs(i.z)===1?ui.x+=1e-4:ui.z+=1e-4,ui.normalize(),ln.crossVectors(i,ui)),ln.normalize(),Ma.crossVectors(ui,ln),n[0]=ln.x,n[4]=Ma.x,n[8]=ui.x,n[1]=ln.y,n[5]=Ma.y,n[9]=ui.y,n[2]=ln.z,n[6]=Ma.z,n[10]=ui.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,n=e.elements,r=this.elements,a=i[0],o=i[4],c=i[8],l=i[12],h=i[1],d=i[5],u=i[9],f=i[13],m=i[2],v=i[6],g=i[10],p=i[14],b=i[3],M=i[7],x=i[11],T=i[15],E=n[0],R=n[4],y=n[8],A=n[12],P=n[1],N=n[5],O=n[9],V=n[13],D=n[2],B=n[6],X=n[10],W=n[14],st=n[3],q=n[7],Q=n[11],it=n[15];return r[0]=a*E+o*P+c*D+l*st,r[4]=a*R+o*N+c*B+l*q,r[8]=a*y+o*O+c*X+l*Q,r[12]=a*A+o*V+c*W+l*it,r[1]=h*E+d*P+u*D+f*st,r[5]=h*R+d*N+u*B+f*q,r[9]=h*y+d*O+u*X+f*Q,r[13]=h*A+d*V+u*W+f*it,r[2]=m*E+v*P+g*D+p*st,r[6]=m*R+v*N+g*B+p*q,r[10]=m*y+v*O+g*X+p*Q,r[14]=m*A+v*V+g*W+p*it,r[3]=b*E+M*P+x*D+T*st,r[7]=b*R+M*N+x*B+T*q,r[11]=b*y+M*O+x*X+T*Q,r[15]=b*A+M*V+x*W+T*it,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[4],n=t[8],r=t[12],a=t[1],o=t[5],c=t[9],l=t[13],h=t[2],d=t[6],u=t[10],f=t[14],m=t[3],v=t[7],g=t[11],p=t[15],b=c*f-l*u,M=o*f-l*d,x=o*u-c*d,T=a*f-l*h,E=a*u-c*h,R=a*d-o*h;return e*(v*b-g*M+p*x)-i*(m*b-g*T+p*E)+n*(m*M-v*T+p*R)-r*(m*x-v*E+g*R)}determinantAffine(){let t=this.elements,e=t[0],i=t[4],n=t[8],r=t[1],a=t[5],o=t[9],c=t[2],l=t[6],h=t[10];return e*(a*h-o*l)-i*(r*h-o*c)+n*(r*l-a*c)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){let n=this.elements;return t.isVector3?(n[12]=t.x,n[13]=t.y,n[14]=t.z):(n[12]=t,n[13]=e,n[14]=i),this}invert(){let t=this.elements,e=t[0],i=t[1],n=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],d=t[9],u=t[10],f=t[11],m=t[12],v=t[13],g=t[14],p=t[15],b=e*o-i*a,M=e*c-n*a,x=e*l-r*a,T=i*c-n*o,E=i*l-r*o,R=n*l-r*c,y=h*v-d*m,A=h*g-u*m,P=h*p-f*m,N=d*g-u*v,O=d*p-f*v,V=u*p-f*g,D=b*V-M*O+x*N+T*P-E*A+R*y;if(D===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let B=1/D;return t[0]=(o*V-c*O+l*N)*B,t[1]=(n*O-i*V-r*N)*B,t[2]=(v*R-g*E+p*T)*B,t[3]=(u*E-d*R-f*T)*B,t[4]=(c*P-a*V-l*A)*B,t[5]=(e*V-n*P+r*A)*B,t[6]=(g*x-m*R-p*M)*B,t[7]=(h*R-u*x+f*M)*B,t[8]=(a*O-o*P+l*y)*B,t[9]=(i*P-e*O-r*y)*B,t[10]=(m*E-v*x+p*b)*B,t[11]=(d*x-h*E-f*b)*B,t[12]=(o*A-a*N-c*y)*B,t[13]=(e*N-i*A+n*y)*B,t[14]=(v*M-m*T-g*b)*B,t[15]=(h*T-d*M+u*b)*B,this}scale(t){let e=this.elements,i=t.x,n=t.y,r=t.z;return e[0]*=i,e[4]*=n,e[8]*=r,e[1]*=i,e[5]*=n,e[9]*=r,e[2]*=i,e[6]*=n,e[10]*=r,e[3]*=i,e[7]*=n,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],n=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,n))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let i=Math.cos(e),n=Math.sin(e),r=1-i,a=t.x,o=t.y,c=t.z,l=r*a,h=r*o;return this.set(l*a+i,l*o-n*c,l*c+n*o,0,l*o+n*c,h*o+i,h*c-n*a,0,l*c-n*o,h*c+n*a,r*c*c+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,n,r,a){return this.set(1,i,r,0,t,1,a,0,e,n,1,0,0,0,0,1),this}compose(t,e,i){let n=this.elements,r=e._x,a=e._y,o=e._z,c=e._w,l=r+r,h=a+a,d=o+o,u=r*l,f=r*h,m=r*d,v=a*h,g=a*d,p=o*d,b=c*l,M=c*h,x=c*d,T=i.x,E=i.y,R=i.z;return n[0]=(1-(v+p))*T,n[1]=(f+x)*T,n[2]=(m-M)*T,n[3]=0,n[4]=(f-x)*E,n[5]=(1-(u+p))*E,n[6]=(g+b)*E,n[7]=0,n[8]=(m+M)*R,n[9]=(g-b)*R,n[10]=(1-(u+v))*R,n[11]=0,n[12]=t.x,n[13]=t.y,n[14]=t.z,n[15]=1,this}decompose(t,e,i){let n=this.elements;t.x=n[12],t.y=n[13],t.z=n[14];let r=this.determinantAffine();if(r===0)return i.set(1,1,1),e.identity(),this;let a=ns.set(n[0],n[1],n[2]).length(),o=ns.set(n[4],n[5],n[6]).length(),c=ns.set(n[8],n[9],n[10]).length();r<0&&(a=-a),Ti.copy(this);let l=1/a,h=1/o,d=1/c;return Ti.elements[0]*=l,Ti.elements[1]*=l,Ti.elements[2]*=l,Ti.elements[4]*=h,Ti.elements[5]*=h,Ti.elements[6]*=h,Ti.elements[8]*=d,Ti.elements[9]*=d,Ti.elements[10]*=d,e.setFromRotationMatrix(Ti),i.x=a,i.y=o,i.z=c,this}makePerspective(t,e,i,n,r,a,o=Ri,c=!1){let l=this.elements,h=2*r/(e-t),d=2*r/(i-n),u=(e+t)/(e-t),f=(i+n)/(i-n),m,v;if(c)m=r/(a-r),v=a*r/(a-r);else if(o===Ri)m=-(a+r)/(a-r),v=-2*a*r/(a-r);else if(o===_s)m=-a/(a-r),v=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=d,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=v,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,i,n,r,a,o=Ri,c=!1){let l=this.elements,h=2/(e-t),d=2/(i-n),u=-(e+t)/(e-t),f=-(i+n)/(i-n),m,v;if(c)m=1/(a-r),v=a/(a-r);else if(o===Ri)m=-2/(a-r),v=-(a+r)/(a-r);else if(o===_s)m=-1/(a-r),v=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=d,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=m,l[14]=v,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,i=t.elements;for(let n=0;n<16;n++)if(e[n]!==i[n])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}};Eo.prototype.isMatrix4=!0;var ye=Eo,ns=new C,Ti=new ye,kp=new C(0,0,0),Hp=new C(1,1,1),ln=new C,Ma=new C,ui=new C,Tu=new ye,Eu=new Hi,tn=class s{constructor(t=0,e=0,i=0,n=s.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=n}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,n=this._order){return this._x=t,this._y=e,this._z=i,this._order=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){let n=t.elements,r=n[0],a=n[4],o=n[8],c=n[1],l=n[5],h=n[9],d=n[2],u=n[6],f=n[10];switch(e){case"XYZ":this._y=Math.asin(te(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-te(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(te(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-te(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(te(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-te(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:kt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Tu.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Tu,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Eu.setFromEuler(this),this.setFromQuaternion(Eu,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};tn.DEFAULT_ORDER="XYZ";var ur=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},zp=0,wu=new C,ss=new Hi,Ji=new ye,Sa=new C,Qs=new C,Vp=new C,Gp=new Hi,Au=new C(1,0,0),Ru=new C(0,1,0),Cu=new C(0,0,1),Pu={type:"added"},Wp={type:"removed"},rs={type:"childadded",child:null},ec={type:"childremoved",child:null},$e=class s extends ki{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:zp++}),this.uuid=Us(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=s.DEFAULT_UP.clone();let t=new C,e=new tn,i=new Hi,n=new C(1,1,1);function r(){i.setFromEuler(e,!1)}function a(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:n},modelViewMatrix:{value:new ye},normalMatrix:{value:new Wt}}),this.matrix=new ye,this.matrixWorld=new ye,this.matrixAutoUpdate=s.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=s.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ur,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return ss.setFromAxisAngle(t,e),this.quaternion.multiply(ss),this}rotateOnWorldAxis(t,e){return ss.setFromAxisAngle(t,e),this.quaternion.premultiply(ss),this}rotateX(t){return this.rotateOnAxis(Au,t)}rotateY(t){return this.rotateOnAxis(Ru,t)}rotateZ(t){return this.rotateOnAxis(Cu,t)}translateOnAxis(t,e){return wu.copy(t).applyQuaternion(this.quaternion),this.position.add(wu.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Au,t)}translateY(t){return this.translateOnAxis(Ru,t)}translateZ(t){return this.translateOnAxis(Cu,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Ji.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?Sa.copy(t):Sa.set(t,e,i);let n=this.parent;this.updateWorldMatrix(!0,!1),Qs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ji.lookAt(Qs,Sa,this.up):Ji.lookAt(Sa,Qs,this.up),this.quaternion.setFromRotationMatrix(Ji),n&&(Ji.extractRotation(n.matrixWorld),ss.setFromRotationMatrix(Ji),this.quaternion.premultiply(ss.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(zt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Pu),rs.child=t,this.dispatchEvent(rs),rs.child=null):zt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Wp),ec.child=t,this.dispatchEvent(ec),ec.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Ji.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Ji.multiply(t.parent.matrixWorld)),t.applyMatrix4(Ji),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Pu),rs.child=t,this.dispatchEvent(rs),rs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,n=this.children.length;i<n;i++){let a=this.children[i].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);let n=this.children;for(let r=0,a=n.length;r<a;r++)n[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qs,t,Vp),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qs,Gp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let i=0,n=e.length;i<n;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let i=0,n=e.length;i<n;i++)e[i].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,i=t.y,n=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*i-r[8]*n,r[13]+=i-r[1]*e-r[5]*i-r[9]*n,r[14]+=n-r[2]*e-r[6]*i-r[10]*n}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let i=0,n=e.length;i<n;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e,i=!1){let n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,i)}}toJSON(t){let e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let n={};n.uuid=this.uuid,n.type=this.type,n.name=this.name,n.castShadow=this.castShadow,n.receiveShadow=this.receiveShadow,n.visible=this.visible,n.frustumCulled=this.frustumCulled,n.renderOrder=this.renderOrder,n.static=this.static,n.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(n.userData=this.userData),n.layers=this.layers.mask,n.matrix=this.matrix.toArray(),n.up=this.up.toArray(),this.pivot!==null&&(n.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(n.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(n.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(n.type="InstancedMesh",n.count=this.count,n.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(n.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(n.type="BatchedMesh",n.perObjectFrustumCulled=this.perObjectFrustumCulled,n.sortObjects=this.sortObjects,n.drawRanges=this._drawRanges,n.reservedRanges=this._reservedRanges,n.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),n.instanceInfo=this._instanceInfo.map(o=>({...o})),n.availableInstanceIds=this._availableInstanceIds.slice(),n.availableGeometryIds=this._availableGeometryIds.slice(),n.nextIndexStart=this._nextIndexStart,n.nextVertexStart=this._nextVertexStart,n.geometryCount=this._geometryCount,n.maxInstanceCount=this._maxInstanceCount,n.maxVertexCount=this._maxVertexCount,n.maxIndexCount=this._maxIndexCount,n.geometryInitialized=this._geometryInitialized,n.matricesTexture=this._matricesTexture.toJSON(t),n.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(n.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(n.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(n.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?n.background=this.background.toJSON():this.background.isTexture&&(n.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(n.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){n.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let d=c[l];r(t.shapes,d)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(n.bindMode=this.bindMode,n.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),n.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(t.materials,this.material[c]));n.material=o}else n.material=r(t.materials,this.material);if(this.children.length>0){n.children=[];for(let o=0;o<this.children.length;o++)n.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){n.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];n.animations.push(r(t.animations,c))}}if(e){let o=a(t.geometries),c=a(t.materials),l=a(t.textures),h=a(t.images),d=a(t.shapes),u=a(t.skeletons),f=a(t.animations),m=a(t.nodes);o.length>0&&(i.geometries=o),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),h.length>0&&(i.images=h),d.length>0&&(i.shapes=d),u.length>0&&(i.skeletons=u),f.length>0&&(i.animations=f),m.length>0&&(i.nodes=m)}return i.object=n,i;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){let n=t.children[i];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};$e.DEFAULT_UP=new C(0,1,0);$e.DEFAULT_MATRIX_AUTO_UPDATE=!0;$e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ce=class extends $e{constructor(){super(),this.isGroup=!0,this.type="Group"}},Xp={type:"move"},Ms=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ce,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ce,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ce,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let n=null,r=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){a=!0;for(let v of t.hand.values()){let g=e.getJointPose(v,i),p=this._getHandJoint(l,v);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,m=.005;l.inputState.pinching&&u>f+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&u<=f-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(n=e.getPose(t.targetRaySpace,i),n===null&&r!==null&&(n=r),n!==null&&(o.matrix.fromArray(n.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,n.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(n.linearVelocity)):o.hasLinearVelocity=!1,n.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(n.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Xp)))}return o!==null&&(o.visible=n!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let i=new Ce;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}},Id={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},cn={h:0,s:0,l:0},ba={h:0,s:0,l:0};function ic(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}var Lt=class{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){let n=t;n&&n.isColor?this.copy(n):typeof n=="number"?this.setHex(n):typeof n=="string"&&this.setStyle(n)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ze){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,jt.colorSpaceToWorking(this,e),this}setRGB(t,e,i,n=jt.workingColorSpace){return this.r=t,this.g=e,this.b=i,jt.colorSpaceToWorking(this,n),this}setHSL(t,e,i,n=jt.workingColorSpace){if(t=Up(t,1),e=te(e,0,1),i=te(i,0,1),e===0)this.r=this.g=this.b=i;else{let r=i<=.5?i*(1+e):i+e-i*e,a=2*i-r;this.r=ic(a,r,t+1/3),this.g=ic(a,r,t),this.b=ic(a,r,t-1/3)}return jt.colorSpaceToWorking(this,n),this}setStyle(t,e=Ze){function i(r){r!==void 0&&parseFloat(r)<1&&kt("Color: Alpha component of "+t+" will be ignored.")}let n;if(n=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=n[1],o=n[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:kt("Color: Unknown color model "+t)}}else if(n=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=n[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);kt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ze){let i=Id[t.toLowerCase()];return i!==void 0?this.setHex(i,e):kt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Qi(t.r),this.g=Qi(t.g),this.b=Qi(t.b),this}copyLinearToSRGB(t){return this.r=ms(t.r),this.g=ms(t.g),this.b=ms(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ze){return jt.workingToColorSpace(je.copy(this),t),Math.round(te(je.r*255,0,255))*65536+Math.round(te(je.g*255,0,255))*256+Math.round(te(je.b*255,0,255))}getHexString(t=Ze){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=jt.workingColorSpace){jt.workingToColorSpace(je.copy(this),e);let i=je.r,n=je.g,r=je.b,a=Math.max(i,n,r),o=Math.min(i,n,r),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let d=a-o;switch(l=h<=.5?d/(a+o):d/(2-a-o),a){case i:c=(n-r)/d+(n<r?6:0);break;case n:c=(r-i)/d+2;break;case r:c=(i-n)/d+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=jt.workingColorSpace){return jt.workingToColorSpace(je.copy(this),e),t.r=je.r,t.g=je.g,t.b=je.b,t}getStyle(t=Ze){jt.workingToColorSpace(je.copy(this),t);let e=je.r,i=je.g,n=je.b;return t!==Ze?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${n.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(n*255)})`}offsetHSL(t,e,i){return this.getHSL(cn),this.setHSL(cn.h+t,cn.s+e,cn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(cn),t.getHSL(ba);let i=jl(cn.h,ba.h,e),n=jl(cn.s,ba.s,e),r=jl(cn.l,ba.l,e);return this.setHSL(i,n,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,i=this.g,n=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*n,this.g=r[1]*e+r[4]*i+r[7]*n,this.b=r[2]*e+r[5]*i+r[8]*n,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},je=new Lt;Lt.NAMES=Id;var Ss=class extends $e{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new tn,this.environmentIntensity=1,this.environmentRotation=new tn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Ei=new C,Ki=new C,nc=new C,ji=new C,as=new C,os=new C,Iu=new C,sc=new C,rc=new C,ac=new C,oc=new Me,lc=new Me,cc=new Me,fn=class s{constructor(t=new C,e=new C,i=new C){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,n){n.subVectors(i,e),Ei.subVectors(t,e),n.cross(Ei);let r=n.lengthSq();return r>0?n.multiplyScalar(1/Math.sqrt(r)):n.set(0,0,0)}static getBarycoord(t,e,i,n,r){Ei.subVectors(n,e),Ki.subVectors(i,e),nc.subVectors(t,e);let a=Ei.dot(Ei),o=Ei.dot(Ki),c=Ei.dot(nc),l=Ki.dot(Ki),h=Ki.dot(nc),d=a*l-o*o;if(d===0)return r.set(0,0,0),null;let u=1/d,f=(l*c-o*h)*u,m=(a*h-o*c)*u;return r.set(1-f-m,m,f)}static containsPoint(t,e,i,n){return this.getBarycoord(t,e,i,n,ji)===null?!1:ji.x>=0&&ji.y>=0&&ji.x+ji.y<=1}static getInterpolation(t,e,i,n,r,a,o,c){return this.getBarycoord(t,e,i,n,ji)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,ji.x),c.addScaledVector(a,ji.y),c.addScaledVector(o,ji.z),c)}static getInterpolatedAttribute(t,e,i,n,r,a){return oc.setScalar(0),lc.setScalar(0),cc.setScalar(0),oc.fromBufferAttribute(t,e),lc.fromBufferAttribute(t,i),cc.fromBufferAttribute(t,n),a.setScalar(0),a.addScaledVector(oc,r.x),a.addScaledVector(lc,r.y),a.addScaledVector(cc,r.z),a}static isFrontFacing(t,e,i,n){return Ei.subVectors(i,e),Ki.subVectors(t,e),Ei.cross(Ki).dot(n)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,n){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[n]),this}setFromAttributeAndIndices(t,e,i,n){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,n),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Ei.subVectors(this.c,this.b),Ki.subVectors(this.a,this.b),Ei.cross(Ki).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return s.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return s.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,n,r){return s.getInterpolation(t,this.a,this.b,this.c,e,i,n,r)}containsPoint(t){return s.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return s.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let i=this.a,n=this.b,r=this.c,a,o;as.subVectors(n,i),os.subVectors(r,i),sc.subVectors(t,i);let c=as.dot(sc),l=os.dot(sc);if(c<=0&&l<=0)return e.copy(i);rc.subVectors(t,n);let h=as.dot(rc),d=os.dot(rc);if(h>=0&&d<=h)return e.copy(n);let u=c*d-h*l;if(u<=0&&c>=0&&h<=0)return a=c/(c-h),e.copy(i).addScaledVector(as,a);ac.subVectors(t,r);let f=as.dot(ac),m=os.dot(ac);if(m>=0&&f<=m)return e.copy(r);let v=f*l-c*m;if(v<=0&&l>=0&&m<=0)return o=l/(l-m),e.copy(i).addScaledVector(os,o);let g=h*m-f*d;if(g<=0&&d-h>=0&&f-m>=0)return Iu.subVectors(r,n),o=(d-h)/(d-h+(f-m)),e.copy(n).addScaledVector(Iu,o);let p=1/(g+v+u);return a=v*p,o=u*p,e.copy(i).addScaledVector(as,a).addScaledVector(os,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},pn=class{constructor(t=new C(1/0,1/0,1/0),e=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(wi.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(wi.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let i=wi.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,wi):wi.fromBufferAttribute(r,a),wi.applyMatrix4(t.matrixWorld),this.expandByPoint(wi);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ta.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ta.copy(i.boundingBox)),Ta.applyMatrix4(t.matrixWorld),this.union(Ta)}let n=t.children;for(let r=0,a=n.length;r<a;r++)this.expandByObject(n[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,wi),wi.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(tr),Ea.subVectors(this.max,tr),ls.subVectors(t.a,tr),cs.subVectors(t.b,tr),hs.subVectors(t.c,tr),hn.subVectors(cs,ls),un.subVectors(hs,cs),On.subVectors(ls,hs);let e=[0,-hn.z,hn.y,0,-un.z,un.y,0,-On.z,On.y,hn.z,0,-hn.x,un.z,0,-un.x,On.z,0,-On.x,-hn.y,hn.x,0,-un.y,un.x,0,-On.y,On.x,0];return!hc(e,ls,cs,hs,Ea)||(e=[1,0,0,0,1,0,0,0,1],!hc(e,ls,cs,hs,Ea))?!1:(wa.crossVectors(hn,un),e=[wa.x,wa.y,wa.z],hc(e,ls,cs,hs,Ea))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,wi).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(wi).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Zi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Zi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Zi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Zi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Zi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Zi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Zi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Zi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Zi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Zi=[new C,new C,new C,new C,new C,new C,new C,new C],wi=new C,Ta=new pn,ls=new C,cs=new C,hs=new C,hn=new C,un=new C,On=new C,tr=new C,Ea=new C,wa=new C,Bn=new C;function hc(s,t,e,i,n){for(let r=0,a=s.length-3;r<=a;r+=3){Bn.fromArray(s,r);let o=n.x*Math.abs(Bn.x)+n.y*Math.abs(Bn.y)+n.z*Math.abs(Bn.z),c=t.dot(Bn),l=e.dot(Bn),h=i.dot(Bn);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}var Le=new C,Aa=new at,qp=0,yi=class extends ki{constructor(t,e,i=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:qp++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=wd,this.updateRanges=[],this.gpuType=Ii,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let n=0,r=this.itemSize;n<r;n++)this.array[t+n]=e.array[i+n];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Aa.fromBufferAttribute(this,e),Aa.applyMatrix3(t),this.setXY(e,Aa.x,Aa.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.applyMatrix3(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.applyMatrix4(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.applyNormalMatrix(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.transformDirection(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=$s(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=ri(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=$s(e,this.array)),e}setX(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=$s(e,this.array)),e}setY(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=$s(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=$s(e,this.array)),e}setW(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=ri(e,this.array),i=ri(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,n){return t*=this.itemSize,this.normalized&&(e=ri(e,this.array),i=ri(i,this.array),n=ri(n,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=n,this}setXYZW(t,e,i,n,r){return t*=this.itemSize,this.normalized&&(e=ri(e,this.array),i=ri(i,this.array),n=ri(n,this.array),r=ri(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=n,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var dr=class extends yi{constructor(t,e,i){super(new Uint16Array(t),e,i)}};var fr=class extends yi{constructor(t,e,i){super(new Uint32Array(t),e,i)}};var ie=class extends yi{constructor(t,e,i){super(new Float32Array(t),e,i)}},Yp=new pn,er=new C,uc=new C,bs=class{constructor(t=new C,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let i=this.center;e!==void 0?i.copy(e):Yp.setFromPoints(t).getCenter(i);let n=0;for(let r=0,a=t.length;r<a;r++)n=Math.max(n,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(n),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;er.subVectors(t,this.center);let e=er.lengthSq();if(e>this.radius*this.radius){let i=Math.sqrt(e),n=(i-this.radius)*.5;this.center.addScaledVector(er,n/i),this.radius+=n}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(uc.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(er.copy(t.center).add(uc)),this.expandByPoint(er.copy(t.center).sub(uc))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Jp=0,vi=new ye,dc=new $e,us=new C,di=new pn,ir=new pn,He=new C,De=class s extends ki{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Jp++}),this.uuid=Us(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Dp(t)?fr:dr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let r=new Wt().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}let n=this.attributes.tangent;return n!==void 0&&(n.transformDirection(t),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return vi.makeRotationFromQuaternion(t),this.applyMatrix4(vi),this}rotateX(t){return vi.makeRotationX(t),this.applyMatrix4(vi),this}rotateY(t){return vi.makeRotationY(t),this.applyMatrix4(vi),this}rotateZ(t){return vi.makeRotationZ(t),this.applyMatrix4(vi),this}translate(t,e,i){return vi.makeTranslation(t,e,i),this.applyMatrix4(vi),this}scale(t,e,i){return vi.makeScale(t,e,i),this.applyMatrix4(vi),this}lookAt(t){return dc.lookAt(t),dc.updateMatrix(),this.applyMatrix4(dc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(us).negate(),this.translate(us.x,us.y,us.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let i=[];for(let n=0,r=t.length;n<r;n++){let a=t[n];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ie(i,3))}else{let i=Math.min(t.length,e.count);for(let n=0;n<i;n++){let r=t[n];e.setXYZ(n,r.x,r.y,r.z||0)}t.length>e.count&&kt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new pn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){zt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,n=e.length;i<n;i++){let r=e[i];di.setFromBufferAttribute(r),this.morphTargetsRelative?(He.addVectors(this.boundingBox.min,di.min),this.boundingBox.expandByPoint(He),He.addVectors(this.boundingBox.max,di.max),this.boundingBox.expandByPoint(He)):(this.boundingBox.expandByPoint(di.min),this.boundingBox.expandByPoint(di.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&zt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new bs);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){zt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(t){let i=this.boundingSphere.center;if(di.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];ir.setFromBufferAttribute(o),this.morphTargetsRelative?(He.addVectors(di.min,ir.min),di.expandByPoint(He),He.addVectors(di.max,ir.max),di.expandByPoint(He)):(di.expandByPoint(ir.min),di.expandByPoint(ir.max))}di.getCenter(i);let n=0;for(let r=0,a=t.count;r<a;r++)He.fromBufferAttribute(t,r),n=Math.max(n,i.distanceToSquared(He));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)He.fromBufferAttribute(o,l),c&&(us.fromBufferAttribute(t,l),He.add(us)),n=Math.max(n,i.distanceToSquared(He))}this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&zt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){zt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=e.position,n=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==i.count)&&(a=new yi(new Float32Array(4*i.count),4),this.setAttribute("tangent",a));let o=[],c=[];for(let y=0;y<i.count;y++)o[y]=new C,c[y]=new C;let l=new C,h=new C,d=new C,u=new at,f=new at,m=new at,v=new C,g=new C;function p(y,A,P){l.fromBufferAttribute(i,y),h.fromBufferAttribute(i,A),d.fromBufferAttribute(i,P),u.fromBufferAttribute(r,y),f.fromBufferAttribute(r,A),m.fromBufferAttribute(r,P),h.sub(l),d.sub(l),f.sub(u),m.sub(u);let N=1/(f.x*m.y-m.x*f.y);isFinite(N)&&(v.copy(h).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(N),g.copy(d).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(N),o[y].add(v),o[A].add(v),o[P].add(v),c[y].add(g),c[A].add(g),c[P].add(g))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let y=0,A=b.length;y<A;++y){let P=b[y],N=P.start,O=P.count;for(let V=N,D=N+O;V<D;V+=3)p(t.getX(V+0),t.getX(V+1),t.getX(V+2))}let M=new C,x=new C,T=new C,E=new C;function R(y){T.fromBufferAttribute(n,y),E.copy(T);let A=o[y];M.copy(A),M.sub(T.multiplyScalar(T.dot(A))).normalize(),x.crossVectors(E,A);let N=x.dot(c[y])<0?-1:1;a.setXYZW(y,M.x,M.y,M.z,N)}for(let y=0,A=b.length;y<A;++y){let P=b[y],N=P.start,O=P.count;for(let V=N,D=N+O;V<D;V+=3)R(t.getX(V+0)),R(t.getX(V+1)),R(t.getX(V+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==e.count)i=new yi(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let u=0,f=i.count;u<f;u++)i.setXYZ(u,0,0,0);let n=new C,r=new C,a=new C,o=new C,c=new C,l=new C,h=new C,d=new C;if(t)for(let u=0,f=t.count;u<f;u+=3){let m=t.getX(u+0),v=t.getX(u+1),g=t.getX(u+2);n.fromBufferAttribute(e,m),r.fromBufferAttribute(e,v),a.fromBufferAttribute(e,g),h.subVectors(a,r),d.subVectors(n,r),h.cross(d),o.fromBufferAttribute(i,m),c.fromBufferAttribute(i,v),l.fromBufferAttribute(i,g),o.add(h),c.add(h),l.add(h),i.setXYZ(m,o.x,o.y,o.z),i.setXYZ(v,c.x,c.y,c.z),i.setXYZ(g,l.x,l.y,l.z)}else for(let u=0,f=e.count;u<f;u+=3)n.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),d.subVectors(n,r),h.cross(d),i.setXYZ(u+0,h.x,h.y,h.z),i.setXYZ(u+1,h.x,h.y,h.z),i.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)He.fromBufferAttribute(t,e),He.normalize(),t.setXYZ(e,He.x,He.y,He.z)}toNonIndexed(){function t(o,c){let l=o.array,h=o.itemSize,d=o.normalized,u=new l.constructor(c.length*h),f=0,m=0;for(let v=0,g=c.length;v<g;v++){o.isInterleavedBufferAttribute?f=c[v]*o.data.stride+o.offset:f=c[v]*h;for(let p=0;p<h;p++)u[m++]=l[f++]}return new yi(u,h,d)}if(this.index===null)return kt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new s,i=this.index.array,n=this.attributes;for(let o in n){let c=n[o],l=t(c,i);e.setAttribute(o,l)}let r=this.morphAttributes;for(let o in r){let c=[],l=r[o];for(let h=0,d=l.length;h<d;h++){let u=l[h],f=t(u,i);c.push(f)}e.morphAttributes[o]=c}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let i=this.attributes;for(let c in i){let l=i[c];t.data.attributes[c]=l.toJSON(t.data)}let n={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){let f=l[d];h.push(f.toJSON(t.data))}h.length>0&&(n[c]=h,r=!0)}r&&(t.data.morphAttributes=n,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone());let n=t.attributes;for(let l in n){let h=n[l];this.setAttribute(l,h.clone(e))}let r=t.morphAttributes;for(let l in r){let h=[],d=r[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let l=0,h=a.length;l<h;l++){let d=a[l];this.addGroup(d.start,d.count,d.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var fc=new C,Kp=new C,jp=new Wt,Ai=class{constructor(t=new C(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,n){return this.normal.set(t,e,i),this.constant=n,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){let n=fc.subVectors(i,e).cross(Kp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(n,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,i=!0){let n=t.delta(fc),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return i===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(n,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let i=e||jp.getNormalMatrix(t),n=this.coplanarPoint(fc).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-n.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},Zp=0,mn=class extends ki{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Zp++}),this.uuid=Us(),this.name="",this.type="Material",this.blending=Ls,this.side=bn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Uc,this.blendDst=Fc,this.blendEquation=qn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Lt(0,0,0),this.blendAlpha=0,this.depthFunc=gs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=vd,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ga,this.stencilZFail=Ga,this.stencilZPass=Ga,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let i=t[e];if(i===void 0){kt(`Material: parameter '${e}' has value of undefined.`);continue}let n=this[e];if(n===void 0){kt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}n&&n.isColor?n.set(i):n&&n.isVector2&&i&&i.isVector2||n&&n.isEuler&&i&&i.isEuler||n&&n.isVector3&&i&&i.isVector3?n.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,i.blending=this.blending,i.side=this.side,i.shadowSide=this.shadowSide,i.vertexColors=this.vertexColors,i.opacity=this.opacity,i.transparent=this.transparent,i.blendSrc=this.blendSrc,i.blendDst=this.blendDst,i.blendEquation=this.blendEquation,i.blendSrcAlpha=this.blendSrcAlpha,i.blendDstAlpha=this.blendDstAlpha,i.blendEquationAlpha=this.blendEquationAlpha,i.blendColor=this.blendColor.getHex(),i.blendAlpha=this.blendAlpha,i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.clipIntersection=this.clipIntersection,i.clipShadows=this.clipShadows,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,i.stencilWrite=this.stencilWrite,i.polygonOffset=this.polygonOffset,i.polygonOffsetFactor=this.polygonOffsetFactor,i.polygonOffsetUnits=this.polygonOffsetUnits,i.dithering=this.dithering,i.alphaTest=this.alphaTest,i.alphaHash=this.alphaHash,i.alphaToCoverage=this.alphaToCoverage,i.premultipliedAlpha=this.premultipliedAlpha,i.forceSinglePass=this.forceSinglePass,i.allowOverride=this.allowOverride,i.visible=this.visible,i.toneMapped=this.toneMapped,i.name=this.name,this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(i.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(i.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(i.rotation=this.rotation),this.depthPacking!==void 0&&(i.depthPacking=this.depthPacking),this.linewidth!==void 0&&(i.linewidth=this.linewidth),this.linecap!==void 0&&(i.linecap=this.linecap),this.linejoin!==void 0&&(i.linejoin=this.linejoin),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.wireframe!==void 0&&(i.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(i.flatShading=this.flatShading),this.fog!==void 0&&(i.fog=this.fog),Object.keys(this.userData).length>0&&(i.userData=this.userData);function n(r){let a=[];for(let o in r){let c=r[o];delete c.metadata,a.push(c)}return a}if(e){let r=n(t.textures),a=n(t.images);r.length>0&&(i.textures=r),a.length>0&&(i.images=a)}return i}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Lt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(i=>new Ai().fromJSON(i))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let i=t.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new at().fromArray(i)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new at().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,i=null;if(e!==null){let n=e.length;i=new Array(n);for(let r=0;r!==n;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var $i=new C,pc=new C,Ra=new C,Ca=new C,no=class{constructor(t=new C,e=new C(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,$i)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=$i.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):($i.copy(this.origin).addScaledVector(this.direction,e),$i.distanceToSquared(t))}distanceSqToSegment(t,e,i,n){pc.copy(t).add(e).multiplyScalar(.5),Ra.copy(e).sub(t).normalize(),Ca.copy(this.origin).sub(pc);let r=t.distanceTo(e)*.5,a=-this.direction.dot(Ra),o=Ca.dot(this.direction),c=-Ca.dot(Ra),l=Ca.lengthSq(),h=Math.abs(1-a*a),d,u,f,m;if(h>0)if(d=a*c-o,u=a*o-c,m=r*h,d>=0)if(u>=-m)if(u<=m){let v=1/h;d*=v,u*=v,f=d*(d+a*u+2*o)+u*(a*d+u+2*c)+l}else u=r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*c)+l;else u=-r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*c)+l;else u<=-m?(d=Math.max(0,-(-a*r+o)),u=d>0?-r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l):u<=m?(d=0,u=Math.min(Math.max(-r,-c),r),f=u*(u+2*c)+l):(d=Math.max(0,-(a*r+o)),u=d>0?r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l);else u=a>0?-r:r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,d),n&&n.copy(pc).addScaledVector(Ra,u),f}intersectSphere(t,e){if(t.radius<0)return null;$i.subVectors(t.center,this.origin);let i=$i.dot(this.direction),n=$i.dot($i)-i*i,r=t.radius*t.radius;if(n>r)return null;let a=Math.sqrt(r-n),o=i-a,c=i+a;return c<0?null:o<0?this.at(c,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){let i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,n,r,a,o,c,l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(i=(t.min.x-u.x)*l,n=(t.max.x-u.x)*l):(i=(t.max.x-u.x)*l,n=(t.min.x-u.x)*l),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),i>a||r>n||((r>i||isNaN(i))&&(i=r),(a<n||isNaN(n))&&(n=a),d>=0?(o=(t.min.z-u.z)*d,c=(t.max.z-u.z)*d):(o=(t.max.z-u.z)*d,c=(t.min.z-u.z)*d),i>c||o>n)||((o>i||i!==i)&&(i=o),(c<n||n!==n)&&(n=c),n<0)?null:this.at(i>=0?i:n,e)}intersectsBox(t){return this.intersectBox(t,$i)!==null}intersectTriangle(t,e,i,n,r){let a=this.origin,o=this.direction,c=o.x,l=o.y,h=o.z,d=t.x-a.x,u=t.y-a.y,f=t.z-a.z,m=e.x-a.x,v=e.y-a.y,g=e.z-a.z,p=i.x-a.x,b=i.y-a.y,M=i.z-a.z,x=Math.abs(c),T=Math.abs(l),E=Math.abs(h),R,y,A,P,N,O,V,D,B,X,W,st;if(x>=T&&x>=E?(A=c,O=d,B=m,st=p,c>=0?(R=l,y=h,P=u,N=f,V=v,D=g,X=b,W=M):(R=h,y=l,P=f,N=u,V=g,D=v,X=M,W=b)):T>=E?(A=l,O=u,B=v,st=b,l>=0?(R=h,y=c,P=f,N=d,V=g,D=m,X=M,W=p):(R=c,y=h,P=d,N=f,V=m,D=g,X=p,W=M)):(A=h,O=f,B=g,st=M,h>=0?(R=c,y=l,P=d,N=u,V=m,D=v,X=p,W=b):(R=l,y=c,P=u,N=d,V=v,D=m,X=b,W=p)),A===0)return null;let q=R/A,Q=y/A,it=1/A,It=P-q*O,wt=N-Q*O,ae=V-q*B,Zt=D-Q*B,ne=X-q*st,j=W-Q*st,tt=ne*Zt-j*ae,vt=It*j-wt*ne,Ht=ae*wt-Zt*It;if(n){if(tt<0||vt<0||Ht<0)return null}else if((tt<0||vt<0||Ht<0)&&(tt>0||vt>0||Ht>0))return null;let bt=tt+vt+Ht;if(bt===0)return null;let Vt=it*(tt*O+vt*B+Ht*st);return(bt>0?Vt<0:Vt>0)?null:this.at(Vt/bt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Ee=class extends mn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Lt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new tn,this.combine=Oc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Lu=new ye,kn=new no,Pa=new bs,Du=new C,Ia=new C,La=new C,Da=new C,mc=new C,Na=new C,Nu=new C,Ua=new C,ht=class extends $e{constructor(t=new De,e=new Ee){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let n=e[i[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=n.length;r<a;r++){let o=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let i=this.geometry,n=i.attributes.position,r=i.morphAttributes.position,a=i.morphTargetsRelative;e.fromBufferAttribute(n,t);let o=this.morphTargetInfluences;if(r&&o){Na.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=o[c],d=r[c];h!==0&&(mc.fromBufferAttribute(d,t),a?Na.addScaledVector(mc,h):Na.addScaledVector(mc.sub(e),h))}e.add(Na)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let i=this.geometry,n=this.material,r=this.matrixWorld;n!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Pa.copy(i.boundingSphere),Pa.applyMatrix4(r),kn.copy(t.ray).recast(t.near),!(Pa.containsPoint(kn.origin)===!1&&(kn.intersectSphere(Pa,Du)===null||kn.origin.distanceToSquared(Du)>(t.far-t.near)**2))&&(Lu.copy(r).invert(),kn.copy(t.ray).applyMatrix4(Lu),!(i.boundingBox!==null&&kn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,kn)))}_computeIntersections(t,e,i){let n,r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,v=u.length;m<v;m++){let g=u[m],p=a[g.materialIndex],b=Math.max(g.start,f.start),M=Math.min(o.count,Math.min(g.start+g.count,f.start+f.count));for(let x=b,T=M;x<T;x+=3){let E=o.getX(x),R=o.getX(x+1),y=o.getX(x+2);n=Fa(this,p,t,i,l,h,d,E,R,y),n&&(n.faceIndex=Math.floor(x/3),n.face.materialIndex=g.materialIndex,e.push(n))}}else{let m=Math.max(0,f.start),v=Math.min(o.count,f.start+f.count);for(let g=m,p=v;g<p;g+=3){let b=o.getX(g),M=o.getX(g+1),x=o.getX(g+2);n=Fa(this,a,t,i,l,h,d,b,M,x),n&&(n.faceIndex=Math.floor(g/3),e.push(n))}}else if(c!==void 0)if(Array.isArray(a))for(let m=0,v=u.length;m<v;m++){let g=u[m],p=a[g.materialIndex],b=Math.max(g.start,f.start),M=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let x=b,T=M;x<T;x+=3){let E=x,R=x+1,y=x+2;n=Fa(this,p,t,i,l,h,d,E,R,y),n&&(n.faceIndex=Math.floor(x/3),n.face.materialIndex=g.materialIndex,e.push(n))}}else{let m=Math.max(0,f.start),v=Math.min(c.count,f.start+f.count);for(let g=m,p=v;g<p;g+=3){let b=g,M=g+1,x=g+2;n=Fa(this,a,t,i,l,h,d,b,M,x),n&&(n.faceIndex=Math.floor(g/3),e.push(n))}}}};function $p(s,t,e,i,n,r,a,o){let c;if(t.side===Ye?c=i.intersectTriangle(a,r,n,!0,o):c=i.intersectTriangle(n,r,a,t.side===bn,o),c===null)return null;Ua.copy(o),Ua.applyMatrix4(s.matrixWorld);let l=e.ray.origin.distanceTo(Ua);return l<e.near||l>e.far?null:{distance:l,point:Ua.clone(),object:s}}function Fa(s,t,e,i,n,r,a,o,c,l){s.getVertexPosition(o,Ia),s.getVertexPosition(c,La),s.getVertexPosition(l,Da);let h=$p(s,t,e,i,Ia,La,Da,Nu);if(h){let d=new C;fn.getBarycoord(Nu,Ia,La,Da,d),n&&(h.uv=fn.getInterpolatedAttribute(n,o,c,l,d,new at)),r&&(h.uv1=fn.getInterpolatedAttribute(r,o,c,l,d,new at)),a&&(h.normal=fn.getInterpolatedAttribute(a,o,c,l,d,new C),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:c,c:l,normal:new C,materialIndex:0};fn.getNormal(Ia,La,Da,u.normal),h.face=u,h.barycoord=d}return h}var so=class extends si{constructor(t=null,e=1,i=1,n,r,a,o,c,l=ze,h=ze,d,u){super(null,a,o,c,l,h,n,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Hn=new bs,Qp=new at(.5,.5),Oa=new C,Ts=class{constructor(t=new Ai,e=new Ai,i=new Ai,n=new Ai,r=new Ai,a=new Ai){this.planes=[t,e,i,n,r,a]}set(t,e,i,n,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(i),o[3].copy(n),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=Ri,i=!1){let n=this.planes,r=t.elements,a=r[0],o=r[1],c=r[2],l=r[3],h=r[4],d=r[5],u=r[6],f=r[7],m=r[8],v=r[9],g=r[10],p=r[11],b=r[12],M=r[13],x=r[14],T=r[15];if(n[0].setComponents(l-a,f-h,p-m,T-b).normalize(),n[1].setComponents(l+a,f+h,p+m,T+b).normalize(),n[2].setComponents(l+o,f+d,p+v,T+M).normalize(),n[3].setComponents(l-o,f-d,p-v,T-M).normalize(),i)n[4].setComponents(c,u,g,x).normalize(),n[5].setComponents(l-c,f-u,p-g,T-x).normalize();else if(n[4].setComponents(l-c,f-u,p-g,T-x).normalize(),e===Ri)n[5].setComponents(l+c,f+u,p+g,T+x).normalize();else if(e===_s)n[5].setComponents(c,u,g,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Hn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Hn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Hn)}intersectsSprite(t){Hn.center.set(0,0,0);let e=Qp.distanceTo(t.center);return Hn.radius=.7071067811865476+e,Hn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Hn)}intersectsSphere(t){let e=this.planes,i=t.center,n=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<n)return!1;return!0}intersectsBox(t){let e=this.planes;for(let i=0;i<6;i++){let n=e[i];if(Oa.x=n.normal.x>0?t.max.x:t.min.x,Oa.y=n.normal.y>0?t.max.y:t.min.y,Oa.z=n.normal.z>0?t.max.z:t.min.z,n.distanceToPoint(Oa)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var pr=class extends si{constructor(t=[],e=Tn,i,n,r,a,o,c,l,h){super(t,e,i,n,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},gn=class extends si{constructor(t,e,i,n,r,a,o,c,l){super(t,e,i,n,r,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}};var xn=class extends si{constructor(t,e,i=Pi,n,r,a,o=ze,c=ze,l,h=Bi,d=1){if(h!==Bi&&h!==En)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:d};super(u,n,r,a,o,c,h,i,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new ys(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},ro=class extends xn{constructor(t,e=Pi,i=Tn,n,r,a=ze,o=ze,c,l=Bi){let h={width:t,height:t,depth:1},d=[h,h,h,h,h,h];super(t,t,e,i,n,r,a,o,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},mr=class extends si{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},we=class s extends De{constructor(t=1,e=1,i=1,n=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:n,heightSegments:r,depthSegments:a};let o=this;n=Math.floor(n),r=Math.floor(r),a=Math.floor(a);let c=[],l=[],h=[],d=[],u=0,f=0;m("z","y","x",-1,-1,i,e,t,a,r,0),m("z","y","x",1,-1,i,e,-t,a,r,1),m("x","z","y",1,1,t,i,e,n,a,2),m("x","z","y",1,-1,t,i,-e,n,a,3),m("x","y","z",1,-1,t,e,i,n,r,4),m("x","y","z",-1,-1,t,e,-i,n,r,5),this.setIndex(c),this.setAttribute("position",new ie(l,3)),this.setAttribute("normal",new ie(h,3)),this.setAttribute("uv",new ie(d,2));function m(v,g,p,b,M,x,T,E,R,y,A){let P=x/R,N=T/y,O=x/2,V=T/2,D=E/2,B=R+1,X=y+1,W=0,st=0,q=new C;for(let Q=0;Q<X;Q++){let it=Q*N-V;for(let It=0;It<B;It++){let wt=It*P-O;q[v]=wt*b,q[g]=it*M,q[p]=D,l.push(q.x,q.y,q.z),q[v]=0,q[g]=0,q[p]=E>0?1:-1,h.push(q.x,q.y,q.z),d.push(It/R),d.push(1-Q/y),W+=1}}for(let Q=0;Q<y;Q++)for(let it=0;it<R;it++){let It=u+it+B*Q,wt=u+it+B*(Q+1),ae=u+(it+1)+B*(Q+1),Zt=u+(it+1)+B*Q;c.push(It,wt,Zt),c.push(wt,ae,Zt),st+=6}o.addGroup(f,st,A),f+=st,u+=W}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var _e=class s extends De{constructor(t=1,e=1,i=1,n=32,r=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:i,radialSegments:n,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:c};let l=this;n=Math.floor(n),r=Math.floor(r);let h=[],d=[],u=[],f=[],m=0,v=[],g=i/2,p=0;b(),a===!1&&(t>0&&M(!0),e>0&&M(!1)),this.setIndex(h),this.setAttribute("position",new ie(d,3)),this.setAttribute("normal",new ie(u,3)),this.setAttribute("uv",new ie(f,2));function b(){let x=new C,T=new C,E=0,R=(e-t)/i;for(let y=0;y<=r;y++){let A=[],P=y/r,N=P*(e-t)+t;for(let O=0;O<=n;O++){let V=O/n,D=V*c+o,B=Math.sin(D),X=Math.cos(D);T.x=N*B,T.y=-P*i+g,T.z=N*X,d.push(T.x,T.y,T.z),x.set(B,R,X).normalize(),u.push(x.x,x.y,x.z),f.push(V,1-P),A.push(m++)}v.push(A)}for(let y=0;y<n;y++)for(let A=0;A<r;A++){let P=v[A][y],N=v[A+1][y],O=v[A+1][y+1],V=v[A][y+1];(t>0||A!==0)&&(h.push(P,N,V),E+=3),(e>0||A!==r-1)&&(h.push(N,O,V),E+=3)}l.addGroup(p,E,0),p+=E}function M(x){let T=m,E=new at,R=new C,y=0,A=x===!0?t:e,P=x===!0?1:-1;for(let O=1;O<=n;O++)d.push(0,g*P,0),u.push(0,P,0),f.push(.5,.5),m++;let N=m;for(let O=0;O<=n;O++){let D=O/n*c+o,B=Math.cos(D),X=Math.sin(D);R.x=A*X,R.y=g*P,R.z=A*B,d.push(R.x,R.y,R.z),u.push(0,P,0),E.x=B*.5+.5,E.y=X*.5*P+.5,f.push(E.x,E.y),m++}for(let O=0;O<n;O++){let V=T+O,D=N+O;x===!0?h.push(D,D+1,V):h.push(D+1,D,V),y+=3}l.addGroup(p,y,x===!0?1:2),p+=y}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},gr=class s extends _e{constructor(t=1,e=1,i=32,n=1,r=!1,a=0,o=Math.PI*2){super(0,t,e,i,n,r,a,o),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:i,heightSegments:n,openEnded:r,thetaStart:a,thetaLength:o}}static fromJSON(t){return new s(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var fi=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){kt("Curve: .getPoint() not implemented.")}getPointAt(t,e){let i=this.getUtoTmapping(t);return this.getPoint(i,e)}getPoints(t=5){let e=[];for(let i=0;i<=t;i++)e.push(this.getPoint(i/t));return e}getSpacedPoints(t=5){let e=[];for(let i=0;i<=t;i++)e.push(this.getPointAt(i/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],i,n=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)i=this.getPoint(a/t),r+=i.distanceTo(n),e.push(r),n=i;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let i=this.getLengths(),n=0,r=i.length,a;e?a=e:a=t*i[r-1];let o=0,c=r-1,l;for(;o<=c;)if(n=Math.floor(o+(c-o)/2),l=i[n]-a,l<0)o=n+1;else if(l>0)c=n-1;else{c=n;break}if(n=c,i[n]===a)return n/(r-1);let h=i[n],u=i[n+1]-h,f=(a-h)/u;return(n+f)/(r-1)}getTangent(t,e){let n=t-1e-4,r=t+1e-4;n<0&&(n=0),r>1&&(r=1);let a=this.getPoint(n),o=this.getPoint(r),c=e||(a.isVector2?new at:new C);return c.copy(o).sub(a).normalize(),c}getTangentAt(t,e){let i=this.getUtoTmapping(t);return this.getTangent(i,e)}computeFrenetFrames(t,e=!1){let i=new C,n=[],r=[],a=[],o=new C,c=new ye;for(let f=0;f<=t;f++){let m=f/t;n[f]=this.getTangentAt(m,new C)}r[0]=new C,a[0]=new C;let l=Number.MAX_VALUE,h=Math.abs(n[0].x),d=Math.abs(n[0].y),u=Math.abs(n[0].z);h<=l&&(l=h,i.set(1,0,0)),d<=l&&(l=d,i.set(0,1,0)),u<=l&&i.set(0,0,1),o.crossVectors(n[0],i).normalize(),r[0].crossVectors(n[0],o),a[0].crossVectors(n[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(n[f-1],n[f]),o.length()>Number.EPSILON){o.normalize();let m=Math.acos(te(n[f-1].dot(n[f]),-1,1));r[f].applyMatrix4(c.makeRotationAxis(o,m))}a[f].crossVectors(n[f],r[f])}if(e===!0){let f=Math.acos(te(r[0].dot(r[t]),-1,1));f/=t,n[0].dot(o.crossVectors(r[0],r[t]))>0&&(f=-f);for(let m=1;m<=t;m++)r[m].applyMatrix4(c.makeRotationAxis(n[m],f*m)),a[m].crossVectors(n[m],r[m])}return{tangents:n,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},Es=class extends fi{constructor(t=0,e=0,i=1,n=1,r=0,a=Math.PI*2,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=i,this.yRadius=n,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(t,e=new at){let i=e,n=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=n;for(;r>n;)r-=n;r<Number.EPSILON&&(a?r=0:r=n),this.aClockwise===!0&&!a&&(r===n?r=-n:r=r-n);let o=this.aStartAngle+t*r,c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=c-this.aX,f=l-this.aY;c=u*h-f*d+this.aX,l=u*d+f*h+this.aY}return i.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},ao=class extends Es{constructor(t,e,i,n,r,a){super(t,e,i,i,n,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Jc(){let s=0,t=0,e=0,i=0;function n(r,a,o,c){s=r,t=o,e=-3*r+3*a-2*o-c,i=2*r-2*a+o+c}return{initCatmullRom:function(r,a,o,c,l){n(a,o,l*(o-r),l*(c-a))},initNonuniformCatmullRom:function(r,a,o,c,l,h,d){let u=(a-r)/l-(o-r)/(l+h)+(o-a)/h,f=(o-a)/h-(c-a)/(h+d)+(c-o)/d;u*=h,f*=h,n(a,o,u,f)},calc:function(r){let a=r*r,o=a*r;return s+t*r+e*a+i*o}}}var Uu=new C,Fu=new C,gc=new Jc,xc=new Jc,_c=new Jc,Vn=class extends fi{constructor(t=[],e=!1,i="centripetal",n=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=i,this.tension=n}getPoint(t,e=new C){let i=e,n=this.points,r=n.length,a=(r-(this.closed?0:1))*t,o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:c===0&&o===r-1&&(o=r-2,c=1);let l,h;this.closed||o>0?l=n[(o-1)%r]:(Fu.subVectors(n[0],n[1]).add(n[0]),l=Fu);let d=n[o%r],u=n[(o+1)%r];if(this.closed||o+2<r?h=n[(o+2)%r]:(Uu.subVectors(n[r-1],n[r-2]).add(n[r-1]),h=Uu),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,m=Math.pow(l.distanceToSquared(d),f),v=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);v<1e-4&&(v=1),m<1e-4&&(m=v),g<1e-4&&(g=v),gc.initNonuniformCatmullRom(l.x,d.x,u.x,h.x,m,v,g),xc.initNonuniformCatmullRom(l.y,d.y,u.y,h.y,m,v,g),_c.initNonuniformCatmullRom(l.z,d.z,u.z,h.z,m,v,g)}else this.curveType==="catmullrom"&&(gc.initCatmullRom(l.x,d.x,u.x,h.x,this.tension),xc.initCatmullRom(l.y,d.y,u.y,h.y,this.tension),_c.initCatmullRom(l.z,d.z,u.z,h.z,this.tension));return i.set(gc.calc(c),xc.calc(c),_c.calc(c)),i}copy(t){super.copy(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let n=t.points[e];this.points.push(n.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,i=this.points.length;e<i;e++){let n=this.points[e];t.points.push(n.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let n=t.points[e];this.points.push(new C().fromArray(n))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function Ou(s,t,e,i,n){let r=(i-t)*.5,a=(n-e)*.5,o=s*s,c=s*o;return(2*e-2*i+r+a)*c+(-3*e+3*i-2*r-a)*o+r*s+e}function tm(s,t){let e=1-s;return e*e*t}function em(s,t){return 2*(1-s)*s*t}function im(s,t){return s*s*t}function sr(s,t,e,i){return tm(s,t)+em(s,e)+im(s,i)}function nm(s,t){let e=1-s;return e*e*e*t}function sm(s,t){let e=1-s;return 3*e*e*s*t}function rm(s,t){return 3*(1-s)*s*s*t}function am(s,t){return s*s*s*t}function rr(s,t,e,i,n){return nm(s,t)+sm(s,e)+rm(s,i)+am(s,n)}var xr=class extends fi{constructor(t=new at,e=new at,i=new at,n=new at){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=i,this.v3=n}getPoint(t,e=new at){let i=e,n=this.v0,r=this.v1,a=this.v2,o=this.v3;return i.set(rr(t,n.x,r.x,a.x,o.x),rr(t,n.y,r.y,a.y,o.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},oo=class extends fi{constructor(t=new C,e=new C,i=new C,n=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=i,this.v3=n}getPoint(t,e=new C){let i=e,n=this.v0,r=this.v1,a=this.v2,o=this.v3;return i.set(rr(t,n.x,r.x,a.x,o.x),rr(t,n.y,r.y,a.y,o.y),rr(t,n.z,r.z,a.z,o.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},_r=class extends fi{constructor(t=new at,e=new at){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new at){let i=e;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new at){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},lo=class extends fi{constructor(t=new C,e=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new C){let i=e;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new C){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},vr=class extends fi{constructor(t=new at,e=new at,i=new at){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=i}getPoint(t,e=new at){let i=e,n=this.v0,r=this.v1,a=this.v2;return i.set(sr(t,n.x,r.x,a.x),sr(t,n.y,r.y,a.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},yr=class extends fi{constructor(t=new C,e=new C,i=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=i}getPoint(t,e=new C){let i=e,n=this.v0,r=this.v1,a=this.v2;return i.set(sr(t,n.x,r.x,a.x),sr(t,n.y,r.y,a.y),sr(t,n.z,r.z,a.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Mr=class extends fi{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new at){let i=e,n=this.points,r=(n.length-1)*t,a=Math.floor(r),o=r-a,c=n[a===0?a:a-1],l=n[a],h=n[a>n.length-2?n.length-1:a+1],d=n[a>n.length-3?n.length-1:a+2];return i.set(Ou(o,c.x,l.x,h.x,d.x),Ou(o,c.y,l.y,h.y,d.y)),i}copy(t){super.copy(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let n=t.points[e];this.points.push(n.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,i=this.points.length;e<i;e++){let n=this.points[e];t.points.push(n.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let n=t.points[e];this.points.push(new at().fromArray(n))}return this}},co=Object.freeze({__proto__:null,ArcCurve:ao,CatmullRomCurve3:Vn,CubicBezierCurve:xr,CubicBezierCurve3:oo,EllipseCurve:Es,LineCurve:_r,LineCurve3:lo,QuadraticBezierCurve:vr,QuadraticBezierCurve3:yr,SplineCurve:Mr}),ho=class extends fi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let i=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new co[i](e,t))}return this}getPoint(t,e){let i=t*this.getLength(),n=this.getCurveLengths(),r=0;for(;r<n.length;){if(n[r]>=i){let a=n[r]-i,o=this.curves[r],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let i=0,n=this.curves.length;i<n;i++)e+=this.curves[i].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let i=0;i<=t;i++)e.push(this.getPoint(i/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],i;for(let n=0,r=this.curves;n<r.length;n++){let a=r[n],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,c=a.getPoints(o);for(let l=0;l<c.length;l++){let h=c[l];i&&i.equals(h)||(e.push(h),i=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,i=t.curves.length;e<i;e++){let n=t.curves[e];this.curves.push(n.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,i=this.curves.length;e<i;e++){let n=this.curves[e];t.curves.push(n.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,i=t.curves.length;e<i;e++){let n=t.curves[e];this.curves.push(new co[n.type]().fromJSON(n))}return this}},Sr=class extends ho{constructor(t){super(),this.type="Path",this.currentPoint=new at,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,i=t.length;e<i;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let i=new _r(this.currentPoint.clone(),new at(t,e));return this.curves.push(i),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,i,n){let r=new vr(this.currentPoint.clone(),new at(t,e),new at(i,n));return this.curves.push(r),this.currentPoint.set(i,n),this}bezierCurveTo(t,e,i,n,r,a){let o=new xr(this.currentPoint.clone(),new at(t,e),new at(i,n),new at(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),i=new Mr(e);return this.curves.push(i),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,i,n,r,a){let o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(t+o,e+c,i,n,r,a),this}absarc(t,e,i,n,r,a){return this.absellipse(t,e,i,i,n,r,a),this}ellipse(t,e,i,n,r,a,o,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+l,e+h,i,n,r,a,o,c),this}absellipse(t,e,i,n,r,a,o,c){let l=new Es(t,e,i,n,r,a,o,c);if(this.curves.length>0){let d=l.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},_n=class extends Sr{constructor(t){super(t),this.uuid=Us(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let i=0,n=this.holes.length;i<n;i++)e[i]=this.holes[i].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,i=t.holes.length;e<i;e++){let n=t.holes[e];this.holes.push(n.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,i=this.holes.length;e<i;e++){let n=this.holes[e];t.holes.push(n.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,i=t.holes.length;e<i;e++){let n=t.holes[e];this.holes.push(new Sr().fromJSON(n))}return this}};function om(s,t,e=2){let i=t&&t.length,n=i?t[0]*e:s.length,r=Ld(s,0,n,e,!0),a=[];if(!r||r.next===r.prev)return a;let o,c,l;if(i&&(r=dm(s,t,r,e)),s.length>80*e){o=s[0],c=s[1];let h=o,d=c;for(let u=e;u<n;u+=e){let f=s[u],m=s[u+1];f<o&&(o=f),m<c&&(c=m),f>h&&(h=f),m>d&&(d=m)}l=Math.max(h-o,d-c),l=l!==0?32767/l:0}return br(r,a,e,o,c,l,0),a}function Ld(s,t,e,i,n){let r;if(n===bm(s,t,e,i)>0)for(let a=t;a<e;a+=i)r=Bu(a/i|0,s[a],s[a+1],r);else for(let a=e-i;a>=t;a-=i)r=Bu(a/i|0,s[a],s[a+1],r);return r&&ws(r,r.next)&&(Er(r),r=r.next),r}function Gn(s,t){if(!s)return s;t||(t=s);let e=s,i;do if(i=!1,!e.steiner&&(ws(e,e.next)||Se(e.prev,e,e.next)===0)){if(Er(e),e=t=e.prev,e===e.next)break;i=!0}else e=e.next;while(i||e!==t);return t}function br(s,t,e,i,n,r,a){if(!s)return;!a&&r&&xm(s,i,n,r);let o=s;for(;s.prev!==s.next;){let c=s.prev,l=s.next;if(r?cm(s,i,n,r):lm(s)){t.push(c.i,s.i,l.i),Er(s),s=l.next,o=l.next;continue}if(s=l,s===o){a?a===1?(s=hm(Gn(s),t),br(s,t,e,i,n,r,2)):a===2&&um(s,t,e,i,n,r):br(Gn(s),t,e,i,n,r,1);break}}}function lm(s){let t=s.prev,e=s,i=s.next;if(Se(t,e,i)>=0)return!1;let n=t.x,r=e.x,a=i.x,o=t.y,c=e.y,l=i.y,h=Math.min(n,r,a),d=Math.min(o,c,l),u=Math.max(n,r,a),f=Math.max(o,c,l),m=i.next;for(;m!==t;){if(m.x>=h&&m.x<=u&&m.y>=d&&m.y<=f&&nr(n,o,r,c,a,l,m.x,m.y)&&Se(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function cm(s,t,e,i){let n=s.prev,r=s,a=s.next;if(Se(n,r,a)>=0)return!1;let o=n.x,c=r.x,l=a.x,h=n.y,d=r.y,u=a.y,f=Math.min(o,c,l),m=Math.min(h,d,u),v=Math.max(o,c,l),g=Math.max(h,d,u),p=Ec(f,m,t,e,i),b=Ec(v,g,t,e,i),M=s.prevZ,x=s.nextZ;for(;M&&M.z>=p&&x&&x.z<=b;){if(M.x>=f&&M.x<=v&&M.y>=m&&M.y<=g&&M!==n&&M!==a&&nr(o,h,c,d,l,u,M.x,M.y)&&Se(M.prev,M,M.next)>=0||(M=M.prevZ,x.x>=f&&x.x<=v&&x.y>=m&&x.y<=g&&x!==n&&x!==a&&nr(o,h,c,d,l,u,x.x,x.y)&&Se(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;M&&M.z>=p;){if(M.x>=f&&M.x<=v&&M.y>=m&&M.y<=g&&M!==n&&M!==a&&nr(o,h,c,d,l,u,M.x,M.y)&&Se(M.prev,M,M.next)>=0)return!1;M=M.prevZ}for(;x&&x.z<=b;){if(x.x>=f&&x.x<=v&&x.y>=m&&x.y<=g&&x!==n&&x!==a&&nr(o,h,c,d,l,u,x.x,x.y)&&Se(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function hm(s,t){let e=s;do{let i=e.prev,n=e.next.next;!ws(i,n)&&Nd(i,e,e.next,n)&&Tr(i,n)&&Tr(n,i)&&(t.push(i.i,e.i,n.i),Er(e),Er(e.next),e=s=n),e=e.next}while(e!==s);return Gn(e)}function um(s,t,e,i,n,r){let a=s;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&ym(a,o)){let c=Ud(a,o);a=Gn(a,a.next),c=Gn(c,c.next),br(a,t,e,i,n,r,0),br(c,t,e,i,n,r,0);return}o=o.next}a=a.next}while(a!==s)}function dm(s,t,e,i){let n=[];for(let r=0,a=t.length;r<a;r++){let o=t[r]*i,c=r<a-1?t[r+1]*i:s.length,l=Ld(s,o,c,i,!1);l===l.next&&(l.steiner=!0),n.push(vm(l))}n.sort(fm);for(let r=0;r<n.length;r++)e=pm(n[r],e);return e}function fm(s,t){let e=s.x-t.x;if(e===0&&(e=s.y-t.y,e===0)){let i=(s.next.y-s.y)/(s.next.x-s.x),n=(t.next.y-t.y)/(t.next.x-t.x);e=i-n}return e}function pm(s,t){let e=mm(s,t);if(!e)return t;let i=Ud(e,s);return Gn(i,i.next),Gn(e,e.next)}function mm(s,t){let e=t,i=s.x,n=s.y,r=-1/0,a;if(ws(s,e))return e;do{if(ws(s,e.next))return e.next;if(n<=e.y&&n>=e.next.y&&e.next.y!==e.y){let d=e.x+(n-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(d<=i&&d>r&&(r=d,a=e.x<e.next.x?e:e.next,d===i))return a}e=e.next}while(e!==t);if(!a)return null;let o=a,c=a.x,l=a.y,h=1/0;e=a;do{if(i>=e.x&&e.x>=c&&i!==e.x&&Dd(n<l?i:r,n,c,l,n<l?r:i,n,e.x,e.y)){let d=Math.abs(n-e.y)/(i-e.x);Tr(e,s)&&(d<h||d===h&&(e.x>a.x||e.x===a.x&&gm(a,e)))&&(a=e,h=d)}e=e.next}while(e!==o);return a}function gm(s,t){return Se(s.prev,s,t.prev)<0&&Se(t.next,s,s.next)<0}function xm(s,t,e,i){let n=s;do n.z===0&&(n.z=Ec(n.x,n.y,t,e,i)),n.prevZ=n.prev,n.nextZ=n.next,n=n.next;while(n!==s);n.prevZ.nextZ=null,n.prevZ=null,_m(n)}function _m(s){let t,e=1;do{let i=s,n;s=null;let r=null;for(t=0;i;){t++;let a=i,o=0;for(let l=0;l<e&&(o++,a=a.nextZ,!!a);l++);let c=e;for(;o>0||c>0&&a;)o!==0&&(c===0||!a||i.z<=a.z)?(n=i,i=i.nextZ,o--):(n=a,a=a.nextZ,c--),r?r.nextZ=n:s=n,n.prevZ=r,r=n;i=a}r.nextZ=null,e*=2}while(t>1);return s}function Ec(s,t,e,i,n){return s=(s-e)*n|0,t=(t-i)*n|0,s=(s|s<<8)&16711935,s=(s|s<<4)&252645135,s=(s|s<<2)&858993459,s=(s|s<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,s|t<<1}function vm(s){let t=s,e=s;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==s);return e}function Dd(s,t,e,i,n,r,a,o){return(n-a)*(t-o)>=(s-a)*(r-o)&&(s-a)*(i-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(n-a)*(i-o)}function nr(s,t,e,i,n,r,a,o){return!(s===a&&t===o)&&Dd(s,t,e,i,n,r,a,o)}function ym(s,t){return s.next.i!==t.i&&s.prev.i!==t.i&&!Mm(s,t)&&(Tr(s,t)&&Tr(t,s)&&Sm(s,t)&&(Se(s.prev,s,t.prev)||Se(s,t.prev,t))||ws(s,t)&&Se(s.prev,s,s.next)>0&&Se(t.prev,t,t.next)>0)}function Se(s,t,e){return(t.y-s.y)*(e.x-t.x)-(t.x-s.x)*(e.y-t.y)}function ws(s,t){return s.x===t.x&&s.y===t.y}function Nd(s,t,e,i){let n=ka(Se(s,t,e)),r=ka(Se(s,t,i)),a=ka(Se(e,i,s)),o=ka(Se(e,i,t));return!!(n!==r&&a!==o||n===0&&Ba(s,e,t)||r===0&&Ba(s,i,t)||a===0&&Ba(e,s,i)||o===0&&Ba(e,t,i))}function Ba(s,t,e){return t.x<=Math.max(s.x,e.x)&&t.x>=Math.min(s.x,e.x)&&t.y<=Math.max(s.y,e.y)&&t.y>=Math.min(s.y,e.y)}function ka(s){return s>0?1:s<0?-1:0}function Mm(s,t){let e=s;do{if(e.i!==s.i&&e.next.i!==s.i&&e.i!==t.i&&e.next.i!==t.i&&Nd(e,e.next,s,t))return!0;e=e.next}while(e!==s);return!1}function Tr(s,t){return Se(s.prev,s,s.next)<0?Se(s,t,s.next)>=0&&Se(s,s.prev,t)>=0:Se(s,t,s.prev)<0||Se(s,s.next,t)<0}function Sm(s,t){let e=s,i=!1,n=(s.x+t.x)/2,r=(s.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&n<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(i=!i),e=e.next;while(e!==s);return i}function Ud(s,t){let e=wc(s.i,s.x,s.y),i=wc(t.i,t.x,t.y),n=s.next,r=t.prev;return s.next=t,t.prev=s,e.next=n,n.prev=e,i.next=e,e.prev=i,r.next=i,i.prev=r,i}function Bu(s,t,e,i){let n=wc(s,t,e);return i?(n.next=i.next,n.prev=i,i.next.prev=n,i.next=n):(n.prev=n,n.next=n),n}function Er(s){s.next.prev=s.prev,s.prev.next=s.next,s.prevZ&&(s.prevZ.nextZ=s.nextZ),s.nextZ&&(s.nextZ.prevZ=s.prevZ)}function wc(s,t,e){return{i:s,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function bm(s,t,e,i){let n=0;for(let r=t,a=e-i;r<e;r+=i)n+=(s[a]-s[r])*(s[r+1]+s[a+1]),a=r;return n}var Ac=class{static triangulate(t,e,i=2){return om(t,e,i)}},Oi=class s{static area(t){let e=t.length,i=0;for(let n=e-1,r=0;r<e;n=r++)i+=t[n].x*t[r].y-t[r].x*t[n].y;return i*.5}static isClockWise(t){return s.area(t)<0}static triangulateShape(t,e){let i=[],n=[],r=[];ku(t),Hu(i,t);let a=t.length;e.forEach(ku);for(let c=0;c<e.length;c++)n.push(a),a+=e[c].length,Hu(i,e[c]);let o=Ac.triangulate(i,n);for(let c=0;c<o.length;c+=3)r.push(o.slice(c,c+3));return r}};function ku(s){let t=s.length;t>2&&s[t-1].equals(s[0])&&s.pop()}function Hu(s,t){for(let e=0;e<t.length;e++)s.push(t[e].x),s.push(t[e].y)}var wr=class s extends De{constructor(t=new _n([new at(.5,.5),new at(-.5,.5),new at(-.5,-.5),new at(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let i=this,n=[],r=[];for(let o=0,c=t.length;o<c;o++){let l=t[o];a(l)}this.setAttribute("position",new ie(n,3)),this.setAttribute("uv",new ie(r,2)),this.computeVertexNormals();function a(o){let c=[],l=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,d=e.depth!==void 0?e.depth:1,u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,f=e.bevelThickness!==void 0?e.bevelThickness:.2,m=e.bevelSize!==void 0?e.bevelSize:f-.1,v=e.bevelOffset!==void 0?e.bevelOffset:0,g=e.bevelSegments!==void 0?e.bevelSegments:3,p=e.extrudePath,b=e.UVGenerator!==void 0?e.UVGenerator:Tm,M,x=!1,T,E,R,y;if(p){M=p.getSpacedPoints(h),x=!0,u=!1;let et=p.isCatmullRomCurve3?p.closed:!1;T=p.computeFrenetFrames(h,et),E=new C,R=new C,y=new C}u||(g=0,f=0,m=0,v=0);let A=o.extractPoints(l),P=A.shape,N=A.holes;if(!Oi.isClockWise(P)){P=P.reverse();for(let et=0,rt=N.length;et<rt;et++){let ot=N[et];Oi.isClockWise(ot)&&(N[et]=ot.reverse())}}function V(et){let ot=10000000000000001e-36,lt=et[0];for(let dt=1;dt<=et.length;dt++){let Ot=dt%et.length,Ft=et[Ot],Gt=Ft.x-lt.x,Xt=Ft.y-lt.y,I=Gt*Gt+Xt*Xt,oe=Math.max(Math.abs(Ft.x),Math.abs(Ft.y),Math.abs(lt.x),Math.abs(lt.y)),$t=ot*oe*oe;if(I<=$t){et.splice(Ot,1),dt--;continue}lt=Ft}}V(P),N.forEach(V);let D=N.length,B=P;for(let et=0;et<D;et++){let rt=N[et];P=P.concat(rt)}function X(et,rt,ot){return rt||zt("ExtrudeGeometry: vec does not exist"),et.clone().addScaledVector(rt,ot)}let W=P.length;function st(et,rt,ot){let lt,dt,Ot,Ft=et.x-rt.x,Gt=et.y-rt.y,Xt=ot.x-et.x,I=ot.y-et.y,oe=Ft*Ft+Gt*Gt,$t=Ft*I-Gt*Xt;if(Math.abs($t)>Number.EPSILON){let w=Math.sqrt(oe),_=Math.sqrt(Xt*Xt+I*I),F=rt.x-Gt/w,z=rt.y+Ft/w,Y=ot.x-I/_,ct=ot.y+Xt/_,ut=((Y-F)*I-(ct-z)*Xt)/(Ft*I-Gt*Xt);lt=F+Ft*ut-et.x,dt=z+Gt*ut-et.y;let K=lt*lt+dt*dt;if(K<=2)return new at(lt,dt);Ot=Math.sqrt(K/2)}else{let w=!1;Ft>Number.EPSILON?Xt>Number.EPSILON&&(w=!0):Ft<-Number.EPSILON?Xt<-Number.EPSILON&&(w=!0):Math.sign(Gt)===Math.sign(I)&&(w=!0),w?(lt=-Gt,dt=Ft,Ot=Math.sqrt(oe)):(lt=Ft,dt=Gt,Ot=Math.sqrt(oe/2))}return new at(lt/Ot,dt/Ot)}let q=[];for(let et=0,rt=B.length,ot=rt-1,lt=et+1;et<rt;et++,ot++,lt++)ot===rt&&(ot=0),lt===rt&&(lt=0),q[et]=st(B[et],B[ot],B[lt]);let Q=[],it,It=q.concat();for(let et=0,rt=D;et<rt;et++){let ot=N[et];it=[];for(let lt=0,dt=ot.length,Ot=dt-1,Ft=lt+1;lt<dt;lt++,Ot++,Ft++)Ot===dt&&(Ot=0),Ft===dt&&(Ft=0),it[lt]=st(ot[lt],ot[Ot],ot[Ft]);Q.push(it),It=It.concat(it)}let wt;if(g===0)wt=Oi.triangulateShape(B,N);else{let et=[],rt=[];for(let ot=0;ot<g;ot++){let lt=ot/g,dt=f*Math.cos(lt*Math.PI/2),Ot=m*Math.sin(lt*Math.PI/2)+v;for(let Ft=0,Gt=B.length;Ft<Gt;Ft++){let Xt=X(B[Ft],q[Ft],Ot);vt(Xt.x,Xt.y,-dt),lt===0&&et.push(Xt)}for(let Ft=0,Gt=D;Ft<Gt;Ft++){let Xt=N[Ft];it=Q[Ft];let I=[];for(let oe=0,$t=Xt.length;oe<$t;oe++){let w=X(Xt[oe],it[oe],Ot);vt(w.x,w.y,-dt),lt===0&&I.push(w)}lt===0&&rt.push(I)}}wt=Oi.triangulateShape(et,rt)}let ae=wt.length,Zt=m+v;for(let et=0;et<W;et++){let rt=u?X(P[et],It[et],Zt):P[et];x?(R.copy(T.normals[0]).multiplyScalar(rt.x),E.copy(T.binormals[0]).multiplyScalar(rt.y),y.copy(M[0]).add(R).add(E),vt(y.x,y.y,y.z)):vt(rt.x,rt.y,0)}for(let et=1;et<=h;et++)for(let rt=0;rt<W;rt++){let ot=u?X(P[rt],It[rt],Zt):P[rt];x?(R.copy(T.normals[et]).multiplyScalar(ot.x),E.copy(T.binormals[et]).multiplyScalar(ot.y),y.copy(M[et]).add(R).add(E),vt(y.x,y.y,y.z)):vt(ot.x,ot.y,d/h*et)}for(let et=g-1;et>=0;et--){let rt=et/g,ot=f*Math.cos(rt*Math.PI/2),lt=m*Math.sin(rt*Math.PI/2)+v;for(let dt=0,Ot=B.length;dt<Ot;dt++){let Ft=X(B[dt],q[dt],lt);vt(Ft.x,Ft.y,d+ot)}for(let dt=0,Ot=N.length;dt<Ot;dt++){let Ft=N[dt];it=Q[dt];for(let Gt=0,Xt=Ft.length;Gt<Xt;Gt++){let I=X(Ft[Gt],it[Gt],lt);x?vt(I.x,I.y+M[h-1].y,M[h-1].x+ot):vt(I.x,I.y,d+ot)}}}ne(),j();function ne(){let et=n.length/3;if(u){let rt=0,ot=W*rt;for(let lt=0;lt<ae;lt++){let dt=wt[lt];Ht(dt[2]+ot,dt[1]+ot,dt[0]+ot)}rt=h+g*2,ot=W*rt;for(let lt=0;lt<ae;lt++){let dt=wt[lt];Ht(dt[0]+ot,dt[1]+ot,dt[2]+ot)}}else{for(let rt=0;rt<ae;rt++){let ot=wt[rt];Ht(ot[2],ot[1],ot[0])}for(let rt=0;rt<ae;rt++){let ot=wt[rt];Ht(ot[0]+W*h,ot[1]+W*h,ot[2]+W*h)}}i.addGroup(et,n.length/3-et,0)}function j(){let et=n.length/3,rt=0;tt(B,rt),rt+=B.length;for(let ot=0,lt=N.length;ot<lt;ot++){let dt=N[ot];tt(dt,rt),rt+=dt.length}i.addGroup(et,n.length/3-et,1)}function tt(et,rt){let ot=et.length;for(;--ot>=0;){let lt=ot,dt=ot-1;dt<0&&(dt=et.length-1);for(let Ot=0,Ft=h+g*2;Ot<Ft;Ot++){let Gt=W*Ot,Xt=W*(Ot+1),I=rt+lt+Gt,oe=rt+dt+Gt,$t=rt+dt+Xt,w=rt+lt+Xt;bt(I,oe,$t,w)}}}function vt(et,rt,ot){c.push(et),c.push(rt),c.push(ot)}function Ht(et,rt,ot){Vt(et),Vt(rt),Vt(ot);let lt=n.length/3,dt=b.generateTopUV(i,n,lt-3,lt-2,lt-1);he(dt[0]),he(dt[1]),he(dt[2])}function bt(et,rt,ot,lt){Vt(et),Vt(rt),Vt(lt),Vt(rt),Vt(ot),Vt(lt);let dt=n.length/3,Ot=b.generateSideWallUV(i,n,dt-6,dt-3,dt-2,dt-1);he(Ot[0]),he(Ot[1]),he(Ot[3]),he(Ot[1]),he(Ot[2]),he(Ot[3])}function Vt(et){n.push(c[et*3+0]),n.push(c[et*3+1]),n.push(c[et*3+2])}function he(et){r.push(et.x),r.push(et.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,i=this.parameters.options;return Em(e,i,t)}static fromJSON(t,e){let i=[];for(let r=0,a=t.shapes.length;r<a;r++){let o=e[t.shapes[r]];i.push(o)}let n=t.options.extrudePath;return n!==void 0&&(t.options.extrudePath=new co[n.type]().fromJSON(n)),new s(i,t.options)}},Tm={generateTopUV:function(s,t,e,i,n){let r=t[e*3],a=t[e*3+1],o=t[i*3],c=t[i*3+1],l=t[n*3],h=t[n*3+1];return[new at(r,a),new at(o,c),new at(l,h)]},generateSideWallUV:function(s,t,e,i,n,r){let a=t[e*3],o=t[e*3+1],c=t[e*3+2],l=t[i*3],h=t[i*3+1],d=t[i*3+2],u=t[n*3],f=t[n*3+1],m=t[n*3+2],v=t[r*3],g=t[r*3+1],p=t[r*3+2];return Math.abs(o-h)<Math.abs(a-l)?[new at(a,1-c),new at(l,1-d),new at(u,1-m),new at(v,1-p)]:[new at(o,1-c),new at(h,1-d),new at(f,1-m),new at(g,1-p)]}};function Em(s,t,e){if(e.shapes=[],Array.isArray(s))for(let i=0,n=s.length;i<n;i++){let r=s[i];e.shapes.push(r.uuid)}else e.shapes.push(s.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var qe=class s extends De{constructor(t=1,e=1,i=1,n=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:n};let r=t/2,a=e/2,o=Math.floor(i),c=Math.floor(n),l=o+1,h=c+1,d=t/o,u=e/c,f=[],m=[],v=[],g=[];for(let p=0;p<h;p++){let b=p*u-a;for(let M=0;M<l;M++){let x=M*d-r;m.push(x,-b,0),v.push(0,0,1),g.push(M/o),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let b=0;b<o;b++){let M=b+l*p,x=b+l*(p+1),T=b+1+l*(p+1),E=b+1+l*p;f.push(M,x,E),f.push(x,T,E)}this.setIndex(f),this.setAttribute("position",new ie(m,3)),this.setAttribute("normal",new ie(v,3)),this.setAttribute("uv",new ie(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.width,t.height,t.widthSegments,t.heightSegments)}};var Ar=class s extends De{constructor(t=new _n([new at(0,.5),new at(-.5,-.5),new at(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let i=[],n=[],r=[],a=[],o=0,c=0;if(Array.isArray(t)===!1)l(t);else for(let h=0;h<t.length;h++)l(t[h]),this.addGroup(o,c,h),o+=c,c=0;this.setIndex(i),this.setAttribute("position",new ie(n,3)),this.setAttribute("normal",new ie(r,3)),this.setAttribute("uv",new ie(a,2));function l(h){let d=n.length/3,u=h.extractPoints(e),f=u.shape,m=u.holes;Oi.isClockWise(f)===!1&&(f=f.reverse());for(let g=0,p=m.length;g<p;g++){let b=m[g];Oi.isClockWise(b)===!0&&(m[g]=b.reverse())}let v=Oi.triangulateShape(f,m);for(let g=0,p=m.length;g<p;g++){let b=m[g];f=f.concat(b)}for(let g=0,p=f.length;g<p;g++){let b=f[g];n.push(b.x,b.y,0),r.push(0,0,1),a.push(b.x,b.y)}for(let g=0,p=v.length;g<p;g++){let b=v[g],M=b[0]+d,x=b[1]+d,T=b[2]+d;i.push(M,x,T),c+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return wm(e,t)}static fromJSON(t,e){let i=[];for(let n=0,r=t.shapes.length;n<r;n++){let a=e[t.shapes[n]];i.push(a)}return new s(i,t.curveSegments)}};function wm(s,t){if(t.shapes=[],Array.isArray(s))for(let e=0,i=s.length;e<i;e++){let n=s[e];t.shapes.push(n.uuid)}else t.shapes.push(s.uuid);return t}var zi=class s extends De{constructor(t=1,e=32,i=16,n=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:n,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));let c=Math.min(a+o,Math.PI),l=0,h=[],d=new C,u=new C,f=[],m=[],v=[],g=[];for(let p=0;p<=i;p++){let b=[],M=p/i,x=a+M*o,T=t*Math.cos(x),E=Math.sqrt(t*t-T*T),R=0;p===0&&a===0?R=.5/e:p===i&&c===Math.PI&&(R=-.5/e);for(let y=0;y<=e;y++){let A=y/e,P=n+A*r;d.x=-E*Math.cos(P),d.y=T,d.z=E*Math.sin(P),m.push(d.x,d.y,d.z),u.copy(d).normalize(),v.push(u.x,u.y,u.z),g.push(A+R,1-M),b.push(l++)}h.push(b)}for(let p=0;p<i;p++)for(let b=0;b<e;b++){let M=h[p][b+1],x=h[p][b],T=h[p+1][b],E=h[p+1][b+1];(p!==0||a>0)&&f.push(M,x,E),(p!==i-1||c<Math.PI)&&f.push(x,T,E)}this.setIndex(f),this.setAttribute("position",new ie(m,3)),this.setAttribute("normal",new ie(v,3)),this.setAttribute("uv",new ie(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var Vi=class s extends De{constructor(t=1,e=.4,i=12,n=48,r=Math.PI*2,a=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:i,tubularSegments:n,arc:r,thetaStart:a,thetaLength:o},i=Math.floor(i),n=Math.floor(n);let c=[],l=[],h=[],d=[],u=new C,f=new C,m=new C;for(let v=0;v<=i;v++){let g=a+v/i*o;for(let p=0;p<=n;p++){let b=p/n*r;f.x=(t+e*Math.cos(g))*Math.cos(b),f.y=(t+e*Math.cos(g))*Math.sin(b),f.z=e*Math.sin(g),l.push(f.x,f.y,f.z),u.x=t*Math.cos(b),u.y=t*Math.sin(b),m.subVectors(f,u).normalize(),h.push(m.x,m.y,m.z),d.push(p/n),d.push(v/i)}}for(let v=1;v<=i;v++)for(let g=1;g<=n;g++){let p=(n+1)*v+g-1,b=(n+1)*(v-1)+g-1,M=(n+1)*(v-1)+g,x=(n+1)*v+g;c.push(p,b,x),c.push(b,M,x)}this.setIndex(c),this.setAttribute("position",new ie(l,3)),this.setAttribute("normal",new ie(h,3)),this.setAttribute("uv",new ie(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};var As=class s extends De{constructor(t=new yr(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),e=64,i=1,n=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:i,radialSegments:n,closed:r};let a=t.computeFrenetFrames(e,r);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new C,c=new C,l=new at,h=new C,d=[],u=[],f=[],m=[];v(),this.setIndex(m),this.setAttribute("position",new ie(d,3)),this.setAttribute("normal",new ie(u,3)),this.setAttribute("uv",new ie(f,2));function v(){for(let M=0;M<e;M++)g(M);g(r===!1?e:0),b(),p()}function g(M){h=t.getPointAt(M/e,h);let x=a.normals[M],T=a.binormals[M];for(let E=0;E<=n;E++){let R=E/n*Math.PI*2,y=Math.sin(R),A=-Math.cos(R);c.x=A*x.x+y*T.x,c.y=A*x.y+y*T.y,c.z=A*x.z+y*T.z,c.normalize(),u.push(c.x,c.y,c.z),o.x=h.x+i*c.x,o.y=h.y+i*c.y,o.z=h.z+i*c.z,d.push(o.x,o.y,o.z)}}function p(){for(let M=1;M<=e;M++)for(let x=1;x<=n;x++){let T=(n+1)*(M-1)+(x-1),E=(n+1)*M+(x-1),R=(n+1)*M+x,y=(n+1)*(M-1)+x;m.push(T,E,y),m.push(E,R,y)}}function b(){for(let M=0;M<=e;M++)for(let x=0;x<=n;x++)l.x=M/e,l.y=x/n,f.push(l.x,l.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new s(new co[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function Kn(s){let t={};for(let e in s){t[e]={};for(let i in s[e]){let n=s[e][i];if(zu(n))n.isRenderTargetTexture?(kt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=n.clone();else if(Array.isArray(n))if(zu(n[0])){let r=[];for(let a=0,o=n.length;a<o;a++)r[a]=n[a].clone();t[e][i]=r}else t[e][i]=n.slice();else t[e][i]=n}}return t}function Qe(s){let t={};for(let e=0;e<s.length;e++){let i=Kn(s[e]);for(let n in i)t[n]=i[n]}return t}function zu(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function Am(s){let t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function Kc(s){let t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:jt.workingColorSpace}var sn={clone:Kn,merge:Qe},Rm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Cm=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Pe=class extends mn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Rm,this.fragmentShader=Cm,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Kn(t.uniforms),this.uniformsGroups=Am(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let n in this.uniforms){let a=this.uniforms[n].value;a&&a.isTexture?e.uniforms[n]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[n]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[n]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[n]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[n]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[n]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[n]={type:"m4",value:a.toArray()}:e.uniforms[n]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let i={};for(let n in this.extensions)this.extensions[n]===!0&&(i[n]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let i in t.uniforms){let n=t.uniforms[i];switch(this.uniforms[i]={},n.type){case"t":this.uniforms[i].value=e[n.value]||null;break;case"c":this.uniforms[i].value=new Lt().setHex(n.value);break;case"v2":this.uniforms[i].value=new at().fromArray(n.value);break;case"v3":this.uniforms[i].value=new C().fromArray(n.value);break;case"v4":this.uniforms[i].value=new Me().fromArray(n.value);break;case"m3":this.uniforms[i].value=new Wt().fromArray(n.value);break;case"m4":this.uniforms[i].value=new ye().fromArray(n.value);break;default:this.uniforms[i].value=n.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let i in t.extensions)this.extensions[i]=t.extensions[i];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},Rs=class extends Pe{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},ve=class extends mn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Lt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Lt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ul,this.normalScale=new at(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new tn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var uo=class extends mn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=xd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},fo=class extends mn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function ds(s,t){return!s||s.constructor===t?s:typeof t.BYTES_PER_ELEMENT=="number"?new t(s):Array.prototype.slice.call(s)}function vc(s){return s!==void 0&&s.inTangents!==void 0&&s.outTangents!==void 0}var vn=class{constructor(t,e,i,n){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=n!==void 0?n:new e.constructor(i),this.sampleValues=e,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,i=this._cachedIndex,n=e[i],r=e[i-1];i:{t:{let a;e:{n:if(!(t<n)){for(let o=i+2;;){if(n===void 0){if(t<r)break n;return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(r=n,n=e[++i],t<n)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(i=2,r=o);for(let c=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===c)break;if(n=r,r=e[--i-1],t>=r)break t}a=i,i=0;break e}break i}for(;i<a;){let o=i+a>>>1;t<e[o]?a=o:i=o+1}if(n=e[i],r=e[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===void 0)return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,n)}return this.interpolate_(i,r,t,n)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,i=this.sampleValues,n=this.valueSize,r=t*n;for(let a=0;a!==n;++a)e[a]=i[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},po=class extends vn{constructor(t,e,i,n){super(t,e,i,n),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Sc,endingEnd:Sc}}intervalChanged_(t,e,i){let n=this.parameterPositions,r=t-2,a=t+1,o=n[r],c=n[a];if(o===void 0)switch(this.getSettings_().endingStart){case bc:r=t,o=2*e-i;break;case Tc:r=n.length-2,o=e+n[r]-n[r+1];break;default:r=t,o=i}if(c===void 0)switch(this.getSettings_().endingEnd){case bc:a=t,c=2*i-e;break;case Tc:a=1,c=i+n[1]-n[0];break;default:a=t-1,c=e}let l=(i-e)*.5,h=this.valueSize;this._weightPrev=l/(e-o),this._weightNext=l/(c-i),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(t,e,i,n){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,m=(i-e)/(n-e),v=m*m,g=v*m,p=-u*g+2*u*v-u*m,b=(1+u)*g+(-1.5-2*u)*v+(-.5+u)*m+1,M=(-1-f)*g+(1.5+f)*v+.5*m,x=f*g-f*v;for(let T=0;T!==o;++T)r[T]=p*a[h+T]+b*a[l+T]+M*a[c+T]+x*a[d+T];return r}},mo=class extends vn{constructor(t,e,i,n){super(t,e,i,n)}interpolate_(t,e,i,n){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=(i-e)/(n-e),d=1-h;for(let u=0;u!==o;++u)r[u]=a[l+u]*d+a[c+u]*h;return r}},go=class extends vn{constructor(t,e,i,n){super(t,e,i,n)}interpolate_(t){return this.copySampleValue_(t-1)}},xo=class extends vn{interpolate_(t,e,i,n){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=this.inTangents,d=this.outTangents;if(!h||!d){let m=(i-e)/(n-e),v=1-m;for(let g=0;g!==o;++g)r[g]=a[l+g]*v+a[c+g]*m;return r}let u=o*2,f=t-1;for(let m=0;m!==o;++m){let v=a[l+m],g=a[c+m],p=f*u+m*2,b=d[p],M=d[p+1],x=t*u+m*2,T=h[x],E=h[x+1],R=Im(i,e,b,T,n);r[m]=Fd(R,v,M,E,g)}return r}};function Fd(s,t,e,i,n){let r=1-s;return r*r*r*t+3*r*r*s*e+3*r*s*s*i+s*s*s*n}function Pm(s,t,e,i,n){let r=1-s;return 3*r*r*(e-t)+6*r*s*(i-e)+3*s*s*(n-i)}function Im(s,t,e,i,n){let r=(s-t)/(n-t);for(let a=0;a<8;a++){let o=Fd(r,t,e,i,n)-s;if(Math.abs(o)<1e-10)break;let c=Pm(r,t,e,i,n);if(Math.abs(c)<1e-10)break;r=Math.max(0,Math.min(1,r-o/c))}return r}var pi=class{constructor(t,e,i,n){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=ds(e,this.TimeBufferType),this.values=ds(i,this.ValueBufferType),this.setInterpolation(n||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,i;if(e.toJSON!==this.toJSON)i=e.toJSON(t);else{i={name:t.name,times:ds(t.times,Array),values:ds(t.values,Array)};let n=t.getInterpolation();n!==t.DefaultInterpolation&&(i.interpolation=n),vc(t.settings)&&(i.settings={inTangents:ds(t.settings.inTangents,Array),outTangents:ds(t.settings.outTangents,Array)})}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new go(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new mo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new po(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new xo(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case ar:e=this.InterpolantFactoryMethodDiscrete;break;case $a:e=this.InterpolantFactoryMethodLinear;break;case Va:e=this.InterpolantFactoryMethodSmooth;break;case Mc:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return kt("KeyframeTrack:",i),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ar;case this.InterpolantFactoryMethodLinear:return $a;case this.InterpolantFactoryMethodSmooth:return Va;case this.InterpolantFactoryMethodBezier:return Mc}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let i=0,n=e.length;i!==n;++i)e[i]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let i=0,n=e.length;i!==n;++i)e[i]*=t;vc(this.settings)&&(Vu(this.settings.inTangents,t),Vu(this.settings.outTangents,t))}return this}trim(t,e){let i=this.times,n=i.length,r=0,a=n-1;for(;r!==n&&i[r]<t;)++r;for(;a!==-1&&i[a]>e;)--a;if(++a,r!==0||a!==n){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=i.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(zt("KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,n=this.values,r=i.length;r===0&&(zt("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let c=i[o];if(typeof c=="number"&&isNaN(c)){zt("KeyframeTrack: Time is not a valid number.",this,o,c),t=!1;break}if(a!==null&&a>c){zt("KeyframeTrack: Out of order keys.",this,o,c,a),t=!1;break}a=c}if(n!==void 0&&Np(n))for(let o=0,c=n.length;o!==c;++o){let l=n[o];if(isNaN(l)){zt("KeyframeTrack: Value is not a valid number.",this,o,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),i=this.getValueSize(),n=this.getInterpolation()===Va,r=t.length-1,a=1;for(let o=1;o<r;++o){let c=!1,l=t[o],h=t[o+1];if(l!==h&&(o!==1||l!==t[0]))if(n)c=!0;else{let d=o*i,u=d-i,f=d+i;for(let m=0;m!==i;++m){let v=e[d+m];if(v!==e[u+m]||v!==e[f+m]){c=!0;break}}}if(c){if(o!==a){t[a]=t[o];let d=o*i,u=a*i;for(let f=0;f!==i;++f)e[u+f]=e[d+f]}++a}}if(r>0){t[a]=t[r];for(let o=r*i,c=a*i,l=0;l!==i;++l)e[c+l]=e[o+l];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*i)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),i=this.constructor,n=new i(this.name,t,e);return n.createInterpolant=this.createInterpolant,vc(this.settings)&&(n.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),n}};function Vu(s,t){for(let e=0,i=s.length;e!==i;e+=2)s[e]*=t}pi.prototype.ValueTypeName="";pi.prototype.TimeBufferType=Float32Array;pi.prototype.ValueBufferType=Float32Array;pi.prototype.DefaultInterpolation=$a;var yn=class extends pi{constructor(t,e,i){super(t,e,i)}};yn.prototype.ValueTypeName="bool";yn.prototype.ValueBufferType=Array;yn.prototype.DefaultInterpolation=ar;yn.prototype.InterpolantFactoryMethodLinear=void 0;yn.prototype.InterpolantFactoryMethodSmooth=void 0;var _o=class extends pi{constructor(t,e,i,n){super(t,e,i,n)}};_o.prototype.ValueTypeName="color";var vo=class extends pi{constructor(t,e,i,n){super(t,e,i,n)}};vo.prototype.ValueTypeName="number";var yo=class extends vn{constructor(t,e,i,n){super(t,e,i,n)}interpolate_(t,e,i,n){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(i-e)/(n-e),l=t*o;for(let h=l+o;l!==h;l+=4)Hi.slerpFlat(r,0,a,l-o,a,l,c);return r}},Rr=class extends pi{constructor(t,e,i,n){super(t,e,i,n)}InterpolantFactoryMethodLinear(t){return new yo(this.times,this.values,this.getValueSize(),t)}};Rr.prototype.ValueTypeName="quaternion";Rr.prototype.InterpolantFactoryMethodSmooth=void 0;var Mn=class extends pi{constructor(t,e,i){super(t,e,i)}};Mn.prototype.ValueTypeName="string";Mn.prototype.ValueBufferType=Array;Mn.prototype.DefaultInterpolation=ar;Mn.prototype.InterpolantFactoryMethodLinear=void 0;Mn.prototype.InterpolantFactoryMethodSmooth=void 0;var Mo=class extends pi{constructor(t,e,i,n){super(t,e,i,n)}};Mo.prototype.ValueTypeName="vector";var So=class{constructor(t,e,i){let n=this,r=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=i,this._abortController=null,this.itemStart=function(h){o++,r===!1&&n.onStart!==void 0&&n.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,n.onProgress!==void 0&&n.onProgress(h,a,o),a===o&&(r=!1,n.onLoad!==void 0&&n.onLoad())},this.itemError=function(h){n.onError!==void 0&&n.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,d){return l.push(h,d),this},this.removeHandler=function(h){let d=l.indexOf(h);return d!==-1&&l.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=l.length;d<u;d+=2){let f=l[d],m=l[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Od=new So,bo=class{constructor(t){this.manager=t!==void 0?t:Od,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let i=this;return new Promise(function(n,r){i.load(t,n,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};bo.DEFAULT_MATERIAL_NAME="__DEFAULT";var Cs=class extends $e{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Lt(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},Cr=class extends Cs{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy($e.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Lt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},yc=new ye,Gu=new C,Wu=new C,Pr=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new at(512,512),this.mapType=oi,this.map=null,this.mapPass=null,this.matrix=new ye,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ts,this._frameExtents=new at(1,1),this._viewportCount=1,this._viewports=[new Me(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Gu.setFromMatrixPosition(t.matrixWorld),e.position.copy(Gu),Wu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Wu),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,i,n){yc.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),i.setFromProjectionMatrix(yc,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=n?n.z/r.x:1,o=n?n.w/r.y:1,c=n?n.x/r.x:0,l=n?n.y/r.y:0;t.coordinateSystem===_s||t.reversedDepth?e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,.5,.5,0,0,0,1),e.multiply(yc)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Ha=new C,za=new Hi,Ui=new C,Ir=class extends $e{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ye,this.projectionMatrix=new ye,this.projectionMatrixInverse=new ye,this.coordinateSystem=Ri,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Ha,za,Ui),Ui.x===1&&Ui.y===1&&Ui.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ha,za,Ui.set(1,1,1)).invert()}updateWorldMatrix(t,e,i=!1){super.updateWorldMatrix(t,e,i),this.matrixWorld.decompose(Ha,za,Ui),Ui.x===1&&Ui.y===1&&Ui.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ha,za,Ui.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},dn=new C,Xu=new at,qu=new at,We=class extends Ir{constructor(t=50,e=1,i=.1,n=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=n,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Qa*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Kl*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Qa*2*Math.atan(Math.tan(Kl*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){dn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(dn.x,dn.y).multiplyScalar(-t/dn.z),dn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(dn.x,dn.y).multiplyScalar(-t/dn.z)}getViewSize(t,e){return this.getViewBounds(t,Xu,qu),e.subVectors(qu,Xu)}setViewOffset(t,e,i,n,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Kl*.5*this.fov)/this.zoom,i=2*e,n=this.aspect*i,r=-.5*n,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*n/c,e-=a.offsetY*i/l,n*=a.width/c,i*=a.height/l}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+n,e,e-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Rc=class extends Pr{constructor(){super(new We(90,1,.5,500)),this.isPointLightShadow=!0}},Wn=class extends Cs{constructor(t,e,i=0,n=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=n,this.shadow=new Rc}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Sn=class extends Ir{constructor(t=-1,e=1,i=1,n=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=n,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,n,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,n=(this.top+this.bottom)/2,r=i-t,a=i+t,o=n+e,c=n-e;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Cc=class extends Pr{constructor(){super(new Sn(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Lr=class extends Cs{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy($e.DEFAULT_UP),this.updateMatrix(),this.target=new $e,this.shadow=new Cc}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}};var fs=-90,ps=1,Ps=class extends $e{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let n=new We(fs,ps,t,e);n.layers=this.layers,this.add(n);let r=new We(fs,ps,t,e);r.layers=this.layers,this.add(r);let a=new We(fs,ps,t,e);a.layers=this.layers,this.add(a);let o=new We(fs,ps,t,e);o.layers=this.layers,this.add(o);let c=new We(fs,ps,t,e);c.layers=this.layers,this.add(c);let l=new We(fs,ps,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[i,n,r,a,o,c]=e;for(let l of e)this.remove(l);if(t===Ri)i.up.set(0,1,0),i.lookAt(1,0,0),n.up.set(0,1,0),n.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===_s)i.up.set(0,-1,0),i.lookAt(-1,0,0),n.up.set(0,-1,0),n.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:n}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,c,l,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),m=t.xr.enabled;t.xr.enabled=!1;let v=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let g=!1;t.isWebGLRenderer===!0?g=t.state.buffers.depth.getReversed():g=t.reversedDepthBuffer,t.setRenderTarget(i,0,n),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(i,1,n),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(i,2,n),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(i,3,n),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),t.setRenderTarget(i,4,n),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),i.texture.generateMipmaps=v,t.setRenderTarget(i,5,n),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=m,i.texture.needsPMREMUpdate=!0}},To=class extends We{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},Dr=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=Lm.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Lm(){this._document.hidden===!1&&this.reset()}var jc="\\[\\]\\.:\\/",Dm=new RegExp("["+jc+"]","g"),Zc="[^"+jc+"]",Nm="[^"+jc.replace("\\.","")+"]",Um=/((?:WC+[\/:])*)/.source.replace("WC",Zc),Fm=/(WCOD+)?/.source.replace("WCOD",Nm),Om=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Zc),Bm=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Zc),km=new RegExp("^"+Um+Fm+Om+Bm+"$"),Hm=["material","materials","bones","map"],Pc=class{constructor(t,e,i){let n=i||xe.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,n)}getValue(t,e){this.bind();let i=this._targetGroup.nCachedObjects_,n=this._bindings[i];n!==void 0&&n.getValue(t,e)}setValue(t,e){let i=this._bindings;for(let n=this._targetGroup.nCachedObjects_,r=i.length;n!==r;++n)i[n].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].unbind()}},xe=class s{constructor(t,e,i){this.path=e,this.parsedPath=i||s.parseTrackName(e),this.node=s.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,i){return t&&t.isAnimationObjectGroup?new s.Composite(t,e,i):new s(t,e,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Dm,"")}static parseTrackName(t){let e=km.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},n=i.nodeName&&i.nodeName.lastIndexOf(".");if(n!==void 0&&n!==-1){let r=i.nodeName.substring(n+1);Hm.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,n),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(e);if(i!==void 0)return i}if(t.children){let i=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let c=i(o.children);if(c)return c}return null},n=i(t.children);if(n)return n}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)t[e++]=i[n]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)i[n]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)i[n]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)i[n]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,i=e.objectName,n=e.propertyName,r=e.propertyIndex;if(t||(t=s.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){kt("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let l=e.objectIndex;switch(i){case"materials":if(!t.material){zt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){zt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){zt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===l){l=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){zt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){zt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){zt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(l!==void 0){if(t[l]===void 0){zt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let a=t[n];if(a===void 0){let l=e.nodeName;zt("PropertyBinding: Trying to update property for track: "+l+"."+n+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(n==="morphTargetInfluences"){if(!t.geometry){zt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){zt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=n;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};xe.Composite=Pc;xe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};xe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};xe.prototype.GetterByBindingType=[xe.prototype._getValue_direct,xe.prototype._getValue_array,xe.prototype._getValue_arrayElement,xe.prototype._getValue_toArray];xe.prototype.SetterByBindingTypeAndVersioning=[[xe.prototype._setValue_direct,xe.prototype._setValue_direct_setNeedsUpdate,xe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[xe.prototype._setValue_array,xe.prototype._setValue_array_setNeedsUpdate,xe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[xe.prototype._setValue_arrayElement,xe.prototype._setValue_arrayElement_setNeedsUpdate,xe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[xe.prototype._setValue_fromArray,xe.prototype._setValue_fromArray_setNeedsUpdate,xe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Ey=new Float32Array(1);var nh=class nh{constructor(t,e,i,n){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,i,n)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let i=0;i<4;i++)this.elements[i]=t[i+e];return this}set(t,e,i,n){let r=this.elements;return r[0]=t,r[2]=e,r[1]=i,r[3]=n,this}};nh.prototype.isMatrix2=!0;var Ic=nh;function $c(s,t,e,i){let n=zm(i);switch(e){case Gc:return s*t;case Xc:return s*t/n.components*n.byteLength;case Lo:return s*t/n.components*n.byteLength;case wn:return s*t*2/n.components*n.byteLength;case Do:return s*t*2/n.components*n.byteLength;case Wc:return s*t*3/n.components*n.byteLength;case Si:return s*t*4/n.components*n.byteLength;case No:return s*t*4/n.components*n.byteLength;case Vr:case Gr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Wr:case Xr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Fo:case Bo:return Math.max(s,16)*Math.max(t,8)/4;case Uo:case Oo:return Math.max(s,8)*Math.max(t,8)/2;case ko:case Ho:case Vo:case Go:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case zo:case qr:case Wo:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Xo:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case qo:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case Yo:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case Jo:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case Ko:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case jo:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case Zo:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case $o:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case Qo:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case tl:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case el:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case il:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case nl:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case sl:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case rl:case al:case ol:return Math.ceil(s/4)*Math.ceil(t/4)*16;case ll:case cl:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Yr:case hl:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function zm(s){switch(s){case oi:case kc:return{byteLength:1,components:1};case Ds:case Hc:case Ne:return{byteLength:2,components:1};case Po:case Io:return{byteLength:2,components:4};case Pi:case Co:case Ii:return{byteLength:4,components:1};case zc:case Vc:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?kt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function af(){let s=null,t=!1,e=null,i=null;function n(r,a){i=s.requestAnimationFrame(n),e(r,a)}return{start:function(){t!==!0&&e!==null&&s!==null&&(i=s.requestAnimationFrame(n),t=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){s=r}}}function Gm(s){let t=new WeakMap;function e(o,c){let l=o.array,h=o.usage,d=l.byteLength,u=s.createBuffer();s.bindBuffer(c,u),s.bufferData(c,l,h),o.onUploadCallback();let f;if(l instanceof Float32Array)f=s.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=s.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=s.SHORT;else if(l instanceof Uint32Array)f=s.UNSIGNED_INT;else if(l instanceof Int32Array)f=s.INT;else if(l instanceof Int8Array)f=s.BYTE;else if(l instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,c,l){let h=c.array,d=c.updateRanges;if(s.bindBuffer(l,o),d.length===0)s.bufferSubData(l,0,h);else{d.sort((f,m)=>f.start-m.start);let u=0;for(let f=1;f<d.length;f++){let m=d[u],v=d[f];v.start<=m.start+m.count+1?m.count=Math.max(m.count,v.start+v.count-m.start):(++u,d[u]=v)}d.length=u+1;for(let f=0,m=d.length;f<m;f++){let v=d[f];s.bufferSubData(l,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}c.clearUpdateRanges()}c.onUploadCallback()}function n(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=t.get(o);c&&(s.deleteBuffer(c.buffer),t.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=t.get(o);if(l===void 0)t.set(o,e(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,o,c),l.version=o.version}}return{get:n,remove:r,update:a}}var Wm=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Xm=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,qm=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ym=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Jm=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Km=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,jm=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Zm=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,$m=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Qm=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,t0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,e0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,i0=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,n0=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,s0=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,r0=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,a0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,o0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,l0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,c0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,h0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,u0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,d0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,f0=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,p0=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,m0=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,g0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,x0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,_0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,v0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,y0="gl_FragColor = linearToOutputTexel( gl_FragColor );",M0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,S0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,b0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,T0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,E0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,w0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,A0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,R0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,C0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,P0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,I0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,L0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,D0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,N0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,U0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,F0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,O0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,B0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,k0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,H0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,z0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,V0=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,G0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,W0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,X0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,q0=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Y0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,J0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,K0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,j0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Z0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,$0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Q0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,tg=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,eg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ig=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,ng=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,sg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,rg=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ag=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,og=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,lg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,cg=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,hg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ug=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,dg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,fg=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,pg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,mg=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,gg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,xg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,_g=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,vg=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,yg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Mg=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Sg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,bg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Tg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Eg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,wg=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Ag=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Rg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Cg=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Pg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ig=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Lg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Dg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Ng=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Ug=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Fg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Og=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Bg=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,kg=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Hg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,zg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Vg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Gg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Wg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Xg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Yg=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Jg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Kg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,jg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Zg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,$g=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Qg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,tx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,ex=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ix=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,nx=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sx=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,rx=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ax=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ox=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,lx=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,cx=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hx=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,ux=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,dx=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fx=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,px=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,mx=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gx=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xx=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_x=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,vx=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,yx=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Mx=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Sx=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,bx=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Jt={alphahash_fragment:Wm,alphahash_pars_fragment:Xm,alphamap_fragment:qm,alphamap_pars_fragment:Ym,alphatest_fragment:Jm,alphatest_pars_fragment:Km,aomap_fragment:jm,aomap_pars_fragment:Zm,batching_pars_vertex:$m,batching_vertex:Qm,begin_vertex:t0,beginnormal_vertex:e0,bsdfs:i0,iridescence_fragment:n0,bumpmap_pars_fragment:s0,clipping_planes_fragment:r0,clipping_planes_pars_fragment:a0,clipping_planes_pars_vertex:o0,clipping_planes_vertex:l0,color_fragment:c0,color_pars_fragment:h0,color_pars_vertex:u0,color_vertex:d0,common:f0,cube_uv_reflection_fragment:p0,defaultnormal_vertex:m0,displacementmap_pars_vertex:g0,displacementmap_vertex:x0,emissivemap_fragment:_0,emissivemap_pars_fragment:v0,colorspace_fragment:y0,colorspace_pars_fragment:M0,envmap_fragment:S0,envmap_common_pars_fragment:b0,envmap_pars_fragment:T0,envmap_pars_vertex:E0,envmap_physical_pars_fragment:F0,envmap_vertex:w0,fog_vertex:A0,fog_pars_vertex:R0,fog_fragment:C0,fog_pars_fragment:P0,gradientmap_pars_fragment:I0,lightmap_pars_fragment:L0,lights_lambert_fragment:D0,lights_lambert_pars_fragment:N0,lights_pars_begin:U0,lights_toon_fragment:O0,lights_toon_pars_fragment:B0,lights_phong_fragment:k0,lights_phong_pars_fragment:H0,lights_physical_fragment:z0,lights_physical_pars_fragment:V0,lights_fragment_begin:G0,lights_fragment_maps:W0,lights_fragment_end:X0,lightprobes_pars_fragment:q0,logdepthbuf_fragment:Y0,logdepthbuf_pars_fragment:J0,logdepthbuf_pars_vertex:K0,logdepthbuf_vertex:j0,map_fragment:Z0,map_pars_fragment:$0,map_particle_fragment:Q0,map_particle_pars_fragment:tg,metalnessmap_fragment:eg,metalnessmap_pars_fragment:ig,morphinstance_vertex:ng,morphcolor_vertex:sg,morphnormal_vertex:rg,morphtarget_pars_vertex:ag,morphtarget_vertex:og,normal_fragment_begin:lg,normal_fragment_maps:cg,normal_pars_fragment:hg,normal_pars_vertex:ug,normal_vertex:dg,normalmap_pars_fragment:fg,clearcoat_normal_fragment_begin:pg,clearcoat_normal_fragment_maps:mg,clearcoat_pars_fragment:gg,iridescence_pars_fragment:xg,opaque_fragment:_g,packing:vg,premultiplied_alpha_fragment:yg,project_vertex:Mg,dithering_fragment:Sg,dithering_pars_fragment:bg,roughnessmap_fragment:Tg,roughnessmap_pars_fragment:Eg,shadowmap_pars_fragment:wg,shadowmap_pars_vertex:Ag,shadowmap_vertex:Rg,shadowmask_pars_fragment:Cg,skinbase_vertex:Pg,skinning_pars_vertex:Ig,skinning_vertex:Lg,skinnormal_vertex:Dg,specularmap_fragment:Ng,specularmap_pars_fragment:Ug,tonemapping_fragment:Fg,tonemapping_pars_fragment:Og,transmission_fragment:Bg,transmission_pars_fragment:kg,uv_pars_fragment:Hg,uv_pars_vertex:zg,uv_vertex:Vg,worldpos_vertex:Gg,background_vert:Wg,background_frag:Xg,backgroundCube_vert:qg,backgroundCube_frag:Yg,cube_vert:Jg,cube_frag:Kg,depth_vert:jg,depth_frag:Zg,distance_vert:$g,distance_frag:Qg,equirect_vert:tx,equirect_frag:ex,linedashed_vert:ix,linedashed_frag:nx,meshbasic_vert:sx,meshbasic_frag:rx,meshlambert_vert:ax,meshlambert_frag:ox,meshmatcap_vert:lx,meshmatcap_frag:cx,meshnormal_vert:hx,meshnormal_frag:ux,meshphong_vert:dx,meshphong_frag:fx,meshphysical_vert:px,meshphysical_frag:mx,meshtoon_vert:gx,meshtoon_frag:xx,points_vert:_x,points_frag:vx,shadow_vert:yx,shadow_frag:Mx,sprite_vert:Sx,sprite_frag:bx},_t={common:{diffuse:{value:new Lt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Wt},alphaMap:{value:null},alphaMapTransform:{value:new Wt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Wt}},envmap:{envMap:{value:null},envMapRotation:{value:new Wt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Wt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Wt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Wt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Wt},normalScale:{value:new at(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Wt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Wt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Wt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Wt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Lt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new C},probesMax:{value:new C},probesResolution:{value:new C}},points:{diffuse:{value:new Lt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Wt},alphaTest:{value:0},uvTransform:{value:new Wt}},sprite:{diffuse:{value:new Lt(16777215)},opacity:{value:1},center:{value:new at(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Wt},alphaMap:{value:null},alphaMapTransform:{value:new Wt},alphaTest:{value:0}}},Xi={basic:{uniforms:Qe([_t.common,_t.specularmap,_t.envmap,_t.aomap,_t.lightmap,_t.fog]),vertexShader:Jt.meshbasic_vert,fragmentShader:Jt.meshbasic_frag},lambert:{uniforms:Qe([_t.common,_t.specularmap,_t.envmap,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.fog,_t.lights,{emissive:{value:new Lt(0)},envMapIntensity:{value:1}}]),vertexShader:Jt.meshlambert_vert,fragmentShader:Jt.meshlambert_frag},phong:{uniforms:Qe([_t.common,_t.specularmap,_t.envmap,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.fog,_t.lights,{emissive:{value:new Lt(0)},specular:{value:new Lt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Jt.meshphong_vert,fragmentShader:Jt.meshphong_frag},standard:{uniforms:Qe([_t.common,_t.envmap,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.roughnessmap,_t.metalnessmap,_t.fog,_t.lights,{emissive:{value:new Lt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Jt.meshphysical_vert,fragmentShader:Jt.meshphysical_frag},toon:{uniforms:Qe([_t.common,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.gradientmap,_t.fog,_t.lights,{emissive:{value:new Lt(0)}}]),vertexShader:Jt.meshtoon_vert,fragmentShader:Jt.meshtoon_frag},matcap:{uniforms:Qe([_t.common,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.fog,{matcap:{value:null}}]),vertexShader:Jt.meshmatcap_vert,fragmentShader:Jt.meshmatcap_frag},points:{uniforms:Qe([_t.points,_t.fog]),vertexShader:Jt.points_vert,fragmentShader:Jt.points_frag},dashed:{uniforms:Qe([_t.common,_t.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Jt.linedashed_vert,fragmentShader:Jt.linedashed_frag},depth:{uniforms:Qe([_t.common,_t.displacementmap]),vertexShader:Jt.depth_vert,fragmentShader:Jt.depth_frag},normal:{uniforms:Qe([_t.common,_t.bumpmap,_t.normalmap,_t.displacementmap,{opacity:{value:1}}]),vertexShader:Jt.meshnormal_vert,fragmentShader:Jt.meshnormal_frag},sprite:{uniforms:Qe([_t.sprite,_t.fog]),vertexShader:Jt.sprite_vert,fragmentShader:Jt.sprite_frag},background:{uniforms:{uvTransform:{value:new Wt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Jt.background_vert,fragmentShader:Jt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Wt}},vertexShader:Jt.backgroundCube_vert,fragmentShader:Jt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Jt.cube_vert,fragmentShader:Jt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Jt.equirect_vert,fragmentShader:Jt.equirect_frag},distance:{uniforms:Qe([_t.common,_t.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Jt.distance_vert,fragmentShader:Jt.distance_frag},shadow:{uniforms:Qe([_t.lights,_t.fog,{color:{value:new Lt(0)},opacity:{value:1}}]),vertexShader:Jt.shadow_vert,fragmentShader:Jt.shadow_frag}};Xi.physical={uniforms:Qe([Xi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Wt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Wt},clearcoatNormalScale:{value:new at(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Wt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Wt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Wt},sheen:{value:0},sheenColor:{value:new Lt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Wt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Wt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Wt},transmissionSamplerSize:{value:new at},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Wt},attenuationDistance:{value:0},attenuationColor:{value:new Lt(0)},specularColor:{value:new Lt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Wt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Wt},anisotropyVector:{value:new at},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Wt}}]),vertexShader:Jt.meshphysical_vert,fragmentShader:Jt.meshphysical_frag};var pl={r:0,b:0,g:0},Tx=new ye,of=new Wt;of.set(-1,0,0,0,1,0,0,0,1);function Ex(s,t,e,i,n,r){let a=new Lt(0),o=n===!0?0:1,c,l,h=null,d=0,u=null;function f(b){let M=b.isScene===!0?b.background:null;if(M&&M.isTexture){let x=b.backgroundBlurriness>0;M=t.get(M,x)}return M}function m(b){let M=!1,x=f(b);x===null?g(a,o):x&&x.isColor&&(g(x,1),M=!0);let T=s.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(s.autoClear||M)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function v(b,M){let x=f(M);x&&(x.isCubeTexture||x.mapping===Hr)?(l===void 0&&(l=new ht(new we(1,1,1),new Pe({name:"BackgroundCubeMaterial",uniforms:Kn(Xi.backgroundCube.uniforms),vertexShader:Xi.backgroundCube.vertexShader,fragmentShader:Xi.backgroundCube.fragmentShader,side:Ye,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(T,E,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(l)),l.material.uniforms.envMap.value=x,l.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Tx.makeRotationFromEuler(M.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(of),l.material.toneMapped=jt.getTransfer(x.colorSpace)!==re,(h!==x||d!==x.version||u!==s.toneMapping)&&(l.material.needsUpdate=!0,h=x,d=x.version,u=s.toneMapping),l.layers.enableAll(),b.unshift(l,l.geometry,l.material,0,0,null)):x&&x.isTexture&&(c===void 0&&(c=new ht(new qe(2,2),new Pe({name:"BackgroundMaterial",uniforms:Kn(Xi.background.uniforms),vertexShader:Xi.background.vertexShader,fragmentShader:Xi.background.fragmentShader,side:bn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=x,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.toneMapped=jt.getTransfer(x.colorSpace)!==re,x.matrixAutoUpdate===!0&&x.updateMatrix(),c.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||d!==x.version||u!==s.toneMapping)&&(c.material.needsUpdate=!0,h=x,d=x.version,u=s.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function g(b,M){b.getRGB(pl,Kc(s)),e.buffers.color.setClear(pl.r,pl.g,pl.b,M,r)}function p(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(b,M=1){a.set(b),o=M,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(b){o=b,g(a,o)},render:m,addToRenderList:v,dispose:p}}function wx(s,t){let e=s.getParameter(s.MAX_VERTEX_ATTRIBS),i={},n=u(null),r=n,a=!1;function o(N,O,V,D,B){let X=!1,W=d(N,D,V,O);r!==W&&(r=W,l(r.object)),X=f(N,D,V,B),X&&m(N,D,V,B),B!==null&&t.update(B,s.ELEMENT_ARRAY_BUFFER),(X||a)&&(a=!1,x(N,O,V,D),B!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(B).buffer))}function c(){return s.createVertexArray()}function l(N){return s.bindVertexArray(N)}function h(N){return s.deleteVertexArray(N)}function d(N,O,V,D){let B=D.wireframe===!0,X=i[O.id];X===void 0&&(X={},i[O.id]=X);let W=N.isInstancedMesh===!0?N.id:0,st=X[W];st===void 0&&(st={},X[W]=st);let q=st[V.id];q===void 0&&(q={},st[V.id]=q);let Q=q[B];return Q===void 0&&(Q=u(c()),q[B]=Q),Q}function u(N){let O=[],V=[],D=[];for(let B=0;B<e;B++)O[B]=0,V[B]=0,D[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:O,enabledAttributes:V,attributeDivisors:D,object:N,attributes:{},index:null}}function f(N,O,V,D){let B=r.attributes,X=O.attributes,W=0,st=V.getAttributes();for(let q in st)if(st[q].location>=0){let it=B[q],It=X[q];if(It===void 0&&(q==="instanceMatrix"&&N.instanceMatrix&&(It=N.instanceMatrix),q==="instanceColor"&&N.instanceColor&&(It=N.instanceColor)),it===void 0||it.attribute!==It||It&&it.data!==It.data)return!0;W++}return r.attributesNum!==W||r.index!==D}function m(N,O,V,D){let B={},X=O.attributes,W=0,st=V.getAttributes();for(let q in st)if(st[q].location>=0){let it=X[q];it===void 0&&(q==="instanceMatrix"&&N.instanceMatrix&&(it=N.instanceMatrix),q==="instanceColor"&&N.instanceColor&&(it=N.instanceColor));let It={};It.attribute=it,it&&it.data&&(It.data=it.data),B[q]=It,W++}r.attributes=B,r.attributesNum=W,r.index=D}function v(){let N=r.newAttributes;for(let O=0,V=N.length;O<V;O++)N[O]=0}function g(N){p(N,0)}function p(N,O){let V=r.newAttributes,D=r.enabledAttributes,B=r.attributeDivisors;V[N]=1,D[N]===0&&(s.enableVertexAttribArray(N),D[N]=1),B[N]!==O&&(s.vertexAttribDivisor(N,O),B[N]=O)}function b(){let N=r.newAttributes,O=r.enabledAttributes;for(let V=0,D=O.length;V<D;V++)O[V]!==N[V]&&(s.disableVertexAttribArray(V),O[V]=0)}function M(N,O,V,D,B,X,W){W===!0?s.vertexAttribIPointer(N,O,V,B,X):s.vertexAttribPointer(N,O,V,D,B,X)}function x(N,O,V,D){v();let B=D.attributes,X=V.getAttributes(),W=O.defaultAttributeValues;for(let st in X){let q=X[st];if(q.location>=0){let Q=B[st];if(Q===void 0&&(st==="instanceMatrix"&&N.instanceMatrix&&(Q=N.instanceMatrix),st==="instanceColor"&&N.instanceColor&&(Q=N.instanceColor)),Q!==void 0){let it=Q.normalized,It=Q.itemSize,wt=t.get(Q);if(wt===void 0)continue;let ae=wt.buffer,Zt=wt.type,ne=wt.bytesPerElement,j=Zt===s.INT||Zt===s.UNSIGNED_INT||Q.gpuType===Co;if(Q.isInterleavedBufferAttribute){let tt=Q.data,vt=tt.stride,Ht=Q.offset;if(tt.isInstancedInterleavedBuffer){for(let bt=0;bt<q.locationSize;bt++)p(q.location+bt,tt.meshPerAttribute);N.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=tt.meshPerAttribute*tt.count)}else for(let bt=0;bt<q.locationSize;bt++)g(q.location+bt);s.bindBuffer(s.ARRAY_BUFFER,ae);for(let bt=0;bt<q.locationSize;bt++)M(q.location+bt,It/q.locationSize,Zt,it,vt*ne,(Ht+It/q.locationSize*bt)*ne,j)}else{if(Q.isInstancedBufferAttribute){for(let tt=0;tt<q.locationSize;tt++)p(q.location+tt,Q.meshPerAttribute);N.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let tt=0;tt<q.locationSize;tt++)g(q.location+tt);s.bindBuffer(s.ARRAY_BUFFER,ae);for(let tt=0;tt<q.locationSize;tt++)M(q.location+tt,It/q.locationSize,Zt,it,It*ne,It/q.locationSize*tt*ne,j)}}else if(W!==void 0){let it=W[st];if(it!==void 0)switch(it.length){case 2:s.vertexAttrib2fv(q.location,it);break;case 3:s.vertexAttrib3fv(q.location,it);break;case 4:s.vertexAttrib4fv(q.location,it);break;default:s.vertexAttrib1fv(q.location,it)}}}}b()}function T(){A();for(let N in i){let O=i[N];for(let V in O){let D=O[V];for(let B in D){let X=D[B];for(let W in X)h(X[W].object),delete X[W];delete D[B]}}delete i[N]}}function E(N){if(i[N.id]===void 0)return;let O=i[N.id];for(let V in O){let D=O[V];for(let B in D){let X=D[B];for(let W in X)h(X[W].object),delete X[W];delete D[B]}}delete i[N.id]}function R(N){for(let O in i){let V=i[O];for(let D in V){let B=V[D];if(B[N.id]===void 0)continue;let X=B[N.id];for(let W in X)h(X[W].object),delete X[W];delete B[N.id]}}}function y(N){for(let O in i){let V=i[O],D=N.isInstancedMesh===!0?N.id:0,B=V[D];if(B!==void 0){for(let X in B){let W=B[X];for(let st in W)h(W[st].object),delete W[st];delete B[X]}delete V[D],Object.keys(V).length===0&&delete i[O]}}}function A(){P(),a=!0,r!==n&&(r=n,l(r.object))}function P(){n.geometry=null,n.program=null,n.wireframe=!1}return{setup:o,reset:A,resetDefaultState:P,dispose:T,releaseStatesOfGeometry:E,releaseStatesOfObject:y,releaseStatesOfProgram:R,initAttributes:v,enableAttribute:g,disableUnusedAttributes:b}}function Ax(s,t,e){let i;function n(c){i=c}function r(c,l){s.drawArrays(i,c,l),e.update(l,i,1)}function a(c,l,h){h!==0&&(s.drawArraysInstanced(i,c,l,h),e.update(l,i,h))}function o(c,l,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,l,0,h);let u=0;for(let f=0;f<h;f++)u+=l[f];e.update(u,i,1)}this.setMode=n,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function Rx(s,t,e,i){let n;function r(){if(n!==void 0)return n;if(t.has("EXT_texture_filter_anisotropic")===!0){let R=t.get("EXT_texture_filter_anisotropic");n=s.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function a(R){return!(R!==Si&&i.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(R){let y=R===Ne&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(R!==oi&&R!==Ii&&!y&&i.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE))}function c(R){if(R==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp",h=c(l);h!==l&&(kt("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let d=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&kt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),m=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),b=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),M=s.getParameter(s.MAX_VARYING_VECTORS),x=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),T=s.getParameter(s.MAX_SAMPLES),E=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:m,maxTextureSize:v,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:b,maxVaryings:M,maxFragmentUniforms:x,maxSamples:T,samples:E}}function Cx(s){let t=this,e=null,i=0,n=!1,r=!1,a=new Ai,o=new Wt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||i!==0||n;return n=u,i=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){let m=d.clippingPlanes,v=d.clipIntersection,g=d.clipShadows,p=s.get(d);if(!n||m===null||m.length===0||r&&!g)r?h(null):l();else{let b=r?0:i,M=b*4,x=p.clippingState||null;c.value=x,x=h(m,u,M,f);for(let T=0;T!==M;++T)x[T]=e[T];p.clippingState=x,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=b}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(d,u,f,m){let v=d!==null?d.length:0,g=null;if(v!==0){if(g=c.value,m!==!0||g===null){let p=f+v*4,b=u.matrixWorldInverse;o.getNormalMatrix(b),(g===null||g.length<p)&&(g=new Float32Array(p));for(let M=0,x=f;M!==v;++M,x+=4)a.copy(d[M]).applyMatrix4(b,o),a.normal.toArray(g,x),g[x+3]=a.constant}c.value=g,c.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,g}}var Os=4,Px=6,Ix=20,Lx=256,Jr=new Sn,Bd=new Lt,sh=null,rh=0,ah=0,oh=!1,Dx=new C,jn=new C,ks=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,i=.1,n=100,r={}){let{size:a=256,position:o=Dx}=r;sh=this._renderer.getRenderTarget(),rh=this._renderer.getActiveCubeFace(),ah=this._renderer.getActiveMipmapLevel(),oh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(t,i,n,c,o),e>0&&this._blur(c,0,0,e),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=zd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Hd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(sh,rh,ah),this._renderer.xr.enabled=oh,t.scissorTest=!1,Fs(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Tn||t.mapping===Jn?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),sh=this._renderer.getRenderTarget(),rh=this._renderer.getActiveCubeFace(),ah=this._renderer.getActiveMipmapLevel(),oh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:Xe,minFilter:Xe,generateMipmaps:!1,type:Ne,format:Si,colorSpace:or,depthBuffer:!1},n=kd(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=kd(t,e,i);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Nx(r)),this._blurMaterial=Fx(r,t,e),this._ggxMaterial=Ux(r,t,e)}return n}_compileMaterial(t){let e=new ht(new De,t);this._renderer.compile(e,Jr)}_sceneToCubeUV(t,e,i,n,r){let c=new We(90,1,e,i),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Bd),d.toneMapping=Ci,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(n),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new ht(new we,new Ee({name:"PMREM.Background",side:Ye,depthWrite:!1,depthTest:!1})));let v=this._backgroundBox,g=v.material,p=!1,b=t.background;b?b.isColor&&(g.color.copy(b),t.background=null,p=!0):(g.color.copy(Bd),p=!0);for(let M=0;M<6;M++){let x=M%3;x===0?(c.up.set(0,l[M],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[M],r.y,r.z)):x===1?(c.up.set(0,0,l[M]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[M],r.z)):(c.up.set(0,l[M],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[M]));let T=this._cubeSize;Fs(n,x*T,M>2?T:0,T,T),d.setRenderTarget(n),p&&d.render(v,c),d.render(t,c)}d.toneMapping=f,d.autoClear=u,t.background=b}_textureToCubeUV(t,e){let i=this._renderer,n=t.mapping===Tn||t.mapping===Jn;n?(this._cubemapMaterial===null&&(this._cubemapMaterial=zd()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Hd());let r=n?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=t;let c=this._cubeSize;Fs(e,0,0,3*c,2*c),i.setRenderTarget(e),i.render(a,Jr)}_applyPMREM(t){let e=this._renderer,i=e.autoClear;e.autoClear=!1;let n=this._lodMeshes.length;for(let r=1;r<n;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=i}_applyGGXFilter(t,e,i){let n=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[i];o.material=a;let c=a.uniforms,l=i/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),d=Math.sqrt(l*l-h*h),u=l*1.25,f=d*u,{_lodMax:m}=this,v=this._sizeLods[i],g=3*v*(i>m-Os?i-m+Os:0),p=4*(this._cubeSize-v);c.envMap.value=t.texture,c.roughness.value=f,c.mipInt.value=m-e,Fs(r,g,p,3*v,2*v),n.setRenderTarget(r),n.render(o,Jr),c.envMap.value=r.texture,c.roughness.value=0,c.mipInt.value=m-i,Fs(t,g,p,3*v,2*v),n.setRenderTarget(t),n.render(o,Jr)}_blur(t,e,i,n){let r=this._pingPongRenderTarget,a=Math.min(n,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,i,a),this._blurPass(r,t,i,i,a)}_blurPass(t,e,i,n,r){let a=this._renderer,o=this._blurMaterial,c=this._lodMeshes[n];c.material=o;let l=o.uniforms;l.envMap.value=t.texture,l.sigma.value=r,l.mipInt.value=this._lodMax-i;let h=this._sizeLods[n],d=3*h*(n>this._lodMax-Os?n-this._lodMax+Os:0),u=4*(this._cubeSize-h);Fs(e,d,u,3*h,2*h),a.setRenderTarget(e),a.render(c,Jr)}};function Nx(s){let t=[],e=[],i=s,n=s-Os+1+Px;for(let r=0;r<n;r++){let a=Math.pow(2,i);t.push(a);let o=1/(a-2),c=-o,l=1+o,h=[c,c,l,c,l,l,c,c,l,l,c,l],d=6,u=6,f=3,m=new Float32Array(f*u*d),v=new Float32Array(f*u*d);for(let p=0;p<d;p++){let b=p%3*2/3-1,M=p>2?0:-1,x=[b,M,0,b+2/3,M,0,b+2/3,M+1,0,b,M,0,b+2/3,M+1,0,b,M+1,0];m.set(x,f*u*p);for(let T=0;T<u;T++){let E=h[T*2]*2-1,R=h[T*2+1]*2-1;p===0?jn.set(1,R,E):p===1?jn.set(-E,1,-R):p===2?jn.set(-E,R,1):p===3?jn.set(-1,R,-E):p===4?jn.set(-E,-1,R):jn.set(E,R,-1),jn.toArray(v,(p*u+T)*f)}}let g=new De;g.setAttribute("position",new yi(m,f)),g.setAttribute("outputDirection",new yi(v,f)),e.push(new ht(g,null)),i>Os&&i--}return{lodMeshes:e,sizeLods:t}}function kd(s,t,e){let i=new Te(s,t,e);return i.texture.mapping=Hr,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Fs(s,t,e,i,n){s.viewport.set(t,e,i,n),s.scissor.set(t,e,i,n)}function Ux(s,t,e){return new Pe({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Lx,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:xl(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Mi,depthTest:!1,depthWrite:!1})}function Fx(s,t,e){return new Pe({name:"SphericalGaussianBlur",defines:{SAMPLES:Ix,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:xl(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:Mi,depthTest:!1,depthWrite:!1})}function Hd(){return new Pe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:xl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Mi,depthTest:!1,depthWrite:!1})}function zd(){return new Pe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:xl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Mi,depthTest:!1,depthWrite:!1})}function xl(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Hs=class extends Te{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},n=[i,i,i,i,i,i];this.texture=new pr(n),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},n=new we(5,5,5),r=new Pe({name:"CubemapFromEquirect",uniforms:Kn(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Ye,blending:Mi});r.uniforms.tEquirect.value=e;let a=new ht(n,r),o=e.minFilter;return e.minFilter===Gi&&(e.minFilter=Xe),new Ps(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,i=!0,n=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,i,n);t.setRenderTarget(r)}};function Ox(s){let t=new WeakMap,e=new WeakMap,i=null;function n(u,f=!1){return u==null?null:f?a(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===wo||f===Ao)if(t.has(u)){let m=t.get(u).texture;return o(m,u.mapping)}else{let m=u.image;if(m&&m.height>0){let v=new Hs(m.height);return v.fromEquirectangularTexture(s,u),t.set(u,v),u.addEventListener("dispose",l),o(v.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let f=u.mapping,m=f===wo||f===Ao,v=f===Tn||f===Jn;if(m||v){let g=e.get(u),p=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return i===null&&(i=new ks(s)),g=m?i.fromEquirectangular(u,g):i.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),g.texture;if(g!==void 0)return g.texture;{let b=u.image;return m&&b&&b.height>0||v&&b&&c(b)?(i===null&&(i=new ks(s)),g=m?i.fromEquirectangular(u):i.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function o(u,f){return f===wo?u.mapping=Tn:f===Ao&&(u.mapping=Jn),u}function c(u){let f=0,m=6;for(let v=0;v<m;v++)u[v]!==void 0&&f++;return f===m}function l(u){let f=u.target;f.removeEventListener("dispose",l);let m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function d(){t=new WeakMap,e=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:n,dispose:d}}function Bx(s){let t={};function e(i){if(t[i]!==void 0)return t[i];let n=s.getExtension(i);return t[i]=n,n}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){let n=e(i);return n===null&&zn("WebGLRenderer: "+i+" extension not supported."),n}}}function kx(s,t,e,i){let n={},r=new WeakMap;function a(d){let u=d.target;u.index!==null&&t.remove(u.index);for(let m in u.attributes)t.remove(u.attributes[m]);u.removeEventListener("dispose",a),delete n[u.id];let f=r.get(u);f&&(t.remove(f),r.delete(u)),i.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(d,u){return n[u.id]===!0||(u.addEventListener("dispose",a),n[u.id]=!0,e.memory.geometries++),u}function c(d){let u=d.attributes;for(let f in u)t.update(u[f],s.ARRAY_BUFFER)}function l(d){let u=[],f=d.index,m=d.attributes.position,v=0;if(m===void 0)return;if(f!==null){let b=f.array;v=f.version;for(let M=0,x=b.length;M<x;M+=3){let T=b[M+0],E=b[M+1],R=b[M+2];u.push(T,E,E,R,R,T)}}else{let b=m.array;v=m.version;for(let M=0,x=b.length/3-1;M<x;M+=3){let T=M+0,E=M+1,R=M+2;u.push(T,E,E,R,R,T)}}let g=new(m.count>=65535?fr:dr)(u,1);g.version=v;let p=r.get(d);p&&t.remove(p),r.set(d,g)}function h(d){let u=r.get(d);if(u){let f=d.index;f!==null&&u.version<f.version&&l(d)}else l(d);return r.get(d)}return{get:o,update:c,getWireframeAttribute:h}}function Hx(s,t,e){let i;function n(d){i=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function c(d,u){s.drawElements(i,u,r,d*a),e.update(u,i,1)}function l(d,u,f){f!==0&&(s.drawElementsInstanced(i,u,r,d*a,f),e.update(u,i,f))}function h(d,u,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,u,0,r,d,0,f);let v=0;for(let g=0;g<f;g++)v+=u[g];e.update(v,i,1)}this.setMode=n,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function zx(s){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,a,o){switch(e.calls++,a){case s.TRIANGLES:e.triangles+=o*(r/3);break;case s.LINES:e.lines+=o*(r/2);break;case s.LINE_STRIP:e.lines+=o*(r-1);break;case s.LINE_LOOP:e.lines+=o*r;break;case s.POINTS:e.points+=o*r;break;default:zt("WebGLInfo: Unknown draw mode:",a);break}}function n(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:n,update:i}}function Vx(s,t,e){let i=new WeakMap,n=new Me;function r(a,o,c){let l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0,u=i.get(o);if(u===void 0||u.count!==d){let A=function(){R.dispose(),i.delete(o),o.removeEventListener("dispose",A)};u!==void 0&&u.texture.dispose();let f=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],b=o.morphAttributes.color||[],M=0;f===!0&&(M=1),m===!0&&(M=2),v===!0&&(M=3);let x=o.attributes.position.count*M,T=1;x>t.maxTextureSize&&(T=Math.ceil(x/t.maxTextureSize),x=t.maxTextureSize);let E=new Float32Array(x*T*4*d),R=new hr(E,x,T,d);R.type=Ii,R.needsUpdate=!0;let y=M*4;for(let P=0;P<d;P++){let N=g[P],O=p[P],V=b[P],D=x*T*4*P;for(let B=0;B<N.count;B++){let X=B*y;f===!0&&(n.fromBufferAttribute(N,B),E[D+X+0]=n.x,E[D+X+1]=n.y,E[D+X+2]=n.z,E[D+X+3]=0),m===!0&&(n.fromBufferAttribute(O,B),E[D+X+4]=n.x,E[D+X+5]=n.y,E[D+X+6]=n.z,E[D+X+7]=0),v===!0&&(n.fromBufferAttribute(V,B),E[D+X+8]=n.x,E[D+X+9]=n.y,E[D+X+10]=n.z,E[D+X+11]=V.itemSize===4?n.w:1)}}u={count:d,texture:R,size:new at(x,T)},i.set(o,u),o.addEventListener("dispose",A)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",a.morphTexture,e);else{let f=0;for(let v=0;v<l.length;v++)f+=l[v];let m=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(s,"morphTargetBaseInfluence",m),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),c.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:r}}function Gx(s,t,e,i,n){let r=new WeakMap;function a(l){let h=n.render.frame,d=l.geometry,u=t.get(l,d);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),r.get(l)!==h&&(e.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,s.ARRAY_BUFFER),r.set(l,h))),l.isSkinnedMesh){let f=l.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function o(){r=new WeakMap}function c(l){let h=l.target;h.removeEventListener("dispose",c),i.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}var Wx={[Nr]:"LINEAR_TONE_MAPPING",[Ur]:"REINHARD_TONE_MAPPING",[Fr]:"CINEON_TONE_MAPPING",[Yn]:"ACES_FILMIC_TONE_MAPPING",[Br]:"AGX_TONE_MAPPING",[kr]:"NEUTRAL_TONE_MAPPING",[Or]:"CUSTOM_TONE_MAPPING"};function Xx(s,t,e,i,n,r){let a=new Te(t,e,{type:s,depthBuffer:n,stencilBuffer:r,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,c=null,l=new De;l.setAttribute("position",new ie([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new ie([0,2,0,0,2,0],2));let h=new Rs({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new ht(l,h),u=new Sn(-1,1,1,-1,0,1),f=null,m=null,v=!1,g,p=null,b=[],M=!1;this.setSize=function(x,T){a.setSize(x,T),o!==null&&o.setSize(x,T),c!==null&&c.setSize(x,T);for(let E=0;E<b.length;E++){let R=b[E];R.setSize&&R.setSize(x,T)}},this.setEffects=function(x){b=x,M=b.length>0&&b[0].isRenderPass===!0;let T=a.width,E=a.height;b.length>0&&o===null&&(o=new Te(T,E,{type:Ne,depthBuffer:!1,stencilBuffer:!1}),c=new Te(T,E,{type:Ne,depthBuffer:!1,stencilBuffer:!1}));for(let R=0;R<b.length;R++){let y=b[R];y.setSize&&y.setSize(T,E)}},this.begin=function(x,T){if(v||x.toneMapping===Ci&&b.length===0)return!1;if(p=T,T!==null){let E=T.width,R=T.height;(a.width!==E||a.height!==R)&&this.setSize(E,R)}return M===!1&&x.setRenderTarget(a),g=x.toneMapping,x.toneMapping=Ci,!0},this.hasRenderPass=function(){return M},this.end=function(x,T){x.toneMapping=g,v=!0;let E=a,R=o;for(let y=0;y<b.length;y++){let A=b[y];A.enabled!==!1&&(A.render(x,R,E,T),A.needsSwap!==!1&&(E=R,R=R===o?c:o))}if(f!==x.outputColorSpace||m!==x.toneMapping){f=x.outputColorSpace,m=x.toneMapping,h.defines={},jt.getTransfer(f)===re&&(h.defines.SRGB_TRANSFER="");let y=Wx[m];y&&(h.defines[y]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=E.texture,x.setRenderTarget(p),x.render(d,u),p=null,v=!1},this.isCompositing=function(){return v},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),c!==null&&c.dispose(),l.dispose(),h.dispose()}}var lf=new si,hh=new xn(1,1),cf=new hr,hf=new io,uf=new pr,Vd=[],Gd=[],Wd=new Float32Array(16),Xd=new Float32Array(9),qd=new Float32Array(4);function zs(s,t,e){let i=s[0];if(i<=0||i>0)return s;let n=t*e,r=Vd[n];if(r===void 0&&(r=new Float32Array(n),Vd[n]=r),t!==0){i.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,s[a].toArray(r,o)}return r}function Fe(s,t){if(s.length!==t.length)return!1;for(let e=0,i=s.length;e<i;e++)if(s[e]!==t[e])return!1;return!0}function Oe(s,t){for(let e=0,i=t.length;e<i;e++)s[e]=t[e]}function _l(s,t){let e=Gd[t];e===void 0&&(e=new Int32Array(t),Gd[t]=e);for(let i=0;i!==t;++i)e[i]=s.allocateTextureUnit();return e}function qx(s,t){let e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function Yx(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Fe(e,t))return;s.uniform2fv(this.addr,t),Oe(e,t)}}function Jx(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Fe(e,t))return;s.uniform3fv(this.addr,t),Oe(e,t)}}function Kx(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Fe(e,t))return;s.uniform4fv(this.addr,t),Oe(e,t)}}function jx(s,t){let e=this.cache,i=t.elements;if(i===void 0){if(Fe(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),Oe(e,t)}else{if(Fe(e,i))return;qd.set(i),s.uniformMatrix2fv(this.addr,!1,qd),Oe(e,i)}}function Zx(s,t){let e=this.cache,i=t.elements;if(i===void 0){if(Fe(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),Oe(e,t)}else{if(Fe(e,i))return;Xd.set(i),s.uniformMatrix3fv(this.addr,!1,Xd),Oe(e,i)}}function $x(s,t){let e=this.cache,i=t.elements;if(i===void 0){if(Fe(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),Oe(e,t)}else{if(Fe(e,i))return;Wd.set(i),s.uniformMatrix4fv(this.addr,!1,Wd),Oe(e,i)}}function Qx(s,t){let e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function t_(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Fe(e,t))return;s.uniform2iv(this.addr,t),Oe(e,t)}}function e_(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Fe(e,t))return;s.uniform3iv(this.addr,t),Oe(e,t)}}function i_(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Fe(e,t))return;s.uniform4iv(this.addr,t),Oe(e,t)}}function n_(s,t){let e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function s_(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Fe(e,t))return;s.uniform2uiv(this.addr,t),Oe(e,t)}}function r_(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Fe(e,t))return;s.uniform3uiv(this.addr,t),Oe(e,t)}}function a_(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Fe(e,t))return;s.uniform4uiv(this.addr,t),Oe(e,t)}}function o_(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n);let r;this.type===s.SAMPLER_2D_SHADOW?(hh.compareFunction=e.isReversedDepthBuffer()?fl:dl,r=hh):r=lf,e.setTexture2D(t||r,n)}function l_(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),e.setTexture3D(t||hf,n)}function c_(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),e.setTextureCube(t||uf,n)}function h_(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),e.setTexture2DArray(t||cf,n)}function u_(s){switch(s){case 5126:return qx;case 35664:return Yx;case 35665:return Jx;case 35666:return Kx;case 35674:return jx;case 35675:return Zx;case 35676:return $x;case 5124:case 35670:return Qx;case 35667:case 35671:return t_;case 35668:case 35672:return e_;case 35669:case 35673:return i_;case 5125:return n_;case 36294:return s_;case 36295:return r_;case 36296:return a_;case 35678:case 36198:case 36298:case 36306:case 35682:return o_;case 35679:case 36299:case 36307:return l_;case 35680:case 36300:case 36308:case 36293:return c_;case 36289:case 36303:case 36311:case 36292:return h_}}function d_(s,t){s.uniform1fv(this.addr,t)}function f_(s,t){let e=zs(t,this.size,2);s.uniform2fv(this.addr,e)}function p_(s,t){let e=zs(t,this.size,3);s.uniform3fv(this.addr,e)}function m_(s,t){let e=zs(t,this.size,4);s.uniform4fv(this.addr,e)}function g_(s,t){let e=zs(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function x_(s,t){let e=zs(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function __(s,t){let e=zs(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function v_(s,t){s.uniform1iv(this.addr,t)}function y_(s,t){s.uniform2iv(this.addr,t)}function M_(s,t){s.uniform3iv(this.addr,t)}function S_(s,t){s.uniform4iv(this.addr,t)}function b_(s,t){s.uniform1uiv(this.addr,t)}function T_(s,t){s.uniform2uiv(this.addr,t)}function E_(s,t){s.uniform3uiv(this.addr,t)}function w_(s,t){s.uniform4uiv(this.addr,t)}function A_(s,t,e){let i=this.cache,n=t.length,r=_l(e,n);Fe(i,r)||(s.uniform1iv(this.addr,r),Oe(i,r));let a;this.type===s.SAMPLER_2D_SHADOW?a=hh:a=lf;for(let o=0;o!==n;++o)e.setTexture2D(t[o]||a,r[o])}function R_(s,t,e){let i=this.cache,n=t.length,r=_l(e,n);Fe(i,r)||(s.uniform1iv(this.addr,r),Oe(i,r));for(let a=0;a!==n;++a)e.setTexture3D(t[a]||hf,r[a])}function C_(s,t,e){let i=this.cache,n=t.length,r=_l(e,n);Fe(i,r)||(s.uniform1iv(this.addr,r),Oe(i,r));for(let a=0;a!==n;++a)e.setTextureCube(t[a]||uf,r[a])}function P_(s,t,e){let i=this.cache,n=t.length,r=_l(e,n);Fe(i,r)||(s.uniform1iv(this.addr,r),Oe(i,r));for(let a=0;a!==n;++a)e.setTexture2DArray(t[a]||cf,r[a])}function I_(s){switch(s){case 5126:return d_;case 35664:return f_;case 35665:return p_;case 35666:return m_;case 35674:return g_;case 35675:return x_;case 35676:return __;case 5124:case 35670:return v_;case 35667:case 35671:return y_;case 35668:case 35672:return M_;case 35669:case 35673:return S_;case 5125:return b_;case 36294:return T_;case 36295:return E_;case 36296:return w_;case 35678:case 36198:case 36298:case 36306:case 35682:return A_;case 35679:case 36299:case 36307:return R_;case 35680:case 36300:case 36308:case 36293:return C_;case 36289:case 36303:case 36311:case 36292:return P_}}var uh=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=u_(e.type)}},dh=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=I_(e.type)}},fh=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){let n=this.seq;for(let r=0,a=n.length;r!==a;++r){let o=n[r];o.setValue(t,e[o.id],i)}}},lh=/(\w+)(\])?(\[|\.)?/g;function Yd(s,t){s.seq.push(t),s.map[t.id]=t}function L_(s,t,e){let i=s.name,n=i.length;for(lh.lastIndex=0;;){let r=lh.exec(i),a=lh.lastIndex,o=r[1],c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===n){Yd(e,l===void 0?new uh(o,s,t):new dh(o,s,t));break}else{let d=e.map[o];d===void 0&&(d=new fh(o),Yd(e,d)),e=d}}}var Bs=class{constructor(t,e){this.seq=[],this.map={};let i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){let o=t.getActiveUniform(e,a),c=t.getUniformLocation(e,o.name);L_(o,c,this)}let n=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?n.push(a):r.push(a);n.length>0&&(this.seq=n.concat(r))}setValue(t,e,i,n){let r=this.map[e];r!==void 0&&r.setValue(t,i,n)}setOptional(t,e,i){let n=e[i];n!==void 0&&this.setValue(t,i,n)}static upload(t,e,i,n){for(let r=0,a=e.length;r!==a;++r){let o=e[r],c=i[o.id];c.needsUpdate!==!1&&o.setValue(t,c.value,n)}}static seqWithValue(t,e){let i=[];for(let n=0,r=t.length;n!==r;++n){let a=t[n];a.id in e&&i.push(a)}return i}};function Jd(s,t,e){let i=s.createShader(t);return s.shaderSource(i,e),s.compileShader(i),i}var D_=37297,N_=0;function U_(s,t){let e=s.split(`
`),i=[],n=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=n;a<r;a++){let o=a+1;i.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return i.join(`
`)}var Kd=new Wt;function F_(s){jt._getMatrix(Kd,jt.workingColorSpace,s);let t=`mat3( ${Kd.elements.map(e=>e.toFixed(4))} )`;switch(jt.getTransfer(s)){case lr:return[t,"LinearTransferOETF"];case re:return[t,"sRGBTransferOETF"];default:return kt("WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function jd(s,t,e){let i=s.getShaderParameter(t,s.COMPILE_STATUS),r=(s.getShaderInfoLog(t)||"").trim();if(i&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+U_(s.getShaderSource(t),o)}else return r}function O_(s,t){let e=F_(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var B_={[Nr]:"Linear",[Ur]:"Reinhard",[Fr]:"Cineon",[Yn]:"ACESFilmic",[Br]:"AgX",[kr]:"Neutral",[Or]:"Custom"};function k_(s,t){let e=B_[t];return e===void 0?(kt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var ml=new C;function H_(){jt.getLuminanceCoefficients(ml);let s=ml.x.toFixed(4),t=ml.y.toFixed(4),e=ml.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function z_(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(jr).join(`
`)}function V_(s){let t=[];for(let e in s){let i=s[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function G_(s,t){let e={},i=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let n=0;n<i;n++){let r=s.getActiveAttrib(t,n),a=r.name,o=1;r.type===s.FLOAT_MAT2&&(o=2),r.type===s.FLOAT_MAT3&&(o=3),r.type===s.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:s.getAttribLocation(t,a),locationSize:o}}return e}function jr(s){return s!==""}function Zd(s,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function $d(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var W_=/^[ \t]*#include +<([\w\d./]+)>/gm;function ph(s){return s.replace(W_,q_)}var X_=new Map;function q_(s,t){let e=Jt[t];if(e===void 0){let i=X_.get(t);if(i!==void 0)e=Jt[i],kt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return ph(e)}var Y_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Qd(s){return s.replace(Y_,J_)}function J_(s,t,e,i){let n="";for(let r=parseInt(t);r<parseInt(e);r++)n+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return n}function tf(s){let t=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?t+=`
#define HIGH_PRECISION`:s.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var K_={[Xn]:"SHADOWMAP_TYPE_PCF",[Is]:"SHADOWMAP_TYPE_VSM"};function j_(s){return K_[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Z_={[Tn]:"ENVMAP_TYPE_CUBE",[Jn]:"ENVMAP_TYPE_CUBE",[Hr]:"ENVMAP_TYPE_CUBE_UV"};function $_(s){return s.envMap===!1?"ENVMAP_TYPE_CUBE":Z_[s.envMapMode]||"ENVMAP_TYPE_CUBE"}var Q_={[Jn]:"ENVMAP_MODE_REFRACTION"};function tv(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":Q_[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}var ev={[Oc]:"ENVMAP_BLENDING_MULTIPLY",[pd]:"ENVMAP_BLENDING_MIX",[md]:"ENVMAP_BLENDING_ADD"};function iv(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":ev[s.combine]||"ENVMAP_BLENDING_NONE"}function nv(s){let t=s.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function sv(s,t,e,i){let n=s.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,c=j_(e),l=$_(e),h=tv(e),d=iv(e),u=nv(e),f=z_(e),m=V_(r),v=n.createProgram(),g,p,b=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(jr).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m].filter(jr).join(`
`),p.length>0&&(p+=`
`)):(g=[tf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(jr).join(`
`),p=[tf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,m,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Ci?"#define TONE_MAPPING":"",e.toneMapping!==Ci?Jt.tonemapping_pars_fragment:"",e.toneMapping!==Ci?k_("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Jt.colorspace_pars_fragment,O_("linearToOutputTexel",e.outputColorSpace),H_(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(jr).join(`
`)),a=ph(a),a=Zd(a,e),a=$d(a,e),o=ph(o),o=Zd(o,e),o=$d(o,e),a=Qd(a),o=Qd(o),e.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",e.glslVersion===qc?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===qc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let M=b+g+a,x=b+p+o,T=Jd(n,n.VERTEX_SHADER,M),E=Jd(n,n.FRAGMENT_SHADER,x);n.attachShader(v,T),n.attachShader(v,E),e.index0AttributeName!==void 0?n.bindAttribLocation(v,0,e.index0AttributeName):e.hasPositionAttribute===!0&&n.bindAttribLocation(v,0,"position"),n.linkProgram(v);function R(N){if(s.debug.checkShaderErrors){let O=n.getProgramInfoLog(v)||"",V=n.getShaderInfoLog(T)||"",D=n.getShaderInfoLog(E)||"",B=O.trim(),X=V.trim(),W=D.trim(),st=!0,q=!0;if(n.getProgramParameter(v,n.LINK_STATUS)===!1)if(st=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(n,v,T,E);else{let Q=jd(n,T,"vertex"),it=jd(n,E,"fragment");zt("WebGLProgram: Shader Error "+n.getError()+" - VALIDATE_STATUS "+n.getProgramParameter(v,n.VALIDATE_STATUS)+`

Material Name: `+N.name+`
Material Type: `+N.type+`

Program Info Log: `+B+`
`+Q+`
`+it)}else B!==""?kt("WebGLProgram: Program Info Log:",B):(X===""||W==="")&&(q=!1);q&&(N.diagnostics={runnable:st,programLog:B,vertexShader:{log:X,prefix:g},fragmentShader:{log:W,prefix:p}})}n.deleteShader(T),n.deleteShader(E),y=new Bs(n,v),A=G_(n,v)}let y;this.getUniforms=function(){return y===void 0&&R(this),y};let A;this.getAttributes=function(){return A===void 0&&R(this),A};let P=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=n.getProgramParameter(v,D_)),P},this.destroy=function(){i.releaseStatesOfProgram(this),n.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=N_++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=T,this.fragmentShader=E,this}var rv=0,mh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,i){let n=this._getShaderCacheForMaterial(t);return n.has(e)===!1&&(n.add(e),e.usedTimes++),n.has(i)===!1&&(n.add(i),i.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){let e=this.shaderCache,i=e.get(t);return i===void 0&&(i=new gh(t),e.set(t,i)),i}},gh=class{constructor(t){this.id=rv++,this.code=t,this.usedTimes=0}};function av(s){return s===wn||s===qr||s===Yr}function ov(s,t,e,i,n,r){let a=new ur,o=new mh,c=new Set,l=[],h=new Map,d=i.logarithmicDepthBuffer,u=i.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(y){return c.add(y),y===0?"uv":`uv${y}`}function v(y,A,P,N,O,V){let D=N.fog,B=O.geometry,X=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?N.environment:null,W=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,st=t.get(y.envMap||X,W),q=st&&st.mapping===Hr?st.image.height:null,Q=f[y.type];y.precision!==null&&(u=i.getMaxPrecision(y.precision),u!==y.precision&&kt("WebGLProgram.getParameters:",y.precision,"not supported, using",u,"instead."));let it=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,It=it!==void 0?it.length:0,wt=0;B.morphAttributes.position!==void 0&&(wt=1),B.morphAttributes.normal!==void 0&&(wt=2),B.morphAttributes.color!==void 0&&(wt=3);let ae,Zt,ne,j;if(Q){let fe=Xi[Q];ae=fe.vertexShader,Zt=fe.fragmentShader}else{ae=y.vertexShader,Zt=y.fragmentShader;let fe=o.getVertexShaderStage(y),le=o.getFragmentShaderStage(y);o.update(y,fe,le),ne=fe.id,j=le.id}let tt=s.getRenderTarget(),vt=s.state.buffers.depth.getReversed(),Ht=O.isInstancedMesh===!0,bt=O.isBatchedMesh===!0,Vt=!!y.map,he=!!y.matcap,et=!!st,rt=!!y.aoMap,ot=!!y.lightMap,lt=!!y.bumpMap&&y.wireframe===!1,dt=!!y.normalMap,Ot=!!y.displacementMap,Ft=!!y.emissiveMap,Gt=!!y.metalnessMap,Xt=!!y.roughnessMap,I=y.anisotropy>0,oe=y.clearcoat>0,$t=y.dispersion>0,w=y.retroreflectivity>0,_=y.iridescence>0,F=y.sheen>0,z=y.transmission>0,Y=I&&!!y.anisotropyMap,ct=oe&&!!y.clearcoatMap,ut=oe&&!!y.clearcoatNormalMap,K=oe&&!!y.clearcoatRoughnessMap,$=_&&!!y.iridescenceMap,ft=_&&!!y.iridescenceThicknessMap,Dt=F&&!!y.sheenColorMap,xt=F&&!!y.sheenRoughnessMap,pt=!!y.specularMap,Nt=!!y.specularColorMap,Bt=!!y.specularIntensityMap,qt=z&&!!y.transmissionMap,U=z&&!!y.thicknessMap,mt=!!y.gradientMap,Z=!!y.alphaMap,gt=y.alphaTest>0,St=!!y.alphaHash,nt=!!y.extensions,Ut=Ci;y.toneMapped&&(tt===null||tt.isXRRenderTarget===!0)&&(Ut=s.toneMapping);let Ct={shaderID:Q,shaderType:y.type,shaderName:y.name,vertexShader:ae,fragmentShader:Zt,defines:y.defines,customVertexShaderID:ne,customFragmentShaderID:j,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:u,batching:bt,batchingColor:bt&&O._colorsTexture!==null,instancing:Ht,instancingColor:Ht&&O.instanceColor!==null,instancingMorph:Ht&&O.morphTexture!==null,outputColorSpace:tt===null?s.outputColorSpace:tt.isXRRenderTarget===!0?tt.texture.colorSpace:jt.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:Vt,matcap:he,envMap:et,envMapMode:et&&st.mapping,envMapCubeUVHeight:q,aoMap:rt,lightMap:ot,bumpMap:lt,normalMap:dt,displacementMap:Ot,emissiveMap:Ft,normalMapObjectSpace:dt&&y.normalMapType===_d,normalMapTangentSpace:dt&&y.normalMapType===ul,packedNormalMap:dt&&y.normalMapType===ul&&av(y.normalMap.format),metalnessMap:Gt,roughnessMap:Xt,anisotropy:I,anisotropyMap:Y,clearcoat:oe,clearcoatMap:ct,clearcoatNormalMap:ut,clearcoatRoughnessMap:K,dispersion:$t,retroreflection:w,iridescence:_,iridescenceMap:$,iridescenceThicknessMap:ft,sheen:F,sheenColorMap:Dt,sheenRoughnessMap:xt,specularMap:pt,specularColorMap:Nt,specularIntensityMap:Bt,transmission:z,transmissionMap:qt,thicknessMap:U,gradientMap:mt,opaque:y.transparent===!1&&y.blending===Ls&&y.alphaToCoverage===!1,alphaMap:Z,alphaTest:gt,alphaHash:St,combine:y.combine,mapUv:Vt&&m(y.map.channel),aoMapUv:rt&&m(y.aoMap.channel),lightMapUv:ot&&m(y.lightMap.channel),bumpMapUv:lt&&m(y.bumpMap.channel),normalMapUv:dt&&m(y.normalMap.channel),displacementMapUv:Ot&&m(y.displacementMap.channel),emissiveMapUv:Ft&&m(y.emissiveMap.channel),metalnessMapUv:Gt&&m(y.metalnessMap.channel),roughnessMapUv:Xt&&m(y.roughnessMap.channel),anisotropyMapUv:Y&&m(y.anisotropyMap.channel),clearcoatMapUv:ct&&m(y.clearcoatMap.channel),clearcoatNormalMapUv:ut&&m(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:K&&m(y.clearcoatRoughnessMap.channel),iridescenceMapUv:$&&m(y.iridescenceMap.channel),iridescenceThicknessMapUv:ft&&m(y.iridescenceThicknessMap.channel),sheenColorMapUv:Dt&&m(y.sheenColorMap.channel),sheenRoughnessMapUv:xt&&m(y.sheenRoughnessMap.channel),specularMapUv:pt&&m(y.specularMap.channel),specularColorMapUv:Nt&&m(y.specularColorMap.channel),specularIntensityMapUv:Bt&&m(y.specularIntensityMap.channel),transmissionMapUv:qt&&m(y.transmissionMap.channel),thicknessMapUv:U&&m(y.thicknessMap.channel),alphaMapUv:Z&&m(y.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(dt||I),vertexNormals:!!B.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:O.isPoints===!0&&!!B.attributes.uv&&(Vt||Z),fog:!!D,useFog:y.fog===!0,fogExp2:!!D&&D.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||B.attributes.normal===void 0&&dt===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:vt,skinning:O.isSkinnedMesh===!0,hasPositionAttribute:B.attributes.position!==void 0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:It,morphTextureStride:wt,numSunLights:A.sun.length,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numSunLightShadows:A.sunShadowMap.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numLightProbeGrids:V.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:s.shadowMap.enabled&&P.length>0,shadowMapType:s.shadowMap.type,toneMapping:Ut,decodeVideoTexture:Vt&&y.map.isVideoTexture===!0&&jt.getTransfer(y.map.colorSpace)===re,decodeVideoTextureEmissive:Ft&&y.emissiveMap.isVideoTexture===!0&&jt.getTransfer(y.emissiveMap.colorSpace)===re,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===ai,flipSided:y.side===Ye,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:nt&&y.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(nt&&y.extensions.multiDraw===!0||bt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Ct.vertexUv1s=c.has(1),Ct.vertexUv2s=c.has(2),Ct.vertexUv3s=c.has(3),c.clear(),Ct}function g(y){let A=[];if(y.shaderID?A.push(y.shaderID):(A.push(y.customVertexShaderID),A.push(y.customFragmentShaderID)),y.defines!==void 0)for(let P in y.defines)A.push(P),A.push(y.defines[P]);return y.isRawShaderMaterial===!1&&(p(A,y),b(A,y),A.push(s.outputColorSpace)),A.push(y.customProgramCacheKey),A.join()}function p(y,A){y.push(A.precision),y.push(A.outputColorSpace),y.push(A.envMapMode),y.push(A.envMapCubeUVHeight),y.push(A.mapUv),y.push(A.alphaMapUv),y.push(A.lightMapUv),y.push(A.aoMapUv),y.push(A.bumpMapUv),y.push(A.normalMapUv),y.push(A.displacementMapUv),y.push(A.emissiveMapUv),y.push(A.metalnessMapUv),y.push(A.roughnessMapUv),y.push(A.anisotropyMapUv),y.push(A.clearcoatMapUv),y.push(A.clearcoatNormalMapUv),y.push(A.clearcoatRoughnessMapUv),y.push(A.iridescenceMapUv),y.push(A.iridescenceThicknessMapUv),y.push(A.sheenColorMapUv),y.push(A.sheenRoughnessMapUv),y.push(A.specularMapUv),y.push(A.specularColorMapUv),y.push(A.specularIntensityMapUv),y.push(A.transmissionMapUv),y.push(A.thicknessMapUv),y.push(A.combine),y.push(A.fogExp2),y.push(A.sizeAttenuation),y.push(A.morphTargetsCount),y.push(A.morphAttributeCount),y.push(A.numSunLights),y.push(A.numDirLights),y.push(A.numPointLights),y.push(A.numSpotLights),y.push(A.numSpotLightMaps),y.push(A.numHemiLights),y.push(A.numRectAreaLights),y.push(A.numSunLightShadows),y.push(A.numDirLightShadows),y.push(A.numPointLightShadows),y.push(A.numSpotLightShadows),y.push(A.numSpotLightShadowsWithMaps),y.push(A.numLightProbes),y.push(A.shadowMapType),y.push(A.toneMapping),y.push(A.numClippingPlanes),y.push(A.numClipIntersection),y.push(A.depthPacking)}function b(y,A){a.disableAll(),A.instancing&&a.enable(0),A.instancingColor&&a.enable(1),A.instancingMorph&&a.enable(2),A.matcap&&a.enable(3),A.envMap&&a.enable(4),A.normalMapObjectSpace&&a.enable(5),A.normalMapTangentSpace&&a.enable(6),A.clearcoat&&a.enable(7),A.iridescence&&a.enable(8),A.alphaTest&&a.enable(9),A.vertexColors&&a.enable(10),A.vertexAlphas&&a.enable(11),A.vertexUv1s&&a.enable(12),A.vertexUv2s&&a.enable(13),A.vertexUv3s&&a.enable(14),A.vertexTangents&&a.enable(15),A.anisotropy&&a.enable(16),A.alphaHash&&a.enable(17),A.batching&&a.enable(18),A.dispersion&&a.enable(19),A.retroreflection&&a.enable(24),A.batchingColor&&a.enable(20),A.gradientMap&&a.enable(21),A.packedNormalMap&&a.enable(22),A.vertexNormals&&a.enable(23),y.push(a.mask),a.disableAll(),A.fog&&a.enable(0),A.useFog&&a.enable(1),A.flatShading&&a.enable(2),A.logarithmicDepthBuffer&&a.enable(3),A.reversedDepthBuffer&&a.enable(4),A.skinning&&a.enable(5),A.morphTargets&&a.enable(6),A.morphNormals&&a.enable(7),A.morphColors&&a.enable(8),A.premultipliedAlpha&&a.enable(9),A.shadowMapEnabled&&a.enable(10),A.doubleSided&&a.enable(11),A.flipSided&&a.enable(12),A.useDepthPacking&&a.enable(13),A.dithering&&a.enable(14),A.transmission&&a.enable(15),A.sheen&&a.enable(16),A.opaque&&a.enable(17),A.pointsUvs&&a.enable(18),A.decodeVideoTexture&&a.enable(19),A.decodeVideoTextureEmissive&&a.enable(20),A.alphaToCoverage&&a.enable(21),A.numLightProbeGrids>0&&a.enable(22),A.hasPositionAttribute&&a.enable(23),y.push(a.mask)}function M(y){let A=f[y.type],P;if(A){let N=Xi[A];P=sn.clone(N.uniforms)}else P=y.uniforms;return P}function x(y,A){let P=h.get(A);return P!==void 0?++P.usedTimes:(P=new sv(s,A,y,n),l.push(P),h.set(A,P)),P}function T(y){if(--y.usedTimes===0){let A=l.indexOf(y);l[A]=l[l.length-1],l.pop(),h.delete(y.cacheKey),y.destroy()}}function E(y){o.remove(y)}function R(){o.dispose()}return{getParameters:v,getProgramCacheKey:g,getUniforms:M,acquireProgram:x,releaseProgram:T,releaseShaderCache:E,programs:l,dispose:R}}function lv(){let s=new WeakMap;function t(a){return s.has(a)}function e(a){let o=s.get(a);return o===void 0&&(o={},s.set(a,o)),o}function i(a){s.delete(a)}function n(a,o,c){s.get(a)[o]=c}function r(){s=new WeakMap}return{has:t,get:e,remove:i,update:n,dispose:r}}function cv(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.materialVariant!==t.materialVariant?s.materialVariant-t.materialVariant:s.z!==t.z?s.z-t.z:s.id-t.id}function ef(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function nf(){let s=[],t=0,e=[],i=[],n=[];function r(){t=0,e.length=0,i.length=0,n.length=0}function a(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,m,v,g,p){let b=s[t];return b===void 0?(b={id:u.id,object:u,geometry:f,material:m,materialVariant:a(u),groupOrder:v,renderOrder:u.renderOrder,z:g,group:p},s[t]=b):(b.id=u.id,b.object=u,b.geometry=f,b.material=m,b.materialVariant=a(u),b.groupOrder=v,b.renderOrder=u.renderOrder,b.z=g,b.group=p),t++,b}function c(u,f,m,v,g,p,b){b.reversedDepth===!0&&(g=-g);let M=o(u,f,m,v,g,p);m.transmission>0?i.push(M):m.transparent===!0?n.push(M):e.push(M)}function l(u,f,m,v,g,p){let b=o(u,f,m,v,g,p);m.transmission>0?i.unshift(b):m.transparent===!0?n.unshift(b):e.unshift(b)}function h(u,f){e.length>1&&e.sort(u||cv),i.length>1&&i.sort(f||ef),n.length>1&&n.sort(f||ef)}function d(){for(let u=t,f=s.length;u<f;u++){let m=s[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:i,transparent:n,init:r,push:c,unshift:l,finish:d,sort:h}}function hv(){let s=new WeakMap;function t(i,n){let r=s.get(i),a;return r===void 0?(a=new nf,s.set(i,[a])):n>=r.length?(a=new nf,r.push(a)):a=r[n],a}function e(){s=new WeakMap}return{get:t,dispose:e}}function uv(){let s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new C,color:new Lt};break;case"SpotLight":e={position:new C,direction:new C,color:new Lt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new C,color:new Lt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new C,skyColor:new Lt,groundColor:new Lt};break;case"RectAreaLight":e={color:new Lt,position:new C,halfWidth:new C,halfHeight:new C};break}return s[t.id]=e,e}}}function dv(){let s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new at};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new at};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new at,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}var fv=0;function pv(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function mv(s){let t=new uv,e=dv(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new C);let n=new C,r=new ye,a=new ye;function o(l){let h=0,d=0,u=0;for(let O=0;O<9;O++)i.probe[O].set(0,0,0);let f=0,m=0,v=0,g=0,p=0,b=0,M=0,x=0,T=0,E=0,R=0,y=0,A=0,P=0;l.sort(pv);for(let O=0,V=l.length;O<V;O++){let D=l[O],B=D.color,X=D.intensity,W=D.distance,st=null;if(D.shadow&&D.shadow.map&&(D.shadow.map.texture.format===wn?st=D.shadow.map.texture:st=D.shadow.map.depthTexture||D.shadow.map.texture),D.isAmbientLight)h+=B.r*X,d+=B.g*X,u+=B.b*X;else if(D.isLightProbe){for(let q=0;q<9;q++)i.probe[q].addScaledVector(D.sh.coefficients[q],X);P++}else if(D.isSunLight){let q=t.get(D);if(q.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let Q=D.shadow,it=e.get(D);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize.copy(Q.mapSize).multiply(Q.getFrameExtents()),i.sunShadow[m]=it,i.sunShadowMap[m]=st;let It=Q.getViewportCount();for(let wt=0;wt<It;wt++)i.sunShadowMatrix[v+wt]=Q.getMatrix(wt),i.sunShadowCascade[v+wt]=Q._cascadeData[wt];v+=It,m++}i.sun[f]=q,f++}else if(D.isDirectionalLight){let q=t.get(D);if(q.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let Q=D.shadow,it=e.get(D);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,i.directionalShadow[g]=it,i.directionalShadowMap[g]=st,i.directionalShadowMatrix[g]=D.shadow.matrix,T++}i.directional[g]=q,g++}else if(D.isSpotLight){let q=t.get(D);q.position.setFromMatrixPosition(D.matrixWorld),q.color.copy(B).multiplyScalar(X),q.distance=W,q.coneCos=Math.cos(D.angle),q.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),q.decay=D.decay,i.spot[b]=q;let Q=D.shadow;if(D.map&&(i.spotLightMap[y]=D.map,y++,Q.updateMatrices(D),D.castShadow&&A++),i.spotLightMatrix[b]=Q.matrix,D.castShadow){let it=e.get(D);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,i.spotShadow[b]=it,i.spotShadowMap[b]=st,R++}b++}else if(D.isRectAreaLight){let q=t.get(D);q.color.copy(B).multiplyScalar(X),q.halfWidth.set(D.width*.5,0,0),q.halfHeight.set(0,D.height*.5,0),i.rectArea[M]=q,M++}else if(D.isPointLight){let q=t.get(D);if(q.color.copy(D.color).multiplyScalar(D.intensity),q.distance=D.distance,q.decay=D.decay,D.castShadow){let Q=D.shadow,it=e.get(D);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,it.shadowCameraNear=Q.camera.near,it.shadowCameraFar=Q.camera.far,i.pointShadow[p]=it,i.pointShadowMap[p]=st,i.pointShadowMatrix[p]=D.shadow.matrix,E++}i.point[p]=q,p++}else if(D.isHemisphereLight){let q=t.get(D);q.skyColor.copy(D.color).multiplyScalar(X),q.groundColor.copy(D.groundColor).multiplyScalar(X),i.hemi[x]=q,x++}}M>0&&(s.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=_t.LTC_FLOAT_1,i.rectAreaLTC2=_t.LTC_FLOAT_2):(i.rectAreaLTC1=_t.LTC_HALF_1,i.rectAreaLTC2=_t.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=d,i.ambient[2]=u;let N=i.hash;(N.sunLength!==f||N.directionalLength!==g||N.pointLength!==p||N.spotLength!==b||N.rectAreaLength!==M||N.hemiLength!==x||N.numSunShadows!==m||N.numDirectionalShadows!==T||N.numPointShadows!==E||N.numSpotShadows!==R||N.numSpotMaps!==y||N.numLightProbes!==P)&&(i.sun.length=f,i.directional.length=g,i.spot.length=b,i.rectArea.length=M,i.point.length=p,i.hemi.length=x,i.sunShadow.length=m,i.sunShadowMap.length=m,i.sunShadowMatrix.length=v,i.sunShadowCascade.length=v,i.directionalShadow.length=T,i.directionalShadowMap.length=T,i.directionalShadowMatrix.length=T,i.pointShadow.length=E,i.pointShadowMap.length=E,i.pointShadowMatrix.length=E,i.spotShadow.length=R,i.spotShadowMap.length=R,i.spotLightMatrix.length=R+y-A,i.spotLightMap.length=y,i.numSpotLightShadowsWithMaps=A,i.numLightProbes=P,N.sunLength=f,N.directionalLength=g,N.pointLength=p,N.spotLength=b,N.rectAreaLength=M,N.hemiLength=x,N.numSunShadows=m,N.numDirectionalShadows=T,N.numPointShadows=E,N.numSpotShadows=R,N.numSpotMaps=y,N.numLightProbes=P,i.version=fv++)}function c(l,h){let d=0,u=0,f=0,m=0,v=0,g=0,p=h.matrixWorldInverse;for(let b=0,M=l.length;b<M;b++){let x=l[b];if(x.isSunLight){let T=i.sun[d];T.direction.setFromMatrixPosition(x.matrixWorld),T.direction.transformDirection(p),d++}else if(x.isDirectionalLight){let T=i.directional[u];T.direction.setFromMatrixPosition(x.matrixWorld),n.setFromMatrixPosition(x.target.matrixWorld),T.direction.sub(n),T.direction.transformDirection(p),u++}else if(x.isSpotLight){let T=i.spot[m];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(p),T.direction.setFromMatrixPosition(x.matrixWorld),n.setFromMatrixPosition(x.target.matrixWorld),T.direction.sub(n),T.direction.transformDirection(p),m++}else if(x.isRectAreaLight){let T=i.rectArea[v];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(p),a.identity(),r.copy(x.matrixWorld),r.premultiply(p),a.extractRotation(r),T.halfWidth.set(x.width*.5,0,0),T.halfHeight.set(0,x.height*.5,0),T.halfWidth.applyMatrix4(a),T.halfHeight.applyMatrix4(a),v++}else if(x.isPointLight){let T=i.point[f];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(p),f++}else if(x.isHemisphereLight){let T=i.hemi[g];T.direction.setFromMatrixPosition(x.matrixWorld),T.direction.transformDirection(p),g++}}}return{setup:o,setupView:c,state:i}}function sf(s){let t=new mv(s),e=[],i=[],n=[];function r(u){d.camera=u,e.length=0,i.length=0,n.length=0}function a(u){e.push(u)}function o(u){i.push(u)}function c(u){n.push(u)}function l(){t.setup(e)}function h(u){t.setupView(e,u)}let d={lightsArray:e,shadowsArray:i,lightProbeGridArray:n,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:l,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:c}}function gv(s){let t=new WeakMap;function e(n,r=0){let a=t.get(n),o;return a===void 0?(o=new sf(s),t.set(n,[o])):r>=a.length?(o=new sf(s),a.push(o)):o=a[r],o}function i(){t=new WeakMap}return{get:e,dispose:i}}var xv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,_v=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,vv=[new C(1,0,0),new C(-1,0,0),new C(0,1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1)],yv=[new C(0,-1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1),new C(0,-1,0),new C(0,-1,0)],rf=new ye,Kr=new C,ch=new C;function Mv(s,t,e){let i=new Ts,n=new at,r=new at,a=new Me,o=new uo,c=new fo,l={},h=e.maxTextureSize,d={[bn]:Ye,[Ye]:bn,[ai]:ai},u=new Pe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new at},radius:{value:4}},vertexShader:xv,fragmentShader:_v}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let m=new De;m.setAttribute("position",new yi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let v=new ht(m,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Xn;let p=this.type;this.render=function(E,R,y){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||E.length===0)return;this.type===Ku&&(kt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Xn);let A=s.getRenderTarget(),P=s.getActiveCubeFace(),N=s.getActiveMipmapLevel(),O=s.state;O.setBlending(Mi),O.buffers.depth.getReversed()===!0?O.buffers.color.setClear(0,0,0,0):O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);let V=p!==this.type;V&&R.traverse(function(D){D.material&&(Array.isArray(D.material)?D.material.forEach(B=>B.needsUpdate=!0):D.material.needsUpdate=!0)});for(let D=0,B=E.length;D<B;D++){let X=E[D],W=X.shadow;if(W===void 0){kt("WebGLShadowMap:",X,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;n.copy(W.mapSize);let st=W.getFrameExtents();n.multiply(st),r.copy(W.mapSize),(n.x>h||n.y>h)&&(n.x>h&&(r.x=Math.floor(h/st.x),n.x=r.x*st.x,W.mapSize.x=r.x),n.y>h&&(r.y=Math.floor(h/st.y),n.y=r.y*st.y,W.mapSize.y=r.y));let q=s.state.buffers.depth.getReversed();if(W.camera._reversedDepth=q,W.map===null||V===!0){if(W.map!==null&&(W.map.depthTexture!==null&&(W.map.depthTexture.dispose(),W.map.depthTexture=null),W.map.dispose()),this.type===Is){if(X.isPointLight){kt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}W.map=new Te(n.x,n.y,{format:wn,type:Ne,minFilter:Xe,magFilter:Xe,generateMipmaps:!1}),W.map.texture.name=X.name+".shadowMap",W.map.depthTexture=new xn(n.x,n.y,Ii),W.map.depthTexture.name=X.name+".shadowMapDepth",W.map.depthTexture.format=Bi,W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=ze,W.map.depthTexture.magFilter=ze}else X.isPointLight?(W.map=new Hs(n.x),W.map.depthTexture=new ro(n.x,Pi)):(W.map=new Te(n.x,n.y),W.map.depthTexture=new xn(n.x,n.y,Pi)),W.map.depthTexture.name=X.name+".shadowMap",W.map.depthTexture.format=Bi,this.type===Xn?(W.map.depthTexture.compareFunction=q?fl:dl,W.map.depthTexture.minFilter=Xe,W.map.depthTexture.magFilter=Xe):(W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=ze,W.map.depthTexture.magFilter=ze);W.camera.updateProjectionMatrix()}W.map.isWebGLCubeRenderTarget!==!0&&(W.map.width!==n.x||W.map.height!==n.y)&&W.map.setSize(n.x,n.y);let Q=W.map.isWebGLCubeRenderTarget?6:W.getViewportCount();X.isPointLight!==!0&&W.updateMatrices(X,y);for(let it=0;it<Q;it++){let It=W.getCamera(it);if(X.isPointLight){let wt=W.camera,ae=W.matrix,Zt=X.distance||wt.far;Zt!==wt.far&&(wt.far=Zt,wt.updateProjectionMatrix()),Kr.setFromMatrixPosition(X.matrixWorld),wt.position.copy(Kr),ch.copy(wt.position),ch.add(vv[it]),wt.up.copy(yv[it]),wt.lookAt(ch),wt.updateMatrixWorld(),ae.makeTranslation(-Kr.x,-Kr.y,-Kr.z),rf.multiplyMatrices(wt.projectionMatrix,wt.matrixWorldInverse),W._frustum.setFromProjectionMatrix(rf,wt.coordinateSystem,wt.reversedDepth)}if(W.map.isWebGLCubeRenderTarget)s.setRenderTarget(W.map,it),s.clear();else{it===0&&(s.setRenderTarget(W.map),s.clear());let wt=W.getViewport(it);a.set(r.x*wt.x,r.y*wt.y,r.x*wt.z,r.y*wt.w),O.viewport(a)}i=W.getFrustum(it),x(R,y,It,X,this.type)}W.isPointLightShadow!==!0&&this.type===Is&&b(W,y),W.needsUpdate=!1}p=this.type,g.needsUpdate=!1,s.setRenderTarget(A,P,N)};function b(E,R){let y=t.update(v);u.defines.VSM_SAMPLES!==E.blurSamples&&(u.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null?E.mapPass=new Te(n.x,n.y,{format:wn,type:Ne}):(E.mapPass.width!==E.map.width||E.mapPass.height!==E.map.height)&&E.mapPass.setSize(E.map.width,E.map.height),u.uniforms.shadow_pass.value=E.map.depthTexture,u.uniforms.resolution.value.set(E.map.width,E.map.height),u.uniforms.radius.value=E.radius,s.setRenderTarget(E.mapPass),s.clear(),s.renderBufferDirect(R,null,y,u,v,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value.set(E.map.width,E.map.height),f.uniforms.radius.value=E.radius,s.setRenderTarget(E.map),s.clear(),s.renderBufferDirect(R,null,y,f,v,null)}function M(E,R,y,A){let P=null,N=y.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(N!==void 0)P=N;else if(P=y.isPointLight===!0?c:o,s.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){let O=P.uuid,V=R.uuid,D=l[O];D===void 0&&(D={},l[O]=D);let B=D[V];B===void 0&&(B=P.clone(),D[V]=B,R.addEventListener("dispose",T)),P=B}if(P.visible=R.visible,P.wireframe=R.wireframe,A===Is?P.side=R.shadowSide!==null?R.shadowSide:R.side:P.side=R.shadowSide!==null?R.shadowSide:d[R.side],P.alphaMap=R.alphaMap,P.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,P.map=R.map,P.clipShadows=R.clipShadows,P.clippingPlanes=R.clippingPlanes,P.clipIntersection=R.clipIntersection,P.displacementMap=R.displacementMap,P.displacementScale=R.displacementScale,P.displacementBias=R.displacementBias,P.wireframeLinewidth=R.wireframeLinewidth,P.linewidth=R.linewidth,y.isPointLight===!0&&P.isMeshDistanceMaterial===!0){let O=s.properties.get(P);O.light=y}return P}function x(E,R,y,A,P){if(E.visible===!1)return;if(E.layers.test(R.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&P===Is)&&(!E.frustumCulled||E.intersectsFrustum(i))){E.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,E.matrixWorld);let V=t.update(E),D=E.material;if(Array.isArray(D)){let B=V.groups;for(let X=0,W=B.length;X<W;X++){let st=B[X],q=D[st.materialIndex];if(q&&q.visible){let Q=M(E,q,A,P);E.onBeforeShadow(s,E,R,y,V,Q,st),s.renderBufferDirect(y,null,V,Q,E,st),E.onAfterShadow(s,E,R,y,V,Q,st)}}}else if(D.visible){let B=M(E,D,A,P);E.onBeforeShadow(s,E,R,y,V,B,null),s.renderBufferDirect(y,null,V,B,E,null),E.onAfterShadow(s,E,R,y,V,B,null)}}let O=E.children;for(let V=0,D=O.length;V<D;V++)x(O[V],R,y,A,P)}function T(E){E.target.removeEventListener("dispose",T);for(let y in l){let A=l[y],P=E.target.uuid;P in A&&(A[P].dispose(),delete A[P])}}}function Sv(s,t){function e(){let U=!1,mt=new Me,Z=null,gt=new Me(0,0,0,0);return{setMask:function(St){Z!==St&&!U&&(s.colorMask(St,St,St,St),Z=St)},setLocked:function(St){U=St},setClear:function(St,nt,Ut,Ct,fe){fe===!0&&(St*=Ct,nt*=Ct,Ut*=Ct),mt.set(St,nt,Ut,Ct),gt.equals(mt)===!1&&(s.clearColor(St,nt,Ut,Ct),gt.copy(mt))},reset:function(){U=!1,Z=null,gt.set(-1,0,0,0)}}}function i(){let U=!1,mt=!1,Z=null,gt=null,St=null;return{setReversed:function(nt){if(mt!==nt){let Ut=t.get("EXT_clip_control");nt?Ut.clipControlEXT(Ut.LOWER_LEFT_EXT,Ut.ZERO_TO_ONE_EXT):Ut.clipControlEXT(Ut.LOWER_LEFT_EXT,Ut.NEGATIVE_ONE_TO_ONE_EXT),mt=nt;let Ct=St;St=null,this.setClear(Ct)}},getReversed:function(){return mt},setTest:function(nt){nt?tt(s.DEPTH_TEST):vt(s.DEPTH_TEST)},setMask:function(nt){Z!==nt&&!U&&(s.depthMask(nt),Z=nt)},setFunc:function(nt){if(mt&&(nt=Pd[nt]),gt!==nt){switch(nt){case Wa:s.depthFunc(s.NEVER);break;case Xa:s.depthFunc(s.ALWAYS);break;case qa:s.depthFunc(s.LESS);break;case gs:s.depthFunc(s.LEQUAL);break;case Ya:s.depthFunc(s.EQUAL);break;case Ja:s.depthFunc(s.GEQUAL);break;case Ka:s.depthFunc(s.GREATER);break;case ja:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}gt=nt}},setLocked:function(nt){U=nt},setClear:function(nt){St!==nt&&(St=nt,mt&&(nt=1-nt),s.clearDepth(nt))},reset:function(){U=!1,Z=null,gt=null,St=null,mt=!1}}}function n(){let U=!1,mt=null,Z=null,gt=null,St=null,nt=null,Ut=null,Ct=null,fe=null;return{setTest:function(le){U||(le?tt(s.STENCIL_TEST):vt(s.STENCIL_TEST))},setMask:function(le){mt!==le&&!U&&(s.stencilMask(le),mt=le)},setFunc:function(le,bi,Di){(Z!==le||gt!==bi||St!==Di)&&(s.stencilFunc(le,bi,Di),Z=le,gt=bi,St=Di)},setOp:function(le,bi,Di){(nt!==le||Ut!==bi||Ct!==Di)&&(s.stencilOp(le,bi,Di),nt=le,Ut=bi,Ct=Di)},setLocked:function(le){U=le},setClear:function(le){fe!==le&&(s.clearStencil(le),fe=le)},reset:function(){U=!1,mt=null,Z=null,gt=null,St=null,nt=null,Ut=null,Ct=null,fe=null}}}let r=new e,a=new i,o=new n,c=new WeakMap,l=new WeakMap,h={},d={},u={},f=new WeakMap,m=[],v=null,g=!1,p=null,b=null,M=null,x=null,T=null,E=null,R=null,y=new Lt(0,0,0),A=0,P=!1,N=null,O=null,V=null,D=null,B=null,X=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS),W=!1,st=0,q=s.getParameter(s.VERSION);q.indexOf("WebGL")!==-1?(st=parseFloat(/^WebGL (\d)/.exec(q)[1]),W=st>=1):q.indexOf("OpenGL ES")!==-1&&(st=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),W=st>=2);let Q=null,it={},It=s.getParameter(s.SCISSOR_BOX),wt=s.getParameter(s.VIEWPORT),ae=new Me().fromArray(It),Zt=new Me().fromArray(wt);function ne(U,mt,Z,gt){let St=new Uint8Array(4),nt=s.createTexture();s.bindTexture(U,nt),s.texParameteri(U,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(U,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Ut=0;Ut<Z;Ut++)U===s.TEXTURE_3D||U===s.TEXTURE_2D_ARRAY?s.texImage3D(mt,0,s.RGBA,1,1,gt,0,s.RGBA,s.UNSIGNED_BYTE,St):s.texImage2D(mt+Ut,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,St);return nt}let j={};j[s.TEXTURE_2D]=ne(s.TEXTURE_2D,s.TEXTURE_2D,1),j[s.TEXTURE_CUBE_MAP]=ne(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),j[s.TEXTURE_2D_ARRAY]=ne(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),j[s.TEXTURE_3D]=ne(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),tt(s.DEPTH_TEST),a.setFunc(gs),lt(!1),dt(Lc),tt(s.CULL_FACE),rt(Mi);function tt(U){h[U]!==!0&&(s.enable(U),h[U]=!0)}function vt(U){h[U]!==!1&&(s.disable(U),h[U]=!1)}function Ht(U,mt){return u[U]!==mt?(s.bindFramebuffer(U,mt),u[U]=mt,U===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=mt),U===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=mt),!0):!1}function bt(U,mt){let Z=m,gt=!1;if(U){Z=f.get(mt),Z===void 0&&(Z=[],f.set(mt,Z));let St=U.textures;if(Z.length!==St.length||Z[0]!==s.COLOR_ATTACHMENT0){for(let nt=0,Ut=St.length;nt<Ut;nt++)Z[nt]=s.COLOR_ATTACHMENT0+nt;Z.length=St.length,gt=!0}}else Z[0]!==s.BACK&&(Z[0]=s.BACK,gt=!0);gt&&s.drawBuffers(Z)}function Vt(U){return v!==U?(s.useProgram(U),v=U,!0):!1}let he={[qn]:s.FUNC_ADD,[Zu]:s.FUNC_SUBTRACT,[$u]:s.FUNC_REVERSE_SUBTRACT};he[Qu]=s.MIN,he[td]=s.MAX;let et={[ed]:s.ZERO,[id]:s.ONE,[nd]:s.SRC_COLOR,[Uc]:s.SRC_ALPHA,[cd]:s.SRC_ALPHA_SATURATE,[od]:s.DST_COLOR,[rd]:s.DST_ALPHA,[sd]:s.ONE_MINUS_SRC_COLOR,[Fc]:s.ONE_MINUS_SRC_ALPHA,[ld]:s.ONE_MINUS_DST_COLOR,[ad]:s.ONE_MINUS_DST_ALPHA,[hd]:s.CONSTANT_COLOR,[ud]:s.ONE_MINUS_CONSTANT_COLOR,[dd]:s.CONSTANT_ALPHA,[fd]:s.ONE_MINUS_CONSTANT_ALPHA};function rt(U,mt,Z,gt,St,nt,Ut,Ct,fe,le){if(U===Mi){g===!0&&(vt(s.BLEND),g=!1);return}if(g===!1&&(tt(s.BLEND),g=!0),U!==ju){if(U!==p||le!==P){if((b!==qn||T!==qn)&&(s.blendEquation(s.FUNC_ADD),b=qn,T=qn),le)switch(U){case Ls:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case en:s.blendFunc(s.ONE,s.ONE);break;case Dc:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Nc:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:zt("WebGLState: Invalid blending: ",U);break}else switch(U){case Ls:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case en:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case Dc:zt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Nc:zt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:zt("WebGLState: Invalid blending: ",U);break}M=null,x=null,E=null,R=null,y.set(0,0,0),A=0,p=U,P=le}return}St=St||mt,nt=nt||Z,Ut=Ut||gt,(mt!==b||St!==T)&&(s.blendEquationSeparate(he[mt],he[St]),b=mt,T=St),(Z!==M||gt!==x||nt!==E||Ut!==R)&&(s.blendFuncSeparate(et[Z],et[gt],et[nt],et[Ut]),M=Z,x=gt,E=nt,R=Ut),(Ct.equals(y)===!1||fe!==A)&&(s.blendColor(Ct.r,Ct.g,Ct.b,fe),y.copy(Ct),A=fe),p=U,P=!1}function ot(U,mt){U.side===ai?vt(s.CULL_FACE):tt(s.CULL_FACE);let Z=U.side===Ye;mt&&(Z=!Z),lt(Z),U.blending===Ls&&U.transparent===!1?rt(Mi):rt(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),a.setFunc(U.depthFunc),a.setTest(U.depthTest),a.setMask(U.depthWrite),r.setMask(U.colorWrite);let gt=U.stencilWrite;o.setTest(gt),gt&&(o.setMask(U.stencilWriteMask),o.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),o.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),Ft(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?tt(s.SAMPLE_ALPHA_TO_COVERAGE):vt(s.SAMPLE_ALPHA_TO_COVERAGE)}function lt(U){N!==U&&(U?s.frontFace(s.CW):s.frontFace(s.CCW),N=U)}function dt(U){U!==Yu?(tt(s.CULL_FACE),U!==O&&(U===Lc?s.cullFace(s.BACK):U===Ju?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):vt(s.CULL_FACE),O=U}function Ot(U){U!==V&&(W&&s.lineWidth(U),V=U)}function Ft(U,mt,Z){U?(tt(s.POLYGON_OFFSET_FILL),(D!==mt||B!==Z)&&(D=mt,B=Z,a.getReversed()&&(mt=-mt),s.polygonOffset(mt,Z))):vt(s.POLYGON_OFFSET_FILL)}function Gt(U){U?tt(s.SCISSOR_TEST):vt(s.SCISSOR_TEST)}function Xt(U){U===void 0&&(U=s.TEXTURE0+X-1),Q!==U&&(s.activeTexture(U),Q=U)}function I(U,mt,Z){Z===void 0&&(Q===null?Z=s.TEXTURE0+X-1:Z=Q);let gt=it[Z];gt===void 0&&(gt={type:void 0,texture:void 0},it[Z]=gt),(gt.type!==U||gt.texture!==mt)&&(Q!==Z&&(s.activeTexture(Z),Q=Z),s.bindTexture(U,mt||j[U]),gt.type=U,gt.texture=mt)}function oe(){let U=it[Q];U!==void 0&&U.type!==void 0&&(s.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function $t(){try{s.compressedTexImage2D(...arguments)}catch(U){zt("WebGLState:",U)}}function w(){try{s.compressedTexImage3D(...arguments)}catch(U){zt("WebGLState:",U)}}function _(){try{s.texSubImage2D(...arguments)}catch(U){zt("WebGLState:",U)}}function F(){try{s.texSubImage3D(...arguments)}catch(U){zt("WebGLState:",U)}}function z(){try{s.compressedTexSubImage2D(...arguments)}catch(U){zt("WebGLState:",U)}}function Y(){try{s.compressedTexSubImage3D(...arguments)}catch(U){zt("WebGLState:",U)}}function ct(){try{s.texStorage2D(...arguments)}catch(U){zt("WebGLState:",U)}}function ut(){try{s.texStorage3D(...arguments)}catch(U){zt("WebGLState:",U)}}function K(){try{s.texImage2D(...arguments)}catch(U){zt("WebGLState:",U)}}function $(){try{s.texImage3D(...arguments)}catch(U){zt("WebGLState:",U)}}function ft(U){return d[U]!==void 0?d[U]:s.getParameter(U)}function Dt(U,mt){d[U]!==mt&&(s.pixelStorei(U,mt),d[U]=mt)}function xt(U){ae.equals(U)===!1&&(s.scissor(U.x,U.y,U.z,U.w),ae.copy(U))}function pt(U){Zt.equals(U)===!1&&(s.viewport(U.x,U.y,U.z,U.w),Zt.copy(U))}function Nt(U,mt){let Z=l.get(mt);Z===void 0&&(Z=new WeakMap,l.set(mt,Z));let gt=Z.get(U);gt===void 0&&(gt=s.getUniformBlockIndex(mt,U.name),Z.set(U,gt))}function Bt(U,mt){let gt=l.get(mt).get(U);c.get(mt)!==gt&&(s.uniformBlockBinding(mt,gt,U.__bindingPointIndex),c.set(mt,gt))}function qt(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),a.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),h={},d={},Q=null,it={},u={},f=new WeakMap,m=[],v=null,g=!1,p=null,b=null,M=null,x=null,T=null,E=null,R=null,y=new Lt(0,0,0),A=0,P=!1,N=null,O=null,V=null,D=null,B=null,ae.set(0,0,s.canvas.width,s.canvas.height),Zt.set(0,0,s.canvas.width,s.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:tt,disable:vt,bindFramebuffer:Ht,drawBuffers:bt,useProgram:Vt,setBlending:rt,setMaterial:ot,setFlipSided:lt,setCullFace:dt,setLineWidth:Ot,setPolygonOffset:Ft,setScissorTest:Gt,activeTexture:Xt,bindTexture:I,unbindTexture:oe,compressedTexImage2D:$t,compressedTexImage3D:w,texImage2D:K,texImage3D:$,pixelStorei:Dt,getParameter:ft,updateUBOMapping:Nt,uniformBlockBinding:Bt,texStorage2D:ct,texStorage3D:ut,texSubImage2D:_,texSubImage3D:F,compressedTexSubImage2D:z,compressedTexSubImage3D:Y,scissor:xt,viewport:pt,reset:qt}}function bv(s,t,e,i,n,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new at,h=new WeakMap,d=new Set,u,f=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(w,_){return m?new OffscreenCanvas(w,_):cr("canvas")}function g(w,_,F){let z=1,Y=$t(w);if((Y.width>F||Y.height>F)&&(z=F/Math.max(Y.width,Y.height)),z<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){let ct=Math.floor(z*Y.width),ut=Math.floor(z*Y.height);u===void 0&&(u=v(ct,ut));let K=_?v(ct,ut):u;return K.width=ct,K.height=ut,K.getContext("2d").drawImage(w,0,0,ct,ut),kt("WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+ct+"x"+ut+")."),K}else return"data"in w&&kt("WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),w;return w}function p(w){return w.generateMipmaps}function b(w){s.generateMipmap(w)}function M(w){return w.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?s.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function x(w,_,F,z,Y,ct=!1){if(w!==null){if(s[w]!==void 0)return s[w];kt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let ut;z&&(ut=t.get("EXT_texture_norm16"),ut||kt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let K=_;if(_===s.RED&&(F===s.FLOAT&&(K=s.R32F),F===s.HALF_FLOAT&&(K=s.R16F),F===s.UNSIGNED_BYTE&&(K=s.R8),F===s.UNSIGNED_SHORT&&ut&&(K=ut.R16_EXT),F===s.SHORT&&ut&&(K=ut.R16_SNORM_EXT)),_===s.RED_INTEGER&&(F===s.UNSIGNED_BYTE&&(K=s.R8UI),F===s.UNSIGNED_SHORT&&(K=s.R16UI),F===s.UNSIGNED_INT&&(K=s.R32UI),F===s.BYTE&&(K=s.R8I),F===s.SHORT&&(K=s.R16I),F===s.INT&&(K=s.R32I)),_===s.RG&&(F===s.FLOAT&&(K=s.RG32F),F===s.HALF_FLOAT&&(K=s.RG16F),F===s.UNSIGNED_BYTE&&(K=s.RG8),F===s.UNSIGNED_SHORT&&ut&&(K=ut.RG16_EXT),F===s.SHORT&&ut&&(K=ut.RG16_SNORM_EXT)),_===s.RG_INTEGER&&(F===s.UNSIGNED_BYTE&&(K=s.RG8UI),F===s.UNSIGNED_SHORT&&(K=s.RG16UI),F===s.UNSIGNED_INT&&(K=s.RG32UI),F===s.BYTE&&(K=s.RG8I),F===s.SHORT&&(K=s.RG16I),F===s.INT&&(K=s.RG32I)),_===s.RGB_INTEGER&&(F===s.UNSIGNED_BYTE&&(K=s.RGB8UI),F===s.UNSIGNED_SHORT&&(K=s.RGB16UI),F===s.UNSIGNED_INT&&(K=s.RGB32UI),F===s.BYTE&&(K=s.RGB8I),F===s.SHORT&&(K=s.RGB16I),F===s.INT&&(K=s.RGB32I)),_===s.RGBA_INTEGER&&(F===s.UNSIGNED_BYTE&&(K=s.RGBA8UI),F===s.UNSIGNED_SHORT&&(K=s.RGBA16UI),F===s.UNSIGNED_INT&&(K=s.RGBA32UI),F===s.BYTE&&(K=s.RGBA8I),F===s.SHORT&&(K=s.RGBA16I),F===s.INT&&(K=s.RGBA32I)),_===s.RGB&&(F===s.UNSIGNED_SHORT&&ut&&(K=ut.RGB16_EXT),F===s.SHORT&&ut&&(K=ut.RGB16_SNORM_EXT),F===s.UNSIGNED_INT_5_9_9_9_REV&&(K=s.RGB9_E5),F===s.UNSIGNED_INT_10F_11F_11F_REV&&(K=s.R11F_G11F_B10F)),_===s.RGBA){let $=ct?lr:jt.getTransfer(Y);F===s.FLOAT&&(K=s.RGBA32F),F===s.HALF_FLOAT&&(K=s.RGBA16F),F===s.UNSIGNED_BYTE&&(K=$===re?s.SRGB8_ALPHA8:s.RGBA8),F===s.UNSIGNED_SHORT&&ut&&(K=ut.RGBA16_EXT),F===s.SHORT&&ut&&(K=ut.RGBA16_SNORM_EXT),F===s.UNSIGNED_SHORT_4_4_4_4&&(K=s.RGBA4),F===s.UNSIGNED_SHORT_5_5_5_1&&(K=s.RGB5_A1)}return(K===s.R16F||K===s.R32F||K===s.RG16F||K===s.RG32F||K===s.RGBA16F||K===s.RGBA32F)&&t.get("EXT_color_buffer_float"),K}function T(w,_){let F;return w?_===null||_===Pi||_===Ns?F=s.DEPTH24_STENCIL8:_===Ii?F=s.DEPTH32F_STENCIL8:_===Ds&&(F=s.DEPTH24_STENCIL8,kt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===Pi||_===Ns?F=s.DEPTH_COMPONENT24:_===Ii?F=s.DEPTH_COMPONENT32F:_===Ds&&(F=s.DEPTH_COMPONENT16),F}function E(w,_){return p(w)===!0||w.isFramebufferTexture&&w.minFilter!==ze&&w.minFilter!==Xe?Math.log2(Math.max(_.width,_.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?_.mipmaps.length:1}function R(w){let _=w.target;_.removeEventListener("dispose",R),A(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&d.delete(_)}function y(w){let _=w.target;_.removeEventListener("dispose",y),N(_)}function A(w){let _=i.get(w);if(_.__webglInit===void 0)return;let F=w.source,z=f.get(F);if(z){let Y=z[_.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&P(w),Object.keys(z).length===0&&f.delete(F)}i.remove(w)}function P(w){let _=i.get(w);s.deleteTexture(_.__webglTexture);let F=w.source,z=f.get(F);delete z[_.__cacheKey],a.memory.textures--}function N(w){let _=i.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),i.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let z=0;z<6;z++){if(Array.isArray(_.__webglFramebuffer[z]))for(let Y=0;Y<_.__webglFramebuffer[z].length;Y++)s.deleteFramebuffer(_.__webglFramebuffer[z][Y]);else s.deleteFramebuffer(_.__webglFramebuffer[z]);_.__webglDepthbuffer&&s.deleteRenderbuffer(_.__webglDepthbuffer[z])}else{if(Array.isArray(_.__webglFramebuffer))for(let z=0;z<_.__webglFramebuffer.length;z++)s.deleteFramebuffer(_.__webglFramebuffer[z]);else s.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&s.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&s.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let z=0;z<_.__webglColorRenderbuffer.length;z++)_.__webglColorRenderbuffer[z]&&s.deleteRenderbuffer(_.__webglColorRenderbuffer[z]);_.__webglDepthRenderbuffer&&s.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let F=w.textures;for(let z=0,Y=F.length;z<Y;z++){let ct=i.get(F[z]);ct.__webglTexture&&(s.deleteTexture(ct.__webglTexture),a.memory.textures--),i.remove(F[z])}i.remove(w)}let O=0;function V(){O=0}function D(){return O}function B(w){O=w}function X(){let w=O;return w>=n.maxTextures&&kt("WebGLTextures: Trying to use "+(w+1)+" texture units while this GPU supports only "+n.maxTextures),O+=1,w}function W(w){let _=[];return _.push(w.wrapS),_.push(w.wrapT),_.push(w.wrapR||0),_.push(w.magFilter),_.push(w.minFilter),_.push(w.anisotropy),_.push(w.internalFormat),_.push(w.format),_.push(w.type),_.push(w.generateMipmaps),_.push(w.premultiplyAlpha),_.push(w.flipY),_.push(w.unpackAlignment),_.push(w.colorSpace),_.join()}function st(w,_){let F=i.get(w);if(w.isVideoTexture&&I(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&F.__version!==w.version){let z=w.image;if(z===null)kt("WebGLRenderer: Texture marked for update but no image data found.");else if(z.complete===!1)kt("WebGLRenderer: Texture marked for update but image is incomplete");else{vt(F,w,_);return}}else w.isExternalTexture&&(F.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(s.TEXTURE_2D,F.__webglTexture,s.TEXTURE0+_)}function q(w,_){let F=i.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&F.__version!==w.version){vt(F,w,_);return}else w.isExternalTexture&&(F.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(s.TEXTURE_2D_ARRAY,F.__webglTexture,s.TEXTURE0+_)}function Q(w,_){let F=i.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&F.__version!==w.version){vt(F,w,_);return}e.bindTexture(s.TEXTURE_3D,F.__webglTexture,s.TEXTURE0+_)}function it(w,_){let F=i.get(w);if(w.isCubeDepthTexture!==!0&&w.version>0&&F.__version!==w.version){Ht(F,w,_);return}e.bindTexture(s.TEXTURE_CUBE_MAP,F.__webglTexture,s.TEXTURE0+_)}let It={[xs]:s.REPEAT,[Fi]:s.CLAMP_TO_EDGE,[Za]:s.MIRRORED_REPEAT},wt={[ze]:s.NEAREST,[gd]:s.NEAREST_MIPMAP_NEAREST,[zr]:s.NEAREST_MIPMAP_LINEAR,[Xe]:s.LINEAR,[Ro]:s.LINEAR_MIPMAP_NEAREST,[Gi]:s.LINEAR_MIPMAP_LINEAR},ae={[yd]:s.NEVER,[Ed]:s.ALWAYS,[Md]:s.LESS,[dl]:s.LEQUAL,[Sd]:s.EQUAL,[fl]:s.GEQUAL,[bd]:s.GREATER,[Td]:s.NOTEQUAL};function Zt(w,_){if(_.type===Ii&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===Xe||_.magFilter===Ro||_.magFilter===zr||_.magFilter===Gi||_.minFilter===Xe||_.minFilter===Ro||_.minFilter===zr||_.minFilter===Gi)&&kt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(w,s.TEXTURE_WRAP_S,It[_.wrapS]),s.texParameteri(w,s.TEXTURE_WRAP_T,It[_.wrapT]),(w===s.TEXTURE_3D||w===s.TEXTURE_2D_ARRAY)&&s.texParameteri(w,s.TEXTURE_WRAP_R,It[_.wrapR]),s.texParameteri(w,s.TEXTURE_MAG_FILTER,wt[_.magFilter]),s.texParameteri(w,s.TEXTURE_MIN_FILTER,wt[_.minFilter]),_.compareFunction&&(s.texParameteri(w,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(w,s.TEXTURE_COMPARE_FUNC,ae[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===ze||_.minFilter!==zr&&_.minFilter!==Gi||_.type===Ii&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||i.get(_).__currentAnisotropy){let F=t.get("EXT_texture_filter_anisotropic");s.texParameterf(w,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,n.getMaxAnisotropy())),i.get(_).__currentAnisotropy=_.anisotropy}}}function ne(w,_){let F=!1;w.__webglInit===void 0&&(w.__webglInit=!0,_.addEventListener("dispose",R));let z=_.source,Y=f.get(z);Y===void 0&&(Y={},f.set(z,Y));let ct=W(_);if(ct!==w.__cacheKey){Y[ct]===void 0&&(Y[ct]={texture:s.createTexture(),usedTimes:0},a.memory.textures++,F=!0),Y[ct].usedTimes++;let ut=Y[w.__cacheKey];ut!==void 0&&(Y[w.__cacheKey].usedTimes--,ut.usedTimes===0&&P(_)),w.__cacheKey=ct,w.__webglTexture=Y[ct].texture}return F}function j(w,_,F){return Math.floor(Math.floor(w/F)/_)}function tt(w,_,F,z){let ct=w.updateRanges;if(ct.length===0)e.texSubImage2D(s.TEXTURE_2D,0,0,0,_.width,_.height,F,z,_.data);else{ct.sort((Dt,xt)=>Dt.start-xt.start);let ut=0;for(let Dt=1;Dt<ct.length;Dt++){let xt=ct[ut],pt=ct[Dt],Nt=xt.start+xt.count,Bt=j(pt.start,_.width,4),qt=j(xt.start,_.width,4);pt.start<=Nt+1&&Bt===qt&&j(pt.start+pt.count-1,_.width,4)===Bt?xt.count=Math.max(xt.count,pt.start+pt.count-xt.start):(++ut,ct[ut]=pt)}ct.length=ut+1;let K=e.getParameter(s.UNPACK_ROW_LENGTH),$=e.getParameter(s.UNPACK_SKIP_PIXELS),ft=e.getParameter(s.UNPACK_SKIP_ROWS);e.pixelStorei(s.UNPACK_ROW_LENGTH,_.width);for(let Dt=0,xt=ct.length;Dt<xt;Dt++){let pt=ct[Dt],Nt=Math.floor(pt.start/4),Bt=Math.ceil(pt.count/4),qt=Nt%_.width,U=Math.floor(Nt/_.width),mt=Bt,Z=1;e.pixelStorei(s.UNPACK_SKIP_PIXELS,qt),e.pixelStorei(s.UNPACK_SKIP_ROWS,U),e.texSubImage2D(s.TEXTURE_2D,0,qt,U,mt,Z,F,z,_.data)}w.clearUpdateRanges(),e.pixelStorei(s.UNPACK_ROW_LENGTH,K),e.pixelStorei(s.UNPACK_SKIP_PIXELS,$),e.pixelStorei(s.UNPACK_SKIP_ROWS,ft)}}function vt(w,_,F){let z=s.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(z=s.TEXTURE_2D_ARRAY),_.isData3DTexture&&(z=s.TEXTURE_3D);let Y=ne(w,_),ct=_.source;e.bindTexture(z,w.__webglTexture,s.TEXTURE0+F);let ut=i.get(ct);if(ct.version!==ut.__version||Y===!0){if(e.activeTexture(s.TEXTURE0+F),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let Z=jt.getPrimaries(jt.workingColorSpace),gt=_.colorSpace===nn?null:jt.getPrimaries(_.colorSpace),St=_.colorSpace===nn||Z===gt?s.NONE:s.BROWSER_DEFAULT_WEBGL;e.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,St)}e.pixelStorei(s.UNPACK_ALIGNMENT,_.unpackAlignment);let $=g(_.image,!1,n.maxTextureSize);$=oe(_,$);let ft=r.convert(_.format,_.colorSpace),Dt=r.convert(_.type),xt=x(_.internalFormat,ft,Dt,_.normalized,_.colorSpace,_.isVideoTexture);Zt(z,_);let pt,Nt=_.mipmaps,Bt=_.isVideoTexture!==!0,qt=ut.__version===void 0||Y===!0,U=ct.dataReady,mt=E(_,$);if(_.isDepthTexture)xt=T(_.format===En,_.type),qt&&(Bt?e.texStorage2D(s.TEXTURE_2D,1,xt,$.width,$.height):e.texImage2D(s.TEXTURE_2D,0,xt,$.width,$.height,0,ft,Dt,null));else if(_.isDataTexture)if(Nt.length>0){Bt&&qt&&e.texStorage2D(s.TEXTURE_2D,mt,xt,Nt[0].width,Nt[0].height);for(let Z=0,gt=Nt.length;Z<gt;Z++)pt=Nt[Z],Bt?U&&e.texSubImage2D(s.TEXTURE_2D,Z,0,0,pt.width,pt.height,ft,Dt,pt.data):e.texImage2D(s.TEXTURE_2D,Z,xt,pt.width,pt.height,0,ft,Dt,pt.data);_.generateMipmaps=!1}else Bt?(qt&&e.texStorage2D(s.TEXTURE_2D,mt,xt,$.width,$.height),U&&tt(_,$,ft,Dt)):e.texImage2D(s.TEXTURE_2D,0,xt,$.width,$.height,0,ft,Dt,$.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Bt&&qt&&e.texStorage3D(s.TEXTURE_2D_ARRAY,mt,xt,Nt[0].width,Nt[0].height,$.depth);for(let Z=0,gt=Nt.length;Z<gt;Z++)if(pt=Nt[Z],_.format!==Si)if(ft!==null)if(Bt){if(U)if(_.layerUpdates.size>0){let St=$c(pt.width,pt.height,_.format,_.type);for(let nt of _.layerUpdates){let Ut=pt.data.subarray(nt*St/pt.data.BYTES_PER_ELEMENT,(nt+1)*St/pt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,Z,0,0,nt,pt.width,pt.height,1,ft,Ut)}}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,Z,0,0,0,pt.width,pt.height,$.depth,ft,pt.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,Z,xt,pt.width,pt.height,$.depth,0,pt.data,0,0);else kt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Bt?U&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,Z,0,0,0,pt.width,pt.height,$.depth,ft,Dt,pt.data):e.texImage3D(s.TEXTURE_2D_ARRAY,Z,xt,pt.width,pt.height,$.depth,0,ft,Dt,pt.data);_.layerUpdates.size>0&&_.clearLayerUpdates()}else{Bt&&qt&&e.texStorage2D(s.TEXTURE_2D,mt,xt,Nt[0].width,Nt[0].height);for(let Z=0,gt=Nt.length;Z<gt;Z++)pt=Nt[Z],_.format!==Si?ft!==null?Bt?U&&e.compressedTexSubImage2D(s.TEXTURE_2D,Z,0,0,pt.width,pt.height,ft,pt.data):e.compressedTexImage2D(s.TEXTURE_2D,Z,xt,pt.width,pt.height,0,pt.data):kt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Bt?U&&e.texSubImage2D(s.TEXTURE_2D,Z,0,0,pt.width,pt.height,ft,Dt,pt.data):e.texImage2D(s.TEXTURE_2D,Z,xt,pt.width,pt.height,0,ft,Dt,pt.data)}else if(_.isDataArrayTexture)if(Bt){if(qt&&e.texStorage3D(s.TEXTURE_2D_ARRAY,mt,xt,$.width,$.height,$.depth),U)if(_.layerUpdates.size>0){let Z=$c($.width,$.height,_.format,_.type);for(let gt of _.layerUpdates){let St=$.data.subarray(gt*Z/$.data.BYTES_PER_ELEMENT,(gt+1)*Z/$.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,gt,$.width,$.height,1,ft,Dt,St)}_.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,$.width,$.height,$.depth,ft,Dt,$.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,xt,$.width,$.height,$.depth,0,ft,Dt,$.data);else if(_.isData3DTexture)Bt?(qt&&e.texStorage3D(s.TEXTURE_3D,mt,xt,$.width,$.height,$.depth),U&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,$.width,$.height,$.depth,ft,Dt,$.data)):e.texImage3D(s.TEXTURE_3D,0,xt,$.width,$.height,$.depth,0,ft,Dt,$.data);else if(_.isFramebufferTexture){if(qt)if(Bt)e.texStorage2D(s.TEXTURE_2D,mt,xt,$.width,$.height);else{let Z=$.width,gt=$.height;for(let St=0;St<mt;St++)e.texImage2D(s.TEXTURE_2D,St,xt,Z,gt,0,ft,Dt,null),Z>>=1,gt>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in s){let Z=s.canvas;if(Z.hasAttribute("layoutsubtree")||Z.setAttribute("layoutsubtree","true"),$.parentNode!==Z){Z.appendChild($),d.add(_),Z.onpaint=gt=>{let St=gt.changedElements;for(let nt of d)St.includes(nt.image)&&(nt.needsUpdate=!0)},Z.requestPaint();return}if(s.texElementImage2D.length===3)s.texElementImage2D(s.TEXTURE_2D,s.RGBA8,$);else{let St=s.RGBA,nt=s.RGBA,Ut=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,0,St,nt,Ut,$)}s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(Nt.length>0){if(Bt&&qt){let Z=$t(Nt[0]);e.texStorage2D(s.TEXTURE_2D,mt,xt,Z.width,Z.height)}for(let Z=0,gt=Nt.length;Z<gt;Z++)pt=Nt[Z],Bt?U&&e.texSubImage2D(s.TEXTURE_2D,Z,0,0,ft,Dt,pt):e.texImage2D(s.TEXTURE_2D,Z,xt,ft,Dt,pt);_.generateMipmaps=!1}else if(Bt){if(qt){let Z=$t($);e.texStorage2D(s.TEXTURE_2D,mt,xt,Z.width,Z.height)}U&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,ft,Dt,$)}else e.texImage2D(s.TEXTURE_2D,0,xt,ft,Dt,$);p(_)&&b(z),ut.__version=ct.version,_.onUpdate&&_.onUpdate(_)}w.__version=_.version}function Ht(w,_,F){if(_.image.length!==6)return;let z=ne(w,_),Y=_.source;e.bindTexture(s.TEXTURE_CUBE_MAP,w.__webglTexture,s.TEXTURE0+F);let ct=i.get(Y);if(Y.version!==ct.__version||z===!0){e.activeTexture(s.TEXTURE0+F);let ut=jt.getPrimaries(jt.workingColorSpace),K=_.colorSpace===nn?null:jt.getPrimaries(_.colorSpace),$=_.colorSpace===nn||ut===K?s.NONE:s.BROWSER_DEFAULT_WEBGL;e.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(s.UNPACK_ALIGNMENT,_.unpackAlignment),e.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,$);let ft=_.isCompressedTexture||_.image[0].isCompressedTexture,Dt=_.image[0]&&_.image[0].isDataTexture,xt=[];for(let nt=0;nt<6;nt++)!ft&&!Dt?xt[nt]=g(_.image[nt],!0,n.maxCubemapSize):xt[nt]=Dt?_.image[nt].image:_.image[nt],xt[nt]=oe(_,xt[nt]);let pt=xt[0],Nt=r.convert(_.format,_.colorSpace),Bt=r.convert(_.type),qt=x(_.internalFormat,Nt,Bt,_.normalized,_.colorSpace),U=_.isVideoTexture!==!0,mt=ct.__version===void 0||z===!0,Z=Y.dataReady,gt=E(_,pt);Zt(s.TEXTURE_CUBE_MAP,_);let St;if(ft){U&&mt&&e.texStorage2D(s.TEXTURE_CUBE_MAP,gt,qt,pt.width,pt.height);for(let nt=0;nt<6;nt++){St=xt[nt].mipmaps;for(let Ut=0;Ut<St.length;Ut++){let Ct=St[Ut];_.format!==Si?Nt!==null?U?Z&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut,0,0,Ct.width,Ct.height,Nt,Ct.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut,qt,Ct.width,Ct.height,0,Ct.data):kt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut,0,0,Ct.width,Ct.height,Nt,Bt,Ct.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut,qt,Ct.width,Ct.height,0,Nt,Bt,Ct.data)}}}else{if(St=_.mipmaps,U&&mt){St.length>0&&gt++;let nt=$t(xt[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,gt,qt,nt.width,nt.height)}for(let nt=0;nt<6;nt++)if(Dt){U?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,xt[nt].width,xt[nt].height,Nt,Bt,xt[nt].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,qt,xt[nt].width,xt[nt].height,0,Nt,Bt,xt[nt].data);for(let Ut=0;Ut<St.length;Ut++){let fe=St[Ut].image[nt].image;U?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut+1,0,0,fe.width,fe.height,Nt,Bt,fe.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut+1,qt,fe.width,fe.height,0,Nt,Bt,fe.data)}}else{U?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,Nt,Bt,xt[nt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,qt,Nt,Bt,xt[nt]);for(let Ut=0;Ut<St.length;Ut++){let Ct=St[Ut];U?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut+1,0,0,Nt,Bt,Ct.image[nt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Ut+1,qt,Nt,Bt,Ct.image[nt])}}}p(_)&&b(s.TEXTURE_CUBE_MAP),ct.__version=Y.version,_.onUpdate&&_.onUpdate(_)}w.__version=_.version}function bt(w,_,F,z,Y,ct){let ut=r.convert(F.format,F.colorSpace),K=r.convert(F.type),$=x(F.internalFormat,ut,K,F.normalized,F.colorSpace),ft=i.get(_),Dt=i.get(F);if(Dt.__renderTarget=_,!ft.__hasExternalTextures){let xt=Math.max(1,_.width>>ct),pt=Math.max(1,_.height>>ct);Y===s.TEXTURE_3D||Y===s.TEXTURE_2D_ARRAY?e.texImage3D(Y,ct,$,xt,pt,_.depth,0,ut,K,null):e.texImage2D(Y,ct,$,xt,pt,0,ut,K,null)}e.bindFramebuffer(s.FRAMEBUFFER,w),Xt(_)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,z,Y,Dt.__webglTexture,0,Gt(_)):(Y===s.TEXTURE_2D||Y>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,z,Y,Dt.__webglTexture,ct),e.bindFramebuffer(s.FRAMEBUFFER,null)}function Vt(w,_,F){if(s.bindRenderbuffer(s.RENDERBUFFER,w),_.depthBuffer){let z=_.depthTexture,Y=z&&z.isDepthTexture?z.type:null,ct=T(_.stencilBuffer,Y),ut=_.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;Xt(_)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Gt(_),ct,_.width,_.height):F?s.renderbufferStorageMultisample(s.RENDERBUFFER,Gt(_),ct,_.width,_.height):s.renderbufferStorage(s.RENDERBUFFER,ct,_.width,_.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,ut,s.RENDERBUFFER,w)}else{let z=_.textures;for(let Y=0;Y<z.length;Y++){let ct=z[Y],ut=r.convert(ct.format,ct.colorSpace),K=r.convert(ct.type),$=x(ct.internalFormat,ut,K,ct.normalized,ct.colorSpace);Xt(_)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Gt(_),$,_.width,_.height):F?s.renderbufferStorageMultisample(s.RENDERBUFFER,Gt(_),$,_.width,_.height):s.renderbufferStorage(s.RENDERBUFFER,$,_.width,_.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function he(w,_,F){let z=_.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(s.FRAMEBUFFER,w),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Y=i.get(_.depthTexture);if(Y.__renderTarget=_,(!Y.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),z){if(Y.__webglInit===void 0&&(Y.__webglInit=!0,_.depthTexture.addEventListener("dispose",R)),Y.__webglTexture===void 0){Y.__webglTexture=s.createTexture(),e.bindTexture(s.TEXTURE_CUBE_MAP,Y.__webglTexture),Zt(s.TEXTURE_CUBE_MAP,_.depthTexture);let ft=r.convert(_.depthTexture.format),Dt=r.convert(_.depthTexture.type),xt;_.depthTexture.format===Bi?xt=s.DEPTH_COMPONENT24:_.depthTexture.format===En&&(xt=s.DEPTH24_STENCIL8);for(let pt=0;pt<6;pt++)s.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,xt,_.width,_.height,0,ft,Dt,null)}}else st(_.depthTexture,0);let ct=Y.__webglTexture,ut=Gt(_),K=z?s.TEXTURE_CUBE_MAP_POSITIVE_X+F:s.TEXTURE_2D,$=_.depthTexture.format===En?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(_.depthTexture.format===Bi)Xt(_)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,$,K,ct,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,$,K,ct,0);else if(_.depthTexture.format===En)Xt(_)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,$,K,ct,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,$,K,ct,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function et(w){let _=i.get(w),F=w.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==w.depthTexture){let z=w.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),z){let Y=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,z.removeEventListener("dispose",Y)};z.addEventListener("dispose",Y),_.__depthDisposeCallback=Y}_.__boundDepthTexture=z}if(w.depthTexture&&!_.__autoAllocateDepthBuffer)if(F)for(let z=0;z<6;z++)he(_.__webglFramebuffer[z],w,z);else{let z=w.texture.mipmaps;z&&z.length>0?he(_.__webglFramebuffer[0],w,0):he(_.__webglFramebuffer,w,0)}else if(F){_.__webglDepthbuffer=[];for(let z=0;z<6;z++)if(e.bindFramebuffer(s.FRAMEBUFFER,_.__webglFramebuffer[z]),_.__webglDepthbuffer[z]===void 0)_.__webglDepthbuffer[z]=s.createRenderbuffer(),Vt(_.__webglDepthbuffer[z],w,!1);else{let Y=w.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ct=_.__webglDepthbuffer[z];s.bindRenderbuffer(s.RENDERBUFFER,ct),s.framebufferRenderbuffer(s.FRAMEBUFFER,Y,s.RENDERBUFFER,ct)}}else{let z=w.texture.mipmaps;if(z&&z.length>0?e.bindFramebuffer(s.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(s.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=s.createRenderbuffer(),Vt(_.__webglDepthbuffer,w,!1);else{let Y=w.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ct=_.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,ct),s.framebufferRenderbuffer(s.FRAMEBUFFER,Y,s.RENDERBUFFER,ct)}}e.bindFramebuffer(s.FRAMEBUFFER,null)}function rt(w,_,F){let z=i.get(w);_!==void 0&&bt(z.__webglFramebuffer,w,w.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),F!==void 0&&et(w)}function ot(w){let _=w.texture,F=i.get(w),z=i.get(_);w.addEventListener("dispose",y);let Y=w.textures,ct=w.isWebGLCubeRenderTarget===!0,ut=Y.length>1;if(ut||(z.__webglTexture===void 0&&(z.__webglTexture=s.createTexture()),z.__version=_.version,a.memory.textures++),ct){F.__webglFramebuffer=[];for(let K=0;K<6;K++)if(_.mipmaps&&_.mipmaps.length>0){F.__webglFramebuffer[K]=[];for(let $=0;$<_.mipmaps.length;$++)F.__webglFramebuffer[K][$]=s.createFramebuffer()}else F.__webglFramebuffer[K]=s.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){F.__webglFramebuffer=[];for(let K=0;K<_.mipmaps.length;K++)F.__webglFramebuffer[K]=s.createFramebuffer()}else F.__webglFramebuffer=s.createFramebuffer();if(ut)for(let K=0,$=Y.length;K<$;K++){let ft=i.get(Y[K]);ft.__webglTexture===void 0&&(ft.__webglTexture=s.createTexture(),a.memory.textures++)}if(w.samples>0&&Xt(w)===!1){F.__webglMultisampledFramebuffer=s.createFramebuffer(),F.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let K=0;K<Y.length;K++){let $=Y[K];F.__webglColorRenderbuffer[K]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,F.__webglColorRenderbuffer[K]);let ft=r.convert($.format,$.colorSpace),Dt=r.convert($.type),xt=x($.internalFormat,ft,Dt,$.normalized,$.colorSpace,w.isXRRenderTarget===!0),pt=Gt(w);s.renderbufferStorageMultisample(s.RENDERBUFFER,pt,xt,w.width,w.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+K,s.RENDERBUFFER,F.__webglColorRenderbuffer[K])}s.bindRenderbuffer(s.RENDERBUFFER,null),w.depthBuffer&&(F.__webglDepthRenderbuffer=s.createRenderbuffer(),Vt(F.__webglDepthRenderbuffer,w,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(ct){e.bindTexture(s.TEXTURE_CUBE_MAP,z.__webglTexture),Zt(s.TEXTURE_CUBE_MAP,_);for(let K=0;K<6;K++)if(_.mipmaps&&_.mipmaps.length>0)for(let $=0;$<_.mipmaps.length;$++)bt(F.__webglFramebuffer[K][$],w,_,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+K,$);else bt(F.__webglFramebuffer[K],w,_,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+K,0);p(_)&&b(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(ut){for(let K=0,$=Y.length;K<$;K++){let ft=Y[K],Dt=i.get(ft),xt=s.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(xt=w.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(xt,Dt.__webglTexture),Zt(xt,ft),bt(F.__webglFramebuffer,w,ft,s.COLOR_ATTACHMENT0+K,xt,0),p(ft)&&b(xt)}e.unbindTexture()}else{let K=s.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(K=w.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(K,z.__webglTexture),Zt(K,_),_.mipmaps&&_.mipmaps.length>0)for(let $=0;$<_.mipmaps.length;$++)bt(F.__webglFramebuffer[$],w,_,s.COLOR_ATTACHMENT0,K,$);else bt(F.__webglFramebuffer,w,_,s.COLOR_ATTACHMENT0,K,0);p(_)&&b(K),e.unbindTexture()}w.depthBuffer&&et(w)}function lt(w){let _=w.textures;for(let F=0,z=_.length;F<z;F++){let Y=_[F];if(p(Y)){let ct=M(w),ut=i.get(Y).__webglTexture;e.bindTexture(ct,ut),b(ct),e.unbindTexture()}}}let dt=[],Ot=[];function Ft(w){if(w.samples>0){if(Xt(w)===!1){let _=w.textures,F=w.width,z=w.height,Y=s.COLOR_BUFFER_BIT,ct=w.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ut=i.get(w),K=_.length>1;if(K)for(let ft=0;ft<_.length;ft++)e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ft,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+ft,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,ut.__webglMultisampledFramebuffer);let $=w.texture.mipmaps;$&&$.length>0?e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ut.__webglFramebuffer[0]):e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ut.__webglFramebuffer);for(let ft=0;ft<_.length;ft++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(Y|=s.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(Y|=s.STENCIL_BUFFER_BIT)),K){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,ut.__webglColorRenderbuffer[ft]);let Dt=i.get(_[ft]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Dt,0)}s.blitFramebuffer(0,0,F,z,0,0,F,z,Y,s.NEAREST),c===!0&&(dt.length=0,Ot.length=0,dt.push(s.COLOR_ATTACHMENT0+ft),w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&(dt.push(ct),Ot.push(ct),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,Ot)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,dt))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),K)for(let ft=0;ft<_.length;ft++){e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ft,s.RENDERBUFFER,ut.__webglColorRenderbuffer[ft]);let Dt=i.get(_[ft]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+ft,s.TEXTURE_2D,Dt,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ut.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&c){let _=w.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[_])}}}function Gt(w){return Math.min(n.maxSamples,w.samples)}function Xt(w){let _=i.get(w);return w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function I(w){let _=a.render.frame;h.get(w)!==_&&(h.set(w,_),w.update())}function oe(w,_){let F=w.colorSpace,z=w.format,Y=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||F!==or&&F!==nn&&(jt.getTransfer(F)===re?(z!==Si||Y!==oi)&&kt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):zt("WebGLTextures: Unsupported texture color space:",F)),_}function $t(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(l.width=w.naturalWidth||w.width,l.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(l.width=w.displayWidth,l.height=w.displayHeight):(l.width=w.width,l.height=w.height),l}this.allocateTextureUnit=X,this.resetTextureUnits=V,this.getTextureUnits=D,this.setTextureUnits=B,this.setTexture2D=st,this.setTexture2DArray=q,this.setTexture3D=Q,this.setTextureCube=it,this.rebindTextures=rt,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=lt,this.updateMultisampleRenderTarget=Ft,this.setupDepthRenderbuffer=et,this.setupFrameBufferTexture=bt,this.useMultisampledRTT=Xt,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function Tv(s,t){function e(i,n=nn){let r,a=jt.getTransfer(n);if(i===oi)return s.UNSIGNED_BYTE;if(i===Po)return s.UNSIGNED_SHORT_4_4_4_4;if(i===Io)return s.UNSIGNED_SHORT_5_5_5_1;if(i===zc)return s.UNSIGNED_INT_5_9_9_9_REV;if(i===Vc)return s.UNSIGNED_INT_10F_11F_11F_REV;if(i===kc)return s.BYTE;if(i===Hc)return s.SHORT;if(i===Ds)return s.UNSIGNED_SHORT;if(i===Co)return s.INT;if(i===Pi)return s.UNSIGNED_INT;if(i===Ii)return s.FLOAT;if(i===Ne)return s.HALF_FLOAT;if(i===Gc)return s.ALPHA;if(i===Wc)return s.RGB;if(i===Si)return s.RGBA;if(i===Bi)return s.DEPTH_COMPONENT;if(i===En)return s.DEPTH_STENCIL;if(i===Xc)return s.RED;if(i===Lo)return s.RED_INTEGER;if(i===wn)return s.RG;if(i===Do)return s.RG_INTEGER;if(i===No)return s.RGBA_INTEGER;if(i===Vr||i===Gr||i===Wr||i===Xr)if(a===re)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Vr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Gr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Wr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Xr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Vr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Gr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Wr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Xr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Uo||i===Fo||i===Oo||i===Bo)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===Uo)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Fo)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Oo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Bo)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ko||i===Ho||i===zo||i===Vo||i===Go||i===qr||i===Wo)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===ko||i===Ho)return a===re?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===zo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===Vo)return r.COMPRESSED_R11_EAC;if(i===Go)return r.COMPRESSED_SIGNED_R11_EAC;if(i===qr)return r.COMPRESSED_RG11_EAC;if(i===Wo)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Xo||i===qo||i===Yo||i===Jo||i===Ko||i===jo||i===Zo||i===$o||i===Qo||i===tl||i===el||i===il||i===nl||i===sl)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===Xo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===qo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Yo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Jo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ko)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===jo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Zo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===$o)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Qo)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===tl)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===el)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===il)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===nl)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===sl)return a===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===rl||i===al||i===ol)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===rl)return a===re?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===al)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===ol)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ll||i===cl||i===Yr||i===hl)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===ll)return r.COMPRESSED_RED_RGTC1_EXT;if(i===cl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Yr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===hl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ns?s.UNSIGNED_INT_24_8:s[i]!==void 0?s[i]:null}return{convert:e}}var Ev=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,wv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,xh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let i=new mr(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,i=new Pe({vertexShader:Ev,fragmentShader:wv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ht(new qe(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},_h=class extends ki{constructor(t,e){super();let i=this,n=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,d=null,u=null,f=null,m=null,v=typeof XRWebGLBinding<"u",g=new xh,p={},b=e.getContextAttributes(),M=null,x=null,T=[],E=[],R=new at,y=null,A=null,P=new We;P.viewport=new Me;let N=new We;N.viewport=new Me;let O=[P,N],V=new To,D=null,B=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let tt=T[j];return tt===void 0&&(tt=new Ms,T[j]=tt),tt.getTargetRaySpace()},this.getControllerGrip=function(j){let tt=T[j];return tt===void 0&&(tt=new Ms,T[j]=tt),tt.getGripSpace()},this.getHand=function(j){let tt=T[j];return tt===void 0&&(tt=new Ms,T[j]=tt),tt.getHandSpace()};function X(j){let tt=E.indexOf(j.inputSource);if(tt===-1)return;let vt=T[tt];vt!==void 0&&(vt.update(j.inputSource,j.frame,l||a),vt.dispatchEvent({type:j.type,data:j.inputSource}))}function W(){n.removeEventListener("select",X),n.removeEventListener("selectstart",X),n.removeEventListener("selectend",X),n.removeEventListener("squeeze",X),n.removeEventListener("squeezestart",X),n.removeEventListener("squeezeend",X),n.removeEventListener("end",W),n.removeEventListener("inputsourceschange",st);for(let j=0;j<T.length;j++){let tt=E[j];tt!==null&&(E[j]=null,T[j].disconnect(tt))}D=null,B=null,g.reset();for(let j in p)delete p[j];if(t.setRenderTarget(M),f=null,u=null,d=null,n=null,x=null,ne.stop(),i.isPresenting=!1,t.setPixelRatio(y),t.setSize(R.width,R.height,!1),A!==null){let j=A.camera;j.fov=A.fov,j.zoom=A.zoom,j.updateProjectionMatrix(),A=null}i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){r=j,i.isPresenting===!0&&kt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){o=j,i.isPresenting===!0&&kt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(j){l=j},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&v&&(d=new XRWebGLBinding(n,e)),d},this.getFrame=function(){return m},this.getSession=function(){return n},this.setSession=async function(j){if(n=j,n!==null){if(M=t.getRenderTarget(),n.addEventListener("select",X),n.addEventListener("selectstart",X),n.addEventListener("selectend",X),n.addEventListener("squeeze",X),n.addEventListener("squeezestart",X),n.addEventListener("squeezeend",X),n.addEventListener("end",W),n.addEventListener("inputsourceschange",st),b.xrCompatible!==!0&&await e.makeXRCompatible(),y=t.getPixelRatio(),t.getSize(R),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let vt=null,Ht=null,bt=null;b.depth&&(bt=b.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,vt=b.stencil?En:Bi,Ht=b.stencil?Ns:Pi);let Vt={colorFormat:e.RGBA8,depthFormat:bt,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Vt),n.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),x=new Te(u.textureWidth,u.textureHeight,{format:Si,type:oi,depthTexture:new xn(u.textureWidth,u.textureHeight,Ht,void 0,void 0,void 0,void 0,void 0,void 0,vt),stencilBuffer:b.stencil,colorSpace:t.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let vt={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(n,e,vt),n.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new Te(f.framebufferWidth,f.framebufferHeight,{format:Si,type:oi,colorSpace:t.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await n.requestReferenceSpace(o),ne.setContext(n),ne.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(n!==null)return n.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function st(j){for(let tt=0;tt<j.removed.length;tt++){let vt=j.removed[tt],Ht=E.indexOf(vt);Ht>=0&&(E[Ht]=null,T[Ht].disconnect(vt))}for(let tt=0;tt<j.added.length;tt++){let vt=j.added[tt],Ht=E.indexOf(vt);if(Ht===-1){for(let Vt=0;Vt<T.length;Vt++)if(Vt>=E.length){E.push(vt),Ht=Vt;break}else if(E[Vt]===null){E[Vt]=vt,Ht=Vt;break}if(Ht===-1)break}let bt=T[Ht];bt&&bt.connect(vt)}}let q=new C,Q=new C;function it(j,tt,vt){q.setFromMatrixPosition(tt.matrixWorld),Q.setFromMatrixPosition(vt.matrixWorld);let Ht=q.distanceTo(Q),bt=tt.projectionMatrix.elements,Vt=vt.projectionMatrix.elements,he=bt[14]/(bt[10]-1),et=bt[14]/(bt[10]+1),rt=(bt[9]+1)/bt[5],ot=(bt[9]-1)/bt[5],lt=(bt[8]-1)/bt[0],dt=(Vt[8]+1)/Vt[0],Ot=he*lt,Ft=he*dt,Gt=Ht/(-lt+dt),Xt=Gt*-lt;if(tt.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(Xt),j.translateZ(Gt),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),bt[10]===-1)j.projectionMatrix.copy(tt.projectionMatrix),j.projectionMatrixInverse.copy(tt.projectionMatrixInverse);else{let I=he+Gt,oe=et+Gt,$t=Ot-Xt,w=Ft+(Ht-Xt),_=rt*et/oe*I,F=ot*et/oe*I;j.projectionMatrix.makePerspective($t,w,_,F,I,oe),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function It(j,tt){tt===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(tt.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(n===null)return;let tt=j.near,vt=j.far;g.texture!==null&&(g.depthNear>0&&(tt=g.depthNear),g.depthFar>0&&(vt=g.depthFar)),V.near=N.near=P.near=tt,V.far=N.far=P.far=vt,(D!==V.near||B!==V.far)&&(n.updateRenderState({depthNear:V.near,depthFar:V.far}),D=V.near,B=V.far),V.layers.mask=j.layers.mask|6,P.layers.mask=V.layers.mask&-5,N.layers.mask=V.layers.mask&-3;let Ht=j.parent,bt=V.cameras;It(V,Ht);for(let Vt=0;Vt<bt.length;Vt++)It(bt[Vt],Ht);bt.length===2?it(V,P,N):V.projectionMatrix.copy(P.projectionMatrix),A===null&&j.isPerspectiveCamera&&(A={camera:j,fov:j.fov,zoom:j.zoom}),wt(j,V,Ht)};function wt(j,tt,vt){vt===null?j.matrix.copy(tt.matrixWorld):(j.matrix.copy(vt.matrixWorld),j.matrix.invert(),j.matrix.multiply(tt.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(tt.projectionMatrix),j.projectionMatrixInverse.copy(tt.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=Qa*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(u===null&&f===null))return c},this.setFoveation=function(j){c=j,u!==null&&(u.fixedFoveation=j),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=j)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(V)},this.getCameraTexture=function(j){return p[j]};let ae=null;function Zt(j,tt){if(h=tt.getViewerPose(l||a),m=tt,h!==null){let vt=h.views;f!==null&&(t.setRenderTargetFramebuffer(x,f.framebuffer),t.setRenderTarget(x));let Ht=!1;vt.length!==V.cameras.length&&(V.cameras.length=0,Ht=!0);for(let et=0;et<vt.length;et++){let rt=vt[et],ot=null;if(f!==null)ot=f.getViewport(rt);else{let dt=d.getViewSubImage(u,rt);ot=dt.viewport,et===0&&(t.setRenderTargetTextures(x,dt.colorTexture,dt.depthStencilTexture),t.setRenderTarget(x))}let lt=O[et];lt===void 0&&(lt=new We,lt.layers.enable(et),lt.viewport=new Me,O[et]=lt),lt.matrix.fromArray(rt.transform.matrix),lt.matrix.decompose(lt.position,lt.quaternion,lt.scale),lt.projectionMatrix.fromArray(rt.projectionMatrix),lt.projectionMatrixInverse.copy(lt.projectionMatrix).invert(),lt.viewport.set(ot.x,ot.y,ot.width,ot.height),et===0&&(V.matrix.copy(lt.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),Ht===!0&&V.cameras.push(lt)}let bt=n.enabledFeatures;if(bt&&bt.includes("depth-sensing")&&n.depthUsage=="gpu-optimized"&&v){d=i.getBinding();let et=d.getDepthInformation(vt[0]);et&&et.isValid&&et.texture&&g.init(et,n.renderState)}if(bt&&bt.includes("camera-access")&&v){t.state.unbindTexture(),d=i.getBinding();for(let et=0;et<vt.length;et++){let rt=vt[et].camera;if(rt){let ot=p[rt];ot||(ot=new mr,p[rt]=ot);let lt=d.getCameraImage(rt);ot.sourceTexture=lt}}}}for(let vt=0;vt<T.length;vt++){let Ht=E[vt],bt=T[vt];Ht!==null&&bt!==void 0&&bt.update(Ht,tt,l||a)}ae&&ae(j,tt),tt.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:tt}),m=null}let ne=new af;ne.setAnimationLoop(Zt),this.setAnimationLoop=function(j){ae=j},this.dispose=function(){}}},Av=new ye,df=new Wt;df.set(-1,0,0,0,1,0,0,0,1);function Rv(s,t){function e(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function i(g,p){p.color.getRGB(g.fogColor.value,Kc(s)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function n(g,p,b,M,x){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(g,p):p.isMeshLambertMaterial?(r(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(g,p),d(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(g,p),u(g,p),p.isMeshPhysicalMaterial&&f(g,p,x)):p.isMeshMatcapMaterial?(r(g,p),m(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),v(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(a(g,p),p.isLineDashedMaterial&&o(g,p)):p.isPointsMaterial?c(g,p,b,M):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,e(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,e(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,e(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Ye&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,e(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Ye&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,e(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,e(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let b=t.get(p),M=b.envMap,x=b.envMapRotation;M&&(g.envMap.value=M,g.envMapRotation.value.setFromMatrix4(Av.makeRotationFromEuler(x)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(df),g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,g.aoMapTransform))}function a(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,e(p.map,g.mapTransform))}function o(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,b,M){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*b,g.scale.value=M*.5,p.map&&(g.map.value=p.map,e(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,e(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,e(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,e(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function d(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function u(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function f(g,p,b){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Ye&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.retroreflectivity>0&&(g.retroreflectivity.value=p.retroreflectivity),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=b.texture,g.transmissionSamplerSize.value.set(b.width,b.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function v(g,p){let b=t.get(p).light;g.referencePosition.value.setFromMatrixPosition(b.matrixWorld),g.nearDistance.value=b.shadow.camera.near,g.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:n}}function Cv(s,t,e,i){let n={},r={},a=[],o=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function c(x,T){let E=T.program;i.uniformBlockBinding(x,E)}function l(x,T){let E=n[x.id];E===void 0&&(g(x),E=h(x),n[x.id]=E,x.addEventListener("dispose",b));let R=T.program;i.updateUBOMapping(x,R);let y=t.render.frame;r[x.id]!==y&&(u(x),r[x.id]=y)}function h(x){let T=d();x.__bindingPointIndex=T;let E=s.createBuffer(),R=x.__size,y=x.usage;return s.bindBuffer(s.UNIFORM_BUFFER,E),s.bufferData(s.UNIFORM_BUFFER,R,y),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,T,E),E}function d(){for(let x=0;x<o;x++)if(a.indexOf(x)===-1)return a.push(x),x;return zt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(x){let T=n[x.id],E=x.uniforms,R=x.__cache;s.bindBuffer(s.UNIFORM_BUFFER,T);for(let y=0,A=E.length;y<A;y++){let P=E[y];if(Array.isArray(P))for(let N=0,O=P.length;N<O;N++)f(P[N],y,N,R);else f(P,y,0,R)}s.bindBuffer(s.UNIFORM_BUFFER,null)}function f(x,T,E,R){if(v(x,T,E,R)===!0){let y=x.__offset,A=x.value;if(Array.isArray(A)){let P=0;for(let N=0;N<A.length;N++){let O=A[N],V=p(O);m(O,x.__data,P),typeof O!="number"&&typeof O!="boolean"&&!O.isMatrix3&&!ArrayBuffer.isView(O)&&(P+=V.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(A,x.__data,0);s.bufferSubData(s.UNIFORM_BUFFER,y,x.__data)}}function m(x,T,E){typeof x=="number"||typeof x=="boolean"?T[0]=x:x.isMatrix3?(T[0]=x.elements[0],T[1]=x.elements[1],T[2]=x.elements[2],T[3]=0,T[4]=x.elements[3],T[5]=x.elements[4],T[6]=x.elements[5],T[7]=0,T[8]=x.elements[6],T[9]=x.elements[7],T[10]=x.elements[8],T[11]=0):ArrayBuffer.isView(x)?T.set(new x.constructor(x.buffer,x.byteOffset,T.length)):x.toArray(T,E)}function v(x,T,E,R){let y=x.value,A=T+"_"+E;if(R[A]===void 0)return typeof y=="number"||typeof y=="boolean"?R[A]=y:ArrayBuffer.isView(y)?R[A]=y.slice():R[A]=y.clone(),!0;{let P=R[A];if(typeof y=="number"||typeof y=="boolean"){if(P!==y)return R[A]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(P.equals(y)===!1)return P.copy(y),!0}}return!1}function g(x){let T=x.uniforms,E=0,R=16;for(let A=0,P=T.length;A<P;A++){let N=Array.isArray(T[A])?T[A]:[T[A]];for(let O=0,V=N.length;O<V;O++){let D=N[O],B=Array.isArray(D.value)?D.value:[D.value];for(let X=0,W=B.length;X<W;X++){let st=B[X],q=p(st),Q=E%R,it=Q%q.boundary,It=Q+it;E+=it,It!==0&&R-It<q.storage&&(E+=R-It),D.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),D.__offset=E,E+=q.storage}}}let y=E%R;return y>0&&(E+=R-y),x.__size=E,x.__cache={},this}function p(x){let T={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(T.boundary=4,T.storage=4):x.isVector2?(T.boundary=8,T.storage=8):x.isVector3||x.isColor?(T.boundary=16,T.storage=12):x.isVector4?(T.boundary=16,T.storage=16):x.isMatrix3?(T.boundary=48,T.storage=48):x.isMatrix4?(T.boundary=64,T.storage=64):x.isTexture?kt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(T.boundary=16,T.storage=x.byteLength):kt("WebGLRenderer: Unsupported uniform value type.",x),T}function b(x){let T=x.target;T.removeEventListener("dispose",b);let E=a.indexOf(T.__bindingPointIndex);a.splice(E,1),s.deleteBuffer(n[T.id]),delete n[T.id],delete r[T.id]}function M(){for(let x in n)s.deleteBuffer(n[x]);a=[],n={},r={}}return{bind:c,update:l,dispose:M}}var Pv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Wi=null;function Iv(){return Wi===null&&(Wi=new so(Pv,16,16,wn,Ne),Wi.name="DFG_LUT",Wi.minFilter=Xe,Wi.magFilter=Xe,Wi.wrapS=Fi,Wi.wrapT=Fi,Wi.generateMipmaps=!1,Wi.needsUpdate=!0),Wi}var gl=class{constructor(t={}){let{canvas:e=Ad(),context:i=null,depth:n=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=oi}=t;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=a;let v=f,g=new Set([No,Do,Lo]),p=new Set([oi,Pi,Ds,Ns,Po,Io]),b=new Uint32Array(4),M=new Int32Array(4),x=new C,T=null,E=null,R=[],y=[],A=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Ci,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,N=!1,O=null,V=null,D=null,B=null;this._outputColorSpace=Ze;let X=0,W=0,st=null,q=-1,Q=null,it=new Me,It=new Me,wt=null,ae=new Lt(0),Zt=0,ne=e.width,j=e.height,tt=1,vt=null,Ht=null,bt=new Me(0,0,ne,j),Vt=new Me(0,0,ne,j),he=!1,et=new Ts,rt=!1,ot=!1,lt=new ye,dt=new C,Ot=new Me,Ft={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Gt=!1;function Xt(){return st===null?tt:1}let I=i;function oe(S,L){return e.getContext(S,L)}let $t,w,_,F,z,Y,ct,ut,K,$,ft,Dt,xt,pt,Nt,Bt,qt,U,mt,Z,gt,St,nt;try{let S={alpha:!0,depth:n,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",fe,!1),e.addEventListener("webglcontextrestored",le,!1),e.addEventListener("webglcontextcreationerror",bi,!1),I===null){let L="webgl2";if(I=oe(L,S),I===null)throw oe(L)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Ut()}catch(S){throw e.removeEventListener("webglcontextlost",fe,!1),e.removeEventListener("webglcontextrestored",le,!1),e.removeEventListener("webglcontextcreationerror",bi,!1),zt("WebGLRenderer: "+S.message),S}function Ut(){$t=new Bx(I),$t.init(),gt=new Tv(I,$t),w=new Rx(I,$t,t,gt),_=new Sv(I,$t),w.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),V=I.createFramebuffer(),D=I.createFramebuffer(),B=I.createFramebuffer(),F=new zx(I),z=new lv,Y=new bv(I,$t,_,z,w,gt,F),ct=new Ox(P),ut=new Gm(I),St=new wx(I,ut),K=new kx(I,ut,F,St),$=new Gx(I,K,ut,St,F),U=new Vx(I,w,Y),Nt=new Cx(z),ft=new ov(P,ct,$t,w,St,Nt),Dt=new Rv(P,z),xt=new hv,pt=new gv($t),qt=new Ex(P,ct,_,$,m,c),Bt=new Mv(P,$,w),nt=new Cv(I,F,w,_),mt=new Ax(I,$t,F),Z=new Hx(I,$t,F),F.programs=ft.programs,P.capabilities=w,P.extensions=$t,P.properties=z,P.renderLists=xt,P.shadowMap=Bt,P.state=_,P.info=F}v!==oi&&(A=new Xx(v,e.width,e.height,o,n,r));let Ct=new _h(P,I);this.xr=Ct,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){let S=$t.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=$t.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return tt},this.setPixelRatio=function(S){S!==void 0&&(tt=S,this.setSize(ne,j,!1))},this.getSize=function(S){return S.set(ne,j)},this.setSize=function(S,L,G=!0){if(Ct.isPresenting){kt("WebGLRenderer: Can't change size while VR device is presenting.");return}ne=S,j=L,e.width=Math.floor(S*tt),e.height=Math.floor(L*tt),G===!0&&(e.style.width=S+"px",e.style.height=L+"px"),A!==null&&A.setSize(e.width,e.height),this.setViewport(0,0,S,L)},this.getDrawingBufferSize=function(S){return S.set(ne*tt,j*tt).floor()},this.setDrawingBufferSize=function(S,L,G){ne=S,j=L,tt=G,e.width=Math.floor(S*G),e.height=Math.floor(L*G),this.setViewport(0,0,S,L)},this.setEffects=function(S){if(v===oi){zt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let L=0;L<S.length;L++)if(S[L].isOutputPass===!0){kt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}A.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(it)},this.getViewport=function(S){return S.copy(bt)},this.setViewport=function(S,L,G,k){S.isVector4?bt.set(S.x,S.y,S.z,S.w):bt.set(S,L,G,k),_.viewport(it.copy(bt).multiplyScalar(tt).round())},this.getScissor=function(S){return S.copy(Vt)},this.setScissor=function(S,L,G,k){S.isVector4?Vt.set(S.x,S.y,S.z,S.w):Vt.set(S,L,G,k),_.scissor(It.copy(Vt).multiplyScalar(tt).round())},this.getScissorTest=function(){return he},this.setScissorTest=function(S){_.setScissorTest(he=S)},this.setOpaqueSort=function(S){vt=S},this.setTransparentSort=function(S){Ht=S},this.getClearColor=function(S){return S.copy(qt.getClearColor())},this.setClearColor=function(){qt.setClearColor(...arguments)},this.getClearAlpha=function(){return qt.getClearAlpha()},this.setClearAlpha=function(){qt.setClearAlpha(...arguments)},this.clear=function(S=!0,L=!0,G=!0){let k=0;if(S){let H=!1;if(st!==null){let Mt=st.texture.format;H=g.has(Mt)}if(H){let Mt=st.texture.type,Et=p.has(Mt),yt=qt.getClearColor(),At=qt.getClearAlpha(),Pt=yt.r,Yt=yt.g,Qt=yt.b;Et?(b[0]=Pt,b[1]=Yt,b[2]=Qt,b[3]=At,I.clearBufferuiv(I.COLOR,0,b)):(M[0]=Pt,M[1]=Yt,M[2]=Qt,M[3]=At,I.clearBufferiv(I.COLOR,0,M))}else k|=I.COLOR_BUFFER_BIT}L&&(k|=I.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),G&&(k|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k!==0&&I.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),O=S},this.dispose=function(){e.removeEventListener("webglcontextlost",fe,!1),e.removeEventListener("webglcontextrestored",le,!1),e.removeEventListener("webglcontextcreationerror",bi,!1),qt.dispose(),xt.dispose(),pt.dispose(),z.dispose(),ct.dispose(),$.dispose(),St.dispose(),nt.dispose(),ft.dispose(),Ct.dispose(),Ct.removeEventListener("sessionstart",Rh),Ct.removeEventListener("sessionend",Ch),In.stop()};function fe(S){S.preventDefault(),Yc("WebGLRenderer: Context Lost."),N=!0}function le(){Yc("WebGLRenderer: Context Restored."),N=!1;let S=F.autoReset,L=Bt.enabled,G=Bt.autoUpdate,k=Bt.needsUpdate,H=Bt.type;Ut(),F.autoReset=S,Bt.enabled=L,Bt.autoUpdate=G,Bt.needsUpdate=k,Bt.type=H}function bi(S){zt("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Di(S){let L=S.target;L.removeEventListener("dispose",Di),wf(L)}function wf(S){Af(S),z.remove(S)}function Af(S){let L=z.get(S).programs;L!==void 0&&(L.forEach(function(G){ft.releaseProgram(G)}),S.isShaderMaterial&&ft.releaseShaderCache(S))}this.renderBufferDirect=function(S,L,G,k,H,Mt){L===null&&(L=Ft);let Et=H.isMesh&&H.matrixWorld.determinantAffine()<0,yt=Pf(S,L,G,k,H);_.setMaterial(k,Et);let At=G.index,Pt=1;if(k.wireframe===!0){if(At=K.getWireframeAttribute(G),At===void 0)return;Pt=2}let Yt=G.drawRange,Qt=G.attributes.position,Rt=Yt.start*Pt,ce=(Yt.start+Yt.count)*Pt;Mt!==null&&(Rt=Math.max(Rt,Mt.start*Pt),ce=Math.min(ce,(Mt.start+Mt.count)*Pt)),At!==null?(Rt=Math.max(Rt,0),ce=Math.min(ce,At.count)):Qt!=null&&(Rt=Math.max(Rt,0),ce=Math.min(ce,Qt.count));let Ie=ce-Rt;if(Ie<0||Ie===1/0)return;St.setup(H,k,yt,G,At);let me,de=mt;if(At!==null&&(me=ut.get(At),de=Z,de.setIndex(me)),H.isMesh)k.wireframe===!0?(_.setLineWidth(k.wireframeLinewidth*Xt()),de.setMode(I.LINES)):de.setMode(I.TRIANGLES);else if(H.isLine){let Je=k.linewidth;Je===void 0&&(Je=1),_.setLineWidth(Je*Xt()),H.isLineSegments?de.setMode(I.LINES):H.isLineLoop?de.setMode(I.LINE_LOOP):de.setMode(I.LINE_STRIP)}else H.isPoints?de.setMode(I.POINTS):H.isSprite&&de.setMode(I.TRIANGLES);if(H.isBatchedMesh)if($t.get("WEBGL_multi_draw"))de.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let Je=H._multiDrawStarts,Tt=H._multiDrawCounts,ii=H._multiDrawCount,se=At?ut.get(At).bytesPerElement:1,xi=z.get(k).currentProgram.getUniforms();for(let Ni=0;Ni<ii;Ni++)xi.setValue(I,"_gl_DrawID",Ni),de.render(Je[Ni]/se,Tt[Ni])}else if(H.isInstancedMesh)de.renderInstances(Rt,Ie,H.count);else if(G.isInstancedBufferGeometry){let Je=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,Tt=Math.min(G.instanceCount,Je);de.renderInstances(Rt,Ie,Tt)}else de.render(Rt,Ie)};function Ah(S,L,G,k){O!==null&&S.isNodeMaterial&&O.setObject(k,S),rt===!0&&Nt.setState(S,G,!1),S.transparent===!0&&S.side===ai&&S.forceSinglePass===!1?(S.side=Ye,S.needsUpdate=!0,sa(S,L,k),S.side=bn,S.needsUpdate=!0,sa(S,L,k),S.side=ai):sa(S,L,k)}this.compile=function(S,L,G=null){G===null&&(G=S),O!==null&&O.renderStart(S,L,G),E=pt.get(G),E.init(L),y.push(E),G.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(E.pushLight(H),H.castShadow&&E.pushShadow(H))}),S!==G&&S.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(E.pushLight(H),H.castShadow&&E.pushShadow(H))}),E.setupLights(),O!==null&&O.updateLights(E.state.lightsArray),ot=this.localClippingEnabled,rt=Nt.init(this.clippingPlanes,ot),rt===!0&&Nt.setGlobalState(this.clippingPlanes,L),O!==null&&Bt.render(E.state.shadowsArray,G,L);let k=new Set;return S.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let Mt=H.material;if(Mt)if(Array.isArray(Mt))for(let Et=0;Et<Mt.length;Et++){let yt=Mt[Et];Ah(yt,G,L,H),k.add(yt)}else Ah(Mt,G,L,H),k.add(Mt)}),E=y.pop(),O!==null&&O.renderEnd(),k},this.compileAsync=function(S,L,G=null){let k=this.compile(S,L,G);return new Promise(H=>{function Mt(){if(k.forEach(function(Et){let At=z.get(Et).currentProgram;(At===void 0||At.isReady())&&k.delete(Et)}),k.size===0){H(S);return}setTimeout(Mt,10)}$t.get("KHR_parallel_shader_compile")!==null?Mt():setTimeout(Mt,10)})};let Dl=null;function Rf(S){Dl&&Dl(S)}function Rh(){In.stop()}function Ch(){In.start()}let In=new af;In.setAnimationLoop(Rf),typeof self<"u"&&In.setContext(self),this.setAnimationLoop=function(S){Dl=S,Ct.setAnimationLoop(S),S===null?In.stop():In.start()},Ct.addEventListener("sessionstart",Rh),Ct.addEventListener("sessionend",Ch),this.render=function(S,L){if(L!==void 0&&L.isCamera!==!0){zt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(N===!0)return;O!==null&&O.renderStart(S,L);let G=Ct.enabled===!0&&Ct.isPresenting===!0,k=A!==null&&(st===null||G)&&A.begin(P,st);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),Ct.enabled===!0&&Ct.isPresenting===!0&&(A===null||A.isCompositing()===!1)&&(Ct.cameraAutoUpdate===!0&&Ct.updateCamera(L),L=Ct.getCamera()),S.isScene===!0&&S.onBeforeRender(P,S,L,st),E=pt.get(S,y.length),E.init(L),E.state.textureUnits=Y.getTextureUnits(),y.push(E),lt.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),et.setFromProjectionMatrix(lt,Ri,L.reversedDepth),ot=this.localClippingEnabled,rt=Nt.init(this.clippingPlanes,ot),T=xt.get(S,R.length),T.init(),R.push(T),Ct.enabled===!0&&Ct.isPresenting===!0){let Et=P.xr.getDepthSensingMesh();Et!==null&&Nl(Et,L,-1/0,P.sortObjects)}Nl(S,L,0,P.sortObjects),T.finish(),O!==null&&O.updateLights(E.state.lightsArray),P.sortObjects===!0&&T.sort(vt,Ht),Gt=Ct.enabled===!1||Ct.isPresenting===!1||Ct.hasDepthSensing()===!1,Gt&&qt.addToRenderList(T,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),rt===!0&&Nt.beginShadows();let H=E.state.shadowsArray;if(Bt.render(H,S,L),rt===!0&&Nt.endShadows(),(k&&A.hasRenderPass())===!1){let Et=T.opaque,yt=T.transmissive;if(E.setupLights(),L.isArrayCamera){let At=L.cameras;if(yt.length>0)for(let Pt=0,Yt=At.length;Pt<Yt;Pt++){let Qt=At[Pt];Ih(Et,yt,S,Qt)}Gt&&qt.render(S);for(let Pt=0,Yt=At.length;Pt<Yt;Pt++){let Qt=At[Pt];Ph(T,S,Qt,Qt.viewport)}}else yt.length>0&&Ih(Et,yt,S,L),Gt&&qt.render(S),Ph(T,S,L)}st!==null&&W===0&&(Y.updateMultisampleRenderTarget(st),Y.updateRenderTargetMipmap(st)),k&&A.end(P),S.isScene===!0&&S.onAfterRender(P,S,L),St.resetDefaultState(),q=-1,Q=null,y.pop(),y.length>0?(E=y[y.length-1],Y.setTextureUnits(E.state.textureUnits),rt===!0&&Nt.setGlobalState(P.clippingPlanes,E.state.camera)):E=null,R.pop(),R.length>0?T=R[R.length-1]:T=null,O!==null&&O.renderEnd()};function Nl(S,L,G,k){if(S.visible===!1)return;if(S.layers.test(L.layers)){if(S.isGroup)G=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(L);else if(S.isLightProbeGrid)E.pushLightProbeGrid(S);else if(S.isLight)E.pushLight(S),S.castShadow&&E.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||S.intersectsFrustum(et)){k&&Ot.setFromMatrixPosition(S.matrixWorld).applyMatrix4(lt);let Et=$.update(S),yt=S.material;yt.visible&&T.push(S,Et,yt,G,Ot.z,null,L)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||S.intersectsFrustum(et))){let Et=$.update(S),yt=S.material;if(k&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Ot.copy(S.boundingSphere.center)):(Et.boundingSphere===null&&Et.computeBoundingSphere(),Ot.copy(Et.boundingSphere.center)),Ot.applyMatrix4(S.matrixWorld).applyMatrix4(lt)),Array.isArray(yt)){let At=Et.groups;for(let Pt=0,Yt=At.length;Pt<Yt;Pt++){let Qt=At[Pt],Rt=yt[Qt.materialIndex];Rt&&Rt.visible&&T.push(S,Et,Rt,G,Ot.z,Qt,L)}}else yt.visible&&T.push(S,Et,yt,G,Ot.z,null,L)}}let Mt=S.children;for(let Et=0,yt=Mt.length;Et<yt;Et++)Nl(Mt[Et],L,G,k)}function Ph(S,L,G,k){let{opaque:H,transmissive:Mt,transparent:Et}=S;E.setupLightsView(G),rt===!0&&Nt.setGlobalState(P.clippingPlanes,G),k&&_.viewport(it.copy(k)),H.length>0&&na(H,L,G),Mt.length>0&&na(Mt,L,G),Et.length>0&&na(Et,L,G),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function Ih(S,L,G,k){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;if(E.state.transmissionRenderTarget[k.id]===void 0){let Rt=$t.has("EXT_color_buffer_half_float")||$t.has("EXT_color_buffer_float");E.state.transmissionRenderTarget[k.id]=new Te(1,1,{generateMipmaps:!0,type:Rt?Ne:oi,minFilter:Gi,samples:Math.max(4,w.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:jt.workingColorSpace})}let Mt=E.state.transmissionRenderTarget[k.id],Et=k.viewport||it;Mt.setSize(Et.z*P.transmissionResolutionScale,Et.w*P.transmissionResolutionScale);let yt=P.getRenderTarget(),At=P.getActiveCubeFace(),Pt=P.getActiveMipmapLevel();P.setRenderTarget(Mt),P.getClearColor(ae),Zt=P.getClearAlpha(),Zt<1&&P.setClearColor(16777215,.5),P.clear(),Gt&&qt.render(G);let Yt=P.toneMapping;P.toneMapping=Ci;let Qt=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),E.setupLightsView(k),rt===!0&&Nt.setGlobalState(P.clippingPlanes,k),na(S,G,k),Y.updateMultisampleRenderTarget(Mt),Y.updateRenderTargetMipmap(Mt),$t.has("WEBGL_multisampled_render_to_texture")===!1){let Rt=!1;for(let ce=0,Ie=L.length;ce<Ie;ce++){let me=L[ce],{object:de,geometry:Je,material:Tt,group:ii}=me;if(Tt.side===ai&&de.layers.test(k.layers)){let se=Tt.side;Tt.side=Ye,Tt.needsUpdate=!0,Lh(de,G,k,Je,Tt,ii),Tt.side=se,Tt.needsUpdate=!0,Rt=!0}}Rt===!0&&(Y.updateMultisampleRenderTarget(Mt),Y.updateRenderTargetMipmap(Mt))}P.setRenderTarget(yt,At,Pt),P.setClearColor(ae,Zt),Qt!==void 0&&(k.viewport=Qt),P.toneMapping=Yt}function na(S,L,G){let k=L.isScene===!0?L.overrideMaterial:null;for(let H=0,Mt=S.length;H<Mt;H++){let Et=S[H],{object:yt,geometry:At,group:Pt}=Et,Yt=Et.material;Yt.allowOverride===!0&&k!==null&&(Yt=k),yt.layers.test(G.layers)&&Lh(yt,L,G,At,Yt,Pt)}}function Lh(S,L,G,k,H,Mt){O!==null&&H.isNodeMaterial&&O.setObject(S,H),S.onBeforeRender(P,L,G,k,H,Mt),S.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),H.onBeforeRender(P,L,G,k,S,Mt),H.transparent===!0&&H.side===ai&&H.forceSinglePass===!1?(H.side=Ye,H.needsUpdate=!0,P.renderBufferDirect(G,L,k,H,S,Mt),H.side=bn,H.needsUpdate=!0,P.renderBufferDirect(G,L,k,H,S,Mt),H.side=ai):P.renderBufferDirect(G,L,k,H,S,Mt),S.onAfterRender(P,L,G,k,H,Mt)}function sa(S,L,G){L.isScene!==!0&&(L=Ft);let k=z.get(S),H=E.state.lights,Mt=E.state.shadowsArray,Et=H.state.version,yt=ft.getParameters(S,H.state,Mt,L,G,E.state.lightProbeGridArray),At=ft.getProgramCacheKey(yt),Pt=k.programs;k.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?L.environment:null,k.fog=L.fog;let Yt=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;k.envMap=ct.get(S.envMap||k.environment,Yt),k.envMapRotation=k.environment!==null&&S.envMap===null?L.environmentRotation:S.envMapRotation,Pt===void 0&&(S.addEventListener("dispose",Di),Pt=new Map,k.programs=Pt);let Qt=Pt.get(At);if(Qt!==void 0){if(k.currentProgram===Qt&&k.lightsStateVersion===Et)return Nh(S,yt),Qt}else yt.uniforms=ft.getUniforms(S),O!==null&&S.isNodeMaterial&&O.build(S,G,yt),S.onBeforeCompile(yt,P),Qt=ft.acquireProgram(yt,At),Pt.set(At,Qt),k.uniforms=yt.uniforms;let Rt=k.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Rt.clippingPlanes=Nt.uniform),Nh(S,yt),k.needsLights=Lf(S),k.lightsStateVersion=Et,k.needsLights&&(Rt.ambientLightColor.value=H.state.ambient,Rt.lightProbe.value=H.state.probe,Rt.sunLights.value=H.state.sun,Rt.sunLightShadows.value=H.state.sunShadow,Rt.directionalLights.value=H.state.directional,Rt.directionalLightShadows.value=H.state.directionalShadow,Rt.spotLights.value=H.state.spot,Rt.spotLightShadows.value=H.state.spotShadow,Rt.rectAreaLights.value=H.state.rectArea,Rt.ltc_1.value=H.state.rectAreaLTC1,Rt.ltc_2.value=H.state.rectAreaLTC2,Rt.pointLights.value=H.state.point,Rt.pointLightShadows.value=H.state.pointShadow,Rt.hemisphereLights.value=H.state.hemi,Rt.sunShadowMatrix.value=H.state.sunShadowMatrix,Rt.sunShadowCascade.value=H.state.sunShadowCascade,Rt.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Rt.spotLightMatrix.value=H.state.spotLightMatrix,Rt.spotLightMap.value=H.state.spotLightMap,Rt.pointShadowMatrix.value=H.state.pointShadowMatrix),k.lightProbeGrid=E.state.lightProbeGridArray.length>0,k.currentProgram=Qt,k.uniformsList=null,Qt}function Dh(S){if(S.uniformsList===null){let L=S.currentProgram.getUniforms();S.uniformsList=Bs.seqWithValue(L.seq,S.uniforms)}return S.uniformsList}function Nh(S,L){let G=z.get(S);G.outputColorSpace=L.outputColorSpace,G.batching=L.batching,G.batchingColor=L.batchingColor,G.instancing=L.instancing,G.instancingColor=L.instancingColor,G.instancingMorph=L.instancingMorph,G.skinning=L.skinning,G.morphTargets=L.morphTargets,G.morphNormals=L.morphNormals,G.morphColors=L.morphColors,G.morphTargetsCount=L.morphTargetsCount,G.numClippingPlanes=L.numClippingPlanes,G.numIntersection=L.numClipIntersection,G.vertexAlphas=L.vertexAlphas,G.vertexTangents=L.vertexTangents,G.toneMapping=L.toneMapping}function Cf(S,L){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;x.setFromMatrixPosition(L.matrixWorld);for(let G=0,k=S.length;G<k;G++){let H=S[G];if(H.texture!==null&&H.boundingBox.containsPoint(x))return H}return null}function Pf(S,L,G,k,H){L.isScene!==!0&&(L=Ft),Y.resetTextureUnits();let Mt=L.fog,Et=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?L.environment:null,yt=st===null?P.outputColorSpace:st.isXRRenderTarget===!0?st.texture.colorSpace:jt.workingColorSpace,At=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,Pt=ct.get(k.envMap||Et,At),Yt=k.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Qt=!!G.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Rt=!!G.morphAttributes.position,ce=!!G.morphAttributes.normal,Ie=!!G.morphAttributes.color,me=Ci;k.toneMapped&&(st===null||st.isXRRenderTarget===!0)&&(me=P.toneMapping);let de=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,Je=de!==void 0?de.length:0,Tt=z.get(k),ii=E.state.lights;if(rt===!0&&(ot===!0||S!==Q)){let pe=S===Q&&k.id===q;Nt.setState(k,S,pe)}let se=!1;k.version===Tt.__version?(Tt.needsLights&&Tt.lightsStateVersion!==ii.state.version||Tt.outputColorSpace!==yt||H.isBatchedMesh&&Tt.batching===!1||!H.isBatchedMesh&&Tt.batching===!0||H.isBatchedMesh&&Tt.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&Tt.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&Tt.instancing===!1||!H.isInstancedMesh&&Tt.instancing===!0||H.isSkinnedMesh&&Tt.skinning===!1||!H.isSkinnedMesh&&Tt.skinning===!0||H.isInstancedMesh&&Tt.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&Tt.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&Tt.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&Tt.instancingMorph===!1&&H.morphTexture!==null||Tt.envMap!==Pt||k.fog===!0&&Tt.fog!==Mt||Tt.numClippingPlanes!==void 0&&(Tt.numClippingPlanes!==Nt.numPlanes||Tt.numIntersection!==Nt.numIntersection)||Tt.vertexAlphas!==Yt||Tt.vertexTangents!==Qt||Tt.morphTargets!==Rt||Tt.morphNormals!==ce||Tt.morphColors!==Ie||Tt.toneMapping!==me||Tt.morphTargetsCount!==Je||!!Tt.lightProbeGrid!=E.state.lightProbeGridArray.length>0)&&(se=!0):(se=!0,Tt.__version=k.version);let xi=Tt.currentProgram;se===!0&&(xi=sa(k,L,H),O&&k.isNodeMaterial&&O.onUpdateProgram(k,xi,Tt));let Ni=!1,rn=!1,$n=!1,ue=xi.getUniforms(),Re=Tt.uniforms;if(_.useProgram(xi.program)&&(Ni=!0,rn=!0,$n=!0),k.id!==q&&(q=k.id,rn=!0),Tt.needsLights){let pe=Cf(E.state.lightProbeGridArray,H);Tt.lightProbeGrid!==pe&&(Tt.lightProbeGrid=pe,rn=!0)}if(Ni||Q!==S){_.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),ue.setValue(I,"projectionMatrix",S.projectionMatrix),ue.setValue(I,"viewMatrix",S.matrixWorldInverse);let on=ue.map.cameraPosition;on!==void 0&&on.setValue(I,dt.setFromMatrixPosition(S.matrixWorld)),w.logarithmicDepthBuffer&&ue.setValue(I,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&ue.setValue(I,"isOrthographic",S.isOrthographicCamera===!0),Q!==S&&(Q=S,rn=!0,$n=!0)}if(Tt.needsLights&&(ii.state.sunShadowMap.length>0&&ue.setValue(I,"sunShadowMap",ii.state.sunShadowMap,Y),ii.state.directionalShadowMap.length>0&&ue.setValue(I,"directionalShadowMap",ii.state.directionalShadowMap,Y),ii.state.spotShadowMap.length>0&&ue.setValue(I,"spotShadowMap",ii.state.spotShadowMap,Y),ii.state.pointShadowMap.length>0&&ue.setValue(I,"pointShadowMap",ii.state.pointShadowMap,Y)),H.isSkinnedMesh){ue.setOptional(I,H,"bindMatrix"),ue.setOptional(I,H,"bindMatrixInverse");let pe=H.skeleton;pe&&(pe.boneTexture===null&&pe.computeBoneTexture(),ue.setValue(I,"boneTexture",pe.boneTexture,Y))}H.isBatchedMesh&&(ue.setOptional(I,H,"batchingTexture"),ue.setValue(I,"batchingTexture",H._matricesTexture,Y),ue.setOptional(I,H,"batchingIdTexture"),ue.setValue(I,"batchingIdTexture",H._indirectTexture,Y),ue.setOptional(I,H,"batchingColorTexture"),H._colorsTexture!==null&&ue.setValue(I,"batchingColorTexture",H._colorsTexture,Y));let an=G.morphAttributes;if((an.position!==void 0||an.normal!==void 0||an.color!==void 0)&&U.update(H,G,xi),(rn||Tt.receiveShadow!==H.receiveShadow)&&(Tt.receiveShadow=H.receiveShadow,ue.setValue(I,"receiveShadow",H.receiveShadow)),(k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial)&&k.envMap===null&&L.environment!==null&&(Re.envMapIntensity.value=L.environmentIntensity),Re.dfgLUT!==void 0&&(Re.dfgLUT.value=Iv()),rn){if(ue.setValue(I,"toneMappingExposure",P.toneMappingExposure),Tt.needsLights&&If(Re,$n),Mt&&k.fog===!0&&Dt.refreshFogUniforms(Re,Mt),Dt.refreshMaterialUniforms(Re,k,tt,j,E.state.transmissionRenderTarget[S.id]),Tt.needsLights&&Tt.lightProbeGrid){let pe=Tt.lightProbeGrid;Re.probesSH.value=pe.texture,Re.probesMin.value.copy(pe.boundingBox.min),Re.probesMax.value.copy(pe.boundingBox.max),Re.probesResolution.value.copy(pe.resolution)}Bs.upload(I,Dh(Tt),Re,Y)}if(k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(Bs.upload(I,Dh(Tt),Re,Y),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&ue.setValue(I,"center",H.center),ue.setValue(I,"modelViewMatrix",H.modelViewMatrix),ue.setValue(I,"normalMatrix",H.normalMatrix),ue.setValue(I,"modelMatrix",H.matrixWorld),k.uniformsGroups!==void 0){let pe=k.uniformsGroups;for(let on=0,Qn=pe.length;on<Qn;on++){let Fh=pe[on];nt.update(Fh,xi),nt.bind(Fh,xi)}}return xi}function If(S,L){S.ambientLightColor.needsUpdate=L,S.lightProbe.needsUpdate=L,S.sunLights.needsUpdate=L,S.sunLightShadows.needsUpdate=L,S.directionalLights.needsUpdate=L,S.directionalLightShadows.needsUpdate=L,S.pointLights.needsUpdate=L,S.pointLightShadows.needsUpdate=L,S.spotLights.needsUpdate=L,S.spotLightShadows.needsUpdate=L,S.rectAreaLights.needsUpdate=L,S.hemisphereLights.needsUpdate=L}function Lf(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return X},this.getActiveMipmapLevel=function(){return W},this.getRenderTarget=function(){return st},this.setRenderTargetTextures=function(S,L,G){let k=z.get(S);k.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,k.__autoAllocateDepthBuffer===!1&&(k.__useRenderToTexture=!1),z.get(S.texture).__webglTexture=L,z.get(S.depthTexture).__webglTexture=k.__autoAllocateDepthBuffer?void 0:G,k.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,L){let G=z.get(S);G.__webglFramebuffer=L,G.__useDefaultFramebuffer=L===void 0},this.setRenderTarget=function(S,L=0,G=0){st=S,X=L,W=G;let k=null,H=!1,Mt=!1;if(S){let yt=z.get(S);if(yt.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(I.FRAMEBUFFER,yt.__webglFramebuffer),it.copy(S.viewport),It.copy(S.scissor),wt=S.scissorTest,_.viewport(it),_.scissor(It),_.setScissorTest(wt),q=-1;return}else if(yt.__webglFramebuffer===void 0)Y.setupRenderTarget(S);else if(yt.__hasExternalTextures)Y.rebindTextures(S,z.get(S.texture).__webglTexture,z.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let Yt=S.depthTexture;if(yt.__boundDepthTexture!==Yt){if(Yt!==null&&z.has(Yt)&&(S.width!==Yt.image.width||S.height!==Yt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Y.setupDepthRenderbuffer(S)}}let At=S.texture;(At.isData3DTexture||At.isDataArrayTexture||At.isCompressedArrayTexture)&&(Mt=!0);let Pt=z.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Pt[L])?k=Pt[L][G]:k=Pt[L],H=!0):S.samples>0&&Y.useMultisampledRTT(S)===!1?k=z.get(S).__webglMultisampledFramebuffer:Array.isArray(Pt)?k=Pt[G]:k=Pt,it.copy(S.viewport),It.copy(S.scissor),wt=S.scissorTest}else it.copy(bt).multiplyScalar(tt).floor(),It.copy(Vt).multiplyScalar(tt).floor(),wt=he;if(G!==0&&(k=V),_.bindFramebuffer(I.FRAMEBUFFER,k)&&_.drawBuffers(S,k),_.viewport(it),_.scissor(It),_.setScissorTest(wt),H){let yt=z.get(S.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+L,yt.__webglTexture,G)}else if(Mt){let yt=L;for(let At=0;At<S.textures.length;At++){let Pt=z.get(S.textures[At]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+At,Pt.__webglTexture,G,yt)}}else if(S!==null&&G!==0){let yt=z.get(S.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,yt.__webglTexture,G)}q=-1};function Uh(S){let L=z.get(S);return(L.__readFormat!==S.format||L.__readType!==S.type)&&(L.__readFormat=S.format,L.__readType=S.type,L.__formatReadable=w.textureFormatReadable(S.format),L.__typeReadable=w.textureTypeReadable(S.type)),L}this.readRenderTargetPixels=function(S,L,G,k,H,Mt,Et,yt=0){if(!(S&&S.isWebGLRenderTarget)){zt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let At=z.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Et!==void 0&&(At=At[Et]),At){_.bindFramebuffer(I.FRAMEBUFFER,At);try{let Pt=S.textures[yt],Yt=Pt.format,Qt=Pt.type;S.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+yt);let Rt=Uh(Pt);if(Rt.__formatReadable===!1){zt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Rt.__typeReadable===!1){zt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=S.width-k&&G>=0&&G<=S.height-H&&I.readPixels(L,G,k,H,gt.convert(Yt),gt.convert(Qt),Mt)}finally{let Pt=st!==null?z.get(st).__webglFramebuffer:null;_.bindFramebuffer(I.FRAMEBUFFER,Pt)}}},this.readRenderTargetPixelsAsync=async function(S,L,G,k,H,Mt,Et,yt=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let At=z.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Et!==void 0&&(At=At[Et]),At)if(L>=0&&L<=S.width-k&&G>=0&&G<=S.height-H){_.bindFramebuffer(I.FRAMEBUFFER,At);let Pt=S.textures[yt],Yt=Pt.format,Qt=Pt.type;S.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+yt);let Rt=Uh(Pt);if(Rt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Rt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ce=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,ce),I.bufferData(I.PIXEL_PACK_BUFFER,Mt.byteLength,I.STREAM_READ),I.readPixels(L,G,k,H,gt.convert(Yt),gt.convert(Qt),0),I.bindBuffer(I.PIXEL_PACK_BUFFER,null);let Ie=st!==null?z.get(st).__webglFramebuffer:null;_.bindFramebuffer(I.FRAMEBUFFER,Ie);let me=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await Cd(I,me,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,ce),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,Mt),I.bindBuffer(I.PIXEL_PACK_BUFFER,null),I.deleteBuffer(ce),I.deleteSync(me),Mt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,L=null,G=0){let k=Math.pow(2,-G),H=Math.floor(S.image.width*k),Mt=Math.floor(S.image.height*k),Et=L!==null?L.x:0,yt=L!==null?L.y:0;Y.setTexture2D(S,0),I.copyTexSubImage2D(I.TEXTURE_2D,G,0,0,Et,yt,H,Mt),_.unbindTexture()},this.copyTextureToTexture=function(S,L,G=null,k=null,H=0,Mt=0){let Et,yt,At,Pt,Yt,Qt,Rt,ce,Ie,me=S.isCompressedTexture?S.mipmaps[Mt]:S.image;if(G!==null)Et=G.max.x-G.min.x,yt=G.max.y-G.min.y,At=G.isBox3?G.max.z-G.min.z:1,Pt=G.min.x,Yt=G.min.y,Qt=G.isBox3?G.min.z:0;else{let Re=Math.pow(2,-H);Et=Math.floor(me.width*Re),yt=Math.floor(me.height*Re),S.isDataArrayTexture?At=me.depth:S.isData3DTexture?At=Math.floor(me.depth*Re):At=1,Pt=0,Yt=0,Qt=0}k!==null?(Rt=k.x,ce=k.y,Ie=k.z):(Rt=0,ce=0,Ie=0);let de=gt.convert(L.format),Je=gt.convert(L.type),Tt;L.isData3DTexture?(Y.setTexture3D(L,0),Tt=I.TEXTURE_3D):L.isDataArrayTexture||L.isCompressedArrayTexture?(Y.setTexture2DArray(L,0),Tt=I.TEXTURE_2D_ARRAY):(Y.setTexture2D(L,0),Tt=I.TEXTURE_2D),_.activeTexture(I.TEXTURE0),_.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,L.flipY),_.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),_.pixelStorei(I.UNPACK_ALIGNMENT,L.unpackAlignment);let ii=_.getParameter(I.UNPACK_ROW_LENGTH),se=_.getParameter(I.UNPACK_IMAGE_HEIGHT),xi=_.getParameter(I.UNPACK_SKIP_PIXELS),Ni=_.getParameter(I.UNPACK_SKIP_ROWS),rn=_.getParameter(I.UNPACK_SKIP_IMAGES);_.pixelStorei(I.UNPACK_ROW_LENGTH,me.width),_.pixelStorei(I.UNPACK_IMAGE_HEIGHT,me.height),_.pixelStorei(I.UNPACK_SKIP_PIXELS,Pt),_.pixelStorei(I.UNPACK_SKIP_ROWS,Yt),_.pixelStorei(I.UNPACK_SKIP_IMAGES,Qt);let $n=S.isDataArrayTexture||S.isData3DTexture,ue=L.isDataArrayTexture||L.isData3DTexture;if(S.isDepthTexture){let Re=z.get(S),an=z.get(L),pe=z.get(Re.__renderTarget),on=z.get(an.__renderTarget);_.bindFramebuffer(I.READ_FRAMEBUFFER,pe.__webglFramebuffer),_.bindFramebuffer(I.DRAW_FRAMEBUFFER,on.__webglFramebuffer);for(let Qn=0;Qn<At;Qn++)$n&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,z.get(S).__webglTexture,H,Qt+Qn),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,z.get(L).__webglTexture,Mt,Ie+Qn)),I.blitFramebuffer(Pt,Yt,Et,yt,Rt,ce,Et,yt,I.DEPTH_BUFFER_BIT,I.NEAREST);_.bindFramebuffer(I.READ_FRAMEBUFFER,null),_.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(H!==0||S.isRenderTargetTexture||z.has(S)){let Re=z.get(S),an=z.get(L);_.bindFramebuffer(I.READ_FRAMEBUFFER,D),_.bindFramebuffer(I.DRAW_FRAMEBUFFER,B);for(let pe=0;pe<At;pe++)$n?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,Re.__webglTexture,H,Qt+pe):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,Re.__webglTexture,H),ue?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,an.__webglTexture,Mt,Ie+pe):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,an.__webglTexture,Mt),H!==0?I.blitFramebuffer(Pt,Yt,Et,yt,Rt,ce,Et,yt,I.COLOR_BUFFER_BIT,I.NEAREST):ue?I.copyTexSubImage3D(Tt,Mt,Rt,ce,Ie+pe,Pt,Yt,Et,yt):I.copyTexSubImage2D(Tt,Mt,Rt,ce,Pt,Yt,Et,yt);_.bindFramebuffer(I.READ_FRAMEBUFFER,null),_.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else ue?S.isDataTexture||S.isData3DTexture?I.texSubImage3D(Tt,Mt,Rt,ce,Ie,Et,yt,At,de,Je,me.data):L.isCompressedArrayTexture?I.compressedTexSubImage3D(Tt,Mt,Rt,ce,Ie,Et,yt,At,de,me.data):I.texSubImage3D(Tt,Mt,Rt,ce,Ie,Et,yt,At,de,Je,me):S.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,Mt,Rt,ce,Et,yt,de,Je,me.data):S.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,Mt,Rt,ce,me.width,me.height,de,me.data):I.texSubImage2D(I.TEXTURE_2D,Mt,Rt,ce,Et,yt,de,Je,me);_.pixelStorei(I.UNPACK_ROW_LENGTH,ii),_.pixelStorei(I.UNPACK_IMAGE_HEIGHT,se),_.pixelStorei(I.UNPACK_SKIP_PIXELS,xi),_.pixelStorei(I.UNPACK_SKIP_ROWS,Ni),_.pixelStorei(I.UNPACK_SKIP_IMAGES,rn),Mt===0&&L.generateMipmaps&&I.generateMipmap(Tt),_.unbindTexture()},this.initRenderTarget=function(S){z.get(S).__webglFramebuffer===void 0&&Y.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?Y.setTextureCube(S,0):S.isData3DTexture?Y.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?Y.setTexture2DArray(S,0):Y.setTexture2D(S,0),_.unbindTexture()},this.resetState=function(){X=0,W=0,st=null,_.reset(),St.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ri}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=jt._getDrawingBufferColorSpace(t),e.unpackColorSpace=jt._getUnpackColorSpace()}};var Vs={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var mi=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},Dv=new Sn(-1,1,1,-1,0,1),vh=class extends De{constructor(){super(),this.setAttribute("position",new ie([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ie([0,2,0,0,2,0],2))}},Nv=new vh,An=class{constructor(t){this._mesh=new ht(Nv,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,Dv)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var vl=class extends mi{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Pe?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=sn.clone(t.uniforms),this.material=new Pe({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new An(this.material)}render(t,e,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Zr=class extends mi{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,i){let n=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(n.REPLACE,n.REPLACE,n.REPLACE),r.buffers.stencil.setFunc(n.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),t.setRenderTarget(i),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(n.EQUAL,1,4294967295),r.buffers.stencil.setOp(n.KEEP,n.KEEP,n.KEEP),r.buffers.stencil.setLocked(!0)}},yl=class extends mi{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var Ml=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let i=t.getSize(new at);this._width=i.width,this._height=i.height,e=new Te(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Ne}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new vl(Vs),this.copyPass.material.blending=Mi,this.timer=new Dr}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),i=!1;for(let n=0,r=this.passes.length;n<r;n++){let a=this.passes[n];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(n),a.render(this.renderer,this.writeBuffer,this.readBuffer,t,i),a.needsSwap){if(i){let o=this.renderer.getContext(),c=this.renderer.state.buffers.stencil;c.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),c.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}Zr!==void 0&&(a instanceof Zr?i=!0:a instanceof yl&&(i=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new at);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let i=this._width*this._pixelRatio,n=this._height*this._pixelRatio;this.renderTarget1.setSize(i,n),this.renderTarget2.setSize(i,n);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,n)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Sl=class extends mi{constructor(t,e,i=null,n=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=i,this.clearColor=n,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new Lt}render(t,e,i){let n=t.autoClear;t.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),t.autoClear=n}};var ff={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Lt(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var Gs=class s extends mi{constructor(t,e=1,i,n){super(),this.strength=e,this.radius=i,this.threshold=n,this.resolution=t!==void 0?new at(t.x,t.y):new at(256,256),this.clearColor=new Lt(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new Te(r,a,{type:Ne,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let d=new Te(r,a,{type:Ne,depthBuffer:!1});d.texture.name="UnrealBloomPass.h"+h,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);let u=new Te(r,a,{type:Ne,depthBuffer:!1});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),a=Math.round(a/2)}let o=ff;this.highPassUniforms=sn.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=n,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Pe({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let c=[6,10,14,18,22];r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(c[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new at(1/r,1/a),r=Math.round(r/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let l=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=l,this.bloomTintColors=[new C(1,1,1),new C(1,1,1),new C(1,1,1),new C(1,1,1),new C(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=sn.clone(Vs.uniforms),this.blendMaterial=new Pe({uniforms:this.copyUniforms,vertexShader:Vs.vertexShader,fragmentShader:Vs.fragmentShader,premultipliedAlpha:!0,blending:en,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Lt,this._oldClearAlpha=1,this._basic=new Ee,this._fsQuad=new An(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let i=Math.round(t/2),n=Math.round(e/2);this.renderTargetBright.setSize(i,n);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,n),this.renderTargetsVertical[r].setSize(i,n),this.separableBlurMaterials[r].uniforms.invSize.value=new at(1/i,1/n),i=Math.round(i/2),n=Math.round(n/2)}render(t,e,i,n,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let a=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let o=this.renderTargetBright;for(let c=0;c<this.nMips;c++)this._fsQuad.material=this.separableBlurMaterials[c],this.separableBlurMaterials[c].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[c].uniforms.direction.value=s.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[c]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[c].uniforms.colorTexture.value=this.renderTargetsHorizontal[c].texture,this.separableBlurMaterials[c].uniforms.direction.value=s.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[c]),t.clear(),this._fsQuad.render(t),o=this.renderTargetsVertical[c];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(i),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=a}_getSeparableBlurMaterial(t){let e=[],i=t/3;for(let a=0;a<t;a++)e.push(.39894*Math.exp(-.5*a*a/(i*i))/i);let n=[],r=[];for(let a=1;a<t;a+=2){let o=e[a],c=a+1<t?e[a+1]:0,l=o+c;n.push((a*o+(a+1)*c)/l),r.push(l)}return new Pe({defines:{KERNEL_PAIRS:n.length},uniforms:{colorTexture:{value:null},invSize:{value:new at(.5,.5)},direction:{value:new at(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:n},gaussianWeights:{value:r}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(t){return new Pe({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Gs.BlurDirectionX=new at(1,0);Gs.BlurDirectionY=new at(0,1);var $r={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var bl=class extends mi{constructor(){super(),this.isOutputPass=!0,this.uniforms=sn.clone($r.uniforms),this.material=new Rs({name:$r.name,uniforms:this.uniforms,vertexShader:$r.vertexShader,fragmentShader:$r.fragmentShader}),this._fsQuad=new An(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},jt.getTransfer(this._outputColorSpace)===re&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Nr?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Ur?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Fr?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Yn?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Br?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===kr?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===Or&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Uv=96,Qr={red:[1,.16,.12],amber:[1,.62,.1],gold:[1,.8,.28],green:[.2,1,.35],blue:[.25,.55,1],white:[1,.97,.9],orange:[1,.42,.06],purple:[.75,.3,1]},pf=(s,t=1,e=1)=>`rgba(${Math.round(s[0]*255*e)},${Math.round(s[1]*255*e)},${Math.round(s[2]*255*e)},${t})`,li="#d9b25a",Tl="#8a6a2a",Fv="#07060d";function gf(){let s=Uv,t=Math.round(J.W*s),e=Math.round(J.L*s),i=gi(t,e),n=i.getContext("2d");n.scale(s,s);let r=1/s,a=n.createLinearGradient(0,0,0,J.L);a.addColorStop(0,"#0b0f2a"),a.addColorStop(.35,"#121a3d"),a.addColorStop(.62,"#0d1230"),a.addColorStop(1,"#07081a"),n.fillStyle=a,n.fillRect(0,0,J.W,J.L);let o=Gv(7);for(let p=0;p<9e3;p++)n.fillStyle=`rgba(255,255,255,${o()*.035})`,n.fillRect(o()*J.W,o()*J.L,.03,.03);n.save();let c=J.MIRROR/2,l=42.5,h=n.createRadialGradient(c,l,2,c,l,22);h.addColorStop(0,"rgba(255,200,110,0.16)"),h.addColorStop(.55,"rgba(255,190,100,0.06)"),h.addColorStop(1,"rgba(255,190,100,0)");for(let p=0;p<36;p++){if(p%2)continue;let b=Math.PI+p/36*Math.PI,M=b+Math.PI/36;n.beginPath(),n.moveTo(c,l),n.arc(c,l,22,b,M),n.closePath(),n.fillStyle=h,n.fill()}n.strokeStyle="rgba(217,178,90,0.18)",n.lineWidth=.04;for(let p of[4.5,4.8,9.5])n.beginPath(),n.arc(c,l,p,Math.PI*1.08,Math.PI*1.92),n.stroke();n.restore();let d=(p,b,M,x)=>{let T=n.createRadialGradient(p,b,0,p,b,M);T.addColorStop(0,x),T.addColorStop(1,"rgba(0,0,0,0)"),n.fillStyle=T,n.beginPath(),n.arc(p,b,M,0,Math.PI*2),n.fill()};d(3.15,22.5,2.6,"rgba(60,170,255,0.20)"),d(10.55,22.5,2.6,"rgba(255,60,140,0.18)"),d(7.6,22.2,2.2,"rgba(255,190,70,0.18)"),d(14.3,22.3,2.4,"rgba(60,255,140,0.13)"),d(14.1,10.5,4.5,"rgba(255,40,60,0.12)"),Ov(n,o),n.save();let u=n.createRadialGradient(4.2,4.6,.1,4.2,4.6,2.6);u.addColorStop(0,"rgba(255,240,200,0.55)"),u.addColorStop(.35,"rgba(255,230,170,0.25)"),u.addColorStop(1,"rgba(255,230,170,0)"),n.fillStyle=u,n.beginPath(),n.arc(4.2,4.6,2.6,0,Math.PI*2),n.fill(),n.fillStyle="rgba(250,236,200,0.8)",n.beginPath(),n.arc(4.2,4.6,.75,0,Math.PI*2),n.fill(),n.fillStyle="#0e1433",n.beginPath(),n.arc(4.55,4.35,.68,0,Math.PI*2),n.fill();for(let[p,b]of[[6.5,-.35],[9.8,.25],[14.5,-.15]]){let M=n.createLinearGradient(p,16,p+Math.sin(b)*14,2);M.addColorStop(0,"rgba(180,200,255,0.16)"),M.addColorStop(1,"rgba(180,200,255,0)"),n.fillStyle=M,n.beginPath(),n.moveTo(p-.15,16),n.lineTo(p+Math.sin(b)*14-1.4,2),n.lineTo(p+Math.sin(b)*14+1.4,2),n.lineTo(p+.15,16),n.fill()}n.restore();for(let p=0;p<160;p++){let b=o()*J.W,M=o()*10;Math.hypot(b-10.125,M-10.125)>10||(n.fillStyle=`rgba(255,250,230,${.25+o()*.6})`,n.fillRect(b,M,.035+o()*.03,.035+o()*.03))}n.save();let f=n.createLinearGradient(6.3,0,8.9,0);f.addColorStop(0,"#1b1b24"),f.addColorStop(.5,"#3a3a48"),f.addColorStop(1,"#1b1b24"),n.fillStyle=f,n.fillRect(6.3,12,2.6,9.2);for(let p=12.2;p<21;p+=.12)n.strokeStyle=`rgba(255,255,255,${.02+o()*.03})`,n.lineWidth=r,n.beginPath(),n.moveTo(6.3,p),n.lineTo(8.9,p),n.stroke();n.strokeStyle="rgba(255,40,40,0.55)",n.lineWidth=.035;for(let p=0;p<6;p++)n.beginPath(),n.moveTo(6.3,15.4+p*.95),n.lineTo(8.9,16.3+p*.95-.9),n.stroke();n.fillStyle="rgba(255,215,120,0.25)",n.fillRect(6.3,12,2.6,2.6),n.restore(),n.strokeStyle=Tl,n.lineWidth=.05,Mh(n,J.mass.pts,!0,Tl,.08),Mh(n,J.hideoutBlock.pts,!0,Tl,.08);for(let p of J.dividers)Mh(n,p.pts,!0,li,.06);for(let p of J.slings){n.fillStyle="rgba(160,20,40,0.35)",n.beginPath(),n.moveTo(...p.A);for(let b of p.lower)n.lineTo(...b);n.lineTo(...p.D),n.closePath(),n.fill()}n.save();for(let[p,b]of[[0,1.55],[2.05,3.5],[J.MIRROR-3.5,J.MIRROR-2.05],[J.MIRROR-1.55,J.MIRROR]]){let M=n.createLinearGradient(p,0,b,0);M.addColorStop(0,"rgba(0,0,0,0.35)"),M.addColorStop(.5,"rgba(40,40,90,0.25)"),M.addColorStop(1,"rgba(0,0,0,0.35)"),n.fillStyle=M,n.fillRect(p,29.6,b-p,5.5)}n.restore(),n.save(),n.strokeStyle="rgba(217,178,90,0.12)",n.lineWidth=.025;for(let[p,b]of[[.05,1.5],[J.MIRROR-1.5,J.MIRROR-.05]])for(let M=36;M<41.6;M+=.5)n.beginPath(),n.moveTo(p,M),n.lineTo(b,M+.5),n.moveTo(b,M),n.lineTo(p,M+.5),n.stroke();n.restore(),mf(n,4.05,29.9,1,!1),mf(n,J.MIRROR-4.05,29.9,1,!0);for(let p of[.775,2.775,J.MIRROR-2.775,J.MIRROR-.775])Vv(n,p,34.5,3,li,.5);let m=J.jobRing;n.save();let v=n.createRadialGradient(m.x,m.y,.2,m.x,m.y,m.r+1.2);v.addColorStop(0,"#2a1f08"),v.addColorStop(.7,"#141026"),v.addColorStop(1,"rgba(10,10,30,0)"),n.fillStyle=v,n.beginPath(),n.arc(m.x,m.y,m.r+1.2,0,Math.PI*2),n.fill(),n.strokeStyle=li,n.lineWidth=.05,n.beginPath(),n.arc(m.x,m.y,m.r+.72,0,Math.PI*2),n.stroke(),n.lineWidth=.025,n.beginPath(),n.arc(m.x,m.y,m.r+.85,0,Math.PI*2),n.stroke();for(let p=0;p<24;p++){let b=p/24*Math.PI*2;n.beginPath(),n.moveTo(m.x+Math.cos(b)*(m.r+.72),m.y+Math.sin(b)*(m.r+.72)),n.lineTo(m.x+Math.cos(b)*(m.r+1.05),m.y+Math.sin(b)*(m.r+1.05)),n.stroke()}n.restore();for(let p of J.inserts)Bv(n,p);kv(n),Hv(n,J.MIRROR/2,36.3,.95),n.save(),n.fillStyle="#0a0a14",n.fillRect(18.8,11.3,1.45,33.7),n.translate(19.52,33),n.rotate(-Math.PI/2),zv(n,"SKILL SHOT",0,0,.5,li),n.restore();let g=n.createRadialGradient(J.W/2,J.L*.55,8,J.W/2,J.L*.55,28);return g.addColorStop(0,"rgba(0,0,0,0)"),g.addColorStop(1,"rgba(0,0,0,0.45)"),n.fillStyle=g,n.fillRect(0,0,J.W,J.L),i}function Ov(s,t){s.save(),s.beginPath(),s.arc(10.125,10.125,10.1,Math.PI,0),s.lineTo(20.25,21),s.lineTo(0,21),s.closePath(),s.clip();let e=20.5,i=-.3,n=[{col:"#161c44",win:"rgba(255,210,120,",h:[4,9],w:[.9,1.9],alpha:.35},{col:"#0c1030",win:"rgba(255,220,140,",h:[2.5,7],w:[.8,1.6],alpha:.6}];for(let r of n)for(i=-.3;i<20.5;){let a=r.w[0]+t()*(r.w[1]-r.w[0]),o=r.h[0]+t()*(r.h[1]-r.h[0]),c=e-o;s.fillStyle=r.col,s.beginPath(),s.moveTo(i,e),s.lineTo(i,c+.6),s.lineTo(i+a*.2,c+.6),s.lineTo(i+a*.2,c+.25),s.lineTo(i+a*.4,c+.25),s.lineTo(i+a*.5,c-(t()<.4?.9:0)),s.lineTo(i+a*.6,c+.25),s.lineTo(i+a*.8,c+.25),s.lineTo(i+a*.8,c+.6),s.lineTo(i+a,c+.6),s.lineTo(i+a,e),s.fill();for(let l=c+.9;l<e-.2;l+=.32)for(let h=i+.15;h<i+a-.15;h+=.22)t()<.34&&(s.fillStyle=r.win+r.alpha*(.4+t()*.6)+")",s.fillRect(h,l,.1,.14));i+=a+.08+t()*.3}s.restore()}function Bv(s,t){let e=Qr[t.color]||Qr.white;s.save(),s.translate(t.x,t.y),s.rotate((t.rot||0)*Math.PI/180);let i=t.size;s.fillStyle="rgba(0,0,0,0.6)",yh(s,t.shape,i*1.18,t.w?t.w*1.08:null),s.fill(),s.strokeStyle=Tl,s.lineWidth=.04,yh(s,t.shape,i*1.1,t.w?t.w*1.05:null),s.stroke();let n=s.createRadialGradient(-i*.2,-i*.2,0,0,0,i);if(n.addColorStop(0,pf(e,1,.42)),n.addColorStop(1,pf(e,1,.16)),s.fillStyle=n,yh(s,t.shape,i,t.w),s.fill(),s.restore(),t.label){s.save();let r=t.shape==="circle"&&t.label.length<=2;if(s.fillStyle=r?"rgba(20,10,0,0.85)":li,s.font=`bold ${r?i*.62:.34}px Georgia, serif`,s.textAlign="center",s.textBaseline="middle",r)s.fillText(t.label,t.x,t.y+.02);else{let a=J.jobRing,o=Math.atan2(t.y-a.y,t.x-a.x),c=a.x+Math.cos(o)*(a.r+1.18),l=a.y+Math.sin(o)*(a.r+1.18);s.fillText(t.label,c,l)}s.restore()}}function yh(s,t,e,i){switch(s.beginPath(),t){case"circle":s.arc(0,0,e/2,0,Math.PI*2);break;case"rect":{let n=(i||e*2)/2,r=e/2,a=r*.6;s.moveTo(-n+a,-r),s.lineTo(n-a,-r),s.quadraticCurveTo(n,-r,n,-r+a),s.lineTo(n,r-a),s.quadraticCurveTo(n,r,n-a,r),s.lineTo(-n+a,r),s.quadraticCurveTo(-n,r,-n,r-a),s.lineTo(-n,-r+a),s.quadraticCurveTo(-n,-r,-n+a,-r);break}case"arrow":{let n=e,r=e*.42;s.moveTo(0,-n*.62),s.lineTo(r,-n*.08),s.lineTo(r*.45,-n*.08),s.lineTo(r*.45,n*.5),s.lineTo(-r*.45,n*.5),s.lineTo(-r*.45,-n*.08),s.lineTo(-r,-n*.08),s.closePath();break}case"tri":s.moveTo(0,-e*.55),s.lineTo(e*.5,e*.35),s.lineTo(-e*.5,e*.35),s.closePath();break;case"star":{for(let n=0;n<10;n++){let r=n%2?e*.24:e*.55,a=-Math.PI/2+n*Math.PI/5;n===0?s.moveTo(Math.cos(a)*r,Math.sin(a)*r):s.lineTo(Math.cos(a)*r,Math.sin(a)*r)}s.closePath();break}}}function kv(s){let t=(i,n,r,a=.3,o=li,c=0)=>{s.save(),s.translate(n,r),s.rotate(c*Math.PI/180),s.font=`bold ${a}px Georgia, serif`,s.textAlign="center",s.textBaseline="middle",s.fillStyle="rgba(0,0,0,0.6)",s.fillText(i,.02,.02),s.fillStyle=o,s.fillText(i,0,0),s.restore()},e=Object.fromEntries(J.inserts.map(i=>[i.id,i]));t("LOOP",e.arrLO.x+.5,e.arrLO.y+.95,.28,li,e.arrLO.rot),t("SKYWAY",e.arrLR.x+.2,e.arrLR.y+.95,.28,li,e.arrLR.rot),t("VAULT",e.arrVault.x,e.arrVault.y+1,.32),t("GETAWAY",e.arrRR.x,e.arrRR.y+.95,.28),t("HIDEOUT",e.arrHide.x-.2,e.arrHide.y+.95,.28,li,e.arrHide.rot),t("LOOP",e.arrRO.x-.5,e.arrRO.y+.95,.28,li,e.arrRO.rot),t("LOCK",e.lockLit.x,e.lockLit.y,.26,"#1a1000"),t("START JOB",e.startJob.x,e.startJob.y,.2,"#001a08",e.startJob.rot),t("EXTRA",e.extraBallLit.x,e.extraBallLit.y-.07,.13,"#2a1000"),t("BALL",e.extraBallLit.x,e.extraBallLit.y+.09,.13,"#2a1000"),t("?",e.mystery.x,e.mystery.y+.02,.3,"#12002a"),t("SHOOT AGAIN",e.shootAgain.x,e.shootAgain.y+.62,.22),t("KICKBACK",e.lampKickback.x,e.lampKickback.y+.72,.17),t("SPINNER",e.lampSpinner.x,e.lampSpinner.y+.5,.17),t("COMBO",e.lampCombo.x,e.lampCombo.y+.5,.17),t("SUPER",e.superJP.x,e.superJP.y+.62,.18),t("JACKPOT",e.superJP.x,e.superJP.y+.84,.18),t("SCOUT",16.9,28.1,.18,li,-60);for(let i=1;i<=3;i++)t(`LOCK ${i}`,e["lock"+i].x,e["lock"+i].y,.22,"#1a1000");t("THE BIG",e.bigScore.x,e.bigScore.y-.02,.13,"#1a1000"),t("SCORE",e.bigScore.x,e.bigScore.y+.14,.13,"#1a1000"),t("ALARMS",14.1,14.35,.34,"#ff5a5a"),t("K   E   Y",14.2,4,.3),t("BONUS MULTIPLIER",J.MIRROR/2,34.75,.17)}function mf(s,t,e,i,n){s.save(),s.translate(t,e),s.scale(n?-i:i,i);let r=new Path2D;r.ellipse(0,-2.35,.62,.12,0,0,Math.PI*2),r.moveTo(-.38,-2.38),r.bezierCurveTo(-.36,-2.85,.36,-2.85,.38,-2.38),r.closePath(),r.moveTo(.3,-2.2),r.arc(.02,-2.1,.3,0,Math.PI*2),r.moveTo(-.45,-1.85),r.lineTo(.5,-1.85),r.lineTo(.72,-1.2),r.lineTo(.62,.25),r.lineTo(.78,1.3),r.lineTo(-.7,1.3),r.lineTo(-.55,.25),r.lineTo(-.72,-1.2),r.closePath(),r.rect(-.42,1.3,.3,.55),r.rect(.12,1.3,.3,.55),r.moveTo(.55,-1.2),r.lineTo(1.05,-.2),r.lineTo(.9,-.1),r.lineTo(.5,-.8),r.closePath(),s.fillStyle="rgba(4,4,12,0.82)",s.fill(r),s.strokeStyle="rgba(217,178,90,0.55)",s.lineWidth=.035,s.stroke(r),s.beginPath(),s.arc(1.05,.25,.42,0,Math.PI*2),s.fillStyle="rgba(40,30,12,0.9)",s.fill(),s.strokeStyle=li,s.stroke(),s.save(),s.scale(n?-1:1,1),s.fillStyle=li,s.font="bold 0.5px Georgia, serif",s.textAlign="center",s.textBaseline="middle",s.fillText("$",(n?-1:1)*1.05,.28),s.restore(),s.restore()}function Hv(s,t,e,i){s.save(),s.translate(t,e),s.scale(i,i),s.textAlign="center",s.textBaseline="middle",s.font="bold 0.62px Georgia, serif",s.lineWidth=.08,s.strokeStyle=Fv,s.strokeText("MIDNIGHT",0,-.35);let n=s.createLinearGradient(0,-.7,0,.9);n.addColorStop(0,"#fff2c0"),n.addColorStop(.45,"#e2b650"),n.addColorStop(1,"#8a5a18"),s.fillStyle=n,s.fillText("MIDNIGHT",0,-.35),s.font="bold 1.05px Georgia, serif",s.strokeText("HEIST",0,.5),s.fillText("HEIST",0,.5),s.strokeStyle=li,s.lineWidth=.03,s.beginPath(),s.moveTo(-2.4,1.15),s.lineTo(2.4,1.15),s.moveTo(-2.1,1.28),s.lineTo(2.1,1.28),s.stroke(),s.restore()}function zv(s,t,e,i,n,r){s.font=`bold ${n}px Georgia, serif`,s.textAlign="center",s.textBaseline="middle",s.fillStyle=r,s.fillText(t,e,i)}function Vv(s,t,e,i,n,r){s.save(),s.strokeStyle=n,s.globalAlpha=r,s.lineWidth=.05;for(let a=0;a<i;a++)s.beginPath(),s.moveTo(t-.3,e+a*.4),s.lineTo(t,e+.25+a*.4),s.lineTo(t+.3,e+a*.4),s.stroke();s.restore()}function Mh(s,t,e,i,n){s.save(),s.strokeStyle=i,s.lineWidth=n,s.beginPath(),t.forEach((r,a)=>a?s.lineTo(r[0],r[1]):s.moveTo(r[0],r[1])),e&&s.closePath(),s.stroke(),s.restore()}function gi(s,t){if(typeof OffscreenCanvas<"u"&&typeof document>"u")return new OffscreenCanvas(s,t);let e=document.createElement("canvas");return e.width=s,e.height=t,e}function Gv(s){return function(){s|=0,s=s+1831565813|0;let t=Math.imul(s^s>>>15,1|s);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function Sh(s=128){let t=gi(s,s),e=t.getContext("2d"),i=e.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.25,"rgba(255,255,255,0.45)"),i.addColorStop(.6,"rgba(255,255,255,0.1)"),i.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=i,e.fillRect(0,0,s,s),t}var bh=ee.ballR,El=ee.incline,Kt=(s,t,e=0)=>new C(s,e,t);function Wv(s){let t=new _n;return s.forEach(([e,i],n)=>n?t.lineTo(e,-i):t.moveTo(e,-i)),t.closePath(),t}function qi(s,t,e=0,i=0){let n=new wr(Wv(s),{depth:t,bevelEnabled:i>0,bevelThickness:i,bevelSize:i,bevelSegments:2,curveSegments:12});return n.rotateX(-Math.PI/2),n.translate(0,e,0),n}function wl(s,t,e=!1){let i=s.length,n=[],r=[],a=o=>s[(o+i)%i];for(let o=0;o<i;o++){let c=e||o>0?a(o-1):null,l=e||o<i-1?a(o+1):null,h=s[o],d=0,u=0,f=(g,p)=>{let b=p[0]-g[0],M=p[1]-g[1],x=Math.hypot(b,M)||1;d+=-M/x,u+=b/x};c&&f(c,h),l&&f(h,l);let m=Math.hypot(d,u)||1;d/=m,u/=m;let v=t/2;if(c&&l){let g=h[0]-c[0],p=h[1]-c[1],b=Math.hypot(g,p)||1,M=-p/b*d+g/b*u;v=Math.min(t*1.5,t/2/Math.max(.3,M))}n.push([h[0]+d*v,h[1]+u*v]),r.push([h[0]-d*v,h[1]-u*v])}return[...n,...r.reverse()]}function Ae(s,t=.5,e=0,i={}){return new ve({color:s,roughness:t,metalness:e,...i})}function ci(s,t=!0){let e=new gn(s);return t&&(e.colorSpace=Ze),e.anisotropy=8,e}var Al=class{constructor(t,e,i){this.m=e,this.g=i,this.canvas=t;let n=this.renderer=new gl({canvas:t,antialias:!0,powerPreference:"high-performance"});n.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),n.outputColorSpace=Ze,n.toneMapping=Yn,n.toneMappingExposure=1.05,n.shadowMap.enabled=!0,n.shadowMap.type=Xn,this.scene=new Ss;let r=ci(Jv());this.scene.background=r,this.camera=new We(36,1,.5,400),this.view=0,this.shakeT=0,this.pf=new Ce,this.pf.rotation.x=El,this.scene.add(this.pf),this.anim={slings:{},pops:{},kick:0},this.buildEnvironment(),this.buildLights(),this.buildPlayfield(),this.buildWalls(),this.buildPosts(),this.buildBumpers(),this.buildSlings(),this.buildFlippers(),this.buildTargets(),this.buildVault(),this.buildSpinnerGate(),this.buildRamps(),this.buildToys(),this.buildInserts(),this.buildApronPlunger(),this.buildCabinet(),this.buildBalls(),this.fps={frames:0,t:0,warm:0},this.setQuality(2),e.onFx((a,o)=>this.onFx(a,o)),window.addEventListener("resize",()=>this.resize())}setQuality(t){this.quality=t;let e=this.renderer,i=window.devicePixelRatio||1;this.pixelRatio=t===2?Math.min(2,i):t===1?Math.min(1.25,i):Math.min(1,i)*.8,e.setPixelRatio(this.pixelRatio);let n=t>0;e.shadowMap.enabled!==n&&(e.shadowMap.enabled=n,this.scene.traverse(o=>{o.material&&(Array.isArray(o.material)?o.material:[o.material]).forEach(c=>{c.needsUpdate=!0})})),this.key.castShadow=n;let r=t===2?2048:1024;this.key.shadow.mapSize.x!==r&&(this.key.shadow.mapSize.set(r,r),this.key.shadow.map&&(this.key.shadow.map.dispose(),this.key.shadow.map=null)),this.cubeEvery=t===2?6:t===1?15:40,this.bloomScale=t===2||t===1?.5:.25,this.composer&&this.composer.dispose();let a=new Te(4,4,{type:Ne,samples:t===2?4:0});return this.composer=new Ml(e,a),this.composer.addPass(new Sl(this.scene,this.camera)),this.bloom=new Gs(new at(256,256),.55,.5,1.05),this.composer.addPass(this.bloom),this.composer.addPass(new bl),this.resize(),["LOW","MEDIUM","HIGH"][t]}cycleQuality(){return this.setQuality((this.quality+2)%3)}buildEnvironment(){let t=new Ss,e=new ht(new zi(100,32,16),new Ee({color:789014,side:Ye}));t.add(e);let i=(a,o,c,l,h)=>{let d=new ht(new qe(a,o),new Ee({color:c,side:ai}));d.position.copy(l),d.lookAt(h),t.add(d)},n=new C(0,0,0);i(30,8,9076848,new C(0,70,30),n),i(30,18,16751168,new C(0,30,-70),n),i(18,50,3166463,new C(-70,20,0),n),i(18,50,16722544,new C(70,20,0),n),i(40,10,16777215,new C(0,40,70),n);let r=new ks(this.renderer);this.envMap=r.fromScene(t,.02).texture,this.scene.environment=this.envMap,this.scene.environmentIntensity=.3}buildLights(){let t=this.scene;t.add(new Cr(10135807,2758704,1.5));let e=this.key=new Lr(16773341,.8);e.position.set(10,60,14),e.target.position.set(10,-2,24),e.castShadow=!0,e.shadow.mapSize.set(2048,2048);let i=e.shadow.camera;i.left=-16,i.right=16,i.top=30,i.bottom=-30,i.near=20,i.far=90,e.shadow.bias=-6e-4,e.shadow.radius=3,t.add(e),t.add(e.target),this.gi=[];let n=(a,o,c,l,h,d=22)=>{let u=new Wn(l,h,d,2);u.position.copy(Kt(a,o,c)),this.pf.add(u),this.gi.push(u),u.userData.base=h};n(4.4,33,2.6,16762250,11,14),n(14.15,33,2.6,16762250,11,14),n(9.3,20,6,16767152,22,24),n(14.2,9.5,3.5,16738952,10,12),this.glowTex=new gn(Sh());let r=(a,o,c,l,h)=>{let d=new ht(new qe(c*2,c*2),new Ee({map:this.glowTex,color:l,transparent:!0,opacity:h,blending:en,depthWrite:!1,toneMapped:!1}));return d.rotation.x=-Math.PI/2,d.position.copy(Kt(a,o,.03)),this.pf.add(d),d};this.pools=[r(1.6,24,3,16756848,.22),r(16.9,24,3,16756848,.22),r(3.2,9,4,8956159,.16),r(16,5.5,3.5,11583743,.14),r(7.5,17.5,2.5,16765322,.16),r(9.3,38.5,4.5,16760960,.1)],this.flashLights={};for(let a of J.flashers){let o=new ht(new zi(.35,16,8,0,Math.PI*2,0,Math.PI/2),new ve({color:a.color,transparent:!0,opacity:.75,roughness:.2,emissive:new Lt(a.color),emissiveIntensity:.1}));o.position.copy(Kt(a.x,a.y,a.z-.2)),this.pf.add(o);let c=r(a.x,a.y,4.5,a.color,0);this.flashLights[a.id]={dome:o,glow:c,f:a}}this.flashLight=new Wn(16777215,0,30,2),this.pf.add(this.flashLight)}buildPlayfield(){let t=gf();this.artCanvas=t;let e=ci(t);e.anisotropy=this.renderer.capabilities.getMaxAnisotropy();let i=new qe(J.W,J.L);i.rotateX(-Math.PI/2),i.translate(J.W/2,0,J.L/2);let n=new ve({map:e,roughness:.55,metalness:0,envMapIntensity:.12}),r=new ht(i,n);r.receiveShadow=!0,this.pf.add(r);let a=new ht(new we(J.W,.75,J.L),Ae(2824720,.8));a.position.set(J.W/2,-.38,J.L/2),this.pf.add(a)}buildWalls(){let t=Ae(12884548,.5,1),e=Ae(1183260,.35,.2),i=Ae(10263723,.3,1),n=(o,c,l=!0)=>{let h=new ht(o,c);return h.castShadow=l,h.receiveShadow=!0,this.pf.add(h),h};for(let o of J.walls)o.style!=="hidden"&&n(qi(wl(o.pts,.22),1.3),[i,i]);let r=[];for(let o=0;o<=90;o++){let c=Math.PI+o/90*Math.PI;r.push([J.arch.cx+Math.cos(c)*(J.arch.r+.11),J.arch.cy+Math.sin(c)*(J.arch.r+.11)])}n(qi(wl(r,.22),1.35),[i,i]);for(let o of J.solids)n(qi(wl(o.pts,.18,!0),o.h??1.2),[t,e]);for(let o of J.laneGuides){n(qi(wl([[o.x,o.y0],[o.x,o.y1]],o.r*2),.9),[i,i]);let c=new ht(new _e(.14,.14,.15,12),t);c.position.copy(Kt(o.x,o.y0,.95)),this.pf.add(c)}let a=Ae(9079446,.62,1);this.mats={gold:t,lacquer:e,chrome:i,brushed:a}}buildPosts(){let{gold:t,chrome:e}=this.mats,i=Ae(15921128,.85,0),n=new _e(.1,.12,1.15,12);for(let r of J.posts){let a=new ht(n,r.mat==="metal"?e:t);if(a.position.copy(Kt(r.x,r.y,.575)),a.castShadow=!0,this.pf.add(a),r.mat==="post"&&r.r>.12){let c=new ht(new Vi(r.r-.05,.08,8,24),i);c.rotation.x=Math.PI/2,c.position.copy(Kt(r.x,r.y,.53)),c.castShadow=!0,this.pf.add(c)}let o=new ht(new _e(.16,.13,.12,12),t);o.position.copy(Kt(r.x,r.y,1.18)),this.pf.add(o)}this.rubberMat=i}buildBumpers(){this.bumpers={};let t=ci(Kv());for(let e of J.bumpers){let i=new Ce;i.position.copy(Kt(e.x,e.y,0));let n=new ht(new _e(1.05,1.1,.12,32),Ae(1052696,.6));n.position.y=.06,i.add(n);let r=new ht(new _e(.98,1.08,.1,32),Ae(11538474,.3,0,{transparent:!0,opacity:.9}));r.position.y=.17,i.add(r);let a=new ve({color:16771552,roughness:.25,transparent:!0,opacity:.85,emissive:new Lt(16732240),emissiveIntensity:.4}),o=new ht(new _e(.72,.72,.95,32,1,!0),a);o.position.y=.7,i.add(o);let c=new ht(new Vi(.9,.07,10,36),this.mats.chrome);c.rotation.x=Math.PI/2,c.position.y=.62,i.add(c);let l=new ve({map:t,roughness:.2,transparent:!0,opacity:.95,emissive:new Lt(16724032),emissiveMap:t,emissiveIntensity:.4}),h=new ht(new _e(1.25,1.18,.32,40),[Ae(12589104,.25,0,{transparent:!0,opacity:.9}),l,Ae(3145736)]);h.position.y=1.3,i.add(h),i.traverse(d=>{d.castShadow=!0}),this.pf.add(i),this.bumpers[e.id]={grp:i,ring:c,body:o,capMat:l,bodyMat:a,t:0}}}buildSlings(){this.slings={};let t=ci(jv("#9a0e26","#e8b858"));t.wrapS=t.wrapT=xs,t.repeat.set(.35,.35);for(let e of J.slings){let i=[e.A,...e.lower,e.D],n=new ht(qi(i,.9),[this.mats.lacquer,this.mats.lacquer]);n.castShadow=!0,this.pf.add(n);let r=new ht(qi(i,.07,1.12),[new ve({map:t,color:16777215,roughness:.2,transparent:!0,opacity:.9,emissive:new Lt(3801096),emissiveIntensity:.8}),this.mats.gold]);r.castShadow=!0,this.pf.add(r);let[a,o]=e.A,[c,l]=e.D,h=Math.hypot(c-a,l-o),d=new ht(new _e(.1,.1,h,10),this.rubberMat),u=Kt((a+c)/2,(o+l)/2,.5);d.position.copy(u),d.rotation.z=Math.PI/2,d.rotation.y=-Math.atan2(l-o,c-a),d.castShadow=!0,this.pf.add(d);let f=(l-o)/h,m=-(c-a)/h,v=e.id==="slingL"?1:-1;this.slings[e.id]={band:d,mid:u,n:new C(f*v,0,m*v),t:0};for(let g of[e.A,e.C,e.D]){let p=new ht(new Vi(.2,.08,8,20),this.rubberMat);p.rotation.x=Math.PI/2,p.position.copy(Kt(g[0],g[1],.5)),this.pf.add(p);let b=new ht(new _e(.09,.09,1.1,10),this.mats.gold);b.position.copy(Kt(g[0],g[1],.55)),this.pf.add(b)}}}buildFlippers(){this.flippers={};for(let t of this.m.world.flippers){let e=c=>{let l=[],d=t.rb+c,u=t.rt+c,f=Math.asin((t.rb-t.rt)/t.L);for(let m=0;m<=18;m++){let v=Math.PI/2+f+(Math.PI-2*f)*m/18;l.push([Math.cos(v)*d,Math.sin(v)*d])}for(let m=0;m<=18;m++){let v=-Math.PI/2+f+(Math.PI-2*f)*m/18;l.push([t.L+Math.cos(v)*u,Math.sin(v)*u])}return l},i=new Ce;i.position.copy(Kt(t.px,t.py,0));let n=new ht(qi(e(-.07),.78,.1),Ae(16118766,.35,0)),r=new ht(qi(e(0),.34,.32),Ae(12849194,.7)),a=new ht(new _e(.18,.18,.1,16),this.mats.gold);a.position.set(0,.92,0);for(let c of[n,r])c.castShadow=!0,c.receiveShadow=!0,i.add(c);i.add(a);let o=new ht(qi([[.2,-.06],[t.L-.2,-.03],[t.L-.2,.03],[.2,.06]],.02,.885),Ae(13936202,.3,1));i.add(o),this.pf.add(i),this.flippers[t.id]={grp:i,f:t}}}buildTargets(){this.drops=J.drops.map((t,e)=>{let i=ci(Zv(e)),n=Math.hypot(t.b[0]-t.a[0],t.b[1]-t.a[1]),r=new ht(new we(n,1.05,.2),[Ae(3148298),Ae(3148298),Ae(4198416),Ae(4198416),new ve({map:i,roughness:.35,emissive:new Lt(16719904),emissiveMap:i,emissiveIntensity:.25}),Ae(3148298)]);return r.position.copy(Kt(t.cx,t.a[1],.52)),r.castShadow=!0,this.pf.add(r),{mesh:r,y:.52}}),this.standups=J.standups.map((t,e)=>{let i=(t.a[0]+t.b[0])/2,n=t.b[0]-t.a[0],r=new ht(new we(n,.75,.12),new ve({color:16762928,roughness:.3,emissive:new Lt(16752640),emissiveIntensity:.25}));return r.position.copy(Kt(i,t.a[1]-.06,.62)),r.castShadow=!0,this.pf.add(r),{mesh:r,base:r.position.clone(),t:0}})}buildVault(){let t=new ve({color:16760896,metalness:1,roughness:.45,emissive:new Lt(8409088),emissiveIntensity:.4}),e=new we(.62,.26,.3);for(let u=0;u<9;u++){let f=new ht(e,t),m=Math.floor(u/3),v=u%3;f.position.copy(Kt(6.8+v*.72+m%2*.1,12.35+m*.02,.13+m*.27)),f.rotation.y=u%2?.08:-.06,this.pf.add(f)}let i=new Wn(16756800,3,5,2);i.position.copy(Kt(7.6,13.2,1.2)),this.pf.add(i),this.vaultLight=i;let n=new Ce;n.position.copy(Kt(6.3,14.8,0));let r=new Ce;r.position.set(1.3,1.3,0);let a=new ve({color:12106952,metalness:1,roughness:.45}),o=new ht(new _e(1.28,1.28,.3,48),a);o.rotation.x=Math.PI/2,r.add(o);let c=new ht(new Vi(1.2,.07,8,48),this.mats.gold);c.position.z=.16,r.add(c);for(let u=0;u<12;u++){let f=u/12*Math.PI*2,m=new ht(new _e(.07,.07,.12,8),this.mats.gold);m.rotation.x=Math.PI/2,m.position.set(Math.cos(f)*1.02,Math.sin(f)*1.02,.18),r.add(m)}let l=new Ce;l.position.z=.22,l.add(new ht(new Vi(.5,.05,8,32),this.mats.chrome));for(let u=0;u<3;u++){let f=new ht(new _e(.035,.035,1,6),this.mats.chrome);f.rotation.z=u*Math.PI/3,l.add(f)}let h=new ht(new _e(.14,.14,.12,12),this.mats.gold);h.rotation.x=Math.PI/2,l.add(h),r.add(l),r.traverse(u=>{u.castShadow=!0}),n.add(r),this.pf.add(n),this.vault={hinge:n,wheel:l,open:0,spin:0};let d=new ht(new qe(2.8,.7),new Ee({map:ci(ta("THE VAULT","#ffd27a","#2a1600")),transparent:!0,toneMapped:!1}));d.position.copy(Kt(7.6,11.95,2.4)),this.pf.add(d),this.vaultSign=d}buildSpinnerGate(){let t=J.spinner,e=new Ce;e.position.copy(Kt((t.a[0]+t.b[0])/2,t.a[1],.95));let i=new ht(new we(1.25,.55,.04),new ve({color:14211296,metalness:1,roughness:.45,map:ci(ta("$","#222","#d4a64a"))}));i.position.y=-.3;let n=new Ce;n.add(i),e.add(n);for(let h of[-.68,.68]){let d=new ht(new _e(.04,.04,1,6),this.mats.chrome);d.position.set(h,-.45,0),e.add(d)}this.pf.add(e),this.spinnerAxle=n;let r=J.gates[0],a=new Ce;a.position.copy(Kt(r.a[0],r.a[1],.9));let o=Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]);a.rotation.y=-Math.atan2(r.b[1]-r.a[1],r.b[0]-r.a[0]);let c=new ht(new we(o,.7,.03),this.mats.chrome);c.position.set(o/2,-.35,0);let l=new Ce;l.add(c),a.add(l),this.pf.add(a),this.gatePivot=l}buildRamps(){let t=new ve({color:10473727,roughness:.08,metalness:.1,transparent:!0,opacity:.32,side:ai,depthWrite:!1,envMapIntensity:1.5}),e=t.clone();e.color=new Lt(16752568);let i=this.mats.chrome,n=(c,l,h,d)=>{let u=c.samples,f=Math.floor(u.length*l);if(f>1&&this.pf.add(qv(u.slice(0,f+1),1.05,.85,h)),f<u.length-1&&Yv(this.pf,u.slice(Math.max(0,f-1)),i),d){let m=u[0],v=new ht(new we(2.1,.03,.5),this.mats.brushed);v.position.copy(Kt(m.x,m.y+.05,.02)),this.pf.add(v)}},r=this.m.world.paths;n(r.rampL,J.ramps.rampL.plasticUntil,t,!0),n(r.rampR,J.ramps.rampR.plasticUntil,e,!0),n(r.returnL,0,null,!1),n(r.returnR,0,null,!1),n(r.vuk,0,null,!1);let a=new ht(new qe(2.4,.6),new Ee({map:ci(ta("SKYWAY","#7ad0ff","#001428")),transparent:!0,toneMapped:!1}));a.position.copy(Kt(3.15,13.5,2.75)),a.rotation.x=-.2,this.pf.add(a);let o=new ht(new qe(2.4,.6),new Ee({map:ci(ta("GETAWAY","#ff7aa8","#280012")),transparent:!0,toneMapped:!1}));o.position.copy(Kt(10.5,13.5,2.75)),o.rotation.x=-.2,this.pf.add(o),this.neonSigns=[a,o,this.vaultSign]}buildToys(){let t=new Ce;t.position.copy(Kt(5.3,16.6,0));let e=new ve({color:2302266,roughness:.55,metalness:.3}),i=ci($v()),n=new ve({map:i,emissive:new Lt(16762992),emissiveMap:i,emissiveIntensity:1.1,roughness:.4}),r=[[1.6,2.2,1.6],[1.25,1.6,1.2],[.9,1.2,.9],[.55,.8,.55]],a=0;for(let[h,d,u]of r){let f=new ht(new we(h,d,u),[n,n,e,e,n,n]);f.position.y=a+d/2,t.add(f),a+=d;let m=new ht(new we(h+.1,.06,u+.1),this.mats.gold);m.position.y=a,t.add(m)}let o=new ht(new gr(.16,1.4,8),this.mats.gold);o.position.y=a+.7,t.add(o);let c=new ht(new zi(.09,8,8),new Ee({color:16724016,toneMapped:!1}));c.position.y=a+1.45,t.add(c),this.beacon=c,t.traverse(h=>{h.castShadow=!0}),this.pf.add(t);let l=new ht(new qe(2.6,.75),new Ee({map:ci(ta("HIDEOUT","#6aff9a","#00240c")),transparent:!0,toneMapped:!1}));l.position.copy(Kt(15.9,16.4,2.2)),l.rotation.x=-.25,this.pf.add(l),this.neonHide=l,this.sirens=[];for(let[h,d]of[[12.1,12.8],[16.3,12.2]]){let u=new ht(new _e(.22,.26,.5,16),new ve({color:16719920,emissive:new Lt(16715808),emissiveIntensity:.3,transparent:!0,opacity:.9}));u.position.copy(Kt(h,d,1.6)),this.pf.add(u),this.sirens.push(u)}}buildInserts(){let t=new gn(Sh());this.inserts=[],this.insertById={};for(let e of J.inserts){let i=Xv(e),n=new Ar(i,16);n.rotateX(-Math.PI/2);let r=Qr[e.color]||Qr.white,a=new Lt(r[0],r[1],r[2]),o=new Ee({color:a.clone(),transparent:!0,opacity:1,blending:en,depthWrite:!1,toneMapped:!1}),c=new ht(n,o);c.position.copy(Kt(e.x,e.y,.012)),c.rotation.y=-(e.rot||0)*Math.PI/180,this.pf.add(c);let l=new ht(new qe(1,1),new Ee({map:t,color:a.clone(),transparent:!0,blending:en,depthWrite:!1,toneMapped:!1}));l.rotation.x=-Math.PI/2;let h=e.size*3.2*(e.w?1.5:1);l.scale.set(h,h,1),l.position.copy(Kt(e.x,e.y,.02)),this.pf.add(l);let d={ins:e,mesh:c,halo:l,base:a,v:0};this.inserts.push(d),this.insertById[e.id]=d}}buildApronPlunger(){let t=[[0,41.8],[6.7,41.8],[8.1,42.35],[10.45,42.35],[11.85,41.8],[18.55,41.8],[18.55,45],[0,45]],e=ci(Qv()),i=new ht(qi(t,.35),[new ve({map:e,roughness:.55,metalness:.4}),Ae(1709602,.5,.8)]),n=i.geometry.attributes.uv,r=i.geometry.attributes.position;for(let u=0;u<n.count;u++)n.setXY(u,r.getX(u)/18.55,1-(r.getZ(u)-41.8)/3.2);i.receiveShadow=!0,this.pf.add(i);let a=J.plunger,o=new ht(new _e(.1,.1,3.2,12),this.mats.chrome);o.rotation.x=Math.PI/2;let c=new ht(new _e(.28,.28,.35,16),Ae(1710618,.6));c.rotation.x=Math.PI/2,c.position.z=-1.6;let l=new ht(new zi(.55,20,12),new ve({color:13637680,roughness:.2,metalness:.2,transparent:!0,opacity:.92}));l.position.z=2.2;let h=new Ce;h.add(o),h.add(c),h.add(l),h.position.copy(Kt(a.laneX,a.y+1.6+.18,.55)),this.pf.add(h),this.plunger={grp:h,base:h.position.clone()};let d=new ht(new _e(.22,.22,1.2,12,1,!0),new ve({color:13421772,metalness:1,roughness:.45,wireframe:!0}));d.rotation.x=Math.PI/2,d.position.copy(Kt(a.laneX,a.y+.8,.55)),this.pf.add(d),this.plunger.spring=d}buildCabinet(){let t=Ae(1773600,.45,.2),e=ci(ty()),i=new ve({map:e,roughness:.5,metalness:.15}),n=new we(1,6.5,50);for(let d of[-.5,J.W+.5]){let u=new ht(n,[i,i,t,t,t,t]);u.position.set(d,-.6,22.5),this.pf.add(u);let f=new ht(new we(1.1,.25,50),this.mats.brushed);f.position.set(d,2.75,22.5),this.pf.add(f)}let r=new ht(new we(J.W+2,6.5,1),t);r.position.set(J.W/2,-.6,-.5),this.pf.add(r);let a=new ht(new we(J.W+2.2,1,1.6),this.mats.brushed);a.position.set(J.W/2,2.4,45.6),this.pf.add(a);let o=new ht(new we(J.W+2,8,1),t);o.position.set(J.W/2,-2,45.9),this.pf.add(o);for(let d of[-1.05,J.W+1.05]){let u=new ht(new _e(.45,.45,.4,20),Ae(13637680,.3));u.rotation.z=Math.PI/2,u.position.set(d,.5,41),this.pf.add(u)}let c=new ht(new we(J.W+2.4,3,8),t);c.position.set(J.W/2,.8,-4.5),this.pf.add(c);let l=ci(ey()),h=new ht(new qe(J.W+1.6,12),new Ee({map:l,toneMapped:!1,color:12303291}));h.position.set(J.W/2,8.5,-1.2),h.rotation.x=-El,this.pf.add(h)}buildBalls(){this.ballGeo=new zi(bh,40,24),this.ghostGeo=new zi(bh*.96,16,10),this.cubeRT=new Hs(192,{type:Ne,generateMipmaps:!0,minFilter:Gi}),this.cubeCam=new Ps(.3,300,this.cubeRT),this.cubeCam.layers.enable(2),this.cubeCam.children.forEach(r=>r.layers.enable(2)),this.pf.add(this.cubeCam),this.cubeCam.position.copy(Kt(J.W/2,27,1.2));let t=(r,a,o,c,l,h,d)=>{let u=new ht(new qe(r,a),new Ee({color:o,side:ai}));u.position.copy(Kt(c,l,h)),u.rotation.x=d,u.layers.set(2),this.pf.add(u)};t(14,3.5,16774888,J.W/2,18,30,Math.PI/2),t(14,3.5,16774888,J.W/2,34,30,Math.PI/2),t(26,10,16752720,J.W/2,-6,12,0),t(30,14,4212864,J.W/2,60,18,0),this.ballMat=new ve({color:16777215,metalness:1,roughness:.05,envMap:this.cubeRT.texture,envMapIntensity:1.25}),this.cubeFrame=0,this.ballMeshes=new Map;let e=gi(64,64),i=e.getContext("2d"),n=i.createRadialGradient(32,32,2,32,32,32);n.addColorStop(0,"rgba(0,0,0,0.75)"),n.addColorStop(1,"rgba(0,0,0,0)"),i.fillStyle=n,i.fillRect(0,0,64,64),this.shadowTex=new gn(e)}onFx(t,e){switch(t){case"kick":this.slings[e.id]&&(this.slings[e.id].t=.09),this.bumpers[e.id]&&(this.bumpers[e.id].t=.12);break;case"hit":e.id==="standC"&&(this.standups[0].t=.12),e.id==="standR"&&(this.standups[1].t=.12),e.id==="vaultDoor"&&(this.vault.shake=.2);break;case"nudge":this.shakeT=.18;break}}setView(t){this.view=t}cycleView(){return this.view=(this.view+1)%3,["PLAYER","OVERHEAD","CINEMATIC"][this.view]}resize(){let t=this.canvas.clientWidth||window.innerWidth,e=this.canvas.clientHeight||window.innerHeight;this.renderer.setSize(t,e,!1),this.composer.setPixelRatio(this.pixelRatio),this.composer.setSize(t,e),this.bloom.setSize(Math.round(t*this.pixelRatio*this.bloomScale),Math.round(e*this.pixelRatio*this.bloomScale)),this.fitKey=null,this.camera.aspect=t/e,this.camera.updateProjectionMatrix()}fitCamera(t,e,i,n){let r=this.camera,a=this.canvas.clientWidth||window.innerWidth,o=this.canvas.clientHeight||window.innerHeight;r.fov=i,r.clearViewOffset();let c=[[0,.5,3.5],[J.W,.5,3.5],[-.6,45.8,1.5],[J.W+.6,45.8,1.5],[J.W/2,-.2,3.8]].map(([p,b,M])=>Kt(p,b,M).applyMatrix4(this.pf.matrixWorld)),l=t.clone().normalize(),h=p=>{r.position.copy(e).addScaledVector(l,p),r.lookAt(e),r.updateMatrixWorld(),r.updateProjectionMatrix();let b=1e9,M=-1e9,x=0;for(let T of c){let E=T.clone().project(r);b=Math.min(b,E.y),M=Math.max(M,E.y),x=Math.max(x,Math.abs(E.x))}return{minY:b,maxY:M,maxX:x}},d=(o-n)/o*2,u=5,f=400;for(let p=0;p<40;p++){let b=(u+f)/2,M=h(b);M.maxY-M.minY<=d*.985&&M.maxX<=.98?f=b:u=b}let g=(-1-h(f).minY+.01)*o/2;r.setViewOffset(a,o,0,g,a,o),r.updateProjectionMatrix()}updateCamera(t){let e=this.camera,i=e.aspect,n=(c,l,h=0)=>Kt(c,l,h).applyMatrix4(this.pf.matrixWorld);this.pf.updateMatrixWorld();let r=document.getElementById("dmdWrap"),a=r?r.getBoundingClientRect().bottom+6:0,o=`${this.view}|${i.toFixed(3)}|${a.toFixed(0)}`;if(this.view===2){e.clearViewOffset();let c=26,l=this.m.world.balls.filter(h=>h.mode!=="gone");l.length&&(c=l.reduce((h,d)=>h+d.y,0)/l.length*.5+12),this.camTrack=this.camTrack==null?c:this.camTrack+(c-this.camTrack)*Math.min(1,t*2.5),e.fov=44,e.position.copy(n(J.W/2,this.camTrack+30,20)),e.lookAt(n(J.W/2,this.camTrack-4)),e.updateProjectionMatrix(),this.fitKey=null}else if(o!==this.fitKey){this.fitKey=o;let c=n(J.W/2,22.5);if(this.view===1||i<.75){let l=new C(0,Math.cos(El),Math.sin(El));this.fitCamera(l.add(new C(0,0,.35)),c,32,a)}else{let l=n(J.W/2,68.5,30);this.fitCamera(l.sub(c),c,34,a)}this.basePos=e.position.clone()}this.view!==2&&this.basePos&&(e.position.copy(this.basePos),this.shakeT>0&&(this.shakeT-=t,e.position.add(new C((Math.random()-.5)*.25,0,(Math.random()-.5)*.25))))}render(t){let e=this.m,i=this.g,n=e.world,r=performance.now()/1e3;for(let M in this.flippers){let x=this.flippers[M];x.grp.rotation.y=-x.f.angle}let a=new Set;for(let M of n.balls){if(M.mode==="gone")continue;a.add(M.id);let x=this.ballMeshes.get(M.id);if(!x){let y=new ht(this.ballGeo,this.ballMat);y.castShadow=!0;let A=new ht(new qe(1.5,1.5),new Ee({map:this.shadowTex,transparent:!0,depthWrite:!1}));A.rotation.x=-Math.PI/2,this.pf.add(y),this.pf.add(A);let P=[];for(let N=0;N<4;N++){let O=new ht(this.ghostGeo,new Ee({color:13160703,transparent:!0,opacity:0,depthWrite:!1}));this.pf.add(O),P.push(O)}x={mesh:y,blob:A,ghosts:P,prev:null},this.ballMeshes.set(M.id,x)}let T=M.mode==="path"?M.z:0;x.mesh.position.copy(Kt(M.x,M.y,T+bh)),x.mesh.quaternion.set(M.q[0],M.q[1],M.q[2],M.q[3]),x.blob.position.copy(Kt(M.x+.12,M.y+.2,(M.mode==="path"?Math.max(0,T-.02):0)+.015)),x.blob.material.opacity=M.mode==="path"?.35:.6,x.mesh.visible=x.blob.visible=M.mode!=="held";let E=x.mesh.position,R=x.prev?x.prev.distanceTo(E)/Math.max(.001,t):0;x.ghosts.forEach((y,A)=>{let P=x.prev&&R>90&&x.mesh.visible;y.visible=!!P,P&&(y.position.lerpVectors(E,x.prev,(A+1)/5),y.material.opacity=Math.min(.28,(R-90)/700)*(1-A/4))}),x.prev=(x.prev||new C).copy(E)}for(let[M,x]of this.ballMeshes)if(!a.has(M)){this.pf.remove(x.mesh),this.pf.remove(x.blob),x.blob.geometry.dispose();for(let T of x.ghosts)this.pf.remove(T),T.material.dispose();this.ballMeshes.delete(M)}for(let M in this.bumpers){let x=this.bumpers[M];x.t=Math.max(0,x.t-t);let T=x.t>0?1:0;x.ring.position.y=.62-T*.32,x.capMat.emissiveIntensity=.18+T*3.5,x.bodyMat.emissiveIntensity=.35+T*4}for(let M in this.slings){let x=this.slings[M];x.t=Math.max(0,x.t-t);let T=x.t>0?Math.sin(x.t/.09*Math.PI):0;x.band.position.copy(x.mid).addScaledVector(x.n,T*.35)}this.drops.forEach((M,x)=>{let T=e.dropsDown[x]?-.6:.52;M.y+=(T-M.y)*Math.min(1,t*(e.dropsDown[x]?30:14)),M.mesh.position.y=M.y,M.mesh.visible=M.y>-.5});for(let M of this.standups)M.t=Math.max(0,M.t-t),M.mesh.position.copy(M.base).add(new C(0,0,-M.t*.8));let o=e.doorOpen?1:0;this.vault.open+=(o-this.vault.open)*Math.min(1,t*5),this.vault.hinge.rotation.y=this.vault.open*1.9,this.vault.spin+=t*(.4+(e.doorOpen?0:1.6)*(i.p&&i.p.lockLit?1:.2)),this.vault.wheel.rotation.z=this.vault.spin,this.vault.shake>0?(this.vault.shake-=t,this.vault.hinge.position.x=6.3+Math.sin(r*90)*.04):this.vault.hinge.position.x=6.3,this.spinnerAxle.rotation.x=e.h.spinner.angle;let c=0;for(let M of n.gateAnim.values())c=Math.max(c,M);for(let[M,x]of n.gateAnim)n.gateAnim.set(M,Math.max(0,x-t*3));this.gatePivot.rotation.x=-c*1.2;let l=n.plunger,h=l.pull*l.maxPull;this.plunger.grp.position.copy(this.plunger.base).add(new C(0,0,h+(l.releaseAnim>0?-.25:0))),this.plunger.spring.scale.y=1-l.pull*.45;let d=i.lamps();for(let M of this.inserts){let x=d[M.ins.id]||0;M.v+=(x-M.v)*Math.min(1,t*(x>M.v?40:14));let T=M.v;M.mesh.material.color.copy(M.base).multiplyScalar(.04+T*2.1),M.halo.material.color.copy(M.base).multiplyScalar(T*.3),M.halo.visible=T>.02}let u=i.flasherLevels(),f=null,m=0;for(let M in this.flashLights){let x=this.flashLights[M],T=u[M]||0;x.dome.material.emissiveIntensity=.15+T*6,x.glow.material.opacity=T*.55,T>m&&(m=T,f=x)}f&&(this.flashLight.position.copy(Kt(f.f.x,f.f.y,f.f.z)),this.flashLight.color.setHex(f.f.color)),this.flashLight.intensity=m*50;let v=i.tilted?.15:1,g=i.wizard?.5+.5*Math.sin(r*5):i.mb?.5+.5*Math.sin(r*7):0,p=i.wizard?this._gold||(this._gold=new Lt(16760896)):this._red||(this._red=new Lt(16719920));for(let M of this.gi)M.intensity=M.userData.base*v,M.userData.col||(M.userData.col=M.color.clone()),M.color.copy(M.userData.col).lerp(p,g*.6);this.beacon.visible=Math.floor(r*1.5)%2===0;let b=i.mb||i.wizard;this.sirens.forEach((M,x)=>{M.material.emissiveIntensity=b?Math.sin(r*10+x*Math.PI)>0?3:.2:.3});for(let M of this.neonSigns)M.material.color.setScalar(i.tilted?.2:1.25+Math.sin(r*3+M.id)*.12);if(this.neonHide.material.color.setScalar(d.startJob||d.extraBallLit?1.6:.9),this.vaultLight.intensity=2+(e.doorOpen?5:0)+(u.flVault||0)*15,this.updateCamera(t),this.fps.frames++,this.fps.t+=t,this.fps.warm+=t,this.fps.t>=3){let M=this.fps.frames/this.fps.t;this.fps.frames=0,this.fps.t=0,this.fps.warm>4&&M<48&&this.quality>0&&!this.manualQuality&&(this.setQuality(this.quality-1),this.onQualityChange&&this.onQualityChange(["LOW","MEDIUM","HIGH"][this.quality],M))}if(this.cubeFrame++%this.cubeEvery===0){for(let M of this.ballMeshes.values())M.mesh.visible=!1;this.cubeCam.update(this.renderer,this.scene);for(let M of n.balls){let x=this.ballMeshes.get(M.id);x&&(x.mesh.visible=M.mode!=="held")}}this.composer.render(t)}};function Xv(s){let t=s.size,e=new _n;switch(s.shape){case"circle":e.absarc(0,0,t/2,0,Math.PI*2,!1);break;case"rect":{let i=(s.w||t*2)/2,n=t/2,r=n*.6;e.moveTo(-i+r,-n),e.lineTo(i-r,-n),e.quadraticCurveTo(i,-n,i,-n+r),e.lineTo(i,n-r),e.quadraticCurveTo(i,n,i-r,n),e.lineTo(-i+r,n),e.quadraticCurveTo(-i,n,-i,n-r),e.lineTo(-i,-n+r),e.quadraticCurveTo(-i,-n,-i+r,-n);break}case"arrow":{let i=t,n=t*.42;[[0,-i*.62],[n,-i*.08],[n*.45,-i*.08],[n*.45,i*.5],[-n*.45,i*.5],[-n*.45,-i*.08],[-n,-i*.08]].forEach(([a,o],c)=>c?e.lineTo(a,-o):e.moveTo(a,-o)),e.closePath();break}case"tri":e.moveTo(0,t*.55),e.lineTo(t*.5,-t*.35),e.lineTo(-t*.5,-t*.35),e.closePath();break;case"star":for(let i=0;i<10;i++){let n=i%2?t*.24:t*.55,r=-Math.PI/2+i*Math.PI/5,a=Math.cos(r)*n,o=-Math.sin(r)*n;i===0?e.moveTo(a,o):e.lineTo(a,o)}e.closePath();break}return e}function qv(s,t,e,i){let n=[],r=[],a=s.length,o=new C(0,1,0),c=[];for(let u=0;u<a;u++){let f=s[Math.max(0,u-1)],m=s[Math.min(a-1,u+1)],v=new C(m.x-f.x,m.z-f.z,m.y-f.y).normalize(),g=new C().crossVectors(v,o).normalize(),p=Kt(s[u].x,s[u].y,s[u].z),b=t/2+.05,M=p.clone().addScaledVector(g,-b),x=p.clone().addScaledVector(g,b);c.push([M.clone().add(new C(0,e,0)),M,x,x.clone().add(new C(0,e,0))])}c.forEach(u=>u.forEach(f=>n.push(f.x,f.y,f.z)));for(let u=0;u<a-1;u++)for(let f=0;f<3;f++){let m=u*4+f,v=m+1,g=m+4,p=m+5;r.push(m,g,v,v,g,p)}let l=new De;l.setAttribute("position",new ie(n,3)),l.setIndex(r),l.computeVertexNormals();let h=new ht(l,i);h.renderOrder=2;let d=new Ce;d.add(h);for(let u of[0,3]){let f=new Vn(c.filter((v,g)=>g%3===0||g===a-1).map(v=>v[u])),m=new ht(new As(f,Math.max(8,a),.05,6),new ve({color:14737640,metalness:1,roughness:.45}));d.add(m)}return d}function Yv(s,t,e){let i=new C(0,1,0),n=[[-.36,.02],[.36,.02],[-.6,.55],[.6,.55]],r=n.map(()=>[]),a=Math.max(1,Math.floor(t.length/60));for(let o=0;o<t.length;o+=a){let c=t[Math.max(0,o-1)],l=t[Math.min(t.length-1,o+1)],h=new C(l.x-c.x,l.z-c.z,l.y-c.y).normalize(),d=new C().crossVectors(h,i).normalize(),u=Kt(t[o].x,t[o].y,t[o].z);if(n.forEach(([f,m],v)=>r[v].push(u.clone().addScaledVector(d,f).add(new C(0,m-.05,0)))),o/a%7===3){let f=new ht(new Vi(.62,.03,6,16,Math.PI),e);f.position.copy(u).add(new C(0,.25,0)),f.lookAt(u.clone().add(h)),f.rotateZ(Math.PI),s.add(f)}}for(let o of r){if(o.length<2)continue;let c=new Vn(o),l=new ht(new As(c,o.length*2,.055,6),e);l.castShadow=!0,s.add(l)}}function Jv(){let s=gi(1024,512),t=s.getContext("2d"),e=t.createLinearGradient(0,0,0,512);e.addColorStop(0,"#0d0918"),e.addColorStop(.6,"#07050e"),e.addColorStop(1,"#030206"),t.fillStyle=e,t.fillRect(0,0,1024,512);let i=["255,60,140","60,170,255","255,180,70","140,80,255"],n=3,r=()=>(n=n*16807%2147483647)/2147483647;for(let o=0;o<38;o++){let c=r()*1024,l=40+r()*300,h=12+r()*50;if(c>330&&c<694)continue;let d=i[o%i.length],u=t.createRadialGradient(c,l,0,c,l,h);u.addColorStop(0,`rgba(${d},${.1+r()*.14})`),u.addColorStop(1,`rgba(${d},0)`),t.fillStyle=u,t.beginPath(),t.arc(c,l,h,0,Math.PI*2),t.fill()}t.strokeStyle="rgba(255,70,150,0.22)",t.lineWidth=6,t.lineCap="round",t.beginPath(),t.moveTo(90,140),t.lineTo(250,140),t.moveTo(110,175),t.lineTo(230,175),t.stroke(),t.strokeStyle="rgba(80,180,255,0.2)",t.beginPath(),t.moveTo(800,120),t.lineTo(940,120),t.lineTo(940,200),t.stroke();let a=t.createLinearGradient(0,380,0,512);return a.addColorStop(0,"rgba(60,40,90,0)"),a.addColorStop(1,"rgba(60,40,90,0.25)"),t.fillStyle=a,t.fillRect(0,380,1024,132),s}function Kv(){let s=gi(256,256),t=s.getContext("2d"),e=t.createRadialGradient(128,128,10,128,128,128);e.addColorStop(0,"#ffe0c0"),e.addColorStop(.5,"#e02040"),e.addColorStop(1,"#600010"),t.fillStyle=e,t.fillRect(0,0,256,256),t.strokeStyle="#ffd27a",t.lineWidth=6;for(let i=0;i<12;i++){let n=i/12*Math.PI*2;t.beginPath(),t.moveTo(128+Math.cos(n)*30,128+Math.sin(n)*30),t.lineTo(128+Math.cos(n)*118,128+Math.sin(n)*118),t.stroke()}return t.fillStyle="#ffd27a",t.font="bold 44px Georgia",t.textAlign="center",t.textBaseline="middle",t.fillText("ALARM",128,128),s}function jv(s,t){let e=gi(256,256),i=e.getContext("2d");i.fillStyle=s,i.fillRect(0,0,256,256),i.strokeStyle=t,i.lineWidth=5;for(let n=-256;n<512;n+=26)i.beginPath(),i.moveTo(n,0),i.lineTo(n+256,256),i.stroke();return e}function Zv(s){let t=gi(128,160),e=t.getContext("2d");e.fillStyle="#1a0306",e.fillRect(0,0,128,160),e.fillStyle="#ff2a2a";for(let n=0;n<4;n++)e.fillRect(0,22+n*34,128,6);e.strokeStyle="#ffd27a",e.lineWidth=8,e.beginPath(),e.arc(64,84,30,0,Math.PI*2),e.stroke();let i=e.createRadialGradient(64,84,2,64,84,24);return i.addColorStop(0,"#ffffff"),i.addColorStop(.3,"#ff5050"),i.addColorStop(1,"#600000"),e.fillStyle=i,e.beginPath(),e.arc(64,84,22,0,Math.PI*2),e.fill(),t}function ta(s,t,e){let i=gi(512,128),n=i.getContext("2d");return n.fillStyle=e,n.fillRect(0,0,512,128),n.strokeStyle=t,n.lineWidth=6,n.strokeRect(8,8,496,112),n.font="bold 76px Georgia",n.textAlign="center",n.textBaseline="middle",n.shadowColor=t,n.shadowBlur=24,n.fillStyle=t,n.fillText(s,256,68),n.shadowBlur=0,n.fillStyle="#ffffff",n.globalAlpha=.65,n.fillText(s,256,68),i}function $v(){let s=gi(128,256),t=s.getContext("2d");t.fillStyle="#15132a",t.fillRect(0,0,128,256);for(let e=6;e<250;e+=14)for(let i=6;i<124;i+=14)t.fillStyle=Math.random()<.45?`rgba(255,${190+Math.random()*50|0},110,${.6+Math.random()*.4})`:"#0b0a18",t.fillRect(i,e,8,9);return s}function Qv(){let s=gi(1024,180),t=s.getContext("2d"),e=t.createLinearGradient(0,0,0,180);e.addColorStop(0,"#2a2438"),e.addColorStop(1,"#0e0b16"),t.fillStyle=e,t.fillRect(0,0,1024,180),t.strokeStyle="#d4a64a",t.lineWidth=3;let i=(n,r,a)=>{t.fillStyle="#f2e6c8",t.fillRect(n,70,250,100),t.strokeRect(n+4,74,242,92),t.fillStyle="#2a1600",t.font="bold 18px Georgia",t.textAlign="center",t.fillText(a,n+125,94),t.font="12px Georgia",r.forEach((o,c)=>t.fillText(o,n+125,114+c*15))};return i(28,["Laser grid + vault door = LOCK","Lock 3 balls: VAULT MULTIBALL","Ramps & loops score JACKPOTS"],"THE VAULT"),i(742,["3 loops light a JOB at the hideout","Play all 6 jobs to light","THE BIG SCORE wizard mode"],"THE JOBS"),t.fillStyle="#d4a64a",t.font="bold 34px Georgia",t.textAlign="center",t.fillText("MIDNIGHT  HEIST",512,140),s}function ty(){let s=gi(512,128),t=s.getContext("2d"),e=t.createLinearGradient(0,0,512,0);e.addColorStop(0,"#10081c"),e.addColorStop(.5,"#1e1236"),e.addColorStop(1,"#10081c"),t.fillStyle=e,t.fillRect(0,0,512,128),t.strokeStyle="#d4a64a",t.lineWidth=3;for(let i=0;i<512;i+=40)t.beginPath(),t.moveTo(i,128),t.lineTo(i+20,64),t.lineTo(i+40,128),t.stroke();return s}function ey(){let s=gi(1024,600),t=s.getContext("2d"),e=t.createLinearGradient(0,0,0,600);e.addColorStop(0,"#060818"),e.addColorStop(1,"#241046"),t.fillStyle=e,t.fillRect(0,0,1024,600);for(let n=0;n<120;n++)t.fillStyle=`rgba(255,255,230,${Math.random()*.8})`,t.fillRect(Math.random()*1024,Math.random()*300,2,2);let i=0;for(;i<1024;){let n=40+Math.random()*80,r=120+Math.random()*260;t.fillStyle="#0b0a1c",t.fillRect(i,600-r,n,r);for(let a=600-r+10;a<590;a+=16)for(let o=i+6;o<i+n-6;o+=12)Math.random()<.35&&(t.fillStyle="rgba(255,200,110,0.8)",t.fillRect(o,a,6,8));i+=n+4}return t.font="bold 120px Georgia",t.textAlign="center",t.shadowColor="#ffb030",t.shadowBlur=30,t.fillStyle="#ffd27a",t.fillText("MIDNIGHT",512,170),t.fillText("HEIST",512,300),s}var Ve=s=>440*Math.pow(2,(s-69)/12),Pl=class{constructor(){this.ctx=null,this.enabled=!0,this.musicOn=!0,this.speechOn=!0,this.track=null,this.rollLevel=0,this.rampLevel=0}unlock(){if(this.ctx){this.ctx.state==="suspended"&&this.ctx.resume();return}let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let e=this.ctx=new t;this.comp=e.createDynamicsCompressor(),this.comp.threshold.value=-14,this.comp.ratio.value=4,this.master=e.createGain(),this.master.gain.value=.9,this.sfxBus=e.createGain(),this.sfxBus.gain.value=.8,this.musicBus=e.createGain(),this.musicBus.gain.value=.33,this.sfxBus.connect(this.comp),this.musicBus.connect(this.comp),this.comp.connect(this.master),this.master.connect(e.destination);let i=e.sampleRate*2;this.noise=e.createBuffer(1,i,e.sampleRate);let n=this.noise.getChannelData(0);for(let o=0;o<i;o++)n[o]=Math.random()*2-1;this.reverb=e.createConvolver();let r=e.sampleRate*1.6,a=e.createBuffer(2,r,e.sampleRate);for(let o=0;o<2;o++){let c=a.getChannelData(o);for(let l=0;l<r;l++)c[l]=(Math.random()*2-1)*Math.pow(1-l/r,3)}this.reverb.buffer=a,this.revGain=e.createGain(),this.revGain.gain.value=.22,this.reverb.connect(this.revGain),this.revGain.connect(this.comp),this.roll=this.makeLoopNoise(300,.7),this.ramp=this.makeLoopNoise(1800,2.5),this.startSequencer(),this.pendingTrack!==void 0&&this.music(this.pendingTrack)}makeLoopNoise(t,e){let i=this.ctx,n=i.createBufferSource();n.buffer=this.noise,n.loop=!0;let r=i.createBiquadFilter();r.type="bandpass",r.frequency.value=t,r.Q.value=e;let a=i.createGain();return a.gain.value=0,n.connect(r),r.connect(a),a.connect(this.sfxBus),n.start(),{f:r,g:a,base:t}}setRolling(t,e){if(!this.ctx||!this.enabled)return;let i=this.ctx.currentTime,n=Math.min(1,t/220);this.roll.g.gain.setTargetAtTime(n*n*.22,i,.05),this.roll.f.frequency.setTargetAtTime(150+n*600,i,.05);let r=Math.min(1,e/150);this.ramp.g.gain.setTargetAtTime(r*.12,i,.04),this.ramp.f.frequency.setTargetAtTime(1200+r*1600,i,.05)}env(t,e,i,n,r){t.gain.setValueAtTime(1e-4,e),t.gain.linearRampToValueAtTime(r,e+i),t.gain.exponentialRampToValueAtTime(1e-4,e+i+n)}tone(t,e,{type:i="sine",vol:n=.3,attack:r=.004,t0:a=0,glide:o=null,bus:c=null,filter:l=null,rev:h=0}={}){let d=this.ctx,u=d.currentTime+a,f=d.createOscillator();f.type=i,f.frequency.setValueAtTime(t,u),o&&f.frequency.exponentialRampToValueAtTime(o,u+e);let m=d.createGain();this.env(m,u,r,e,n);let v=f;if(l){let g=d.createBiquadFilter();g.type=l.type||"lowpass",g.frequency.value=l.f,g.Q.value=l.q||.7,f.connect(g),v=g}if(v.connect(m),m.connect(c||this.sfxBus),h){let g=d.createGain();g.gain.value=h,m.connect(g),g.connect(this.reverb)}f.start(u),f.stop(u+r+e+.05)}noiseHit(t,{f:e=1e3,q:i=1,type:n="bandpass",vol:r=.3,t0:a=0,sweep:o=null,bus:c=null,attack:l=.001,rev:h=0}={}){let d=this.ctx,u=d.currentTime+a,f=d.createBufferSource();f.buffer=this.noise,f.playbackRate.value=.8+Math.random()*.4;let m=d.createBiquadFilter();m.type=n,m.frequency.setValueAtTime(e,u),m.Q.value=i,o&&m.frequency.exponentialRampToValueAtTime(o,u+t);let v=d.createGain();if(this.env(v,u,l,t,r),f.connect(m),m.connect(v),v.connect(c||this.sfxBus),h){let g=d.createGain();g.gain.value=h,v.connect(g),g.connect(this.reverb)}f.start(u,Math.random()*1.5),f.stop(u+t+l+.05)}chord(t,e,i={}){t.forEach((n,r)=>this.tone(Ve(n),e,{...i,t0:(i.t0||0)+(i.strum||0)*r}))}arp(t,e,i,n={}){t.forEach((r,a)=>this.tone(Ve(r),i,{...n,t0:(n.t0||0)+a*e}))}play(t,e={}){if(!this.ctx||!this.enabled)return;let i=this;switch(t){case"flipperUp":i.noiseHit(.05,{f:900,q:.8,vol:.35}),i.tone(90,.06,{vol:.35,glide:50});break;case"flipperDown":i.noiseHit(.03,{f:1400,q:1,vol:.12});break;case"flipperHit":i.noiseHit(.03,{f:2200,q:1.5,vol:Math.min(.3,(e.speed||50)/400)});break;case"thud":i.noiseHit(.035,{f:e.mat==="metal"?3200:1100,q:2,vol:Math.min(.28,(e.speed||30)/500)});break;case"clack":i.tone(2600,.02,{vol:Math.min(.3,(e.speed||30)/300),type:"triangle"}),i.noiseHit(.02,{f:4e3,q:3,vol:.12});break;case"mechPop":i.tone(140,.09,{vol:.5,glide:45}),i.noiseHit(.05,{f:700,vol:.4});break;case"mechSling":i.tone(110,.07,{vol:.45,glide:55}),i.noiseHit(.04,{f:1600,vol:.3});break;case"dropDown":i.noiseHit(.05,{f:2e3,q:2,vol:.35});break;case"dropReset":i.noiseHit(.08,{f:700,q:1,vol:.45}),i.tone(80,.1,{vol:.4});break;case"capture":i.tone(70,.15,{vol:.4,glide:40}),i.noiseHit(.1,{f:400,vol:.3});break;case"eject":case"vuk":case"vaultKick":i.tone(100,.1,{vol:.55,glide:40}),i.noiseHit(.08,{f:900,vol:.45});break;case"autoLaunch":case"plunge":i.noiseHit(.12,{f:600,q:.6,vol:.5}),i.tone(120,.08,{vol:.4,glide:60});break;case"plungerPull":i.noiseHit(.25,{f:3e3,q:4,vol:.05,sweep:1500});break;case"gate":i.tone(1800,.03,{vol:.08,type:"triangle"});break;case"doorOpenMech":case"doorCloseMech":i.noiseHit(.35,{f:300,q:2,vol:.35,sweep:150}),i.tone(60,.3,{vol:.3,type:"sawtooth",filter:{f:300}});break;case"ballServe":i.noiseHit(.15,{f:500,vol:.25});break;case"kickbackMech":i.tone(90,.12,{vol:.6,glide:40}),i.noiseHit(.08,{f:700,vol:.5});break;case"pop":i.tone(Ve(74+Math.floor(Math.random()*3)*5),.12,{type:"square",vol:.07,filter:{f:2500}});break;case"sling":i.tone(Ve(62),.08,{type:"square",vol:.05,filter:{f:1800}});break;case"rollover":i.tone(1400,.05,{vol:.08,type:"triangle"});break;case"laneLit":i.arp([79,84],.05,.1,{type:"square",vol:.06,filter:{f:3e3}});break;case"keyComplete":i.arp([74,78,81,86],.06,.18,{type:"square",vol:.08,filter:{f:3500},rev:.3});break;case"inlane":i.tone(Ve(81),.06,{vol:.06,type:"triangle"});break;case"outlane":i.tone(Ve(50),.35,{vol:.12,type:"sawtooth",glide:Ve(43),filter:{f:900}});break;case"spinner":i.noiseHit(.012,{f:5e3,q:4,vol:.12}),i.tone(2e3+Math.random()*300,.02,{vol:.03,type:"square"});break;case"standup":i.tone(Ve(76),.08,{vol:.08,type:"square",filter:{f:2e3}});break;case"orbit":i.noiseHit(.35,{f:500,sweep:3e3,q:2,vol:.12}),i.arp([69,76],.08,.12,{vol:.05,type:"square",filter:{f:2e3}});break;case"rampEnter":i.noiseHit(.3,{f:400,sweep:2500,q:1.5,vol:.08});break;case"rampMade":i.arp([62,69,74,78],.055,.16,{type:"sawtooth",vol:.07,filter:{f:2800},rev:.25});break;case"dropTarget":i.tone(1600,.18,{type:"sawtooth",glide:240,vol:.09,filter:{f:4e3}});break;case"bankComplete":i.tone(900,.5,{type:"sawtooth",glide:90,vol:.12,filter:{f:3e3}}),i.noiseHit(.5,{f:3e3,sweep:300,vol:.12});break;case"doorHit":[412,1034,1716,2480].forEach((n,r)=>i.tone(n,.6-r*.1,{vol:.09/(r+1),rev:.4}));break;case"doorOpen":i.arp([50,57,62,66,69],.08,.5,{type:"sawtooth",vol:.07,filter:{f:1800},rev:.5});break;case"vaultEnter":i.tone(55,.5,{vol:.4,glide:35}),i.noiseHit(.6,{f:200,vol:.3,rev:.6});break;case"lock":i.chord([50,57,62],.9,{type:"sawtooth",vol:.06,filter:{f:1500},strum:.03,rev:.4}),i.tone(60,.7,{vol:.4,glide:30});break;case"multiball":for(let n=0;n<6;n++)i.tone(Ve(74),.18,{type:"square",vol:.09,t0:n*.4,filter:{f:2500}}),i.tone(Ve(71),.18,{type:"square",vol:.09,t0:n*.4+.2,filter:{f:2500}});i.chord([38,50,57,62,66],2.4,{type:"sawtooth",vol:.05,filter:{f:1600},t0:2.4,rev:.5});break;case"jackpot":i.chord([62,66,69,74],1.4,{type:"sawtooth",vol:.07,filter:{f:3e3},strum:.025,rev:.5}),i.noiseHit(1.4,{f:7e3,type:"highpass",vol:.18,rev:.4}),i.arp([74,78,81,86,90],.07,.3,{type:"square",vol:.05,filter:{f:4e3},t0:.1});break;case"superJackpot":i.chord([50,62,66,69,74,78],2.2,{type:"sawtooth",vol:.07,filter:{f:3500},strum:.04,rev:.6}),i.noiseHit(2.2,{f:6e3,type:"highpass",vol:.22,rev:.5}),i.arp([74,78,81,86,90,93,98],.06,.35,{type:"square",vol:.05,filter:{f:5e3},t0:.2}),i.tone(45,1.2,{vol:.5,glide:30});break;case"scoop":i.tone(180,.2,{vol:.2,glide:60});break;case"addABall":i.arp([67,71,74,79],.07,.2,{type:"square",vol:.07,filter:{f:3e3}});break;case"mystery":for(let n=0;n<12;n++)i.tone(Ve(70+n*7%12),.06,{type:"triangle",vol:.05,t0:n*.07});break;case"ebLit":i.arp([69,73,76,81],.1,.25,{type:"triangle",vol:.1,rev:.3});break;case"extraBall":i.chord([57,61,64,69],1.2,{type:"sawtooth",vol:.06,filter:{f:2500},strum:.08,rev:.5});break;case"jobSelect":case"select":i.tone(Ve(t==="select"?81:74),.07,{type:"square",vol:.06,filter:{f:2500}});break;case"jobStart":i.chord([50,53,57],.6,{type:"sawtooth",vol:.07,filter:{f:1400},rev:.4}),i.tone(Ve(62),.8,{t0:.3,type:"sawtooth",vol:.06,filter:{f:2e3}});break;case"jobHit":i.arp([74,81],.06,.15,{type:"square",vol:.07,filter:{f:3e3}}),i.noiseHit(.3,{f:6e3,type:"highpass",vol:.1});break;case"jobComplete":i.arp([62,66,69,74,78,81],.08,.4,{type:"sawtooth",vol:.06,filter:{f:3200},rev:.5});break;case"jobFail":i.arp([62,61,60,59],.18,.25,{type:"triangle",vol:.08});break;case"jobLit":i.arp([69,74,78],.07,.2,{type:"triangle",vol:.08});break;case"combo":i.tone(Ve(86),.12,{type:"square",vol:.05,filter:{f:4e3}});break;case"superSkillLit":i.arp([74,79,83],.06,.15,{type:"square",vol:.06});break;case"skillShot":i.arp([67,71,74,79,83],.06,.3,{type:"square",vol:.08,filter:{f:3500},rev:.3});break;case"alarmLevel":for(let n=0;n<4;n++)i.tone(n%2?900:1200,.12,{type:"square",vol:.05,t0:n*.13,filter:{f:3e3}});break;case"wizard":i.chord([38,50,57,62,65,69],3.5,{type:"sawtooth",vol:.06,filter:{f:2e3},strum:.12,rev:.7}),i.tone(38,3,{vol:.35});break;case"ballSave":i.arp([74,79],.08,.2,{type:"triangle",vol:.1});break;case"kickback":i.play("kickbackMech");break;case"tiltWarning":i.tone(220,.35,{type:"square",vol:.12,filter:{f:900}});break;case"tilt":i.tone(110,1.6,{type:"sawtooth",vol:.18,filter:{f:600}});break;case"drain":i.arp([62,58,55,50],.14,.3,{type:"triangle",vol:.1});break;case"knocker":i.tone(55,.12,{vol:.8,glide:30}),i.noiseHit(.08,{f:300,q:1,vol:.7});break;case"match":for(let n=0;n<18;n++)i.tone(Ve(60+n*5%24),.05,{type:"square",vol:.04,t0:n*.11,filter:{f:2e3}});break;case"highScore":i.arp([62,66,69,74,69,74,78],.12,.35,{type:"sawtooth",vol:.06,filter:{f:2500},rev:.4});break;case"hsLetter":i.tone(Ve(86),.1,{type:"square",vol:.06});break;case"start":i.chord([50,57,62,65],1,{type:"sawtooth",vol:.06,filter:{f:1800},strum:.06,rev:.5});break;case"addPlayer":i.tone(Ve(74),.15,{type:"square",vol:.08});break;case"ballSearch":break}}fx(t,e){switch(t){case"flipperUp":case"flipperDown":case"flipperHit":case"thud":case"clack":case"dropDown":case"dropReset":case"capture":case"vuk":case"vaultKick":case"autoLaunch":case"plungerPull":case"gate":case"ballServe":this.play(t,e);break;case"kick":this.play(e.id&&e.id.startsWith("pop")?"mechPop":"mechSling");break;case"plungerRelease":this.play("plunge");break;case"doorOpen":this.play("doorOpenMech");break;case"doorClose":this.play("doorCloseMech");break}}speech(t){if(!(!this.speechOn||!this.enabled||typeof speechSynthesis>"u"))try{speechSynthesis.cancel();let e=new SpeechSynthesisUtterance(t);e.rate=1,e.pitch=.6,e.volume=.9;let i=speechSynthesis.getVoices().find(n=>/en(-|_)(US|GB)/i.test(n.lang)&&/male|david|daniel|george|guy/i.test(n.name))||speechSynthesis.getVoices().find(n=>/^en/i.test(n.lang));i&&(e.voice=i),speechSynthesis.speak(e)}catch{}}setEnabled(t){this.enabled=t,this.master&&(this.master.gain.value=t?.9:0)}music(t){if(!this.ctx){this.pendingTrack=t;return}t!==this.track&&(this.track=t,this.bar=0,this.step16=0,this.nextTime=this.ctx.currentTime+.08)}startSequencer(){this.step16=0,this.bar=0,this.nextTime=this.ctx.currentTime+.1,setInterval(()=>this.schedule(),25)}schedule(){if(!this.ctx||!this.track||!this.musicOn||!this.enabled){this.ctx&&(this.nextTime=this.ctx.currentTime+.05);return}let t=sy[this.track];if(!t)return;let e=60/t.bpm/4;for(;this.nextTime<this.ctx.currentTime+.12;){let i=this.step16%2===1?e*(t.swing||0):0;this.playStep(t,this.step16,this.bar,this.nextTime+i,e),this.nextTime+=e,this.step16++,this.step16>=16&&(this.step16=0,this.bar++)}}playStep(t,e,i,n,r){let a=this.ctx,o=t.chords[i%t.chords.length],c=this.musicBus,l=n-a.currentTime,h=(f,m,v)=>this.tone(Ve(f),m,{...v,t0:Math.max(0,l),bus:c}),d=(f,m)=>this.noiseHit(f,{...m,t0:Math.max(0,l),bus:c});t.kick&&t.kick[e]&&this.tone(110,.16,{vol:.55,glide:40,t0:Math.max(0,l),bus:c}),t.snare&&t.snare[e]&&d(.12,{f:1800,q:.7,vol:t.brush?.12:.28}),t.hat&&t.hat[e]&&d(t.ride?.18:.04,{f:t.ride?7e3:9e3,type:"highpass",vol:t.ride?.07:.06});let u=t.bass(e,i,o);if(u!=null&&h(u,r*(t.bassLen||3.2),{type:"triangle",vol:.34,filter:{f:600}}),t.comp&&t.comp[e]&&o.slice(1).forEach(f=>h(f+12,r*(t.compLen||1.6),{type:t.compWave||"triangle",vol:.05,filter:{f:1800}})),t.pad&&e===0&&o.slice(1).forEach(f=>h(f+12,r*15,{type:"sawtooth",vol:.022,filter:{f:900},attack:.4})),t.lead){let f=t.lead(e,i,o);f!=null&&h(f,r*(t.leadLen||1.8),{type:t.leadWave||"square",vol:.045,filter:{f:2600}})}}},Li=[38,53,57,60],xf=[34,50,53,57],Th=[43,50,53,58],Rn=[45,49,52,55],iy=[40,50,53,58],Rl=[38,54,57,61],_f=[43,50,55,59],Cl=[34,50,53,58],vf=[36,52,55,60],Be=s=>s.split("").map(t=>t==="x");function ny(s,t,e){if(s%4!==0)return null;let i=s/4,n=e[0];return[n,n+7,n+12-(t%2?2:0),n+(t%2?11:13)][i]-0}var sy={attract:{bpm:84,swing:.3,chords:[Li,Li,xf,Rn],hat:Be("x...x...x...x..."),ride:!0,brush:!0,snare:Be("....x.......x..."),bass:(s,t,e)=>s===0?e[0]:s===10?e[0]+7:null,bassLen:6,pad:!0,lead:(s,t,e)=>t%4===3&&s===8?e[3]+12:null,leadWave:"triangle",leadLen:6},main:{bpm:128,swing:.33,chords:[Li,xf,Th,Rn,Li,iy,Th,Rn],hat:Be("x...x.xx..x.x.xx"),ride:!0,snare:Be("....x.......x..."),brush:!0,kick:Be("x.........x....."),bass:ny,comp:Be("....x..x....x..."),lead:(s,t,e)=>t%8>=6&&s%4===2?e[1+((s/4+t)%3|0)]+12:null,leadWave:"triangle"},job:{bpm:140,swing:.1,chords:[Li,Li,Cl,Rn],hat:Be("x.x.x.x.x.x.x.x."),snare:Be("....x.......x..x"),kick:Be("x..x..x...x..x.."),bass:(s,t,e)=>s%2===0?e[0]+(s%8===6?12:0):null,bassLen:1.6,lead:(s,t,e)=>[0,3,6,10,12].includes(s)?e[(s/3|0)%4===0?1:2]+12:null,leadWave:"sawtooth",leadLen:1.2,comp:Be("x.......x......."),compWave:"sawtooth"},multiball:{bpm:156,swing:0,chords:[Li,Li,vf,Cl,Li,Li,Th,Rn],hat:Be("x.x.x.x.x.x.x.x."),snare:Be("....x.......x..."),kick:Be("x.x...x.x.x...x."),bass:(s,t,e)=>s%2===0?e[0]+([0,0,12,0,7,0,10,12][s/2]||0):null,bassLen:1.5,lead:(s,t,e)=>{let n=[62,null,65,67,null,69,null,67,65,null,62,null,60,62,null,null][s];return n==null?null:n+(t%4===2?-2:t%4===3?2:0)},leadWave:"sawtooth",leadLen:1.6},wizard:{bpm:164,swing:0,chords:[Rl,_f,Rl,Rn,Cl,vf,Rl,Rn],hat:Be("xxxxxxxxxxxxxxxx"),snare:Be("....x.......x.x."),kick:Be("x...x...x...x..."),bass:(s,t,e)=>s%2===0?e[0]+(s%4===2?12:0):null,bassLen:1.5,pad:!0,lead:(s,t,e)=>s%2===0?e[1+s/2%3]+12:null,leadWave:"square",leadLen:1.4},select:{bpm:120,swing:0,chords:[Li],hat:Be("x.x.x.x.x.x.x.x."),kick:Be("x.......x......."),bass:(s,t,e)=>s%4===0?e[0]:null,bassLen:2,pad:!0},highscore:{bpm:96,swing:.2,chords:[Rl,_f,Cl,Rn],hat:Be("x...x...x...x..."),ride:!0,brush:!0,bass:(s,t,e)=>s%8===0?e[0]:null,bassLen:7,pad:!0,lead:(s,t,e)=>s%4===0?e[1+s/4%3]+12:null,leadWave:"triangle",leadLen:3}};var yf="midnightHeist.highScores.v1",ry={load(){try{return JSON.parse(localStorage.getItem(yf))}catch{return null}},save(s){try{localStorage.setItem(yf,JSON.stringify(s))}catch{}}},hi=s=>document.getElementById(s),ei=new Pl,Ge=new ma,Il=new ga(new qs),ti=new ya(Ge,{dmd:Il,sound:ei,storage:ry});Ge.onFx((s,t)=>ei.fx(s,t));var Zn;try{Zn=new Al(hi("gl"),Ge,ti)}catch(s){throw hi("loading").textContent="WebGL is required to play MIDNIGHT HEIST. ("+s.message+")",s}var ay=new xa(hi("dmd")),oy=hi("gauge"),ly=hi("gaugeFill");Zn.onQualityChange=s=>Pn("GRAPHICS: "+s+" (auto)");hi("loading").style.display="none";var Eh={left:["ShiftLeft","KeyZ","ArrowLeft"],right:["ShiftRight","Slash","ArrowRight"],plunger:["Space","Enter","ArrowDown","NumpadEnter"],start:["Digit1","KeyS","Numpad1"],nudgeL:["KeyQ"],nudgeR:["KeyE"],nudgeU:["KeyW","ArrowUp"],pause:["KeyP","Escape"],view:["KeyV"],sound:["KeyM"],help:["KeyH","F1"],full:["KeyF"],quality:["KeyG"]},Sf=s=>Object.keys(Eh).find(t=>Eh[t].includes(s)),ea=new Set,Cn=!1;function Pn(s){let t=hi("toast");t.textContent=s,t.classList.add("show"),clearTimeout(Pn.h),Pn.h=setTimeout(()=>t.classList.remove("show"),1400)}function ia(s){hi("help").classList.toggle("show",s)}function bf(s){Cn=s,hi("paused").classList.toggle("show",s),ei.ctx&&(s?ei.ctx.suspend():ei.ctx.resume()),s&&(Ge.setFlipper("left",!1),Ge.setFlipper("right",!1),Ge.plungerPull(!1))}function Ll(s,t){switch(s){case"left":case"right":Ge.setFlipper(s,t),t&&["attract","gameover"].includes(ti.state)&&ti.onButton(s,!0);break;case"plunger":if(t&&["attract","gameover"].includes(ti.state)){ti.pressStart();break}if(t&&(ti.state==="jobselect"||ti.state==="hsentry")){ti.pressStart();break}(ti.state==="playing"||!t)&&Ge.plungerPull(t);break;case"start":t&&ti.pressStart();break;case"nudgeL":t&&ti.state==="playing"&&Ge.nudge(16,-6);break;case"nudgeR":t&&ti.state==="playing"&&Ge.nudge(-16,-6);break;case"nudgeU":t&&ti.state==="playing"&&Ge.nudge(0,-20);break;case"pause":t&&(hi("help").classList.contains("show")?ia(!1):bf(!Cn));break;case"view":t&&Pn("VIEW: "+Zn.cycleView());break;case"quality":t&&(Zn.manualQuality=!0,Pn("GRAPHICS: "+Zn.cycleQuality()));break;case"sound":t&&(ei.musicOn&&ei.enabled?(ei.musicOn=!1,Pn("MUSIC OFF")):ei.enabled?(ei.setEnabled(!1),Pn("SOUND OFF")):(ei.setEnabled(!0),ei.musicOn=!0,Pn("SOUND ON")));break;case"help":t&&ia(!hi("help").classList.contains("show"));break;case"full":t&&(document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.());break}}window.addEventListener("keydown",s=>{ei.unlock();let t=Sf(s.code);t&&(s.preventDefault(),!s.repeat&&(ea.has(s.code)||(ea.add(s.code),!(Cn&&t!=="pause"&&t!=="help"&&t!=="sound"&&t!=="full")&&(hi("help").classList.contains("show")&&(t==="start"||t==="plunger")&&ia(!1),Ll(t,!0)))))});window.addEventListener("keyup",s=>{let t=Sf(s.code);t&&(s.preventDefault(),ea.delete(s.code),!((t==="left"||t==="right"||t==="plunger")&&Eh[t].some(e=>ea.has(e)))&&Ll(t,!1))});window.addEventListener("blur",()=>{ea.clear(),Ge.setFlipper("left",!1),Ge.setFlipper("right",!1),Ge.plungerPull(!1),ti.state==="playing"&&bf(!0)});var wh=new Map;function cy(s,t){let e=window.innerWidth,i=window.innerHeight;return t<i*.22?"start":s>e*.8&&t>i*.75?"plunger":s<e/2?"left":"right"}window.addEventListener("pointerdown",s=>{if(ei.unlock(),s.target.closest&&s.target.closest("button, a, #help")||s.pointerType==="mouse")return;let t=cy(s.clientX,s.clientY);wh.set(s.pointerId,t),Ll(t,!0)});var Tf=s=>{let t=wh.get(s.pointerId);t&&(wh.delete(s.pointerId),Ll(t,!1))};window.addEventListener("pointerup",Tf);window.addEventListener("pointercancel",Tf);hi("helpBtn").addEventListener("click",()=>ia(!0));hi("closeHelp").addEventListener("click",()=>ia(!1));var Mf=performance.now();function Ef(s){let t=Math.min(.05,Math.max(0,(s-Mf)/1e3));Mf=s,Cn||(Ge.update(t),ti.update(t)),Il.update(Cn?0:t),ay.render(Il.d,t);let e=0,i=0;for(let r of Ge.world.balls)r.mode==="pf"?e=Math.max(e,Math.hypot(r.vx,r.vy)):r.mode==="path"&&(i=Math.max(i,Math.abs(r.vs)));ei.setRolling(Cn?0:e,Cn?0:i);let n=Ge.world.plunger;oy.classList.toggle("show",n.pulling||n.pull>0),ly.style.height=`calc(${(n.pull*100).toFixed(1)}% - 4px)`,Zn.render(Cn?0:t),requestAnimationFrame(Ef)}requestAnimationFrame(Ef);window.MH={machine:Ge,game:ti,renderer:Zn,sound:ei,dmdCtl:Il};})();
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
