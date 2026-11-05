#!/usr/bin/env python3
"""Build complete skinned illustrated avatars with Blender; never uses source PNG as geometry.
Run: blender -b --python scripts/build-avatar-models.py -- --keys KEY,KEY --render
Blender z up/-Y forward exports as glTF Y up/+Z forward. Units are metres.
"""
import bpy, math, json, sys, argparse, random
from pathlib import Path
from mathutils import Vector, Quaternion, Euler
from math import sin, cos, pi

ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT.parent/'review'/'glb-20261105'
OUT=ROOT/'assets'/'avatars'/'models'
SPECS=json.loads((ROOT/'scripts'/'avatar-model-specs.json').read_text())['avatars']
ARGS=argparse.ArgumentParser()
ARGS.add_argument('--keys',default='')
ARGS.add_argument('--render',action='store_true')
ARGS.add_argument('--all-views',action='store_true')
ARGS.add_argument('--save-blend',action='store_true')
ARGS.add_argument('--include-deferred',action='store_true',help='Compatibility flag; all 18 approved artwork characters are included by default')
opts=ARGS.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])

def color(h):
    h=h.lstrip('#'); v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(((a+.055)/1.055)**2.4 if a>.04045 else a/12.92 for a in v)+(1,)
def shade(c,f): return tuple(min(1,max(0,a*f)) for a in c[:3])+(1,)
def mix(a,b,t):return tuple(a[i]*(1-t)+b[i]*t for i in range(4))

class Mesh:
    def __init__(self):self.v=[];self.f=[];self.c=[];self.w=[];self.mi=[]
    def add(self,vs,fs,c,w,mat=0):
        n=len(self.v);self.v.extend(vs);self.f.extend(tuple(n+i for i in f) for f in fs)
        self.c.extend([c]*len(vs) if len(c)==4 and isinstance(c[0],(int,float)) else c)
        self.w.extend([w]*len(vs) if isinstance(w,dict) else w);self.mi.extend([mat]*len(fs))
    def uv(self,p,s,c,w,seg=20,rings=12,mat=0,shape=None,rot=None):
        vs=[];fs=[];R=Euler(rot).to_matrix() if rot else None
        for j in range(rings+1):
            t=pi*j/rings
            for i in range(seg):
                q=2*pi*i/seg
                pt=Vector((s[0]*sin(t)*cos(q),s[1]*sin(t)*sin(q),s[2]*cos(t)))
                if shape:pt=Vector(shape(pt,t,q))
                if R:pt=R@pt
                vs.append(tuple(Vector(p)+pt))
        for j in range(rings):
            for i in range(seg):
                a=j*seg+i;b=j*seg+(i+1)%seg;d=(j+1)*seg+i;e=(j+1)*seg+(i+1)%seg
                if j>0:fs.append((a,d,b))
                if j<rings-1:fs.append((b,d,e))
        self.add(vs,fs,c,w,mat)
    def tube(self,points,radii,c,w,seg=8,mat=0):
        vs=[];fs=[]
        for j,p in enumerate(points):
            p=Vector(p); tangent=(Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])).normalized()
            base=tangent.cross(Vector((0,1,0)))
            if base.length<.1:base=tangent.cross(Vector((1,0,0)))
            base.normalize();side=tangent.cross(base).normalized();r=radii[j] if isinstance(radii,list) else radii
            rx,ry=(r,r) if isinstance(r,(int,float)) else r
            for i in range(seg):
                a=2*pi*i/seg;vs.append(tuple(p+base*(rx*cos(a))+side*(ry*sin(a))))
        for j in range(len(points)-1):
            for i in range(seg):
                a=j*seg+i;b=j*seg+(i+1)%seg;d=(j+1)*seg+i;e=(j+1)*seg+(i+1)%seg
                fs.extend([(a,b,d),(b,e,d)])
        fs.extend([tuple(range(seg-1,-1,-1)),tuple((len(points)-1)*seg+i for i in range(seg))])
        weights=[w]*len(vs) if isinstance(w,dict) else [w[j//seg] for j in range(len(vs))]
        self.add(vs,fs,c,weights,mat)
    def smooth_tube(self,points,radii,c,w,seg=10,steps=3):
        pts=[];rs=[]
        for j in range(len(points)-1):
            p0=Vector(points[max(0,j-1)]);p1=Vector(points[j]);p2=Vector(points[j+1]);p3=Vector(points[min(len(points)-1,j+2)])
            r0=radii[j];r1=radii[j+1]
            if isinstance(r0,(float,int)):r0=(r0,r0)
            if isinstance(r1,(float,int)):r1=(r1,r1)
            for k in range(steps):
                t=k/steps;v=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
                pts.append(tuple(v));rs.append(tuple(r0[a]*(1-t)+r1[a]*t for a in range(2)))
        pts.append(points[-1]);rs.append(radii[-1]);self.tube(pts,rs,c,w,seg)
    def curve(self,points,r,c,w,seg=7):self.smooth_tube(points,[r]*len(points),c,w,seg,2)
    def surface(self,rings,c,w,seg=32,start=0,end=2*pi):
        vs=[];fs=[]
        for j,(z,rx,ry,cy) in enumerate(rings):
            for i in range(seg+1):
                t=start+(end-start)*i/seg;vs.append((rx*cos(t),cy+ry*sin(t),z))
        for j in range(len(rings)-1):
            for i in range(seg):
                a=j*(seg+1)+i;b=a+1;d=a+seg+1;e=d+1;fs.extend([(a,b,d),(b,e,d)])
        ws=[w]*len(vs) if isinstance(w,dict) else [w[j//(seg+1)] for j in range(len(vs))]
        self.add(vs,fs,c,ws)
    def object(self,name,rig):
        m=bpy.data.meshes.new(name);m.from_pydata(self.v,[],self.f);m.update()
        ob=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(ob)
        for mt in materials:m.materials.append(mt)
        for i,p in enumerate(m.polygons):p.use_smooth=True;p.material_index=self.mi[i]
        attr=m.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(self.c):attr.data[i].color=c
        groups={n:ob.vertex_groups.new(name=n) for n in rig.data.bones.keys()}
        for i,ww in enumerate(self.w):
            for n,v in ww.items():
                if v>0:groups[n].add([i],v,'REPLACE')
        mod=ob.modifiers.new('Skin • 22 joints','ARMATURE');mod.object=rig
        # Keep skinned mesh and rig as identity scene siblings (valid glTF skin layout).
        ob.parent=None
        return ob

def material(name,roughness,metallic=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear();b=n.new('ShaderNodeBsdfPrincipled');out=n.new('ShaderNodeOutputMaterial');m.node_tree.links.new(b.outputs['BSDF'],out.inputs['Surface'])
    b.inputs['Roughness'].default_value=roughness;b.inputs['Metallic'].default_value=metallic
    a=n.new('ShaderNodeVertexColor');a.layer_name='Color';m.node_tree.links.new(a.outputs['Color'],b.inputs['Base Color'])
    return m

def bone_rig():
    a=bpy.data.armatures.new('Illustrated human • full 3D rig');ob=bpy.data.objects.new('AvatarRig',a);bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    defs=[('Root',(0,0,0),(0,0,.22),None),('Hips',(0,0,.83),(0,0,1.02),'Root'),('Spine',(0,0,1.02),(0,0,1.20),'Hips'),('Chest',(0,0,1.20),(0,0,1.40),'Spine'),('Neck',(0,0,1.40),(0,0,1.51),'Chest'),('Head',(0,0,1.51),(0,0,1.98),'Neck')]
    for sign,side in [(-1,'R'),(1,'L')]:
        defs.extend([(f'UpperArm.{side}',(sign*.255,0,1.35),(sign*.365,-.005,1.10),'Chest'),(f'Forearm.{side}',(sign*.365,-.005,1.10),(sign*.407,-.055,.89),f'UpperArm.{side}'),(f'Hand.{side}',(sign*.407,-.055,.89),(sign*.429,-.065,.76),f'Forearm.{side}'),(f'Thigh.{side}',(sign*.115,0,.87),(sign*.125,-.008,.49),'Hips'),(f'Shin.{side}',(sign*.125,-.008,.49),(sign*.131,0,.14),f'Thigh.{side}'),(f'Foot.{side}',(sign*.131,0,.14),(sign*.131,-.13,.075),f'Shin.{side}')])
    for n,h,t,par in defs:
        b=a.edit_bones.new(n);b.head=h;b.tail=t
        if par:b.parent=a.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT');ob.select_set(False)
    return ob

def weightz(z):
    if z<1.03:return {'Hips':1}
    if z<1.21:return {'Spine':1}
    return {'Chest':1}

def arc(cx,cy,cz,rx,rz,a0,a1,count=15):
    return [(cx+rx*cos(a0+(a1-a0)*i/(count-1)),cy,cz+rz*sin(a0+(a1-a0)*i/(count-1))) for i in range(count)]

def body(spec,idx,rig):
    M=Mesh();rng=random.Random(spec['key']);skin=color(spec['skin']);hair=color(spec['hair']);top=color(spec['top']['primary']);under=color(spec['top']['secondary']);pants=color(spec['bottom']['color']);shoe=color(spec['shoes']['color'])
    dark=color('#2A1C1B');white=color('#FFF7E9');eye=color(spec.get('eyeColor','#382013'));gold=color('#D7A944');sole=color('#E8DFD0')
    old=('older' in spec['ageLook']);female=any(a in spec['hairStyle'] for a in ['bob','braid','buns','bun','puff']) or 'earrings' in str(spec['accessory'])
    # Individual cranial/torso proportions and distinct silhouette, rather than identical recolouring.
    breadth=[1,1.17,1.03,1.02,.94,.99,.94,1.08,.98,1.04,1.04,1.01,.94,1.02,.98,1.04,1,1.08][idx]
    headw=.265*(1.08 if idx==1 else (1.14 if idx==2 else (1.10 if idx in [10,11] else breadth)))*(1.035 if old else 1);headz=.303+(0.012 if old else 0);headcenter=1.735 if old else 1.75
    skirt='skirt' in spec['bottom']['style'];wide=any(x in spec['bottom']['style'] for x in ['wide','culotte','loose'])
    # Tailored torso volume with a rounded but clear waist/shoulder contour.
    torso=[(.82,.174*breadth,.111,.012),(.87,.192*breadth,.129,.008),(1.0,.188*breadth,.128,0),(1.16,.198*breadth,.133,0),(1.30,.228*breadth,.124,.007),(1.36,.214*breadth,.107,.014),(1.40,.132,.086,.012)]
    M.surface(torso,skin if idx==12 else under,[weightz(x[0]) for x in torso],32)
    # Neck blends into chin; neck and collar are separate full-volume pieces.
    M.uv((0,0,1.435),(.092,.085,.16),skin,{'Neck':1},20,12)
    # Pants pelvis, individually shaped legs, seams and hems.
    M.uv((0,.005,.835),(.19*breadth,.125,.144),pants,{'Hips':1},24,14)
    for s,side in [(-1,'R'),(1,'L')]:
        p0=(s*.108,0,.87);p1=(s*.123,-.007,.50);p2=(s*.132,0,.275 if idx==12 else .145)
        legw=.126 if idx==12 else .088*(1.2 if wide else 1)
        legpts=[p0,(s*.115,-.005,.75),(s*.12,-.008,.57),p1,(s*.128,-.005,.35),p2]
        radii=[(.106,.107),(.103,.105),(legw,.096),(legw,.09),(legw*.95,.088),(legw*.94,.078)]
        ws=[{f'Thigh.{side}':1},{f'Thigh.{side}':1},{f'Thigh.{side}':.8,f'Shin.{side}':.2},{f'Thigh.{side}':.5,f'Shin.{side}':.5},{f'Shin.{side}':1},{f'Shin.{side}':1}]
        M.tube(legpts,radii,pants,ws,20)
        M.tube([(s*.132,0,.275 if idx==12 else .145),(s*.131,0,.32 if idx==12 else .19)],[legw*1.02,legw*1.06],shade(pants,.86),{f'Shin.{side}':1},20)
        if idx==12:M.tube([(s*.132,0,.145),(s*.132,0,.277)],[.049,.053],skin,{f'Shin.{side}':1},18)
        # Creases near knees and side seam, read through changing specular light.
        M.curve([(s*(.108+legw*.75),-.06,.78),(s*(.121+legw*.78),-.06,.52),(s*(.132+legw*.76),-.058,.22)],.0018,shade(pants,.80),{f'Thigh.{side}':.5,f'Shin.{side}':.5},5)
        M.uv((s*.134,-.062,.062),(.101,.165,.060),sole,{f'Foot.{side}':1},24,12)
        M.uv((s*.134,-.062,.100),(.091,.151,.083),shoe,{f'Foot.{side}':1},24,14)
        M.uv((s*.134,-.155,.104),(.080,.070,.044),mix(shoe,sole,.53),{f'Foot.{side}':1},20,10)
        # Heel collar, tongue, four raised laces, toe seam and side panels.
        M.uv((s*.134,.024,.146),(.072,.068,.035),shade(shoe,.8),{f'Foot.{side}':1},18,8)
        M.uv((s*.134,-.057,.168),(.048,.067,.017),mix(shoe,white,.55),{f'Foot.{side}':1},16,8)
        for j in range(0 if spec['shoes'].get('construction')=='knit_slip_on' else 4):
            y=-.028-j*.024;M.curve([(s*.134-.043,y,.177-j*.004),(s*.134,y-.007,.183-j*.004),(s*.134+.043,y,.177-j*.004)],.0043,sole,{f'Foot.{side}':1},6)
        M.curve([(s*.134-.068,-.16,.13),(s*.134,-.196,.143),(s*.134+.068,-.16,.13)],.002,shade(shoe,.75),{f'Foot.{side}':1},6)
        M.uv((s*(.134+.083),-.042,.108),(.009,.058,.022),(mix(shoe,sole,.3) if spec['shoes'].get('construction')=='knit_slip_on' else shade(shoe,.50)),{f'Foot.{side}':1},14,8)
    if skirt:
        M.surface([(.42,.26,.16,0),(.63,.236,.151,0),(.90,.19,.128,0)],pants,{'Hips':1},40)
    # Jacket has a real open front. Arc from front-left around back to front-right.
    style=spec['top']['style'];pullover=spec['top'].get('closure')=='none' or idx==10
    if pullover:
        toprings=([(.955,.190,.128,0)]+[r for r in torso if r[0]>=1.0]) if idx==12 else torso
        M.surface([(z,rx*1.055,ry*1.06,cy) for z,rx,ry,cy in toprings],top,[weightz(x[0]) for x in toprings],36)
        M.curve(arc(0,-.041,1.377,.104,.040,pi,2*pi),.012,shade(top,.78),{'Chest':1},8)
    else:
        coat=[(z,(max(rx,.192) if z<.88 and 'cardigan' in style else rx)*1.078,ry*1.12,cy) for z,rx,ry,cy in torso]
        M.surface(coat,top,[weightz(x[0]) for x in coat],42,start=-1.16,end=4.30)
        # Facing strips/knit placket and collars follow the opening; full rear body is modeled.
        for s in [-1,1]:
            edge=[(s*.091,-.131,.822),(s*.075,-.145,1.01),(s*.080,-.149,1.17),(s*.100,-.138,1.30),(s*.094,-.106,1.385)]
            M.tube(edge,([.020,.020,.021,.021,.019] if 'cardigan' in style else [.011,.012,.013,.014,.014]),shade(top,1.07),[weightz(p[2]) for p in edge],8)
            if 'slanted' in style or 'welt' in style:M.curve([(s*.105,-.120,.90),(s*.133,-.119,1.0),(s*.154,-.101,1.025)],.006,shade(top,.78),{'Spine':1},8)

            pv=[];pf=[]
            for row in range(7):
                z=.875+row*.025
                for col in range(7):
                    x=s*(.095+col*.017);y=.008-.145*math.sqrt(max(.05,1-(x/(.205*breadth))**2))-.016
                    pv.append((x,y,z))
            for row in range(6):
                for col in range(6):
                    a=row*7+col;pf.extend([(a,a+1,a+7),(a+1,a+8,a+7)])
            if 'cardigan' in style:M.add(pv,pf,shade(top,.98),{'Spine':1})
            if 'cardigan' in style:
                M.curve([(s*x,.008-.145*math.sqrt(max(.05,1-(x/(.205*breadth))**2))-.019,1.025) for x in [.095,.146,.197]],.006,shade(top,.82),{'Spine':1},7)
            if 'cardigan' not in style:
                M.tube([(s*.095,-.108,1.30),(s*.115,-.094,1.385),(s*.073,-.042,1.44)],[(.034,.015),(.036,.016),(.021,.013)],shade(top,1.06),{'Chest':.7,'Neck':.3},10)
        if 'zip' in style:
            for s in [-1,1]:
                for k in range(23):M.uv((s*.077,-.15,.875+k*.019),(.0035,.004,.005),color('#D3C6B7'),weightz(.875+k*.019),6,4)
            M.tube([(-.077,-.16,.865),(-.077,-.168,.83)],[.008,.007],color('#C9BFB5'),{'Hips':1},8)
        else:
            for z in [.91,1.05,1.19]:
                M.uv((.089,-.159,z),((.024 if 'cardigan' in style else .014),.008,(.024 if 'cardigan' in style else .014)),shade(top,.31),weightz(z),12,7)
                M.uv((.089,-.166,z),(.004,.002,.004),shade(top,1.15),weightz(z),8,5)
    # Ribbed hem and fine raised rib stitch spacing.
    M.surface(([ (.955,.201,.139,0),(.988,.201,.139,0)] if idx==12 else [(.822,.195*breadth,.141,.009),(.875,.198*breadth,.142,.008)]),[shade(under if idx==12 else top,.90 if i%2 else .96) for j in range(2) for i in range(37)],{'Hips':1},36,start=(-1.16 if not pullover else 0),end=(4.30 if not pullover else 2*pi))
    # Sleeves are skinned ring surfaces with blended elbows; hands have separate five fingers.
    for s,side in [(-1,'R'),(1,'L')]:
        shoulder=(s*.208,.007,1.337);elbow=(s*.365,-.005,1.10);wrist=(s*.407,-.055,.89)
        pts=[(s*.145,.008,1.347),(s*.200,.008,1.359),(s*.249,.006,1.331),(s*.292,.002,1.264),(s*.338,-.002,1.179),elbow,(s*.391,-.035,.98),wrist]
        short='short-sleeve' in style
        ws=[{'Chest':.8,f'UpperArm.{side}':.2},{'Chest':.35,f'UpperArm.{side}':.65},{f'UpperArm.{side}':1},{f'UpperArm.{side}':1},{f'UpperArm.{side}':.85,f'Forearm.{side}':.15},{f'UpperArm.{side}':.5,f'Forearm.{side}':.5},{f'Forearm.{side}':1},{f'Forearm.{side}':1}]
        rr=[.030,.071,.093,.093,.085,.079,.071,.058]
        if short:
            M.tube(pts[:5],rr[:5],top,ws[:5],20);M.tube(pts[4:], [.058,.055,.047,.038],skin,ws[4:],18)
        else:M.tube(pts,[r*(1.16 if idx==1 else (1.05 if old else 1)) for r in rr],top,ws,24)
        if not short:
            M.tube([(s*.400,-.048,.93),wrist],[.059,.055],shade(top,.85),{f'Forearm.{side}':1},18)
        M.tube([(s*.407,-.055,.910),(s*.417,-.061,.855)],[.033,.034],skin,{f'Hand.{side}':1},14)
        # Relaxed palm shape with visible thumb and four gently curved fingers.
        M.uv((s*.419,-.062,.831),(.053,.032,.068),skin,{f'Hand.{side}':1},18,12,rot=(0,s*-.14,0))
        for f in range(4):
            x=s*(.388+f*.020);length=[.055,.067,.063,.048][f]
            p=[(x,-.069,.811),(x+s*.006,-.077,.785),(x+s*.010,-.090,.811-length)]
            M.tube(p,[.0125,.0115,.0095],skin,{f'Hand.{side}':1},8)
            M.uv(p[-1],(.008,.009,.010),skin,{f'Hand.{side}':1},10,6)
            M.uv((p[-1][0],p[-1][1]-.008,p[-1][2]+.006),(.005,.0015,.007),mix(skin,white,.21),{f'Hand.{side}':1},8,5)
        M.tube([(s*.385,-.065,.852),(s*.367,-.095,.825),(s*.374,-.104,.802)],[.016,.014,.010],skin,{f'Hand.{side}':1},10)
        # Elbow folds and shoulder seam.
        M.curve([(s*.323,-.059,1.194),(s*.343,-.075,1.178),(s*.365,-.057,1.19)],.0028,shade(top,.83),{f'UpperArm.{side}':.8,f'Forearm.{side}':.2},6)
    # Face has a true complete cranial surface with shaped jaw/cheeks; no cutout or flat plane.
    def sculpt(pt,t,q):
        x,y,z=pt
        if z<-.065:x*=.90+.10*(z+headz)/(headz-.065)
        if y<0:
            y*=1.02
            # cheeks are rounder below eye line, jaw transitions smoothly under chin.
            y-=.018*math.exp(-((z+.09)/.09)**2)*(abs(x)/headw)
        return x,y,z
    M.uv((0,0,headcenter),(headw,.222,headz),skin,{'Head':1},48,30,shape=sculpt)
    for s in [-1,1]:
        M.uv((s*(headw-.010),-.006,1.72),(.056,.035,.079),skin,{'Head':1},20,12)
        M.uv((s*(headw+.010),-.038,1.722),(.030,.010,.052),shade(skin,.66),{'Head':1},16,10)
        M.uv((s*(headw+.006),-.046,1.713),(.018,.008,.032),shade(skin,.96),{'Head':1},14,8)
    # Cheeks, jaw and chin remain a single continuous cranial surface.
    # Eyes are almond white surfaces surrounded by sculpted lids and eyelash line.
    ey=.209;ez=1.777;ex=.108
    for s in [-1,1]:
        M.uv((s*ex,-ey+.006,ez),(.078,.018,.058),shade(skin,.89),{'Head':1},26,14)
        M.uv((s*ex,-ey,ez),(.068,.020,.048),white,{'Head':1},26,14,mat=1)
        M.uv((s*ex,-ey-.022,ez),(.031,.009,.039),eye,{'Head':1},24,14,mat=1)
        M.uv((s*ex,-ey-.030,ez),(.017,.004,.028),color('#100C0A'),{'Head':1},20,12,mat=1)
        M.uv((s*ex-.010,-ey-.035,ez+.015),(.010,.003,.012),color('#FFFFFF'),{'Head':1},12,8,mat=1)
        M.uv((s*ex+.010,-ey-.035,ez-.017),(.004,.002,.004),color('#FFE4BD'),{'Head':1},8,6,mat=1)
        pts=[]
        for j in range(17):
            a=pi*j/16;pts.append((s*ex+.070*cos(a),-ey-.010,ez+.047*sin(a)))
        M.curve(pts,.0052,dark,{'Head':1},7)
        M.curve([(s*ex-.064,-ey-.009,ez-.006),(s*ex-.036,-ey-.013,ez-.043),(s*ex+.030,-ey-.014,ez-.046),(s*ex+.065,-ey-.005,ez-.004)],.0038,shade(skin,.68),{'Head':1},7)
        # Eyebrows are tapered full-volume strips.
        M.tube([(s*ex-.064,-.217,1.869),(s*ex-.030,-.232,1.89),(s*ex+.023,-.232,1.89),(s*ex+.062,-.214,1.874)],[(.004,.005),(.011,.008),(.012,.008),(.004,.004)],shade(hair,.38 if old else .70),{'Head':1},8)
    # Anatomical nose bridge, rounded tip and tiny nostrils.
    M.uv((0,-.213,1.747),(.030,.028,.075),skin,{'Head':1},22,16)
    M.uv((0,-.247,1.701),(.043,.042,.030),shade(skin,1.035),{'Head':1},24,14)
    for s in [-1,1]:
        M.uv((s*.032,-.236,1.690),(.020,.020,.017),skin,{'Head':1},18,10)
        M.uv((s*.024,-.256,1.682),(.009,.003,.004),shade(skin,.40),{'Head':1},12,6)
    if idx==0:M.uv((.178,-.174,1.699),(.0035,.0018,.0042),shade(skin,.25),{'Head':1},8,6)
    lip=color('#954C3C') if old else color('#A95A46')
    mouth=[(-.076,-.201,1.640),(-.047,-.216,1.620),(0,-.224,1.614),(.047,-.216,1.620),(.076,-.201,1.640)]
    M.tube(mouth,[.0025,.006,.0065,.006,.0025],shade(lip,.58),{'Head':1},8)
    M.tube([(-.067,-.204,1.630),(-.035,-.218,1.611),(0,-.224,1.607),(.035,-.218,1.611),(.067,-.204,1.630)],[.0015,.005,.006,.005,.0015],lip,{'Head':1},8)
    if old:
        for s in [-1,1]:
            M.curve([(s*.067,-.210,1.689),(s*.090,-.208,1.663),(s*.094,-.203,1.630)],.0017,shade(skin,.67),{'Head':1},5)
            for dz in [0,.012]:M.curve([(s*.18,-.18,1.755+dz),(s*.205,-.168,1.751+dz)],.0013,shade(skin,.67),{'Head':1},5)
        for z in [1.931,1.950]:M.curve([(-.084,-.17,z),(0,-.183,z+.006),(.084,-.17,z)],.00135,shade(skin,.79),{'Head':1},5)
    # Hair is a complete scalp and custom modeled style; the back is fully rounded.
    hs=spec['hairStyle']
    def scalp(pt,t,q):
        x,y,z=pt
        # crop lower front to leave forehead; lower back extends to nape.
        return x,y,z
    # upper dome and rear nape surfaces, with front cut at forehead rather than a sphere over eyes.
    vs=[];fs=[];nr=11;ns=36
    for j in range(nr+1):
        for k in range(ns):
            q=2*pi*k/ns
            # front (-Y) hairline high, side around ear, back low.
            front=max(0,-sin(q));back=max(0,sin(q))
            end=1.43-.30*front+.42*back
            t=.025+(end-.025)*j/nr
            vs.append(((headw+.012)*sin(t)*cos(q),(.235)*sin(t)*sin(q),headcenter+(headz+.015)*cos(t)))
    for j in range(nr):
        for k in range(ns):
            a=j*ns+k;b=j*ns+(k+1)%ns;c=(j+1)*ns+k;d=(j+1)*ns+(k+1)%ns;fs.extend([(a,c,b),(b,c,d)])
    M.add(vs,fs,hair,{'Head':1})
    # Explicit hairstyle families avoid accidental matches such as 'no curls' or 'front curl'.
    hair_type=spec.get('hairModelType','swept_short')
    bob=hair_type=='wavy_bob';braid=hair_type=='side_braid';buns=hair_type=='double_buns';lowbun=hair_type=='low_bun'
    curl=hair_type in ['short_curls','tousled_curls','loose_curls','high_puff']
    if curl:
        # Dense clusters follow scalp all around, including sides and rear.
        count=47 if 'silver' in hs else 44
        for j in range(count):
            q=2*pi*j/((1+math.sqrt(5))/2);u=(j+.5)/count;t=math.acos(1-u*1.25)
            front=max(0,-sin(q));t=min(t,(.88-.12*front) if front>.45 else 1.70)
            rr=(.034+rng.random()*.010) if t>1.25 else (.050+rng.random()*.016)
            p=((headw+.003)*sin(t)*cos(q),.231*sin(t)*sin(q),headcenter+(headz+.010)*cos(t))
            M.uv(p,(rr,rr*.86,rr*.90),shade(hair,.88+rng.random()*.23),{'Head':1},12,8,shape=lambda v,t,q:(v.x*(1+.10*sin(q*3+t*2)),v.y*(1+.10*sin(q*3+t*2)),v.z))
            # Fine sculpted curl ridge wrapping each clump makes it read as natural short curls.
            if j%4==0:
                pts=[(p[0]+rr*.65*cos(a),p[1]-rr*.64,p[2]+rr*.65*sin(a)) for a in [k*1.4*pi/8 for k in range(9)]]
                M.curve(pts,.0022,shade(hair,1.10),{'Head':1},5)
        if hair_type=='high_puff':
            M.uv((0,.055,2.07),(.285,.218,.214),hair,{'Head':1},22,16)
            for j in range(38):
                q=j*2.4;z=1.95+rng.random()*.31;r=.268*math.sqrt(max(0,1-((z-2.07)/.23)**2));M.uv((r*cos(q),.055+r*.8*sin(q),z),(.065,.054,.058),shade(hair,.85+rng.random()*.25),{'Head':1},12,8)
    else:
        # Swept soft locks are curved and tapered at both ends; avoid a flat cap or vertical strips.
        for j in range(7):
            x=-.17+j*.053
            height=[-.014,.015,.042,.028,.055,.021,-.010][j]
            pts=[(x+.095,.035,1.995+height),(x+.113,-.062,2.050+height),(x+.038,-.168,2.061+height),(x-.070,-.221,2.008+height),(x-.116,-.224,1.946+height)]
            if hair_type=='straight_fringe':
                pts=[(x,.04,2.018),(x+.015,-.085,2.049+height*.25),(x+.010,-.182,2.013),(x-.005,-.227,1.945+(j%3)*.007),(x-.013,-.229,1.918+(j%3)*.007)]
            M.smooth_tube(pts,[(.002,.003),(.049,.040),(.056,.040),(.044,.029),(.001,.001)],shade(hair,.88+rng.random()*.23),{'Head':1},12,3)
            M.curve([(p[0]+.014,p[1]-.018,p[2]+.022) for p in pts[1:-1]],.0016,shade(hair,1.25),{'Head':1},5)
        # Rounded back layers run down from crown to the complete nape volume.
        for j in range(10):
            q=.08+j*pi/9;x=(headw+.010)*cos(q);y=.225*sin(q)
            pts=[(x*.68,y*.68,2.0),(x*.99,y*.99,1.92),(x,y,1.81),(x*.90,y*.94,1.73)]
            M.smooth_tube(pts,[(.003,.005),(.042,.033),(.033,.026),(.001,.002)],shade(hair,.90+rng.random()*.20),{'Head':1},10,3)
        if bob:
            for s in [-1,1]:
                for k in range(5):
                    y=-.12+k*.069;M.smooth_tube([(s*.202,y,1.965),(s*.264,y-.006,1.845),(s*.283,y,1.683),(s*.271,y-.019,1.596+.009*sin(k)),(s*(.302 if idx==9 else .239),y-.037,1.619+.008*sin(k))],[(.011,.012),(.044,.039),(.047,.038),(.036,.031),(.003,.004)],shade(hair,.89+k*.035),{'Head':1},12,4)
            M.uv((0,.174,1.70),(.25,.095,.193),hair,{'Head':1},28,18)
        if braid:
            for j in range(18):
                z=1.89-j*.038;x=.252+(.017 if j%2 else -.017);y=-.09-j*.009+(.006 if j%2 else -.006)
                M.uv((x,y,z),(.058,.048,.047),shade(hair,.88+(j%2)*.13),{'Head':1} if z>1.49 else {'Chest':1},14,9)
            M.tube([(.252,-.248,1.252),(.252,-.244,1.205)],[.034,.008],hair,{'Chest':1},12)
            for z in [1.258,1.277]:M.tube([(.252,-.243,z),(.252,-.243,z+.01)],[.041,.041],top,{'Chest':1},12)
        if buns:
            for s in [-1,1]:M.uv((s*.265,.055,2.05),(.110,.102,.116),hair,{'Head':1},24,16)
        if lowbun:M.uv((-.13,.215,1.668),(.114,.097,.094),hair,{'Head':1},26,16)
    # Eyeglasses include full front rims, nose bridge, temple arms to the ears.
    if spec['glasses']!='none':
        rectangular=any(a in spec['glasses'] for a in ['rectang','square']);gc=color('#332225') if 'dark' in spec['glasses'] or 'black' in spec['glasses'] else color('#AAA9A1');r=.0065 if 'thin' in spec['glasses'] else .009
        for s in [-1,1]:
            pts=[]
            for j in range(33):
                a=2*pi*j/32
                x=cos(a);z=sin(a)
                if rectangular:x=math.copysign(abs(x)**.52,x);z=math.copysign(abs(z)**.52,z)
                pts.append((s*ex+.087*x,-.254,ez+.069*z))
            M.curve(pts,r,gc,{'Head':1},8)
            M.curve([(s*(ex+.083),-.253,ez+.018),(s*.239,-.223,ez+.017),(s*.276,-.038,1.76)],r*.75,gc,{'Head':1},8)
            M.uv((s*(ex+.077),-.263,ez+.043),(.006,.003,.006),gold,{'Head':1},10,6,mat=2)
        M.curve([(-.022,-.254,ez+.005),(0,-.256,ez+.014),(.022,-.254,ez+.005)],r*.8,gc,{'Head':1},8)
    ac=str(spec['accessory'])
    if 'earring' in ac:
        for s in [-1,1]:
            if 'hoop' in ac:
                pts=[(s*(headw+.014)+.025*cos(j*2*pi/24),-.035,1.620+.037*sin(j*2*pi/24)) for j in range(25)]
                M.tube(pts,.0065,gold,{'Head':1},8,mat=2)
            else:M.uv((s*(headw+.009),-.160 if bob else -.063,1.653),(.017,.012,.018),gold if 'gold' in ac else white,{'Head':1},12,8,mat=2)
    if idx in [3,7,13,16]:
        bc=shade(hair,.86)
        M.tube([(-.068,-.212,1.655),(-.035,-.240,1.662),(0,-.246,1.648),(.035,-.240,1.662),(.068,-.212,1.655)],([.002,.004,.003,.004,.002] if idx in [13,16] else [.006,.012,.010,.012,.006]),bc,{'Head':1},10)
        if idx in [3,7]:M.uv((0,-.065,1.555),(.202,.147,.125),bc,{'Head':1},32,18)
        for side in ([-1,1] if idx in [3,7] else []):M.smooth_tube([(side*.224,-.031,1.733),(side*.223,-.066,1.642),(side*.162,-.139,1.552)],[(.015,.016),(.026,.024),(.030,.020)],bc,{'Head':1},10,3)
    # Garment-specific geometry retains individual identity across all 18 avatars.
    if 'cable-knit' in style:
        for x in [-.11,-.055,0,.055,.11]:
            pts=[(x+.009*sin(k*pi/2),-.147,1.02+k*.018) for k in range(17)];M.curve(pts,.0038,shade(top,1.18),{'Spine':.5,'Chest':.5},6)
    if 'scarf' in ac:
        sc=color('#3C8E87');M.tube([(-.08,-.071,1.401),(0,-.11,1.397),(.08,-.072,1.406)],.026,sc,{'Neck':1},10)
        M.tube([(.035,-.129,1.40),(.084,-.152,1.29)],[(.028,.014),(.015,.008)],sc,{'Chest':1},10)
        M.tube([(-.004,-.141,1.397),(-.048,-.156,1.305)],[ (.023,.013),(.012,.007)],shade(sc,1.08),{'Chest':1},10)
        M.uv((.010,-.150,1.394),(.028,.020,.025),shade(sc,.95),{'Neck':.4,'Chest':.6},16,10)
    if 'notebook' in ac or 'cup' in ac:
        if 'notebook' in ac:
            M.uv((.434,-.090,.812),(.059,.018,.083),white,{'Hand.L':1},20,14,shape=lambda v,t,q:(math.copysign(.059*(abs(v.x)/.059)**.35,v.x),math.copysign(.018*(abs(v.y)/.018)**.35,v.y),math.copysign(.083*(abs(v.z)/.083)**.30,v.z)))
            M.curve([(.378,-.111,.732),(.378,-.111,.893)],.003,color('#D9CCB9'),{'Hand.L':1},6)
        else:
            M.tube([(-.423,-.12,.785),(-.423,-.12,.918)],[.041,.047],color('#E6DFD0'),{'Hand.R':1},20)
            M.tube([(-.423,-.12,.918),(-.423,-.12,.933)],[.049,.049],color('#796A5E'),{'Hand.R':1},20)
    if 'esports' in style:
        if 'T1' in style:
            # Abstract approved jersey patch shapes, no external logos or downloaded textures.
            M.tube([(-.12,-.151,1.274),(-.085,-.157,1.274)],[.012,.012],color('#C73C39'),{'Chest':1},6)
            for z in [1.218,1.239]:M.tube([(.075,-.149,z),(.13,-.144,z)],[.003,.003],white,{'Chest':1},6)
        else:
            for z in [1.025,1.080]:M.curve([(-.17,-.14,z+.03),(0,-.154,z-.025),(.17,-.14,z+.03)],.009,color('#CBA557'),{'Chest':1},6)
    # Distinct garment construction and accessories derived from each approved artwork.
    if 'hood' in style:
        M.uv((0,.118,1.327),(.158,.070,.104),shade(top,.93),{'Chest':1},24,14)
        hoodpath=[(-.139,-.041,1.39),(-.151,.049,1.436),(-.103,.129,1.457),(0,.151,1.464),(.103,.129,1.457),(.151,.049,1.436),(.139,-.041,1.39)]
        M.smooth_tube(hoodpath,[.030,.036,.040,.041,.040,.036,.030],shade(top,.91),{'Chest':1},12,2)
        if 'drawstrings' in style:
            for side in [-1,1]:
                M.curve([(side*.065,-.126,1.373),(side*.063,-.151,1.292),(side*.073,-.153,1.244)],.0038,under,{'Chest':1},7)
                M.uv((side*.073,-.153,1.239),(.0055,.005,.012),under,{'Chest':1},10,7)
            # Convex pouch panel and clear slanted hand openings.
            M.uv((0,-.132,1.055),(.139,.020,.067),shade(top,.97),{'Spine':1},28,16)
            for side in [-1,1]:M.curve([(side*.118,-.147,1.10),(side*.100,-.158,1.063),(side*.118,-.145,1.014)],.004,shade(top,.72),{'Spine':1},7)
    if 'chest pocket' in style or 'chest flap pockets' in style:
        sides=[-1,1] if 'pockets' in style else [1]
        for side in sides:
            xs=[side*.068,side*.145];zs=[1.202,1.285]
            pv=[]
            for z in zs:
                for x in xs:pv.append((x,-.129*math.sqrt(max(.05,1-(x/.233)**2))-.014,z))
            M.add(pv,[(0,1,2),(1,3,2)],shade(top,.97),{'Chest':1})
            M.curve([pv[2],pv[3]],.0032,shade(top,.78),{'Chest':1},6)
            if 'flap' in style:M.uv((side*.105,-.135,1.278),(.036,.008,.014),shade(top,.91),{'Chest':1},16,8)
    if 'collared shirt' in style:
        for side in [-1,1]:
            M.add([(side*.016,-.104,1.403),(side*.100,-.088,1.373),(side*.047,-.140,1.333)],[(0,1,2)],under,{'Chest':1})
            M.curve([(side*.016,-.105,1.403),(side*.047,-.141,1.333),(side*.100,-.089,1.373)],.0035,under,{'Chest':1},6)
    if 'brown belt' in spec['bottom']['style']:
        M.surface([(.858,.191*breadth,.131,0),(.884,.192*breadth,.132,0)],color('#76513C'),{'Hips':1},32)
        M.curve([(-.025,-.136,.861),(-.025,-.137,.884),(.025,-.137,.884),(.025,-.136,.861),(-.025,-.136,.861)],.0038,color('#BFBAB0'),{'Hips':1},6)
    if 'backpack' in ac:
        bag=color('#26394D');strap=color('#304359')
        M.uv((0,.216,1.122),(.189,.101,.238),bag,{'Spine':.45,'Chest':.55},30,20)
        M.uv((.168,.206,1.064),(.045,.078,.087),shade(bag,1.12),{'Spine':1},18,12)
        M.curve([(-.08,.292,1.22),(0,.315,1.24),(.08,.292,1.22)],.0035,shade(bag,.6),{'Chest':1},7)
        for side in [-1,1]:
            M.smooth_tube([(side*.13,.177,1.31),(side*.155,.057,1.393),(side*.163,-.080,1.327),(side*.174,-.137,1.182),(side*.176,-.083,1.024),(side*.145,.134,.951)],[(.022,.012),(.025,.014),(.024,.013),(.023,.012),(.022,.011),(.019,.009)],strap,{'Chest':.6,'Spine':.4},10,3)
    if 'stubble' in spec.get('facialHair',''):
        st=shade(hair,.73)
        for j in range(48):
            x=rng.uniform(-.17,.17);z=rng.uniform(1.535,1.658)
            if abs(x)<.085 and z>1.60:continue
            zz=(z-headcenter)/headz;xx=x/headw
            if xx*xx+zz*zz>=.95:continue
            y=-.222*math.sqrt(1-xx*xx-zz*zz)-.002
            M.uv((x,y,z),(.002,.0012,.0025),st,{'Head':1},6,4)
    if idx==12:
        # Distinct lavender cuff/neck bands and upper-sleeve bars of the double-bun character.
        for side,label in [(-1,'R'),(1,'L')]:
            M.tube([(side*.303,-.001,1.246),(side*.318,-.001,1.213)],[.096,.091],under,{f'UpperArm.{label}':1},20)
            M.tube([(side*.400,-.048,.931),(side*.408,-.055,.894)],[.062,.059],under,{f'Forearm.{label}':1},20)
        for side in [-1,1]:
            M.smooth_tube([(side*.147,-.130,1.96),(side*.236,-.153,1.842),(side*.242,-.174,1.71),(side*.221,-.17,1.63)],[(.010,.009),(.011,.010),(.008,.007),(.002,.002)],hair,{'Head':1},8,3)
    if idx==11:
        # Geometric chest marks and sleeve trim from the approved esports illustration.
        emblem=color('#CBA557');white=color('#F0EEDF')
        def glyphpoly(points):M.add([(x,-.161,z) for x,z in points],[tuple(range(len(points)))],emblem,{'Chest':1})
        glyphpoly([(-.043,1.11),(-.024,1.11),(-.024,1.28),(-.043,1.28)])
        glyphpoly([(-.024,1.26),(.033,1.26),(.033,1.28),(-.024,1.28)])
        glyphpoly([(.015,1.205),(.034,1.205),(.034,1.28),(.015,1.28)])
        glyphpoly([(-.024,1.202),(.034,1.202),(.034,1.22),(-.024,1.22)])
        glyphpoly([(-.009,1.205),(.010,1.205),(.050,1.11),(.028,1.11)])
        for side,label in [(-1,'R'),(1,'L')]:
            for z in [1.192,1.222]:M.tube([(side*.330,-.004,z),(side*.339,-.004,z-.012)],[.086,.086],emblem,{f'UpperArm.{label}':1},18)
        cx=.11;cz=1.292
        M.curve([(cx+.015*cos(a),-.14,cz+.015*sin(a)) for a in [j*2*pi/20 for j in range(21)]],.0018,white,{'Chest':1},5)
        for a in [0,2*pi/3,4*pi/3]:M.curve([(cx,-.142,cz),(cx+.013*sin(a),-.142,cz+.013*cos(a))],.0015,white,{'Chest':1},5)
    if idx==10:
        M.curve([(0,-.146,.855),(0,-.151,1.18),(0,-.139,1.372)],.0032,color('#DBDBD6'),{'Spine':.4,'Chest':.6},7)
        for side in [-1,1]:M.smooth_tube([(side*.08,-.10,1.35),(side*.10,-.072,1.408),(side*.07,-.025,1.439)],[(.027,.013),(.028,.015),(.020,.011)],top,{'Chest':.7,'Neck':.3},10,2)
        red=color('#C33132')
        for points in [[(.069,1.275),(.126,1.275),(.126,1.286),(.069,1.286)],[(.096,1.245),(.108,1.245),(.108,1.28),(.096,1.28)],[(.121,1.245),(.132,1.245),(.132,1.28),(.121,1.28)]]:
            M.add([(x,-.146,z) for x,z in points],[tuple(range(4))],red,{'Chest':1})
        for j in range(3):M.curve([(.042+j*.007,-.146,1.278-j*.009),(.086,-.146,1.278-j*.009)],.0038,red,{'Chest':1},5)
    if idx==12:
        M.surface([(.915,.189,.133,0),(.945,.189,.133,0)],pants,{'Hips':1},32)
        M.uv((0,-.139,.931),(.008,.004,.008),shade(pants,.62),{'Hips':1},10,6)
    ob=M.object(spec['key']+' • body hair clothing',rig)
    # Keep complete rounded silhouettes while fitting the 40k triangle delivery budget.
    raw_tri=sum(len(p.vertices)-2 for p in ob.data.polygons)
    if raw_tri>39500:
        bpy.context.view_layer.objects.active=ob;ob.select_set(True)
        dec=ob.modifiers.new('Geometry budget • preserve silhouette','DECIMATE');dec.ratio=39500/raw_tri;dec.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=dec.name);ob.select_set(False)
    compact=.20 if idx==2 else (.11 if idx in [10,11] else 0)
    def proportion_z(z):
        return z if z<=.14 else (.14+(z-.14)*((.73-compact)/.73) if z<.87 else z-compact)
    if compact:
        for v in ob.data.vertices:v.co.z=proportion_z(v.co.z)
    # Normalize each hair style to exact 2.1m height while preserving feet on floor.
    maxz=max(v.co.z for v in ob.data.vertices);scale=2.1/maxz
    for v in ob.data.vertices:v.co*=scale
    for b in rig.data.bones:pass
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for b in rig.data.edit_bones:
        if compact:b.head.z=proportion_z(b.head.z);b.tail.z=proportion_z(b.tail.z)
        b.head*=scale;b.tail*=scale
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    return ob,{'vertices':len(ob.data.vertices),'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons),'materials':3,'height':2.1,'sourceKey':spec['key'],'forward':'+Z','up':'+Y','groundTravel':.7,'sourceArtwork':spec['posterPath'],'geometry':'complete volumetric skinned mesh; no image plane; vertex-colored matte PBR'}

def setworld(pb,e):
    q=Euler(e).to_quaternion();r=pb.bone.matrix_local.to_quaternion();pb.rotation_mode='QUATERNION';pb.rotation_quaternion=r.inverted()@q@r

def animate(rig,spec):
    scene=bpy.context.scene;scene.render.fps=60
    # Bake every frame at 60 fps to preserve contact timing in glTF runtimes.
    for name,frames in [('Idle',120),('Turn',90),('Walk',54),('Wave',72)]:
        rig.animation_data_create();action=bpy.data.actions.new(name);rig.animation_data.action=action
        for frame in sorted(set(list(range(0,frames+1,1))+[frames])):
            t=frame/frames
            for pb in rig.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
            if name in ['Idle','Turn','Wave']:
                if 'pocket' in spec.get('pose',''):
                    setworld(rig.pose.bones['UpperArm.R'],(-.10,-.21,0))
                    setworld(rig.pose.bones['Forearm.R'],(-.24,.03,0))
                if spec['key']=='ISSP2019_P0020926':
                    setworld(rig.pose.bones['UpperArm.R'],(-.05,.12,0));setworld(rig.pose.bones['Forearm.R'],(-.95,.15,0))
                    setworld(rig.pose.bones['UpperArm.L'],(-.10,.21,0));setworld(rig.pose.bones['Forearm.L'],(-.24,-.03,0))
                if spec['key']=='GSS2022_P0000404':
                    setworld(rig.pose.bones['UpperArm.R'],(0,-.65,0));setworld(rig.pose.bones['Forearm.R'],(-2.1,-.30,0))
                if spec['key']=='ATP152_P0004934':
                    setworld(rig.pose.bones['UpperArm.L'],(-.12,-.12,0))
                    setworld(rig.pose.bones['Forearm.L'],(-.90,-.25,0))
                    setworld(rig.pose.bones['Hand.L'],(0,0,-.25))
            if name=='Idle':
                setworld(rig.pose.bones['Chest'],(0,.009*sin(2*pi*t),0));setworld(rig.pose.bones['Head'],(0,.012*sin(2*pi*t),.009*sin(2*pi*t)))
                rig.pose.bones['Chest'].scale=(1+.004*sin(2*pi*t),1+.008*sin(2*pi*t),1+.006*sin(2*pi*t))
            if name=='Turn':
                # Keep quaternion path continuous, with intermediate keys spanning the complete turn.
                setworld(rig.pose.bones['Root'],(0,0,2*pi*t))
                setworld(rig.pose.bones['Head'],(0,0,.035*sin(2*pi*t)))
            if name=='Walk':
                # Foot-placement IK in the sagittal plane. During each stance half-cycle
                # the foot moves back .35m locally, exactly cancelling .7m/cycle world travel.
                # The opposite foot swings forward with a clear .065m toe clearance.
                phase=2*pi*t
                scale=rig.data.bones['Foot.L'].head_local.z/.14
                hip_drop=.055 if spec['key']=='ATP142_P0007673' else .030
                hip_dz=(-hip_drop-.008*cos(phase*2))*scale
                hip_basis=rig.data.bones['Hips'].matrix_local.to_3x3()
                rig.pose.bones['Hips'].location=hip_basis.inverted()@Vector((0,0,hip_dz))
                for offset,side in [(0,'L'),(.5,'R')]:
                    u=(t+offset)%1
                    if u<=.5:
                        foot_y=(-.175+.70*u);lift=0
                    else:
                        v=(u-.5)*2
                        foot_y=(.175-.35*(v*v*(3-2*v)))
                        lift=.065*sin(pi*v)*scale
                    upper=rig.data.bones[f'Thigh.{side}'];lower=rig.data.bones[f'Shin.{side}'];foot=rig.data.bones[f'Foot.{side}']
                    hy=upper.head_local.y;hz=upper.head_local.z+hip_dz
                    ay=foot.head_local.y+foot_y;az=foot.head_local.z+lift
                    dy=ay-hy;dz=az-hz;dist=math.sqrt(dy*dy+dz*dz)
                    uy=lower.head_local.y-upper.head_local.y;uz=lower.head_local.z-upper.head_local.z
                    ly=foot.head_local.y-lower.head_local.y;lz=foot.head_local.z-lower.head_local.z
                    l1=math.sqrt(uy*uy+uz*uz);l2=math.sqrt(ly*ly+lz*lz)
                    dist=min(dist,l1+l2-.00001)
                    along=(l1*l1-l2*l2+dist*dist)/(2*dist);height=math.sqrt(max(0,l1*l1-along*along))
                    ky=hy+dy/dist*along+dz/dist*height;kz=hz+dz/dist*along-dy/dist*height
                    upper_a=math.atan2(ky-hy,hz-kz)-math.atan2(uy,-uz)
                    lower_a=math.atan2(ay-ky,kz-az)-math.atan2(ly,-lz)
                    setworld(rig.pose.bones[f'Thigh.{side}'],(upper_a,0,0))
                    setworld(rig.pose.bones[f'Shin.{side}'],(lower_a-upper_a,0,0))
                    setworld(rig.pose.bones[f'Foot.{side}'],(-lower_a,0,0))
                    armphase=sin(phase+offset*2*pi)
                    setworld(rig.pose.bones[f'UpperArm.{side}'],(.24*armphase,0,0))
                    setworld(rig.pose.bones[f'Forearm.{side}'],(-.12-.06*max(0,armphase),0,0))
                setworld(rig.pose.bones['Chest'],(0,0,.028*sin(phase)))
            if name=='Wave':
                raise_amt=math.sin(min(1,t/.27)*pi/2) if t<.27 else (math.cos(max(0,(t-.74)/.26)*pi/2) if t>.74 else 1)
                wave_side='R' if spec['key']=='EVS2017_P0015007' else 'L'
                wave_sign=-1 if wave_side=='R' else 1
                for joint,target in [(f'UpperArm.{wave_side}',(0,-1.75*wave_sign,.08*wave_sign)),(f'Forearm.{wave_side}',(-.18,-.58*wave_sign,0)),(f'Hand.{wave_side}',(0,.24*sin(2*pi*(t-.25)*4)*wave_sign,0))]:
                    pb=rig.pose.bones[joint];baseq=pb.rotation_quaternion.copy();setworld(pb,target);pb.rotation_quaternion=baseq.slerp(pb.rotation_quaternion,raise_amt)
                setworld(rig.pose.bones['Head'],(0,-.045*raise_amt,-.055*raise_amt))
            for pb in rig.pose.bones:
                pb.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=pb.name)
                if pb.name in ['Hips','Chest']:pb.keyframe_insert(data_path='location',frame=frame,group=pb.name);pb.keyframe_insert(data_path='scale',frame=frame,group=pb.name)
        rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,0,action);strip.name=name;strip.action_frame_start=0;strip.action_frame_end=frames;strip.extrapolation='NOTHING';track.mute=True
    for pb in rig.pose.bones:pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
    scene.frame_set(0)

def setup_render():
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=480;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.world.color=(.20,.20,.20);scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.25
    # Neutral studio with warm skin key, broad fill and soft floor contact shadows.
    world=bpy.data.worlds.new('Studio') if not scene.world else scene.world;scene.world=world;world.use_nodes=True;wn=world.node_tree.nodes;wn.clear();bg=wn.new('ShaderNodeBackground');wo=wn.new('ShaderNodeOutputWorld');world.node_tree.links.new(bg.outputs['Background'],wo.inputs['Surface']);bg.inputs[0].default_value=(.30,.33,.38,1);bg.inputs[1].default_value=.38
    for name,pos,power,size in [('Key',(-3,-4,5),430,4),('Fill',(3,-2,3),180,3),('Rim',(1.5,3,4),470,3)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=pos;ob.rotation_euler=(Vector((0,0,1.1))-ob.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.004));floor=bpy.context.object;floor.name='Studio floor (not exported)'
    mat=bpy.data.materials.new('Warm gray studio');mat.diffuse_color=(.17,.18,.20,1);floor.data.materials.append(mat)
    data=bpy.data.cameras.new('Studio camera');cam=bpy.data.objects.new('Studio camera',data);bpy.context.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.ortho_scale=2.45
    return cam

def render(spec,cam,views):
    rig=bpy.data.objects['AvatarRig'];rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(0)
    for label,angle in views:
        cam.location=(4*sin(angle),-4*cos(angle),1.43);cam.rotation_euler=(Vector((0,0,1.08))-cam.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath=str(REVIEW/(spec['key']+'-'+label+'.png'));bpy.ops.render.render(write_still=True)
    if opts.all_views:
        rig.animation_data.action=bpy.data.actions['Wave'];bpy.context.scene.frame_set(36)
        cam.location=(2,-4,1.5);cam.rotation_euler=(Vector((0,0,1.08))-cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.render.filepath=str(REVIEW/(spec['key']+'-wave.png'));bpy.ops.render.render(write_still=True)
    rig.animation_data.action=None;bpy.context.scene.frame_set(0)

OUT.mkdir(parents=True,exist_ok=True);REVIEW.mkdir(parents=True,exist_ok=True)
selected=set(opts.keys.split(',')) if opts.keys else None
reports=[]
for idx,spec in enumerate(SPECS):
    if selected and spec['key'] not in selected:continue
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for datablocks in [bpy.data.meshes,bpy.data.armatures,bpy.data.actions,bpy.data.materials]:
        for block in list(datablocks):
            if block.users==0:datablocks.remove(block)
    materials=[material('Matte skin hair cloth • vertex palette',.70),material('Polished iris and sclera',.24),material('Warm jewelry metal',.31,.64)]
    rig=bone_rig();ob,report=body(spec,idx,rig);animate(rig,spec)
    rig['sourceKey']=spec['key'];rig['groundTravel']=.7;rig['clips']='Idle,Turn,Walk,Wave';rig['artworkBasis']=spec['posterPath'];rig['characterNote']='Illustration-based character; not an identified survey participant'
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);ob.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/(spec['key']+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_skins=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_nla_strips_merged_animation_name='Animation',export_force_sampling=True,export_frame_range=False,export_current_frame=False,export_anim_slide_to_zero=True,export_all_vertex_colors=False,export_vertex_color='ACTIVE',export_extras=True)
    report['bytes']=(OUT/(spec['key']+'.glb')).stat().st_size;reports.append(report)
    (REVIEW/(spec['key']+'-model.json')).write_text(json.dumps(report,indent=2))
    cam=setup_render()
    if opts.save_blend:bpy.ops.wm.save_as_mainfile(filepath=str(REVIEW/(spec['key']+'.blend')))
    if opts.render:render(spec,cam,[('front',0),('three-quarter',pi/5),('side',pi/2),('back',pi)] if opts.all_views else [('three-quarter',pi/5)])
    print('AVATAR_COMPLETE '+json.dumps(report),flush=True)
(REVIEW/'build-latest.json').write_text(json.dumps(reports,indent=2))
