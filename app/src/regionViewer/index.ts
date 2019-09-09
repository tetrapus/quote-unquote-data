import {
  BoxGeometry,
  Color,
  Fog,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Scene,
  TextureLoader
} from "three";
import { region$, RegionModel } from "../fetchTile";
import Reloadable from "../reloadable";
import { Zone, ZoneColors } from "../ZoneTypes";
import { setLighting, setupCamera, setUpRenderer } from "./sceneSetup";
import grassTextureImg from "./textures/grasstex2.jpg";
import waterTextureImg from "./textures/waterTexture.jpg";
const waterTexture = new TextureLoader().load(waterTextureImg);
const grassTexture = new TextureLoader().load(grassTextureImg);

const canvas = document.getElementById(
  "c-isometric-canvas"
) as HTMLCanvasElement;
const title = document.getElementById("title");
//
const context = canvas.getContext("webgl2");

const scene = new Scene();
const canvasBoundingRect = canvas.getBoundingClientRect();
const aspect = canvasBoundingRect.width / canvasBoundingRect.height;

const d = 20;

const { renderer } = setUpRenderer(canvas, context, canvasBoundingRect);
const { camera, controls } = setupCamera(aspect, d, scene, renderer);

setLighting(scene);

scene.background = new Color("#87CEEB");
scene.fog = new Fog(0xffffff, 0, 200);
scene.scale.set(0.5, 0.5, 0.5);

const BUILDING_COLOR = "#eeeeee";
const COMMERCIAL_COLOR = "#aaccee";
// todo: density

const TileDiameter = 3;
const TileGap = 1;
const TilePadding = 0.75;
const BuildingHeight = 1 / 30;

const mapDistanceToInternal = (distance: number) => {
  return (TileDiameter + TileGap) * distance;
};

const mapPopulationToDensity = (population: number, zoneType: Zone) => {
  if (zoneType == Zone.Residential) {
    return population * BuildingHeight;
  } else if (zoneType == Zone.Commercial) {
    let cutoffA = 2;
    let cutoffB = 10;
    let cutoffC = 100;
    if (population <= cutoffA) {
      return population;
    } else if (population <= cutoffB) {
      return cutoffA + (population - cutoffA) / 100;
    } else if (population <= cutoffC) {
      return cutoffA + cutoffB / 100 + (population - cutoffB) / 200;
    } else {
      return (
        cutoffA + cutoffB / 100 + cutoffC / 200 + (population - cutoffC) / 1000
      );
    }
  }
  return population;
};

const Materials = {
  water: new MeshPhysicalMaterial({
    map: waterTexture
  }),
  grass: new MeshPhysicalMaterial({
    map: grassTexture
  })
};

function setRegion(region: RegionModel) {
  title.innerText = region.model.name;
  region.tiles.forEach((tile, idx) => {
    const material = new MeshStandardMaterial({
      color: tile.zone == Zone.Commercial ? COMMERCIAL_COLOR : BUILDING_COLOR
    });

    if (tile.population) {
      const height = mapPopulationToDensity(tile.population, tile.zone);
      let cube;
      let geometry;
      if (tile.zone == Zone.Commercial && height > 5) {
        let heightCut = (0.5 + Math.random() / 2) * height;
        geometry = new BoxGeometry(
          TileDiameter - TilePadding * 2,
          heightCut + 0.1,
          TileDiameter - TilePadding * 2
        );
        cube = new Mesh(geometry, material);
        let geometryC = new BoxGeometry(
          TileDiameter - TilePadding * 4,
          height - heightCut + 0.1,
          TileDiameter - TilePadding * 4
        );
        let cubeC = new Mesh(geometryC, material);
        scene.add(cubeC);
        cubeC.translateX(mapDistanceToInternal(tile.coordinates.x));
        cubeC.translateZ(mapDistanceToInternal(tile.coordinates.y));
        cubeC.translateY((height - heightCut) / 2 + heightCut);

        scene.add(cube);
        cube.translateX(mapDistanceToInternal(tile.coordinates.x));
        cube.translateZ(mapDistanceToInternal(tile.coordinates.y));
        cube.translateY(heightCut / 2);
      } else {
        const geometry = new BoxGeometry(
          TileDiameter - TilePadding * 2,
          height + 0.1,
          TileDiameter - TilePadding * 2
        );
        cube = new Mesh(geometry, material);

        scene.add(cube);
        cube.translateX(mapDistanceToInternal(tile.coordinates.x));
        cube.translateZ(mapDistanceToInternal(tile.coordinates.y));
        cube.translateY(height / 2);
      }
    }
    // Add the base for the tile
    const baseMeshMaterial =
      tile.zone === Zone.Water
        ? Materials.water
        : tile.zone === Zone.Park
        ? Materials.grass
        : new MeshStandardMaterial({
            color: ZoneColors[tile.zone] || ZoneColors[Zone.Unknown],
            roughness: 10000
          });
    const base = new Mesh(
      new BoxGeometry(TileDiameter, 0.1, TileDiameter),
      baseMeshMaterial
    );
    scene.add(base);
    base.translateX(mapDistanceToInternal(tile.coordinates.x));
    base.translateZ(mapDistanceToInternal(tile.coordinates.y));
  });
}

function animate() {
  controls.update();
  let token = requestAnimationFrame(animate);
  renderer.render(scene, camera);
  if (module.hot) {
    module.hot.dispose(() => {
      cancelAnimationFrame(token);
    });
  }
}

const destroy = () => {
  scene.traverse(parent =>
    parent.children
      .filter(obj => obj instanceof Mesh)
      .forEach((obj: Mesh) => {
        const disposables = [obj.material, obj.geometry];
        disposables.forEach(disposable => {
          if (disposable instanceof Array) {
            disposable.forEach(obj => obj.dispose());
          } else {
            disposable.dispose();
          }
        });
      })
  );

  scene.children
    .filter(obj => obj instanceof Mesh)
    .forEach((obj: Mesh) => {
      scene.remove(obj);
    });
};

class RegionMap extends Reloadable {
  init() {
    this.subscribe(region$, region => {
      destroy();
      setRegion(region);
    });
    animate();
    this.setReloadHook(module);
  }
}

export { RegionMap };