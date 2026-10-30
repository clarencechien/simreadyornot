import bpy, math, pathlib
OUT=pathlib.Path(__file__).resolve().parents[2]/'src/assets'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.4;return m
white=material('Powder coated steel',(.68,.73,.75),.35);dark=material('Graphite',(.04,.065,.08),.3);blue=material('Rack uprights',(.08,.22,.39),.5);orange=material('Rack beams',(.85,.29,.045),.3);wood=material('Pallet timber',(.4,.25,.12));paper=material('Kraft board',(.62,.43,.23));glass=material('Inspection glass',(.025,.10,.13),.65);green=material('PCB',(.02,.24,.12));silver=material('Machined aluminium',(.6,.65,.68),.8)
def box(name,xyz,size,mat,bevel=.01):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  b=o.modifiers.new('Manufactured edges','BEVEL');b.width=bevel;b.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
 return o
def cyl(name,xyz,r,depth,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=depth,location=xyz);o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o
def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def export(name):
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_yup=True,export_materials='EXPORT');clear()
def pallet(x=0,y=0,z=0):
 for a in [-.48,0,.48]:box('Pallet runner',(x+a,y,z+.08),(.12,1.05,.16),wood)
 for i in range(7):box('Pallet deck',(x,y-.45+i*.15,z+.18),(1.18,.12,.06),wood)
for x in [-1.4,1.4]:
 for y in [-.65,.65]:
  box('Perforated upright',(x,y,2.2),(.1,.1,4.4),blue)
  for z in [.3,1.6,2.9,4.2]:box('Cross tie',(x,0,z),(.06,1.3,.06),blue)
 for j in range(3):
  o=box('Diagonal bracing',(x,0,.95+j*1.3),(.045,1.8,.045),silver);o.rotation_euler[0]=(-1 if j%2 else 1)*.78
for z in [.35,1.7,3.05]:
 for y in [-.65,.65]:box('Orange load beam',(0,y,z),(2.9,.09,.16),orange)
 box('Steel shelf',(0,0,z),(2.9,1.3,.06),silver)
 for x in [-.7,.7]:
  pallet(x,0,z+.05)
  for y in [-.3,.3]:
   box('Carton',(x,y,z+.62),(.95,.55,.68),paper)
   box('Shipping label',(x,y-.281,z+.65),(.25,.005,.16),white,0)
export('warehouse-rack')
pallet()
for x in [-.3,.3]:
 for y in [-.28,.28]:box('Sealed carton',(x,y,.6),(.55,.5,.75),paper)
export('loaded-pallet')
for j in range(8):
 w=[1.3,2.8,2.2,3.3,3.3,4.1,2.2,1.3][j];h=[2.5,2.0,1.8,2.2,2.2,1.5,1.8,2.5][j]
 box('Machine chassis',(0,0,h/2),(w,1.8,h),white,.06);box('Service base',(0,0,.18),(w+.06,1.88,.3),dark)
 for x in [-w/2+.2,w/2-.2]:
  for y in [-.7,.7]:cyl('Levelling foot',(x,y,.05),.09,.1,dark)
 if j in [0,7]:
  box('Magazine cavity',(0,-.92,1.35),(.95,.05,1.8),dark)
  for i in range(12):box('Magazine rail',(0,-1, .55+i*.13),(.9,.32,.025),silver,0)
 elif j==5:
  for k in range(8):
   x=-1.7+k*.48;box('Thermal hood',(x,0,1.56),(.43,1.65,.18),silver);box('Zone display',(x,-.92,1.1),(.25,.02,.08),orange)
  for x in [-1.4,1.4]:cyl('Exhaust duct',(x,0,1.95),.18,.7,silver)
 else:
  box('Inspection window',(0,-.91,h*.65),(w*.8,.03,h*.45),glass)
  box('Safety rail',(0,0,h+.08),(w,.09,.08),silver)
  if j in [3,4]:
   for k in range(16):
    x=-1.35+k*.18;box('Feeder rail',(x,-1.12,.7),(.08,.5,.24),silver)
    o=cyl('Reel',(x,-1.38,.55),.18,.055,dark);o.rotation_euler[1]=math.pi/2
  if j in [2,6]:
   box('Optical gantry',(0,0,h+.22),(1.6,.18,.18),blue);cyl('Camera head',(0,0,h+.08),.13,.24,dark)
  if j==1:box('Printer gantry',(0,0,h+.18),(2,.2,.15),silver)
 box('HMI arm',(w/2-.1,-1.05,1.4),(.08,.3,.12),dark)
 box('HMI monitor',(w/2-.1,-1.23,1.6),(.42,.12,.36),dark)
 box('HMI display',(w/2-.1,-1.3,1.6),(.34,.01,.27),glass,0)
 for i in range(3):box('HMI data row',(w/2-.1,-1.31,1.53+i*.055),(.23,.005,.012),green,0)
 export('station-'+str(j))
