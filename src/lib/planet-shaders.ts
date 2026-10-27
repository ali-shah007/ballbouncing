export const planetVertex = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec3 vWorld;
void main(){vUv=uv;vLocal=normalize(position);vNormal=normalize(mat3(modelMatrix)*normal);vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}
`;
export const planetFragment = `
precision highp float;
uniform sampler2D uTerrain;
uniform sampler2D uEarthMap;
uniform sampler2D uEarthSpecular;
uniform float uEarthReady;
uniform float uTime;
uniform float uDamage;
uniform float uWorld;
uniform vec4 uHits[12];
uniform float uHitAges[12];
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec3 vWorld;
void main(){
 vec4 terrain=texture2D(uTerrain,vUv);
 float h=terrain.r;
 float land=smoothstep(.49,.535,h);
 vec3 ocean=mix(vec3(.006,.026,.075),vec3(.025,.15,.2),smoothstep(.3,.51,h));
 vec3 ground=mix(vec3(.035,.11,.055),vec3(.19,.23,.115),smoothstep(.53,.72,h));
 ground=mix(ground,vec3(.35,.33,.25),smoothstep(.65,.79,h));
 vec3 albedo=mix(ocean,ground,land);
 float ice=smoothstep(.76,.94,abs(vLocal.y)+(h-.5)*.3);
 albedo=mix(albedo,vec3(.74,.82,.84),ice);
 if(uWorld>.5&&uWorld<1.5){albedo=mix(vec3(.095,.027,.016),vec3(.32,.115,.043),h);}
 if(uWorld>1.5){albedo=mix(vec3(.12,.23,.31),vec3(.69,.79,.84),smoothstep(.3,.65,h));}
 if(uWorld<.5&&uEarthReady>.5){albedo=texture2D(uEarthMap,vUv).rgb;land=1.-texture2D(uEarthSpecular,vUv).r;}
 float cloud=texture2D(uTerrain,vec2(fract(vUv.x+uTime*.0016),vUv.y)).g;
 float cloudMask=smoothstep(.48,.69,cloud)*.8;
 if(uWorld<.5)albedo=mix(albedo,vec3(.8,.85,.86),cloudMask*(uEarthReady>.5?.07:1.));
 float dx=texture2D(uTerrain,vUv+vec2(.0018,0.)).r-h;
 float dy=texture2D(uTerrain,vUv+vec2(0.,.0018)).r-h;
 vec3 n=normalize(vNormal+vec3(dx*2.,dy*2.,0.)*land);
 vec3 sun=normalize(vec3(-3.0,2.5,4.0));
 vec3 viewDir=normalize(cameraPosition-vWorld);
 float light=dot(n,sun);
 float day=smoothstep(-.1,.25,light);
 float diffuse=max(0.,light);
 vec3 color=albedo*(.045+diffuse*1.5);
 color+=vec3(.015,.036,.065)*pow(1.-max(0.,dot(n,viewDir)),3.)*day;
 float spec=pow(max(dot(reflect(-sun,n),viewDir),0.),65.);
 if(uWorld<.5){color+=vec3(.7,.84,.9)*spec*(1.-land)*.7;float cities=pow(max(0.,terrain.b-.50)*3.4,5.);color+=vec3(1.,.48,.12)*cities*land*(1.-day)*.18;}
 float fractures=pow(1.-abs(sin(h*105.+terrain.b*8.)),18.);
 float damageGlow=smoothstep(.1,.9,uDamage);
 if(uWorld>.5&&uWorld<1.5)color+=vec3(1.,.13,.015)*fractures*.65;
 color=mix(color,color*vec3(.45,.27,.2),uDamage*.55);
 color+=vec3(1.6,.24,.025)*fractures*damageGlow*(.65+.35*sin(uTime*2.));
 for(int i=0;i<12;i++){
  if(uHits[i].w>0.){
   float distance=acos(clamp(dot(normalize(vLocal),normalize(uHits[i].xyz)),-1.,1.));
   float radius=.10+uHits[i].w*.085;
   float scar=1.-smoothstep(radius*.5,radius*1.7,distance);
   float center=1.-smoothstep(0.,radius*.75,distance);
   float edge=exp(-abs(distance-radius)*70.);
   color=mix(color,vec3(.018,.009,.006),scar*.9);
   float heat=.17+exp(-uHitAges[i]*.55)*1.8+uDamage*.35;
   color+=vec3(1.5,.23,.018)*(center+edge*.5)*heat;
  }
 }
 gl_FragColor=vec4(max(color,vec3(0.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export const atmosphereVertex = `varying vec3 vNormal;varying vec3 vWorld;void main(){vNormal=normalize(mat3(modelMatrix)*normal);vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;
export const atmosphereFragment = `precision highp float;uniform float uDamage;uniform vec3 uColor;varying vec3 vNormal;varying vec3 vWorld;void main(){vec3 view=normalize(cameraPosition-vWorld);float rim=pow(1.-abs(dot(view,normalize(vNormal))),3.2);float sun=max(.1,dot(normalize(vNormal),normalize(vec3(-3.,2.5,4.))));vec3 color=mix(uColor,vec3(1.,.23,.045),uDamage*.7);gl_FragColor=vec4(color,rim*sun*.74);}`;
