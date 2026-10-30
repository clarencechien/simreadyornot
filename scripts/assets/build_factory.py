"""Original manufacturing kit. Blender Z-up, metres; exports glTF Y-up.
No vendor geometry: SMT enclosures, AMR and cutaway architecture are authored here.
"""
import bpy, math, pathlib
from mathutils import Vector
OUT=pathlib.Path(__file__).resolve().parents[2]/'src/assets'
def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
clear()
def material(name,color,metal=0,rough=.45,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
ivory=material('Warm powder coat',(.65,.68,.66),.25);white=material('Light enamel',(.82,.84,.8),.15);dark=material('Graphite gaskets',(.025,.032,.035),.1,.7);silver=material('Brushed aluminium',(.47,.51,.52),.72,.32);steel=material('Galvanized steel',(.25,.29,.3),.7);blue=material('Equipment accent',(.025,.13,.19),.35);glass=material('Smoked safety glazing',(.035,.09,.105),.7,.19);green=material('ESD green',(.06,.22,.17),.15,.6);yellow=material('Safety ochre',(.85,.52,.06));red=material('Emergency stop',(.65,.025,.015));screen=material('HMI backlight',(.09,.37,.42),.1,.3,.4);led=material('Neutral LED',(.85,.89,.84),0,.2,1.5);rubber=material('Rubber',(.013,.017,.02),0,.9);concrete=material('Concrete',(.36,.38,.37),.05,.88);seam=material('Expansion joint',(.16,.18,.18),0,.9);floor=material('ESD resin',(.2,.3,.28),.15,.62);lane=material('Logistics floor',(.29,.32,.32),0,.75)
def box(name,xyz,size,mat,bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Edge radii','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def cyl(name,xyz,r,depth,mat,axis='Z',n=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=xyz);o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 if axis=='X':o.rotation_euler[1]=math.pi/2
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 return o
def beam(a,b,width,mat,name='Structural member'):
 mid=(Vector(a)+Vector(b))/2;v=Vector(b)-Vector(a);o=box(name,mid,(width,width,v.length),mat,0);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def text(body,xyz,size,mat=white,ground=False):
 bpy.ops.object.text_add(location=xyz);o=bpy.context.object;o.data.body=body;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=0;o.data.materials.append(mat)
 if not ground:o.rotation_euler[0]=math.pi/2
 bpy.ops.object.convert(target='MESH')
 return o
def export(name):
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_yup=True,export_materials='EXPORT');clear()
def feet(w,d):
 for x in [-w/2+.15,w/2-.15]:
  for y in [-d/2+.15,d/2-.15]:
   cyl('Adjustable foot',(x,y,.055),.07,.1,rubber);cyl('Threaded leveller',(x,y,.15),.025,.15,silver)
def hmi(x,h):
 beam((x,-.8,h-.15),(x,-1.16,h-.15),.055,steel,'HMI mounting arm')
 box('Operator panel',(x,-1.19,h),(.44,.09,.34),dark,.02);box('Touch display',(x,-1.24,h+.02),(.36,.008,.23),screen,0)
 for k in range(4):box('Readout',(x-.045,-1.247,h-.055+k*.045),(.2,.003,.008),white,0)
 cyl('Emergency stop',(x+.13,-1.25,h-.12),.035,.025,red,'Y');cyl('Enable',(x+.04,-1.25,h-.12),.02,.015,green,'Y')
def door(x,y,h,w):
 box('Service hatch',(x,y,h/2+.23),(w,.025,h-.06),ivory,.012)
 box('Recessed latch',(x+w*.36,y-.023,h*.65),(.025,.025,.13),dark)
 for z in [.38,h-.05]:box('Hinge',(x-w*.43,y-.025,z),(.04,.035,.09),steel)
 for k in range(7):box('Vent louvre',(x,y-.018,.35+k*.035),(w*.6,.01,.012),dark,0)
labels=['MAGAZINE LOADER','SOLDER PASTE PRINTER','3D SOLDER INSPECTION','HIGH SPEED PLACEMENT','PRECISION PLACEMENT','8 ZONE REFLOW OVEN','AUTOMATED OPTICAL INSPECTION','MAGAZINE UNLOADER']
for j in range(8):
 w=[1.25,2.65,2.1,3.25,3.25,4.05,2.1,1.25][j];h=[2.35,2.05,1.9,2.15,2.15,1.55,1.9,2.35][j];d=1.85
 feet(w,d);box('Load bearing base',(0,0,.27),(w,d,.28),dark,.025)
 # Independent front panels with real gaps; no monolithic cube enclosure.
 box('Lower enclosure',(0,0,.65),(w-.03,d-.04,.65),ivory,.035)
 for x in [-w*.25,w*.25]:door(x,-.932,.73,w*.48)
 box('Rear access',(0,.91,1.13),(w,.06,1.45),ivory)
 for y in [-.43,.43]:box('Board transport rail',(0,y,1.03),(w+.2,.045,.08),silver)
 for x in [-w/2,w/2]:box('Conveyor opening',(x,0,1.15),(.025,.83,.26),dark,0)
 if j in [0,7]:
  for x in [-w/2+.05,w/2-.05]:box('Magazine tower',(x,0,1.65),(.1,d,1.5),white,.02)
  box('Magazine top',(0,0,h),(w,d,.12),blue,.025)
  box('Lift backplane',(0,.5,1.55),(.95,.12,1.5),steel)
  for k in range(13):
   box('Magazine guide',(0,-.13,.75+k*.105),(.96,1.1,.025),silver,0)
  for x in [-.36,.36]:cyl('Lift screw',(x,.6,1.45),.028,1.6,silver)
 elif j==5:
  box('Insulated oven',(0,0,1.28),(w,d,.66),ivory,.06)
  for k in range(8):
   x=-1.74+k*.495;box('Hinged thermal zone',(x,0,1.64),(.46,1.78,.17),white,.025)
   box('Zone seam',(x+.23,0,1.73),(.012,1.7,.01),dark,0);box('Temperature controller',(x,-.948,1.34),(.2,.02,.1),screen)
   for n in range(4):box('Cooling slot',(x,-.96,.82+n*.07),(.33,.02,.022),dark,0)
  for x in [-1.45,1.45]:
   cyl('Exhaust collar',(x,.38,1.8),.18,.16,steel);cyl('Extraction stack',(x,.38,2.14),.13,.6,silver)
   for z in [1.88,2.03,2.18,2.33]:cyl('Duct seam',(x,.38,z),.137,.018,steel)
 else:
  for x in [-w/2+.06,w/2-.06]:box('Corner column',(x,0,1.55),(.12,d,h-1),white,.015)
  box('Roof hood',(0,0,h),(w,d,.14),white,.03)
  box('Safety window',(0,-.93,1.56),(w-.24,.025,h-.98),glass,.008)
  for x in [-w*.25,w*.25]:box('Door grip',(x,-.98,1.26),(.22,.035,.025),silver)
  box('Instrument rail',(0,.05,1.6),(w-.2,.12,.12),silver)
  if j in [3,4]:
   for k in range(14):
    x=-1.35+k*.207;box('Feeder cassette',(x,-1.11,.98),(.12,.42,.13),steel)
    cyl('Component reel',(x,-1.29,.73),.19,.045,dark,'X',20);cyl('Reel hub',(x,-1.29,.73),.065,.052,silver,'X')
   box('Feeder carriage',(0,-1.26,.4),(2.9,.45,.12),blue)
   for x in [-1.25,1.25]:beam((x,-1.26,.4),(x,-.8,.72),.05,steel)
  if j in [2,6]:
   box('Camera bridge',(0,0,h+.1),(1.5,.24,.14),blue);cyl('Optical turret',(0,-.1,h-.08),.15,.3,dark)
  if j==1:
   for x in [-.7,.7]:cyl('Squeegee actuator',(x,.1,h-.25),.08,.4,silver)
 # Printed identity, caution plate and serial tag.
 box('Brand fascia',(0,-.96,h-.06),(w-.22,.035,.18),blue)
 text(labels[j],(0,-.983,h-.1),.07)
 box('Warning plate',(-w*.3,-.958,.84),(.13,.007,.08),yellow,0)
 box('Serial plate',(w*.25,-.956,.46),(.19,.005,.07),silver,0)
 hmi(w/2-.17,1.58 if j!=5 else 1.4)
 export('station-'+str(j))
# AMR: safety scanners, driven wheels, payload rollers, bumpers and service ports.
for x in [-.42,.42]:
 for y in [-.35,.35]:cyl('Traction wheel',(x,y,.16),.14,.08,rubber,'X',20)
box('AMR lower chassis',(0,0,.24),(.95,1.2,.25),dark,.07);box('Safety enclosure',(0,0,.41),(.98,1.16,.2),ivory,.06)
for y in [-.62,.62]:
 box('Impact bumper',(0,y,.24),(.84,.06,.1),rubber,.02);box('Status strip',(0,y,.42),(.6,.012,.028),screen,0)
 cyl('Safety lidar',(0,y*.8,.53),.075,.07,dark)
for x in [-.35,.35]:box('Payload frame',(x,0,.65),(.06,1,.35),silver)
for k in range(10):cyl('Powered transfer roller',(0,-.45+k*.1,.83),.04,.7,steel,'X')
box('ESD tote',(0,0,1.05),(.64,.8,.35),blue,.025)
for x in [-.34,.34]:box('Tote handle',(x,0,1.15),(.025,.2,.05),dark)
text('AMR 02',(0,-.589,.38),.075,dark)
export('kit-amr')
# Short PCB transfer conveyor, isolated from machines (no intersecting long slab).
for x in [-.34,.34]:
 for y in [-.48,.48]:box('Conveyor leg',(x,y,.5),(.05,.05,.94),silver);cyl('Conveyor foot',(x,y,.035),.065,.07,dark)
for y in [-.42,.42]:box('Belt guide',(0,y,.99),(.85,.055,.12),silver)
box('Transfer belt',(0,0,.96),(.85,.76,.045),dark)
for k in range(8):cyl('Roller',(k*.1-.35,0,.995),.026,.73,steel,'Y',12)
box('Control pod',(.2,-.54,.82),(.22,.17,.2),ivory);cyl('Control stop',(.2,-.64,.84),.035,.025,red,'Y')
export('kit-transfer')
# Populated ESD circuit board.
box('FR4 substrate',(0,0,.013),(.52,.36,.026),green,0)
for x in [-.16,0,.16]:
 for y in [-.08,.08]:
  box('Integrated circuit',(x,y,.04),(.075,.055,.03),dark,.002)
  for k in range(5):box('Copper trace',(x-.025+k*.012,y,.028),(.004,.13,.002),yellow,0)
for x in [-.23,.23]:box('Connector',(x,0,.045),(.035,.28,.04),silver,0)
export('kit-pcb')
# Architectural kit for the supported one-, two- and four-line floor plans.
for count in [1,2,4]:
 depth=max(19,count*7+12);back=depth/2;front=-depth/2-4
 box('Foundation',(0,0,-.24),(69,depth+8,.45),concrete,.05)
 box('ESD production zone',(0,0,-.008),(36,depth-4,.02),floor,0)
 for x in [-26,26]:box('Warehouse slab',(x,0,-.005),(12,depth-4,.02),lane,0)
 for x in range(-32,34,4):box('Concrete saw cut',(x,0,.007),(.018,depth+7,.005),seam,0)
 for y in range(int(front)+1,int(back)+4,4):box('Concrete saw cut',(0,y,.008),(68,.018,.005),seam,0)
 # Solid rear envelope with inset upper clerestory glazing and a lower office band.
 box('Back wall',(0,back,2),(68,.22,4),ivory,.02)
 for x in range(-30,34,6):
  box('Clerestory frame',(x,back-.14,4.8),(5.65,.14,1.45),steel)
  box('Clerestory glass',(x,back-.23,4.8),(5.4,.04,1.25),glass)
  for dx in [-1.8,0,1.8]:box('Window mullion',(x+dx,back-.27,4.8),(.045,.08,1.3),silver,0)
  box('Column web',(x,back-.4,3.3),(.2,.32,6.6),steel)
  for y in [back-.6,back-.2]:box('Column flange',(x,y,3.3),(.38,.055,6.6),steel,0)
  box('Column base',(x,back-.4,.07),(.65,.65,.14),steel)
  for dx in [-.24,.24]:cyl('Anchor bolt',(x+dx,back-.4,.17),.035,.12,silver)
 # Raised back service passage and ductwork.
 box('Cable tray',(0,back-.65,3.8),(64,.45,.08),steel)
 for x in range(-30,32,2):box('Tray rung',(x,back-.65,3.9),(.04,.45,.1),silver,0)
 cyl('Main ventilation duct',(0,back-1.2,5.8),.3,64,silver,'X',20)
 for x in range(-30,33,4):cyl('Duct clamp',(x,back-1.2,5.8),.32,.045,steel,'X')
 for x in [-26,0,26]:
  cyl('Branch exhaust',(x,back-2.7,5.8),.19,3,silver,'Y')
  box('Air diffuser',(x,back-4.2,5.65),(.8,.5,.2),white)
 # Dock door modules clearly distinct from the production frontage.
 for x,n in [(-26,'01 / INBOUND'),(26,'02 / OUTBOUND')]:
  box('Dock frame',(x,back-.32,1.85),(4.6,.25,3.7),dark,.03)
  box('Sectional door',(x,back-.49,1.8),(4.15,.08,3.4),silver)
  for z in [i*.24+.22 for i in range(14)]:box('Door seam',(x,back-.55,z),(4.1,.015,.023),steel,0)
  for dx in [-2.35,2.35]:
   cyl('Dock bollard',(x+dx,back-1.2,.55),.12,1.1,yellow)
   for z in [.3,.65,.95]:cyl('Bollard band',(x+dx,back-1.2,z),.123,.13,dark)
  text(n,(x,back-.25,4),.32,blue)
 # Structural truss retained at back only so the working floor remains visible.
 for z in [6.1,6.7]:beam((-33,back-.45,z),(33,back-.45,z),.13,steel)
 for x in range(-33,33,3):beam((x,back-.45,6.1),(x+1.5,back-.45,6.7),.055,steel);beam((x+1.5,back-.45,6.7),(x+3,back-.45,6.1),.055,steel)
 for i in range(count):
  y=-(i*7-(count-1)*3.5)
  # Walkable service zones, floor boundaries and fixed line ID.
  for dy in [-2,2]:box('ESD boundary',(0,y+dy,.015),(35,.045,.009),yellow,0)
  text('SMT  /  '+str(i+1).zfill(2),(-16,y-1.8,.025),.6,white,True)
  # Benchside cable trunk; luminaires mounted at the back of the line.
  box('Cable trunk',(0,y+1.35,.19),(32,.18,.2),ivory)
  for x in [-12,-4,4,12]:
   beam((x,y+1.55,0),(x,y+1.55,3.3),.045,steel,'Task light pole')
   box('Task light housing',(x,y+1.1,3.3),(2.8,.23,.07),steel)
   box('Task light diffuser',(x,y+1.1,3.25),(2.6,.18,.02),led,0)
 # Traffic aisles: solid pedestrian boundary + dashed AMR route.
 for x in [-20.3,20.3]:box('Traffic lane edge',(x,0,.018),(.07,depth-1,.01),yellow,0)
 for y in range(-int(depth/2)+2,int(depth/2)-2,3):
  for x in [-18.8,18.8]:box('AMR guide',(x,y,.018),(.08,1.2,.01),white,0)
 for x in range(-30,33,3):box('Front aisle dashes',(x,-depth/2+.6,.018),(1.25,.08,.01),white,0)
 # Zebra crossings + front slab legends.
 for x in [-20,20]:
  for k in range(7):box('Pedestrian crossing',(x-1.5+k*.5,-depth/2+1.8,.021),(.28,1.8,.01),white,0)
 text('RAW MATERIAL  /  A',(-26,-depth/2-1,.02),.65,white,True)
 text('FINISHED GOODS  /  B',(26,-depth/2-1,.02),.6,white,True)
 text('NEXUS   /   MANUFACTURING',(0,back-.25,4.5),.53,blue)
 export('kit-hall-'+str(count))
