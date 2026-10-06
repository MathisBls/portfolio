// Types des GLB de public/models/, générés par `npx gltfjsx@6.5.3 public/models/<n>.glb --types`.
// Seules les interfaces sont gardées. Les noms suivent PropertyBinding.sanitizeNodeName (les points
// des noms Blender disparaissent : 'Car0_W-0.2-0.19' devient 'Car0_W-02-019').
// Les empties parents (Car*_Root), élagués par gltfjsx, sont ajoutés à la main : useGLTF les expose.
// Regénérer après chaque export Blender (skill blender-assets).
import type * as THREE from 'three'

type GLTFBase = { scene: THREE.Group }

export type PrismGLTF = GLTFBase & {
  nodes: {
    Prism: THREE.Mesh
    BeamIn: THREE.Mesh
    Spec0: THREE.Mesh
    Spec1: THREE.Mesh
    Spec2: THREE.Mesh
    Spec3: THREE.Mesh
    Spec4: THREE.Mesh
    Spec5: THREE.Mesh
    Spec6: THREE.Mesh
  }
  materials: {
    Glass: THREE.MeshPhysicalMaterial
    BeamWhite: THREE.MeshStandardMaterial
    Spec0: THREE.MeshStandardMaterial
    Spec1: THREE.MeshStandardMaterial
    Spec2: THREE.MeshStandardMaterial
    Spec3: THREE.MeshStandardMaterial
    Spec4: THREE.MeshStandardMaterial
    Spec5: THREE.MeshStandardMaterial
    Spec6: THREE.MeshStandardMaterial
  }
}

export type ZephyrGLTF = GLTFBase & {
  nodes: {
    Wind1: THREE.Mesh
    Wind2: THREE.Mesh
    Wind3: THREE.Mesh
  }
  materials: {
    Teal: THREE.MeshStandardMaterial
    TealGlass: THREE.MeshPhysicalMaterial
    TealLight: THREE.MeshStandardMaterial
  }
}

export type WegirGLTF = GLTFBase & {
  nodes: {
    Car0_Root: THREE.Object3D
    Car1_Root: THREE.Object3D
    Car2_Root: THREE.Object3D
    Car0_Body: THREE.Mesh
    Car0_Cab: THREE.Mesh
    ['Car0_W-02-019']: THREE.Mesh
    ['Car0_W-02019']: THREE.Mesh
    ['Car0_W02-019']: THREE.Mesh
    Car0_W02019: THREE.Mesh
    Car1_Body: THREE.Mesh
    Car1_Cab: THREE.Mesh
    ['Car1_W-02-019']: THREE.Mesh
    ['Car1_W-02019']: THREE.Mesh
    ['Car1_W02-019']: THREE.Mesh
    Car1_W02019: THREE.Mesh
    Car2_Body: THREE.Mesh
    Car2_Cab: THREE.Mesh
    ['Car2_W-02-019']: THREE.Mesh
    ['Car2_W-02019']: THREE.Mesh
    ['Car2_W02-019']: THREE.Mesh
    Car2_W02019: THREE.Mesh
    Road: THREE.Mesh
    Dash0: THREE.Mesh
    Dash5: THREE.Mesh
    Dash10: THREE.Mesh
    Dash15: THREE.Mesh
    Dash20: THREE.Mesh
    Dash25: THREE.Mesh
    Dash30: THREE.Mesh
    Dash35: THREE.Mesh
  }
  materials: {
    Red: THREE.MeshStandardMaterial
    Screen: THREE.MeshStandardMaterial
    Rubber: THREE.MeshStandardMaterial
    Yellow: THREE.MeshStandardMaterial
    Blue: THREE.MeshStandardMaterial
    Asphalt: THREE.MeshStandardMaterial
    White: THREE.MeshStandardMaterial
  }
}

export type QuorinGLTF = GLTFBase & {
  nodes: {
    Phone_Body: THREE.Mesh
    Phone_Screen: THREE.Mesh
    Phone_Cam: THREE.Mesh
    PhoneG1_Body: THREE.Mesh
    PhoneG1_Screen: THREE.Mesh
    PhoneG1_Cam: THREE.Mesh
    PhoneG2_Body: THREE.Mesh
    PhoneG2_Screen: THREE.Mesh
    PhoneG2_Cam: THREE.Mesh
  }
  materials: {
    Dark: THREE.MeshStandardMaterial
    Screen: THREE.MeshStandardMaterial
    Ghost1: THREE.MeshStandardMaterial
    Ghost2: THREE.MeshStandardMaterial
  }
}

export type GameFactoryGLTF = GLTFBase & {
  nodes: {
    Belt: THREE.Mesh
    ['Roller-16']: THREE.Mesh
    Roller16: THREE.Mesh
    ['Leg-13-038']: THREE.Mesh
    ['Leg-13038']: THREE.Mesh
    ['Leg0-038']: THREE.Mesh
    Leg0038: THREE.Mesh
    ['Leg13-038']: THREE.Mesh
    Leg13038: THREE.Mesh
    Hopper: THREE.Mesh
    Chute: THREE.Mesh
    Die0: THREE.Mesh
    ['Pip0_-008_008']: THREE.Mesh
    Die1: THREE.Mesh
    ['Pip1_-008_008']: THREE.Mesh
    ['Pip1_008_-008']: THREE.Mesh
    Die2: THREE.Mesh
    ['Pip2_-008_008']: THREE.Mesh
    ['Pip2_008_-008']: THREE.Mesh
    Pip2_0_0: THREE.Mesh
  }
  materials: {
    Rubber: THREE.MeshStandardMaterial
    Steel: THREE.MeshStandardMaterial
    Teal: THREE.MeshStandardMaterial
    White: THREE.MeshStandardMaterial
    Dark: THREE.MeshStandardMaterial
    Yellow: THREE.MeshStandardMaterial
    Red: THREE.MeshStandardMaterial
  }
}

export type PizzaGLTF = GLTFBase & {
  nodes: {
    Dough: THREE.Mesh
    Sauce: THREE.Mesh
    Cheese: THREE.Mesh
    Crust: THREE.Mesh
    ['Pep06-012']: THREE.Mesh
    Pep105018: THREE.Mesh
    ['Pep115-022']: THREE.Mesh
    ['Pep085-002']: THREE.Mesh
    Basil045015: THREE.Mesh
    Basil0900: THREE.Mesh
    Basil12005: THREE.Mesh
  }
  materials: {
    Crust: THREE.MeshStandardMaterial
    Sauce: THREE.MeshStandardMaterial
    Cheese: THREE.MeshStandardMaterial
    Pepperoni: THREE.MeshStandardMaterial
    Basil: THREE.MeshStandardMaterial
  }
}

export type FitnessGLTF = GLTFBase & {
  nodes: {
    Fit_Dumbbell_Root: THREE.Object3D
    Fit_Bar: THREE.Mesh
    Fit_PlateL0: THREE.Mesh
    Fit_PlateL1: THREE.Mesh
    Fit_PlateR0: THREE.Mesh
    Fit_PlateR1: THREE.Mesh
    Fit_Body: THREE.Mesh
    Fit_Screen: THREE.Mesh
    Fit_Card1: THREE.Mesh
    Fit_Card2: THREE.Mesh
    Fit_RingTrack: THREE.Mesh
    Fit_RingArc: THREE.Mesh
  }
  materials: {
    FitSteel: THREE.MeshStandardMaterial
    FitDark: THREE.MeshStandardMaterial
    FitCyan: THREE.MeshStandardMaterial
    FitScreen: THREE.MeshStandardMaterial
    FitCard1: THREE.MeshStandardMaterial
    FitCard2: THREE.MeshStandardMaterial
    FitTrack: THREE.MeshStandardMaterial
  }
}
